'use client';

import SentenceSpan from './sentence-span';

export default function ChapterBlock({ chapter, bookId, onLongPressSentence }) {
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
              onLongPress={onLongPressSentence}
            />
          ))}
        </p>
      ))}
    </div>
  );
}
