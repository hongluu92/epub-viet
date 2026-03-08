import { NextResponse } from 'next/server';

// Extract EPUB CDN URL from timsach.vn read page
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  }

  try {
    const url = `https://timsach.vn/book/read/${id}.html`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReadFlow/1.0)' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch read page' }, { status: 502 });
    }

    const html = await res.text();

    // Extract Ebook.bookUrl from page JavaScript
    const match = html.match(/bookUrl\s*:\s*"([^"]+\.epub)"/);
    if (!match) {
      return NextResponse.json({ error: 'EPUB URL not found' }, { status: 404 });
    }

    return NextResponse.json({ epubUrl: match[1] });
  } catch (err) {
    console.error('Timsach download error:', err);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
