// Core TTS engine: ONNX inference session, phoneme conversion, Web Audio playback
// Uses onnxruntime-web for in-browser inference of Piper TTS model (nh.onnx)

import { PHONEME_ID_MAP, BOS_ID, EOS_ID, SPACE_ID } from '../utils/phoneme-id-map.js';
import { fetchModelBuffer } from './tts-model-loader.js';

// onnxruntime-web import with graceful failure
let ort = null;
let ortLoadError = null;

async function ensureOrt() {
  if (ort) return ort;
  if (ortLoadError) throw ortLoadError;
  try {
    ort = await import('onnxruntime-web');
    // Configure WASM paths for Vite — ort looks for .wasm files relative to base
    ort.env.wasm.wasmPaths = import.meta.env.BASE_URL || '/';
    ort.env.wasm.numThreads = 1; // single-threaded for broad browser compat
    return ort;
  } catch (err) {
    ortLoadError = err;
    throw err;
  }
}

/** Returns false if onnxruntime-web is unavailable in this browser */
export function isOnnxAvailable() {
  return ortLoadError === null;
}

// Module-level singletons
let session = null;
let audioCtx = null;
let currentSource = null;
let currentSpeed = 1.0;
let pauseResolver = null;
let isPausedFlag = false;

// --- Session management ---

async function getSession() {
  if (session) return session;
  throw new Error('TTS model not loaded. Call loadModel() first.');
}

/**
 * Load ONNX model from cache or CDN, initialise InferenceSession.
 * Must be called before inferSentence().
 * @param {(percent: number) => void} onProgress
 */
export async function loadModel(onProgress) {
  const runtime = await ensureOrt();
  const buffer = await fetchModelBuffer(onProgress);
  session = await runtime.InferenceSession.create(buffer, {
    executionProviders: ['wasm'],
  });
  return session;
}

// --- AudioContext ---

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// --- Phoneme conversion ---

/**
 * Convert plain text to a BigInt64Array of phoneme IDs.
 * Uses character-level mapping: each char -> PHONEME_ID_MAP entry.
 * Wraps with BOS/EOS tokens; maps spaces to SPACE_ID.
 * Unknown characters are silently skipped.
 * @param {string} text
 * @returns {BigInt64Array}
 */
export function textToPhonemeIds(text) {
  const ids = [BOS_ID];
  for (const char of text.toLowerCase()) {
    if (char === ' ' || char === '\u00a0') {
      ids.push(SPACE_ID);
    } else {
      const entry = PHONEME_ID_MAP[char];
      if (entry !== undefined) ids.push(BigInt(entry[0]));
    }
  }
  ids.push(EOS_ID);
  return new BigInt64Array(ids);
}

// --- Inference ---

/**
 * Run ONNX inference for one sentence text.
 * Returns an AudioBuffer ready for Web Audio playback.
 * @param {string} text
 * @param {number} speedScale - length_scale: 1.0 = normal, 0.5 = 2x fast, 2.0 = 2x slow
 * @returns {Promise<AudioBuffer>}
 */
export async function inferSentence(text, speedScale = currentSpeed) {
  const phonemeIds = textToPhonemeIds(text);
  if (phonemeIds.length <= 2) {
    // Only BOS+EOS — nothing to synthesise; return silent 0.1s buffer
    const ctx = getAudioContext();
    return ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
  }

  const sess = await getSession();
  const runtime = await ensureOrt();

  const outputs = await sess.run({
    input_ids: new runtime.Tensor('int64', phonemeIds, [1, phonemeIds.length]),
    input_lengths: new runtime.Tensor('int64', new BigInt64Array([BigInt(phonemeIds.length)]), [1]),
    scales: new runtime.Tensor('float32', new Float32Array([0.667, speedScale, 0.8]), [1, 3]),
    speaker_id: new runtime.Tensor('int64', new BigInt64Array([0n]), [1]),
  });

  const audioData = outputs.audio.data; // Float32Array at 22050 Hz
  const ctx = getAudioContext();
  const buf = ctx.createBuffer(1, audioData.length, 22050);
  buf.getChannelData(0).set(audioData);
  return buf;
}

// --- Playback ---

/**
 * Play an AudioBuffer. Returns a Promise that resolves when playback ends.
 * Stores source reference for stop/pause control.
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<void>}
 */
export function playBuffer(audioBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        currentSource = null;
        resolve();
      };
      source.start(0);
      currentSource = source;
      isPausedFlag = false;
    } catch (err) {
      reject(err);
    }
  });
}

/** Stop current playback immediately */
export function stopPlayback() {
  isPausedFlag = false;
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }
  if (pauseResolver) {
    pauseResolver();
    pauseResolver = null;
  }
}

/** Suspend AudioContext to pause playback */
export async function pausePlayback() {
  isPausedFlag = true;
  const ctx = getAudioContext();
  if (ctx.state === 'running') await ctx.suspend();
}

/** Resume AudioContext after pause */
export async function resumePlayback() {
  isPausedFlag = false;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  if (pauseResolver) {
    pauseResolver();
    pauseResolver = null;
  }
}

export function getIsPaused() { return isPausedFlag; }

/** Update speed for subsequent inferSentence calls */
export function setSpeed(speed) {
  currentSpeed = speed;
}

export function getSpeed() { return currentSpeed; }

/** Release session and audio context resources */
export async function dispose() {
  stopPlayback();
  if (session) {
    try { await session.release(); } catch { /* ignore */ }
    session = null;
  }
  if (audioCtx) {
    try { await audioCtx.close(); } catch { /* ignore */ }
    audioCtx = null;
  }
  ort = null;
  ortLoadError = null;
}
