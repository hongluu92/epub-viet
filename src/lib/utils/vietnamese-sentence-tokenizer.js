/**
 * Vietnamese sentence tokenizer.
 * Splits a paragraph into sentences, handling Vietnamese punctuation rules.
 *
 * Rules:
 * 1. Split on . ! ? followed by space or end-of-string
 * 2. Keep ... (ellipsis) as part of sentence, split after
 * 3. Handle dialogue quotes
 * 4. Don't split on numbers with dots (100.000)
 * 5. Merge short fragments (<5 chars) with previous sentence
 */

/**
 * Tokenize a text string into an array of sentences.
 * @param {string} text - Input paragraph text
 * @returns {string[]} Array of sentences
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  const trimmed = text.trim();
  if (!trimmed) return [];

  // Regex: split on sentence-ending punctuation followed by space or end
  // - Handles ellipsis (...) as single unit
  // - Avoids splitting on numbers like 100.000
  const sentencePattern =
    /(?<=[^0-9](?:\.\.\.|[.!?]))(?:\s+|$)|(?<=\.\.\.)(?:\s+|$)/g;

  const raw = trimmed.split(sentencePattern).filter((s) => s && s.trim());

  if (raw.length === 0) return [trimmed];

  // Merge short fragments (<5 chars) with previous sentence
  const merged = [];
  for (const sentence of raw) {
    const clean = sentence.trim();
    if (!clean) continue;

    if (clean.length < 5 && merged.length > 0) {
      merged[merged.length - 1] += ' ' + clean;
    } else {
      merged.push(clean);
    }
  }

  return merged.length > 0 ? merged : [trimmed];
}
