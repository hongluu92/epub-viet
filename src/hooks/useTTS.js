// React hook wrapping tts-engine with sentence queue, prefetch, and state management
// Falls back to Web Speech API if ONNX is unavailable

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadModel, inferSentence, playBuffer,
  stopPlayback, pausePlayback, resumePlayback,
  setSpeed as engineSetSpeed, isOnnxAvailable, dispose,
} from '../services/tts-engine.js';
import {
  isWebSpeechAvailable, speakText, stopSpeech, pauseSpeech, resumeSpeech,
} from '../services/tts-web-speech-fallback.js';
import useAppStore from '../store/app-store.js';

const PREFETCH_AHEAD = 2;

export default function useTTS({ onSentenceChange } = {}) {
  const updateTts = useAppStore((s) => s.updateTts);
  const ttsState = useAppStore((s) => s.tts);

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);

  // Refs for mutable playback state (avoid stale closures in async loops)
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);
  const currentIdxRef = useRef(0);
  const prefetchCache = useRef({}); // { [idx]: Promise<AudioBuffer> }
  const speedRef = useRef(ttsState.speed || 1.0);

  // --- Model initialisation ---

  const initModel = useCallback(async () => {
    if (ttsState.modelLoaded || isModelLoading) return;

    setIsModelLoading(true);
    try {
      await loadModel((pct) => {
        setModelProgress(pct);
        updateTts({ modelProgress: pct });
      });
      updateTts({ modelLoaded: true, modelProgress: 100 });
      setUsingFallback(false);
    } catch (err) {
      console.warn('[useTTS] ONNX unavailable, falling back to Web Speech:', err);
      const fallbackOk = isWebSpeechAvailable();
      setUsingFallback(fallbackOk);
      // Mark as "loaded" so callers can proceed with fallback
      updateTts({ modelLoaded: fallbackOk, modelProgress: 100 });
      if (!fallbackOk) throw new Error('Neither ONNX nor Web Speech API available');
    } finally {
      setIsModelLoading(false);
    }
  }, [ttsState.modelLoaded, isModelLoading, updateTts]);

  // --- Prefetch helpers ---

  function prefetchSentence(sentences, idx) {
    if (usingFallback) return; // no prefetch needed for Web Speech
    if (idx < 0 || idx >= sentences.length) return;
    if (prefetchCache.current[idx]) return; // already prefetching
    prefetchCache.current[idx] = inferSentence(sentences[idx], speedRef.current)
      .catch((err) => { console.warn('[useTTS] Prefetch failed for idx', idx, err); return null; });
  }

  function clearPrefetchCache() {
    prefetchCache.current = {};
  }

  // --- Playback loop ---

  const play = useCallback(async (sentences, startIdx = 0) => {
    if (!sentences?.length) return;
    if (!ttsState.modelLoaded) await initModel();

    shouldStopRef.current = false;
    isPlayingRef.current = true;
    isPausedRef.current = false;
    clearPrefetchCache();

    updateTts({ isPlaying: true, isPaused: false, currentSentenceIdx: startIdx });

    if (usingFallback || !isOnnxAvailable()) {
      // Web Speech fallback path — sequential, no prefetch
      for (let i = startIdx; i < sentences.length; i++) {
        if (shouldStopRef.current) break;
        currentIdxRef.current = i;
        onSentenceChange?.(i);
        updateTts({ currentSentenceIdx: i });
        await speakText(sentences[i], {
          rate: speedRef.current,
          onStart: () => updateTts({ isPlaying: true }),
        });
      }
    } else {
      // ONNX path — infer current sentence, prefetch next 2
      for (let i = startIdx; i < sentences.length; i++) {
        if (shouldStopRef.current) break;
        currentIdxRef.current = i;
        onSentenceChange?.(i);
        updateTts({ currentSentenceIdx: i });

        // Kick off prefetch for upcoming sentences
        for (let j = 1; j <= PREFETCH_AHEAD; j++) prefetchSentence(sentences, i + j);

        try {
          // Get from prefetch cache or infer now
          const bufferPromise = prefetchCache.current[i] || inferSentence(sentences[i], speedRef.current);
          prefetchCache.current[i] = bufferPromise;
          const buffer = await bufferPromise;
          delete prefetchCache.current[i]; // free memory after use

          if (shouldStopRef.current) break;
          if (buffer) await playBuffer(buffer);
        } catch (err) {
          console.error('[useTTS] Inference/playback error at idx', i, err);
          // Skip failed sentence and continue
        }
      }
    }

    if (!shouldStopRef.current) {
      // Natural end of playback
      isPlayingRef.current = false;
      updateTts({ isPlaying: false, isPaused: false, currentSentenceIdx: 0 });
    }
  }, [ttsState.modelLoaded, usingFallback, initModel, updateTts, onSentenceChange]);

  // --- Controls ---

  const pause = useCallback(async () => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    isPausedRef.current = true;
    updateTts({ isPaused: true });
    if (usingFallback) pauseSpeech();
    else await pausePlayback();
  }, [usingFallback, updateTts]);

  const resume = useCallback(async () => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    updateTts({ isPaused: false });
    if (usingFallback) resumeSpeech();
    else await resumePlayback();
  }, [usingFallback, updateTts]);

  const stop = useCallback(() => {
    shouldStopRef.current = true;
    isPlayingRef.current = false;
    isPausedRef.current = false;
    clearPrefetchCache();
    if (usingFallback) stopSpeech();
    else stopPlayback();
    updateTts({ isPlaying: false, isPaused: false, currentSentenceIdx: 0 });
  }, [usingFallback, updateTts]);

  const setSpeed = useCallback((value) => {
    speedRef.current = value;
    engineSetSpeed(value);
    clearPrefetchCache(); // invalidate prefetch at old speed
    updateTts({ speed: value });
  }, [updateTts]);

  const skipNext = useCallback((sentences) => {
    const next = currentIdxRef.current + 1;
    if (next >= sentences.length) return;
    stop();
    setTimeout(() => play(sentences, next), 50);
  }, [stop, play]);

  const skipPrev = useCallback((sentences) => {
    const prev = Math.max(0, currentIdxRef.current - 1);
    stop();
    setTimeout(() => play(sentences, prev), 50);
  }, [stop, play]);

  // --- Cleanup on unmount ---

  useEffect(() => {
    return () => {
      shouldStopRef.current = true;
      clearPrefetchCache();
    };
  }, []);

  return {
    // State
    isModelLoaded: ttsState.modelLoaded,
    isModelLoading,
    modelProgress,
    isPlaying: ttsState.isPlaying,
    isPaused: ttsState.isPaused,
    currentSentenceIdx: ttsState.currentSentenceIdx,
    speed: ttsState.speed,
    usingFallback,
    // Actions
    initModel,
    play,
    pause,
    resume,
    stop,
    setSpeed,
    skipNext,
    skipPrev,
  };
}
