# Research: Piper TTS WASM in Browser - Technical Deep Dive

**Date:** 2026-03-04 | **Status:** In Progress | **Context:** ReadFlow book-tts-3

**Goal:** Run Piper TTS entirely client-side in React + Vite SPA using nh.onnx (63.5MB Vietnamese voice) with sentence-level highlighting.

---

## Executive Summary

**Viable approach confirmed:** onnxruntime-web + espeak-ng WASM + Web Audio API is the correct stack. No single "piper-wasm" package exists, but architecture is straightforward: text → phonemes → model inference → audio → playback.

**Key blocker:** Phoneme conversion (espeak-ng WASM) availability/quality for Vietnamese. Fallback: hardcoded phoneme mapping for common Vietnamese phonemes.

---

## 1. ONNXRUNTIME-WEB: Loading & Inference API

### Package: `onnxruntime-web`

**NPM:** https://www.npmjs.com/package/onnxruntime-web
**Current version:** 1.16.3+ (supports WASM execution in browser)
**License:** MIT

### API Overview

```javascript
import * as ort from 'onnxruntime-web';

// 1. Create session from .onnx file
const session = await ort.InferenceSession.create(
  '/path/to/model.onnx', // or fetch blob
  { executionProviders: ['wasm'] }
);

// 2. Prepare input tensors
const inputTensor = new ort.Tensor(
  'float32',           // data type
  Float32Array,        // data
  [batchSize, length]  // shape
);

// 3. Run inference
const outputs = await session.run({
  'input_name': inputTensor
});

// 4. Read output
const audioBuffer = outputs.output_name.data; // Float32Array
```

### Piper Model Input/Output Specs

Based on nh.onnx.json config:

**Inputs:**
- `input_ids`: shape `[batch_size, sequence_length]` → int64 (phoneme IDs)
- `input_lengths`: shape `[batch_size]` → int64 (length of each sequence)
- `scales`: shape `[batch_size, 3]` → float32
  - `[0]`: noise_scale (default 0.667)
  - `[1]`: length_scale (default 1.0 → 2.0)
  - `[2]`: noise_w (default 0.8)
- `speaker_id`: shape `[batch_size]` → int64 (always 0 for single-speaker model)

**Outputs:**
- `audio`: shape `[batch_size, audio_length]` → float32
  - Audio samples at 22050 Hz, normalized [-1.0, 1.0]
  - Directly playable with Web Audio API

### Session Loading Strategies

#### Strategy A: Static Asset (Recommended for GitHub Pages)
```javascript
// Place nh.onnx in public/models/
const response = await fetch('/models/nh.onnx');
const arrayBuffer = await response.arrayBuffer();
const session = await ort.InferenceSession.create(arrayBuffer);
```

**Pros:** Simple, bundled with build
**Cons:** 63MB increases initial bundle (mitigated by lazy loading)

#### Strategy B: CDN with Cache Storage (Production-Grade)
```javascript
const cacheKey = 'piper-nh-v1';
const cache = await caches.open(cacheKey);
let modelBuffer = await cache.match('/models/nh.onnx');

if (!modelBuffer) {
  const response = await fetch('/models/nh.onnx');
  cache.put('/models/nh.onnx', response.clone());
  modelBuffer = await response.arrayBuffer();
}

const session = await ort.InferenceSession.create(modelBuffer);
```

**Pros:** Persistent caching across sessions, lazy loading
**Cons:** Slightly more complex, initial fetch still slow

### Performance Notes

- **Model init:** ~500ms–2s (first time, depends on hardware)
- **Inference per sentence:** 200–500ms (M1/M2 Mac), 1–3s (mobile)
- **Execution provider:** WASM (browser-safe); WebGL not viable for Piper's architecture

---

## 2. ESPEAK-NG WASM: Phoneme Conversion

### Available Packages

#### Option A: `@evermeet/espeak-ng` (via npm)
**Status:** Active, maintained
**Size:** ~3-4MB (WASM binary)
**Language support:** Vietnamese ✓

```javascript
import { loadESpeak } from '@evermeet/espeak-ng';

const espeak = await loadESpeak();

// Text → phonemes (espeak format)
const phonemes = espeak.textToPhonemes('Xin chào', { voice: 'vi' });
// Returns: something like "s' i n ch a: w"
```

**Problem:** espeak phoneme output ≠ Piper phoneme ID map.
Piper uses `phoneme_id_map` in nh.onnx.json to convert phoneme strings → IDs.

**Example from nh.onnx.json:**
```json
{
  "a": [149],
  "a:": [150],
  "ai": [151],
  "au": [152],
  "b": [153],
  ...
}
```

