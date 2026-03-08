'use client';

// 6 gradient presets for books without a cover image.
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
];

// Deterministic gradient selection based on title characters.
function getGradient(title = '') {
  const sum = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

// Renders a book cover image or a gradient placeholder with title overlay.
export default function BookCover({ coverUrl, title, width = 100, height = 140 }) {
  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={title}
        style={{ width, height, objectFit: 'cover', borderRadius: 8, display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: getGradient(title),
        display: 'flex',
        alignItems: 'flex-end',
        padding: '8px',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        {title}
      </span>
    </div>
  );
}
