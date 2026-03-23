'use client';

import { create } from 'zustand';

export const useTtsStore = create((set) => ({
  // Playback state
  isPlaying: false,
  isPaused: false,
  currentChapter: 0,
  currentParagraph: 0,
  currentSentence: 0,
  currentFlatIndex: 0,

  // Model loading state
  modelLoaded: false,
  modelLoading: false,
  modelProgress: 0,

  // Preparing state (between play press and first audio)
  preparing: false,
  pausing: false,

  // TTS availability (false when WASM blocked, e.g. Edge Enhanced Protection)
  ttsUnavailable: false,
  ttsUnavailableReason: null,

  // Sleep timer (minutes remaining, null = off)
  sleepTimerMinutes: null,
  setSleepTimer: (minutes) => set({ sleepTimerMinutes: minutes }),
  clearSleepTimer: () => set({ sleepTimerMinutes: null }),

  setPlaying: (isPlaying) => set({ isPlaying, isPaused: false, preparing: false, pausing: false }),
  setPaused: (isPaused) => set({ isPaused, pausing: false }),
  setPreparing: (preparing) => set({ preparing }),
  setPausing: (pausing) => set({ pausing }),
  setModelLoaded: (modelLoaded) => set({ modelLoaded }),
  setModelLoading: (modelLoading) => set({ modelLoading }),
  setModelProgress: (modelProgress) => set({ modelProgress }),
  setTtsUnavailable: (reason) => set({ ttsUnavailable: true, ttsUnavailableReason: reason }),

  setPosition: (chapter, paragraph, sentence, flatIndex = 0) =>
    set({ currentChapter: chapter, currentParagraph: paragraph, currentSentence: sentence, currentFlatIndex: flatIndex }),

  reset: () =>
    set({
      isPlaying: false,
      isPaused: false,
      pausing: false,
      currentChapter: 0,
      currentParagraph: 0,
      currentSentence: 0,
      currentFlatIndex: 0,
    }),
}));
