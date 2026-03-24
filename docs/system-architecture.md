# System Architecture

ReadFlow: Vietnamese offline-first EPUB reader with TTS, Firebase sync, and search aggregator.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Next.js 15 SSG)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React Components & Hooks                  │  │
│  │  ├── Reader (display EPUB content)                 │  │
│  │  ├── TTS Controls (playback, speed)                │  │
│  │  ├── Library (uploaded books)                      │  │
│  │  ├── Search (aggregator UI)                        │  │
│  │  └── Theme Switcher (light/dark/sepia)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓↑                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         State Management (Zustand Stores)           │  │
│  │  ├── app-store (theme, ui state, settings)         │  │
│  │  ├── reader-store (current book, chapter, scroll)  │  │
│  │  ├── library-store (uploaded books, metadata)      │  │
│  │  ├── tts-store (playback state, position)          │  │
│  │  └── auth-store (user, session)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓↑                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Service Layer (Business Logic)              │  │
│  │  ├── EPUB Parser (extract chapters, sentences)     │  │
│  │  ├── TTS Engine (text → speech)                    │  │
│  │  ├── Search Service (query aggregator)            │  │
│  │  └── Sync Service (Firebase real-time sync)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓↑                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Layer (Browser Storage)                │  │
│  │  ├── IndexedDB (books, parsed data, cache)         │  │
│  │  ├── Cache Storage (TTS model, assets)             │  │
│  │  ├── LocalStorage (settings, UI state)             │  │
│  │  └── SessionStorage (temp data)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓↑                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Browser APIs & SDKs                         │  │
│  │  ├── Web Audio API (TTS playback)                  │  │
│  │  ├── Piper WASM (phonemization)                    │  │
│  │  ├── ONNX Runtime (inference)                      │  │
│  │  ├── Firebase Auth SDK                            │  │
│  │  └── Firestore SDK                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
        ┌──────────────────────────────────────────┐
        │  External Services (Backend)             │
        ├──────────────────────────────────────────┤
        │  ├── Firebase Auth (Google login)        │
        │  ├── Firestore (sync: progress, marks)   │
        │  ├── jsDelivr CDN (TTS model files)     │
        │  └── timsach.vn API (search proxy)      │
        └──────────────────────────────────────────┘
