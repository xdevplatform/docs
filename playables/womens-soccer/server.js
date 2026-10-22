'use strict';
// Tiny dependency-free server for the women's soccer playable.
//   GET /              lobby page (twitter:card = summary_large_image)
//   GET /r/:roomId     share URL (twitter:card = player, points at /play/:roomId)
//   GET /play/:roomId  the game, served with the X frame-ancestors CSP
//   GET /card.png      placeholder card image (generated at startup)
//   GET /healthz       health check

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
// Must be the public HTTPS origin in production (X rejects non-HTTPS player URLs).
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const TWITTER_SITE = process.env.TWITTER_SITE || '';
const PLAYER_SIZE = 480;
// LAB=1 enables ?lab=... toggles for A/B testing which requirements X actually enforces.
const LAB = process.env.LAB === '1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const FRAME_ANCESTORS =
  "frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com";

const ROOM_RE = /^[A-Za-z0-9_-]{1,32}$/;
const CODE_RE = /^[A-Za-z0-9_-]{0,32}$/;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function origin(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

function newRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

/* ---------- placeholder card image (pure-JS PNG, no deps) ---------- */

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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function makeCardPng(W = 960, H = 960) {
  const px = Buffer.alloc(W * H * 3);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  };
  // grass with mowing stripes
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const stripe = Math.floor(y / 80) % 2 === 0;
      set(x, y, stripe ? 46 : 40, stripe ? 152 : 140, stripe ? 80 : 72);
    }
  const disc = (cx, cy, rad, col) => {
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) set(cx + x, cy + y, ...col);
  };
  const ring = (cx, cy, rad, th, col) => {
    for (let y = -rad - th; y <= rad + th; y++)
      for (let x = -rad - th; x <= rad + th; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d >= rad - th / 2 && d <= rad + th / 2) set(cx + x, cy + y, ...col);
      }
  };
  const rect = (x0, y0, w, h, col) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, ...col);
  };
  const white = [245, 250, 245];
  rect(40, 40, W - 80, 10, white);
  rect(40, H - 50, W - 80, 10, white);
  rect(40, 40, 10, H - 80, white);
  rect(W - 50, 40, 10, H - 80, white);
  rect(40, H / 2 - 5, W - 80, 10, white);
  ring(W / 2, H / 2, 150, 10, white);
  rect(W / 2 - 200, 40, 400, 150, [0, 0, 0]);
  rect(W / 2 - 190, 40, 380, 140, [46, 152, 80]);
  rect(W / 2 - 200, 40, 400, 10, white);
  rect(W / 2 - 200, 40, 10, 150, white);
  rect(W / 2 + 190, 40, 10, 150, white);
  rect(W / 2 - 200, 180, 400, 10, white);
  // two stylised players (original art) and a ball
  const player = (cx, cy, jersey) => {
    disc(cx, cy + 6, 62, [20, 40, 30]);
    disc(cx, cy, 58, jersey);
    disc(cx, cy - 6, 30, [240, 200, 160]);
    disc(cx - 36, cy - 30, 16, [60, 36, 24]);
    disc(cx, cy - 20, 30, [60, 36, 24]);
    disc(cx, cy - 4, 26, [240, 200, 160]);
  };
  player(330, 620, [230, 70, 120]);
  player(640, 470, [50, 120, 230]);
  disc(480, 780, 46, [20, 20, 20]);
  disc(480, 778, 42, [252, 252, 252]);
  disc(480, 778, 14, [30, 30, 30]);

  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CARD_PNG = makeCardPng();

/* ---------- HTML ---------- */

