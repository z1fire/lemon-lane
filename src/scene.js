// Canvas drawing: the location, weather, your stand and the customers.
// DayScene replays a simulated day; drawPreview() paints a still picture for the Stand tab.
import { LOCATIONS, DAY_MINUTES } from './data.js';

const H = 300;          // logical height; width follows the screen
const HORIZON = 168;
const STAND_Y = 232;    // feet line of the stand
const QUEUE_Y = 250;
const LANE_Y = 272;

const SKY = {
  heat:   ['#ffb347', '#ffe7a8'],
  sunny:  ['#48b6f5', '#c4ecff'],
  partly: ['#6fb7e6', '#d6eefb'],
  cloudy: ['#95a9ba', '#dde5ec'],
  rainy:  ['#6d7b89', '#aeb9c4'],
  storm:  ['#3b4452', '#6f7886'],
};
const SKIN = ['#f7d7bf', '#eab892', '#c98e62', '#9a6440', '#6b4128', '#f2c9a3'];
const HAIR = ['#2b1b10', '#5a3825', '#a0522d', '#e3b34c', '#141414', '#c8c8c8', '#d9773a', '#3a2a5c'];
const SHIRT = ['#ff6b6b', '#4ecdc4', '#ffd93d', '#6c5ce7', '#ff9f43', '#1dd1a1', '#54a0ff', '#ff6fb5', '#8e44ad', '#2ecc71', '#e17055', '#0abde3'];
const PANTS = ['#34495e', '#2c3e50', '#6d4c41', '#1e3799', '#57606f', '#b33939'];

// Small deterministic RNG so scenery and people look the same every frame.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const lerp = (a, b, t) => a + (b - a) * t;
const P = (r, arr) => arr[Math.floor(r() * arr.length)];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// ───────────────── Scenery ─────────────────

function drawSky(ctx, W, type) {
  const [a, b] = SKY[type];
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = a;
  ctx.fillRect(0, -400, W, 400);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 2);
}

