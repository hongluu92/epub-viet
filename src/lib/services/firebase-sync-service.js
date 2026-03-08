// Firebase Firestore sync service: settings, book progress, bookmarks, real-time listeners
import {
  doc, setDoc, getDoc, collection, getDocs,
  onSnapshot, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase-config';

// Skip all sync operations when Firebase is not configured
const isEnabled = () => db !== null;

// Debounce helper to batch rapid writes
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Write user settings to users/{uid}/settings/prefs */
export const syncSettings = debounce(async (uid, settings) => {
  if (!isEnabled()) return;
  try {
    await setDoc(doc(db, 'users', uid, 'settings', 'prefs'), {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[sync] syncSettings failed:', err);
  }
}, 500);

/** Write book reading progress to users/{uid}/books/{bookId} */
export const syncBookProgress = debounce(async (uid, bookId, progress) => {
  if (!isEnabled()) return;
  try {
    await setDoc(doc(db, 'users', uid, 'books', bookId), {
      ...progress,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[sync] syncBookProgress failed:', err);
  }
}, 500);

/** Add or remove bookmark in users/{uid}/bookmarks/{key} */
export async function syncBookmark(uid, bookmark, action) {
  if (!isEnabled()) return;
  const key = `${bookmark.bookId}:${bookmark.chapterIndex}:${bookmark.paragraphIndex}:${bookmark.sentenceIndex}`;
  const ref = doc(db, 'users', uid, 'bookmarks', key);
  try {
    if (action === 'add') {
      await setDoc(ref, { ...bookmark, createdAt: serverTimestamp() });
    } else {
      await deleteDoc(ref);
    }
  } catch (err) {
    console.error('[sync] syncBookmark failed:', err);
  }
}

/** Subscribe to real-time changes for settings, books, bookmarks
 *  callbacks: { onSettings, onBooks, onBookmarks }
 *  Returns cleanup function that unsubscribes all listeners */
export function subscribeToChanges(uid, callbacks) {
  if (!isEnabled()) return () => {};
  const unsubs = [];

  if (callbacks.onSettings) {
    unsubs.push(onSnapshot(doc(db, 'users', uid, 'settings', 'prefs'), (snap) => {
      if (snap.exists()) callbacks.onSettings(snap.data());
    }));
  }

  if (callbacks.onBooks) {
    unsubs.push(onSnapshot(collection(db, 'users', uid, 'books'), (snap) => {
      const books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callbacks.onBooks(books);
    }));
  }

  if (callbacks.onBookmarks) {
    unsubs.push(onSnapshot(collection(db, 'users', uid, 'bookmarks'), (snap) => {
      const bookmarks = snap.docs.map((d) => d.data());
      callbacks.onBookmarks(bookmarks);
    }));
  }

  return () => unsubs.forEach((u) => u());
}

/** Fetch all books metadata from Firestore for the user */
export async function fetchLibrary(uid) {
  if (!isEnabled()) return [];
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'books'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[sync] fetchLibrary failed:', err);
    return [];
  }
}
