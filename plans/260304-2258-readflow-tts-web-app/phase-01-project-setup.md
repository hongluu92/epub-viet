# Phase 01: Project Setup

## Context Links

- [Plan Overview](plan.md)
- [GitHub Pages + Firebase Research](../reports/researcher-260304-2257-github-firebase-epub-setup.md)
- Mockup: `mockup/readapp-prototype.html`

## Overview

- **Priority:** P1 (blocking all other phases)
- **Status:** completed
- **Effort:** 3h
- **Description:** Initialize Vite + React 19 project, install all dependencies, configure GitHub Pages deployment, set up Firebase project config, and establish project structure.

## Key Insights

- Vite `base` must match repo name for GitHub Pages subdirectory deployment
- React Router needs `basename` matching `base`
- Firebase v9 modular SDK for tree-shaking (~50KB gzipped)
- onnxruntime-web WASM files need Vite config for correct serving
- Model served via jsDelivr CDN, not bundled in repo

## Requirements

### Functional
- Vite dev server runs with hot reload
- Production build deploys to GitHub Pages
- Firebase SDK initialized (Auth, Firestore, Storage)
- All dependencies installed and importable

### Non-Functional
- Bundle <150KB gzipped (excluding lazy-loaded chunks)
- Code splitting for Firebase, onnxruntime-web
- ESLint basic config

## Architecture

```
book-tts-3/
├── public/
│   └── 404.html              # SPA fallback for GitHub Pages
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Router + layout
│   ├── pages/                # (empty, created in Phase 6)
│   ├── components/           # (empty, created in Phase 5)
│   ├── services/
│   │   └── firebase.js       # Firebase init + config
│   ├── hooks/                # (empty, populated in Phases 2-4)
│   └── store/
│       └── app-store.js      # Zustand base store
├── index.html
├── vite.config.js
├── package.json
├── firebase-cors.json        # Storage CORS config
└── .github/
    └── workflows/
        └── deploy.yml        # GitHub Pages deploy action
```

## Related Code Files

### Create
- `package.json` — project manifest with all deps
- `vite.config.js` — base path, code splitting, WASM support
- `index.html` — entry HTML
- `public/404.html` — SPA redirect for GitHub Pages
- `src/main.jsx` — React entry
- `src/App.jsx` — Router shell
- `src/services/firebase.js` — Firebase init
- `src/store/app-store.js` — Zustand skeleton
- `firebase-cors.json` — CORS config for Firebase Storage
- `.github/workflows/deploy.yml` — CI/CD
- `.eslintrc.cjs` — basic lint config

## Implementation Steps

1. **Initialize Vite project**
   ```bash
   npm create vite@latest . -- --template react
   ```

2. **Install core dependencies**
   ```bash
   npm install react-router-dom zustand firebase jszip onnxruntime-web @evermeet/espeak-ng
   ```

3. **Configure `vite.config.js`**
   - Set `base: '/book-tts-3/'`
   - Configure `build.rollupOptions.output.manualChunks` for code splitting:
     - `firebase-auth`: `['firebase/auth']`
     - `firebase-db`: `['firebase/firestore']`
     - `firebase-storage`: `['firebase/storage']`
     - `onnx`: `['onnxruntime-web']`
   - Configure `optimizeDeps.exclude: ['onnxruntime-web']` if needed
   - Set `assetsInlineLimit: 0` to prevent inlining WASM

4. **Create `public/404.html`** — SPA redirect script for GitHub Pages
   ```html
   <!-- Redirect all 404s to index.html with path in query string -->
   ```

5. **Create `src/services/firebase.js`**
   - `initializeApp()` with config from env or hardcoded (public project)
   - Export `auth`, `db`, `storage` instances
   - Call `enableIndexedDbPersistence(db)` with error handling

6. **Create `src/store/app-store.js`**
   - Zustand store with initial slices: `user`, `settings`, `currentBook`

7. **Create `src/App.jsx`**
   - `BrowserRouter` with `basename="/book-tts-3"`
   - Route definitions (placeholder components)
   - Layout with sidebar (desktop) / bottom nav (mobile)

8. **Create `firebase-cors.json`**
   ```json
   [{ "origin": ["https://<username>.github.io", "http://localhost:5173"], "method": ["GET", "HEAD"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600 }]
   ```

9. **Create `.github/workflows/deploy.yml`**
   - Checkout → setup-node → npm ci → npm run build → deploy to gh-pages

10. **Verify dev server starts** — `npm run dev`

11. **Verify production build** — `npm run build && npx serve dist`

## Todo List

- [ ] Init Vite + React 19 project
- [ ] Install all dependencies
- [ ] Configure vite.config.js (base path, code splitting, WASM)
- [ ] Create 404.html SPA redirect
- [ ] Set up Firebase config (firebase.js)
- [ ] Create Zustand base store
- [ ] Set up App.jsx with React Router
- [ ] Create GitHub Actions deploy workflow
- [ ] Create firebase-cors.json
- [ ] Verify dev server
- [ ] Verify production build

## Success Criteria

- `npm run dev` serves app at localhost:5173
- `npm run build` produces dist/ with correct base path
- Firebase SDK initializes without errors
- Zustand store accessible from components
- No console errors on load

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| onnxruntime-web WASM files not served correctly by Vite | Configure `vite.config.js` optimizeDeps + test in build |
| GitHub Pages 404 on refresh (SPA routing) | 404.html redirect script |
| Firebase config exposed in client | Expected for client SDK; secure via Firestore/Storage rules |

## Security Considerations

- Firebase config is public (by design for client SDK)
- Security enforced via Firestore rules (Phase 2)
- No secrets in repository

## Next Steps

- Phase 2: Firebase Auth & Sync (depends on firebase.js)
- Phase 3: EPUB Parser (depends on project scaffold)
- Phase 4: TTS Engine (depends on project scaffold)