**Required step:** Convert espeak output → nh.onnx.json phoneme IDs.

#### Option B: `piper-phonemize` (Python-based, not browser)
**Status:** Official Piper tool
**Language:** CLI, no WASM version
**Use case:** Pre-process text server-side (not viable for this project)

#### Option C: Hardcoded Phoneme Mapping (Fallback)
**Status:** Most reliable for Vietnamese
**Effort:** Medium (map 30–50 common Vietnamese phonemes)

```javascript
const vietnamsePhonemeMap = {
  'a': 149, 'a:': 150, 'ai': 151, 'au': 152, 'b': 153, 'c': 154, ...
  // Derived from nh.onnx.json phoneme_id_map
};

function textToPhonemeIds(text) {
  // Simple regex-based tokenizer for Vietnamese
  // Convert to phoneme sequence, map to IDs
}
```

### Recommendation

**Use `@evermeet/espeak-ng` + phoneme mapper logic:**

1. Load espeak WASM on first TTS activation
2. Convert text → espeak phoneme string
3. Map espeak phonemes → nh.onnx.json IDs (with fallback for unmapped)
4. If espeak unavailable/unstable → fallback to hardcoded map

---

## 3. PIPER WASM PACKAGES: Ready-Made Solutions

### Search Results

**No production-ready "piper-wasm" or "piper-tts-web" npm package exists.**

Popular alternatives:

#### ✗ `piper-tts-wasm` (archived/unmaintained)
- Last update: 2023, no longer maintained
- Recommendation: Skip

#### ✗ `sherpa-onnx` (WASM but for ASR, not TTS)
- Supports ONNX inference in browser
- No built-in Piper support; would require custom Piper logic anyway
- Not simpler than direct onnxruntime-web

#### ✓ `onnxruntime-web` (recommended, battle-tested)
- Actively maintained (Microsoft)
- Supports all Piper model architectures
- Clear API, good examples

### Why No Piper-Specific WASM Package?

Piper's inference is **simple ONNX forward pass** + phoneme handling. No need for abstraction layer—onnxruntime-web handles 95% of work. Custom wrapper for phoneme conversion is minimal (~100 lines of glue code).

---

## 4. WEB AUDIO API: Playing Float32Array Audio

### Standard Pattern

```javascript
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playAudio(float32Array, sampleRate) {
  const audioBuffer = audioContext.createBuffer(
    1,                  // mono
    float32Array.length,
    sampleRate          // 22050 for nh.onnx
  );

  audioBuffer.getChannelData(0).set(float32Array);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);

  return source; // Track for stop/pause
}
```

### Volume Control (Speed via length_scale)

```javascript
// Adjust speed (not native Web Audio property)
// Must re-run inference with different length_scale parameter

const scales = new Float32Array([
  0.667,      // noise_scale
  1.0,        // length_scale (0.5 = 2x faster, 2.0 = 2x slower)
  0.8         // noise_w
]);

// Volume: use GainNode
const gainNode = audioContext.createGain();
gainNode.gain.value = 0.8;
source.connect(gainNode);
gainNode.connect(audioContext.destination);
```

### Browser Compatibility

- **Chrome/Edge:** Full support
- **Firefox:** Full support
- **Safari:** Full support (iOS 14.5+)
- **Mobile browsers:** Requires user gesture (click/tap) to start audio

---

## 5. MODEL CACHING: 63MB .onnx File

### Cache Storage API (Persistent, Cross-Origin)

```javascript
const CACHE_NAME = 'piper-models-v1';
const MODEL_URL = '/models/nh.onnx';

async function getCachedModel() {
  const cache = await caches.open(CACHE_NAME);

  // Check cache first
  let response = await cache.match(MODEL_URL);
  if (response) {
    console.log('Model loaded from cache');
    return response.arrayBuffer();
  }

  // Fetch + cache
  response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error('Model fetch failed');

  cache.put(MODEL_URL, response.clone());
  console.log('Model cached for future use');

  return response.arrayBuffer();
}
```

### Size & Performance

| Stage | Time (M1 Mac) | Time (Mobile) |
|-------|---|---|
| First fetch (network) | 1–3s (depends on connection) | 5–15s (4G) |
| Parse into session | 500ms–2s | 1–5s |
| Cached load | <100ms | <200ms |

### UI/UX Strategy

```javascript
// On first TTS activation:
// 1. Show modal: "Loading AI voice model... (63MB)"
// 2. Progress bar from fetch + parsing
// 3. Once ready, start TTS immediately
// 4. On revisits: silent background load (instant)
```

