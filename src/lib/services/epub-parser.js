import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { tokenize } from '@/lib/utils/vietnamese-sentence-tokenizer';
import {
  parseContainerXml,
  parseOpf,
  parseChapterHtml,
  extractChapterTitle,
  extractCoverImage,
} from './epub-parser-helpers';

/**
 * Parse an EPUB file and return structured book data.
 * @param {File} file - The EPUB file from file input
 * @param {(progress: number) => void} onProgress - Progress callback (0-1)
 * @returns {{ metadata: object, chapters: object[] }}
 */
export async function parseEpub(file, onProgress = () => {}) {
  const zip = await JSZip.loadAsync(file);
  onProgress(0.1);

  // 1. Find OPF path from container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const containerXml = await containerFile.async('string');
  const opfPath = parseContainerXml(containerXml);
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  // 2. Parse OPF for metadata + spine
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`Invalid EPUB: OPF not found at ${opfPath}`);

  const opfXml = await opfFile.async('string');
  const opfData = parseOpf(opfXml, opfDir);
  onProgress(0.2);

  // 3. Extract cover image
  const coverUrl = await extractCoverImage(opfData, zip);
  onProgress(0.3);

  // 4. Parse each spine item (chapter)
  const chapters = [];
  const { spine } = opfData;

  for (let i = 0; i < spine.length; i++) {
    const item = spine[i];
    const chapterFile = zip.file(item.href);

    if (!chapterFile || !item.mediaType?.includes('html')) {
      continue;
    }

    const html = await chapterFile.async('string');
    const paragraphs = parseChapterHtml(html);

    // Skip empty chapters
    if (paragraphs.length === 0) continue;

    const title = extractChapterTitle(html) || `Chương ${chapters.length + 1}`;

    // Tokenize each paragraph into sentences
    const sentences = paragraphs.map((p) => tokenize(p));

    chapters.push({
      chapterIndex: chapters.length,
      title,
      paragraphs,
      sentences,
    });

    onProgress(0.3 + (i / spine.length) * 0.6);
  }

  onProgress(0.95);

  const bookId = uuidv4();
  const totalCharacters = chapters.reduce(
    (sum, ch) => sum + ch.paragraphs.join('').length,
    0
  );

  const metadata = {
    id: bookId,
    title: opfData.metadata.title,
    author: opfData.metadata.author,
    coverUrl,
    chapterCount: chapters.length,
    totalCharacters,
    addedAt: Date.now(),
    lastReadAt: Date.now(),
    currentChapter: 0,
    currentSentence: 0,
    readingProgress: 0,
  };

  onProgress(1);
  return { metadata, chapters };
}
