# ReadFlow Codebase Summary

**Project:** Vietnamese EPUB Reader with Offline TTS
**Framework:** Next.js 15 + React 19 + Tailwind CSS
**State:** Phase 6.7 Complete (Reading Experience & iOS TTS)
**Last Updated:** 2026-03-24

## Directory Structure

```
book-tts-3/
├── src/
│   ├── app/                              # Next.js app directory
│   │   ├── layout.jsx                   # Root layout with theme provider
│   │   ├── page.jsx                     # Home page (library stub)
│   │   └── reader/
│   │       └── [id]/
│   │           └── page.jsx             # Reader page (EPUB display)
│   │
│   ├── components/
│   │   ├── reader/
│   │   │   ├── reader-content.jsx       # Main reading area with sentence spans
│   │   │   ├── sentence-span.jsx        # Single sentence with highlight class
│   │   │   ├── chapter-nav.jsx          # Previous/next chapter buttons
│   │   │   └── scroll-position.jsx      # Auto-save scroll position
│   │   │
│   │   ├── search/
│   │   │   └── search-bar.jsx           # Search UI (phase 7)
│   │   │
│   │   ├── library/
│   │   │   └── book-list.jsx            # Library display (phase 6)
│   │   │
│   │   └── theme/
│   │       └── theme-switcher.jsx       # Light/dark/sepia toggle
│   │
│   ├── hooks/
│   │   ├── use-tts.js                   # TTS orchestration hook; iOS batch path
│   │   │   ├── loadModel()              # Load ONNX model with progress (deferred)
│   │   │   ├── play()                   # Play sentence array (desktop or iOS batch)
│   │   │   ├── pause()/resume()/stop()  # Playback control
│   │   │   └── clearPrefetchCache()     # Manual cache management
│   │   │
│   │   ├── use-epub-parser.js           # EPUB parsing hook
│   │   ├── use-auth.js                  # Firebase auth state
│   │   └── use-keyboard-shortcuts.js    # Reader keyboard shortcuts
│   │
│   ├── lib/
│   │   ├── services/
│   │   │   ├── epub-parser.js           # EPUB ZIP extraction & chapter parsing
│   │   │   ├── indexed-db-service.js    # Browser database operations
│   │   │   ├── search-service.js        # Full-text search engine (phase 7)
│   │   │   │
│   │   │   ├── tts-model-loader.js      # Load ONNX model; deferred to first play
│   │   │   ├── tts-phonemizer.js        # Text → phoneme IDs (piper-wasm)
│   │   │   ├── tts-inference.js         # Phoneme → audio PCM (ONNX)
│   │   │   ├── tts-audio-player.js      # Web Audio (desktop) + HTML5 audio (iOS)
│   │   │   ├── tts-native-speech.js     # Web Speech API fallback engine
│   │   │   └── tts-engine.js            # TTS facade
│   │   │
│   │   ├── stores/
│   │   │   ├── app-store.js             # Theme, settings, ttsEngine, readingStats, annotations (persist)
│   │   │   ├── library-store.js         # Books; persist lastReadBook for instant re-open
│   │   │   └── tts-store.js             # Playback, sleepTimerMinutes, ttsUnavailable
│   │   │
│   │   └── utils/
│   │       ├── phoneme-id-map.js            # 161 Vietnamese phoneme IDs
│   │       ├── vietnamese-sentence-tokenizer.js # Max 200 char sentence splitter
│   │       ├── theme-tokens.js              # CSS variable token map
│   │       └── prefetch-onnx.js             # ONNX model prefetch utility
│   │
│   ├── styles/
│   │   └── globals.css                  # Tailwind imports + CSS vars (themes)
│   │
│   └── config/
│       └── constants.js                 # App-wide constants
│
├── public/
│   └── piper/                           # Piper WASM files (phase 4)
│       ├── piper_phonemize.js           # Worker bootstrap
│       ├── piper_phonemize.wasm         # WASM binary
│       ├── piper_phonemize.data         # Model data
│       └── piper_worker.js              # Worker script
│
├── plans/
│   ├── 260308-1446-readflow-novel-reader/
│   │   ├── plan.md                      # Overview (phases 1-8)
│   │   ├── phase-01-project-setup.md    # [COMPLETE]
│   │   ├── phase-02-epub-parser-storage.md # [COMPLETE]
│   │   ├── phase-03-reader-ui-theming.md # [COMPLETE]
│   │   ├── phase-04-tts-engine-controls.md # [COMPLETE]
│   │   ├── phase-05-firebase-auth-sync.md # [PENDING]
│   │   ├── phase-06-home-library-navigation.md # [PENDING]
│   │   ├── phase-07-search-aggregator.md # [PENDING]
│   │   └── phase-08-pwa-polish.md       # [PENDING]
│   │
│   └── reports/
│       ├── code-reviewer-260308-1557-tts-engine-review.md
│       ├── tester-260308-1557-tts-engine-validation.md
│       └── ... (other reports)
│
├── docs/
│   ├── system-architecture.md            # Full system design
│   ├── codebase-summary.md              # This file
│   ├── code-standards.md                # (TBD)
│   └── deployment-guide.md              # (TBD)
│
├── .claude/                              # Claude Code configuration
│   ├── rules/
│   │   ├── primary-workflow.md
│   │   ├── development-rules.md
│   │   ├── orchestration-protocol.md
│   │   └── team-coordination-rules.md
│   └── skills/                           # AI skill modules
│
├── next.config.js                        # Next.js config
├── tailwind.config.js                    # Tailwind CSS config
├── jsconfig.json                         # Path aliases (@/)
├── package.json                          # Dependencies
├── .gitignore                            # Git ignore rules
└── CLAUDE.md                             # Development guide (this repo)
```

