# Phase 03: EPUB Parser

## Context Links

- [Plan Overview](plan.md)
- [EPUB Research](../reports/researcher-260304-2257-github-firebase-epub-setup.md)
- [Brainstorm — Sentence Tokenization](../reports/brainstorm-260304-2250-readflow-tts-web-app.md)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Description:** Build EPUB parser using JSZip + manual OPF parsing. Extract chapters in spine order, tokenize Vietnamese sentences, upload EPUB to Firebase Storage, save metadata to Firestore.

## Key Insights

- JSZip (~15KB gzip) preferred over epub.js (~200KB) — we only need chapter extraction
- EPUB structure: `META-INF/container.xml` → rootfile → OPF (manifest + spine) → chapter HTML files
- Vietnamese sentence split: regex-based with abbreviation handling, ~50 lines
- Max sentence length 200 chars — split at comma if longer
- Strip HTML tags for TTS, keep basic structure for rendering

## Requirements

### Functional
- Parse EPUB file (File/Blob input)
- Extract: title, author, cover image, chapter list in order
- Per chapter: raw HTML + tokenized sentences (text only)
- Upload EPUB blob to Firebase Storage
- Save book metadata to Firestore
- Handle malformed EPUBs gracefully (error messages, not crashes)

### Non-Functional
- Parse <5s for typical novel (~500KB EPUB)
- Memory efficient (stream chapters, don't load all at once)

## Architecture

### EPUB Parsing Pipeline

```
EPUB File (Blob)
  → JSZip.loadAsync()
  → Read META-INF/container.xml → rootfile path
  → Read OPF file → extract metadata (title, author, cover)
  → Parse spine → ordered chapter href list
  → Per chapter:
      → Read HTML from zip
      → Strip tags → plain text
      → tokenizeVietnamese() → sentence array
  → Return { metadata, chapters: [{ title, html, sentences }] }
```

### Upload Flow

```
User selects EPUB → parse → show preview (title, cover, chapter count)
  → User confirms → upload EPUB to Firebase Storage
  → Save metadata to Firestore (sync-service.addBook)
  → Navigate to LibraryPage
```

## Related Code Files

### Create
- `src/services/epub-parser.js` — JSZip + OPF parsing + sentence tokenization
- `src/utils/vietnamese-sentence-tokenizer.js` — regex-based sentence splitter
- `src/hooks/useBook.js` — book loading, chapter navigation

### Modify
- `src/services/sync-service.js` — add uploadEpub(), getEpubUrl() functions

## Implementation Steps

1. **Create `vietnamese-sentence-tokenizer.js`**
   - Define Vietnamese abbreviation list: `['ông', 'bà', 'ts', 'bs', 'ks', 'pgs', 'gs']`
   - `tokenizeVietnamese(text)`:
     - Replace abbreviation dots with placeholder
     - Split on `(?<=[.!?…])\s+`
     - Restore placeholders
     - Split sentences >200 chars at nearest comma
     - Return `string[]`

2. **Create `epub-parser.js`**
   - `parseEpub(file: Blob)` → returns `{ metadata, chapters }`
   - Step-by-step:
     a. `const zip = await JSZip.loadAsync(file)`
     b. Verify mimetype: `zip.file('mimetype')?.async('text')` === `'application/epub+zip'`
     c. Read `META-INF/container.xml` → parse XML → extract rootfile `full-path`
     d. Read OPF file → parse XML:
        - `<metadata>`: `dc:title`, `dc:creator`, cover reference
        - `<manifest>`: build id→href map
        - `<spine>`: ordered `<itemref idref>` list → resolve to hrefs
     e. Extract cover image: find manifest item with `properties="cover-image"` or `id="cover"`
     f. Per chapter href:
        - Read HTML content from zip (handle relative paths from OPF location)
        - `stripHtmlTags(html)` → plain text
        - `tokenizeVietnamese(text)` → sentences array
        - Keep raw HTML for rendering
     g. Return structured result

3. **XML parsing** — use `DOMParser` (browser-native, no deps)
   ```js
   const parser = new DOMParser();
   const doc = parser.parseFromString(xmlStr, 'application/xml');
   ```

4. **Create `useBook.js` hook**
   - `loadBook(bookId)`: fetch EPUB from Firebase Storage → parse → cache in memory
   - `getCurrentChapter()`: return current chapter's sentences + HTML
   - `navigateChapter(idx)`: update chapter, reset sentence index
   - Store parsed book in Zustand (avoid re-parsing)

5. **Add Firebase Storage upload to `sync-service.js`**
   - `uploadEpub(uid, bookId, file)` → upload to `users/{uid}/books/{bookId}.epub`
   - `getEpubDownloadUrl(storageRef)` → get download URL

6. **Test with sample EPUB files** — verify chapter extraction, sentence tokenization

## Todo List

- [ ] Implement Vietnamese sentence tokenizer
- [ ] Implement EPUB parser (JSZip + OPF)
- [ ] Extract metadata (title, author, cover)
- [ ] Parse spine for chapter ordering
- [ ] Strip HTML tags for TTS text
- [ ] Implement useBook hook
- [ ] Add EPUB upload to sync-service
- [ ] Test with 3+ different EPUB files
- [ ] Handle edge cases (no cover, missing metadata, nested content paths)

## Success Criteria

- Parse standard EPUB in <5s
- Correctly extract title, author, cover image
- Chapters in correct reading order
- Vietnamese sentences properly tokenized
- Handles EPUBs without cover gracefully
- Upload to Firebase Storage works

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Non-standard EPUB structure | Graceful fallback: try common paths, show error if unparseable |
| Large EPUB (>10MB) | Show progress, parse chapters lazily (on-demand) |
| XML namespace issues in OPF | Use namespace-aware queries or string matching fallback |
| Vietnamese tokenization edge cases | Start with regex, iterate based on real EPUB content |

## Security Considerations

- Validate file is actually EPUB (check mimetype in zip)
- Sanitize HTML content before rendering (XSS prevention)
- Firebase Storage rules: only authenticated user can write to own path

## Next Steps

- Phase 4: TTS Engine (consumes sentence arrays from parser)
- Phase 5: SentenceRenderer component (renders parsed sentences)
- Phase 6: ReaderPage (combines parser + TTS + renderer)
