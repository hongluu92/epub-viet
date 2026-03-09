/**
 * TTS model loader — downloads ONNX model to IndexedDB, loads from there.
 */

const MODEL_URL = 'https://3gpp.arrow-tech.vn/api/v1/static/nh.onnx';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_CONFIG_URL = `${BASE_PATH}/model/nh.onnx.json`;
const DB_NAME = 'readflow-tts';
const STORE_NAME = 'model';
const MODEL_KEY = 'nh.onnx';

let onnxSession = null;

// Simple IndexedDB helpers
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

/**
 * Load ONNX model with IndexedDB caching and progress tracking.
 * @param {(progress: number) => void} onProgress - 0-100 progress callback
 */
export async function loadModel(onProgress) {
  if (onnxSession) return onnxSession;

  const ort = await import('onnxruntime-web');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = `${BASE_PATH}/`;

  const db = await openDB();
  let buffer = await getFromDB(db);

  // Validate cached model
  if (buffer) {
    const header = new Uint8Array(buffer, 0, 4);
    if (header[0] !== 0x08) buffer = null;
    else onProgress?.(90);
  }

  // Download if not cached
  if (!buffer) {
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

    // Merge into single ArrayBuffer
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    chunks.length = 0;
    buffer = merged.buffer;

    // Save to IndexedDB
    await saveToDB(db, buffer);
    onProgress?.(90);
  }

  // Create ONNX session
  console.log('[TTS] Creating ONNX session, size:', buffer.byteLength);
  onProgress?.(92);

  try {
    onnxSession = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
  } catch (err) {
    console.error('[TTS] ONNX session create failed:', err);
    throw err;
  }

  console.log('[TTS] ONNX session created');
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
