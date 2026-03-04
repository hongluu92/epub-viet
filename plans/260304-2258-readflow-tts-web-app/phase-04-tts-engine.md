# Phase 04: TTS Engine

## Context Links

- [Plan Overview](plan.md)
- [Piper TTS Research](../reports/researcher-260304-2250-piper-tts-wasm-browser.md)
- [Brainstorm — TTS Queue Strategy](../reports/brainstorm-260304-2250-readflow-tts-web-app.md)
- Model config: `model/nh.onnx.json`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 5h
- **Description:** Implement Piper TTS in-browser using onnxruntime-web + @evermeet/espeak-ng WASM. Model loading with Cache Storage API, sentence-level inference with prefetch queue, Web Audio API playback.

## Key Insights

- Piper model inputs: `input_ids` (int64 phoneme IDs), `input_lengths` (int64), `scales` (float32: noise_scale, length_scale, noise_w), `speaker_id` (int64, always 0)
- Output: `audio` float32 at 22050 Hz
- espeak-ng WASM → phoneme string → map to nh.onnx.json `phoneme_id_map` → int64 array
- Model 63.5MB: lazy-load on first TTS activation, cache via Cache Storage API
- jsDelivr CDN: `cdn.jsdelivr.net/gh/{user}/book-tts-3@main/model/nh.onnx`
- Speed control: adjust `length_scale` (0.5=2x fast, 2.0=2x slow)
- Prefetch 2 sentences ahead for gapless playback

## Requirements

### Functional
- Load ONNX model from jsDelivr CDN with progress events
- Cache model in Cache Storage API (persistent across sessions)
- Convert Vietnamese text → phoneme IDs via espeak-ng
- Run inference → produce audio Float32Array
- Play audio via Web Audio API
- Sentence queue: play current, prefetch next 2
- Speed control (0.5x to 2.0x, step 0.25)
- Play/pause/stop/skip controls

### Non-Functional
- Model load: <100ms from cache, <15s first download
- Inference per sentence: <500ms on desktop, <3s on mobile
- Gapless playback between sentences (via prefetch)

## Architecture

### TTS Pipeline

```
User clicks Play
  → loadModel() [from cache or CDN]
  → initEspeak() [load WASM]
  → For each sentence:
      textToPhonemeIds(text)
        → espeak.textToPhonemes(text, {voice: 'vi'})
        → map phoneme string → nh.onnx.json phoneme_id_map → BigInt64Array
      inferSentence(phonemeIds)
        → ort.InferenceSession.run({input_ids, input_lengths, scales, speaker_id})
        → output.audio.data → Float32Array
      playAudio(float32Array)
        → AudioContext.createBuffer(1, length, 22050)
        → BufferSource.start()
        → On end → advance to next sentence
```

### Prefetch Strategy

```
Current: sentence[i]  → infer → play
Background: sentence[i+1] → infer → cache AudioBuffer
Background: sentence[i+2] → infer → cache AudioBuffer
On audio end → play from cache (instant) → start prefetching [i+3]
```

### Module Structure

```
tts-engine.js
├── loadModel(onProgress)     # CDN fetch + Cache API + ort.InferenceSession.create
├── initEspeak()              # Load @evermeet/espeak-ng WASM
├── textToPhonemeIds(text)    # espeak → phoneme map → BigInt64Array
├── inferSentence(text)       # Full pipeline: text → phonemeIds → inference → AudioBuffer
├── getAudioContext()         # Lazy singleton AudioContext
├── playBuffer(audioBuffer)   # Web Audio API playback, returns Promise<void> (resolves on end)
└── dispose()                 # Cleanup session + audio context
```

## Related Code Files

### Create
- `src/services/tts-engine.js` — core TTS: model loading, phoneme conversion, inference, playback
- `src/hooks/useTTS.js` — React hook wrapping tts-engine with sentence queue + prefetch
- `src/utils/phoneme-id-map.js` — extracted from nh.onnx.json (hardcoded fallback)

### Modify
- `src/store/app-store.js` — add TTS state slice (isPlaying, currentSentenceIdx, modelLoaded, speed)

## Implementation Steps

1. **Extract phoneme_id_map from `model/nh.onnx.json`**
   - Read `phoneme_id_map` object from config
   - Create `phoneme-id-map.js` exporting the map as JS object
   - This serves as both primary mapping and fallback if espeak output differs

2. **Create `tts-engine.js` — Model Loading**
   ```js
   const MODEL_URL = 'https://cdn.jsdelivr.net/gh/{user}/book-tts-3@main/model/nh.onnx';
   const CACHE_NAME = 'readflow-tts-model-v1';

   async function loadModel(onProgress) {
     const cache = await caches.open(CACHE_NAME);
     let response = await cache.match(MODEL_URL);
     if (!response) {
       response = await fetch(MODEL_URL);
       await cache.put(MODEL_URL, response.clone());
       // Track progress via response.body.getReader() for streaming
     }
     const buffer = await response.arrayBuffer();
     return ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] });
   }
   ```

