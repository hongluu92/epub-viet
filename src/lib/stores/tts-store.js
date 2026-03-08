'use client';

import { create } from 'zustand';

export const useTtsStore = create((set) => ({
  // Playback state
  isPlaying: false,
  isPaused: false,
  currentChapter: 0,
  currentParagraph: 0,
  currentSentence: 0,

  // Model loading state
  modelLoaded: false,
  modelLoading: false,
  modelProgress: 0,

  setPlaying: (isPlaying) => set({ isPlaying, isPaused: false }),
  setPaused: (isPaused) => set({ isPaused }),
  setModelLoaded: (modelLoaded) => set({ modelLoaded }),
  setModelLoading: (modelLoading) => set({ modelLoading }),
  setModelProgress: (modelProgress) => set({ modelProgress }),

  setPosition: (chapter, paragraph, sentence) =>
    set({ currentChapter: chapter, currentParagraph: paragraph, currentSentence: sentence }),

  reset: () =>
    set({
      isPlaying: false,
      isPaused: false,
      currentChapter: 0,
      currentParagraph: 0,
      currentSentence: 0,
    }),
}));