function drawSun(ctx, W, type, t, oy = 0) {
  if (!['heat', 'sunny', 'partly'].includes(type)) return;
  const x = W * 0.86, y = Math.max(oy + 38, Math.min(46, HORIZON - 40)), r = type === 'heat' ? 30 : 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.15);
  ctx.fillStyle = type === 'heat' ? 'rgba(255,140,0,0.35)' : 'rgba(255,230,120,0.45)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(-5, r + 4); ctx.lineTo(0, r + 18); ctx.lineTo(5, r + 4); ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, r);
  g.addColorStop(0, '#fffbe0'); g.addColorStop(1, type === 'heat' ? '#ff9f1a' : '#ffd23f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 14 * s, 0, Math.PI * 2);
  ctx.arc(x + 16 * s, y - 8 * s, 17 * s, 0, Math.PI * 2);
  ctx.arc(x + 34 * s, y, 13 * s, 0, Math.PI * 2);
  ctx.arc(x + 17 * s, y + 5 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, W, type, t, oy = 0) {
  const top = Math.max(0, oy) + 14, span = Math.max(12, Math.min(70, HORIZON - 45 - top));
  const n = { heat: 0, sunny: 2, partly: 4, cloudy: 7, rainy: 8, storm: 9 }[type];
  const col = { sunny: '#ffffff', partly: '#ffffff', cloudy: '#eef2f5', rainy: '#c3ccd5', storm: '#59626f', heat: '#fff' }[type];
  const r = rng(99);
  for (let i = 0; i < n; i++) {
    const s = 0.8 + r() * 0.9;
    const speed = 3 + r() * 5;
    const span = W + 140;
    const x = ((r() * span + t * speed) % span) - 90;
    cloud(ctx, x, top + r() * span, s * (oy > 60 ? 0.75 : 1), col);
  }
}

function tree(ctx, x, y, s, r) {
  ctx.fillStyle = '#7a4b2a';
  ctx.fillRect(x - 3 * s, y - 26 * s, 6 * s, 26 * s);
  const greens = ['#2e9e4f', '#38b25b', '#27864a'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = greens[i];
    ctx.beginPath();
    ctx.arc(x + (i - 1) * 9 * s, y - 32 * s - (i === 1 ? 10 * s : 0), 14 * s + r() * 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function palm(ctx, x, y, s) {
  ctx.strokeStyle = '#9b6b3d'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8 * s, y - 35 * s, x + 4 * s, y - 70 * s); ctx.stroke();
  ctx.fillStyle = '#2fa35a';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.save(); ctx.translate(x + 4 * s, y - 70 * s); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(18 * s, 0, 20 * s, 5 * s, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function house(ctx, x, y, w, h, r) {
  const wall = P(r, ['#f6d6a8', '#ffe0e6', '#d7ecff', '#dff5d8', '#fff2c2', '#e8dcff']);
  const roof = P(r, ['#c0392b', '#8e5a3c', '#34495e', '#6c5ce7', '#d35400']);
  ctx.fillStyle = wall; ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath(); ctx.moveTo(x - 6, y - h); ctx.lineTo(x + w / 2, y - h - 28); ctx.lineTo(x + w + 6, y - h); ctx.fill();
  ctx.fillStyle = '#7fc8f8';
  ctx.fillRect(x + 8, y - h + 12, 14, 12); ctx.fillRect(x + w - 22, y - h + 12, 14, 12);
  ctx.fillStyle = shade(roof.startsWith('#') ? roof : '#8e5a3c', 0.8);
  ctx.fillRect(x + w / 2 - 7, y - 22, 14, 22);
}

function building(ctx, x, y, w, h, r) {
  const c = P(r, ['#5d6d7e', '#7f8c8d', '#34495e', '#4a6fa5', '#95a5a6', '#6c7a89']);
  ctx.fillStyle = c; ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y - h, 4, h);
  for (let wy = y - h + 8; wy < y - 10; wy += 12) {
    for (let wx = x + 5; wx < x + w - 8; wx += 10) {
      ctx.fillStyle = r() < 0.35 ? '#ffe9a3' : 'rgba(180,220,255,0.55)';
      ctx.fillRect(wx, wy, 6, 7);
    }
  }
}

function bgStreet(ctx, W, r) {
  ctx.fillStyle = '#7cc86b'; ctx.fillRect(0, HORIZON, W, 60);
  for (let x = -20; x < W + 20;) {
    const w = 62 + r() * 26, h = 42 + r() * 22;
    house(ctx, x, HORIZON + 22, w, h, r);
    if (r() < 0.6) tree(ctx, x + w + 12, HORIZON + 26, 0.8 + r() * 0.3, r);
    x += w + 26 + r() * 20;
  }
  ctx.fillStyle = '#6dbb5d'; ctx.fillRect(0, HORIZON + 22, W, 22);
  ctx.fillStyle = '#cfd4d8'; ctx.fillRect(0, 222, W, 62);
  ctx.strokeStyle = '#b5bcc2'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 222); ctx.lineTo(x - 10, 284); ctx.stroke(); }
  ctx.fillStyle = '#9aa3aa'; ctx.fillRect(0, 282, W, 4);
  ctx.fillStyle = '#4b5359'; ctx.fillRect(0, 286, W, 14);
  ctx.fillStyle = '#f5f5f5';
  for (let x = 10; x < W; x += 40) ctx.fillRect(x, 292, 20, 2);
}

function bgPark(ctx, W, r) {
  ctx.fillStyle = '#2f7d46';
  for (let x = -10; x < W + 20; x += 18) { ctx.beginPath(); ctx.arc(x, HORIZON + 2, 16 + r() * 10, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = '#6fcf5c'; ctx.fillRect(0, HORIZON, W, 132);
  ctx.fillStyle = '#61bf51';
  for (let i = 0; i < 40; i++) { ctx.fillRect(r() * W, HORIZON + 6 + r() * 120, 3, 2); }
  // pond
  ctx.fillStyle = '#5ab8e8';
  ctx.beginPath(); ctx.ellipse(W * 0.18, HORIZON + 30, 60, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(W * 0.18 - 20, HORIZON + 28, 22, 2);
  for (let i = 0; i < 6; i++) tree(ctx, (i + 0.5) * (W / 6) + r() * 30 - 15, HORIZON + 36 + r() * 10, 0.9 + r() * 0.5, r);
  // bench
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(W * 0.78, 208, 40, 5); ctx.fillRect(W * 0.78, 200, 40, 3);
  ctx.fillRect(W * 0.78 + 3, 213, 3, 9); ctx.fillRect(W * 0.78 + 34, 213, 3, 9);
  ctx.fillStyle = '#e9d3a5'; ctx.fillRect(0, 226, W, 58);
  ctx.fillStyle = '#dcc394'; ctx.fillRect(0, 226, W, 3); ctx.fillRect(0, 281, W, 3);
  ctx.fillStyle = '#6fcf5c'; ctx.fillRect(0, 284, W, 16);
}

function bgBeach(ctx, W, r) {
  ctx.fillStyle = '#2d9bd6'; ctx.fillRect(0, HORIZON - 30, W, 50);
  ctx.fillStyle = '#48b5ea'; ctx.fillRect(0, HORIZON - 30, W, 8);
  ctx.fillStyle = '#f3dea5'; ctx.fillRect(0, HORIZON + 18, W, 120);
  ctx.fillStyle = '#ead095';
  for (let i = 0; i < 50; i++) ctx.fillRect(r() * W, HORIZON + 22 + r() * 40, 2, 1);
  for (let i = 0; i < 4; i++) {
    const x = r() * W, y = HORIZON + 30 + r() * 14;
    ctx.fillStyle = P(r, ['#ff6b6b', '#4ecdc4', '#ffd93d', '#6c5ce7']);
    ctx.beginPath(); ctx.moveTo(x - 16, y - 18); ctx.quadraticCurveTo(x, y - 30, x + 16, y - 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 20, 2, 20);
  }
  palm(ctx, W * 0.07, 222, 1.0); palm(ctx, W * 0.93, 222, 1.15);
  ctx.fillStyle = '#b07a45'; ctx.fillRect(0, 224, W, 60);
  ctx.strokeStyle = '#8f5f33'; ctx.lineWidth = 1.5;
  for (let y = 234; y < 284; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#f3dea5'; ctx.fillRect(0, 284, W, 16);
}

function bgDowntown(ctx, W, r) {
  for (let x = -10; x < W + 10;) {
    const w = 34 + r() * 40, h = 80 + r() * 90;
    building(ctx, x, HORIZON + 30, w, h, r);
    x += w + 2;
  }
  ctx.fillStyle = '#44494f'; ctx.fillRect(0, HORIZON + 30, W, 26);
  ctx.fillStyle = '#f1c40f';
  for (let x = 0; x < W; x += 36) ctx.fillRect(x, HORIZON + 42, 18, 2);
  ctx.fillStyle = '#b8bec4'; ctx.fillRect(0, 224, W, 62);
  ctx.strokeStyle = '#a5acb3';
  for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 224); ctx.lineTo(x, 286); ctx.stroke(); }
  ctx.fillStyle = '#3d4247'; ctx.fillRect(0, 286, W, 14);
  // lamp posts & a tree planter
  for (const fx of [0.1, 0.9]) {
    ctx.fillStyle = '#2d3436'; ctx.fillRect(W * fx, 150, 3, 76);
    ctx.fillStyle = '#ffeaa7'; ctx.beginPath(); ctx.arc(W * fx + 1.5, 150, 5, 0, Math.PI * 2); ctx.fill();
  }
}

function bgStadium(ctx, W, r) {
  ctx.fillStyle = '#6fcf5c'; ctx.fillRect(0, HORIZON, W, 60);
  const cx = W * 0.5;
  ctx.fillStyle = '#b2bec3';
  ctx.beginPath(); ctx.ellipse(cx, HORIZON + 10, Math.min(W * 0.42, 260), 58, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#dfe6e9'; ctx.fillRect(cx - Math.min(W * 0.42, 260), HORIZON + 8, Math.min(W * 0.84, 520), 20);
  ctx.fillStyle = '#636e72';
  for (let i = 0; i < 14; i++) ctx.fillRect(cx - Math.min(W * 0.4, 248) + i * Math.min(W * 0.058, 36), HORIZON + 12, 10, 14);
  for (const fx of [-0.44, 0.44]) {
    const x = cx + Math.min(W * Math.abs(fx), 270) * Math.sign(fx);
    ctx.fillStyle = '#2d3436'; ctx.fillRect(x - 2, HORIZON - 70, 4, 100);
    ctx.fillStyle = '#fff9d6'; ctx.fillRect(x - 12, HORIZON - 78, 24, 10);
  }
  const flags = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];
  for (let i = 0; i < 5; i++) {
    const x = cx - 120 + i * 60;
    ctx.fillStyle = '#555'; ctx.fillRect(x, HORIZON - 64, 2, 18);
    ctx.fillStyle = flags[i % 4]; ctx.fillRect(x + 2, HORIZON - 64, 12, 7);
  }
  ctx.fillStyle = '#7d858c'; ctx.fillRect(0, 222, W, 64);
  ctx.fillStyle = '#fff';
  for (let x = 6; x < W; x += 30) ctx.fillRect(x, 226, 2, 12);
  ctx.fillStyle = '#5b6268'; ctx.fillRect(0, 286, W, 14);
}

function bgFair(ctx, W, r) {
  ctx.fillStyle = '#7ed36b'; ctx.fillRect(0, HORIZON, W, 60);
  for (let i = 0; i < 4; i++) {
    const x = W * (0.08 + i * 0.26) + (i > 1 ? 60 : 0), y = HORIZON + 30;
    if (x > W * 0.28 && x < W * 0.48) continue;
    const c = P(r, ['#e74c3c', '#9b59b6', '#3498db', '#e67e22']);
    for (let s = 0; s < 6; s++) {
      ctx.fillStyle = s % 2 ? '#fff' : c;
      ctx.fillRect(x + s * 8, y - 30, 8, 30);
    }
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 4, y - 30); ctx.lineTo(x + 24, y - 52); ctx.lineTo(x + 52, y - 30); ctx.fill();
  }
  ctx.fillStyle = '#e6c88f'; ctx.fillRect(0, 224, W, 62);
  ctx.fillStyle = '#7ed36b'; ctx.fillRect(0, 286, W, 14);
}

const BG = { street: bgStreet, park: bgPark, beach: bgBeach, downtown: bgDowntown, stadium: bgStadium, fair: bgFair };

// Things in the background that move.
function drawAnimatedBg(ctx, W, loc, t) {
  if (loc === 'beach') {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, HORIZON + 17 + Math.sin(x * 0.05 + t * 2) * 2);
    ctx.stroke();
  }
  if (loc === 'fair') {
    const cx = Math.min(W * 0.38, W - 70), cy = HORIZON - 12, R = 62;
    ctx.strokeStyle = '#5d6d7e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 30, HORIZON + 30); ctx.lineTo(cx, cy); ctx.lineTo(cx + 30, HORIZON + 30); ctx.stroke();
    ctx.strokeStyle = '#ff6fb5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const cols = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#ff6fb5'];
    for (let i = 0; i < 8; i++) {
      const a = t * 0.3 + (i / 8) * Math.PI * 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      ctx.strokeStyle = 'rgba(93,109,126,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = cols[i]; rr(ctx, x - 7, y, 14, 10, 3); ctx.fill();
    }
    // string lights
    for (let x = 0; x < W; x += 16) {
      const on = (Math.floor(t * 3) + x / 16) % 3 < 2;
      ctx.fillStyle = on ? ['#ffeaa7', '#ff7675', '#74b9ff'][(x / 16) % 3] : '#999';
      ctx.beginPath(); ctx.arc(x, 214 + Math.sin(x * 0.07) * 4, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ───────────────── Stand ─────────────────

function kidSeller(ctx, x, y, shirt, hat, t, k = 1) {
  const bob = Math.sin(t * 3) * 0.8;
  ctx.fillStyle = shirt; rr(ctx, x - 9 * k, y - 8 * k + bob, 18 * k, 14 * k, 5 * k); ctx.fill();
  ctx.fillStyle = '#f2c9a3';
  ctx.beginPath(); ctx.arc(x, y - 16 * k + bob, 9 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - 3 * k, y - 17 * k + bob, 1.2 * k, 0, 7); ctx.arc(x + 3 * k, y - 17 * k + bob, 1.2 * k, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a4b2a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y - 14 * k + bob, 3 * k, 0.2, Math.PI - 0.2); ctx.stroke();
  if (hat) {
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.arc(x, y - 19 * k + bob, 9.5 * k, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 2 * k, y - 20 * k + bob, 13 * k, 3 * k);
  } else {
    ctx.fillStyle = '#5a3825';
    ctx.beginPath(); ctx.arc(x, y - 19 * k + bob, 9 * k, Math.PI, 0); ctx.fill();
  }
}

function pitcher(ctx, x, y, level = 0.7) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  rr(ctx, x - 6, y - 16, 12, 16, 2); ctx.fill();
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(x - 5, y - 1 - 14 * level, 10, 14 * level);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x + 7, y - 9, 4, -1.2, 1.2); ctx.stroke();
}

function priceTag(ctx, x, y, price, big) {
  const txt = price < 1 ? `${Math.round(price * 100)}¢` : `$${price.toFixed(2)}`;
  ctx.font = `700 ${big ? 12 : 10}px Fredoka, sans-serif`;
  const w = ctx.measureText(txt).width + 10;
  ctx.fillStyle = '#fff'; rr(ctx, x - w / 2, y - 9, w, 15, 4); ctx.fill();
  ctx.strokeStyle = '#e17055'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#d63031'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y - 1);
}

function awning(ctx, x, y, w, h, c1, c2, n = 7) {
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? c2 : c1;
    ctx.beginPath();
    ctx.moveTo(x + i * sw, y); ctx.lineTo(x + (i + 1) * sw, y);
    ctx.lineTo(x + (i + 1) * sw, y + h); ctx.arc(x + (i + 0.5) * sw, y + h, sw / 2, 0, Math.PI); ctx.closePath();
    ctx.fill();
  }
}

// Returns the counter-front x where customers are served.
function drawStand(ctx, s, sx, t, opts = {}) {
  const y = STAND_Y;
  const tier = s.tier;
  const price = s.price;
  const name = (s.name ? `${s.name}'s` : 'LEMONADE');
  const helper = s.staff.helper, manager = s.staff.manager;
  const level = opts.level != null ? opts.level : 0.7;

  // Umbrella (only for the small stands; bigger ones have their own roof).
  if (s.upgrades.umbrella && tier < 2) {
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx + 46, y); ctx.lineTo(sx + 46, y - 78); ctx.stroke();
    ctx.fillStyle = '#ff7675';
    ctx.beginPath(); ctx.moveTo(sx + 6, y - 66); ctx.quadraticCurveTo(sx + 46, y - 100, sx + 86, y - 66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(sx + 32, y - 71); ctx.quadraticCurveTo(sx + 46, y - 98, sx + 60, y - 71); ctx.closePath(); ctx.fill();
  }

  if (tier === 0) {
    // Crate stand
    kidSeller(ctx, sx, y - 36, '#ff9f43', '#e74c3c', t);
    if (helper) kidSeller(ctx, sx + 22, y - 34, '#54a0ff', null, t + 1, 0.9);
    ctx.fillStyle = '#c8894a'; ctx.fillRect(sx - 36, y - 38, 72, 38);
    ctx.strokeStyle = '#9c6531'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sx - 36, y - 38 + i * 13 + 6); ctx.lineTo(sx + 36, y - 38 + i * 13 + 6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(sx, y - 38); ctx.lineTo(sx, y); ctx.stroke();
    ctx.fillStyle = '#fffdf5'; ctx.fillRect(sx - 40, y - 42, 80, 6);
    // hand-made sign
    ctx.fillStyle = '#fffbe6'; rr(ctx, sx - 30, y - 32, 60, 18, 3); ctx.fill();
    ctx.fillStyle = '#e1a800'; ctx.font = '700 9px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LEMONADE', sx, y - 23);
    pitcher(ctx, sx - 20, y - 42, level);
    priceTag(ctx, sx + 34, y - 50, price);
  } else if (tier === 1) {
    // Wooden stand with striped roof
    ctx.fillStyle = '#b07a45'; ctx.fillRect(sx - 44, y - 92, 5, 92); ctx.fillRect(sx + 39, y - 92, 5, 92);
    kidSeller(ctx, sx - 4, y - 44, '#ff9f43', '#e74c3c', t);
    if (helper) kidSeller(ctx, sx + 20, y - 42, '#54a0ff', null, t + 1, 0.9);
    if (manager) kidSeller(ctx, sx - 26, y - 42, '#2d3436', null, t + 2, 0.95);
    awning(ctx, sx - 50, y - 100, 100, 14, '#ffd32a', '#ffffff');
    ctx.fillStyle = '#d4a15e'; ctx.fillRect(sx - 44, y - 46, 88, 46);
    ctx.fillStyle = '#c08a4a';
    for (let i = 0; i < 4; i++) ctx.fillRect(sx - 44, y - 46 + i * 12 + 10, 88, 2);
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx - 48, y - 50, 96, 6);
    ctx.fillStyle = '#fff8dc'; rr(ctx, sx - 34, y - 38, 68, 20, 4); ctx.fill();
    ctx.fillStyle = '#e1a800'; ctx.font = '700 10px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍋 ' + fit(ctx, name, 50), sx, y - 28);
    pitcher(ctx, sx - 28, y - 50, level); pitcher(ctx, sx + 30, y - 50, Math.max(0, level - 0.2));
    priceTag(ctx, sx, y - 112, price, true);
  } else if (tier === 2) {
    // Cart with umbrella
    ctx.strokeStyle = '#636e72'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx, y - 50); ctx.lineTo(sx, y - 118); ctx.stroke();
    const cols = ['#ffd32a', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % 2];
      ctx.beginPath(); ctx.moveTo(sx, y - 124);
      ctx.lineTo(sx - 64 + i * 16, y - 94); ctx.lineTo(sx - 48 + i * 16, y - 94); ctx.closePath(); ctx.fill();
    }
    kidSeller(ctx, sx - 6, y - 50, '#ff9f43', '#e74c3c', t);
    if (helper) kidSeller(ctx, sx + 22, y - 48, '#54a0ff', null, t + 1, 0.9);
    if (manager) kidSeller(ctx, sx - 30, y - 48, '#2d3436', null, t + 2, 0.95);
    ctx.fillStyle = '#fdcb6e'; rr(ctx, sx - 52, y - 56, 104, 44, 8); ctx.fill();
    ctx.fillStyle = '#ffeaa7'; rr(ctx, sx - 52, y - 56, 104, 10, 6); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, sx - 38, y - 42, 76, 20, 6); ctx.fill();
    ctx.fillStyle = '#e17055'; ctx.font = '700 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍋 ' + fit(ctx, name, 56), sx, y - 32);
    for (const wx of [-34, 34]) {
      ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(sx + wx, y - 10, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#b2bec3'; ctx.beginPath(); ctx.arc(sx + wx, y - 10, 4, 0, 7); ctx.fill();
    }
    pitcher(ctx, sx - 34, y - 56, level); pitcher(ctx, sx + 36, y - 56, Math.max(0, level - 0.2));
    priceTag(ctx, sx + 60, y - 70, price, true);
  } else if (tier === 3) {
    // Food truck
    ctx.fillStyle = '#ffd32a'; rr(ctx, sx - 78, y - 96, 150, 82, 10); ctx.fill();
    ctx.fillStyle = '#ffeaa7'; rr(ctx, sx + 66, y - 70, 32, 56, 8); ctx.fill();
    ctx.fillStyle = '#74b9ff'; rr(ctx, sx + 74, y - 64, 20, 22, 4); ctx.fill();
    ctx.fillStyle = '#2d3436'; rr(ctx, sx - 58, y - 80, 84, 40, 4); ctx.fill();
    kidSeller(ctx, sx - 30, y - 44, '#ff9f43', '#e74c3c', t);
    if (helper) kidSeller(ctx, sx - 4, y - 44, '#54a0ff', null, t + 1, 0.9);
    if (manager) kidSeller(ctx, sx + 16, y - 44, '#636e72', null, t + 2, 0.9);
    ctx.fillStyle = '#f5f6fa'; ctx.fillRect(sx - 62, y - 42, 92, 6);
    awning(ctx, sx - 64, y - 88, 96, 10, '#e17055', '#fff', 8);
    ctx.fillStyle = '#e17055'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍋 ' + fit(ctx, name, 110), sx - 4, y - 26);
    for (const wx of [-50, 50]) {
      ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.arc(sx + wx, y - 12, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#dfe6e9'; ctx.beginPath(); ctx.arc(sx + wx, y - 12, 5, 0, 7); ctx.fill();
    }
    pitcher(ctx, sx - 50, y - 42, level); pitcher(ctx, sx + 20, y - 42, Math.max(0, level - 0.2));
    priceTag(ctx, sx - 16, y - 108, price, true);
  } else {
    // Café
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(sx - 90, y - 118, 180, 118);
    ctx.fillStyle = '#e17055'; ctx.fillRect(sx - 94, y - 124, 188, 16);
    ctx.fillStyle = '#fff'; ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍋 ' + fit(ctx, name === 'LEMONADE' ? 'LEMON CAFÉ' : name + ' Café', 150), sx, y - 116);
    awning(ctx, sx - 92, y - 108, 184, 16, '#ffd32a', '#ffffff', 10);
    ctx.fillStyle = '#81ecec'; rr(ctx, sx - 78, y - 82, 56, 40, 4); ctx.fill();
    ctx.fillStyle = '#2d3436'; rr(ctx, sx - 12, y - 82, 70, 44, 4); ctx.fill();
    kidSeller(ctx, sx + 10, y - 44, '#ff9f43', '#e74c3c', t);
    if (helper) kidSeller(ctx, sx + 36, y - 44, '#54a0ff', null, t + 1, 0.9);
    if (manager) kidSeller(ctx, sx - 58, y - 48, '#2d3436', null, t + 2, 0.9);
    ctx.fillStyle = '#b07a45'; ctx.fillRect(sx - 16, y - 42, 78, 7);
    ctx.fillStyle = '#d4a15e'; ctx.fillRect(sx - 12, y - 35, 70, 35);
    ctx.fillStyle = '#6c5ce7'; rr(ctx, sx + 64, y - 70, 20, 70, 3); ctx.fill();
    pitcher(ctx, sx - 4, y - 42, level); pitcher(ctx, sx + 50, y - 42, Math.max(0, level - 0.2));
    priceTag(ctx, sx - 50, y - 30, price, true);
    // tables
    for (const tx of [-120, 118]) {
      ctx.fillStyle = '#dfe6e9'; ctx.fillRect(sx + tx - 12, y - 20, 24, 3); ctx.fillRect(sx + tx - 1.5, y - 20, 3, 20);
      ctx.fillStyle = '#ff7675'; ctx.beginPath(); ctx.moveTo(sx + tx - 16, y - 38); ctx.quadraticCurveTo(sx + tx, y - 52, sx + tx + 16, y - 38); ctx.fill();
      ctx.fillStyle = '#636e72'; ctx.fillRect(sx + tx - 1, y - 40, 2, 20);
    }
  }

  // Sign boards
  if (s.upgrades.sign) {
    const bx = sx - (tier >= 3 ? 110 : 76);
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath(); ctx.moveTo(bx - 14, y); ctx.lineTo(bx, y - 38); ctx.lineTo(bx + 14, y); ctx.fill();
    ctx.fillStyle = '#2d3436'; rr(ctx, bx - 13, y - 36, 26, 26, 3); ctx.fill();
    ctx.fillStyle = '#ffeaa7'; ctx.font = '700 8px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ICE', bx, y - 28); ctx.fillText('COLD', bx, y - 20);
    ctx.fillText('🍋', bx, y - 13);
  }
  if (s.upgrades.neon) {
    const glow = 0.6 + Math.sin(t * 4) * 0.25;
    ctx.save();
    ctx.shadowColor = '#ff6fb5'; ctx.shadowBlur = 10 * glow;
    ctx.fillStyle = `rgba(255,111,181,${glow})`;
    ctx.font = '700 13px Fredoka, sans-serif'; ctx.textAlign = 'center';
    const ny = tier >= 4 ? y - 140 : tier === 3 ? y - 124 : tier === 2 ? y - 136 : y - 128;
    ctx.fillText('★ OPEN ★', sx, ny);
    ctx.restore();
  }
  if (s.upgrades.cooler) {
    const cx = sx + (tier >= 3 ? 104 : 58);
    ctx.fillStyle = s.upgrades.freezer ? '#dfe6e9' : '#0984e3'; rr(ctx, cx - 12, y - 18, 24, 18, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 12, y - 18, 24, 4);
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🧊', cx, y - 6);
  }
  if (s.upgrades.speaker) {
    const px = sx + (tier >= 3 ? 104 : 58), py = y - (s.upgrades.cooler ? 18 : 0);
    ctx.fillStyle = '#2d3436'; rr(ctx, px - 7, py - 16, 14, 16, 2); ctx.fill();
    ctx.fillStyle = '#636e72'; ctx.beginPath(); ctx.arc(px, py - 8, 4, 0, 7); ctx.fill();
    if (opts.live) {
      ctx.fillStyle = '#6c5ce7'; ctx.font = '10px sans-serif';
      for (let i = 0; i < 2; i++) {
        const ph = (t * 0.8 + i * 0.5) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.fillText(i ? '♪' : '♫', px + 6 + ph * 10 + i * 4, py - 18 - ph * 22);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Promoter waving a sign
  if (s.staff.promoter) {
    const px = Math.max(30, sx - (tier >= 3 ? 170 : 140)), py = STAND_Y + 6;
    const wave = Math.sin(t * 4) * 0.25;
    drawPerson(ctx, px, py, { skin: '#c98e62', hair: '#141414', shirt: '#e84393', pants: '#2c3e50', kid: false, style: 1 }, 1, 0, false, 3, false);
    ctx.save(); ctx.translate(px + 6, py - 40); ctx.rotate(wave);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(-1, -30, 2, 30);
    ctx.fillStyle = '#ffeaa7'; rr(ctx, -20, -46, 40, 18, 3); ctx.fill();
    ctx.fillStyle = '#d63031'; ctx.font = '700 7px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LEMONADE', 0, -40); ctx.fillText('THIS WAY →', 0, -33);
    ctx.restore();
  }
  return sx - (tier >= 3 ? 16 : 10);
}

function fit(ctx, text, w) {
  if (ctx.measureText(text).width <= w) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1);
  return t + '…';
}

