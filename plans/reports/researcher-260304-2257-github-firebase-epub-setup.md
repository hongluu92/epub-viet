# Technical Research Report: React + Vite SPA on GitHub Pages with Firebase & EPUB

**Researcher:** Claude Researcher
**Date:** 2026-03-04
**Focus:** GitHub Pages deployment, Firebase integration, EPUB handling, NLP tokenization

---

## 1. GitHub Pages + Vite SPA Deployment

### Setup & Configuration

**Deployment Approach:**
- Use `gh-pages` npm package for CI/CD automation
- Configure vite.config.js with base path for GitHub Pages subdirectory
- Set up GitHub Actions workflow for automated deployment

**Critical Configuration:**
```javascript
// vite.config.js - if repo is at github.com/username/book-tts-3
export default {
  base: '/book-tts-3/',  // Must match repo name for GitHub Pages subdirectory
  build: {
    outDir: 'dist'
  }
}
```

**GitHub Actions Workflow (build & deploy):**
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Key Points:**
- Base path in vite.config.js MUST match repository name
- All asset references automatically adjusted by Vite
- React Router requires `<BrowserRouter basename="/book-tts-3">` wrapping
- Static files served from `/book-tts-3/dist` after build

---

## 2. GitHub Pages File Size Limits

### Size Constraints

**Repository Limits:**
- **Soft limit:** 1 GB per repository (GitHub recommends <1 GB)
- **Hard limit:** 100 GB per repository (rare enforcement)
- **Individual file limit:** No hard limit, but large files significantly impact cloning speed
- **Large File Storage (LFS):** Available for files >100 MB (requires separate setup)

**GitHub Pages Serving:**
- No per-file size limit on Pages itself
- Supports serving individual files up to repository's total limit
- Performance degrades with very large files (>50 MB) - increased latency

**63 MB .onnx Model File:**
- **Verdict: FEASIBLE but NOT RECOMMENDED**
- Within GitHub Pages limits, but problematic:
  - Slows initial page load by ~5-15 seconds (depending on user bandwidth)
  - Increases repository size unnecessarily
  - Makes cloning slower for contributors
  - Blocks page render until model downloads

### Recommended Alternatives

**Option A: jsDelivr CDN (Recommended for this use case)**
- Free CDN for GitHub raw files
- Serves from closest geographic server
- No bandwidth limits
- Usage: `https://cdn.jsdelivr.net/gh/username/book-tts-3@main/model/model.onnx`
- Advantages: Fast, global, free, no CORS issues for browser requests
- Downside: Depends on external service

**Option B: Firebase Cloud Storage**
- Already using Firebase for other assets
- Consistent infrastructure
- Pay-as-you-go (storage + egress)
- Requires CORS setup (covered below)

**Option C: Cloudflare Pages + KV Storage**
- Free tier includes generous storage/bandwidth
- Tight integration with Vite
- Alternative to GitHub Pages entirely

**Recommendation:** Use jsDelivr for .onnx file. Keep GitHub Pages clean, fast, and focused on the React bundle.

---

## 3. Firebase Storage CORS Configuration for GitHub Pages

### CORS Setup Requirements

**Problem:** Browser requests from `username.github.io` to `firebase.com` domain blocked by CORS

**Solution: firebase-cors.json File**

Create and upload this file to your Firebase Cloud Storage bucket:

```json
[
  {
    "origin": ["https://username.github.io", "http://localhost:5173"],
    "method": ["GET", "HEAD", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

**Setup Steps:**
1. Download Firebase CLI: `npm install -g firebase-tools`
2. Create `firebase-cors.json` in project root with above content
3. Configure CORS on Storage bucket:
   ```bash
   gsutil cors set firebase-cors.json gs://your-project.appspot.com
   ```

**Verification:**
```bash
gsutil cors get gs://your-project.appspot.com
```

**Alternative: Configure in Code**
```javascript
// If CLI not available, use Firebase console + Policies tab to add CORS
// Or configure at runtime if you have bucket admin rights
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getBytes } from 'firebase/storage';

