// TTS model loading: Cache Storage API first, then jsDelivr CDN fallback
// Model is ~63MB, cached persistently after first download

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/kiwi-oss/book-tts-3@main/model/nh.onnx';
const CACHE_NAME = 'readflow-tts-model-v1';

/**
 * Load ONNX model buffer: try cache first, then fetch from CDN.
 * @param {(percent: number) => void} onProgress - progress callback 0–100
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchModelBuffer(onProgress) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(MODEL_URL);
    if (cached) {
      onProgress?.(100);
      return cached.arrayBuffer();
    }
  } catch {
    // Cache API unavailable (e.g. non-secure context) — fall through to fetch
  }

  // Fetch from CDN with progress tracking via ReadableStream
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Model fetch failed: ${response.status}`);

  const contentLength = Number(response.headers.get('Content-Length') || 0);
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (contentLength > 0) {
      onProgress?.(Math.round((received / contentLength) * 95));
    }
  }

  // Combine chunks into single ArrayBuffer
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  const arrayBuffer = buffer.buffer;

  // Store in cache for subsequent loads
  try {
    const cache = await caches.open(CACHE_NAME);
    const responseToCache = new Response(arrayBuffer.slice(0), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    await cache.put(MODEL_URL, responseToCache);
  } catch {
    // Cache write failure is non-fatal
  }

  onProgress?.(100);
  return arrayBuffer;
}

/**
 * Check if model is already cached (no download needed).
 * @returns {Promise<boolean>}
 */
export async function isModelCached() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(MODEL_URL);
    return !!match;
  } catch {
    return false;
  }
}
