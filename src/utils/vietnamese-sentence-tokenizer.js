// Vietnamese regex-based sentence tokenizer
// Handles abbreviations common in Vietnamese text to avoid false splits

// Abbreviations that end with a dot but are NOT sentence endings
const ABBREVS = ['ông', 'bà', 'ts', 'bs', 'ks', 'pgs', 'gs', 'th.s', 'cn', 'kts', 'ths', 'pgs.ts', 'gs.ts'];

// Placeholder used to temporarily replace protected dots
const DOT_PLACEHOLDER = '\x00DOT\x00';

// Max sentence length before attempting to split at comma/semicolon
const MAX_SENTENCE_LENGTH = 200;

/**
 * Protect abbreviation dots so they don't trigger sentence splits.
 * E.g. "TS. Nguyễn" → "TS\x00DOT\x00 Nguyễn"
 */
function protectAbbreviations(text) {
  let result = text;
  for (const abbr of ABBREVS) {
    // Match abbreviation (case-insensitive) followed by a dot and space/capital
    const pattern = new RegExp(`\\b(${abbr})\\.`, 'gi');
    result = result.replace(pattern, `$1${DOT_PLACEHOLDER}`);
  }
  return result;
}

/**
 * Restore placeholders back to dots.
 */
function restoreDots(text) {
  return text.replaceAll(DOT_PLACEHOLDER, '.');
}

/**
 * Split a long sentence at the nearest comma or semicolon.
 * Only splits if the sentence exceeds MAX_SENTENCE_LENGTH.
 * Returns array of sub-sentences.
 */
function splitLongSentence(sentence) {
  if (sentence.length <= MAX_SENTENCE_LENGTH) return [sentence];

  const parts = [];
  let remaining = sentence;

  while (remaining.length > MAX_SENTENCE_LENGTH) {
    // Find split point: look for comma/semicolon near the MAX boundary
    const searchWindow = remaining.slice(0, MAX_SENTENCE_LENGTH + 50);
    // Find the last comma or semicolon within the window
    const splitAt = Math.max(
      searchWindow.lastIndexOf(','),
      searchWindow.lastIndexOf(';'),
    );

    if (splitAt <= 0) {
      // No comma found — take the full chunk as-is
      break;
    }

    parts.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts.length > 0 ? parts : [sentence];
}

/**
 * Tokenize Vietnamese text into sentences.
 * Handles abbreviations, ellipsis, and long sentences.
 *
 * @param {string} text - Plain text input (HTML stripped)
 * @returns {string[]} Array of sentence strings
 */
export function tokenizeVietnamese(text) {
  if (!text || text.trim() === '') return [];

  // 1. Normalize whitespace (collapse multiple spaces/newlines)
  let normalized = text.replace(/\s+/g, ' ').trim();

  // 2. Protect abbreviation dots
  normalized = protectAbbreviations(normalized);

  // 3. Split on sentence-ending punctuation followed by whitespace
  // Handles: . ! ? … and combinations like ...
  const rawSentences = normalized.split(/(?<=[.!?…])\s+/);

  // 4. Restore dots and process each sentence
  const sentences = [];
  for (const raw of rawSentences) {
    const restored = restoreDots(raw).trim();
    if (!restored) continue;

    // 5. Split sentences that are too long at comma/semicolon
    const parts = splitLongSentence(restored);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
      }
    }
  }

  return sentences;
}