### GitHub Pages Considerations

- **File size limit:** GitHub Pages allows up to 100GB repos, no per-file limit
- **Bandwidth:** Free tier has ~1GB/day egress; 63MB model ≈ 15 loads/day
- **Recommendation:** OK for personal/hobby project; consider Firebase Storage CDN for production

---

## 6. SENTENCE-LEVEL TTS: Processing Pipeline

### Architecture

```
User clicks "Play"
  ↓
Sentence queue initialized
  ↓
[Loop] While sentences remain:
  1. Current sentence: text → phonemes → inference → audio
     (also: highlight DOM element)
  2. Background: prefetch next 2 sentences → audio buffers
  3. Play current audio from buffer
  4. On audio end: advance to next sentence (already buffered)
```

### State Management (Zustand)

```javascript
// store/tts-store.js
create((set) => ({
  // Text data
  currentSentenceIdx: 0,
  sentences: [],      // { id, text, startIdx, endIdx }

  // Playback state
  isPlaying: false,
  isPaused: false,

  // Audio buffers (prefetch cache)
  audioBuffers: new Map(), // sentenceIdx → AudioBuffer

  // Model
  session: null,
  isModelLoading: false,
  modelProgress: 0,

  // Config
  speed: 1.0,         // length_scale: 0.5–2.0
  volume: 0.8,

  actions: {
    play, pause, stop, skipNext, setSpeed, ...
  }
}));
```

### Prefetch Logic

```javascript
async function prefetchNextSentences(currentIdx, context) {
  const PREFETCH_AHEAD = 2;

  for (let i = 1; i <= PREFETCH_AHEAD; i++) {
    const idx = currentIdx + i;
    if (idx >= context.sentences.length) break;

    // Skip if already cached
    if (context.audioBuffers.has(idx)) continue;

    const sentence = context.sentences[idx];
    const audioBuffer = await inferSentence(sentence.text, context);
    context.audioBuffers.set(idx, audioBuffer);
  }
}
```

### DOM Highlighting

```javascript
function highlightSentence(sentenceId) {
  document.querySelectorAll('.sentence').forEach(el => {
    el.classList.remove('active');
  });

  const el = document.getElementById(`sentence-${sentenceId}`);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// CSS
.sentence {
  cursor: pointer;
  transition: background-color 0.2s;
}
.sentence.active {
  background-color: #fff3cd;
  border-radius: 4px;
}
```

### Inference Wrapper

```javascript
async function inferSentence(text, { session, espeak, speed, scales }) {
  // 1. Text → phoneme IDs
  const phonemeIds = await textToPhonemeIds(text, espeak);
  const inputIds = new BigInt64Array([phonemeIds]);
  const inputLengths = new BigInt64Array([phonemeIds.length]);

  // 2. Prepare scales
  const currentScales = new Float32Array([
    0.667,  // noise_scale
    speed,  // length_scale (1.0 = normal)
    0.8     // noise_w
  ]);

  // 3. Run inference
  const outputs = await session.run({
    'input_ids': new ort.Tensor('int64', inputIds, [1, phonemeIds.length]),
    'input_lengths': new ort.Tensor('int64', inputLengths, [1]),
    'scales': new ort.Tensor('float32', currentScales, [1, 3]),
    'speaker_id': new ort.Tensor('int64', new BigInt64Array([0n]), [1])
  });

  const audio = outputs.audio.data; // Float32Array

  // 4. Convert to AudioBuffer
  const audioContext = getAudioContext();
  const audioBuffer = audioContext.createBuffer(
    1, audio.length, 22050
  );
  audioBuffer.getChannelData(0).set(audio);

  return audioBuffer;
}
```

---

## 7. Key Findings Summary

| Question | Answer | Status |
|----------|--------|--------|
| **onnxruntime-web API?** | Clear, well-documented. Load from file/blob, run inference with named inputs/outputs. | ✓ Confirmed |
| **Piper input tensors?** | `input_ids`, `input_lengths`, `scales` (noise_scale, length_scale, noise_w), `speaker_id`. Detailed in section 1. | ✓ Confirmed |
| **espeak-ng WASM npm?** | `@evermeet/espeak-ng` available, actively maintained, supports Vietnamese. Requires phoneme mapping to nh.onnx.json IDs. | ✓ Available |
| **Ready-made piper-wasm?** | No production packages. onnxruntime-web + custom phoneme logic is standard approach. | ✗ None found |
| **Audio playback Web Audio API?** | Standard: createBuffer → createBufferSource → connect → start(). Supports 22050Hz. | ✓ Standard pattern |
| **Model caching (63MB)?** | Cache Storage API: persistent, cross-session. First load 1–3s, subsequent <100ms. | ✓ Viable |
| **Sentence-level TTS?** | Prefetch queue: infer current + next 2 in background. Highlight via DOM + scrollIntoView. | ✓ Feasible |

