// Guest mode storage using localStorage — no Firebase required
// Keys: readflow_settings, readflow_books, readflow_progress_{bookId}, readflow_bookmarks_{bookId}

const KEY_SETTINGS = 'readflow_settings';
const KEY_BOOKS = 'readflow_books';
const progressKey = (bookId) => `readflow_progress_${bookId}`;
const bookmarksKey = (bookId) => `readflow_bookmarks_${bookId}`;

// --- Helpers ---

function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('[LocalStorage] write error:', err);
  }
}

// --- Settings ---

export function getLocalSettings() {
  return readJson(KEY_SETTINGS, {
    theme: 'dark',
    fontSize: 18,
    ttsSpeed: 1.0,
    ttsEnabled: false,
  });
}

export function setLocalSettings(data) {
  const current = getLocalSettings();
  writeJson(KEY_SETTINGS, { ...current, ...data });
}

// --- Books ---

export function getLocalBooks() {
  return readJson(KEY_BOOKS, []);
}

export function addLocalBook(bookId, meta) {
  const books = getLocalBooks();
  const exists = books.findIndex((b) => b.bookId === bookId);
  const entry = { bookId, ...meta, addedAt: new Date().toISOString() };
  if (exists >= 0) {
    books[exists] = entry;
  } else {
    books.push(entry);
  }
  writeJson(KEY_BOOKS, books);
}

export function removeLocalBook(bookId) {
  const books = getLocalBooks().filter((b) => b.bookId !== bookId);
  writeJson(KEY_BOOKS, books);
  // Clean up related data
  localStorage.removeItem(progressKey(bookId));
  localStorage.removeItem(bookmarksKey(bookId));
}

// --- Progress ---

export function getLocalProgress(bookId) {
  return readJson(progressKey(bookId), { chapterIdx: 0, sentenceIdx: 0, scrollPos: 0 });
}

export function setLocalProgress(bookId, progress) {
  writeJson(progressKey(bookId), { ...progress, updatedAt: new Date().toISOString() });
}

// --- Bookmarks ---

export function getLocalBookmarks(bookId) {
  return readJson(bookmarksKey(bookId), []);
}

export function addLocalBookmark(bookId, bookmark) {
  const bookmarks = getLocalBookmarks(bookId);
  const entry = { id: Date.now().toString(), ...bookmark, createdAt: new Date().toISOString() };
  bookmarks.push(entry);
  writeJson(bookmarksKey(bookId), bookmarks);
  return entry;
}

export function removeLocalBookmark(bookId, bookmarkId) {
  const bookmarks = getLocalBookmarks(bookId).filter((b) => b.id !== bookmarkId);
  writeJson(bookmarksKey(bookId), bookmarks);
}
