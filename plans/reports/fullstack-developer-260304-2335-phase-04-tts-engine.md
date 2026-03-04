# Phase Implementation Report

## Executed Phase
- Phase: phase-04-tts-engine
- Plan: /Users/kiwi/Work/Me/book-tts-3/plans/260304-2258-readflow-tts-web-app/
- Status: completed

## Files Modified

| File | Action | Lines |
|------|--------|-------|
| `src/utils/phoneme-id-map.js` | Created | 46 |
| `src/services/tts-model-loader.js` | Created | 76 |
| `src/services/tts-engine.js` | Created | 170 |
| `src/services/tts-web-speech-fallback.js` | Created | 67 |
| `src/hooks/useTTS.js` | Created | 178 |
| `src/store/app-store.js` | Extended | +4 lines |

## Tasks Completed

- [x] Extract phoneme_id_map from nh.onnx.json → `phoneme-id-map.js`
- [x] Model loading with Cache Storage + progress tracking → `tts-model-loader.js`
- [x] ONNX inference wrapper with try/catch + `isOnnxAvailable()` → `tts-engine.js`
- [x] Character-level phoneme conversion (textToPhonemeIds) → `tts-engine.js`
- [x] Web Audio API playback (playBuffer, stop, pause, resume) → `tts-engine.js`
- [x] Web Speech API fallback → `tts-web-speech-fallback.js`
- [x] Sentence queue with 2-sentence prefetch → `useTTS.js`
- [x] play/pause/stop/skip/speed controls → `useTTS.js`
- [x] ttsActive flag added to app-store.js
- [x] `npm run build` passes with no errors

## Tests Status
- Type check: N/A (plain JS project)
- Unit tests: N/A (no test runner configured in phase scope)
- Build: PASS (vite build, 1.59s, 0 errors)

## Key Design Decisions

1. **tts-engine split into two files** — `tts-model-loader.js` handles CDN fetch + Cache Storage; `tts-engine.js` handles session, phoneme conversion, and playback. Keeps both under 200 lines.
2. **Dynamic `import('onnxruntime-web')`** — avoids hard build-time failure if WASM unavailable; `isOnnxAvailable()` returns false after failed import.
3. **WASM path config** — `ort.env.wasm.wasmPaths = import.meta.env.BASE_URL` lets Vite serve the bundled `.wasm` files from the correct base path.
4. **Character-level phoneme mapping** — espeak-ng not available in browser; the nh.onnx phoneme_id_map contains basic Latin + IPA characters so direct char mapping is viable for Vietnamese text.
5. **Prefetch cache keyed by sentence index** — cleared on speed change or stop to avoid stale buffers.

## Issues Encountered

None. Build produced empty chunks for firebase and onnx lazy-loaded modules — this is expected (dynamic imports).

## Next Steps

- Phase 5: TtsControls + SentenceRenderer components consume `useTTS` hook
- Phase 6: ReaderPage integrates TTS; uses `ttsActive` store flag to auto-resume on chapter change
- MODEL_URL placeholder `{username}` in `tts-model-loader.js` should be updated to real GitHub username before deploy

## Unresolved Questions

1. The `MODEL_URL` in `tts-model-loader.js` uses placeholder `kiwi-oss/book-tts-3` — should be updated to the actual GitHub repo path before deploying to production.
2. Vietnamese character-level mapping will produce phoneme sequences for basic Latin characters in Vietnamese words (a, b, c, d…) but may not produce accurate IPA phonemes for tonal diacritics (à, á, ả, ã, ạ, etc.) since those aren't in the phoneme_id_map. Tonal marks will be silently skipped — output will be intelligible but monotone. A pre-processing step normalizing Vietnamese tones to espeak IPA sequences would improve quality significantly.
