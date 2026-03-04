import { create } from 'zustand';

// Central app state store — auth, settings, current book, TTS, and UI state
const useAppStore = create((set) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // User settings
  settings: {
    theme: 'dark',
    fontSize: 18,
    ttsSpeed: 1.0,
    ttsEnabled: false,
  },
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  // Currently open book
  currentBook: null,
  setCurrentBook: (book) => set({ currentBook: book }),

  // TTS playback state
  tts: {
    isPlaying: false,
    isPaused: false,
    currentSentenceIdx: 0,
    speed: 1.0,
    modelLoaded: false,
    modelProgress: 0,
  },
  updateTts: (patch) => set((s) => ({ tts: { ...s.tts, ...patch } })),

  // Whether TTS was active when navigating chapters (used to auto-resume on chapter change)
  ttsActive: false,
  setTtsActive: (active) => set({ ttsActive: active }),

  // Active modal identifier
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),

  // Library — list of book metadata objects
  books: [],
  setBooks: (books) => set({ books }),

  // Bookmarks — keyed by bookId: { [bookId]: bookmark[] }
  bookmarks: {},
  setBookmarks: (bookId, items) =>
    set((s) => ({ bookmarks: { ...s.bookmarks, [bookId]: items } })),

  // Parsed EPUB cached in memory — { metadata, chapters, _bookId }
  parsedBook: null,
  setParsedBook: (book) => set({ parsedBook: book }),

  // Current chapter index within parsedBook
  chapterIdx: 0,
  setChapterIdx: (idx) => set({ chapterIdx: idx }),
}));

export default useAppStore;
