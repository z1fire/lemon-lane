// Generates the web + Android launcher icons (a smiling lemon slice), rendered in pure Node.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG_TOP = hex('#ffe680'), BG_BOT = hex('#ffc21a');
const RIND = hex('#f2a900'), PITH = hex('#fffbe6'), FLESH = hex('#ffe44d'), FLESH2 = hex('#fff27a'), SEP = hex('#fffde8');
const LEAF = hex('#35b35a'), LEAF_D = hex('#22863f'), INK = hex('#6b3f00'), CHEEK = hex('#ff8a7a');

// Colour of one point in unit space (0..1). Returns [r,g,b,a] or null for transparent.
function sample(u, v, { background, shape, scale }) {
  let col = null;
  if (background) {
    let inside;
    if (shape === 'circle') inside = Math.hypot(u - 0.5, v - 0.5) <= 0.5;
    else if (shape === 'square') inside = true;
    else {
      const r = 0.2, cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
      inside = Math.hypot(u - cx, v - cy) <= r;
    }
    if (inside) col = [...BG_TOP.map((c, i) => c + (BG_BOT[i] - c) * v), 255];
  }
  // lemon slice, centred and scaled
  const x = (u - 0.5) / scale, y = (v - 0.53) / scale;
  const d = Math.hypot(x, y);
  // leaf on top right
  const lx = x - 0.16, ly = y + 0.42;
  const ang = -0.6, rx = lx * Math.cos(ang) - ly * Math.sin(ang), ry = lx * Math.sin(ang) + ly * Math.cos(ang);
  if ((rx / 0.17) ** 2 + (ry / 0.08) ** 2 <= 1) col = [...(Math.abs(ry) < 0.012 ? LEAF_D : LEAF), 255];
  if (d <= 0.4) {
    let c;
    if (d > 0.36) c = RIND;
    else if (d > 0.32) c = PITH;
    else {
      const a = Math.atan2(y, x);
      const seg = ((a / (Math.PI * 2)) * 10 + 10) % 1;
      const edge = Math.min(seg, 1 - seg) * (Math.PI * 2 / 10) * d;
      c = edge < 0.012 || d < 0.03 ? SEP : d > 0.2 ? FLESH : FLESH2;
    }
    // face
    const eye = (ex) => Math.hypot(x - ex, y + 0.05) < 0.038;
    const smile = Math.abs(Math.hypot(x, y + 0.02) - 0.13) < 0.018 && y > 0.04;
    const cheek = Math.hypot(Math.abs(x) - 0.19, y - 0.06) < 0.045;
    if (eye(-0.1) || eye(0.1) || smile) c = INK;
    else if (cheek) c = c.map((v2, i) => Math.round(v2 * 0.5 + CHEEK[i] * 0.5));
    // highlight dots in eyes
    if (Math.hypot(x + 0.088, y + 0.063) < 0.012 || Math.hypot(x - 0.112, y + 0.063) < 0.012) c = [255, 255, 255];
    col = [...c, 255];
  }
  return col;
}

function render(size, opts) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, opts);
        if (c) { r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3]; }
      }
      const i = (py * size + px) * 4;
      if (a) { buf[i] = r / a; buf[i + 1] = g / a; buf[i + 2] = b / a; buf[i + 3] = a / (SS * SS); }
    }
  }
  return png(size, buf);
}

function write(rel, data) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
  console.log('wrote', rel);
}

write('public/icon-192.png', render(192, { background: true, shape: 'rounded', scale: 1 }));
write('public/icon-512.png', render(512, { background: true, shape: 'square', scale: 0.85 }));

const res = path.join('android', 'app', 'src', 'main', 'res');
if (fs.existsSync(path.join(root, res))) {
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    write(`${res}/mipmap-${d}/ic_launcher.png`, render(Math.round(48 * k), { background: true, shape: 'rounded', scale: 1 }));
    write(`${res}/mipmap-${d}/ic_launcher_round.png`, render(Math.round(48 * k), { background: true, shape: 'circle', scale: 0.95 }));
    // Adaptive icon foreground: 108dp canvas, keep the art inside the 66dp safe zone.
    write(`${res}/mipmap-${d}/ic_launcher_foreground.png`, render(Math.round(108 * k), { background: false, scale: 0.62 }));
  }
}
