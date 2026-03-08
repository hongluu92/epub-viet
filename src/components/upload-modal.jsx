'use client';

import { useState, useRef } from 'react';
import { parseEpub } from '@/lib/services/epub-parser';
import {
  addBook,
  saveChapters,
  saveEpubBlob,
} from '@/lib/services/indexeddb-service';
import { useLibraryStore } from '@/lib/stores/library-store';

export default function UploadModal({ isOpen, onClose }) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileRef = useRef(null);
  const addBookToStore = useLibraryStore((s) => s.addBook);

  if (!isOpen) return null;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.epub')) {
      setError('Please select an EPUB file');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('File too large (max 200MB)');
      return;
    }

    setError(null);
    setIsParsing(true);
    setProgress(0);

    try {
      const { metadata, chapters } = await parseEpub(file, setProgress);

      // Save to IndexedDB
      await addBook(metadata);
      await saveChapters(metadata.id, chapters);
      await saveEpubBlob(metadata.id, file);

      // Update Zustand store
      addBookToStore(metadata);

      onClose();
    } catch (err) {
      console.error('EPUB parse error:', err);
      setError(err.message || 'Failed to parse EPUB file');
    } finally {
      setIsParsing(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && !isParsing && onClose()}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
      >
        <h2 className="text-lg font-semibold mb-4">Import EPUB</h2>

        <input
          ref={fileRef}
          type="file"
          accept=".epub"
          onChange={handleFileChange}
          disabled={isParsing}
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg
            file:border-0 file:text-sm file:font-medium file:cursor-pointer
            disabled:opacity-50"
          style={{ color: 'var(--text-secondary)' }}
        />

        {isParsing && (
          <div className="mt-4">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: 'var(--accent)',
                }}
              />
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Parsing... {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm mt-3" style={{ color: 'var(--accent)' }}>
            {error}
          </p>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            disabled={isParsing}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