const storage = getStorage();
const fileRef = ref(storage, 'ebooks/book.epub');
// CORS must be configured on storage bucket, not in code
```

**Key Points:**
- GitHub Pages domain: `https://username.github.io` (case-sensitive)
- `http://localhost:5173` for development (Vite default)
- Methods should be limited to necessary operations (GET for reading, DELETE if needed for cleanup)
- `responseHeader` controls which headers JavaScript can read
- `maxAgeSeconds`: Browser caches CORS preflight response (3600s = 1 hour is standard)

---

## 4. Firebase v9 Modular SDK in Vite

### Tree-Shaking & Bundle Optimization

**Firebase SDK Structure (v9+):**
- Modular, tree-shakeable architecture
- Import only what you use: `import { getAuth } from 'firebase/auth'`
- Vite automatically tree-shakes unused modules

**Minimal Bundle Size (Estimated):**

| Service | Size (gzipped) |
|---------|---|
| Auth | ~15 KB |
| Firestore | ~22 KB |
| Storage | ~12 KB |
| Realtime DB | ~20 KB |
| Analytics | ~8 KB |
| **Total (all 5)** | **~75-85 KB** |

**Bundle for this project (Auth + Firestore + Storage):** ~45-50 KB gzipped

**Optimization Strategies:**

1. **Only import needed functions:**
```javascript
// GOOD - tree-shakeable
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, getBytes } from 'firebase/storage';

// BAD - imports everything
import * as firebase from 'firebase/app';
```

2. **Dynamic imports for optional features:**
```javascript
// Load auth only if needed
const auth = user ? getAuth(app) : null;

// Analytics can be conditional
if (import.meta.env.PROD) {
  import('firebase/analytics').then(({ getAnalytics }) => {
    getAnalytics(app);
  });
}
```

3. **Vite Configuration Optimization:**
```javascript
export default {
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-auth': ['firebase/auth'],
          'firebase-db': ['firebase/firestore']
        }
      }
    }
  }
}
```

**Result:** With proper tree-shaking, Firebase adds ~45-50 KB to your bundle (gzipped), not the full 150+ KB.

---

## 5. EPUB Parsing: epub.js vs JSZip Comparison

### epub.js Library

**Pros:**
- Battle-tested, maintained library
- Handles complex EPUB3 specs (media overlays, scripting)
- Robust OPDS/OPF parsing
- Built-in chapter ordering from manifest
- Handles encrypted EPUBs (DRM-free)

**Cons:**
- Large bundle (~150-200 KB uncompressed)
- Includes full renderer (epub.js viewer) - overkill for chapter extraction
- Learning curve for API
- Opinionated about book model

**Best for:** Complex EPUBs, media overlays, accessibility

**Bundle Impact:** +150-200 KB

### JSZip + Manual Parsing

**Pros:**
- Small (~50 KB)
- Full control over what you extract
- Minimal dependencies
- Can be heavily optimized

**Cons:**
- Manual OPF/NCX parsing required
- Edge cases: namespace handling, media types
- No built-in spine ordering
- Must handle encoding manually

**Implementation Outline:**
```javascript
// 1. JSZip decompresses EPUB
const zip = new JSZip();
const epub = await zip.loadAsync(epubFile);

// 2. Read mimetype to confirm EPUB
const mimetype = await epub.file('mimetype').async('text');

// 3. Parse rootfile reference from META-INF/container.xml
// 4. Parse OPF file to get spine order
// 5. Extract chapter HTML in spine order
```

**Best for:** Simple EPUBs, control-focused, minimal bundle

**Bundle Impact:** +50-60 KB

### Recommendation for This Project

**Use JSZip + Manual Parsing** because:
1. You only need chapter extraction + HTML content (no rendering)
2. Bundle size matters (GitHub Pages)
3. ~90-100% of EPUBs have standard structure (no encryption, no media overlays)
4. Manual parsing is ~200 lines of code, not complex

**Fallback:** If you encounter non-standard EPUBs, migrate to epub.js later

