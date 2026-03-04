# Phase 06: Pages

## Context Links

- [Plan Overview](plan.md)
- Mockup: `mockup/readapp-prototype.html`
- All component files from Phase 05

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Description:** Implement all page views composing components from Phase 5 with services from Phases 2-4. Five pages: Home, Library, Favorites, Settings, Reader.

## Key Insights

- React Router with nested routes under AppLayout
- ReaderPage is fullscreen (hides sidebar/nav)
- HomePage shows "continue reading" hero + recent books
- All data flows through Zustand store, populated via hooks

## Requirements

### Functional
- **HomePage**: "Đang đọc" hero card (last read book), recent books grid (6 items), quick stats
- **LibraryPage**: all books grid + upload button, search/filter
- **FavoritesPage**: favorited books grid, empty state
- **SettingsPage**: theme, font size, TTS speed, sync status, account info, logout
- **ReaderPage**: full-screen reading view with chapter nav, TTS controls, settings panel, bookmarks

### Non-Functional
- Page transitions: instant (no loading spinners except initial data fetch)
- ReaderPage: minimal chrome, maximum reading area
- All pages: Vietnamese UI text

## Architecture

### Route Structure

```
/                    → HomePage
/library             → LibraryPage
/favorites           → FavoritesPage
/settings            → SettingsPage
/read/:bookId        → ReaderPage (fullscreen, no sidebar)
```

### Data Flow

```
Pages → hooks → Zustand store ← services (Firebase, EPUB, TTS)

HomePage:
  useAuth() → user info
  useBooks() → recent books, last read
  → BookCard components

LibraryPage:
  useBooks() → all books
  UploadModal → epub-parser → sync-service
  → BookCard grid

ReaderPage:
  useBook(bookId) → load EPUB, current chapter
  useReadingProgress(bookId) → progress sync
  useTTS() → TTS engine
  → SentenceRenderer + TtsControls + ReaderSettings
```

## Related Code Files

### Create
- `src/pages/HomePage.jsx` — continue reading + recent books
- `src/pages/LibraryPage.jsx` — all books + upload
- `src/pages/FavoritesPage.jsx` — favorited books
- `src/pages/SettingsPage.jsx` — global settings
- `src/pages/ReaderPage.jsx` — full-screen reader
- `src/hooks/useBooks.js` — book list management (all books, favorites, recent)

### Modify
- `src/App.jsx` — add route definitions

## Implementation Steps

1. **Create `useBooks.js` hook**
   - Load all books from Firestore on auth
   - `getBooks()`, `getRecentBooks(limit)`, `getFavorites()`
   - `deleteBook(bookId)`: remove from Firestore + Storage
   - Cache book list in Zustand store

2. **Create `HomePage.jsx`**
   - Hero section: last read book (large BookCard variant)
     - "Tiếp tục đọc" label
     - Cover, title, progress, "Đọc tiếp" button → navigate to /read/:id
   - Recent books section: horizontal scroll or grid (4-6 books)
   - Empty state: "Chưa có sách nào. Tải lên EPUB để bắt đầu!"
   - Quick upload shortcut

3. **Create `LibraryPage.jsx`**
   - Header: "Thư viện" + upload button (opens UploadModal)
   - Book grid: BookCard components, responsive (2 cols mobile, 4 cols desktop)
   - Optional: search input (filter by title/author client-side)
   - Empty state with upload CTA

4. **Create `FavoritesPage.jsx`**
   - Header: "Yêu thích"
   - Filtered book grid (favorites only from useBooks)
   - Empty state: "Chưa có sách yêu thích"

5. **Create `SettingsPage.jsx`**
   - Sections:
     - **Tài khoản**: avatar, displayName, email, sign out button
     - **Giao diện**: theme selector (dark/light), font size slider
     - **Đọc**: default TTS speed, auto-play toggle
     - **Đồng bộ**: sync status indicator, last synced timestamp
     - **Thông tin**: app version, about
   - All settings save via sync-service (immediate sync)

6. **Create `ReaderPage.jsx`** (most complex)
   - **Layout**: fullscreen, hide AppLayout sidebar/nav
   - **Top bar**: back button, book title, chapter dropdown, bookmark button, settings gear
   - **Content area**: SentenceRenderer with current chapter content
   - **Bottom**: TtsControls (floating)
   - **Side panel**: ReaderSettings (slide-in from right)
   - **Chapter navigation**: prev/next buttons or swipe
   - **Bookmark**: tap bookmark icon → save current position via sync-service
   - **Auto-save progress**: useReadingProgress hook (debounced 3s)
   - **TTS integration**:
     - On play: pass current chapter sentences to useTTS
     - Highlight follows current sentence
     - Click sentence → jump TTS to that sentence
     - Chapter end → auto-advance to next chapter
   - **Keyboard shortcuts**: Space (play/pause), Arrow keys (prev/next sentence), Esc (exit reader)

7. **Update `App.jsx`** — define routes with React Router
   ```jsx
   <Routes>
     <Route element={<AppLayout />}>
       <Route index element={<HomePage />} />
       <Route path="library" element={<LibraryPage />} />
       <Route path="favorites" element={<FavoritesPage />} />
       <Route path="settings" element={<SettingsPage />} />
     </Route>
     <Route path="read/:bookId" element={<ReaderPage />} />
   </Routes>
   ```

8. **Auth guard**: redirect unauthenticated users to login prompt (not a separate page — show modal overlay)

## Todo List

- [ ] Create useBooks hook (book list management)
- [ ] Implement HomePage (hero + recent books)
- [ ] Implement LibraryPage (grid + upload)
- [ ] Implement FavoritesPage (filtered grid)
- [ ] Implement SettingsPage (all setting sections)
- [ ] Implement ReaderPage (fullscreen reader + TTS)
- [ ] Add chapter navigation in ReaderPage
- [ ] Add bookmark functionality
- [ ] Add keyboard shortcuts for ReaderPage
- [ ] Configure React Router routes
- [ ] Add auth guard (login prompt)
- [ ] Test navigation flow end-to-end
- [ ] Test responsive layout on mobile

## Success Criteria

- All 5 pages render and navigate correctly
- HomePage shows last read book + recent books
- Library shows all books, upload adds new book
- Favorites filters correctly
- Settings persist changes to Firestore
- ReaderPage: read chapter, TTS plays with highlight, bookmarks save
- Chapter navigation works (prev/next)
- Progress auto-saves every 3s
- Responsive on mobile (320px–768px)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| ReaderPage complexity (TTS + reader + settings) | Build incrementally: reader first, then TTS, then settings |
| State management complexity across hooks | Single Zustand store; avoid prop drilling |
| Route-based code splitting needed | Vite lazy imports: `React.lazy(() => import('./pages/ReaderPage'))` |

## Security Considerations

- Auth guard prevents unauthenticated data access
- BookId in URL is user-scoped (Firestore rules enforce)
- No sensitive data in URL params

## Next Steps

- After all phases: integration testing, polish, deploy to GitHub Pages
- Future: light theme, social features, book sharing
