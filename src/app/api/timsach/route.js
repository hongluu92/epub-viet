import { NextResponse } from 'next/server';

// Scrape timsach.vn genre page and return book list as JSON
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const page = searchParams.get('page') || '1';

  if (!genre) {
    return NextResponse.json({ error: 'Missing genre param' }, { status: 400 });
  }

  try {
    const url = `https://timsach.vn/the-loai/${genre}?sort=by_view&page=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReadFlow/1.0)' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch genre page' }, { status: 502 });
    }

    const html = await res.text();
    const books = parseBookList(html);

    return NextResponse.json({ books, page: Number(page) });
  } catch (err) {
    console.error('Timsach scrape error:', err);
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}

// Extract book entries from genre page HTML
function parseBookList(html) {
  const books = [];

  // Match book links: /book/{id}-{slug}.html
  const bookLinkRe = /href="https?:\/\/timsach\.vn\/book\/(\d+)-([^"]+)\.html"[^>]*title="([^"]*)"[^>]*>/g;
  // Match cover images from CDN
  const imgRe = /src="(https:\/\/cdn\.supo\.vn\/timsach\/ebooks\/thumb\/[^"]+)"/g;
  // Match author links
  const authorRe = /href="https?:\/\/timsach\.vn\/tac-gia\/[^"]*"[^>]*title="([^"]*)"/g;

  // Collect all matches
  const linkMatches = [...html.matchAll(bookLinkRe)];
  const imgMatches = [...html.matchAll(imgRe)];
  const authorMatches = [...html.matchAll(authorRe)];

  // Deduplicate by book ID (links appear multiple times per book)
  const seen = new Set();

  for (let i = 0; i < linkMatches.length; i++) {
    const [, id, slug, title] = linkMatches[i];
    if (seen.has(id)) continue;
    seen.add(id);

    // Find matching cover image (use index based on unique book count)
    const bookIndex = seen.size - 1;
    const coverUrl = imgMatches[bookIndex]?.[1] || null;
    const author = authorMatches[bookIndex]?.[1] || 'Khong ro';

    books.push({ id, slug, title, author, coverUrl });
  }

  return books;
}
