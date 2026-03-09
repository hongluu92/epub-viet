/**
 * TTS model loader — handles ONNX model loading with Cache Storage API.
 * Uses URL-based loading to let ONNX runtime manage memory internally.
 */

// ONNX model hosted on arrow-tech CDN
const MODEL_URL = 'https://3gpp.arrow-tech.vn/api/v1/static/nh.onnx';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_CONFIG_URL = `${BASE_PATH}/model/nh.onnx.json`;
const CACHE_NAME = 'readflow-tts-model-v1';

let onnxSession = null;

/**
 * Pre-download model into Cache Storage with progress tracking.
 * Once cached, ONNX runtime loads via URL from cache (Service Worker intercept not needed —
 * ort fetches the URL, and the browser serves it from Cache Storage automatically if we
 * prime it first).
 */
async function ensureModelCached(onProgress) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(MODEL_URL);

  if (cached) {
    // Validate it's actually an ONNX file
    const blob = await cached.clone().blob();
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    if (header[0] === 0x08) {
      console.log('[TTS] Model found in cache');
      onProgress?.(90);
      return;
    }
    await cache.delete(MODEL_URL);
  }

  console.log('[TTS] Downloading model...');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Failed to fetch model: ${res.status}`);

  const contentLength = res.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 63500000;
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(Math.round((received / total) * 85));
  }

  // Store in cache as a proper Response
  const blob = new Blob(chunks);
  chunks.length = 0; // release refs
  await cache.put(MODEL_URL, new Response(blob, {
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(received) },
  }));
  onProgress?.(90);
}

/**
 * Load ONNX model with caching and progress tracking.
 * @param {(progress: number) => void} onProgress - 0-100 progress callback
 */
export async function loadModel(onProgress) {
  if (onnxSession) return onnxSession;

  const ort = await import('onnxruntime-web');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = `${BASE_PATH}/`;

  // Step 1: Ensure model is in Cache Storage (with progress)
  await ensureModelCached(onProgress);

  // Step 2: Load from cache — read as ArrayBuffer for ONNX runtime
  onProgress?.(92);
  console.log('[TTS] Creating ONNX session...');

  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(MODEL_URL);
  const buffer = await cached.arrayBuffer();

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