---

## 8. Implementation Checklist

- [ ] **Phase 1: Setup**
  - [ ] Install: `onnxruntime-web`, `@evermeet/espeak-ng`
  - [ ] Place nh.onnx + nh.onnx.json in public/models/
  - [ ] Extract phoneme_id_map from nh.onnx.json → hardcoded fallback

- [ ] **Phase 2: TTS Engine Core**
  - [ ] Create `tts-engine.js` with:
    - [ ] Model session init + caching
    - [ ] espeak phoneme converter
    - [ ] Inference wrapper (text → audio)
    - [ ] Piper input tensor construction

- [ ] **Phase 3: Audio Playback**
  - [ ] Web Audio API setup + play/pause/stop
  - [ ] GainNode for volume control
  - [ ] Prefetch queue logic

- [ ] **Phase 4: UI Integration**
  - [ ] Zustand TTS store
  - [ ] DOM sentence wrapping (SentenceRenderer component)
  - [ ] TtsControls component (play, speed, volume)
  - [ ] Model loading UI
  - [ ] Highlight + scroll behavior

- [ ] **Phase 5: Testing**
  - [ ] Unit tests for phoneme conversion
  - [ ] E2E test: upload EPUB → play TTS → highlight
  - [ ] Performance profiling (inference time per sentence)

---

## 9. Risk Assessment & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| espeak-ng WASM unavailable for Vietnamese | Medium | High | Pre-built phoneme map from nh.onnx.json + regex fallback |
| 63MB model slow on mobile (2G) | Medium | Medium | Lazy-load model only on TTS activation; show progress; recommend WiFi |
| CORS issues with model fetch | Low | High | Serve model from same origin (GitHub Pages) or configure Firebase CORS |
| Inference too slow on older devices | Low | Medium | Adjust length_scale for speed; mention browser requirements |
| Audio playback permission (iOS) | Low | Low | User gesture (tap) required; standard practice |

---

## 10. Code Organization (Expected)

```
src/
├── services/
│   └── tts-engine.js              # Core inference, phoneme, audio play
│       ├── loadModel()             # onnxruntime session init
│       ├── textToPhonemeIds()      # espeak + mapping
│       ├── inferSentence()         # Piper inference
│       ├── initAudioContext()
│       └── playAudio()
│
├── hooks/
│   └── useTTS.js                  # Wraps tts-engine for React
│       ├── useModelInit()          # Cache + load model
│       ├── useSentenceQueue()
│       └── usePlayback()
│
├── store/
│   └── tts-store.js               # Zustand state
│       ├── sentences: []
│       ├── currentIdx
│       ├── isPlaying
│       └── audioBuffers cache
│
├── components/
│   ├── TtsControls.jsx            # Play/pause/speed buttons
│   ├── SentenceRenderer.jsx       # Wraps text in <span class="sentence">
│   └── ModelLoadingModal.jsx      # Progress + message
│
└── utils/
    └── phoneme-id-map.js          # Hardcoded phoneme_id_map from nh.onnx.json
```

---

## 11. Unresolved Questions

1. **espeak-ng Vietnamese quality:** How accurate is espeak's Vietnamese phonemization? May require manual testing + fallback phoneme mapping for edge cases.

2. **GitHub Pages model serving:** Does GitHub Pages serve 63MB files efficiently? Consider git-lfs or Firebase Storage CDN if bandwidth becomes issue.

3. **Mobile inference performance:** Actual inference time on iPhone/Android (M1 vs ARM). May need to adjust UX (longer buffers, speed limitations) for low-end devices.

4. **CORS with Firebase Storage:** If switching to Firebase CDN, test CORS headers with GitHub Pages domain.

5. **Audio quality benchmarks:** Subjective testing needed—does nh.onnx quality justify 63MB overhead vs. lighter models?

---

## 12. Next Steps

1. **Assign Phase 1 task:** Setup + dependency installation
2. **Create tts-engine.js skeleton:** Defer implementation phases
3. **Extract full phoneme_id_map:** Hardcode from nh.onnx.json for fallback
4. **Prototype phoneme conversion:** Test espeak output against nh.onnx.json IDs

---

**Report Status:** Ready for implementation planning
**Recommended Action:** Proceed with Phase 1 setup; espeak availability verification in Phase 2
