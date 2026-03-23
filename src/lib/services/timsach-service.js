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

// Cloudflare Worker proxy (primary) + free fallbacks
const CF_PROXY = 'https://timsach-proxy.honglm1011.workers.dev/?url=';
const FALLBACK_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT = 10000;

// Fetch HTML via proxy with timeout and fallback
async function fetchWithProxy(url) {
  const proxies = [
    () => `${CF_PROXY}${encodeURIComponent(url)}`,
    ...FALLBACK_PROXIES.map(fn => () => fn(url)),
  ];
  let lastErr;
  for (const makeUrl of proxies) {
    try {
      const res = await fetch(makeUrl(), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      if (text.length < 100 || !text.includes('<')) throw new Error('Invalid response');
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`All proxies failed: ${lastErr?.message}`);
}

// Parse book list from timsach.vn genre page HTML
function parseBookList(html) {
  const books = [];
  const bookLinkRe = /href="https?:\/\/timsach\.vn\/book\/(\d+)-([^"]+)\.html"[^>]*title="([^"]*)"[^>]*>/g;
  const imgRe = /src="(https:\/\/cdn\.supo\.vn\/timsach\/ebooks\/thumb\/[^"]+)"/g;
  const authorRe = /href="https?:\/\/timsach\.vn\/tac-gia\/[^"]*"[^>]*title="([^"]*)"/g;
  const linkMatches = [...html.matchAll(bookLinkRe)];
  const imgMatches = [...html.matchAll(imgRe)];
  const authorMatches = [...html.matchAll(authorRe)];
  const seen = new Set();
  for (let i = 0; i < linkMatches.length; i++) {
    const [, id, slug, title] = linkMatches[i];
    if (seen.has(id)) continue;
    seen.add(id);
    const bookIndex = seen.size - 1;
    const coverUrl = imgMatches[bookIndex]?.[1] || null;
    const author = authorMatches[bookIndex]?.[1] || 'Không rõ';
    books.push({ id, slug, title, author, coverUrl });
  }
  return books;
}

// Fetch books by genre from timsach.vn (client-side via CORS proxy)
export async function fetchBooksByGenre(genreSlug, page = 1) {
  const url = `https://timsach.vn/the-loai/${genreSlug}?sort=by_view&page=${page}`;
  const html = await fetchWithProxy(url);
  return parseBookList(html);
}

// Search books across all genres (fetches top genres in parallel)
export async function searchBooks(query) {
  const q = query.toLowerCase();
  const topGenres = Object.values(GENRE_SLUG_MAP).slice(0, 6);
  const results = await Promise.allSettled(
    topGenres.map(slug => fetchBooksByGenre(slug, 1))
  );
  const allBooks = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  // Deduplicate by id and filter by query
  const seen = new Set();
  return allBooks.filter(book => {
    if (seen.has(book.id)) return false;
    seen.add(book.id);
    return book.title?.toLowerCase().includes(q) ||
           book.author?.toLowerCase().includes(q);
  });
}

// Get EPUB CDN URL for a book by scraping its read page
export async function getEpubDownloadUrl(bookId) {
  const url = `https://timsach.vn/book/read/${bookId}.html`;
  const html = await fetchWithProxy(url);
  // bookUrl is set as a JS variable in the reader page script
  const match = html.match(/bookUrl:\s*"(https:\/\/cdn\.supo\.vn\/timsach\/ebooks\/[^"]+\.epub)"/);
  if (!match) throw new Error('EPUB URL not found');
  return match[1];
}

// Download EPUB from CDN, parse it, and save to IndexedDB
export async function downloadAndImportEpub(bookInfo, onProgress = () => {}) {
  onProgress(0.1);

  // Use stored epubUrl directly if available (re-download from cloud).
  // For first-time downloads bookInfo.id is the timsach ID, so scrape from that.
  const epubUrl = bookInfo.epubUrl || await getEpubDownloadUrl(bookInfo.id);
  onProgress(0.2);

  // Download EPUB blob via proxy (CDN lacks CORS headers)
  const proxiedEpubUrl = `${CF_PROXY}${encodeURIComponent(epubUrl)}`;
  const epubRes = await fetch(proxiedEpubUrl);
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
  metadata.timsachId = bookInfo.timsachId || bookInfo.id; // timsachId = actual timsach book ID
  metadata.epubUrl = epubUrl; // store for cross-device re-download without re-scraping

  // For re-downloads: preserve the cloud book's ID so the placeholder is replaced, not duplicated
  if (bookInfo.epubUrl) metadata.id = bookInfo.id;

  // Save to IndexedDB
  await addBook(metadata);
  await saveChapters(metadata.id, chapters);
  await saveEpubBlob(metadata.id, file);
  onProgress(1);

  return metadata;
}
