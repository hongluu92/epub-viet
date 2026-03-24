'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';
import {
  initEngine,
  ensureAudioContext,
  synthesizeSentence,
  playSentence,
  scheduleSentence,
  getPlaybackTime,
  pause as pauseEngine,
  resume as resumeEngine,
  stop as stopEngine,
  dispose as disposeEngine,
  startBackgroundKeepAlive,
  stopBackgroundKeepAlive,
} from '@/lib/services/tts-engine';
import { isModelCached, downloadModel, isWasmAvailable } from '@/lib/services/tts-model-loader';
import { speakNative, pauseNative, resumeNative, stopNative, isNativeSpeechAvailable } from '@/lib/services/tts-native-speech';

// iOS detection — used to select simpler playback path
const IS_IOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Determine if we should use native Web Speech API instead of ONNX */
function shouldUseNative() {
  const engine = useAppStore.getState().ttsEngine;
  if (engine === 'native') return true;
  if (engine === 'onnx') return false;
  // 'auto': ONNX everywhere (v1.20.1 works on iOS Safari)
  return false;
}

const PREFETCH_AHEAD = IS_IOS ? 1 : 2;
const PREFETCH_CACHE_MAX = IS_IOS ? 2 : 3;
const STARTUP_BUFFER_COUNT = 1;
const STARTUP_BUFFER_MAX_COUNT = IS_IOS ? 1 : 3; // iOS: play after first sentence ready
const STARTUP_BUFFER_TARGET_MS = IS_IOS ? 0 : 2000; // iOS: don't wait for buffer headroom
const SYNTHESIS_TIMEOUT_MS = IS_IOS ? 8000 : 15000; // Timeout per sentence synthesis

const estimateSentenceMs = (text, speed) => {
  const chars = (text || '').trim().length;
  if (!chars) return 0;
  return Math.round((chars * 55 + 180) / Math.max(0.5, speed || 1));
};

/** Wrap a promise with a timeout — rejects if takes too long */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    ),
  ]);
}

