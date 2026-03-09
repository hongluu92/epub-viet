/**
 * TTS model loader — handles ONNX model loading with Cache Storage API.
 * Serves model from /public/model/ directory.
 */

// ONNX model hosted on arrow-tech CDN
const MODEL_URL = 'https://3gpp.arrow-tech.vn/api/v1/static/nh.onnx';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_CONFIG_URL = `${BASE_PATH}/model/nh.onnx.json`;
const CACHE_NAME = 'readflow-tts-model-v1';

let onnxSession = null;

/**
 * Load ONNX model with caching and progress tracking.
 * @param {(progress: number) => void} onProgress - 0-100 progress callback
 */
export async function loadModel(onProgress) {
  if (onnxSession) return onnxSession;
  console.log('[TTS] Loading onnxruntime-web...');

  const ort = await import('onnxruntime-web');
  console.log('[TTS] onnxruntime-web imported, configuring WASM...');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = `${BASE_PATH}/`;

  // Clear any stale cache that might have stored non-model data (e.g. 404 HTML)
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(MODEL_URL);

  let buffer;

  if (cached) {
    console.log('[TTS] Found cached model, loading...');
    onProgress?.(95);
    buffer = await cached.arrayBuffer();
    // Validate it's actually an ONNX file (starts with protobuf magic bytes)
    const header = new Uint8Array(buffer, 0, 4);
    if (header[0] !== 0x08) {
      // Corrupted cache — delete and re-fetch
      await cache.delete(MODEL_URL);
      buffer = null;
    }
  }

  if (!buffer) {
    console.log('[TTS] Fetching model from', MODEL_URL);
    const fetchResponse = await fetch(MODEL_URL);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch model: ${fetchResponse.status}`);
    }

    const contentLength = fetchResponse.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 63500000; // ~60MB fallback
    // Pre-allocate single buffer to avoid memory fragmentation
    buffer = new ArrayBuffer(total);
    const dest = new Uint8Array(buffer);
    const reader = fetchResponse.body.getReader();
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      dest.set(value, received);
      received += value.length;
      onProgress?.(Math.round((received / total) * 90));
    }

    // Trim if actual size differs from content-length
    if (received !== total) {
      buffer = buffer.slice(0, received);
    }

    // Cache for next time
    await cache.put(MODEL_URL, new Response(new Blob([buffer])));
    onProgress?.(95);
  }

  console.log('[TTS] Creating ONNX session, buffer size:', buffer.byteLength);
  try {
    onnxSession = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
  } catch (err) {
    console.error('[TTS] ONNX session create failed:', err);
    throw err;
  }
  console.log('[TTS] ONNX session created successfully');
  onProgress?.(100);
  return onnxSession;
}

/** Get cached session (must call loadModel first) */
export function getSession() {
  return onnxSession;
}

/** Get model config URL for piper-wasm phonemizer */
export function getModelConfigUrl() {
  return MODEL_CONFIG_URL;
}

/** Dispose ONNX session and clear cache reference */
export async function disposeModel() {
  if (onnxSession) {
    await onnxSession.release();
    onnxSession = null;
  }
}
