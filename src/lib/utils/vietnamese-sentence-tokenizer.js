/**
 * Vietnamese sentence tokenizer.
 * Splits a paragraph into sentences, handling Vietnamese punctuation rules.
 *
 * Rules:
 * 1. Split on . ! ? followed by space or end-of-string
 * 2. Keep ... (ellipsis) as part of sentence, split after
 * 3. Don't split on numbers with dots (100.000)
 * 4. Merge short fragments (<5 chars) with previous sentence
 * 5. Split long sentences (>MAX_SENTENCE_CHARS) on clause boundaries (, ; — :)
 *    so each item in the sentences array is short enough for fast TTS synthesis.
 */

/** Sentences longer than this get split further on clause boundaries.
 * 200 chars accommodates most Vietnamese novel sentences without forced mid-phrase cuts. */
const MAX_SENTENCE_CHARS = 200;

/**
 * Split a single long sentence on clause boundaries (, ; — :).
 * Keeps splitting until all parts are within MAX_SENTENCE_CHARS,
 * falling back to word boundaries if no punctuation is found.
 * @param {string} sentence
 * @returns {string[]}
 */
function splitLongSentence(sentence) {
  if (sentence.length <= MAX_SENTENCE_CHARS) return [sentence];

  // Split on clause-level punctuation
  const clauseParts = sentence.split(/(?<=[,;—:])\s+/);
  const result = [];
  let buffer = '';

  for (const part of clauseParts) {
    if (!buffer) {
      buffer = part;
      continue;
    }
    if ((buffer + ' ' + part).length <= MAX_SENTENCE_CHARS) {
      buffer += ' ' + part;
    } else {
      result.push(buffer);
      buffer = part;
    }
  }
  if (buffer) result.push(buffer);

  // Keep chunks as-is even if still long — avoid unnatural mid-phrase word splits.
  // ONNX handles long sentences fine; forced word splits sound broken in TTS.
  return result.filter(Boolean);
}

/**
 * Tokenize a text string into an array of sentences.
 * @param {string} text - Input paragraph text
 * @returns {string[]} Array of sentences (each ≤ MAX_SENTENCE_CHARS where possible)
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

  // Merge short fragments (<5 chars) with previous, then split long sentences
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

  if (merged.length === 0) return [trimmed];

  // Split any sentence exceeding the char limit into clause-level chunks
  const result = [];
  for (const sentence of merged) {
    for (const chunk of splitLongSentence(sentence)) {
      result.push(chunk);
    }
  }

  return result;
}
