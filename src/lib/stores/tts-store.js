'use client';

import { create } from 'zustand';

export const useTtsStore = create((set) => ({
  isPlaying: false,
  currentChapter: 0,
  currentParagraph: 0,
  currentSentence: 0,

  setPlaying: (isPlaying) => set({ isPlaying }),

  setPosition: (chapter, paragraph, sentence) =>
    set({ currentChapter: chapter, currentParagraph: paragraph, currentSentence: sentence }),

  reset: () =>
    set({ isPlaying: false, currentChapter: 0, currentParagraph: 0, currentSentence: 0 }),
}));
