// Guest mode fallback — delegates to localStorage service when no uid present
import {
  getLocalSettings,
  setLocalSettings,
  getLocalBooks,
  addLocalBook,
  removeLocalBook,
  getLocalProgress,
  setLocalProgress,
  getLocalBookmarks,
  addLocalBookmark,
  removeLocalBookmark,
} from './local-storage-service.js';

const KEY_FAVORITES = 'readflow_favorites';

function readFavorites() {
  try {
    const raw = localStorage.getItem(KEY_FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favs) {
  try {
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
  } catch (err) {
    console.error('[GuestSync] favorites write error:', err);
  }
}

// Profile (guest has no real profile)
export const guestGetProfile = () => ({ displayName: 'Guest', photoURL: null });
export const guestUpdateProfile = () => {};

// Settings
export const guestGetSettings = () => getLocalSettings();
export const guestUpdateSettings = (_uid, data) => setLocalSettings(data);

// Books
export const guestGetBooks = () => getLocalBooks();
export const guestAddBook = (_uid, bookId, meta) => addLocalBook(bookId, meta);
export const guestDeleteBook = (_uid, bookId) => removeLocalBook(bookId);

// Progress (no debounce for guest — writes are cheap)
export const guestGetProgress = (_uid, bookId) => getLocalProgress(bookId);
export const guestUpdateProgress = (_uid, bookId, progress) => setLocalProgress(bookId, progress);

// Bookmarks
export const guestGetBookmarks = (_uid, bookId) => getLocalBookmarks(bookId);
export const guestAddBookmark = (_uid, bookId, bookmark) => addLocalBookmark(bookId, bookmark);
export const guestRemoveBookmark = (_uid, bookId, bookmarkId) =>
  removeLocalBookmark(bookId, bookmarkId);

// Favorites
export function guestGetFavorites() {
  return readFavorites();
}

export function guestToggleFavorite(_uid, bookId) {
  const favs = readFavorites();
  const idx = favs.indexOf(bookId);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(bookId);
  }
  writeFavorites(favs);
  return favs;
}
