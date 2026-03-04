import { useEffect, useRef } from 'react';
import styles from './SentenceRenderer.module.css';

// Renders sentences with active highlight and smooth scroll into view
export default function SentenceRenderer({ sentences = [], activeSentenceIdx = 0, onSentenceClick }) {
  const activeRef = useRef(null);

  // Smooth-scroll active sentence into view when it changes
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSentenceIdx]);

  if (!sentences.length) {
    return <div className={styles.empty}>Chưa có nội dung để hiển thị.</div>;
  }

  // Group sentences into paragraphs: break every 5 or on empty sentinel
  const paragraphs = [];
  let current = [];
  sentences.forEach((s, i) => {
    if (s === '' || (current.length > 0 && current.length % 5 === 0)) {
      if (current.length > 0) paragraphs.push(current);
      current = [];
    }
    if (s !== '') current.push({ text: s, idx: i });
  });
  if (current.length > 0) paragraphs.push(current);

  return (
    <div className={styles.container}>
      {paragraphs.map((para, pi) => (
        <p key={pi} className={styles.paragraph}>
          {para.map(({ text, idx }) => (
            <span
              key={idx}
              id={`s-${idx}`}
              ref={idx === activeSentenceIdx ? activeRef : null}
              className={`${styles.sentence} ${idx === activeSentenceIdx ? styles.active : ''}`}
              onClick={() => onSentenceClick?.(idx)}
            >
              {text}{' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
