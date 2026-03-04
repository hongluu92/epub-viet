---
title: "ReadFlow — Web Đọc Truyện TTS"
description: "Static React+Vite SPA on GitHub Pages with Piper TTS in-browser, Firebase sync, EPUB reader"
status: completed
priority: P1
effort: 3d
tags: [frontend, react, tts, firebase, epub]
created: 2026-03-04
---

# ReadFlow — Web Đọc Truyện TTS

## Overview

Vietnamese novel reading web app with client-side TTS (Piper ONNX). Static SPA deployed to GitHub Pages, synced via Firebase.

**Stack:** React 19 + Vite | Firebase Auth/Firestore/Storage | Zustand | JSZip | onnxruntime-web + espeak-ng | jsDelivr CDN

## Architecture

```
GitHub Pages (SPA)  ←→  Firebase (Auth + Firestore + Storage)
       ↓                          ↓
  Browser Runtime            EPUB blobs + user data
       ↓
  onnxruntime-web + espeak-ng WASM
       ↓
  Cache Storage API (63MB model via jsDelivr)
```

## Research Reports

- [Brainstorm](../reports/brainstorm-260304-2250-readflow-tts-web-app.md)
- [Piper TTS WASM](../reports/researcher-260304-2250-piper-tts-wasm-browser.md)
- [GitHub Pages + Firebase + EPUB](../reports/researcher-260304-2257-github-firebase-epub-setup.md)

## Existing Assets

- Mockup: `mockup/readapp-prototype.html` (complete dark-theme UI)
- Model: `model/nh.onnx` (63.5MB Vietnamese voice) + `model/nh.onnx.json`

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Project Setup | completed | 3h | [phase-01](phase-01-project-setup.md) |
| 2 | Firebase Auth & Sync | completed | 4h | [phase-02](phase-02-firebase-auth-and-sync.md) |
| 3 | EPUB Parser | completed | 4h | [phase-03](phase-03-epub-parser.md) |
| 4 | TTS Engine | completed | 5h | [phase-04](phase-04-tts-engine.md) |
| 5 | UI Components | completed | 4h | [phase-05](phase-05-ui-components.md) |
| 6 | Pages | completed | 4h | [phase-06](phase-06-pages.md) |

**Total estimated effort:** ~24h (3 working days)

## Key Dependencies

- Phase 1 must complete first (project scaffold)
- Phase 2-4 can partially overlap after Phase 1
- Phase 5-6 depend on services from Phases 2-4

## Bundle Size Target

~150 KB gzipped (React ~45KB + Firebase ~50KB + JSZip ~15KB + misc ~40KB) + lazy-loaded onnxruntime-web

## Unresolved Questions

- GitHub username (placeholder `{username}` in config) — fill before deploy
- jsDelivr CDN reliability for 63MB file — monitor, fallback to Firebase Storage
- Mobile inference performance — test on real devices, adjust prefetch buffer

## Validation Log

### Session 1 — 2026-03-04
**Trigger:** Post-plan validation interview
**Questions asked:** 6

#### Confirmed Decisions

1. **[Architecture]** EPUB sentence processing: **pre-process at upload**, save sentence arrays to Firestore
   - Impact: Phase 3 stores `chapters/{idx}/sentences: string[]` in Firestore; ReaderPage reads from Firestore, not re-parses EPUB

2. **[Scope]** Auth: **guest mode supported** — no login required for local reading
   - Impact: Phase 2 adds dual-mode: guest (IndexedDB only) + signed-in (Firestore sync); data migrates on login

3. **[Risk]** TTS fallback: **Web Speech API** when espeak-ng WASM unavailable/fails on mobile
   - Impact: Phase 4 tts-engine.js detects capability, falls back to `window.speechSynthesis`

4. **[Architecture]** GitHub repo: **book-tts-3**, username placeholder `{username}`
   - jsDelivr URL: `cdn.jsdelivr.net/gh/{username}/book-tts-3@main/model/nh.onnx`

5. **[Scope]** TTS auto-start: **resume if TTS was enabled** when switching chapters
   - Impact: Phase 4/6 track `ttsActive` in Zustand; ReaderPage auto-plays on chapter load if active

#### Action Items
- [x] Phase 2: Add guest mode with IndexedDB fallback
- [x] Phase 3: Save sentence arrays to Firestore on upload
- [x] Phase 4: Add Web Speech API fallback detection
- [x] Phase 6: TTS auto-resume on chapter navigation