// ───────────────── People ─────────────────

export function lookFrom(n, weather) {
  const r = rng(n);
  const kid = r() < 0.35;
  return {
    kid,
    skin: P(r, SKIN),
    hair: P(r, HAIR),
    shirt: P(r, SHIRT),
    pants: P(r, PANTS),
    style: Math.floor(r() * 4),
    hat: (weather === 'sunny' || weather === 'heat') && r() < 0.3 ? P(r, SHIRT) : null,
    umbrella: (weather === 'rainy' || weather === 'storm') && r() < 0.65 ? P(r, ['#e74c3c', '#2980b9', '#8e44ad', '#16a085', '#f39c12']) : null,
    speed: 0.85 + r() * 0.3,
    lane: r(),
    dir: r() < 0.5 ? 1 : -1,
  };
}

function drawPerson(ctx, x, y, L, dir, phase, walking, mood, cup) {
  const k = (L.kid ? 0.76 : 1) * (0.9 + (y - 230) / 400);
  const swing = walking ? Math.sin(phase) * 5 * k : 0;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath(); ctx.ellipse(x, y, 9 * k, 2.5 * k, 0, 0, 7); ctx.fill();
  // legs
  ctx.strokeStyle = L.pants; ctx.lineWidth = 4 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 2.5 * k, y - 17 * k); ctx.lineTo(x - 2.5 * k + swing, y - 1);
  ctx.moveTo(x + 2.5 * k, y - 17 * k); ctx.lineTo(x + 2.5 * k - swing, y - 1); ctx.stroke();
  // body
  ctx.fillStyle = L.shirt; rr(ctx, x - 7.5 * k, y - 37 * k, 15 * k, 22 * k, 5 * k); ctx.fill();
  // arms
  ctx.strokeStyle = L.skin; ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.moveTo(x - 6 * k, y - 33 * k); ctx.lineTo(x - 7 * k - swing * 0.6, y - 20 * k);
  if (cup) { ctx.moveTo(x + 6 * k, y - 33 * k); ctx.lineTo(x + 10 * k * dir, y - 27 * k); }
  else { ctx.moveTo(x + 6 * k, y - 33 * k); ctx.lineTo(x + 7 * k + swing * 0.6, y - 20 * k); }
  ctx.stroke();
  if (cup) {
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 9 * k * dir - 2.5 * k, y - 34 * k, 5 * k, 7 * k);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(x + 9 * k * dir - 2 * k, y - 33 * k, 4 * k, 3 * k);
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 9 * k * dir, y - 34 * k); ctx.lineTo(x + 10 * k * dir, y - 38 * k); ctx.stroke();
  }
  // head
  const hy = y - 45 * k;
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(x, hy, 8 * k, 0, 7); ctx.fill();
  // hair
  ctx.fillStyle = L.hair;
  if (L.style === 0) { ctx.beginPath(); ctx.arc(x, hy - 1 * k, 8.4 * k, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
  else if (L.style === 1) { ctx.beginPath(); ctx.arc(x, hy, 8.6 * k, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 8.6 * k, hy, 3 * k, 9 * k); ctx.fillRect(x + 5.6 * k, hy, 3 * k, 9 * k); }
  else if (L.style === 2) { ctx.beginPath(); ctx.arc(x, hy - 2 * k, 8 * k, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(x - dir * 6 * k, hy - 7 * k, 4 * k, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(x + i * 2.4 * k - 2 * k, hy - 5 * k); ctx.lineTo(x + i * 2.4 * k, hy - 11 * k); ctx.lineTo(x + i * 2.4 * k + 2 * k, hy - 5 * k); } ctx.fill(); ctx.beginPath(); ctx.arc(x, hy - 2 * k, 8 * k, Math.PI, 0); ctx.fill(); }
  if (L.hat) {
    ctx.fillStyle = L.hat; ctx.beginPath(); ctx.arc(x, hy - 3 * k, 8.6 * k, Math.PI, 0); ctx.fill();
    ctx.fillRect(dir > 0 ? x : x - 12 * k, hy - 4 * k, 12 * k, 2.5 * k);
  }
  // face
  ctx.fillStyle = '#222';
  const ex = dir * 2 * k;
  ctx.beginPath(); ctx.arc(x + ex - 2.8 * k, hy, 1.1 * k, 0, 7); ctx.arc(x + ex + 2.8 * k, hy, 1.1 * k, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b2d1a'; ctx.lineWidth = 1.1;
  ctx.beginPath();
  if (mood >= 2) ctx.arc(x + ex, hy + 2.5 * k, 2.8 * k, 0.15, Math.PI - 0.15);
  else if (mood === 1) { ctx.moveTo(x + ex - 2.2 * k, hy + 4 * k); ctx.lineTo(x + ex + 2.2 * k, hy + 4 * k); }
  else ctx.arc(x + ex, hy + 6.2 * k, 2.6 * k, Math.PI + 0.3, -0.3);
  ctx.stroke();
  if (mood === 3) { ctx.fillStyle = 'rgba(255,120,120,0.45)'; ctx.beginPath(); ctx.arc(x + ex - 5 * k, hy + 2.5 * k, 1.8 * k, 0, 7); ctx.arc(x + ex + 5 * k, hy + 2.5 * k, 1.8 * k, 0, 7); ctx.fill(); }
  // umbrella
  if (L.umbrella) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + 4 * k, y - 28 * k); ctx.lineTo(x + 4 * k, y - 64 * k); ctx.stroke();
    ctx.fillStyle = L.umbrella;
    ctx.beginPath(); ctx.moveTo(x - 14 * k, y - 60 * k); ctx.quadraticCurveTo(x + 4 * k, y - 80 * k, x + 22 * k, y - 60 * k); ctx.closePath(); ctx.fill();
  }
}

function bubble(ctx, x, y, text, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 10px Fredoka, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const bx = Math.max(4, x - w / 2);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  rr(ctx, bx, y - 18, w, 16, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 3, y - 2.5); ctx.lineTo(x, y + 3); ctx.lineTo(x + 3, y - 2.5); ctx.fill();
  ctx.fillStyle = '#2d3436'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 6, y - 9.5);
  ctx.restore();
}

