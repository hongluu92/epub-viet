/**
 * Helper functions for EPUB parsing.
 * Handles container.xml, OPF metadata, spine, chapter HTML, and cover extraction.
 */

/**
 * Parse container.xml to find the OPF file path.
 * @param {string} xml - container.xml content
 * @returns {string} Path to the OPF file
 */
export function parseContainerXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  if (!rootfile) throw new Error('Invalid EPUB: no rootfile in container.xml');
  return rootfile.getAttribute('full-path');
}

/**
 * Parse OPF file to extract metadata and spine (chapter order).
 * @param {string} xml - OPF file content
 * @param {string} opfDir - Directory containing the OPF file
 * @returns {{ metadata, spine, manifest }}
 */
export function parseOpf(xml, opfDir) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // Extract metadata
  const getText = (tag) => {
    const el = doc.querySelector(`metadata ${tag}, metadata dc\\:${tag}`);
    return el?.textContent?.trim() || '';
  };

  const metadata = {
    title: getText('title') || 'Untitled',
    author: getText('creator') || 'Unknown',
    language: getText('language') || 'vi',
    description: getText('description') || '',
  };

  // Build manifest map: id -> { href, mediaType }
  const manifest = {};
  doc.querySelectorAll('manifest item').forEach((item) => {
    manifest[item.getAttribute('id')] = {
      href: resolveHref(item.getAttribute('href'), opfDir),
      mediaType: item.getAttribute('media-type'),
    };
  });

  // Extract spine order (list of manifest ids)
  const spine = [];
  doc.querySelectorAll('spine itemref').forEach((ref) => {
    const idref = ref.getAttribute('idref');
    if (manifest[idref]) {
      spine.push(manifest[idref]);
    }
  });

  // Find cover image id from metadata
  const coverMeta = doc.querySelector('meta[name="cover"]');
  const coverId = coverMeta?.getAttribute('content');

  return { metadata, spine, manifest, coverId };
}

/**
 * Resolve a relative href against the OPF directory.
 */
function resolveHref(href, opfDir) {
  if (!opfDir || opfDir === '.') return href;
  return `${opfDir}/${href}`;
}

/**
 * Parse chapter HTML and extract paragraphs as text.
 * @param {string} html - XHTML chapter content
 * @returns {string[]} Array of paragraph text strings
 */
export function parseChapterHtml(html) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(html, 'application/xhtml+xml');

  // Detect parse error and retry as text/html
  if (doc.querySelector('parsererror')) {
    doc = parser.parseFromString(html, 'text/html');
  }

  const body = doc.querySelector('body') || doc.documentElement;
  if (!body) return [];

  const paragraphs = [];
  const elements = body.querySelectorAll('p, div > br, h1, h2, h3, h4, h5, h6');

  if (elements.length === 0) {
    // Fallback: split body text by double newlines
    const text = body.textContent?.trim();
    if (text) {
      return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    }
    return [];
  }

  elements.forEach((el) => {
    const text = el.textContent?.trim();
    if (text) paragraphs.push(text);
  });

  return paragraphs;
}

/**
 * Extract chapter title from HTML content.
 * Looks for heading elements or uses first paragraph.
 */
export function extractChapterTitle(html) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(html, 'application/xhtml+xml');
  if (doc.querySelector('parsererror')) {
    doc = parser.parseFromString(html, 'text/html');
  }
  const body = doc.querySelector('body') || doc.documentElement;

  const heading = body?.querySelector('h1, h2, h3, h4, title');
  return heading?.textContent?.trim() || '';
}

/**
 * Extract cover image from EPUB ZIP.
 * @param {object} opfData - Parsed OPF data with coverId and manifest
 * @param {import('jszip')} zip - JSZip instance
 * @returns {string|null} Base64 data URL of cover, or null
 */
export async function extractCoverImage(opfData, zip) {
  const { coverId, manifest } = opfData;

  // Strategy 1: cover id from metadata
  if (coverId && manifest[coverId]) {
    const coverItem = manifest[coverId];
    return await readImageFromZip(zip, coverItem.href);
  }

  // Strategy 2: look for item with 'cover' in id/href
  for (const [id, item] of Object.entries(manifest)) {
    if (
      item.mediaType?.startsWith('image/') &&
      (id.toLowerCase().includes('cover') || item.href.toLowerCase().includes('cover'))
    ) {
      return await readImageFromZip(zip, item.href);
    }
  }

  return null;
}

/** Read an image file from ZIP and return as base64 data URL */
async function readImageFromZip(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  const blob = await file.async('blob');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
