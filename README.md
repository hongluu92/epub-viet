# ReadFlow - Vietnamese EPUB Reader with Offline TTS

Vietnamese offline-first EPUB reader with Piper WASM TTS engine, Firebase sync, and search aggregator.

**Status:** Phase 4 of 8 Complete (50% done)
**Last Updated:** 2026-03-08
**Framework:** Next.js 15 + React 19 + Tailwind CSS + Zustand

---

## Features (Completed)

### Phase 1-3: Core Reading (COMPLETE ✓)
- [x] EPUB file upload and parsing
- [x] Chapter navigation with sentence-level indexing
- [x] IndexedDB storage for offline reading
- [x] Light/Dark/Sepia themes (WCAG AAA accessible)
- [x] Smooth scrolling with position persistence
- [x] Responsive design (mobile + desktop)

### Phase 4: TTS Engine (COMPLETE ✓)
- [x] Vietnamese text-to-speech via Piper WASM
- [x] Full TTS pipeline: text → phoneme → ONNX inference → Web Audio playback
- [x] Speed control (0.5x - 2x)
- [x] ONNX model caching via Cache Storage API (offline support)
- [x] 2-sentence prefetch for smooth playback
- [x] Chapter boundary auto-advance
- [x] React hook orchestration with state management

### Phase 5-8: Planned (PENDING)
- [ ] Firebase Google OAuth login
- [ ] Firestore sync (reading progress, bookmarks)
- [ ] Library management (book upload/delete)
- [ ] Full-text search aggregator
- [ ] PWA installation support
- [ ] Service Worker for offline support

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Modern browser with WASM support (Chrome 95+, Firefox 94+, Safari 15+)

### Installation

```bash
# Clone repository
git clone https://github.com/kiwiupover/book-tts-3.git
cd book-tts-3

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

---

## Architecture

### System Design
```
┌─────────────────────────────────────────────────────┐
│  React Components (Reader, TTS Bar, Library, Search) │
├─────────────────────────────────────────────────────┤
│  Zustand Stores (app, reader, library, tts, auth)   │
├─────────────────────────────────────────────────────┤
│  Service Layer                                       │
│  ├── EPUB Parser & IndexedDB                         │
│  ├── TTS Engine (6 modules)                          │
│  ├── Firebase Auth & Firestore Sync                 │
│  ├── Search Aggregator                              │
│  └── PWA & Service Worker                           │
├─────────────────────────────────────────────────────┤
│  Browser APIs (Web Audio, WASM, IndexedDB)          │
├─────────────────────────────────────────────────────┤
│  External Services (Firebase, CDN, timsach.vn)      │
└─────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── reader/            # Reader UI components
│   ├── library/           # Library components
│   ├── search/            # Search components
│   └── theme/             # Theme switcher
├── hooks/                 # React hooks
│   └── use-tts.js         # TTS orchestration hook
├── lib/
│   ├── services/          # Business logic services
│   │   ├── epub-parser.js
│   │   ├── tts-*.js       # 6 TTS modules
│   │   └── search-service.js
│   ├── stores/            # Zustand stores
│   └── utils/             # Utilities
├── styles/                # Global CSS + theme variables
└── config/                # App configuration

plans/
├── 260308-1446-readflow-novel-reader/
│   ├── plan.md            # Project overview
│   ├── phase-01-*.md      # Phase plans
│   └── ...
└── reports/               # Implementation reports

docs/
├── system-architecture.md # Full system design
├── codebase-summary.md    # Code organization
└── project-progress.md    # Timeline & tracking
```

---

## TTS Engine Implementation

### Text-to-Speech Pipeline

```
Vietnamese Text Input
    ↓
piper-wasm (phonemization)
    ↓
Phoneme ID Array (0-160)
    ↓
ONNX Runtime (mel-spectrogram synthesis)
    ↓
PCM Audio Data
    ↓
Web Audio API (playback)
    ↓