function drawRain(ctx, W, type, t, oy = 0) {
  if (type !== 'rainy' && type !== 'storm') return;
  const n = type === 'storm' ? 110 : 70;
  ctx.strokeStyle = 'rgba(200,220,255,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath();
  const r = rng(5);
  for (let i = 0; i < n; i++) {
    const x0 = r() * (W + 60), sp = 260 + r() * 120;
    const y = oy + ((r() * H + t * sp) % (H - oy + 20)) - 10;
    const x = (x0 - t * 40) % (W + 60);
    const xx = x < 0 ? x + W + 60 : x;
    ctx.moveTo(xx, y); ctx.lineTo(xx - 3, y + 9);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,60,90,0.12)'; ctx.fillRect(0, oy, W, H - oy);
  if (type === 'storm' && (t % 7) < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, oy, W, H - oy); }
}

function heatHaze(ctx, W, type, oy = 0) {
  if (type !== 'heat') return;
  ctx.fillStyle = 'rgba(255,170,60,0.08)'; ctx.fillRect(0, oy, W, H - oy);
}

// ───────────────── Setup helpers ─────────────────

// Fit the world to the canvas. `top` crops sky on wide screens; narrow (portrait) screens
// fit the width instead and show extra sky above. oy = logical y at the top edge.
function fitCanvas(canvas, top = 0) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const cw = Math.max(1, Math.round(rect.width * dpr)), ch = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  let scale = ch / (H - top);
  let W = cw / scale;
  if (W < 330) { scale = cw / 330; W = 330; }
  const oy = H - ch / scale;
  return { scale, W, oy, cw, ch };
}
const view = (ctx, f) => ctx.setTransform(f.scale, 0, 0, f.scale, 0, -f.oy * f.scale);

