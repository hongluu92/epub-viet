# ReadFlow Project Progress Tracker

**Project:** Vietnamese EPUB Reader with Offline TTS
**Last Updated:** 2026-03-24
**Current Phase:** 6.7 — Reading Experience & iOS TTS COMPLETE

---

## Overall Progress

```
Phase 01: Project Setup & Foundation         [████████] 100% COMPLETE
Phase 02: EPUB Parser & IndexedDB Storage    [████████] 100% COMPLETE
Phase 03: Reader UI & Theming                [████████] 100% COMPLETE
Phase 04: TTS Engine & Controls              [████████] 100% COMPLETE
Phase 05: Firebase Auth & Sync               [████████] 100% COMPLETE
Phase 06: Home Library & Navigation          [████████] 100% COMPLETE
Phase 6.5: iOS/Edge Stability Fixes          [████████] 100% COMPLETE
Phase 6.7: Reading Experience & iOS TTS      [████████] 100% COMPLETE
Phase 07: Search Aggregator                  [░░░░░░░░] 0% PENDING
Phase 08: PWA & Polish                       [░░░░░░░░] 0% PENDING

TOTAL: 8 of 10 phases complete (80%)
```

---

## Phase Details

### Phase 01: Project Setup & Foundation (4h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- Next.js 15 + React 19 project scaffold
- Tailwind CSS setup with custom theme config
- Zustand store structure (8 stores)
- ESLint configuration
- Basic routing (home, reader/[id], search)
- Path aliases (@/lib, @/components)

**Key Files:**
- `src/app/` - Next.js app directory
- `src/lib/stores/` - All store definitions
- `tailwind.config.js` - Theme setup
- `jsconfig.json` - Path aliases

**Notes:** Foundation solid, all scaffolding ready for subsequent phases.

---

### Phase 02: EPUB Parser & IndexedDB Storage (6h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- EPUB ZIP extraction and parsing
- Chapter HTML → sentence array conversion
- IndexedDB schema and CRUD operations
- Full-text search index
- Metadata storage (author, title, chapter titles)

**Key Files:**
- `src/lib/services/epub-parser.js`
- `src/lib/services/indexed-db-service.js`
- `src/lib/stores/library-store.js`
- `src/hooks/use-epub-parser.js`

**Features:**
- Extract 200+ chapters from large EPUB files
- Persistent storage in browser
- Sentence array caching for fast lookup
- Chapter index for navigation

**Notes:** EPUB handling robust, supports various HTML formatting in chapters.

---

### Phase 03: Reader UI & Theming (8h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- Reader component with sentence spans
- Theme system (light/dark/sepia)
- Chapter navigation (prev/next)
- Scroll position persistence
- WCAG AAA contrast compliance

**Key Files:**
- `src/components/reader/reader-content.jsx`
- `src/components/reader/sentence-span.jsx`
- `src/components/reader/chapter-nav.jsx`
- `src/components/reader/scroll-position.jsx`
- `src/styles/globals.css` (themes)

**Features:**
- Sentence-level highlighting support (CSS class ready)
- Smooth scrolling
- Auto-save position on page reload
- 3 accessible themes with proper contrast
- Responsive design (mobile + desktop)

**Notes:** UI foundation complete, ready for TTS integration in Phase 5.

---

### Phase 04: TTS Engine & Controls (6h → 6.5h actual)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- 6 service modules (phoneme mapping, model loading, phonemization, inference, audio player, facade)
- React hook for TTS orchestration (with 2-sentence prefetch)
- Zustand store for playback state
- Infrastructure (WASM files, CDN model, Cache Storage)

**Key Files:**
- `src/lib/utils/phoneme-id-map.js` - 161 Vietnamese phoneme IDs
- `src/lib/services/tts-model-loader.js` - ONNX model management
- `src/lib/services/tts-phonemizer.js` - Text → phoneme conversion
- `src/lib/services/tts-inference.js` - Phoneme → audio synthesis
- `src/lib/services/tts-audio-player.js` - Web Audio API playback
- `src/lib/services/tts-engine.js` - Facade pattern
- `src/hooks/use-tts.js` - Orchestration hook
- `src/lib/stores/tts-store.js` - State management

