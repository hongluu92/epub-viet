// XML/HTML parsing helpers for the EPUB parser
// Uses browser-native DOMParser — no external XML dependencies

/**
 * Parse an XML/HTML string into a DOM document.
 * @param {string} xmlStr
 * @param {'application/xml'|'text/html'} mimeType
 * @returns {Document}
 */
export function parseXml(xmlStr, mimeType = 'application/xml') {
  const parser = new DOMParser();
  return parser.parseFromString(xmlStr, mimeType);
}

/**
 * Get text content of first matching element, with namespace fallback.
 * Tries both namespaced and non-namespaced selectors.
 * @param {Document} doc
 * @param {string} localName - e.g. 'title', 'creator'
 * @returns {string}
 */
export function getMetaText(doc, localName) {
  // Try dc: prefix first (Dublin Core namespace)
  const el =
    doc.querySelector(`dc\\:${localName}`) ||
    doc.querySelector(localName) ||
    doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', localName)[0];
  return el?.textContent?.trim() || '';
}

/**
 * Extract rootfile path from META-INF/container.xml content.
 * @param {string} containerXml
 * @returns {string} - e.g. "OEBPS/content.opf"
 */
export function extractRootfilePath(containerXml) {
  const doc = parseXml(containerXml);
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') || '';
}

/**
 * Build a map of manifest items: id → { href, mediaType, properties }
 * @param {Document} opfDoc
 * @returns {Map<string, {href: string, mediaType: string, properties: string}>}
 */
export function buildManifestMap(opfDoc) {
  const manifest = new Map();
  const items = opfDoc.querySelectorAll('manifest item');
  for (const item of items) {
    const id = item.getAttribute('id');
    if (id) {
      manifest.set(id, {
        href: item.getAttribute('href') || '',
        mediaType: item.getAttribute('media-type') || '',
        properties: item.getAttribute('properties') || '',
      });
    }
  }
  return manifest;
}

/**
 * Extract spine order as array of manifest item ids.
 * @param {Document} opfDoc
 * @returns {string[]}
 */
export function extractSpineIds(opfDoc) {
  const itemrefs = opfDoc.querySelectorAll('spine itemref');
  return Array.from(itemrefs).map((ref) => ref.getAttribute('idref')).filter(Boolean);
}

/**
 * Find cover image manifest item.
 * Checks: properties="cover-image", id containing "cover", or <meta name="cover">.
 * @param {Document} opfDoc
 * @param {Map} manifest
 * @returns {{ href: string, mediaType: string } | null}
 */
export function findCoverItem(opfDoc, manifest) {
  // 1. Look for properties="cover-image"
  for (const [, item] of manifest) {
    if (item.properties.includes('cover-image')) return item;
  }

  // 2. Look for <meta name="cover" content="item-id">
  const coverMeta =
    opfDoc.querySelector('meta[name="cover"]') ||
    opfDoc.querySelector('metadata meta[name="cover"]');
  if (coverMeta) {
    const coverId = coverMeta.getAttribute('content');
    if (coverId && manifest.has(coverId)) return manifest.get(coverId);
  }

  // 3. Fallback: any manifest item with id containing "cover"
  for (const [id, item] of manifest) {
    if (id.toLowerCase().includes('cover') && item.mediaType.startsWith('image/')) {
      return item;
    }
  }

  return null;
}

/**
 * Resolve a relative href from the OPF file's directory.
 * @param {string} opfPath - e.g. "OEBPS/content.opf"
 * @param {string} href - relative href from manifest, e.g. "Text/chapter1.xhtml"
 * @returns {string} - full zip path, e.g. "OEBPS/Text/chapter1.xhtml"
 */
export function resolvePath(opfPath, href) {
  if (!opfPath.includes('/')) return href; // OPF at root
  const base = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  // Handle ../ in hrefs
  const parts = (base + href).split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.') {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

/**
 * Strip HTML tags and decode common HTML entities to get plain text.
 * Also removes <script> and <style> blocks entirely.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  // Remove script and style blocks (security + clean text)
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Replace block-level tags with newlines for sentence boundary preservation
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote)[^>]*>/gi, '\n');

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  return text;
}

/**
 * Extract chapter title from HTML content or fallback to a default.
 * @param {string} html
 * @param {number} idx - chapter index (for fallback label)
 * @returns {string}
 */
export function extractChapterTitle(html, idx) {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (match) {
    return stripHtml(match[1]).trim() || `Chapter ${idx + 1}`;
  }
  return `Chapter ${idx + 1}`;
}