## Module Descriptions

### Core Services

#### TTS Engine (Phase 4 - COMPLETE)

**Phoneme ID Map** (`src/lib/utils/phoneme-id-map.js`) - 51 lines
- Maps Vietnamese phonemes to numeric IDs (0-160)
- Exports: `PHONEME_ID_MAP`, `BOS_ID`, `EOS_ID`, `SAMPLE_RATE`, `DEFAULT_SCALES`
- Used by: inference, audio-player

**Model Loader** (`src/lib/services/tts-model-loader.js`) - 82 lines
- Loads ONNX model from jsDelivr CDN
- Caches via Cache Storage API for offline support
- Progress callbacks during download
- Exports: `loadModel()`, `getSession()`, `getModelConfigUrl()`, `disposeModel()`

**Phonemizer** (`src/lib/services/tts-phonemizer.js`) - 29 lines
- Converts Vietnamese text to phoneme ID arrays
- Uses piper-wasm library (WASM-based)
- Handles punctuation, special characters
- Exports: `textToPhonemeIds(text, configUrl)`

**Inference** (`src/lib/services/tts-inference.js`) - 45 lines
- ONNX inference: phoneme IDs → mel-spectrogram → audio
- Speed control via lengthScale (0.5x - 2x range)
- Tensor creation: int64 input, float32 output
- Exports: `inferAudio(phonemeIds, speed)`

**Audio Player** (`src/lib/services/tts-audio-player.js`) - 101 lines
- Web Audio API wrapper for playback
- GainNode for volume control
- Play/pause/resume/stop state machine
- Exports: `playBuffer(audioData, volume)`, `pause()`, `resume()`, `stop()`, `disposeAudio()`

**TTS Engine Facade** (`src/lib/services/tts-engine.js`) - 61 lines
- Coordinates all TTS services
- Unified interface for playback
- Error handling and resource cleanup
- Exports: `initEngine()`, `synthesizeSentence(text, speed)`, `playSentence()`, `pause()`, `resume()`, `stop()`, `dispose()`

**useTts Hook** (`src/hooks/use-tts.js`) - 162 lines
- React hook for TTS orchestration
- Plays sentence arrays with position tracking
- 2-sentence prefetch queue for smooth playback
- Chapter boundary detection (auto-advance)
- Abort signal for cleanup
- Exports: `loadModel()`, `play()`, `pause()`, `resume()`, `stop()`, `clearPrefetchCache()`, state variables

**Vietnamese Sentence Tokenizer** (`src/lib/utils/vietnamese-sentence-tokenizer.js`)
- Splits text into sentences, max 200 chars per sentence
- Clause-only splitting (avoids mid-word breaks)
- Used by use-tts.js before phonemization

**Native Speech Service** (`src/lib/services/tts-native-speech.js`)
- Web Speech API wrapper for native TTS fallback
- Activated when ttsEngine = 'native' or 'auto' on iOS and WASM unavailable

**TTS Store** (`src/lib/stores/tts-store.js`)
- Zustand store for TTS state
- State: isPlaying, isPaused, preparing, pausing, currentChapter/Paragraph/Sentence/FlatIndex
- State: modelLoaded, modelLoading, modelProgress, ttsUnavailable, ttsUnavailableReason
- State: sleepTimerMinutes (null = off; 5/15/30/60 options)
- Actions: setPlaying, setPaused, setPreparing, setPosition, setSleepTimer, reset

### Reader Components (Phase 3 - COMPLETE)

**Reader Content** (`src/components/reader/reader-content.jsx`)
- Main reading area
- Renders sentences as span elements
- Detects manual scroll vs auto-scroll
- Auto-scroll logic deferred to Phase 5

**Sentence Span** (`src/components/reader/sentence-span.jsx`)
- Single sentence element
- Applies `.sentence-highlight` class when current
- Bookmark button integration
- Ready for Phase 5 integration

**Chapter Nav** (`src/components/reader/chapter-nav.jsx`)
- Previous/next chapter buttons
- Uses reader-store for chapter navigation

