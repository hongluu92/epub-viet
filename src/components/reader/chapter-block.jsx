'use client';

import { memo } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import SentenceSpan from './sentence-span';

// Single store subscription per chapter instead of per-sentence (reduces 200+ → 1)
function useChapterActiveSentence(chapterIndex) {
  return useTtsStore((s) =>
    s.isPlaying && s.currentChapter === chapterIndex
      ? { p: s.currentParagraph, s: s.currentSentence }
      : null
  );
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
