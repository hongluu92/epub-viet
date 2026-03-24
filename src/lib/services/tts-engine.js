/**
 * TTS engine facade — orchestrates model loading, phonemization, inference, and playback.
 * Provides a high-level API for the useTts hook.
 *
 * Sentence length is controlled upstream by the tokenizer (vietnamese-sentence-tokenizer.js).
 * Each sentence passed here is expected to be short enough for a single inference call.
 */

import { loadModel, disposeModel } from './tts-model-loader';
import { textToPhonemeIds } from './tts-phonemizer';
import { inferAudio } from './tts-inference';
import {
  createAudioBuffer,
  playBuffer,
  playBufferViaHtml,
  scheduleBuffer,
  pause as pauseAudio,
  resume as resumeAudio,
  stop as stopAudio,
  pauseHtmlAudio,
  resumeHtmlAudio,
  stopHtmlAudio,
  disposeAudio,
  getAudioContext,
  ensureAudioContext,
  startBackgroundKeepAlive,
  stopBackgroundKeepAlive,
} from './tts-audio-player';

/**
 * Initialize TTS engine: load ONNX model with progress tracking.
 * Must be called after a user gesture (for AudioContext).
 * @param {(progress: number) => void} onProgress - 0-100 progress callback
 */
export async function initEngine(onProgress) {
  getAudioContext();
  await loadModel(onProgress);
}

/**
 * Synthesize a single sentence: phonemize → infer → create AudioBuffer.
 * @param {string} text - Text to synthesize (should be short, ≤50 chars from tokenizer)
 * @param {number} speed - Speed multiplier (0.5-2.0)
 * @returns {Promise<AudioBuffer>} Ready-to-play audio buffer
 */
export async function synthesizeSentence(text, speed = 1.0) {
  if (!text?.trim()) return null;
  const phonemeIds = await textToPhonemeIds(text);
  if (!phonemeIds?.length) return null;
  const pcmData = await inferAudio(phonemeIds, speed);
  return createAudioBuffer(pcmData);
}

/**
 * Play an AudioBuffer and wait for it to finish.
 * @param {AudioBuffer} buffer
 * @returns {Promise<void>}
 */
export async function playSentence(buffer) {
  return playBuffer(buffer);
}

/**
 * Schedule an AudioBuffer at a precise time for gapless playback.
 * @param {AudioBuffer} buffer
 * @param {number} startAt - AudioContext.currentTime value
 * @returns {{ endTime: number, promise: Promise<void> }}
 */
export async function scheduleSentence(buffer, startAt) {
  return scheduleBuffer(buffer, startAt);
}

/** Get current AudioContext time for scheduling. */
export function getPlaybackTime() {
  return getAudioContext().currentTime;
}

export { ensureAudioContext, startBackgroundKeepAlive, stopBackgroundKeepAlive };
export { playBufferViaHtml, pauseHtmlAudio, resumeHtmlAudio, stopHtmlAudio, getHtmlAudioEl };

/**
 * Synthesize text and return raw PCM Float32Array (for HTML audio playback path).
 */
export async function synthesizeRawPcm(text, speed = 1.0) {
  if (!text?.trim()) return null;
  const phonemeIds = await textToPhonemeIds(text);
  if (!phonemeIds?.length) return null;
  return inferAudio(phonemeIds, speed);
}
export const pause = pauseAudio;
export const resume = resumeAudio;
export const stop = stopAudio;

/** Full cleanup: stop playback, release model, close audio context */
export async function dispose() {
  stopAudio();
  await disposeModel();
  await disposeAudio();
}
