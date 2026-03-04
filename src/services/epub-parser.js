// EPUB parser using JSZip + browser-native DOMParser
// Extracts metadata, chapters in spine order, and tokenizes sentences
import JSZip from 'jszip';
import { tokenizeVietnamese } from '../utils/vietnamese-sentence-tokenizer.js';
import {
  parseXml,
  getMetaText,
  extractRootfilePath,
  buildManifestMap,
  extractSpineIds,
  findCoverItem,
  resolvePath,
  stripHtml,
  extractChapterTitle,
} from './epub-parser-helpers.js';

const EPUB_MIME = 'application/epub+zip';

/**
 * Read a file from the zip by path, returning text content.
 * Tries exact path first, then case-insensitive fallback.
 */
async function readZipText(zip, path) {
  let entry = zip.file(path);
  if (!entry) {
    // Case-insensitive fallback for non-standard EPUBs
    const lower = path.toLowerCase();
    entry = zip.file(new RegExp(`^${lower}$`, 'i'))?.[0] || null;
  }
  if (!entry) throw new Error(`EPUB: missing file "${path}"`);
  return entry.async('text');
}

/**
 * Read a zip file entry as Uint8Array (for binary files like images).
 */
async function readZipBinary(zip, path) {
  const entry = zip.file(path);
  if (!entry) return null;
  return entry.async('uint8array');
}

/**
 * Extract and parse the OPF file; return opfDoc + opfDir.
 */
async function loadOpf(zip) {
  const containerXml = await readZipText(zip, 'META-INF/container.xml');
  const rootfilePath = extractRootfilePath(containerXml);
  if (!rootfilePath) throw new Error('EPUB: cannot find rootfile in container.xml');

  const opfXml = await readZipText(zip, rootfilePath);
  const opfDoc = parseXml(opfXml);
  return { opfDoc, opfPath: rootfilePath };
}

/**
 * Build cover blob and object URL from the manifest cover item.
 */
async function extractCover(zip, opfPath, manifest) {
  try {
    const coverItem = findCoverItem(null, manifest); // opfDoc not needed here
    if (!coverItem) return { coverUrl: null, coverBlob: null };

    const coverPath = resolvePath(opfPath, coverItem.href);
    const data = await readZipBinary(zip, coverPath);
    if (!data) return { coverUrl: null, coverBlob: null };

    const blob = new Blob([data], { type: coverItem.mediaType || 'image/jpeg' });
    const coverUrl = URL.createObjectURL(blob);
    return { coverUrl, coverBlob: blob };
  } catch {
    return { coverUrl: null, coverBlob: null };
  }
}

/**
 * Parse a single chapter HTML into { title, html, sentences }.
 */
function processChapter(html, idx) {
  const title = extractChapterTitle(html, idx);
  const plainText = stripHtml(html);
  const sentences = tokenizeVietnamese(plainText);
  return { title, html, sentences, idx };
}

/**
 * Parse an EPUB file (File or Blob) and return structured book data.
 *
 * @param {File|Blob} file
 * @returns {Promise<{
 *   metadata: { title: string, author: string, coverUrl: string|null, coverBlob: Blob|null },
 *   chapters: Array<{ title: string, html: string, sentences: string[], idx: number }>
 * }>}
 */
export async function parseEpub(file) {
  // 1. Load zip
  const zip = await JSZip.loadAsync(file);

  // 2. Verify EPUB mimetype (non-fatal — some EPUBs omit this)
  try {
    const mime = await zip.file('mimetype')?.async('text');
    if (mime && mime.trim() !== EPUB_MIME) {
      console.warn(`EPUB: unexpected mimetype "${mime}"`);
    }
  } catch {
    // Non-fatal
  }

  // 3. Load OPF
  const { opfDoc, opfPath } = await loadOpf(zip);

  // 4. Extract metadata
  const title = getMetaText(opfDoc, 'title') || 'Unknown Title';
  const author = getMetaText(opfDoc, 'creator') || 'Unknown Author';

  // 5. Build manifest map and find cover
  const manifest = buildManifestMap(opfDoc);
  const { coverUrl, coverBlob } = await extractCover(zip, opfPath, manifest);

  // Re-run with opfDoc for meta-based cover detection
  const coverItemFromMeta = findCoverItem(opfDoc, manifest);
  let finalCoverUrl = coverUrl;
  let finalCoverBlob = coverBlob;

  if (!finalCoverUrl && coverItemFromMeta) {
    try {
      const coverPath = resolvePath(opfPath, coverItemFromMeta.href);
      const data = await readZipBinary(zip, coverPath);
      if (data) {
        finalCoverBlob = new Blob([data], { type: coverItemFromMeta.mediaType || 'image/jpeg' });
        finalCoverUrl = URL.createObjectURL(finalCoverBlob);
      }
    } catch {
      // Non-fatal
    }
  }

  // 6. Resolve spine to chapter hrefs
  const spineIds = extractSpineIds(opfDoc);
  const chapterHrefs = spineIds
    .map((id) => manifest.get(id))
    .filter((item) => item && item.mediaType?.includes('html'))
    .map((item) => resolvePath(opfPath, item.href));

  // 7. Parse each chapter
  const chapters = [];
  for (let i = 0; i < chapterHrefs.length; i++) {
    try {
      const html = await readZipText(zip, chapterHrefs[i]);
      const chapter = processChapter(html, i);
      // Only include chapters with actual content
      if (chapter.sentences.length > 0) {
        chapters.push(chapter);
      }
    } catch (err) {
      console.warn(`EPUB: skipping chapter ${i} (${chapterHrefs[i]}):`, err.message);
    }
  }

  return {
    metadata: { title, author, coverUrl: finalCoverUrl, coverBlob: finalCoverBlob },
    chapters,
  };
}