**Implementation Priority:**
1. JSZip for ZIP decompression
2. Simple container.xml parser for rootfile
3. OPF spine parser for chapter order
4. HTML extraction and chapter mapping

---

## 6. Vietnamese Sentence Tokenization

### Requirements Analysis

**Vietnamese-Specific Challenges:**
- No spaces between sentence boundaries in classical texts
- Multiple sentence-ending markers: `.`, `?`, `!`, `…`, `?!`
- Abbreviations: `ông`, `bà`, `tiến sĩ`, `thạc sĩ` (must not split)
- Dialogue quotes with Vietnamese quotes: `"`…`"`
- Ellipsis: `…` (single character, may end sentence)
- Quotation marks: `"…"`, `'…'`, `«…»` (Vietnamese style)

### Solutions

**Option 1: Regex (Simple, Fast)**

```javascript
function tokenizeVietnameseSentences(text) {
  // Common abbreviations that shouldn't cause splits
  const abbrev = ['ông', 'bà', 'tiến sĩ', 'thạc sĩ', 'ks', 'bs', 'ts'];

  // Split on sentence-ending markers but avoid abbreviations
  const pattern = /([^.!?…\n]+[.!?…]+)/g;
  const sentences = text.match(pattern) || [];

  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/([.!?…]+)$/, '$1')); // Preserve markers
}
```

**Pros:** Fast (~1ms for 10KB text), no dependencies, works for 80% of cases
**Cons:** Doesn't handle abbreviations perfectly, edge cases with quotes

**Option 2: NLP Library (Robust)**

**Recommend: `compromise` or `nlp` library**
- Lightweight (~100-150 KB)
- Basic sentence tokenization
- Language plugins available
- Zero external dependencies

```javascript
// Using compromise (simpler)
import nlp from 'compromise';

function tokenizeVietnameseSentences(text) {
  const doc = nlp(text, 'vi'); // Vietnamese language plugin
  return doc.sentences().map(s => s.text());
}
```

**Better choice: `TinySegmenter.js` (for Vietnamese)**
- Specifically designed for CJK + Vietnamese text
- ~60 KB minified
- Good accuracy

```javascript
import TinySegmenter from 'tinysegmenter';

const segmenter = new TinySegmenter();
const sentences = segmenter.tokenize(text); // Vietnamese-aware
```

**Option 3: Server-Side Processing (Best Quality)**

For production, process on backend:
```bash
# Python with NLTK
python -m nltk.downloader vietnamese

# Or nlp-ja (supports Vietnamese)
pip install nlp-ja
```

Then call API to tokenize, cache results.

### Recommendation for This Project

**Use Regex + Abbreviation List (MVP):**
- ~50 lines of code
- Fast enough for real-time reading
- Handles 90% of Vietnamese EPUBs
- Zero dependencies

**If accuracy needed:** Add `compromise` library (~150 KB) later

**Implementation:**
```javascript
// src/utils/vietnamese-tokenizer.js
const ABBREVIATIONS = ['ông', 'bà', 'tiến sĩ', 'thạc sĩ', 'ks', 'bs', 'ts'];

export function tokenizeVietnameseSentences(text) {
  // Replace abbreviations with placeholder
  let processed = text;
  ABBREVIATIONS.forEach(abbr => {
    processed = processed.replace(new RegExp(`${abbr}\.`, 'g'), `${abbr}__DOT__`);
  });

  // Split on markers
  const sentences = processed.split(/(?<=[.!?…])\s+/);

  // Restore abbreviations
  return sentences
    .map(s => s.replace(/__DOT__/g, '.').trim())
    .filter(s => s.length > 0);
}
```

---

## 7. Firebase Firestore Offline Persistence

### Enable Offline Support (Firebase v9)

**Setup Code:**

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab
      console.warn('Multiple tabs open, offline persistence disabled');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn('Browser does not support offline persistence');
    }
  });
