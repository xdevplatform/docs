#!/usr/bin/env node
'use strict';
// Validates a share URL against the "player card recipe" in the README.
//   node scripts/check.js https://example.com/r/abc123
//   node scripts/check.js http://localhost:3000/r/abc123 --allow-http
// Fetches as Twitterbot and as a browser, then follows twitter:player and twitter:image.

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const allowHttp = args.includes('--allow-http');
if (!target) {
  console.error('usage: node scripts/check.js <share-url> [--allow-http]');
  process.exit(2);
}

const UA_BOT = 'Twitterbot/1.0';
const UA_BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

let failed = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failed++; console.log(`  FAIL  ${m}`); };
const warn = (m) => console.log(`  WARN  ${m}`);
const check = (cond, pass, fail) => (cond ? ok(pass) : bad(fail));

function metas(html) {
  const out = {};
  const re = /<meta\s+[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const key = /(?:name|property)\s*=\s*"([^"]+)"/i.exec(tag);
    const val = /content\s*=\s*"([^"]*)"/i.exec(tag);
    if (key && val) out[key[1].toLowerCase()] = val[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  }
  return out;
}

async function get(url, ua) {
  return fetch(url, { redirect: 'manual', headers: { 'user-agent': ua, accept: 'text/html,*/*' } });
}

async function main() {
  console.log(`Share URL: ${target}`);
  const u = new URL(target);
  check(u.protocol === 'https:' || allowHttp, 'share URL is HTTPS', 'share URL is not HTTPS (use --allow-http for local only)');

  const bot = await get(target, UA_BOT);
  const html = await bot.text();
  check(bot.status === 200, 'share URL returns 200 to Twitterbot without redirect', `share URL returned ${bot.status} to Twitterbot (redirects/blocks are not safe)`);
  check(/text\/html/i.test(bot.headers.get('content-type') || ''), 'share URL is text/html', `share URL content-type is ${bot.headers.get('content-type')}`);

  const browserHtml = await (await get(target, UA_BROWSER)).text();
  const mb = metas(browserHtml);
  const m = metas(html);
  check(mb['twitter:player'] === m['twitter:player'] && mb['twitter:card'] === m['twitter:card'], 'same card tags for browser and Twitterbot UA', 'card tags differ between browser and Twitterbot UA');

  console.log('\nCard tags');
  check(m['twitter:card'] === 'player', 'twitter:card = player', `twitter:card is ${JSON.stringify(m['twitter:card'])}`);
  check(!!m['twitter:title'], 'twitter:title present', 'twitter:title missing');
  check(!!m['twitter:description'], 'twitter:description present', 'twitter:description missing');
  const img = m['twitter:image'];
  check(!!img && (/^https:\/\//.test(img) || (allowHttp && /^http:\/\//.test(img))), 'twitter:image is absolute HTTPS', `twitter:image is ${JSON.stringify(img)}`);
  const player = m['twitter:player'];
  check(!!player && (/^https:\/\//.test(player) || (allowHttp && /^http:\/\//.test(player))), 'twitter:player is absolute HTTPS', `twitter:player is ${JSON.stringify(player)}`);
  const w = Number(m['twitter:player:width']), h = Number(m['twitter:player:height']);
  check(Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0, `player size ${w}x${h}`, `twitter:player:width/height invalid (${m['twitter:player:width']}, ${m['twitter:player:height']})`);
  if (player && player === target) bad('twitter:player must differ from the share URL');

  if (img) {
    console.log('\nImage');
    const r = await fetch(img, { redirect: 'manual', headers: { 'user-agent': UA_BOT } });
    const buf = Buffer.from(await r.arrayBuffer());
    check(r.status === 200, 'image returns 200', `image returned ${r.status}`);
    check(/^image\/(png|jpeg|webp|gif)/i.test(r.headers.get('content-type') || ''), `image content-type ${r.headers.get('content-type')}`, `image content-type ${r.headers.get('content-type')}`);
    check(buf.length < 5 * 1024 * 1024, `image size ${(buf.length / 1024).toFixed(0)} KB (< 5 MB)`, `image too large (${buf.length} bytes)`);
  }

  if (player) {
    console.log('\nPlayer page');
    const r = await get(player, UA_BROWSER);
    const body = await r.text();
    check(r.status === 200, 'player URL returns 200 without redirect', `player URL returned ${r.status}`);
    check(/text\/html/i.test(r.headers.get('content-type') || ''), 'player is text/html', `player content-type ${r.headers.get('content-type')}`);
    const xfo = r.headers.get('x-frame-options');
    check(!xfo, 'no X-Frame-Options header', `X-Frame-Options present: ${xfo}`);
    const csp = r.headers.get('content-security-policy') || '';
    const fa = /frame-ancestors([^;]*)/i.exec(csp);
    if (!fa) warn('no CSP frame-ancestors (framing allowed everywhere; X may or may not require the allowlist)');
    else {
      const v = fa[1];
      const allowsX = /https:\/\/x\.com|https:\/\/\*\.x\.com|\*(?!\.)/.test(v);
      const allowsTw = /https:\/\/twitter\.com|https:\/\/\*\.twitter\.com|\*(?!\.)/.test(v);
      check(allowsX && allowsTw, `frame-ancestors allows x.com and twitter.com (${v.trim()})`, `frame-ancestors does not allow x.com/twitter.com (${v.trim()})`);
    }
    check(!/http:\/\//.test(body.replace(/http:\/\/www\.w3\.org/g, '')) || allowHttp, 'no http:// subresources (mixed content)', 'player page references http:// URLs');
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
