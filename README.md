# ReadFlow — Web Đọc Truyện TTS

Modern Vietnamese ebook reader with in-browser text-to-speech powered by Piper ONNX.

## Stack

- **Frontend**: React 19 + Vite 6
- **State**: Zustand
- **Backend**: Firebase (Auth, Firestore, Storage)
- **TTS**: Piper ONNX (onnxruntime-web) + Web Speech API fallback
- **EPUB**: JSZip + OPF parser
- **NLP**: Vietnamese sentence tokenizer

## Deployment

Hosted on GitHub Pages at `https://{username}.github.io/book-tts-3/`

## Features

- Google Sign-In via Firebase Auth
- EPUB upload & parsing (JSZip)
- Vietnamese sentence-level TTS with Piper ONNX
- Fullscreen reader with synchronized text/audio
- Favorite books & user library
- Settings: voice speed, TTS engine selection
- Offline persistence with Firestore
- Responsive 5-page SPA: Home, Library, Favorites, Settings, Reader

## Setup

1. **Firebase Credentials**
   - Create `.env.local` in project root
   - Add Firebase config:
     ```
     VITE_FIREBASE_API_KEY=your_key
     VITE_FIREBASE_AUTH_DOMAIN=your_domain
     VITE_FIREBASE_PROJECT_ID=your_id
     VITE_FIREBASE_STORAGE_BUCKET=your_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

2. **GitHub Pages CORS**
   - Update `firebase-cors.json`: replace `{username}` with your GitHub username
   - Deploy CORS rules to Firebase Storage:
     ```bash
     gsutil cors set firebase-cors.json gs://your_bucket
     ```

3. **TTS Model Loader**
   - Update `src/services/tts-model-loader.js`: replace `{username}` with your GitHub username
   - Piper model files hosted at `https://{username}.github.io/book-tts-3/models/`

## Development

```bash
npm install
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # ESLint check
npm run preview  # Preview prod build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Route pages (Home, Library, Reader)
├── services/        # Firebase, TTS, EPUB parsing
├── store/           # Zustand state management
├── hooks/           # Custom React hooks
└── utils/           # Helpers (tokenizer, file handling)
```

## License

MIT
