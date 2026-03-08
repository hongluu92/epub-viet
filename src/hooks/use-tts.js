'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';
import {
  initEngine,
  synthesizeSentence,
  playSentence,
  pause as pauseEngine,
  resume as resumeEngine,
  stop as stopEngine,
} from '@/lib/services/tts-engine';

const PREFETCH_AHEAD = 2;

/**
 * React hook for TTS playback with sentence queue and 2-sentence prefetch.
 * Wraps the TTS engine with state management via Zustand stores.
 */
export function useTts() {
  const prefetchCache = useRef(new Map());
  const abortRef = useRef(false);

  const {
    isPlaying, isPaused, modelLoaded, modelLoading, modelProgress,
    setPlaying, setPaused, setModelLoaded, setModelLoading, setModelProgress,
    setPosition, reset,
  } = useTtsStore();

  const ttsSpeed = useAppStore((s) => s.ttsSpeed);

  // Clear prefetch cache when speed changes
  useEffect(() => {
    prefetchCache.current.clear();
  }, [ttsSpeed]);

  /** Load the ONNX model (call on first play) */
  const loadModel = useCallback(async () => {
    const state = useTtsStore.getState();
    if (state.modelLoaded || state.modelLoading) return;
    setModelLoading(true);
    try {
      await initEngine((progress) => setModelProgress(progress));
      setModelLoaded(true);
    } catch (err) {
      console.error('TTS model load failed:', err);
    } finally {
      setModelLoading(false);
    }
  }, [setModelLoading, setModelLoaded, setModelProgress]);

  /** Prefetch audio buffers for upcoming sentences */
  const prefetch = useCallback(async (sentences, startIdx, speed) => {
    for (let i = startIdx; i < Math.min(startIdx + PREFETCH_AHEAD, sentences.length); i++) {
      const key = `${i}-${speed}`;
      if (!prefetchCache.current.has(key)) {
        try {
          const buffer = await synthesizeSentence(sentences[i], speed);
          if (buffer) prefetchCache.current.set(key, buffer);
        } catch (err) {
          console.error(`Prefetch failed for sentence ${i}:`, err);
        }
      }
    }
  }, []);

  /**
   * Start playing from a specific position in the sentence list.
   * @param {string[]} sentences - All sentences to play (flat array)
   * @param {number} startIdx - Index to start from
   * @param {number} chapterIdx - Current chapter index
   * @param {Array<{paragraphIndex: number, sentenceIndex: number}>} sentenceMap - Maps flat index to 2D coordinates
   */
  const play = useCallback(async (sentences, startIdx = 0, chapterIdx = 0, sentenceMap = []) => {
    if (!sentences?.length) return;
    abortRef.current = false;

    // Ensure model is loaded
    if (!useTtsStore.getState().modelLoaded) {
      setModelLoading(true);
      try {
        await initEngine((progress) => setModelProgress(progress));
        setModelLoaded(true);
      } catch (err) {
        console.error('TTS model load failed:', err);
        setModelLoading(false);
        return;
      }
      setModelLoading(false);
    }

    setPlaying(true);

    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current) break;

      // Read speed each iteration so mid-playback changes take effect
      const speed = useAppStore.getState().ttsSpeed;

      // Use coordinate map to set correct paragraph/sentence for highlighting
      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      // Get or synthesize current sentence (skip empty)
      const cacheKey = `${i}-${speed}`;
      let buffer = prefetchCache.current.get(cacheKey);
      if (!buffer) {
        try {
          buffer = await synthesizeSentence(sentences[i], speed);
        } catch (err) {
          console.error(`Synthesis failed for sentence ${i}:`, err);
          continue;
        }
      }
      prefetchCache.current.delete(cacheKey);

      // Skip null buffers (empty text)
      if (!buffer) continue;
      if (abortRef.current) break;

      // Start prefetching next sentences in background
      prefetch(sentences, i + 1, speed);

      // Play current sentence and wait for it to end
      try {
        await playSentence(buffer);
      } catch (err) {
        if (abortRef.current) break;
        console.error(`Playback failed for sentence ${i}:`, err);
      }
    }

    if (!abortRef.current) {
      setPlaying(false);
      reset();
    }
  }, [setPlaying, setPosition, setModelLoaded, setModelLoading, setModelProgress, prefetch, reset]);

  const pauseTts = useCallback(async () => {
    await pauseEngine();
    setPaused(true);
  }, [setPaused]);

  const resumeTts = useCallback(async () => {
    await resumeEngine();
    setPaused(false);
  }, [setPaused]);

  const stopTts = useCallback(() => {
    abortRef.current = true;
    stopEngine();
    prefetchCache.current.clear();
    setPlaying(false);
    reset();
  }, [setPlaying, reset]);

  return {
    isPlaying, isPaused, modelLoaded, modelLoading, modelProgress,
    loadModel, play, pause: pauseTts, resume: resumeTts, stop: stopTts,
  };
}
