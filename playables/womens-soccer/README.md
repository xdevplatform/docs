# Pitch Perfect - women's soccer playable for X

A tiny 3v3 women's soccer game (original procedural art, no external assets, no dependencies) packaged so that a
link to it can render as an **inline playable in an X post** using the `twitter:card = player` mechanism, the same
way `tweetcraft.jai.vin` does.

- 480x480 canvas, keyboard (WASD/arrows, hold Space to charge a kick, K to swap player) and touch (floating stick, KICK, SWAP)
- 90 second match vs. a simple CPU. Room id seeds the CPU kit colour; shared-room multiplayer is **not** implemented (stretch goal).
- Zero npm dependencies. Node >= 18.

## Run

```bash
cd playables/womens-soccer
npm start                 # http://localhost:3000
LAB=1 npm start           # also enables ?lab=... A/B toggles (see "Experiments")
PUBLIC_URL=https://soccer.example.com PORT=8080 npm start   # production
```

Env: `PORT` (3000, server.js only), `HOST` (0.0.0.0), `PUBLIC_URL` (public HTTPS origin used in every absolute URL; if unset it is
derived from `Host` / `X-Forwarded-*`), `TWITTER_SITE` (optional `@handle` for `twitter:site`), `LAB=1`.

| Route | Purpose |
|---|---|
| `GET /` | Lobby. `twitter:card = summary_large_image` only (like the Tweetcraft lobby). |
| `GET /r/:roomId[?c=code]` | **The URL you put in the post.** Carries the `player` card tags. |
| `GET /play/:roomId[?c=code]` | The game. Iframed by X. Sends `content-security-policy: frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com`, no `X-Frame-Options`. |
| `GET /card.png` | Placeholder card image (960x960, generated at startup, ~10 KB). Replace with real art. |
| `GET /healthz` | Health check. |

## Deploy

### Vercel (recommended; zero config)

`vercel.json` rewrites `/`, `/r/:id`, `/play/:id`, `/card.png`, `/healthz`, `/favicon.ico` to one serverless function
(`api/index.js` -> `lib/app.js`, original path passed as `?__path=`). `public/game.js` is served as a static file.
Absolute URLs come from the request host (`x-forwarded-host/proto`, always `https` on Vercel); set `PUBLIC_URL` only if
you front it with a custom domain that rewrites the Host header.

Option A: dashboard. Import the GitHub repo in Vercel, add env var `LAB=1` (Production), deploy.

Option B: CLI (needs a token from https://vercel.com/account/tokens):

```bash
VERCEL_TOKEN=... ./scripts/deploy-vercel.sh                 # LAB mode on; checks https://womens-soccer-playable.vercel.app
VERCEL_TOKEN=... VERCEL_SCOPE=my-team ./scripts/deploy-vercel.sh --no-lab my-project-name
```

**Deployment Protection:** if the project has Vercel Authentication on, Twitterbot gets a login wall and X will show no
card. Post the stable production alias (`https://<project>.vercel.app`) and make sure
Settings -> Deployment Protection allows public access to production (or disable it). Check with
`node scripts/check.js https://<project>.vercel.app/r/a1`.

### Any Node host

Needs a public **HTTPS** origin with a valid certificate and `PUBLIC_URL` set (or a proxy sending
`X-Forwarded-Proto: https` and `X-Forwarded-Host`). If you front it with Cloudflare (as Tweetcraft does), make sure
bot protection / "Under Attack" mode / WAF rules do **not** challenge `Twitterbot` on `/r/*`, `/play/*`, `/card.png`.

```bash
PUBLIC_URL=https://soccer.example.com PORT=8080 node server.js
node scripts/check.js https://soccer.example.com/r/test123      # validates the recipe below
```

### GitHub

```bash
./scripts/publish-github.sh dianalaurag/womens-soccer-playable   # needs `gh auth login` as that account
```

## Player Card recipe (what the server emits)

**Status: this is the working hypothesis, replicated from the Tweetcraft setup as described to us, not a tested X
requirement list.** X's own public docs no longer document Player Cards (see `docs/player-card-findings.md` in the
project store), and we could not reach `tweetcraft.jai.vin` from our sandbox to read its source. We also could not
post to X from the build environment, so **nothing below has been verified to render on X yet**.

Per the hypothesis (X renders `player` cards for HTTPS domains that were never approved), the share page needs:

1. **Share URL** (`/r/:roomId`): HTTPS, `200` with no redirect, `text/html`, same HTML for `Twitterbot` and browsers,
   not blocked by a bot wall. This is the URL in the post text.
