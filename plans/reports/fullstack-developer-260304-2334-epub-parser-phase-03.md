# Phase Implementation Report

## Executed Phase
- Phase: phase-03-epub-parser
- Plan: /Users/kiwi/Work/Me/book-tts-3/plans/260304-2258-readflow-tts-web-app/
- Status: completed

## Files Modified

| File | Action | Lines |
|------|--------|-------|
| `src/utils/vietnamese-sentence-tokenizer.js` | created | 95 |
| `src/services/epub-parser-helpers.js` | created | 155 |
| `src/services/epub-parser.js` | created | 120 |
| `src/hooks/useBook.js` | created | 100 |
| `src/store/app-store.js` | extended | +8 lines |
| `src/services/sync-service.js` | extended | +25 lines (uploadEpub enhanced) |

## Tasks Completed

- [x] Implement Vietnamese sentence tokenizer
- [x] Implement EPUB parser (JSZip + OPF)
- [x] Extract metadata (title, author, cover)
- [x] Parse spine for chapter ordering
- [x] Strip HTML tags for TTS text
- [x] Implement useBook hook
- [x] Add EPUB upload to sync-service (with progress callback)
- [x] Handle edge cases (no cover, missing metadata, nested content paths)

## Implementation Notes

### vietnamese-sentence-tokenizer.js
- ABBREVS list: ông, bà, ts, bs, ks, pgs, gs, th.s, cn, kts, ths, pgs.ts, gs.ts
- Protects abbreviation dots via placeholder `\x00DOT\x00`
- Splits on lookbehind `(?<=[.!?…])\s+`
- Long sentences (>200 chars) split at nearest comma/semicolon within 250-char window

### epub-parser-helpers.js (split from parser for size compliance)
- `parseXml`, `getMetaText` — namespace-aware DC metadata extraction
- `extractRootfilePath` — container.xml → rootfile path
- `buildManifestMap` — OPF manifest id→{href,mediaType,properties}
- `extractSpineIds` — ordered itemref list
- `findCoverItem` — 3-strategy cover detection (properties attr, meta name, id heuristic)
- `resolvePath` — handles `../` relative paths from OPF base
- `stripHtml` — removes script/style blocks, replaces block tags with newlines, decodes entities
- `extractChapterTitle` — h1-h3 extraction with fallback

### epub-parser.js
- Verifies mimetype non-fatally (some EPUBs omit it)
- Case-insensitive zip path fallback for non-standard EPUBs
- Skips chapters with 0 sentences (nav/toc-only files)
- Returns `coverBlob` for local display + upload

### useBook.js
- `loadBook(bookId, url)` — skips re-parse if same `_bookId` cached in store
- `loadBookFromFile(file)` — for upload preview flow
- `navigateChapter(idx)` — clamps to valid range, resets sentenceIdx in TTS state
- Exposes `currentChapter` directly (sentences + html)

### sync-service.js changes
- Replaced `uploadBytes` with `uploadBytesResumable` for progress reporting
- `uploadEpub(uid, bookId, file, onProgress?)` now returns Promise<downloadUrl>
- Added `uploadBytesResumable`, `deleteObject` to Firebase Storage imports

## Tests Status
- Type check: N/A (JS project, no tsc)
- Unit tests: N/A (no test framework configured)
- Build: **pass** — `vite build` in 1.65s, 39 modules, no errors

## Issues Encountered
- `sync-service.js` already existed (not listed as "create" in phase file) — extended in-place as instructed
- `src/store/app-store.js` had extra fields (books, bookmarks) added by a previous phase not visible in original — read before edit resolved this

## Next Steps
- Phase 4: TTS Engine — consumes `currentChapter.sentences` from useBook
- Phase 5: SentenceRenderer — renders `currentChapter.html` with sentence highlighting
- Phase 6: ReaderPage — wires useBook + TTS + SentenceRenderer
