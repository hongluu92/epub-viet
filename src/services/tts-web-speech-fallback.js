// Web Speech API fallback — used when ONNX inference is unavailable
// Selects Vietnamese voice if available, otherwise uses browser default

/** @returns {boolean} */
export function isWebSpeechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get the best available voice for Vietnamese text.
 * Prefers voices with lang 'vi', falls back to first available.
 * @returns {SpeechSynthesisVoice|null}
 */
function getVietnameseVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith('vi')) ||
    voices[0] ||
    null
  );
}

/**
 * Speak text using Web Speech API.
 * @param {string} text
 * @param {{ rate?: number, onStart?: () => void, onEnd?: () => void, onBoundary?: (e: SpeechSynthesisEvent) => void }} options
 * @returns {Promise<void>} resolves when utterance ends or is cancelled
 */
export function speakText(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isWebSpeechAvailable()) {
      reject(new Error('Web Speech API not available'));
      return;
    }

    window.speechSynthesis.cancel(); // clear queue

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = options.rate ?? 1.0;

    const voice = getVietnameseVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => { options.onEnd?.(); resolve(); };
    utterance.onerror = (e) => {
      // 'interrupted' is normal when stop() is called — treat as resolved
      if (e.error === 'interrupted' || e.error === 'canceled') resolve();
      else reject(new Error(`SpeechSynthesis error: ${e.error}`));
    };
    utterance.onboundary = (e) => options.onBoundary?.(e);

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeech() {
  if (isWebSpeechAvailable()) window.speechSynthesis.cancel();
}

export function pauseSpeech() {
  if (isWebSpeechAvailable()) window.speechSynthesis.pause();
}

export function resumeSpeech() {
  if (isWebSpeechAvailable()) window.speechSynthesis.resume();
}
