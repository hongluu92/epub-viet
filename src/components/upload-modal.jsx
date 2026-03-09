'use client';

import { useState, useRef, useCallback } from 'react';
import { parseEpub } from '@/lib/services/epub-parser';
import { addBook, saveChapters, saveEpubBlob } from '@/lib/services/indexeddb-service';
import { useLibraryStore } from '@/lib/stores/library-store';
import { useAuth } from '@/hooks/use-auth';
import { syncBookMetadata } from '@/lib/services/firebase-sync-service';

// Hook: returns { triggerUpload, UploadProgress }
// triggerUpload() opens native file picker directly, no modal needed
export function useEpubUpload() {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileRef = useRef(null);
  const addBookToStore = useLibraryStore((s) => s.addBook);
  const { user } = useAuth();

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.epub')) { setError('Vui long chon file EPUB'); return; }
    if (file.size > 200 * 1024 * 1024) { setError('File qua lon (toi da 200MB)'); return; }

    setError(null);
    setIsParsing(true);
    setProgress(0);

    try {
      const { metadata, chapters } = await parseEpub(file, setProgress);
      await addBook(metadata);
      await saveChapters(metadata.id, chapters);
      await saveEpubBlob(metadata.id, file);
      addBookToStore(metadata);
      // Sync metadata (no epub content) to cloud for cross-device library
      if (user?.uid) syncBookMetadata(user.uid, metadata);
    } catch (err) {
      console.error('EPUB parse error:', err);
      setError(err.message || 'Khong the doc file EPUB');
    } finally {
      setIsParsing(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [addBookToStore, user]);

  const triggerUpload = useCallback(() => {
    fileRef.current?.click();
  }, []);

  // Hidden file input + progress overlay
  function UploadProgress() {
    return (
      <>
        <input ref={fileRef} type="file" accept=".epub" onChange={handleFileChange}
          className="hidden" />
        {isParsing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
              <div className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: 'var(--accent)' }} />
              </div>
              <p className="text-sm mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                Dang xu ly... {Math.round(progress * 100)}%
              </p>
            </div>
          </div>
        )}
        {error && !isParsing && (
          <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center">
            <div className="rounded-lg px-4 py-2 text-sm shadow-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              onClick={() => setError(null)}>
              {error}
            </div>
          </div>
        )}
      </>
    );
  }

  return { triggerUpload, UploadProgress };
}

// Keep backward compat - old modal delegates to hook
export default function UploadModal({ isOpen, onClose }) {
  const { triggerUpload, UploadProgress } = useEpubUpload();
  if (isOpen) triggerUpload();
  return <UploadProgress />;
}