3. **Create `tts-engine.js` — Phoneme Conversion**
   ```js
   async function textToPhonemeIds(text) {
     const espeak = await getEspeak(); // cached singleton
     const phonemeStr = espeak.textToPhonemes(text, { voice: 'vi' });
     // Split phoneme string → individual phonemes
     // Map each → phoneme_id_map[phoneme] → ID
     // Wrap in sentence start/end tokens: [BOS, ...ids, EOS]
     return new BigInt64Array(ids.map(BigInt));
   }
   ```

4. **Create `tts-engine.js` — Inference**
   ```js
   async function inferSentence(text) {
     const phonemeIds = await textToPhonemeIds(text);
     const session = getSession(); // cached
     const outputs = await session.run({
       input_ids: new ort.Tensor('int64', phonemeIds, [1, phonemeIds.length]),
       input_lengths: new ort.Tensor('int64', new BigInt64Array([BigInt(phonemeIds.length)]), [1]),
       scales: new ort.Tensor('float32', new Float32Array([0.667, currentSpeed, 0.8]), [1, 3]),
       speaker_id: new ort.Tensor('int64', new BigInt64Array([0n]), [1])
     });
     const audioData = outputs.audio.data;
     const ctx = getAudioContext();
     const buf = ctx.createBuffer(1, audioData.length, 22050);
     buf.getChannelData(0).set(audioData);
     return buf;
   }
   ```

5. **Create `tts-engine.js` — Playback**
   ```js
   function playBuffer(audioBuffer) {
     return new Promise((resolve) => {
       const ctx = getAudioContext();
       const source = ctx.createBufferSource();
       source.buffer = audioBuffer;
       const gain = ctx.createGain();
       gain.gain.value = volume;
       source.connect(gain).connect(ctx.destination);
       source.onended = resolve;
       source.start(0);
       currentSource = source; // for stop/pause
     });
   }
   ```

6. **Create `useTTS.js` hook**
   - State: `isModelLoaded`, `isModelLoading`, `modelProgress`, `isPlaying`, `isPaused`, `currentSentenceIdx`, `speed`
   - `initModel()`: call `loadModel(onProgress)` + `initEspeak()`
   - `play(sentences, startIdx)`:
     - Set playing state
     - Loop: infer current → play → prefetch next 2 → advance
     - Highlight callback on each sentence
   - `pause()`: suspend AudioContext
   - `resume()`: resume AudioContext
   - `stop()`: stop source, reset state
   - `setSpeed(value)`: update length_scale, clear prefetch cache
   - `skipNext()` / `skipPrev()`: jump to sentence

7. **Update `app-store.js`** — add TTS slice:
   ```js
   tts: { isPlaying, isPaused, currentSentenceIdx, speed, modelLoaded, modelProgress }
   ```

8. **Handle user gesture requirement** — AudioContext must be created after user interaction (click/tap). Create lazily on first play.

## Todo List

- [ ] Extract phoneme_id_map from nh.onnx.json
- [ ] Implement model loading with Cache Storage + progress
- [ ] Implement espeak-ng initialization
- [ ] Implement phoneme conversion (text → espeak → IDs)
- [ ] Implement ONNX inference wrapper
- [ ] Implement Web Audio API playback
- [ ] Implement sentence queue with 2-sentence prefetch
- [ ] Implement play/pause/stop/skip controls
- [ ] Implement speed control (length_scale)
- [ ] Create useTTS hook
- [ ] Update Zustand store with TTS state
- [ ] Test with sample Vietnamese sentences
- [ ] Test model caching (reload page, verify instant load)
- [ ] Test on mobile browser

## Success Criteria

- Model loads from CDN on first use with progress indicator
- Subsequent loads from cache <200ms
- Vietnamese text produces audible speech
- Sentences play in sequence without gaps
- Speed control works (audible difference at 0.5x vs 2.0x)
- Pause/resume works mid-sentence
- Stop clears queue and resets

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| espeak-ng Vietnamese phonemes don't match nh.onnx.json map | High | Build mapping layer; test extensively; fallback to hardcoded phoneme map |
| BigInt64Array not supported on older browsers | Medium | Check browser support; polyfill or use regular Int32Array if model accepts |
| AudioContext suspended by browser policy | Low | Create AudioContext only after user gesture; handle resume on user interaction |
| Inference too slow on low-end mobile | Medium | Show loading indicator per sentence; reduce prefetch on slow devices |
| jsDelivr CDN downtime | Low | Fallback URL to Firebase Storage or direct GitHub raw |

## Security Considerations

- Model file is public (no auth needed for CDN)
- No user data involved in TTS pipeline
- AudioContext permissions handled by browser

## Next Steps

- Phase 5: TtsControls + SentenceRenderer components (consume useTTS hook)
- Phase 6: ReaderPage integrates TTS with reading view
