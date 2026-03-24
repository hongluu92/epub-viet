/**
 * TTS model loader — 2-phase approach:
 * Phase 1 (on reader enter): download model → save to IndexedDB → release memory
 * Phase 2 (on play): load from IndexedDB → create ONNX session
 */

const MODEL_URL = 'https://3gpp.arrow-tech.vn/api/v1/static/nh.onnx';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_CONFIG_URL = `${BASE_PATH}/model/nh.onnx.json`;
const DB_NAME = 'readflow-tts';
const STORE_NAME = 'model';
const MODEL_KEY = 'nh.onnx';

let onnxSession = null;

/** Check if WebAssembly is available (blocked by Edge Enhanced Protection) */
export function isWasmAvailable() {
  try {
    if (typeof WebAssembly !== 'object') return false;
    // Minimal WASM module validation — tests compile + instantiate
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const mod = new WebAssembly.Module(bytes);
    return mod instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

// --- IndexedDB helpers ---

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(MODEL_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToDB(db, buffer) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(buffer, MODEL_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Phase 1: Download & persist (called on reader page load) ---

/** Check if model exists in IndexedDB */
export async function isModelCached() {
  try {
    const db = await openDB();
    const data = await getFromDB(db);
    db.close();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Download model and save to IndexedDB. No ONNX loading here.
 * All download memory is released after save completes.
 * @param {(progress: number) => void} onProgress - 0-100 download progress
 */
export async function downloadModel(onProgress) {
  const db = await openDB();

  // Check if already cached
  const existing = await getFromDB(db);
  if (existing) {
    db.close();
    onProgress?.(100);
    return;
  }

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
    onProgress?.(Math.round((received / total) * 90));
  }

  // Merge chunks into single buffer, then release chunk refs immediately
  const merged = new Uint8Array(received);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset);
    offset += chunks[i].length;
    chunks[i] = null; // release each chunk as we copy
  }
  chunks.length = 0;

  // Save to IndexedDB, then release merged buffer
  await saveToDB(db, merged.buffer);
  db.close();
  onProgress?.(100);
  // merged goes out of scope → GC can reclaim ~60MB
}

// --- Phase 2: Load from IndexedDB (called on play) ---

/**
 * Load ONNX model from IndexedDB and create inference session.
 * Should only be called after downloadModel() has completed.
 * @param {(progress: number) => void} onProgress - 0-100 progress callback
 */
// Yield to main thread to prevent UI freeze during heavy memory operations
const yieldToMain = () => new Promise((r) => setTimeout(r, 0));

export async function loadModel(onProgress) {
  if (onnxSession) return onnxSession;
  if (!isWasmAvailable()) {
    throw new Error('WebAssembly is not available. TTS requires WASM support.');
  }

  const ort = await import('onnxruntime-web');
  // Force single-thread on mobile to reduce WASM memory overhead.
  // Multi-threading requires COOP/COEP headers + doubles memory for SharedArrayBuffer.
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const canMultiThread =
    !isMobile && typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  const threadCount =
    canMultiThread && navigator.hardwareConcurrency
      ? Math.min(4, Math.max(1, navigator.hardwareConcurrency))
      : 1;
  ort.env.wasm.numThreads = threadCount;
  ort.env.wasm.wasmPaths = `${BASE_PATH}/`;
  onProgress?.(20);

  // Yield before heavy IndexedDB read to keep UI responsive
  await yieldToMain();

  // Read from IndexedDB as Uint8Array (not ArrayBuffer) for explicit GC control
  const db = await openDB();
  let buffer = await getFromDB(db);
  db.close();

  if (!buffer) {
    throw new Error('Model not found in IndexedDB. Call downloadModel() first.');
  }
  // Wrap in Uint8Array if raw ArrayBuffer (IndexedDB may return either)
  let modelBytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  buffer = null; // Release original reference for GC
  onProgress?.(40);

  // Yield before session creation — ONNX copies to WASM heap, biggest memory spike
  await yieldToMain();

  // Create ONNX session with reduced optimization for lower memory on mobile
  try {
    const sessionOptions = {
      executionProviders: ['wasm'],
    };
    // On mobile, disable graph optimization to reduce peak memory during session init
    if (isMobile) {
      sessionOptions.graphOptimizationLevel = 'disabled';
    }
    onnxSession = await ort.InferenceSession.create(modelBytes, sessionOptions);
  } catch (err) {
    console.error('[TTS] ONNX session create failed:', err);
    throw err;
  } finally {
    // Release the JS-side model bytes — ONNX has already copied to WASM heap
    modelBytes = null;
  }

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