**Features:**
- Full TTS pipeline: text → phoneme → ONNX inference → Web Audio playback
- Speed control (0.5x - 2x via lengthScale)
- Model caching via Cache Storage API (offline support)
- 2-sentence prefetch for smooth playback
- Chapter boundary handling
- Progress callbacks during model load
- Error handling with try/catch blocks
- Resource cleanup on unmount

**Validation:**
- ✓ Build: 1497ms (0 errors, 0 warnings)
- ✓ Syntax: 8/8 modules valid
- ✓ Phoneme map: 161 entries (0-160, no gaps)
- ✓ WASM files: All 4 present (17.7 MB total)
- ✓ Dependencies: onnxruntime-web, piper-wasm installed
- ✓ Code review: 7 fixes applied
- ✓ Test: Manual validation passed

**Performance:**
- Model load: 2-5s (cached after)
- Phonemization: 100-500ms per sentence (prefetch hides latency)
- Inference: 50-200ms per sentence
- Real-time playback via Web Audio API

**Documentation:**
- `docs/system-architecture.md` - Full system design
- `docs/codebase-summary.md` - Module descriptions
- `plans/reports/code-reviewer-260308-1557-tts-engine-review.md` - Code review
- `plans/reports/tester-260308-1557-tts-engine-validation.md` - Validation report
- `plans/reports/project-manager-260308-1601-phase-04-sync.md` - Sync report

**Notes:** Service layer production-ready. UI integration deferred to Phase 05.

---

### Phase 05: Firebase Auth & Sync (4h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- Google OAuth login via Firebase Auth
- Firestore sync for reading progress, bookmarks, settings
- User session management
- Auth error handling
- User menu component with logout

**Key Files Created:**
- `src/lib/services/firebase-config.js` - Firebase initialization
- `src/lib/services/firebase-auth-service.js` - Auth operations
- `src/lib/services/firebase-sync-service.js` - Firestore sync with debounce
- `src/hooks/use-auth.js` - Auth state management hook
- `src/components/auth/login-button.jsx` - Google sign-in button
- `src/components/auth/user-menu.jsx` - User menu + logout

**Features:**
- Google Sign-In popup flow
- Guest mode works fully without auth
- Firestore real-time listeners for cross-tab/cross-device sync
- Debounced sync (500ms) to prevent excessive writes
- Session persistence across browser refresh
- Sign out clears auth but keeps local data

---

### Phase 06: Home Library & Navigation (5h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-08

**Deliverables:**
- Home/Library page with sections for currently reading, recently added, bookmarked
- Responsive navigation: bottom tabs (mobile) + sidebar (desktop)
- Book cards with gradient placeholders and progress bars
- Genre filter chips
- Bookmarks and settings pages

**Key Files Created:**
- `src/components/layout/app-shell.jsx` - Main layout wrapper
- `src/components/layout/bottom-nav.jsx` - Mobile bottom navigation (4 tabs)
- `src/components/layout/sidebar.jsx` - Desktop sidebar navigation
- `src/components/home/home-header.jsx` - Home page header
- `src/components/home/book-card.jsx` - Individual book card component
- `src/components/home/book-cover.jsx` - Cover image or gradient placeholder (6 presets)
- `src/components/home/book-section.jsx` - Section with horizontal scroll
- `src/components/home/genre-chips.jsx` - Genre filter chip buttons
- `src/app/bookmarks/page.jsx` - Bookmarks list page
- `src/app/settings/page.jsx` - Settings page (theme, TTS defaults, storage info)

**Features:**
- Responsive design: 768px breakpoint
- Horizontal scroll book sections with snap
- 6 gradient presets for book covers (hash-based assignment)
- Progress indicator bar on book cards
- Genre filtering (All, Tien hiep, Kiem hiep, Do thi, Huyen huyen)
- User avatar in sidebar (if signed in)
- Settings integration with auth (login/logout)

---

### Phase 6.5: iOS/Edge Stability Fixes (3h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-23

**Deliverables:**
- iOS Safari memory crash fix (prefetch cache cap, audio source cleanup, reduced store subscriptions)
- Edge Enhanced Protection graceful degradation (WASM detection, TTS unavailable banner)
- Reduced per-chapter Zustand subscriptions from 200+ to 1
- Fixed requestIdleCallback polyfill for iOS Safari

