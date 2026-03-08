import { openDB } from 'idb';

const DB_NAME = 'readflow-db';
const DB_VERSION = 1;

let dbPromise = null;

/** Initialize and return the IndexedDB database instance */
function getDB() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Books metadata store
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        // Chapters store with compound key [bookId, chapterIndex]
        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', {
            keyPath: ['bookId', 'chapterIndex'],
          });
          chapterStore.createIndex('byBook', 'bookId');
        }
        // Raw EPUB blob store
        if (!db.objectStoreNames.contains('epub-files')) {
          db.createObjectStore('epub-files', { keyPath: 'bookId' });
        }
      },
    });
  }
  return dbPromise;
}

/** Save book metadata */
export async function addBook(metadata) {
  const db = await getDB();
  await db.put('books', metadata);
}

/** Get all books */
export async function getBooks() {
  const db = await getDB();
  return db.getAll('books');
}

/** Get single book by id */
export async function getBook(id) {
  const db = await getDB();
  return db.get('books', id);
}

/** Delete book + chapters + epub blob */
export async function deleteBook(id) {
  const db = await getDB();
  const tx = db.transaction(['books', 'chapters', 'epub-files'], 'readwrite');

  tx.objectStore('books').delete(id);
  tx.objectStore('epub-files').delete(id);

  // Delete all chapters for this book
  const chapterStore = tx.objectStore('chapters');
  const index = chapterStore.index('byBook');
  let cursor = await index.openCursor(id);
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

/** Batch save parsed chapters */
export async function saveChapters(bookId, chapters) {
  const db = await getDB();
  const tx = db.transaction('chapters', 'readwrite');
  for (const chapter of chapters) {
    tx.store.put({ ...chapter, bookId });
  }
  await tx.done;
}

/** Load single chapter */
export async function getChapter(bookId, chapterIndex) {
  const db = await getDB();
  return db.get('chapters', [bookId, chapterIndex]);
}

/** Get all chapters for a book */
export async function getChaptersByBook(bookId) {
  const db = await getDB();
  return db.getAllFromIndex('chapters', 'byBook', bookId);
}

/** Store raw EPUB file blob */
export async function saveEpubBlob(bookId, blob) {
  const db = await getDB();
  await db.put('epub-files', { bookId, blob });
}

/** Update reading progress for a book */
export async function updateReadingProgress(bookId, updates) {
  const db = await getDB();
  const book = await db.get('books', bookId);
  if (!book) return;
  await db.put('books', { ...book, ...updates, lastReadAt: Date.now() });
}