function makeBg(locId, f) {
  const W = f.W;
  const c = document.createElement('canvas');
  c.width = f.cw; c.height = f.ch;
  const ctx = c.getContext('2d');
  view(ctx, f);
  const r = rng(seedOf(locId) + Math.round(W));
  (BG[locId] || bgStreet)(ctx, W, r);
  return c;
}

// Where to draw the stand on screens of any width.
const standX = (W) => Math.round(W * (W < 460 ? 0.56 : 0.52));

// Still picture for the Stand tab header.
export function drawPreview(canvas, s, weatherType) {
  const f = fitCanvas(canvas, 95);
  const { W, oy } = f;
  const ctx = canvas.getContext('2d');
  view(ctx, f);
  const t = 3;
  drawSky(ctx, W, weatherType);
  drawSun(ctx, W, weatherType, t, oy);
  drawClouds(ctx, W, weatherType, t * 8, oy);
  const r = rng(seedOf(s.location) + Math.round(W));
  (BG[s.location] || bgStreet)(ctx, W, r);
  drawAnimatedBg(ctx, W, s.location, t);
  drawStand(ctx, s, standX(W), t, { level: 0.8 });
  // a couple of friendly passers-by
  const L1 = lookFrom(12345, weatherType), L2 = lookFrom(98765, weatherType);
  drawPerson(ctx, W * 0.18, LANE_Y, L1, 1, 1, true, 2, false);
  drawPerson(ctx, W * 0.88, LANE_Y + 6, L2, -1, 2, true, 3, true);
  drawRain(ctx, W, weatherType, t, oy);
  heatHaze(ctx, W, weatherType, oy);
}

