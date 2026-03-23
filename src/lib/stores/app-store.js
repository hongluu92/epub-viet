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

      // First-time welcome hint
      hasSeenWelcome: false,
      setHasSeenWelcome: () => set({ hasSeenWelcome: true }),

      // Reading stats
      readingStats: { totalReadingMs: 0, chaptersCompleted: 0, currentStreak: 0, lastReadDate: null },
      updateReadingTime: (ms) => set((s) => ({
        readingStats: { ...s.readingStats, totalReadingMs: s.readingStats.totalReadingMs + ms },
      })),
      incrementChaptersCompleted: () => set((s) => ({
        readingStats: { ...s.readingStats, chaptersCompleted: s.readingStats.chaptersCompleted + 1 },
      })),
      updateStreak: () => set((s) => {
        const today = new Date().toISOString().slice(0, 10);
        const stats = s.readingStats;
        if (stats.lastReadDate === today) return s;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = stats.lastReadDate === yesterday ? stats.currentStreak + 1 : 1;
        return { readingStats: { ...stats, currentStreak: streak, lastReadDate: today } };
      }),

      // Annotations: array of { bookId, chapterIndex, paragraphIndex, sentenceIndex, text, color?, note?, createdAt }
      bookmarks: [],
      addBookmark: (bm) => set((s) => {
        const key = `${bm.bookId}:${bm.chapterIndex}:${bm.paragraphIndex}:${bm.sentenceIndex}`;
        const idx = s.bookmarks.findIndex((b) =>
          `${b.bookId}:${b.chapterIndex}:${b.paragraphIndex}:${b.sentenceIndex}` === key
        );
        const annotation = {
          ...bm,
          color: bm.color || null,
          note: bm.note ?? (idx >= 0 ? s.bookmarks[idx].note : null),
          createdAt: bm.createdAt || (idx >= 0 ? s.bookmarks[idx].createdAt : Date.now()),
        };
        if (idx >= 0) {
          const updated = [...s.bookmarks];
          updated[idx] = annotation;
          return { bookmarks: updated };
        }
        return { bookmarks: [...s.bookmarks, annotation] };
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
