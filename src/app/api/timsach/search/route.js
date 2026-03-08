import { NextResponse } from 'next/server';

// Search timsach.vn and return matching books
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ books: [] });
  }

  try {
    const url = `https://timsach.vn/tim-kiem.html?s=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReadFlow/1.0)' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: 502 });
    }

    const html = await res.text();
    const books = parseSearchResults(html);

    return NextResponse.json({ books });
  } catch (err) {
    console.error('Timsach search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// Extract book entries from search results HTML (same structure as genre pages)
function parseSearchResults(html) {
  const books = [];
  const bookLinkRe = /href="https?:\/\/timsach\.vn\/book\/(\d+)-([^"]+)\.html"[^>]*title="([^"]*)"[^>]*>/g;
  const imgRe = /src="(https:\/\/cdn\.supo\.vn\/timsach\/ebooks\/thumb\/[^"]+)"/g;
  const authorRe = /href="https?:\/\/timsach\.vn\/tac-gia\/[^"]*"[^>]*title="([^"]*)"/g;

  const linkMatches = [...html.matchAll(bookLinkRe)];
  const imgMatches = [...html.matchAll(imgRe)];
  const authorMatches = [...html.matchAll(authorRe)];

  const seen = new Set();
  for (let i = 0; i < linkMatches.length; i++) {
    const [, id, slug, title] = linkMatches[i];
    if (seen.has(id)) continue;
    seen.add(id);

    const bookIndex = seen.size - 1;
    const coverUrl = imgMatches[bookIndex]?.[1] || null;
    const author = authorMatches[bookIndex]?.[1] || 'Khong ro';

    books.push({ id, slug, title, author, coverUrl });
  }

  return books;
}