// ───────────────── The live day ─────────────────

export class DayScene {
  constructor(canvas, s, result, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.s = s;
    this.r = result;
    this.hooks = hooks;
    this.speed = s.settings.speed || 1;
    this.min = result.start;           // current sim minute
    this.t = 0;                        // seconds of animation (for idle anims)
    this.agents = [];
    this.floaters = [];
    this.queue = [];
    this.money = 0;
    this.served = 0;
    this.cupsLeft = null;
    this.events = result.customers.slice();
    this.evIdx = 0;
    this.done = false;
    this.weather = result.weather.type;
    this.visibleCap = 46;
    this.onResize = () => { this.layout(); };
    window.addEventListener('resize', this.onResize);
    this.layout();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  layout() {
    const f = fitCanvas(this.canvas, 55);
    this.f = f;
    this.scale = f.scale; this.W = f.W; this.oy = f.oy;
    this.sx = standX(this.W);
    this.counterX = this.sx - 10;
    this.bg = makeBg(this.s.location, f);
    this.walkV = this.W / 36; // logical units per sim minute
  }

  setSpeed(x) { this.speed = x; }

  finish() {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    if (this.hooks.onDone) this.hooks.onDone();
  }

  destroy() {
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }

  spawn(c) {
    const L = lookFrom(c.look, this.weather);
    const interesting = c.kind !== 'pass';
    const passing = this.agents.filter((a) => a.c.kind === 'pass').length;
    if (!interesting && (this.agents.length > this.visibleCap * 0.6 || passing > 14)) return;
    if (interesting && this.agents.length > this.visibleCap) { this.settle(c); return; }
    const dir = L.dir;
    const x0 = dir > 0 ? -20 : this.W + 20;
    const laneY = LANE_Y + (L.lane - 0.5) * 18;
    const a = { c, L, dir, x: x0, y: laneY, laneY, phase: Math.random() * 6, state: 'walk', cup: false, mood: 2, say: null, sayT: 0 };
    if (interesting) {
      // start far enough away to arrive at the stand right on time
      const target = this.sx - 40;
      const dist = Math.abs(target - x0);
      a.appear = c.t - dist / (this.walkV * L.speed);
    } else {
      a.appear = c.t - (this.W / 2 + 20) / (this.walkV * L.speed);
    }
    this.agents.push(a);
  }

  // Customers we don't draw still count.
  settle(c) {
    if (c.kind === 'buy') {
      this.pending = this.pending || [];
      this.pending.push(c);
    }
  }

  say(a, text, mood) {
    if (mood != null) a.mood = mood;
    const talking = this.agents.filter((x) => x.sayT > 0).length;
    if (talking < 3) { a.say = text; a.sayT = 2.2; }
    if (this.hooks.onSay) this.hooks.onSay(text, a.c);
  }

  update(dt) {
    const dMin = dt * 8 * this.speed;
    this.min += dMin;
    this.t += dt;
    const lookahead = this.min + 60;
    while (this.evIdx < this.events.length && this.events[this.evIdx].t <= lookahead) {
      const c = this.events[this.evIdx++];
      if (c.kind === 'incident') { this.incident = c; continue; }
      this.spawn(c);
    }
    if (this.incident && this.min >= this.incident.t) {
      if (this.hooks.onIncident) this.hooks.onIncident(this.incident.text);
      this.floaters.push({ x: this.sx, y: STAND_Y - 70, text: '💦', life: 1.5, big: true });
      this.incident = null;
    }
    // Money from customers we didn't draw.
    if (this.pending) {
      this.pending = this.pending.filter((c) => {
        if (this.min < c.end) return true;
        this.pay(c, false);
        return false;
      });
    }

    const qx = (i) => this.sx - 42 - i * Math.max(10, Math.min(19, 220 / Math.max(1, this.queue.length)));
    const waiting = this.agents.filter((a) => a.state === 'queue');
    waiting.sort((p, q) => p.c.t - q.c.t);
    this.queue = waiting;
    waiting.forEach((a, i) => { a.slot = i; });

    for (const a of this.agents) {
      if (this.min < a.appear) { a.hidden = true; continue; }
      a.hidden = false;
      const c = a.c;
      const v = this.walkV * a.L.speed * dMin;
      let tx = null, ty = null;

      if (c.kind === 'pass') {
        tx = a.dir > 0 ? this.W + 30 : -30; ty = a.laneY;
      } else if (a.state === 'walk') {
        if (c.kind === 'pricey' || c.kind === 'soldout') {
          tx = this.sx - 34; ty = QUEUE_Y + 8;
          if (Math.abs(a.x - tx) < 3) {
            a.state = 'look'; a.until = this.min + 5;
            this.say(a, c.say, c.kind === 'pricey' ? 1 : 0);
          }
        } else {
          tx = qx(waiting.length); ty = QUEUE_Y;
          if (Math.abs(a.x - tx) < 4 || this.min >= c.t) { a.state = 'queue'; }
        }
      }
      if (a.state === 'look') {
        tx = a.x; ty = a.y;
        if (this.min >= a.until) a.state = 'leave';
      }
      if (a.state === 'queue') {
        tx = qx(a.slot || 0); ty = QUEUE_Y + ((a.slot || 0) % 2) * 3;
        if (c.kind === 'line' && this.min >= c.leave) { a.state = 'leave'; this.say(a, c.say, 0); }
        if (c.kind === 'buy' && this.min >= c.start) a.state = 'serve';
      }
      if (a.state === 'serve') {
        tx = this.counterX; ty = QUEUE_Y - 2;
        if (this.min >= c.end) {
          a.state = 'leave'; a.cup = true;
          this.pay(c, true, a);
          this.say(a, c.say, c.mood);
        }
      }
      if (a.state === 'leave') {
        tx = a.dir > 0 ? this.W + 30 : -30; ty = a.laneY;
        if (c.kind !== 'buy' && a.leaveDir == null) a.leaveDir = a.dir;
      }
      // move
      if (tx != null) {
        const dx = tx - a.x, dy = ty - a.y;
        const d = Math.hypot(dx, dy);
        const step = a.state === 'serve' ? v * 2.5 : v;
        if (d > 0.5) {
          const m = Math.min(1, step / d);
          a.x += dx * m; a.y += dy * m;
          a.walking = true;
          if (Math.abs(dx) > 0.3) a.face = dx > 0 ? 1 : -1;
          a.phase += dMin * 1.6;
        } else a.walking = false;
      }
      if (a.sayT > 0) a.sayT -= dt;
      if ((a.state === 'leave' || c.kind === 'pass') && (a.x < -25 || a.x > this.W + 25)) a.gone = true;
    }
    this.agents = this.agents.filter((a) => !a.gone);
    for (const f of this.floaters) { f.life -= dt; f.y -= dt * 22; }
    this.floaters = this.floaters.filter((f) => f.life > 0);

    if (this.min >= 480 && !this.pending?.length) {
      const busy = this.agents.some((a) => !a.hidden && a.c.kind !== 'pass' && a.state !== 'leave');
      if (!busy || this.min > 540) {
        this.endT = (this.endT || 0) + dt;
        if (this.endT > 1.2) this.finish();
      }
    }
  }

  pay(c, visible, a) {
    const amt = (c.paid || 0) + (c.tip || 0);
    this.money += amt;
    this.served++;
    if (visible && a) {
      this.floaters.push({ x: this.counterX, y: QUEUE_Y - 58, text: c.paid === 0 ? 'FREE' : `+$${amt.toFixed(2)}`, life: 1.2 });
      if (c.tip) this.floaters.push({ x: this.counterX + 16, y: QUEUE_Y - 72, text: '🪙', life: 1.2 });
    }
    if (this.hooks.onSale) this.hooks.onSale(c, visible);
  }

  draw() {
    const { ctx, W, oy } = this;
    view(ctx, this.f);
    const wt = this.weather;
    drawSky(ctx, W, wt);
    drawSun(ctx, W, wt, this.t, oy);
    drawClouds(ctx, W, wt, this.t, oy);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    view(ctx, this.f);
    drawAnimatedBg(ctx, W, this.s.location, this.t);

    const served = this.served;
    const total = Math.max(1, (this.r.pitchers || 1) * 8);
    const level = this.r.soldOut && this.min >= (this.r.soldOutAt || 1e9) ? 0 : Math.max(0.15, 1 - (served % 10) / 12);
    void total;
    this.counterX = drawStand(ctx, this.s, this.sx, this.t, { level, live: true });

    const vis = this.agents.filter((a) => !a.hidden).sort((p, q) => p.y - q.y);
    for (const a of vis) drawPerson(ctx, a.x, a.y, a.L, a.face || a.dir, a.phase, a.walking, a.mood, a.cup);
    for (const a of vis) if (a.sayT > 0 && a.say) bubble(ctx, a.x, a.y - (a.L.kid ? 50 : 62), a.say, Math.min(1, a.sayT * 2));

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `700 ${f.big ? 28 : 12}px Fredoka, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = '#20bf6b'; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    drawRain(ctx, W, wt, this.t, oy);
    heatHaze(ctx, W, wt, oy);
    // late-afternoon glow
    const late = Math.max(0, (this.min - 360) / 120);
    if (late > 0) { ctx.fillStyle = `rgba(255,120,40,${Math.min(0.18, late * 0.18)})`; ctx.fillRect(0, oy, W, H - oy); }
  }

  loop(now) {
    if (this.done) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    if (!this.done) {
      this.draw();
      if (this.hooks.onTick) this.hooks.onTick(this);
      this.raf = requestAnimationFrame(this.loop);
    }
  }
}

export { lerp, DAY_MINUTES, LOCATIONS };
