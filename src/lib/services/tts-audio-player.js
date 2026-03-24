/**
 * TTS audio player — Web Audio API playback with pause/resume/stop controls.
 * Creates AudioBuffers from raw PCM float32 data at 22050 Hz.
 */

import { SAMPLE_RATE } from '@/lib/utils/phoneme-id-map';

let audioContext = null;
let currentSource = null;
let gainNode = null;
let activeSources = [];
let htmlAudioEl = null;

/**
 * Convert PCM Float32 samples to a WAV Blob for HTML5 <audio> playback.
 * iOS Safari supports background playback via <audio> but NOT Web Audio API.
 */
function pcmToWavBlob(pcmData, sampleRate) {
  const numSamples = pcmData.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  // WAV header
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  // Convert float32 [-1,1] to int16
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(44 + i * 2, s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Play PCM audio via HTML5 <audio> element — supports iOS background playback.
 * Returns a promise that resolves when playback finishes.
 */
export function playBufferViaHtml(pcmData, sampleRate = SAMPLE_RATE) {
  return new Promise((resolve) => {
    const blob = pcmToWavBlob(pcmData, sampleRate);
    const url = URL.createObjectURL(blob);
    if (!htmlAudioEl) {
      htmlAudioEl = new Audio();
    }
    htmlAudioEl.src = url;
    htmlAudioEl.onended = () => { URL.revokeObjectURL(url); resolve(); };
    htmlAudioEl.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    htmlAudioEl.play().catch(() => resolve());
  });
}

export function pauseHtmlAudio() {
  if (htmlAudioEl) htmlAudioEl.pause();
}

export function resumeHtmlAudio() {
  if (htmlAudioEl) htmlAudioEl.play().catch(() => {});
}

export function stopHtmlAudio() {
  if (htmlAudioEl) {
    htmlAudioEl.pause();
    htmlAudioEl.src = '';
  }
}

/** Get reference to the HTML audio element (for currentTime tracking) */
export function getHtmlAudioEl() { return htmlAudioEl; }

export function startBackgroundKeepAlive() { /* no-op, html audio handles it */ }
export function stopBackgroundKeepAlive() { stopHtmlAudio(); }

/**
 * Get or create AudioContext (lazy, must be called after user gesture).
 * iOS Safari requires resume() during the user gesture — call ensureAudioContext() early.
 */
export function getAudioContext() {
  if (!audioContext) {
    // iOS Safari may not support custom sampleRate — use default and resample in createAudioBuffer
    try {
      audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    } catch {
      audioContext = new AudioContext();
    }
  }
  return audioContext;
}

/**
 * Must be called synchronously inside a user tap/click handler on iOS Safari.
 * Creates the AudioContext and resumes it within the gesture to unlock audio.
 */
export async function ensureAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    await ctx.resume();
  }
  return ctx;
}

/**
 * Create an AudioBuffer from raw PCM float32 data.
 * Handles sample rate mismatch on iOS Safari (may use 44100/48000 instead of 22050).
 * @param {Float32Array} pcmData - Raw audio samples at SAMPLE_RATE (22050)
 * @returns {AudioBuffer}
 */
export function createAudioBuffer(pcmData) {
  const ctx = getAudioContext();
  // If AudioContext matches model sample rate, use directly
  if (ctx.sampleRate === SAMPLE_RATE) {
    const buffer = ctx.createBuffer(1, pcmData.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(pcmData);
    return buffer;
  }
  // Resample: iOS Safari often uses 48000 Hz — upsample from 22050
  const ratio = ctx.sampleRate / SAMPLE_RATE;
  const newLength = Math.round(pcmData.length * ratio);
  const buffer = ctx.createBuffer(1, newLength, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i / ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    const a = pcmData[idx] || 0;
    const b = pcmData[Math.min(idx + 1, pcmData.length - 1)] || 0;
    output[i] = a + frac * (b - a); // linear interpolation
  }
  return buffer;
}

/**
 * Play an AudioBuffer. Returns a promise that resolves when playback ends.
 * @param {AudioBuffer} audioBuffer
 * @param {number} volume - 0.0 to 1.0
 * @returns {Promise<void>} Resolves when audio finishes playing
 */
export function playBuffer(audioBuffer, volume = 1.0) {
  return new Promise(async (resolve, reject) => {
    const ctx = getAudioContext();

    // Resume context if it was suspended (e.g. after pause)
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch (err) {
        reject(err);
        return;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Disconnect previous gain node to prevent leak
    if (gainNode) gainNode.disconnect();

    gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(ctx.destination);

    source.onended = () => {
      currentSource = null;
      resolve();
    };
    source.onerror = (err) => {
      currentSource = null;
      reject(err);
    };

    currentSource = source;
    source.start(0);
  });
}

/**
 * Schedule an AudioBuffer at a precise AudioContext time for gapless playback.
 * Reuses the GainNode to avoid reconnection overhead between sentences.
 * @param {AudioBuffer} audioBuffer
 * @param {number} startAt - AudioContext.currentTime value to start at
 * @param {number} volume - 0.0 to 1.0
 * @returns {{ endTime: number, promise: Promise<void> }}
 */
export async function scheduleBuffer(audioBuffer, startAt, volume = 1.0) {
  const ctx = getAudioContext();
  // iOS Safari may suspend context between sentences — ensure it's running
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { /* ignore */ }
  }
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  // Reuse gain node across scheduled sources (no disconnect/reconnect overhead)
  if (!gainNode) {
    gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
  }
  gainNode.gain.value = volume;
  source.connect(gainNode);

  const endTime = startAt + audioBuffer.duration;

  const promise = new Promise((resolve) => {
    source.onended = () => {
      source.disconnect();
      activeSources = activeSources.filter((s) => s !== source);
      resolve();
    };
  });

  // Cap active sources to prevent memory buildup on iOS Safari.
  // Only evict sources whose scheduled end time has passed.
  const now = ctx.currentTime;
  activeSources = activeSources.filter((s) => {
    try {
      // Sources with null buffer are already done
      if (!s.buffer) { s.disconnect(); return false; }
      return true;
    } catch { return false; }
  });
  while (activeSources.length >= 4) {
    const old = activeSources.shift();
    try { old.stop(); old.disconnect(); } catch { /* already stopped */ }
  }

  activeSources.push(source);
  source.start(startAt);

  return { endTime, promise };
}

/** Pause playback by suspending AudioContext */
export async function pause() {
  const ctx = audioContext;
  if (ctx && ctx.state === 'running') {
    await ctx.suspend();
  }
}

/** Resume playback by resuming AudioContext */
export async function resume() {
  const ctx = audioContext;
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/** Stop current playback immediately (all scheduled + legacy sources) */
export function stop() {
  for (const src of activeSources) {
    try { src.stop(); } catch { /* already stopped */ }
  }
  activeSources = [];
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }
}

/** Dispose AudioContext and clean up */
export async function disposeAudio() {
  stop();
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }
  gainNode = null;
  activeSources = [];
}