/**
 * React hook for TTS playback with sentence queue and prefetch.
 * On iOS: uses sequential playBuffer() instead of gapless scheduling,
 * reduced prefetch, and timeout protection for each inference call.
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

  useEffect(() => {
    if (isPlaying || preparing) return;
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
  }, [ttsSpeed, isPlaying, preparing]);

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

  // Synthesize with timeout protection — prevents infinite hang on iOS
  const getOrCreateBuffer = useCallback(async (sentences, idx, speed, runId) => {
    const key = `${idx}-${speed}`;
    const cached = prefetchCache.current.get(key);
    if (cached) return cached;

    const inflight = prefetchInFlight.current.get(key);
    if (inflight) return inflight;

    const task = (async () => {
      try {
        const buffer = await withTimeout(
          synthesizeSentence(sentences[idx], speed),
          SYNTHESIS_TIMEOUT_MS,
          `Sentence ${idx}`
        );
        if (abortRef.current || runId !== playRunIdRef.current) return null;
        if (buffer) {
          prefetchCache.current.set(key, buffer);
          while (prefetchCache.current.size > PREFETCH_CACHE_MAX) {
            const oldest = prefetchCache.current.keys().next().value;
            prefetchCache.current.delete(oldest);
          }
        }
        return buffer;
      } catch (err) {
        console.warn(`[TTS] Synthesis failed/timeout for sentence ${idx}:`, err.message);
        return null;
      } finally {
        prefetchInFlight.current.delete(key);
      }
    })();

    prefetchInFlight.current.set(key, task);
    return task;
  }, []);

  const prefetch = useCallback((sentences, startIdx, speed, runId) => {
    for (let i = startIdx; i < Math.min(startIdx + PREFETCH_AHEAD, sentences.length); i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;
      const key = `${i}-${speed}`;
      if (prefetchCache.current.has(key) || prefetchInFlight.current.has(key)) continue;
      void getOrCreateBuffer(sentences, i, speed, runId);
    }
  }, [getOrCreateBuffer]);

  const play = useCallback(async (sentences, startIdx = 0, chapterIdx = 0, sentenceMap = [], options = {}) => {
    const { onComplete } = options;
    if (!sentences?.length) return;

    // CRITICAL: Unlock AudioContext within the user gesture (iOS Safari requirement)
    await ensureAudioContext();

    playRunIdRef.current += 1;
    const runId = playRunIdRef.current;
    playSpeedRef.current = useAppStore.getState().ttsSpeed;
    abortRef.current = false;
    stopEngine();
    prefetchCache.current.clear();
    prefetchInFlight.current.clear();
    setPreparing(true);

    // Native Web Speech API path — no model needed
    if (shouldUseNative()) {
      startBackgroundKeepAlive();
      setPlaying(true);
      await playLoopNative(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete);
      return;
    }

    // ONNX path: download model on first play if not cached
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

    // Startup buffering — prepare first sentence(s) before playback
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

    startBackgroundKeepAlive();
    setPlaying(true);

    // iOS: sequential playback (simpler, more reliable)
    // Desktop: gapless scheduling (precise timing, no gaps)
    if (IS_IOS) {
      await playLoopSequential(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete);
    } else {
      await playLoopGapless(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete);
    }
  }, [getOrCreateBuffer, prefetch, reset, setModelLoading, setModelProgress, setPlaying, setPosition, setPreparing, setModelLoaded]);

  // Native Web Speech API playback — zero model loading, uses iOS built-in Vietnamese voice
  async function playLoopNative(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete) {
    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;

      const speed = useAppStore.getState().ttsSpeed;
      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      const text = sentences[i]?.trim();
      if (!text) continue;

      try {
        await speakNative(text, speed);
      } catch {
        // Skip failed sentences
      }
    }

    if (!abortRef.current && runId === playRunIdRef.current) {
      stopBackgroundKeepAlive();
      setPlaying(false);
      reset();
      onComplete?.({ reason: 'finished', chapterIdx });
    }
  }

  // iOS: sequential playback — synthesize → play → wait → next.
  // No prefetch overlap, no gapless scheduling — simpler and more reliable on iOS.
  async function playLoopSequential(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete) {
    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;

      const speed = useAppStore.getState().ttsSpeed;
      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      const text = sentences[i]?.trim();
      if (!text) continue;

      // Prefetch next sentence while synthesizing current
      if (i + 1 < sentences.length) {
        void getOrCreateBuffer(sentences, i + 1, speed, runId);
      }

      let buffer;
      try {
        buffer = await withTimeout(
          getOrCreateBuffer(sentences, i, speed, runId),
          SYNTHESIS_TIMEOUT_MS,
          `Sentence ${i}`
        );
      } catch {
        continue;
      }
      if (!buffer) continue;
      if (abortRef.current || runId !== playRunIdRef.current) break;

      try {
        await playSentence(buffer);
      } catch (err) {
        if (abortRef.current || runId !== playRunIdRef.current) break;
        console.warn(`[TTS-iOS] Playback error:`, err.message);
      }
      buffer = null;
    }

    if (!abortRef.current && runId === playRunIdRef.current) {
      stopBackgroundKeepAlive();
      setPlaying(false);
      reset();
      onComplete?.({ reason: 'finished', chapterIdx });
    }
  }

  // Desktop/Android: gapless scheduling — precise AudioContext timing
  async function playLoopGapless(sentences, startIdx, chapterIdx, sentenceMap, runId, onComplete) {
    prefetch(sentences, startIdx, playSpeedRef.current, runId);
    let nextStartTime = getPlaybackTime();

    for (let i = startIdx; i < sentences.length; i++) {
      if (abortRef.current || runId !== playRunIdRef.current) break;

      const speed = useAppStore.getState().ttsSpeed;
      if (speed !== playSpeedRef.current) {
        prefetchCache.current.clear();
        prefetchInFlight.current.clear();
        playSpeedRef.current = speed;
        nextStartTime = getPlaybackTime();
      }

      const coords = sentenceMap[i] || { paragraphIndex: 0, sentenceIndex: i };
      setPosition(chapterIdx, coords.paragraphIndex, coords.sentenceIndex, i);

      const cacheKey = `${i}-${speed}`;
      let buffer = await getOrCreateBuffer(sentences, i, speed, runId);
      prefetchCache.current.delete(cacheKey);

      if (!buffer) continue;
      if (abortRef.current || runId !== playRunIdRef.current) break;

      const now = getPlaybackTime();
      const startAt = Math.max(nextStartTime, now);
      const { endTime, promise } = await scheduleSentence(buffer, startAt);
      nextStartTime = endTime;
      buffer = null;

      prefetch(sentences, i + 1, speed, runId);

      try {
        await promise;
      } catch (err) {
        if (abortRef.current || runId !== playRunIdRef.current) break;
        console.error(`Playback failed for sentence ${i}:`, err);
      }
    }

    if (!abortRef.current && runId === playRunIdRef.current) {
      stopBackgroundKeepAlive();
      setPlaying(false);
      reset();
      onComplete?.({ reason: 'finished', chapterIdx });
    }
  }

  const pauseTts = useCallback(async () => {
    setPausing(true);
    try {
      pauseNative(); // no-op if not using native
      await pauseEngine();
      setPaused(true);
    } finally {
      setPausing(false);
    }
  }, [setPaused, setPausing]);

  const resumeTts = useCallback(async () => {
    resumeNative();
    await resumeEngine();
    setPaused(false);
  }, [setPaused]);

  const stopTts = useCallback(() => {
    playRunIdRef.current += 1;
    abortRef.current = true;
    stopNative();
    stopEngine();
    stopBackgroundKeepAlive();
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
        await synthesizeSentence('xin chào', useAppStore.getState().ttsSpeed);
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
