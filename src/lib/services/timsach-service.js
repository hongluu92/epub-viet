import { parseEpub } from '@/lib/services/epub-parser';
import { addBook, saveChapters, saveEpubBlob } from '@/lib/services/indexeddb-service';

// Genre name → timsach.vn URL slug mapping
export const GENRE_SLUG_MAP = {
  'Tiên Hiệp': 'tien-hiep',
  'Kiếm Hiệp': 'kiem-hiep',
  'Đô Thị': 'do-thi',
  'Huyền Huyễn': 'huyen-huyen',
  'Ngôn Tình': 'ngon-tinh',
  'Xuyên Không': 'xuyen-khong',
  'Đam Mỹ': 'dam-my',
  'Trọng Sinh': 'trong-sinh',
  'Võ Hiệp': 'vo-hiep',
  'Viễn Tưởng': 'vien-tuong',
  'Trinh Thám': 'trinh-tham',
  'Lịch Sử': 'lich-su',
  'Kinh Dị': 'kinh-di',
  'Hài Hước': 'hai-huoc',
};

// Fetch books by genre from timsach.vn via API route
export async function fetchBooksByGenre(genreSlug, page = 1) {
  const res = await fetch(`/api/timsach?genre=${genreSlug}&page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch books');
  const data = await res.json();
  return data.books;
}

// Search books on timsach.vn
export async function searchBooks(query) {
  const res = await fetch(`/api/timsach/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.books;
}

// Get EPUB CDN URL for a book
export async function getEpubDownloadUrl(bookId) {
  const res = await fetch(`/api/timsach/download?id=${bookId}`);
  if (!res.ok) throw new Error('Failed to get download URL');
  const data = await res.json();
  return data.epubUrl;
}

// Download EPUB from CDN, parse it, and save to IndexedDB
export async function downloadAndImportEpub(bookInfo, onProgress = () => {}) {
  onProgress(0.1);

  // Get CDN URL
  const epubUrl = await getEpubDownloadUrl(bookInfo.id);
  onProgress(0.2);

  // Download EPUB blob
  const epubRes = await fetch(epubUrl);
  if (!epubRes.ok) throw new Error('Failed to download EPUB');
  const blob = await epubRes.blob();
  onProgress(0.4);

  // Create File object for parseEpub
  const file = new File([blob], `${bookInfo.slug || 'book'}.epub`, {
    type: 'application/epub+zip',
  });

  // Parse EPUB (reuse existing parser)
  const { metadata, chapters } = await parseEpub(file, (p) => {
    onProgress(0.4 + p * 0.5);
  });

  // Override metadata with timsach info if available
  if (bookInfo.title) metadata.title = bookInfo.title;
  if (bookInfo.author) metadata.author = bookInfo.author;
  if (bookInfo.coverUrl) metadata.coverUrl = bookInfo.coverUrl;
  metadata.source = 'timsach';
  metadata.timsachId = bookInfo.id;

  // Save to IndexedDB
  await addBook(metadata);
  await saveChapters(metadata.id, chapters);
  await saveEpubBlob(metadata.id, file);
  onProgress(1);

  return metadata;
}