User hears speech at desired speed
```

### Key Components

**Service Layer (6 modules, 310 LOC):**
1. `phoneme-id-map.js` - 161 Vietnamese phoneme mappings
2. `tts-model-loader.js` - Load ONNX model from CDN, cache via Cache Storage
3. `tts-phonemizer.js` - Convert text to phoneme IDs using piper-wasm
4. `tts-inference.js` - ONNX inference with speed control (lengthScale)
5. `tts-audio-player.js` - Web Audio API playback
6. `tts-engine.js` - Facade coordinating all services

**React Integration:**
- `use-tts.js` - Hook for TTS orchestration with 2-sentence prefetch queue
- `tts-store.js` - Zustand store for playback state

### Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Model load (first) | 2-5s | Cached in Cache Storage |
| Phonemization | 100-500ms | Per sentence, hidden by prefetch |
| Inference | 50-200ms | Per sentence |
| Playback | Real-time | Web Audio API |

### Speed Control

Speed is controlled via the `lengthScale` parameter:
- `0.5x`: lengthScale = 2.0 (slower, longer)
- `1.0x`: lengthScale = 1.0 (normal)
- `2.0x`: lengthScale = 0.5 (faster, shorter)

### Offline Support

- ONNX model cached in Cache Storage API (persists across sessions)
- EPUB books stored in IndexedDB
- All features work offline after initial load (except Firebase sync)

---

## Documentation

### Key Documents
- **[System Architecture](docs/system-architecture.md)** - Full system design with data flows and component interactions
- **[Codebase Summary](docs/codebase-summary.md)** - Directory structure and module descriptions
- **[Project Progress](docs/project-progress.md)** - Timeline, risk register, and completion tracking
- **[Phase 04 Sync Report](plans/reports/project-manager-260308-1601-phase-04-sync.md)** - Implementation sync and validation results

### Implementation Plans
- **[Phase Plans](plans/260308-1446-readflow-novel-reader/)** - Detailed phase breakdowns with requirements and implementation steps

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI:** React 19 + Tailwind CSS
- **State:** Zustand
- **Styling:** CSS variables for theming (light/dark/sepia)

### TTS Engine
- **Phonemization:** piper-wasm (0.1.4)
- **Inference:** ONNX Runtime Web (1.24.3)
- **Audio:** Web Audio API
- **Model:** Vietnamese Piper VITS model (17.7 MB)

### Storage
- **Browser DB:** IndexedDB (books, chapters, cache)
- **Cache:** Cache Storage API (ONNX model)
- **Local:** LocalStorage (settings)

### Backend (Planned)
- **Auth:** Firebase Authentication (Google OAuth)
- **Sync:** Firestore (reading progress, bookmarks)
- **Hosting:** Vercel (Next.js deployment)
- **CDN:** jsDelivr (TTS model distribution)

---

## Browser Support

**Minimum Requirements:**
- ES6 JavaScript support
- IndexedDB API
- Web Audio API
- WASM support
- Cache Storage API

**Tested Browsers:**
- Chrome/Edge 95+
- Firefox 94+
- Safari 15+

---

## Build & Deployment

### Local Development
```bash
npm run dev          # Start dev server (localhost:3000)
```

### Production Build
```bash
npm run build        # Build with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Deployment to Vercel
```bash
npm install -g vercel
vercel              # Deploy to Vercel
```

**Vercel Configuration:**
- Automatic deployments on git push to main
- Preview deployments for pull requests
- Environment variables for Firebase config

---

## Configuration

### Firebase Setup (Phase 5)
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google OAuth in Authentication
3. Create Firestore database
4. Add Firebase config to environment variables

### TTS Model Configuration
- Model URL: `https://cdn.jsdelivr.net/gh/kiwiupover/book-tts-3@main/model/nh.onnx`
- Config URL: `https://cdn.jsdelivr.net/gh/kiwiupover/book-tts-3@main/model/nh.onnx.json`
- Cache key: `readflow-tts-model-v1`

### Theme Configuration
Edit `tailwind.config.js` to customize colors:
```javascript
light: {
  bg: '#ffffff',
  text: '#000000',
  highlight: 'rgba(255, 215, 0, 0.3)',
}
dark: {
  bg: '#1a1a1a',
  text: '#e0e0e0',
  highlight: 'rgba(255, 215, 0, 0.2)',
}
```

