/**
 * Native Web Speech API TTS for iOS Safari.
 * Uses the browser's built-in Vietnamese voice — no WASM, no model, instant.
 */

let resolveCurrentPlay = null;

/** Check if native speech synthesis is available with a Vietnamese voice */
export function isNativeSpeechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak a sentence and return a promise that resolves when done */
export function speakNative(text, speed = 1.0) {
  return new Promise((resolve) => {
    if (!text?.trim() || !isNativeSpeechAvailable()) {
      resolve();
      return;
    }

    // iOS Safari bug: speechSynthesis sometimes stalls. Cancel first.
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'vi-VN';
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));

    // Try to find a Vietnamese voice
    const voices = speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;

    resolveCurrentPlay = resolve;

    utterance.onend = () => { resolveCurrentPlay = null; resolve(); };
    utterance.onerror = () => { resolveCurrentPlay = null; resolve(); };

    speechSynthesis.speak(utterance);

    // iOS Safari workaround: speechSynthesis can silently stop after ~15s.
    // Set a safety timeout based on estimated duration.
    const estimatedMs = Math.max(3000, text.length * 80 / speed);
    setTimeout(() => {
      if (resolveCurrentPlay === resolve) {
        resolveCurrentPlay = null;
        resolve();
      }
    }, estimatedMs);
  });
}

export function pauseNative() {
  if (isNativeSpeechAvailable()) speechSynthesis.pause();
}

export function resumeNative() {
  if (isNativeSpeechAvailable()) speechSynthesis.resume();
}

export function stopNative() {
  if (isNativeSpeechAvailable()) speechSynthesis.cancel();
  if (resolveCurrentPlay) {
    resolveCurrentPlay();
    resolveCurrentPlay = null;
  }
}
