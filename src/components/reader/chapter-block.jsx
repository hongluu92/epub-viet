'use client';

import { memo } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import SentenceSpan from './sentence-span';

// Single store subscription per chapter instead of per-sentence (reduces 200+ → 1).
// Returns primitive values to avoid new-object-per-render infinite loop.
function useChapterActiveSentence(chapterIndex) {
  const isActive = useTtsStore((s) => s.isPlaying && s.currentChapter === chapterIndex);
  const activeParagraph = useTtsStore((s) => s.currentParagraph);
  const activeSentence = useTtsStore((s) => s.currentSentence);
  return isActive ? { p: activeParagraph, s: activeSentence } : null;
}

function ChapterBlock({ chapter, bookId, onLongPressSentence }) {
  const active = useChapterActiveSentence(chapter.chapterIndex);

  return (
    <div className="mb-8">
      {/* Chapter title */}
      <h2
        className="text-xl font-semibold text-center mb-6 pt-4"
        style={{ fontFamily: 'var(--font-lora)', color: 'var(--text)' }}
      >
        {chapter.title}
      </h2>

      {/* Paragraphs */}
      {chapter.paragraphs.map((paragraph, pIdx) => (
        <p key={pIdx} style={{ textIndent: '2em', marginBottom: '0.8em' }}>
          {(chapter.sentences[pIdx] || [paragraph]).map((sentence, sIdx) => (
            <SentenceSpan
              key={sIdx}
              text={sentence + ' '}
              bookId={bookId}
              chapterIndex={chapter.chapterIndex}
              paragraphIndex={pIdx}
              sentenceIndex={sIdx}
              isActive={active?.p === pIdx && active?.s === sIdx}
              onLongPress={onLongPressSentence}
            />
          ))}
        </p>
      ))}
    </div>
  );
}

export default memo(ChapterBlock);