---

## Code Standards

- **Language:** JavaScript (ES6+)
- **Naming:** kebab-case for files, camelCase for functions
- **Components:** Functional with React hooks
- **State:** Zustand for app state, local state for component logic
- **Error Handling:** Try/catch in async operations
- **Comments:** JSDoc for complex functions
- **Linting:** ESLint with Next.js config

---

## Testing

### Current Status
- **Unit Tests:** 0% (not yet implemented)
- **Integration Tests:** Manual validation (Phase 4 passed)
- **E2E Tests:** Pending (Phase 5+)

### Recommended Setup
```bash
npm install --save-dev jest @testing-library/react
npm test               # Run test suite
npm run test:coverage  # Generate coverage report
```

---

## Performance Optimization

### Current Metrics
- **Build time:** ~1.5s (Turbopack)
- **First load:** ~17.8 MB (model) + app code
- **Subsequent loads:** ~150 KB (model cached)
- **TTS latency:** <200ms per sentence (with prefetch)

### Optimization Opportunities
- [ ] Image optimization (next/image)
- [ ] Code splitting for large components
- [ ] Lazy loading for search + library features
- [ ] Service Worker for offline support
- [ ] Model quantization for mobile

---

## Troubleshooting

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run build again
npm run build
```

### Runtime Issues

**"Cannot find module 'piper-wasm'"**
- Ensure `npm install` completed successfully
- Check `package.json` includes `"piper-wasm": "^0.1.4"`

**TTS not playing audio**
- Check browser console for errors
- Verify AudioContext is not suspended (click page first)
- Ensure ONNX model loaded (check Network tab)

**Slow phonemization**
- This is normal (100-500ms per sentence)
- Prefetch should hide latency
- Profile with DevTools Performance tab

---

## Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes following code standards
3. Test locally: `npm run dev`
4. Build: `npm run build`
5. Lint: `npm run lint`
6. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
7. Push and create pull request

### Code Review Checklist
- [ ] Build passes (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code follows standards
- [ ] Components are functional
- [ ] Error handling present
- [ ] Comments for complex logic
- [ ] No console errors

---

## Project Roadmap

### Phase 5: Firebase Auth & Sync (PENDING)
- Google OAuth login
- Firestore reading progress sync
- Error boundaries
- TTS bar UI integration

### Phase 6: Library & Navigation (PENDING)
- Book upload widget
- Library grid view
- Book search/filter

### Phase 7: Search Aggregator (PENDING)
- Full-text search across local books
- timsach.vn API proxy
- Results ranking

### Phase 8: PWA & Polish (PENDING)
- Service Worker for offline
- Manifest.json for installation
- Performance optimization
- Mobile polish

**Timeline:** Expected completion 2026-03-12

---

## License

MIT License - See LICENSE file for details

---

## Contact & Support

**Author:** Kiwi Upover
**GitHub:** https://github.com/kiwiupover/book-tts-3
**Issues:** Report bugs on GitHub Issues

---

## Acknowledgments

- Piper TTS project for Vietnamese VITS model
- ONNX Runtime team for in-browser inference
- Firebase team for auth/sync infrastructure
- Vercel for Next.js hosting

---

## Status Summary

| Phase | Status | Details |
|-------|--------|---------|
| 1 | ✓ Complete | Project setup, foundation |
| 2 | ✓ Complete | EPUB parser, IndexedDB |
| 3 | ✓ Complete | Reader UI, theming |
| 4 | ✓ Complete | TTS engine service layer |
| 5 | ○ Pending | Firebase auth, TTS UI |
| 6 | ○ Pending | Library, navigation |
| 7 | ○ Pending | Search aggregator |
| 8 | ○ Pending | PWA, polish |

**Progress:** 4/8 phases (50%)
**Effort Used:** 24.5/40 hours (61%)
**Next:** Phase 05 (Firebase Auth & Sync)

---

*Last Updated: 2026-03-08*
*Framework: Next.js 15 + React 19 + Tailwind CSS*
*Status: Production-ready service layer (Phase 4 complete)*
