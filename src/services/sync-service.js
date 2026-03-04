// Firestore CRUD service — Firebase 11 modular API
// Falls back to guest mode (localStorage) when no uid present
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase.js';
import * as guest from './sync-service-guest.js';

// --- Guest check ---
export const isGuest = () => !window.__currentUid;

// Internal: set current uid (called by useAuth on auth state change)
export const setCurrentUid = (uid) => { window.__currentUid = uid || null; };

// --- Helpers ---
const userDoc = (uid, ...path) => doc(db, 'users', uid, ...path);
const bookDoc = (uid, bookId, ...path) => doc(db, 'users', uid, 'books', bookId, ...path);

async function safeGet(docRef) {
  try {
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('[SyncService] read error:', err);
    return null;
  }
}

// --- Profile ---

export async function getProfile(uid) {
  if (!uid) return guest.guestGetProfile();
  return safeGet(userDoc(uid, 'profile'));
}

export async function updateProfile(uid, data) {
  if (!uid) return guest.guestUpdateProfile(uid, data);
  try {
    await setDoc(userDoc(uid, 'profile'), data, { merge: true });
  } catch (err) {
    console.error('[SyncService] updateProfile error:', err);
  }
}

// --- Settings ---

export async function getSettings(uid) {
  if (!uid) return guest.guestGetSettings();
  return safeGet(userDoc(uid, 'settings'));
}

export async function updateSettings(uid, data) {
  if (!uid) return guest.guestUpdateSettings(uid, data);
  try {
    await setDoc(userDoc(uid, 'settings'), data, { merge: true });
  } catch (err) {
    console.error('[SyncService] updateSettings error:', err);
  }
}

// --- Books ---

export async function addBook(uid, bookId, meta) {
  if (!uid) return guest.guestAddBook(uid, bookId, meta);
  try {
    await setDoc(bookDoc(uid, bookId, 'meta'), { ...meta, addedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[SyncService] addBook error:', err);
  }
}

export async function getBooks(uid) {
  if (!uid) return guest.guestGetBooks();
  try {
    const col = collection(db, 'users', uid, 'books');
    const snap = await getDocs(col);
    const books = [];
    for (const bookSnap of snap.docs) {
      const metaSnap = await getDoc(doc(db, 'users', uid, 'books', bookSnap.id, 'meta'));
      if (metaSnap.exists()) {
        books.push({ bookId: bookSnap.id, ...metaSnap.data() });
      }
    }
    return books;
  } catch (err) {
    console.error('[SyncService] getBooks error:', err);
    return [];
  }
}

export async function deleteBook(uid, bookId) {
  if (!uid) return guest.guestDeleteBook(uid, bookId);
  try {
    await deleteDoc(bookDoc(uid, bookId, 'meta'));
    await deleteDoc(bookDoc(uid, bookId, 'progress'));
    await deleteDoc(bookDoc(uid, bookId, 'bookmarks'));
  } catch (err) {
    console.error('[SyncService] deleteBook error:', err);
  }
}

// --- Progress ---

export async function getProgress(uid, bookId) {
  if (!uid) return guest.guestGetProgress(uid, bookId);
  return safeGet(bookDoc(uid, bookId, 'progress'));
}

// Debounced progress update — 3s delay
const _progressTimers = {};
export function updateProgressDebounced(uid, bookId, progress) {
  if (!uid) return guest.guestUpdateProgress(uid, bookId, progress);
  const key = `${uid}:${bookId}`;
  clearTimeout(_progressTimers[key]);
  _progressTimers[key] = setTimeout(async () => {
    try {
      await setDoc(
        bookDoc(uid, bookId, 'progress'),
        { ...progress, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.error('[SyncService] updateProgress error:', err);
    }
    delete _progressTimers[key];
  }, 3000);
}

// --- Bookmarks ---

export async function getBookmarks(uid, bookId) {
  if (!uid) return guest.guestGetBookmarks(uid, bookId);
  const data = await safeGet(bookDoc(uid, bookId, 'bookmarks'));
  return data?.items ?? [];
}

export async function addBookmark(uid, bookId, bookmark) {
  if (!uid) return guest.guestAddBookmark(uid, bookId, bookmark);
  try {
    const entry = { id: Date.now().toString(), ...bookmark, createdAt: new Date().toISOString() };
    await setDoc(
      bookDoc(uid, bookId, 'bookmarks'),
      { items: arrayUnion(entry) },
      { merge: true }
    );
    return entry;
  } catch (err) {
    console.error('[SyncService] addBookmark error:', err);
  }
}

export async function removeBookmark(uid, bookId, bookmarkId) {
  if (!uid) return guest.guestRemoveBookmark(uid, bookId, bookmarkId);
  try {
    const data = await safeGet(bookDoc(uid, bookId, 'bookmarks'));
    const items = (data?.items ?? []).filter((b) => b.id !== bookmarkId);
    await setDoc(bookDoc(uid, bookId, 'bookmarks'), { items }, { merge: true });
  } catch (err) {
    console.error('[SyncService] removeBookmark error:', err);
  }
}

// --- Favorites ---

export async function getFavorites(uid) {
  if (!uid) return guest.guestGetFavorites();
  const data = await safeGet(userDoc(uid, 'favorites'));
  return data?.list ?? [];
}

export async function toggleFavorite(uid, bookId) {
  if (!uid) return guest.guestToggleFavorite(uid, bookId);
  try {
    const favRef = userDoc(uid, 'favorites');
    const data = await safeGet(favRef);
    const list = data?.list ?? [];
    const isFav = list.includes(bookId);
    await setDoc(
      favRef,
      { list: isFav ? arrayRemove(bookId) : arrayUnion(bookId) },
      { merge: true }
    );
    return isFav ? list.filter((id) => id !== bookId) : [...list, bookId];
  } catch (err) {
    console.error('[SyncService] toggleFavorite error:', err);
    return [];
  }
}

// --- Storage ---

/**
 * Upload EPUB to Firebase Storage with optional progress reporting.
 * @param {string} uid
 * @param {string} bookId
 * @param {File|Blob} file
 * @param {(pct: number) => void} [onProgress] - called with 0-100
 * @returns {Promise<string>} download URL
 */
export function uploadEpub(uid, bookId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `users/${uid}/books/${bookId}.epub`);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: 'application/epub+zip',
    });
    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (err) => {
        console.error('[SyncService] uploadEpub error:', err);
        reject(err);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

export async function getEpubDownloadUrl(uid, bookId) {
  try {
    const storageRef = ref(storage, `users/${uid}/books/${bookId}.epub`);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error('[SyncService] getEpubDownloadUrl error:', err);
    throw err;
  }
}