**Scroll Position** (`src/components/reader/scroll-position.jsx`)
- Auto-saves scroll position to reader-store
- Restores on page reload

### State Management

**app-store.js** (persisted via Zustand persist)
- Theme (light/dark/sepia), fontSize, fontFamily, lineHeight, readerMargin
- TTS settings: ttsSpeed, ttsVoice, ttsEngine ('auto'|'onnx'|'native')
- hasSeenWelcome (first-time hint flag)
- readingStats: { totalReadingMs, chaptersCompleted, currentStreak, lastReadDate }
- bookmarks array (annotations): { bookId, chapterIndex, paragraphIndex, sentenceIndex, text, color, note, createdAt }

**library-store.js** (partially persisted: lastReadBook, lastReadChapter only)
- books array with cloud merge support
- lastReadBook/lastReadChapter for <200ms warm re-open
- Methods: loadBooks(), addBook(), removeBook(), mergeCloudBooks(), updateBookProgress(), setLastRead()

**tts-store.js** (not persisted — ephemeral playback state)
- Playback + model + sleep timer state (see module description above)

### Data Services

**EPUB Parser** (`src/lib/services/epub-parser.js`)
- Extracts chapters from EPUB ZIP files
- Parses chapter HTML to sentence arrays
- Builds chapter index with metadata

**IndexedDB Service** (`src/lib/services/indexed-db-service.js`)
- CRUD operations for books and chapters
- Full-text search index
- Caching layer for parsed data

**Search Service** (`src/lib/services/search-service.js`) - Phase 7
- Full-text search across local books
- Integrates with timsach.vn API
- Results ranking and aggregation

## Configuration

### next.config.js
```javascript
{
  reactStrictMode: true,
  swcMinify: true,
  // Turbopack (Next.js 15 default)
}
```

### jsconfig.json
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/lib/*": ["./src/lib/*"]
  }
}
```

### tailwind.config.js
- Extends with custom colors for light/dark/sepia themes
- CSS variables for dynamic theming
- WCAG AAA color contrast compliance

### globals.css
```css
:root {
  /* Light theme */
  --bg: #ffffff;
  --text: #000000;
  --highlight-tts: rgba(255, 215, 0, 0.3);
}

[data-theme="dark"] {
  /* Dark theme */
  --bg: #1a1a1a;
  --text: #e0e0e0;
  --highlight-tts: rgba(255, 215, 0, 0.2);
}

[data-theme="sepia"] {
  /* Sepia theme */
  --bg: #f4eee0;
  --text: #5c4033;
  --highlight-tts: rgba(255, 215, 0, 0.25);
}
```

## Dependencies

```json
{
  "dependencies": {
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "zustand": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "onnxruntime-web": "^1.20.1",
    "piper-wasm": "^0.1.4"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "eslint-config-next": "^16.1.6"
  }
}
```

## Build & Scripts

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build production (Turbopack)
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Code Standards

- **Language:** JavaScript (ES6+)
- **Naming:** kebab-case for files, camelCase for functions/variables
- **Components:** Functional components with hooks
- **State:** Zustand for app state, React hooks for local state
- **Styling:** Tailwind CSS + CSS variables for themes
- **Error Handling:** Try/catch in async operations, error boundaries planned
- **Comments:** JSDoc for complex functions, inline comments for non-obvious logic

## Testing Status

- **Unit Tests:** 0% (no test files)
- **Integration Tests:** Manual validation (Phase 4 passed)
- **E2E Tests:** Pending (Phase 5+)
- **Recommendation:** Establish Jest/Vitest suite post-Phase 5

## Performance Notes

**TTS Metrics:**
- Model load: ~2-5s (cached thereafter via Cache Storage)
- Phonemization: ~100-500ms per sentence (hidden by prefetch)
- Inference: ~50-200ms per sentence
- Real-time playback: Web Audio API

**Build Performance:**
- Turbopack: ~1.5s production build
- Zero warnings, zero errors

**Bundle Size:**
- App code: ~150KB (gzipped)
- ONNX quantized model: ~18MB at `public/model/nh-quantized.onnx` (down from 61MB CDN model)
- Piper WASM: ~17.7MB at `public/piper/`
- Total first load: ~18MB model (only once, then cached)

## Known Limitations & Future Work

**Phase 4 Completion:**
- TTS engine fully functional
- Sentence highlighting ready (Phase 3)
- Auto-scroll deferred to Phase 5 (reader integration)
- TTS bar UI deferred to Phase 5 (reader integration)

**Test Coverage:**
- Recommend establishing unit tests before production
- Current: manual validation only

**Browser Compatibility:**
- Requires WASM support
- Requires Web Audio API
- Chrome 95+, Firefox 94+, Safari 15+

**Offline Support:**
- App fully functional offline after first load
- Model cached via Cache Storage API
- EPUB books cached in IndexedDB

---

*Last updated: 2026-03-24*
*Phase 6.7 (Reading Experience & iOS TTS) complete*
