import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/book-tts-3/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-auth': ['firebase/auth'],
          'firebase-db': ['firebase/firestore'],
          'firebase-storage': ['firebase/storage'],
          'onnx': ['onnxruntime-web'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  assetsInlineLimit: 0,
});
