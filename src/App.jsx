import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LibraryPage = lazy(() => import('./pages/LibraryPage.jsx'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const ReaderPage = lazy(() => import('./pages/ReaderPage.jsx'));

// Simple fallback shown during lazy chunk load
const PageLoader = () => (
  <div style={{ padding: '2rem', color: '#a0a4c8', textAlign: 'center' }}>
    Đang tải...
  </div>
);

export default function App() {
  return (
    <BrowserRouter basename="/book-tts-3">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="read/:bookId" element={<ReaderPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
