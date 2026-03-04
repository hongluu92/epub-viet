# Phase 02: Firebase Auth & Sync

## Context Links

- [Plan Overview](plan.md)
- [Firebase Research](../reports/researcher-260304-2257-github-firebase-epub-setup.md)
- [Brainstorm — Firestore Data Model](../reports/brainstorm-260304-2250-readflow-tts-web-app.md)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Description:** Implement Google Auth via Firebase, build Firestore CRUD service layer, enable offline persistence, create useAuth hook with debounced progress sync.

## Key Insights

- Firebase v9 modular imports for tree-shaking
- `enableIndexedDbPersistence` for offline reading progress
- Debounce progress sync at 3s to avoid Firestore write spam
- Settings + bookmarks sync immediately (low frequency, high importance)
- Firestore security rules: users can only read/write own data

## Requirements

### Functional
- Google Sign-In with popup
- Auto-create user profile on first login
- CRUD for: settings, books metadata, reading progress, bookmarks, favorites
- Debounced progress updates (3s)
- Offline persistence (IndexedDB)

### Non-Functional
- Firestore rules enforce user-scoped access
- Graceful handling of auth errors and network offline

## Architecture

### Firestore Data Model

```
users/{uid}/
├── profile: { displayName, photoURL, createdAt }
├── settings: { theme, fontSize, ttsSpeed, ttsEnabled }
├── books/{bookId}/
│   ├── meta: { title, author, coverUrl, chapterCount, storageRef, addedAt }
│   ├── progress: { chapterIdx, sentenceIdx, scrollPos, updatedAt }
│   └── bookmarks: [{ id, chapterIdx, sentenceIdx, text, createdAt }]
└── favorites: [bookId, ...]
```

### Service Layer

```
sync-service.js
├── Auth: signIn(), signOut(), onAuthChange()
├── Profile: getProfile(), updateProfile()
├── Settings: getSettings(), updateSettings()
├── Books: addBook(), getBooks(), deleteBook()
├── Progress: getProgress(), updateProgress() [debounced]
├── Bookmarks: addBookmark(), removeBookmark(), getBookmarks()
└── Favorites: toggleFavorite(), getFavorites()
```

## Related Code Files

### Create
- `src/services/sync-service.js` — all Firestore CRUD operations
- `src/hooks/useAuth.js` — auth state, login/logout, user profile
- `src/hooks/useReadingProgress.js` — debounced progress sync
- `firestore.rules` — security rules

### Modify
- `src/services/firebase.js` — add auth initialization
- `src/store/app-store.js` — add user + settings slices

## Implementation Steps

1. **Update `firebase.js`** — export `auth` instance with GoogleAuthProvider

2. **Create `sync-service.js`**
   - Import modular Firestore functions: `doc`, `getDoc`, `setDoc`, `updateDoc`, `collection`, `getDocs`, `deleteDoc`, `onSnapshot`
   - Implement each CRUD function with proper error handling
   - `updateProgress()`: wrap in 3s debounce (use lodash.debounce or custom)
   - `updateSettings()`: immediate sync
   - All functions take `uid` as first param

3. **Create `useAuth.js` hook**
   - `onAuthStateChanged` listener → update Zustand store
   - `signIn()`: `signInWithPopup(auth, googleProvider)`
   - `signOut()`: `signOut(auth)` + clear store
   - On first login: create profile doc if not exists
   - Load user settings on auth

4. **Create `useReadingProgress.js` hook**
   - Accept `bookId`, `chapterIdx`, `sentenceIdx`
   - Debounced save to Firestore (3s)
   - On mount: load last progress from Firestore
   - Return `{ progress, updateProgress }`

5. **Update `app-store.js`**
   - Add slices: `user` (uid, displayName, photoURL), `settings` (theme, fontSize, ttsSpeed), `isAuthenticated`

6. **Create `firestore.rules`**
   ```
   match /users/{userId}/{document=**} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```

7. **Test auth flow** — sign in, verify profile doc created, sign out

## Todo List

- [x] Export auth + GoogleAuthProvider from firebase.js (auth already exported; GoogleAuthProvider instantiated in useAuth.js)
- [x] Implement sync-service.js (all CRUD functions)
- [x] Implement debounced progress sync (3s)
- [x] Create useAuth.js hook
- [x] Create useReadingProgress.js hook
- [x] Update Zustand store with user/settings slices
- [x] Write Firestore security rules
- [x] Enable offline persistence (handled by firebase.js persistentLocalCache from Phase 01)
- [ ] Test sign-in/sign-out flow (manual browser test — requires real Firebase project)
- [ ] Test offline → online sync (manual browser test)

## Success Criteria

- Google Sign-In works in browser
- User profile auto-created on first login
- Settings persist across sessions
- Reading progress syncs with 3s debounce
- Bookmarks save/load correctly
- Offline mode: app works, syncs when back online
- Firestore rules reject unauthorized access

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Multiple tabs → persistence conflict | `enableIndexedDbPersistence` handles with error code `failed-precondition`; show user warning |
| Firestore free tier limits (50K reads/day) | Personal use, well within limits; debounce reduces writes |
| Google Auth popup blocked on mobile | Fallback to `signInWithRedirect` |

## Security Considerations

- Firestore rules: users/{uid} scoped — no cross-user access
- Firebase Storage rules: users can only write to own path
- No PII stored beyond Google profile (displayName, photoURL)
- Auth tokens managed by Firebase SDK (auto-refresh)

## Next Steps

- Phase 3: EPUB Parser (needs sync-service for book metadata)
- Phase 5-6: UI components consume useAuth hook