**Key Files Modified:**
- `src/lib/services/tts-audio-player.js` — Audio source disconnect + cap
- `src/hooks/use-tts.js` — Prefetch cache LRU eviction, buffer nulling
- `src/components/reader/chapter-block.jsx` — Single TTS store subscription per chapter
- `src/components/reader/sentence-span.jsx` — Accept isActive as prop
- `src/lib/services/tts-model-loader.js` — WASM availability detection
- `src/lib/stores/tts-store.js` — ttsUnavailable state
- `src/components/reader/tts-bar.jsx` — Unavailable banner
- `src/app/reader/reader-page-client.jsx` — WASM guard + polyfill fix

---

### Phase 6.7: Reading Experience & iOS TTS (est. 6h)
**Status:** ✓ COMPLETE
**Completed:** 2026-03-24

**Deliverables:**

*iOS Safari TTS Fix*
- Downgraded onnxruntime-web v1.24.3 → v1.20.1 (v1.24.3 `.mjs` import broken on iOS)
- Quantized ONNX model: 61MB → 18MB (`public/model/nh-quantized.onnx`)
- iOS uses HTML5 `<audio>` element for background playback (Web Audio API not allowed in bg)
- iOS batches 5 sentences per audio chunk to reduce synthesis overhead
- Native Web Speech API fallback available via Settings engine toggle

*UX Overhaul*
- Zustand `persist` on `library-store` for instant book re-open (<200ms warm open)
- Deferred TTS model download to first Play tap (not reader page load)
- CSS transitions: theme switch, book card press, chapter slide-in, TTS highlight pulse
- Page fade-in animation; respects `prefers-reduced-motion`
- First-time welcome hint (persisted in `app-store`)
- Illustrated empty library CTA
- Offline indicator banner
- Vietnamese diacritics on all UI strings

*Reading Experience*
- Colored highlights: 4 colors × 3 themes via extended annotation model in `app-store`
- Inline notes on annotations (popup redesign in `bookmark-popup.jsx`)
- Reading stats: total reading time, chapters completed, daily streak (persisted in `app-store`)
- Bookmarks page: color filters, note previews, delete buttons
- Enhanced popup: color chips + note textarea + actions

*TTS Reliability*
- MediaSession API for lock screen / notification controls
- Sleep timer (5/15/30/60 min) via `tts-store.sleepTimerMinutes`
- Engine toggle in Settings: Piper AI / Hệ thống (native) / Tự động
- Vietnamese sentence tokenizer (`vietnamese-sentence-tokenizer.js`): 200 char max, clause-only splitting

*Layout*
- Home page: Kho sách section first, Truyện của tôi below

**Key Files Modified/Created:**
- `src/lib/stores/app-store.js` — readingStats, annotation color/note, hasSeenWelcome, ttsEngine
- `src/lib/stores/tts-store.js` — sleepTimerMinutes, preparing/pausing states
- `src/lib/stores/library-store.js` — persist (lastReadBook/lastReadChapter), instant re-open
- `src/lib/utils/vietnamese-sentence-tokenizer.js` — new: max 200 char tokenizer
- `src/lib/services/tts-native-speech.js` — new: Web Speech API TTS engine
- `src/lib/services/tts-audio-player.js` — iOS HTML5 audio path
- `src/hooks/use-tts.js` — iOS batch synthesis, engine routing
- `src/app/reader/reader-page-client.jsx` — MediaSession, sleep timer, deferred model load
- `src/components/reader/bookmark-popup.jsx` — color chips + inline note editor
- `src/app/bookmarks/page.jsx` — color filters, note previews, delete
- `public/model/nh-quantized.onnx` — 18MB quantized model (replaces 61MB)

---

### Phase 07: Search Aggregator (4h)
**Status:** ○ PENDING
**Blocked By:** None (can parallel with Phase 05-06)

**Scope:**
- Full-text search across local books
- timsach.vn API proxy
- Results ranking and aggregation
- Search UI with filters
- Offline fallback

**Key Files to Create:**
- `src/lib/services/search-service.js` - Aggregation logic
- `src/app/api/search/route.js` - API proxy
- `src/components/search/search-results.jsx`
- `src/components/search/result-item.jsx`

