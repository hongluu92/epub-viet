'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      // Theme: 'light' | 'dark' | 'sepia'
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Reader settings
      fontSize: 18,
      setFontSize: (fontSize) => set({ fontSize: Math.max(12, Math.min(32, fontSize)) }),

      fontFamily: 'lora', // 'lora' | 'system-serif' | 'system-sans'
      setFontFamily: (fontFamily) => set({ fontFamily }),

      lineHeight: 1.8,
      setLineHeight: (lineHeight) => set({ lineHeight }),

      readerMargin: 24,
      setReaderMargin: (readerMargin) => set({ readerMargin }),

      // TTS settings
      ttsVoice: null,
      setTtsVoice: (ttsVoice) => set({ ttsVoice }),

      ttsSpeed: 1.0,
      setTtsSpeed: (ttsSpeed) => set({ ttsSpeed }),

      // Bookmarks: array of { bookId, chapterIndex, paragraphIndex, sentenceIndex, text }
      bookmarks: [],
      addBookmark: (bm) => set((s) => {
        const key = `${bm.bookId}:${bm.chapterIndex}:${bm.paragraphIndex}:${bm.sentenceIndex}`;
        const exists = s.bookmarks.some((b) =>
          `${b.bookId}:${b.chapterIndex}:${b.paragraphIndex}:${b.sentenceIndex}` === key
        );
        if (exists) return s;
        return { bookmarks: [...s.bookmarks, bm] };
      }),
      removeBookmark: (bm) => set((s) => ({
        bookmarks: s.bookmarks.filter((b) =>
          !(b.bookId === bm.bookId && b.chapterIndex === bm.chapterIndex &&
            b.paragraphIndex === bm.paragraphIndex && b.sentenceIndex === bm.sentenceIndex)
        ),
      })),
    }),
    { name: 'readflow-app-settings' }
  )
);
