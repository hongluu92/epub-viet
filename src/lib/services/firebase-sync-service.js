// Firebase Firestore sync service: settings, book progress, bookmarks, real-time listeners
// All Firebase SDK imports are lazy to avoid blocking module evaluation
import { getDbInstance } from './firebase-config';

// Debounce helper to batch rapid writes
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Lazy helper: returns { db, fs } where fs contains needed firestore functions
async function getFirestore() {
  const db = await getDbInstance();
  if (!db) return null;
  const fs = await import('firebase/firestore');
  return { db, fs };
}

/** Write user settings to users/{uid}/settings/prefs */
export const syncSettings = debounce(async (uid, settings) => {
  const ctx = await getFirestore();
  if (!ctx) return;
  const { db, fs } = ctx;
  try {
    await fs.setDoc(fs.doc(db, 'users', uid, 'settings', 'prefs'), {
      ...settings,
      updatedAt: fs.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[sync] syncSettings failed:', err);
  }
}, 500);

/** Write book reading progress to users/{uid}/books/{bookId} */
export const syncBookProgress = debounce(async (uid, bookId, progress) => {
  const ctx = await getFirestore();
  if (!ctx) return;
  const { db, fs } = ctx;
  try {
    await fs.setDoc(fs.doc(db, 'users', uid, 'books', bookId), {
      ...progress,
      updatedAt: fs.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[sync] syncBookProgress failed:', err);
  }
}, 500);

/** Fetch reading progress for a single book from Firestore */
export async function getBookProgress(uid, bookId) {
  const ctx = await getFirestore();
  if (!ctx) return null;
  const { db, fs } = ctx;
  try {
    const snap = await fs.getDoc(fs.doc(db, 'users', uid, 'books', bookId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('[sync] getBookProgress failed:', err);
    return null;
  }
}

/** Add or remove bookmark in users/{uid}/bookmarks/{key} */
export async function syncBookmark(uid, bookmark, action) {
  const ctx = await getFirestore();
  if (!ctx) return;
  const { db, fs } = ctx;
  const key = `${bookmark.bookId}:${bookmark.chapterIndex}:${bookmark.paragraphIndex}:${bookmark.sentenceIndex}`;
  const ref = fs.doc(db, 'users', uid, 'bookmarks', key);
  try {
    if (action === 'add') {
      await fs.setDoc(ref, { ...bookmark, createdAt: fs.serverTimestamp() });
    } else {
      await fs.deleteDoc(ref);
    }
  } catch (err) {
    console.error('[sync] syncBookmark failed:', err);
  }
}

/** Subscribe to real-time changes for settings, books, bookmarks
 *  callbacks: { onSettings, onBooks, onBookmarks }
 *  Returns cleanup function that unsubscribes all listeners */
export async function subscribeToChanges(uid, callbacks) {
  const ctx = await getFirestore();
  if (!ctx) return () => {};
  const { db, fs } = ctx;
  const unsubs = [];

  if (callbacks.onSettings) {
    unsubs.push(fs.onSnapshot(fs.doc(db, 'users', uid, 'settings', 'prefs'), (snap) => {
      if (snap.exists()) callbacks.onSettings(snap.data());
    }));
  }

  if (callbacks.onBooks) {
    unsubs.push(fs.onSnapshot(fs.collection(db, 'users', uid, 'books'), (snap) => {
      const books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callbacks.onBooks(books);
    }));
  }

  if (callbacks.onBookmarks) {
    unsubs.push(fs.onSnapshot(fs.collection(db, 'users', uid, 'bookmarks'), (snap) => {
      const bookmarks = snap.docs.map((d) => d.data());
      callbacks.onBookmarks(bookmarks);
    }));
  }

  return () => unsubs.forEach((u) => u());
}

/** Fetch all books metadata from Firestore for the user */
export async function fetchLibrary(uid) {
  const ctx = await getFirestore();
  if (!ctx) return [];
  const { db, fs } = ctx;
  try {
    const snap = await fs.getDocs(fs.collection(db, 'users', uid, 'books'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[sync] fetchLibrary failed:', err);
    return [];
  }
}

/** Sync book metadata (title, author, cover, source) to Firestore — no epub content */
export async function syncBookMetadata(uid, book) {
  const ctx = await getFirestore();
  if (!ctx) return;
  const { db, fs } = ctx;
  const { id, title, author, coverUrl, source, timsachId, epubUrl, chapterCount, addedAt } = book;
  try {
    await fs.setDoc(fs.doc(db, 'users', uid, 'books', id), {
      title, author, coverUrl: coverUrl || null,
      source: source || 'local', timsachId: timsachId || null,
      epubUrl: epubUrl || null,
      chapterCount: chapterCount || null, addedAt: addedAt || Date.now(),
      updatedAt: fs.serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('[sync] syncBookMetadata failed:', err);
  }
}

/** Remove book from Firestore */
export async function deleteBookFromCloud(uid, bookId) {
  const ctx = await getFirestore();
  if (!ctx) return;
  const { db, fs } = ctx;
  try {
    await fs.deleteDoc(fs.doc(db, 'users', uid, 'books', bookId));
  } catch (err) {
    console.error('[sync] deleteBookFromCloud failed:', err);
  }
}