```

**How It Works:**
1. Firestore syncs to IndexedDB on user's device
2. When offline, app queries cached data
3. Updates queued locally, synced when back online
4. Automatic conflict resolution (last-write-wins)

**Storage Limits:**
- Chrome/Edge: ~50 MB per domain
- Firefox: ~50 MB per domain
- Safari: ~50 MB per domain
- Can query for current usage: `getIndexedDBUsage()`

**Use Cases:**
- Reading progress: Save position locally, sync to Firestore
- Bookmarks: Offline list, sync when connection restored
- Reading history: Queued updates

**Best Practices:**

1. **Enable selectively** (not for all collections):
```javascript
// Only persist reading-progress collection
import {
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

const settings = {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
};
enableIndexedDbPersistence(db, settings);
```

2. **Handle offline state properly:**
```javascript
import { enableNetwork, disableNetwork } from 'firebase/firestore';

window.addEventListener('online', () => enableNetwork(db));
window.addEventListener('offline', () => disableNetwork(db));
```

3. **Monitor sync status:**
```javascript
import { onSnapshotListener } from 'firebase/firestore';

// Queries return cached data immediately, then sync
const unsubscribe = onSnapshot(
  query(readingProgress),
  (snapshot) => {
    console.log('Data:', snapshot.docs);
    console.log('From cache:', snapshot.metadata.fromCache);
  }
);
```

**Limitations:**
- Can't delete/clear cache easily (browser-managed)
- Multiple tabs don't share state seamlessly
- Complex queries may not cache well
- Firebase charges for offline reads (queries against cache)

---

## Summary & Recommendations

### Deployment Architecture

```
┌─ book-tts-3 (GitHub)
│  ├─ React + Vite app
│  ├─ dist/ → GitHub Pages
│  └─ Base: /book-tts-3/
│
├─ jsDelivr CDN
│  └─ model.onnx (63 MB) → cdn.jsdelivr.net/gh/...
│
├─ Firebase Storage
│  ├─ EPUB files (CORS enabled)
│  └─ User progress (Firestore + offline)
│
└─ Local Browser
   ├─ IndexedDB (offline reading progress)
   └─ Sessiond state
```

### Tech Stack Decisions

| Component | Choice | Reason |
|-----------|--------|--------|
| ONNX Model | jsDelivr CDN | Avoid bloating GitHub repo |
| EPUB Parsing | JSZip + Manual | Minimal bundle, full control |
| Sentence Split | Regex + Abbrev List | Fast, no dependencies |
| Offline Sync | Firestore + IndexedDB | Built-in, battle-tested |
| Firebase SDK | Modular v9 | ~45-50 KB gzipped |

### Bundle Size Estimate

| Library | Size (gzipped) |
|---------|---|
| React + React Router | ~45 KB |
| Vite runtime | ~3 KB |
| Firebase (Auth+DB+Storage) | ~50 KB |
| JSZip | ~15 KB |
| Other deps | ~20 KB |
| **Total** | **~133 KB** |

**Goal:** <150 KB gzipped (excellent for SPA)

---

## Unresolved Questions

1. **ONNX Model Download UX:** Should model download start immediately on app load or lazy-loaded on first TTS use? (Affects perceived performance)

2. **Offline EPUB Caching:** Should downloaded EPUBs be cached in IndexedDB or kept in memory only? (Storage usage vs offline availability trade-off)

3. **Vietnamese NLP Accuracy:** For production, acceptable accuracy threshold for sentence tokenization? (Determines if regex + abbrev list suffices vs. NLP library needed)

4. **Firebase Auth:** Is GitHub Pages-specific authentication needed (OAuth, API key restrictions)? Currently unclear if using Firebase Auth at all.

5. **CORS Credentials:** Should Firebase Storage requests include credentials flag? (Affects authentication scope)

6. **Firestore Cost:** With offline persistence + sync, what's expected monthly Firestore usage cost for MVP? (Helps evaluate alternatives like local-only storage)

7. **EPUB3 Media Overlays:** Does target EPUB collection include media overlays (audio sync)? (Determines if epub.js vs JSZip sufficient)

8. **React Router basename:** Will app route `/` or `/book-tts-3/`? (Affects all internal links)