2. Meta tags on that page:
   ```html
   <meta name="twitter:card" content="player">
   <meta name="twitter:title" content="...">
   <meta name="twitter:description" content="...">
   <meta name="twitter:image" content="https://HOST/card.png">          <!-- absolute HTTPS, PNG/JPG, < 5 MB -->
   <meta name="twitter:player" content="https://HOST/play/ROOM?c=CODE">  <!-- absolute HTTPS, different URL from the share page -->
   <meta name="twitter:player:width" content="480">
   <meta name="twitter:player:height" content="480">
   ```
   (`og:*` mirrors are included too; `twitter:site` only if `TWITTER_SITE` is set.)
3. **Player URL** (`/play/:roomId`): HTTPS, `200` with no redirect, `text/html`, **no `X-Frame-Options`**, and a CSP
   `frame-ancestors` that lists `https://x.com https://*.x.com https://twitter.com https://*.twitter.com`
   (plus `'self'`). Any mixed content (http subresources) is avoided; the game uses no external requests.
4. The lobby (`/`) stays `summary_large_image` so a bare-domain link gets a normal image card.
5. Game page is a normal browser game in a 480x480 square: canvas scales with `min(100vw,100vh)`, touch events with
   `touch-action:none`, audio only after first user gesture.

`node scripts/check.js <share-url>` asserts 1-3 (fetching as Twitterbot and as a browser, following the image and
player URLs). Use `--allow-http` for localhost only.

### What was verified locally

- Meta tags, 200s, no redirects, no `X-Frame-Options`, CSP header: `curl` + `scripts/check.js` (all pass).
- CSP is actually enforced by a browser: headless Chrome with `x.com` mapped to a local TLS host page frames `/play/*`
  successfully; the same page served as `evil.test` is blocked by `frame-ancestors`
  (`media/womens-soccer/iframe-embedded-in-x-origin.png` in the project store).
- Gameplay, keyboard + touch input, CPU scoring, anti-stall logic, no console errors (Puppeteer + Chrome 156).

### What is NOT verified

- That X renders this as an inline player for an unapproved domain. Needs one real post from an HTTPS deployment.
- Which of the tags/headers above X actually enforces (all could be necessary or only some). Use the experiments below.

## Experiments (find the minimal requirement set)

Start with `LAB=1`. Each experiment is just a different share URL (post each one, or check the card preview in the
composer). `lab` tokens are carried into the `twitter:player` URL, so play-page toggles work too. Change one thing at
a time and use a fresh `roomId` each time (X caches card scrapes per URL).

| Share URL | What it tests |
|---|---|
| `/r/a1` | Baseline (full recipe) |
| `/r/a2?lab=width,height` | Are `twitter:player:width/height` required? |
| `/r/a3?lab=image` | Is `twitter:image` required for the player to render? |
| `/r/a4?lab=title,description` | Are title/description required? |
| `/r/a5?lab=playerhttp` | Does X reject a non-HTTPS `twitter:player`? (expect yes) |
| `/r/a6?lab=csp` | Is the `frame-ancestors` header required, or is its absence OK? |
| `/r/a7?lab=cspself` | `frame-ancestors 'self'` only: does X refuse to show the player? |
| `/r/a8?lab=xfo` | `X-Frame-Options: SAMEORIGIN` on the player (expect blocked) |
| `/r/a9?lab=cardsummary` | Control: `summary_large_image` only |

Also try the same recipe on a second, unrelated domain (never contacted X) to confirm domain approval is not involved.

## Approval / allowlisting steps

Per X (a team member), `tweetcraft.jai.vin` was **not** approved or allowlisted, so no approval step is part of the
plan. Historically (2014-2022 documentation, now removed from docs.x.com) Player Cards required the domain to be
approved via the Card Validator's "Request Approval" button. **That flow could not be verified as current**: the
validator (`cards-dev.x.com/validator`) now redirects to the X login page for logged-out users and has been reported
as no longer rendering previews since 2022. If a post made from a deployed copy of this server shows only a plain
image card, then run the experiments above first, and only then ask X (Developer Community forum / your X contact)
whether the domain needs to be enabled.

## Fallbacks if the player does not render

1. The share link still renders as a large-image card (`twitter:image`), and tapping opens `/play/:roomId` in X's
   in-app browser as a normal web game (no embedding needed).
2. Post `/` (lobby, `summary_large_image`) instead of `/r/...`.

## Layout

```
api/index.js         Vercel function entry (re-exports lib/app.js handler)
lib/app.js           routes, card tags, CSP, LAB toggles, generated card image
server.js            local/any-Node entry (http.createServer + listen)
views/game.html      game page template served at /play/:roomId
public/game.js       the game (canvas 2D, input, AI, rendering); static on Vercel
scripts/check.js     recipe validator for a share URL
scripts/deploy-vercel.sh, scripts/publish-github.sh
vercel.json          rewrites + function config
```
