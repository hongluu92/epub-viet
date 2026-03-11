/**
 * TTS audio player — Web Audio API playback with pause/resume/stop controls.
 * Creates AudioBuffers from raw PCM float32 data at 22050 Hz.
 */

import { SAMPLE_RATE } from '@/lib/utils/phoneme-id-map';

let audioContext = null;
let currentSource = null;
let gainNode = null;
let activeSources = [];

/** Get or create AudioContext (lazy, must be called after user gesture) */
export function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  }
  return audioContext;
}

/**
 * Create an AudioBuffer from raw PCM float32 data.
 * @param {Float32Array} pcmData - Raw audio samples
 * @returns {AudioBuffer}
 */
export function createAudioBuffer(pcmData) {
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(1, pcmData.length, SAMPLE_RATE);
  buffer.getChannelData(0).set(pcmData);
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
export function scheduleBuffer(audioBuffer, startAt, volume = 1.0) {
  const ctx = getAudioContext();
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
      activeSources = activeSources.filter((s) => s !== source);
      resolve();
    };
  });

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