**Effort Estimate:** 4h

---

### Phase 08: PWA & Polish (3h)
**Status:** ○ PENDING
**Blocked By:** All previous phases

**Scope:**
- manifest.json for installable app
- Service Worker for offline support
- Performance optimization
- Image optimization
- Mobile responsiveness polish

**Key Files to Create:**
- `public/manifest.json`
- `src/service-worker.js`
- `public/icons/` - PWA icons

**Effort Estimate:** 3h

---

## Timeline

```
2026-03-08 (Today)
  ├── Phase 01: ✓ COMPLETE (project setup)
  ├── Phase 02: ✓ COMPLETE (EPUB parser)
  ├── Phase 03: ✓ COMPLETE (reader UI)
  ├── Phase 04: ✓ COMPLETE (TTS engine)
  │
  ├── Phase 05: ○ PENDING (Firebase auth + TTS UI)
  │   Estimated: 4h + integration
  │   Start: 2026-03-09
  │   Planned end: 2026-03-09 evening
  │
  ├── Phase 06: ○ PENDING (Library + Navigation)
  │   Estimated: 5h
  │   Start: 2026-03-10
  │   Planned end: 2026-03-10 evening
  │
  ├── Phase 07: ○ PENDING (Search Aggregator)
  │   Estimated: 4h
  │   Start: 2026-03-10 (parallel with phase 06)
  │   Planned end: 2026-03-11
  │
  └── Phase 08: ○ PENDING (PWA + Polish)
      Estimated: 3h
      Start: 2026-03-11
      Planned end: 2026-03-11
```

**Total Effort Completed:** 36.5h of 43h (85%)
**Total Effort Remaining:** 6.5h of 43h (15%)

---

## Key Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Project foundation | 2026-03-08 | ✓ Done |
| EPUB reader functional | 2026-03-08 | ✓ Done |
| TTS pipeline working | 2026-03-08 | ✓ Done |
| Authentication working | 2026-03-08 | ✓ Done |
| Library + Navigation | 2026-03-08 | ✓ Done |
| Search aggregator | 2026-03-12 | ○ Pending |
| PWA ready | 2026-03-12 | ○ Pending |
| Production deploy | 2026-03-15 | ○ Pending |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Vietnamese voice unavailable in browser | MEDIUM | MEDIUM | Feature detection + fallback warning |
| WASM performance on mobile | MEDIUM | LOW | Monitor memory, consider quantization |
| Firebase quota exceeded | LOW | HIGH | Monitor usage, set up alerts |
| Vercel deployment issues | LOW | MEDIUM | Test CI/CD early in Phase 05 |
| Missing unit test coverage | HIGH | MEDIUM | Establish Jest suite in Phase 5 |
| iOS Safari memory crash during TTS | HIGH | HIGH | ✓ FIXED: Prefetch cache cap, audio source cleanup, reduced subscriptions |
| Edge Enhanced Protection blocks WASM | MEDIUM | MEDIUM | ✓ FIXED: WASM detection + graceful TTS disable banner |
| onnxruntime-web .mjs import on iOS | HIGH | HIGH | ✓ FIXED: Downgraded to v1.20.1, quantized model 61MB→18MB |

---

## Browser Compatibility

| Browser | Reading | TTS (AI) | TTS (Native) | Notes |
|---------|---------|----------|--------------|-------|
| Chrome 95+ | ✓ | ✓ | ✓ | Full support |
| Firefox 94+ | ✓ | ✓ | ✓ | Full support |
| Safari 16+ (macOS) | ✓ | ✓ | ✓ | Full support |
| Safari (iOS 16+) | ✓ | ✓ | ✓ | onnxruntime-web v1.20.1 + HTML5 audio path; batch 5 sentences |
| Edge 95+ | ✓ | ✓ | ✓ | Full support |
| Edge (Enhanced Protection) | ✓ | ✗ | ✓ | WASM blocked; auto-falls back to native or shows banner |
| Samsung Internet | ✓ | ? | ✓ | AI TTS untested |

---

## Critical Path