function head({ title, description, image, url, card, extra = '', drop = [] }) {
  const has = (t) => !drop.includes(t);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="${card}">
${has('title') ? `<meta name="twitter:title" content="${esc(title)}">\n` : ''}${has('description') ? `<meta name="twitter:description" content="${esc(description)}">\n` : ''}${has('image') ? `<meta name="twitter:image" content="${esc(image)}">\n` : ''}${TWITTER_SITE ? `<meta name="twitter:site" content="${esc(TWITTER_SITE)}">\n` : ''}${extra}`;
}

function lobbyPage(req) {
  const o = origin(req);
  const room = newRoomId();
  return (
    head({
      title: "Pitch Perfect - Women's Soccer",
      description: 'A tiny 3v3 women\'s soccer game. Play it right here, or share a room link.',
      image: `${o}/card.png`,
      url: `${o}/`,
      card: 'summary_large_image',
    }) +
    `<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#10261a;color:#f3fff6;font:16px/1.5 system-ui,sans-serif}
main{max-width:460px;padding:24px;text-align:center}
h1{margin:0 0 8px;font-size:28px}
a.btn{display:inline-block;margin:6px;padding:12px 20px;border-radius:999px;background:#e64678;color:#fff;text-decoration:none;font-weight:700}
a.alt{background:#2f9a50}
code{background:#0006;padding:2px 6px;border-radius:4px}
</style></head>
<body><main>
<h1>Pitch Perfect</h1>
<p>3v3 women's soccer in a 480&times;480 box. Keyboard or touch. 90 seconds on the clock.</p>
<p><a class="btn" href="/play/${room}">Play now</a>
<a class="btn alt" href="/r/${room}">Share link (player card)</a></p>
<p><small>Share URL for X: <code>${esc(o)}/r/${room}</code></small></p>
</main></body></html>
`
  );
}

function sharePage(req, roomId, code, lab) {
  const o = origin(req);
  const qs = [];
  if (code) qs.push(`c=${encodeURIComponent(code)}`);
  if (lab.length) qs.push(`lab=${encodeURIComponent(lab.join(','))}`);
  let playUrl = `${o}/play/${encodeURIComponent(roomId)}${qs.length ? `?${qs.join('&')}` : ''}`;
  if (lab.includes('playerhttp')) playUrl = playUrl.replace(/^https:/, 'http:');
  const has = (t) => !lab.includes(t);
  const extra =
    (has('player') ? `<meta name="twitter:player" content="${esc(playUrl)}">\n` : '') +
    (has('width') ? `<meta name="twitter:player:width" content="${PLAYER_SIZE}">\n` : '') +
    (has('height') ? `<meta name="twitter:player:height" content="${PLAYER_SIZE}">\n` : '');
  return (
    head({
      title: "Pitch Perfect - Women's Soccer",
      description: 'Tap to play a 3v3 women\'s soccer match right in the timeline.',
      image: `${o}/card.png`,
      url: `${o}/r/${encodeURIComponent(roomId)}`,
      card: lab.includes('cardsummary') ? 'summary_large_image' : 'player',
      extra,
      drop: lab,
    }) +
    `</head>
<body style="font-family:system-ui;background:#10261a;color:#fff;text-align:center;padding:40px">
<h1>Pitch Perfect</h1>
<p>Room <code>${esc(roomId)}</code></p>
<p><a style="color:#ffd166" href="${esc(playUrl)}">Play in this tab</a></p>
</body></html>
`
  );
}

function playPage(req, roomId) {
  const o = origin(req);
  const html = fs.readFileSync(path.join(PUBLIC_DIR, 'game.html'), 'utf8');
  const meta =
    `<meta name="robots" content="noindex">\n` +
    `<meta property="og:image" content="${esc(o)}/card.png">\n`;
  return html.replace('<!--ROOM-->', `<script>window.ROOM=${JSON.stringify(roomId)};</script>\n${meta}`);
}

/* ---------- server ---------- */

const STATIC = {
  '/game.js': ['game.js', 'application/javascript; charset=utf-8'],
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...headers,
  });
  res.end(body);
}

function labFlags(url) {
  if (!LAB) return [];
  return (url.searchParams.get('lab') || '').split(',').filter((t) => /^[a-z]{2,16}$/.test(t));
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://x');
  } catch {
    return send(res, 400, 'bad request', { 'content-type': 'text/plain' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'method not allowed', { 'content-type': 'text/plain', allow: 'GET, HEAD' });
  }
  const p = url.pathname;
  const html = { 'content-type': 'text/html; charset=utf-8' };

  if (p === '/') return send(res, 200, lobbyPage(req), { ...html, 'cache-control': 'no-store' });

  let m;
  if ((m = p.match(/^\/r\/([^/]+)\/?$/))) {
    if (!ROOM_RE.test(m[1])) return send(res, 404, 'not found', { 'content-type': 'text/plain' });
    const code = url.searchParams.get('c') || '';
    return send(res, 200, sharePage(req, m[1], CODE_RE.test(code) ? code : '', labFlags(url)), {
      ...html,
      'cache-control': 'public, max-age=300',
    });
  }

  if ((m = p.match(/^\/play\/([^/]+)\/?$/))) {
    if (!ROOM_RE.test(m[1])) return send(res, 404, 'not found', { 'content-type': 'text/plain' });
    const lab = labFlags(url);
    const h = { ...html, 'cache-control': 'no-store' };
    if (!lab.includes('csp')) h['content-security-policy'] = lab.includes('cspself') ? "frame-ancestors 'self'" : FRAME_ANCESTORS;
    if (lab.includes('xfo')) h['x-frame-options'] = 'SAMEORIGIN';
    return send(res, 200, playPage(req, m[1]), h);
  }

  if (p === '/card.png') {
    return send(res, 200, CARD_PNG, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
  }

  if (p === '/favicon.ico') return send(res, 204, '', { 'cache-control': 'public, max-age=86400' });

  if (p === '/healthz') return send(res, 200, 'ok', { 'content-type': 'text/plain' });

  if (STATIC[p]) {
    const [file, type] = STATIC[p];
    return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, file)), {
      'content-type': type,
      'cache-control': 'no-cache',
      'content-security-policy': FRAME_ANCESTORS,
    });
  }

  send(res, 404, 'not found', { 'content-type': 'text/plain' });
});

server.listen(PORT, HOST, () => {
  console.log(`womens-soccer listening on http://${HOST}:${PORT}${PUBLIC_URL ? ` (public ${PUBLIC_URL})` : ''}`);
});
