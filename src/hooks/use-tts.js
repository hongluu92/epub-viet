'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';
import {
  initEngine,
  synthesizeSentence,
  scheduleSentence,
  getPlaybackTime,
  pause as pauseEngine,
  resume as resumeEngine,
  stop as stopEngine,
  dispose as disposeEngine,
} from '@/lib/services/tts-engine';
import { isModelCached, downloadModel, isWasmAvailable } from '@/lib/services/tts-model-loader';

const PREFETCH_AHEAD = 2;
const STARTUP_BUFFER_COUNT = 1;        // play after first sentence is ready
const STARTUP_BUFFER_MAX_COUNT = 3;    // cap buffering to avoid long prepare wait
const STARTUP_BUFFER_TARGET_MS = 2000; // 3s is enough headroom before stall risk
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
    setPlaying, setPaused, setPreparing, setPausing, setModelLoaded, setModelLoading,
    setModelProgress, setPosition, reset,
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
        if (buffer) {
          prefetchCache.current.set(key, buffer);
          // Evict oldest entries to cap memory on iOS Safari
          while (prefetchCache.current.size > 3) {
            const oldest = prefetchCache.current.keys().next().value;
            prefetchCache.current.delete(oldest);
          }
        }
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

  /** Prefetch next sentences to ensure gapless playback */
  const prefetch = useCallback((sentences, startIdx, speed, runId) => {
    for (let i = startIdx; i < Math.min(startIdx + PREFETCH_AHEAD, sentences.length); i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;
      const key = `${i}-${speed}`;
      if (prefetchCache.current.has(key) || prefetchInFlight.current.has(key)) continue;
      void getOrCreateBuffer(sentences, i, speed, runId);
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

    // Download model on first play if not cached (deferred from reader load)
    try {
      if (!isWasmAvailable()) {
        useTtsStore.getState().setTtsUnavailable('wasm-blocked');
        setPreparing(false);
        return;
      }
      if (!(await isModelCached())) {
        setModelLoading(true);
        await downloadModel((p) => setModelProgress(p));
        setModelLoading(false);
      }
      await initEngine((progress) => setModelProgress(progress));
      setModelLoaded(true);
    } catch (err) {
      console.error('TTS engine init failed:', err);
      setModelLoading(false);
      setPreparing(false);
      if (err.message?.includes('WASM') || err.message?.includes('WebAssembly')) {
        useTtsStore.getState().setTtsUnavailable('wasm-blocked');
      }
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

    // Track scheduled end time for gapless audio scheduling.
    // Web Audio API schedules at hardware level — eliminates JS event loop gaps.
    let nextStartTime = getPlaybackTime();

    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;

      // Re-read speed from store each sentence so mid-playback changes apply
      const speed = useAppStore.getState().ttsSpeed;
      if (speed !== playSpeedRef.current) {
        prefetchCache.current.clear();
        prefetchInFlight.current.clear();
        playSpeedRef.current = speed;
        nextStartTime = getPlaybackTime();
      }

      // Use coordinate map to set correct paragraph/sentence for highlighting
      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      // Get or synthesize current sentence (skip empty)
      const cacheKey = `${i}-${speed}`;
      let buffer = await getOrCreateBuffer(sentences, i, speed, runId);
      prefetchCache.current.delete(cacheKey);

      if (!buffer) continue;
      if (abortRef.current || runId !== playRunIdRef.current) break;

      // Schedule at precise time — if prefetch was fast enough, nextStartTime
      // is in the future and audio starts gaplessly. Otherwise falls back to "now".
      const now = getPlaybackTime();
      const startAt = Math.max(nextStartTime, now);
      const { endTime, promise } = scheduleSentence(buffer, startAt);
      nextStartTime = endTime;
      buffer = null; // Release reference for GC (iOS memory pressure)

      // Prefetch next sentences NOW — while current sentence plays, next ones synthesize
      prefetch(sentences, i + 1, speed, runId);

      // Wait for this sentence to end (for UI highlight sync)
      try {
        await promise;
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
  }, [getOrCreateBuffer, prefetch, reset, setModelLoading, setModelProgress, setPlaying, setPosition, setPreparing]);

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
