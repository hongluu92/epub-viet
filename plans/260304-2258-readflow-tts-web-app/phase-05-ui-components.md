# Phase 05: UI Components

## Context Links

- [Plan Overview](plan.md)
- Mockup: `mockup/readapp-prototype.html` (design reference)
- [Brainstorm — Project Structure](../reports/brainstorm-260304-2250-readflow-tts-web-app.md)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Description:** Build core UI components matching the mockup design. Dark theme, responsive (sidebar desktop, bottom nav mobile), Vietnamese UI text.

## Key Insights

- Mockup uses dark theme with CSS variables (--bg, --surface, --accent, etc.)
- Font: Sora (UI) + Lora (reading content)
- Gradient accents: purple-pink, teal-purple
- Mobile-first: bottom nav replaces sidebar at <768px
- SentenceRenderer must wrap each sentence in clickable span for TTS highlighting

## Requirements

### Functional
- App layout: sidebar (desktop 240px) + content area, bottom nav (mobile)
- BookCard: cover image, title, author, progress bar, favorite toggle
- ProgressBar: visual chapter/reading progress
- Upload modal: drag & drop EPUB, preview metadata before confirm
- SentenceRenderer: render sentences as spans, highlight active, scroll into view
- TtsControls: play/pause, skip prev/next, speed selector, model loading progress
- ReaderSettings: font size slider, theme toggle, TTS speed

### Non-Functional
- Match mockup design (colors, spacing, typography)
- Smooth animations (CSS transitions)
- Accessible: keyboard navigation, ARIA labels

## Architecture

### Component Tree

```
App
├── Sidebar (desktop) / BottomNav (mobile)
│   ├── NavItem (Home, Library, Favorites, Settings)
│   └── UserAvatar + Auth button
├── Layout (content area)
│   └── [Page] (routed)
└── Modals
    ├── UploadModal
    ├── ModelLoadingModal
    └── ReaderSettingsPanel
```

### CSS Strategy

- CSS Modules or plain CSS with BEM naming
- CSS variables from mockup (already defined in :root)
- Media query breakpoint: 768px
- No CSS framework (mockup is custom)

## Related Code Files

### Create
- `src/components/layout/Sidebar.jsx` — desktop sidebar navigation
- `src/components/layout/BottomNav.jsx` — mobile bottom navigation
- `src/components/layout/AppLayout.jsx` — wraps sidebar + content
- `src/components/BookCard.jsx` — book card with cover, progress
- `src/components/ProgressBar.jsx` — reading progress indicator
- `src/components/UploadModal.jsx` — drag & drop EPUB upload
- `src/components/SentenceRenderer.jsx` — sentence spans + highlight
- `src/components/TtsControls.jsx` — TTS playback controls
- `src/components/ReaderSettings.jsx` — font, theme, speed panel
- `src/components/ModelLoadingModal.jsx` — TTS model download progress
- `src/styles/variables.css` — CSS variables from mockup
- `src/styles/global.css` — base styles, fonts, resets

### Modify
- `src/App.jsx` — wrap with AppLayout
- `src/store/app-store.js` — add UI state (sidebarOpen, activeModal)

## Implementation Steps

1. **Extract CSS variables from mockup** → `variables.css`
   - Colors: --bg, --surface, --surface2, --border, --text, --text-dim, --accent, gradients
   - Spacing: --radius, --radius-sm, --shadow
   - Fonts: Sora (UI), Lora (reading)

2. **Create `global.css`**
   - Reset, body styles, font imports
   - Utility classes: `.flex`, `.truncate`, `.gradient-text`

3. **Create `AppLayout.jsx`**
   - Flex container: sidebar + main content
   - Media query: hide sidebar, show BottomNav on mobile
   - Outlet for React Router

4. **Create `Sidebar.jsx`**
   - Logo (gradient icon + "ReadFlow" text)
   - Nav items: Home, Library, Favorites, Settings (with icons)
   - Active state: accent background
   - User avatar + sign in/out at bottom

5. **Create `BottomNav.jsx`**
   - Fixed bottom bar, 4 icons
   - Active indicator

6. **Create `BookCard.jsx`**
   - Props: `{ book, onOpen, onToggleFavorite }`
   - Cover image (or placeholder gradient)
   - Title (truncated), author
   - ProgressBar below cover
   - Favorite heart icon (toggle)
   - Click → navigate to reader

7. **Create `ProgressBar.jsx`**
   - Props: `{ progress, total, showLabel }`
   - Gradient fill bar
   - Optional label: "Chương 5/20"

8. **Create `UploadModal.jsx`**
   - Drag & drop zone + file input fallback
   - Accept only `.epub`
   - On drop: call `parseEpub()` → show preview (title, author, chapter count, cover)
   - Confirm button → upload to Firebase + save metadata
   - Loading state during upload

9. **Create `SentenceRenderer.jsx`**
   - Props: `{ sentences, activeSentenceIdx, onSentenceClick }`
   - Map sentences → `<span id="s-{idx}" class="sentence {active?}" onClick={...}>`
   - Active sentence: yellow highlight + smooth scroll into view
   - Preserve paragraph structure (group sentences by paragraph)

10. **Create `TtsControls.jsx`**
    - Props: consume `useTTS()` hook
    - Floating bar at bottom of reader (above bottom nav on mobile)
    - Buttons: prev, play/pause, next, stop
    - Speed selector: dropdown (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
    - Mini progress: "Câu 5/120"

11. **Create `ReaderSettings.jsx`**
    - Slide-in panel from right
    - Font size: slider (14px–28px)
    - Theme: dark/light toggle (or sepia)
    - TTS speed shortcut
    - Line height adjustment

12. **Create `ModelLoadingModal.jsx`**
    - Centered modal with progress bar
    - Text: "Đang tải mô hình giọng đọc... (63MB)"
    - Progress percentage from useTTS modelProgress
    - Auto-dismiss when complete

## Todo List

- [ ] Extract CSS variables + create global styles
- [ ] Create AppLayout (sidebar + content)
- [ ] Create Sidebar (desktop nav)
- [ ] Create BottomNav (mobile nav)
- [ ] Create BookCard component
- [ ] Create ProgressBar component
- [ ] Create UploadModal (drag & drop EPUB)
- [ ] Create SentenceRenderer (highlight + scroll)
- [ ] Create TtsControls (play/pause/speed)
- [ ] Create ReaderSettings panel
- [ ] Create ModelLoadingModal
- [ ] Match mockup design (colors, spacing, typography)
- [ ] Test responsive layout (desktop + mobile)

## Success Criteria

- UI matches mockup design (dark theme, gradients, typography)
- Responsive: sidebar on desktop, bottom nav on mobile
- SentenceRenderer highlights active sentence with smooth scroll
- TtsControls reflect playback state accurately
- Upload modal accepts EPUB files via drag & drop
- All components render without errors

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Mockup → React conversion takes longer than estimated | Focus on functional layout first, polish later |
| CSS variable mismatch across browsers | Test Chrome + Safari + Firefox; use fallback values |
| SentenceRenderer performance with 1000+ sentences | Virtualize long chapters (react-window) if needed |

## Security Considerations

- Sanitize EPUB HTML before rendering in SentenceRenderer (DOMPurify or manual strip)
- No user input rendered as raw HTML

## Next Steps

- Phase 6: Pages (compose components into full page views)