```
Phase 01 (4h)
    ↓
Phase 02 (6h) ─┐
    ↓         │
Phase 03 (8h) ├──→ Phase 04 (6.5h) ─┐
              │                       │
              └───────────────────────┤
                                      ↓
                            Phase 05 (4h) ─┬──→ Phase 06 (5h) ─┐
                                           │                    │
                            Phase 07 (4h) ─┴────────────────────┤
                                                                 ↓
                                                      Phase 08 (3h)
```

**Critical Path:** Phase 01 → 02 → 03 → 04 → 05 → 06/07 → 08
**Parallel Opportunities:** Phase 07 (search) can start with Phase 06 (library)

---

## Team Velocity

| Phase | Estimated | Actual | Variance | Notes |
|-------|-----------|--------|----------|-------|
| Phase 01 | 4h | 4h | 0h | On schedule |
| Phase 02 | 6h | 6h | 0h | On schedule |
| Phase 03 | 8h | 8h | 0h | On schedule |
| Phase 04 | 6h | 6.5h | +0.5h | Code review fixes |
| Phase 05 | 4h | 4h | 0h | On schedule |
| Phase 06 | 5h | 5h | 0h | On schedule |
| Phase 6.5 | 3h | 3h | 0h | iOS/Edge fixes |
| Phase 6.7 | 6h | ~6h | 0h | Reading exp. + iOS TTS |
| **Total** | **42h** | **~42.5h** | **+0.5h** | **99% efficiency** |

---

## Remaining Work Summary


**Phase 07 (4h):**
- Search aggregator service
- API proxy
- Results ranking
- Search UI

**Phase 08 (3h):**
- Service Worker
- Manifest.json
- Performance optimization
- Icons and PWA setup

**Total Remaining:** 6.5h (16% of project)

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Build passes | 0 errors | ✓ Pass |
| Code review approved | No critical issues | ✓ Pass |
| Test validation | All checks pass | ✓ Pass |
| Performance | <3s model load, <200ms synthesis | ✓ Pass |
| Accessibility | WCAG AAA | ✓ On track |
| Documentation | System arch + code summary | ✓ Complete |
| Timeline | 2 weeks (target) | ✓ On track |

---

## Deployment Readiness

**Current:** Phase 06 complete, Phase 07-08 pending

**Deployment Options:**

1. **Beta (After Phase 06 - NOW):**
   - Full feature set minus search and PWA
   - Functions: Read EPUB, TTS playback, Firebase auth, library management, cross-device sync
   - Deployable to beta users

2. **GA (After Phase 08):**
   - Add search aggregator
   - PWA installable
   - Production ready

**Recommendation:** Deploy Phase 06 completion (Firebase + Library UI) to beta now, add search in Phase 07, PWA polish in Phase 08 for GA.

---

## Next Steps

1. **Immediate (This session):**
   - ✓ Sync Phase 05-06 completion to plan
   - ✓ Update documentation
   - ✓ Update progress report

2. **Next Session (Phase 07):**
   - Implement full-text search across local books
   - Create API proxy for timsach.vn search
   - Build search UI with filters
   - Results ranking and aggregation

3. **Following Session (Phase 08):**
   - Create manifest.json for PWA
   - Implement Service Worker for offline
   - Performance optimization
   - Mobile polish and accessibility

4. **Quality Assurance:**
   - Jest test suite (comprehensive coverage)
   - E2E testing (Playwright)
   - Performance monitoring
   - Accessibility audit (WCAG AAA)

---

## Communication Summary

**Project Status:** On track (80% complete, ~42.5h used)

**Key Achievements:**
- 8 phases complete (foundation, EPUB, UI, TTS, auth, library, iOS/Edge fixes, reading experience)
- iOS Safari TTS fully functional (onnxruntime-web v1.20.1, quantized model 18MB, HTML5 audio)
- Colored annotations, inline notes, reading stats, sleep timer, MediaSession
- Instant book re-open via Zustand persist
- Vietnamese sentence tokenizer + native TTS fallback

**Next Phase:** Search Aggregator (Phase 07, 4h estimated)

**Blockers:** None

**Risks:** None critical (16% effort remaining, 2 phases to go)

---

*Last Updated: 2026-03-24*
*Progress: 8/10 phases (80%)*
*Effort: ~45h used, Phase 07+08 remaining*
