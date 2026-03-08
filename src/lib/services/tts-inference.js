/**
 * TTS inference — runs ONNX model to convert phoneme IDs to audio PCM data.
 * Supports speed control via lengthScale parameter.
 */

import { getSession } from './tts-model-loader';
import { DEFAULT_SCALES } from '@/lib/utils/phoneme-id-map';

/**
 * Run inference on phoneme IDs to produce raw audio float32 samples.
 * @param {number[]} phonemeIds - Array of phoneme IDs from phonemizer
 * @param {number} speed - Speed multiplier (0.5=2x fast, 2.0=2x slow). Default 1.0
 * @returns {Promise<Float32Array>} Raw PCM audio samples at 22050 Hz
 */
export async function inferAudio(phonemeIds, speed = 1.0) {
  const session = getSession();
  if (!session) {
    throw new Error('ONNX session not loaded. Call loadModel() first.');
  }

  const ort = await import('onnxruntime-web');

  // Convert speed multiplier to lengthScale (inverse: higher speed = lower lengthScale)
  const lengthScale = 1.0 / speed;

  const inputIds = new BigInt64Array(phonemeIds.map((id) => BigInt(id)));
  const inputLengths = new BigInt64Array([BigInt(phonemeIds.length)]);
  const scales = new Float32Array([
    DEFAULT_SCALES.noiseScale,
    lengthScale,
    DEFAULT_SCALES.noiseW,
  ]);
  const feeds = {
    input: new ort.Tensor('int64', inputIds, [1, phonemeIds.length]),
    input_lengths: new ort.Tensor('int64', inputLengths, [1]),
    // Piper VITS model expects scales as rank-1 [3], not [1,3].
    scales: new ort.Tensor('float32', scales, [3]),
  };

  const results = await session.run(feeds);
  return results.output.data;
}
