/**
 * Generates PWA icon PNG files without external dependencies.
 * Creates icon-192.png and icon-512.png in public/icons/.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

mkdirSync(OUT_DIR, { recursive: true });

// --- CRC32 table ---
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// --- PNG chunk builder ---
function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Creates a solid-color PNG buffer with a centered "RF" monogram.
 * @param {number} size - Image size in pixels
 */
function createIconPng(size) {
  const BG = [0x1a, 0x1a, 0x1a];    // #1a1a1a dark background
  const ACCENT = [0xc0, 0x39, 0x2b]; // #c0392b red accent

  // Draw into RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  };

  // Fill background
  for (let i = 0; i < size * size * 4; i += 4) {
    pixels[i] = BG[0]; pixels[i + 1] = BG[1]; pixels[i + 2] = BG[2]; pixels[i + 3] = 255;
  }

  // Draw rounded rect border (accent color ring)
  const pad = Math.round(size * 0.08);
  const thick = Math.max(2, Math.round(size * 0.02));
  for (let y = pad; y < size - pad; y++) {
    for (let x = pad; x < size - pad; x++) {
      const onBorder =
        x < pad + thick || x >= size - pad - thick ||
        y < pad + thick || y >= size - pad - thick;
      if (onBorder) set(x, y, ACCENT);
    }
  }

  // Draw thick "R" shape (simplified pixel art)
  const cx = Math.round(size * 0.35);
  const cy = Math.round(size * 0.25);
  const ch = Math.round(size * 0.5);
  const cw = Math.round(size * 0.15);
  const stroke = Math.max(2, Math.round(size * 0.04));

  // Vertical stem of R
  for (let y = cy; y < cy + ch; y++)
    for (let dx = 0; dx < stroke; dx++) set(cx + dx, y, ACCENT);

  // Top horizontal bar of R
  const barW = Math.round(size * 0.18);
  for (let x = cx; x < cx + barW; x++)
    for (let dy = 0; dy < stroke; dy++) set(x, cy + dy, ACCENT);

  // Middle bar of R
  const midY = cy + Math.round(ch * 0.45);
  for (let x = cx; x < cx + barW; x++)
    for (let dy = 0; dy < stroke; dy++) set(x, midY + dy, ACCENT);

  // Right curve top (bowl of R)
  const bowlX = cx + barW;
  for (let y = cy; y < midY + stroke; y++)
    for (let dx = 0; dx < stroke; dx++) set(bowlX + dx, y, ACCENT);

  // Diagonal leg of R
  const legLen = Math.round(ch * 0.55);
  for (let i = 0; i < legLen; i++) {
    const lx = cx + stroke + Math.round(i * 0.6);
    const ly = midY + i;
    for (let dx = 0; dx < stroke; dx++) set(lx + dx, ly, ACCENT);
  }

  // Draw "F" to the right of "R"
  const fx = cx + Math.round(size * 0.28);
  const fy = cy;

  // Vertical stem of F
  for (let y = fy; y < fy + ch; y++)
    for (let dx = 0; dx < stroke; dx++) set(fx + dx, y, ACCENT);

  // Top bar of F
  const fBarW = Math.round(size * 0.18);
  for (let x = fx; x < fx + fBarW; x++)
    for (let dy = 0; dy < stroke; dy++) set(x, fy + dy, ACCENT);

  // Middle bar of F (shorter)
  const fMidW = Math.round(fBarW * 0.75);
  const fMidY = fy + Math.round(ch * 0.45);
  for (let x = fx; x < fx + fMidW; x++)
    for (let dy = 0; dy < stroke; dy++) set(x, fMidY + dy, ACCENT);

  // Build PNG: RGBA rows with filter byte
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * rowSize + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA color type
  // compression, filter, interlace = 0

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [192, 512];
for (const size of sizes) {
  const buf = createIconPng(size);
  const out = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`✓ Created ${out} (${buf.length} bytes)`);
}
