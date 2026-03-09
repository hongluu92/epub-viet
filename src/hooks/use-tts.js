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
  dispose as disposeEngine,
} from '@/lib/services/tts-engine';

const PREFETCH_AHEAD = 1;
const STARTUP_BUFFER_COUNT = 2;
const STARTUP_BUFFER_MAX_COUNT = 6;
const STARTUP_BUFFER_TARGET_MS = 6000;
const estimateSentenceMs = (text, speed) => {
  const normalized = (text || '').trim();
  const chars = normalized.length;
  if (!chars) return 0;
  // Rough estimate for Vietnamese TTS duration to drive startup buffering.
  const baseMs = chars * 55 + 180;
  return Math.round(baseMs / Math.max(0.5, speed || 1));
};

/**
 * React hook for TTS playback with sentence queue and 2-sentence prefetch.
 * Wraps the TTS engine with state management via Zustand stores.
 */
export function useTts() {
  const prefetchCache = useRef(new Map());
  const prefetchInFlight = useRef(new Map());
  const abortRef = useRef(false);
  const playRunIdRef = useRef(0);
  const playSpeedRef = useRef(1);
  const warmupStartedRef = useRef(false);
  const warmupPromiseRef = useRef(null);

  const {
    isPlaying, isPaused, modelLoaded, modelLoading, modelProgress, preparing,
    setPlaying, setPaused, setPreparing, setPausing, setModelLoaded, setModelLoading, setModelProgress,
    setPosition, reset,
  } = useTtsStore();

  const ttsSpeed = useAppStore((s) => s.ttsSpeed);

  // Clear prefetch cache when speed changes while idle.
  useEffect(() => {
    if (isPlaying || preparing) return;
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
  }, [ttsSpeed, isPlaying, preparing]);

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

  const getOrCreateBuffer = useCallback(async (sentences, idx, speed, runId) => {
    const key = `${idx}-${speed}`;

    const cached = prefetchCache.current.get(key);
    if (cached) return cached;

    const inflight = prefetchInFlight.current.get(key);
    if (inflight) return inflight;

    const task = (async () => {
      try {
        const buffer = await synthesizeSentence(sentences[idx], speed);
        if (abortRef.current || runId !== playRunIdRef.current) return null;
        if (buffer) prefetchCache.current.set(key, buffer);
        return buffer;
      } catch (err) {
        console.error(`Synthesis failed for sentence ${idx}:`, err);
        return null;
      } finally {
        prefetchInFlight.current.delete(key);
      }
    })();

    prefetchInFlight.current.set(key, task);
    return task;
  }, []);

  /** Prefetch only the nearest next sentence to protect current sentence latency */
  const prefetch = useCallback((sentences, startIdx, speed, runId) => {
    // Keep at most one background synth task to avoid stealing CPU from current sentence.
    if (prefetchInFlight.current.size >= 1) return;
    for (let i = startIdx; i < Math.min(startIdx + PREFETCH_AHEAD, sentences.length); i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;
      const key = `${i}-${speed}`;
      if (prefetchCache.current.has(key) || prefetchInFlight.current.has(key)) continue;
      void getOrCreateBuffer(sentences, i, speed, runId);
      break;
    }
  }, [getOrCreateBuffer]);

  /**
   * Start playing from a specific position in the sentence list.
   * @param {string[]} sentences - All sentences to play (flat array)
   * @param {number} startIdx - Index to start from
   * @param {number} chapterIdx - Current chapter index
   * @param {Array<{paragraphIndex: number, sentenceIndex: number}>} sentenceMap - Maps flat index to 2D coordinates
   */
  const play = useCallback(async (sentences, startIdx = 0, chapterIdx = 0, sentenceMap = [], options = {}) => {
    const { onComplete } = options;
    if (!sentences?.length) return;
    playRunIdRef.current += 1;
    const runId = playRunIdRef.current;
    playSpeedRef.current = useAppStore.getState().ttsSpeed;
    abortRef.current = false;
    stopEngine();
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
    setPreparing(true);

    // Ensure ONNX session is ready (model must be in IndexedDB already)
    try {
      await initEngine((progress) => setModelProgress(progress));
    } catch (err) {
      console.error('TTS engine init failed:', err);
      setPreparing(false);
      return;
    }

    if (abortRef.current || runId !== playRunIdRef.current) {
      setPreparing(false);
      return;
    }

    // Prepare first N sentences before starting playback to avoid
    // short-sentence stalls at the beginning of a chapter/session.
    let startupBufferedCount = 0;
    let startupEstimatedMs = 0;
    const startupLimit = Math.min(sentences.length, startIdx + STARTUP_BUFFER_MAX_COUNT);
    for (let i = startIdx; i < startupLimit; i++) {
      const startupSpeed = playSpeedRef.current;
      await getOrCreateBuffer(sentences, i, startupSpeed, runId);
      startupBufferedCount += 1;
      startupEstimatedMs += estimateSentenceMs(sentences[i], startupSpeed);
      if (abortRef.current || runId !== playRunIdRef.current) {
        setPreparing(false);
        return;
      }
      if (startupBufferedCount >= STARTUP_BUFFER_COUNT && startupEstimatedMs >= STARTUP_BUFFER_TARGET_MS) {
        break;
      }
    }

    setPlaying(true);

    // Prime prefetch window before entering playback loop.
    prefetch(sentences, startIdx, playSpeedRef.current, runId);

    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;

      // Re-read speed from store each sentence so mid-playback changes apply
      const speed = useAppStore.getState().ttsSpeed;
      if (speed !== playSpeedRef.current) {
        prefetchCache.current.clear();
        prefetchInFlight.current.clear();
        playSpeedRef.current = speed;
      }

      // Use coordinate map to set correct paragraph/sentence for highlighting
      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      // Get or synthesize current sentence (skip empty)
      const cacheKey = `${i}-${speed}`;
      let buffer = await getOrCreateBuffer(sentences, i, speed, runId);
      prefetchCache.current.delete(cacheKey);

      // Skip null buffers (empty text)
      if (!buffer) {
        // One retry for the current sentence before giving up.
        prefetchInFlight.current.delete(cacheKey);
        buffer = await getOrCreateBuffer(sentences, i, speed, runId);
      }
      if (!buffer) continue;
      if (abortRef.current || runId !== playRunIdRef.current) break;

      // Start prefetching next sentences in background
      prefetch(sentences, i + 1, speed, runId);

      // Play current sentence and wait for it to end
      try {
        await playSentence(buffer);
      } catch (err) {
        if (abortRef.current || runId !== playRunIdRef.current) break;
        console.error(`Playback failed for sentence ${i}:`, err);
      }
    }

    if (!abortRef.current && runId === playRunIdRef.current) {
      setPlaying(false);
      reset();
      onComplete?.({ reason: 'finished', chapterIdx });
    }
  }, [getOrCreateBuffer, prefetch, reset, setModelProgress, setPlaying, setPosition, setPreparing]);

  const pauseTts = useCallback(async () => {
    setPausing(true);
    try {
      await pauseEngine();
      setPaused(true);
    } finally {
      setPausing(false);
    }
  }, [setPaused, setPausing]);

  const resumeTts = useCallback(async () => {
    await resumeEngine();
    setPaused(false);
  }, [setPaused]);

  const stopTts = useCallback(() => {
    playRunIdRef.current += 1;
    abortRef.current = true;
    stopEngine();
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
    setPreparing(false);
    setPausing(false);
    setPlaying(false);
    reset();
  }, [setPlaying, reset, setPreparing, setPausing]);

  const warmup = useCallback(async () => {
    if (warmupStartedRef.current) return warmupPromiseRef.current;
    warmupStartedRef.current = true;
    warmupPromiseRef.current = (async () => {
      try {
        await initEngine((progress) => setModelProgress(progress));
        // Warm phonemizer + inference path to reduce first-play stall.
        await synthesizeSentence('xin chao', useAppStore.getState().ttsSpeed);
      } catch (err) {
        console.warn('[TTS] Warmup skipped:', err);
      }
    })();
    return warmupPromiseRef.current;
  }, [setModelProgress]);

  const disposeTts = useCallback(() => {
    playRunIdRef.current += 1;
    abortRef.current = true;
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
    warmupStartedRef.current = false;
    warmupPromiseRef.current = null;
    setPreparing(false);
    setPausing(false);
    setPlaying(false);
    reset();
    void disposeEngine().catch((err) => {
      console.error('TTS dispose failed:', err);
    });
  }, [setPlaying, reset, setPreparing, setPausing]);

  return {
    isPlaying, isPaused, preparing, modelLoaded, modelLoading, modelProgress,
    loadModel, play, pause: pauseTts, resume: resumeTts, stop: stopTts, warmup, dispose: disposeTts,
  };
}
