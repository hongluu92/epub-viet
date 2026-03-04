# Brainstorm: ReadFlow — Web Đọc Truyện TTS

**Date:** 2026-03-04 | **Status:** Agreed

---

## Problem Statement

Build a mobile-friendly web reading app (GitHub Pages + Firebase) hỗ trợ:
- Upload EPUB → tách chương, đọc TTS in-browser
- Sync trạng thái đọc, cấu hình, bookmark qua Firebase (Google login)
- TTS bằng Piper ONNX model (nh.onnx) chạy thuần client-side

---

## Final Agreed Solution

### Tech Stack

| Layer | Choice | Lý do |
|-------|--------|-------|
| Frontend | React 19 + Vite | Khớp mockup phức tạp, component reuse, ecosystem |
| Hosting | GitHub Pages (static build) | Free, no server |
| Auth | Firebase Auth (Google) | Sẵn có, đơn giản |
| DB | Firestore | Sync realtime, offline support |
| File storage | Firebase Storage | EPUB lưu cloud, multi-device |
| State | Zustand | Nhẹ, không cần Redux |
| EPUB parse | JSZip + custom OPF parser | Full control để inject sentence spans |
| TTS engine | onnxruntime-web + espeak-ng WASM | In-browser, dùng model nh.onnx (63.5MB) |
| TTS highlight | Sentence-level | Đủ smooth, dễ implement |

---

## Architecture

```
User uploads EPUB
    ↓
JSZip extract → parse content.opf (chapter order)
    ↓
Per chapter: HTML → strip tags → sentence tokenize
    ↓
Render: <span class="sentence" id="s-{n}">...</span>
    ↓
Firebase Storage ← EPUB blob
Firestore ← metadata (title, author, chapterCount, coverUrl)
    ↓
TTS flow:
  sentence text
    → espeak-ng WASM → phoneme IDs (nh.onnx.json map)
    → onnxruntime-web (nh.onnx) → Float32Array
    → AudioContext → playback
    → highlight span.active
    → prefetch next 2 sentences
```

### Model Caching (63.5MB problem)
```
First load: fetch nh.onnx → Cache Storage API (persistent)
Subsequent: load from Cache API (~instant)
Show progress bar on first TTS activation
```

### Speed Control
- Adjust `length_scale` trong inference params (1.0 = normal, 0.5 = 2x nhanh)
- Range: 0.5x — 2.0x với step 0.25

---

## Firestore Data Model

```
users/{uid}/
├── profile: { displayName, photoURL }
├── settings: { theme, fontSize, ttsSpeed, ttsEnabled }
├── books/{bookId}/
│   ├── meta: { title, author, coverUrl, chapterCount, storageRef, addedAt }
│   ├── progress: { chapterIdx, sentenceIdx, updatedAt }
│   └── bookmarks: [{ id, chapterIdx, sentenceIdx, text, createdAt }]
└── favorites: [bookId, ...]
```

---

## Project Structure

```
src/
├── pages/
│   ├── HomePage.jsx          # Continue reading + recent books
│   ├── LibraryPage.jsx       # All books + upload modal
│   ├── FavoritesPage.jsx     # Favorited books
│   ├── SettingsPage.jsx      # Global settings + sync status
│   └── ReaderPage.jsx        # Full-screen reader
├── components/
│   ├── BookCard.jsx
│   ├── ProgressBar.jsx
│   ├── TtsControls.jsx       # Play/pause/speed
│   ├── ReaderSettings.jsx    # Font size, theme, speed panel
│   └── SentenceRenderer.jsx  # Wraps sentences in spans
├── services/
│   ├── firebase.js           # Firebase init
│   ├── epub-parser.js        # JSZip + OPF + sentence tokenizer
│   ├── tts-engine.js         # Piper WASM orchestration + queue
│   └── sync-service.js       # Firestore CRUD, debounced sync
├── hooks/
│   ├── useAuth.js
│   ├── useTTS.js
│   ├── useReadingProgress.js
│   └── useBook.js
└── store/
    └── app-store.js          # Zustand global store

public/
  model/
    nh.onnx                   # TTS model (served as static asset)
    nh.onnx.json
```

---

## Key Implementation Considerations

### EPUB Sentence Tokenization
- Tách theo pattern: `[.!?…]\s+[A-ZÁĂÂÀẢÃẠẮẶẤẦẨẪẬÉÊÈẺẼẸ...]` (tiếng Việt)
- Max sentence length: 200 chars (split dài ở dấu phẩy nếu quá)
- Giữ paragraph structure để render đúng layout

### TTS Queue Strategy
```
playQueue: Sentence[]
buffer: Map<sentenceIdx, AudioBuffer>  // pre-computed

On play:
  1. Infer current sentence → play immediately
  2. Infer next 2 sentences in background → cache buffer
  3. On audio end → play next from buffer (no gap)
```

### Sync Strategy
- Debounce 3s sau mỗi thay đổi progress (tránh spam Firestore)
- Sync settings ngay lập tức (thay đổi ít, important)
- Bookmarks: sync ngay khi add/remove

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|-----------|
| espeak-ng WASM availability/stability | Medium | Fallback về regex-based phoneme map cho tiếng Việt phổ thông |
| EPUB phức tạp (tables, images, footnotes) | Medium | Strip về plain text cho TTS, giữ basic HTML cho render |
| Model 63MB lần đầu chậm | High | Cache API + progress bar + lazy init (chỉ load khi user bật TTS) |
| Firebase Storage egress cost | Low | Personal use, free tier 1GB/day egress |

---

## Success Metrics

- [ ] Upload EPUB → chapters trong <5s
- [ ] TTS bắt đầu đọc <2s sau lần đầu load model
- [ ] TTS lần 2+ bắt đầu <500ms (model từ cache)
- [ ] Sync progress cross-device hoạt động
- [ ] Mobile responsive (mockup đã thiết kế)

---

## Unresolved Questions

- espeak-ng WASM package cụ thể nào stable nhất cho browser? (cần research khi impl)
- GitHub Pages có support large file (63MB) không? → Cần check git-lfs hoặc CDN thay thế
- Firebase Storage URL có CORS issue với GitHub Pages domain không? → Cần config CORS rules