```

## Component Architecture

### Phase 1: Project Setup (COMPLETE)
- Next.js 15 + Tailwind CSS + Zustand + ESLint
- Zustand stores scaffold (app, reader, library, tts, auth)
- Basic routing (home, reader/[id], search)

### Phase 2: EPUB Parser & Storage (COMPLETE)
- **EPub Parser Module:** `src/lib/services/epub-parser.js`
  - Extract chapters from EPUB ZIP format
  - Parse chapter HTML → sentences
  - Build chapter index + metadata

- **IndexedDB Storage:** `src/lib/services/indexed-db-service.js`
  - Store parsed chapters with index
  - Cache sentence arrays for quick lookup
  - Implement full-text search index

### Phase 3: Reader UI & Theming (COMPLETE)
- **Reader Components:**
  - `src/components/reader/reader-content.jsx` - Main reading area
  - `src/components/reader/sentence-span.jsx` - Sentence with highlight support
  - `src/components/reader/chapter-nav.jsx` - Prev/next chapter
  - `src/components/reader/scroll-position.jsx` - Auto-save position

- **Theme System:**
  - CSS variables for light/dark/sepia
  - Persistent theme selection
  - WCAG AAA contrast compliance

### Phase 4: TTS Engine & Controls (COMPLETE)
**Service Layer:**
1. **Phoneme Mapping** (`src/lib/utils/phoneme-id-map.js`)
   - 161 Vietnamese phoneme IDs (0-160)
   - Maps character/phoneme symbols to numeric IDs for ONNX

2. **Model Management** (`src/lib/services/tts-model-loader.js`)
   - Load ONNX model from CDN (jsDelivr)
   - Cache via Cache Storage API for offline support
   - Progress callback during download

3. **Text Processing** (`src/lib/services/tts-phonemizer.js`)
   - Convert Vietnamese text → phoneme IDs
   - Uses piper-wasm library (WASM-based phonemizer)
   - Handles punctuation and special cases

4. **Audio Synthesis** (`src/lib/services/tts-inference.js`)
   - ONNX inference: phoneme IDs → mel-spectrogram
   - Speed control via lengthScale parameter (0.5x - 2x)
   - Uses onnxruntime-web for in-browser inference

5. **Audio Playback** (`src/lib/services/tts-audio-player.js`)
   - Web Audio API playback
   - GainNode for volume control
   - Play/pause/resume/stop controls
   - Handles AudioContext lifecycle

6. **TTS Facade** (`src/lib/services/tts-engine.js`)
   - Unified interface coordinating all services
   - Error handling and resource cleanup
   - Abstraction for future engine swapping

**React Integration:**
- **Hook:** `src/hooks/use-tts.js`
  - Orchestrates playback from sentence arrays
  - 2-sentence prefetch queue for smooth playback
  - Chapter boundary detection (auto-advance)
  - Abort signal for cleanup on unmount

- **Store:** `src/lib/stores/tts-store.js`
  - Playback state: isPlaying, isPaused, currentPosition
  - Model state: modelLoaded, modelLoading, modelProgress
  - Actions: play, pause, resume, stop, setPosition

**Dependencies:**
- `onnxruntime-web@1.20.1` - ONNX inference (v1.24.3 avoided: iOS Safari .mjs import broken)
- `piper-wasm@0.1.4` - Phonemization
- Piper WASM files in `public/piper/` (~17.7 MB)

**Configuration:**
- Local quantized model: `public/model/nh-quantized.onnx` (18MB, replaces 61MB CDN model)
- Config: `public/model/nh.onnx.json`
- Cache: `readflow-tts-model-v1`

**iOS Audio Path:**
- iOS Safari cannot use Web Audio API for background playback
- `tts-audio-player.js` detects iOS and routes to HTML5 `<audio>` element
- `use-tts.js` batches 5 sentences per chunk on iOS, concatenates PCM, creates Blob URL
- piper-wasm phonemization works on iOS with v1.20.1 runtime

**Engine Selection (`ttsEngine` in app-store):**
| Value | Behavior |
|-------|----------|
| `'auto'` | ONNX/Piper on desktop; native Web Speech on iOS |
| `'onnx'` | Force Piper AI engine |
| `'native'` | Force Web Speech API (`tts-native-speech.js`) |

### Phase 5: Firebase Auth & Sync (COMPLETE)
- Google OAuth login via Firebase Auth
- Firestore sync for reading progress, bookmarks
- `firebase-config.js`, `firebase-auth-service.js`, `firebase-sync-service.js`

### Phase 6: Library & Navigation (COMPLETE)
- Home page with Kho sách / Truyện của tôi sections
- Book cards, upload modal, bottom nav, sidebar
- `library-store` with Zustand persist for instant re-open

### Phase 6.5: iOS/Edge Stability (COMPLETE)
- iOS Safari memory crash fixed (prefetch cache cap, audio cleanup)
- Edge Enhanced Protection: WASM detection + TTS unavailable banner

### Phase 6.7: Reading Experience & iOS TTS (COMPLETE)
- iOS TTS: onnxruntime-web v1.20.1 + HTML5 audio + 18MB quantized model
- Colored annotations (4 colors), inline notes, reading stats, sleep timer
- MediaSession API, engine toggle, offline banner, welcome hint
- Vietnamese sentence tokenizer (`vietnamese-sentence-tokenizer.js`)
- Native Web Speech API fallback (`tts-native-speech.js`)

### Phase 7: Search Aggregator (PENDING)
- Proxy timsach.vn search API
- Full-text search across local books
- Results aggregation and ranking

### Phase 8: PWA & Polish (PENDING)
- `manifest.json` present; Service Worker (`sw.js`) scaffolded
- Performance optimization, PWA icons finalize

## Data Flow

### TTS Playback Flow
```
User taps Play
  ↓
