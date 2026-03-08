/**
 * TTS phonemizer — uses Piper phonemize worker for Vietnamese first,
 * then falls back to character-level mapping if worker/network fails.
 */

import { getModelConfigUrl } from './tts-model-loader';
import { PHONEME_ID_MAP, BOS_ID, EOS_ID } from '@/lib/utils/phoneme-id-map';

const PAD_ID = PHONEME_ID_MAP['_'] ?? 0;
const SPACE_ID = PHONEME_ID_MAP[' '] ?? 3;
const PIPER_ASSET_BASE = 'https://cdn.jsdelivr.net/gh/DavidCks/piper-wasm@main/build';
const PIPER_PHONEMIZE_JS_URL = '/piper/piper_phonemize.js';
const PIPER_PHONEMIZE_WASM_URL = `${PIPER_ASSET_BASE}/piper_phonemize.wasm`;
const PIPER_PHONEMIZE_DATA_URL = `${PIPER_ASSET_BASE}/piper_phonemize.data`;
const PIPER_WORKER_URL = '/piper/piper_worker.js';
const ORT_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.1/';
const piperBlobCache = {};

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

  const hasUsablePhonemes = ids.length > 2;
  console.log('[Phonemizer] Text:', text.substring(0, 40), '→', ids.length, 'IDs');
  return hasUsablePhonemes ? ids : [];
}

/**
 * Convert text to phoneme IDs using Piper phonemizer (Vietnamese model config).
 * Falls back to character-level mapping if Piper phonemizer is unavailable.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function textToPhonemeIds(text) {
  if (!text?.trim()) return [];
  if (typeof window === 'undefined') return textToPhonemeIdsFallback(text);

  try {
    console.log('[Phonemizer] Starting Piper worker', {
      workerUrl: PIPER_WORKER_URL,
      modelConfigUrl: getModelConfigUrl(),
      phonemizeJsUrl: PIPER_PHONEMIZE_JS_URL,
      phonemizeWasmUrl: PIPER_PHONEMIZE_WASM_URL,
      phonemizeDataUrl: PIPER_PHONEMIZE_DATA_URL,
    });

    const phonemeIds = await new Promise((resolve, reject) => {
      const worker = new Worker(PIPER_WORKER_URL);
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error('Piper phonemizer timeout'));
      }, 20000);

      worker.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.kind === 'output') {
          clearTimeout(timeoutId);
          worker.terminate();
          resolve(data.phonemeIds || []);
          return;
        }
        if (data?.kind === 'stderr') {
          clearTimeout(timeoutId);
          worker.terminate();
          reject(new Error(data.message || 'Piper phonemizer stderr'));
          return;
        }
        if (data?.kind === 'debug') {
          console.log('[Phonemizer/Worker]', data.message, data.meta || {});
          return;
        }
        if (data?.kind === 'fetch' && data.url && data.blob) {
          piperBlobCache[data.url] = data.blob;
        }
      });

      worker.postMessage({
        kind: 'phonemize',
        input: text,
        speakerId: null,
        blobs: piperBlobCache,
        piperPhonemizeJsUrl: PIPER_PHONEMIZE_JS_URL,
        piperPhonemizeWasmUrl: PIPER_PHONEMIZE_WASM_URL,
        piperPhonemizeDataUrl: PIPER_PHONEMIZE_DATA_URL,
        modelUrl: null,
        modelConfigUrl: getModelConfigUrl(),
        onnxruntimeUrl: ORT_BASE_URL,
      });
    });

    if (Array.isArray(phonemeIds) && phonemeIds.length > 0) {
      console.log('[Phonemizer] Piper phonemizer OK:', phonemeIds.length, 'IDs');
      return phonemeIds;
    }
  } catch (err) {
    console.warn('[Phonemizer] Piper phonemizer failed, fallback mapping:', err);
  }

  console.log('[Phonemizer] Using fallback character mapping');
  return textToPhonemeIdsFallback(text);
}
