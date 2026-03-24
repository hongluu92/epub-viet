/**
 * TTS phonemizer — uses Piper phonemize worker for Vietnamese first,
 * then falls back to character-level mapping if worker/network fails.
 */

import { getModelConfigUrl } from './tts-model-loader';
import { PHONEME_ID_MAP, BOS_ID, EOS_ID } from '@/lib/utils/phoneme-id-map';

const PAD_ID = PHONEME_ID_MAP['_'] ?? 0;
const SPACE_ID = PHONEME_ID_MAP[' '] ?? 3;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const PIPER_PHONEMIZE_JS_URL = `${BASE_PATH}/piper/piper_phonemize.js`;
const PIPER_WORKER_URL = `${BASE_PATH}/piper/piper_worker.js`;
const ORT_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.1/';
const PIPER_CDN_ASSET_BASE = 'https://cdn.jsdelivr.net/gh/DavidCks/piper-wasm@main/build';
const PIPER_LOCAL_ASSET_BASE = `${BASE_PATH}/piper`;
const piperBlobCache = {};
let phonemizerWorker = null;
let phonemizeQueue = Promise.resolve();

function getPhonemizerWorker() {
  if (!phonemizerWorker) {
    phonemizerWorker = new Worker(PIPER_WORKER_URL);
  }
  return phonemizerWorker;
}

function resetPhonemizerWorker() {
  if (phonemizerWorker) {
    phonemizerWorker.terminate();
    phonemizerWorker = null;
  }
}

function enqueuePhonemize(task) {
  const run = phonemizeQueue.then(task, task);
  phonemizeQueue = run.catch(() => {});
  return run;
}

function runPhonemizerRequest(text, assetBase) {
  return new Promise((resolve, reject) => {
    const worker = getPhonemizerWorker();
    const timeoutId = setTimeout(() => {
      cleanup();
      resetPhonemizerWorker();
      reject(new Error('Piper phonemizer timeout'));
    }, 20000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
    };

    const handleMessage = (event) => {
      const data = event.data;
      if (data?.kind === 'output') {
        cleanup();
        resolve(data.phonemeIds || []);
        return;
      }
      if (data?.kind === 'stderr') {
        cleanup();
        reject(new Error(data.message || 'Piper phonemizer stderr'));
        return;
      }
      if (data?.kind === 'debug') return;
      if (data?.kind === 'fetch' && data.url && data.blob) {
        piperBlobCache[data.url] = data.blob;
      }
    };

    const handleError = (err) => {
      cleanup();
      resetPhonemizerWorker();
      reject(err);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({
      kind: 'phonemize',
      input: text,
      speakerId: null,
      blobs: piperBlobCache,
      piperPhonemizeJsUrl: PIPER_PHONEMIZE_JS_URL,
      piperPhonemizeWasmUrl: `${assetBase}/piper_phonemize.wasm`,
      piperPhonemizeDataUrl: `${assetBase}/piper_phonemize.data`,
      modelUrl: null,
      modelConfigUrl: getModelConfigUrl(),
      onnxruntimeUrl: ORT_BASE_URL,
    });
  });
}

function normalizeVietnameseText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

/**
 * Fallback phonemizer using character-level mapping.
 * Adds BOS/EOS tokens and padding between phonemes.
 * @param {string} text - Text to convert
 * @returns {number[]} Array of phoneme IDs for ONNX model input
 */
function textToPhonemeIdsFallback(text) {
  if (!text?.trim()) return [];

  const ids = [];

  // BOS token
  ids.push(BOS_ID);

  const cleanText = normalizeVietnameseText(text.trim());

  for (const char of cleanText) {
    const mapped = PHONEME_ID_MAP[char];
    if (mapped !== undefined) {
      ids.push(mapped);
      // Padding between phonemes
      ids.push(PAD_ID);
    }
    // Preserve sentence flow by turning unknown characters into spacing pauses.
    else if (!ids.length || ids[ids.length - 1] !== SPACE_ID) {
      ids.push(SPACE_ID);
      ids.push(PAD_ID);
    }
  }

  // EOS token
  ids.push(EOS_ID);

  return ids.length > 2 ? ids : [];
}

// iOS detection — skip piper WASM worker to avoid double WASM memory pressure
// (piper loads its own ONNX runtime + 17MB .data file inside worker)
const isIOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Convert text to phoneme IDs using Piper phonemizer (Vietnamese model config).
 * On iOS: uses lightweight character-level mapping to avoid 35MB+ WASM memory spike.
 * On desktop/Android: uses full Piper phonemizer for better pronunciation.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function textToPhonemeIds(text) {
  if (!text?.trim()) return [];
  if (typeof window === 'undefined') return textToPhonemeIdsFallback(text);

  // iOS: skip piper WASM worker entirely — character fallback uses zero extra memory
  if (isIOS) return textToPhonemeIdsFallback(text);

  try {
    let phonemeIds = [];
    try {
      phonemeIds = await enqueuePhonemize(() => runPhonemizerRequest(text, PIPER_LOCAL_ASSET_BASE));
    } catch {
      // Local wasm/data unavailable, fallback to CDN
      phonemeIds = await enqueuePhonemize(() => runPhonemizerRequest(text, PIPER_CDN_ASSET_BASE));
    }

    if (Array.isArray(phonemeIds) && phonemeIds.length > 0) {
      return phonemeIds;
    }
  } catch {
    // Piper phonemizer failed, use fallback character mapping
  }

  return textToPhonemeIdsFallback(text);
}