Engine selection (app-store.ttsEngine: auto | onnx | native)
  ↓
[ONNX path]                          [Native path]
loadModel() — deferred to first      tts-native-speech.js
play; model cached in               Web Speech API utterances
Cache Storage API
  ↓
useTts.play({ sentences, startIndex })
  ↓
For each sentence (desktop/ONNX):         For each chunk (iOS batch=5):
  1. tokenize via vietnamese-sentence-      1. Batch 5 sentences
     tokenizer.js (max 200 chars)           2. Synthesize all PCMs
  2. textToPhonemeIds() via piper-wasm      3. Concatenate → Blob URL
  3. inferAudio() via ONNX runtime          4. Play via <audio> element
  4. playBuffer() via Web Audio API
  5. Prefetch next (2-sentence queue)
  ↓
On sentence end:
  - Update tts-store position
  - Highlight sentence span (color per annotation)
  - Auto-scroll to keep visible
  - MediaSession playbackState sync
  - Check sleep timer (sleepTimerMinutes)
  ↓
On pause/stop:
  - Preserve position in tts-store
  - Cancel prefetch queue
  - Clean up audio resources
```

### EPUB Storage Flow
```
User uploads EPUB file
  ↓
epub-parser.js extracts chapters (HTML content)
  ↓
Sentence splitting: HTML → sentences array
  ↓
Store in IndexedDB:
  - Books table: { id, title, author, metadata }
  - Chapters table: { bookId, chapterIndex, title, sentences }
  ↓
On reader open:
  - Load chapter from IndexedDB
  - Render sentences with span wrapping
  - Apply sentence highlighting on TTS play
```

## Technology Stack

**Frontend Framework:**
- Next.js 15 (SSG, API routes)
- React 19
- Tailwind CSS (styling)
- Zustand (state management)

**TTS Pipeline:**
- piper-wasm (text → phoneme)
- ONNX Runtime Web v1.20.1 (inference)
- Web Audio API (desktop playback)
- HTML5 `<audio>` element (iOS background playback)
- Web Speech API (native fallback via `tts-native-speech.js`)

**Storage:**
- IndexedDB (book data, cache)
- Cache Storage API (model files)
- LocalStorage (settings)

**Backend Services:**
- Firebase Auth (OAuth)
- Firestore (sync)
- jsDelivr CDN (model distribution)

**Build & Deploy:**
- Turbopack (bundler)
- Vercel (hosting)
- GitHub (version control)

## Performance Considerations

**TTS Performance:**
- Model load: ~2-5s (cached thereafter)
- Phonemization: ~100-500ms per sentence (2-sentence prefetch hides latency)
- Inference: ~50-200ms per sentence
- Real-time playback: Web Audio API handles audio output

**Storage Optimization:**
- EPUB books stored compressed in IndexedDB
- Sentence arrays cached to avoid re-parsing
- ONNX model cached in Cache Storage (17.7 MB, loads once)

**UX Optimization:**
- Prefetch next sentence while current plays
- Auto-scroll smooth with debouncing
- Theme switching via CSS vars (no re-render)
- Offline-first: all features work without internet after first load

## Security & Privacy

- No backend data collection (except Firebase auth/Firestore user choice)
- EPUB content stored client-side only
- TTS model downloaded from jsDelivr (public CDN)
- Firebase rules enforce user ownership of bookmarks/progress

## Browser Support

**Minimum Requirements:**
- ES6 support (JavaScript)
- IndexedDB API
- Web Audio API
- WASM support (for piper-wasm)
- Cache Storage API (for offline model caching)

**Tested Browsers:**
- Chrome/Edge 95+
- Firefox 94+
- Safari 15+

---

*Last updated: 2026-03-24*
*Phase 6.7 (Reading Experience & iOS TTS) complete*
