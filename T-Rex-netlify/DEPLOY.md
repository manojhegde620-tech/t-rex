# Deploy T-Rex to Netlify — FREE live prices, no API key needed

This folder is ready to deploy. By default it fetches **free** NSE/BSE prices from **Yahoo Finance**
through your own server-side function — so **you do not need any API key**.

## What's in here
```
netlify-deploy/
├─ index.html                     ← the T-Rex app (prices go through your function)
├─ netlify.toml                   ← tells Netlify where the function is
└─ netlify/functions/price.js     ← fetches Yahoo Finance server-side (free, no key)
```

## Deploy (about 2 minutes)
1. Go to **app.netlify.com → Add new site → Deploy manually**.
2. Drag this whole **`netlify-deploy`** folder onto the drop zone.
3. Netlify gives you a URL like `https://your-name.netlify.app`. **That's it — no key, no env vars.**

(Or connect a Git repo with these files — same result.)

## Use it
Open your Netlify URL, then in the app:
- **Settings → Price provider** is already **"Netlify function"** — nothing to paste.
- **Symbol suffix:** leave **blank** for NSE (the function adds `.NS`). For a BSE-listed name, add the
  symbol with suffix **`.BO`** (e.g. set suffix `.BO`), or just type the symbol and it will fall back to BSE.
- Click **Refresh prices**.

Quick test in your browser:
`https://your-site.netlify.app/.netlify/functions/price?symbol=RELIANCE`
→ should return `{"price": …, "source": "yahoo"}`.

## About the free Yahoo route
- No key, no cost, covers NSE (`.NS`) and BSE (`.BO`). Prices are last-traded / lightly delayed — fine
  for a swing/portfolio watchlist, not for tick-by-tick trading.
- It's an unofficial endpoint (no formal SLA); if it ever rate-limits, just wait and refresh, or switch
  to a keyed provider below.

## Optional — use a keyed provider instead
The function automatically prefers a key if you set one in **Netlify → Site configuration →
Environment variables** (then redeploy):
- `TWELVEDATA_API_KEY` — note: Twelve Data includes **NSE/BSE only on paid plans** (~$29/mo).
- `ALPHAVANTAGE_API_KEY` — free but ~25 calls/day and mostly `.BSE` symbols.
If neither is set, it uses free Yahoo.

## Privacy
All client/holdings data stays only in each visitor's browser (localStorage). Only stock **symbols**
are sent to the function. No API key is stored in the page.

## Install as an app (PWA)
Once hosted on Netlify (HTTPS), T-Rex is installable:
- **Chrome (laptop):** an **install icon** appears at the right of the address bar, or use the
  **"Install app"** button in the app's sidebar → it opens in its own window like a native app.
- **Android Chrome:** menu → **Add to Home screen / Install app**.
- **iPhone Safari:** Share → **Add to Home Screen**.

It uses the T-Rex logo as the app icon, opens standalone (no browser chrome), and works offline
for everything except live-price refresh. (Installability requires the HTTPS Netlify URL — it won't
prompt from a local file.)

## New features (News, Signals, Price alerts)
These use extra free functions already included — no keys needed except optional email:
- **Signals tab** → "Scan now": flags 52-week breakouts/lows, RSI oversold/overbought, volume spikes, and target proximity (free Yahoo data via `series` function).
- **News tab** → "Load / refresh news": latest headlines per stock (free Google News RSS via `news` function).
- **Price alerts tab**: add multiple alerts (Price ≥/≤, day % change, RSI). While the app/PWA is open they’re checked on a timer and fire a **browser notification + sound**. Click **Enable notifications** once.

### Optional: email alerts (Resend, free)
1. Get a free key at **resend.com** → API Keys.
2. Netlify → **Site configuration → Environment variables** → add `RESEND_API_KEY` (and optionally `RESEND_FROM` like `T-Rex <alerts@yourdomain>`), then redeploy.
3. In the app: **Settings → Alerts & notifications** → enter your email → **Send test email** to verify. Then tick "Email" on any alert.
   (Without a verified domain, Resend sends from a shared test address to your own account email — fine for personal use.)

> Alerts/news/signals fire only while the app is open (or running as the installed PWA). 24/7 alerts when the app is fully closed need a scheduled backend — ask if you want that added.

## 24/7 alerts when the app is CLOSED (free — needs Git deploy)
This uses a Netlify **Scheduled Function** + **Netlify Blobs** (both free) to check your alerts every
~15 min during market hours and **email** you even when T-Rex isn't open. Because it has a dependency
(`@netlify/blobs`), it must be deployed via **Git** or the **Netlify CLI** (a drag-drop won't install it).

### One-time setup
1. Put this folder in a **GitHub repo** (these files at the repo root), then in Netlify:
   **Add new site → Import from Git →** pick the repo → Deploy. (Build command: none; publish dir: `.`)
   *Or* use the CLI: `npm i -g netlify-cli` then `netlify deploy --build --prod` from this folder.
2. Netlify → **Site configuration → Environment variables**, add:
   - `SYNC_SECRET` = any long random string (you'll paste the same value in the app)
   - `RESEND_API_KEY` = your free Resend key (for the emails)
   - `RESEND_FROM` = optional, e.g. `T-Rex Alerts <alerts@yourdomain>`
   Then **redeploy**.
3. In the app: **Settings → 24/7 cloud alerts** → paste the same `SYNC_SECRET`, tick **Enable**, click
   **Save & sync**. Your alerts + email are now stored server-side.

### How it behaves
- The scheduled function (`check-alerts-cron`) runs `*/15 3-10 * * 1-5` UTC (≈ NSE market hours, Mon–Fri),
  checks each active alert against free Yahoo prices, and emails you when one newly triggers (re-arms when
  it clears). Change the cron in `netlify/functions/check-alerts-cron.mjs` if you want a different window.
- Whenever you add/edit/remove alerts in the app (with cloud enabled), they re-sync automatically.
- App-open notifications + sound still work as before; the cloud job adds email that works when closed.
- Everything here is within Netlify's free tier and Resend's free email tier.

> Note: push notifications to a closed phone (instead of email) are also possible but need Web-Push/VAPID
> setup — ask if you want that added on top of email.

## Phone push notifications (closed app) — free
On a NEW trigger, the scheduled checker sends **both** an email and a **Web Push** notification to your
phone/desktop (whichever you've set up). Push works when the app is fully closed:
- **Android / desktop Chrome:** works once you've installed the PWA and enabled push.
- **iPhone:** you must **Add to Home Screen** first (iOS only allows web push for installed PWAs), then enable push.

### Setup
1. Deploy via Git/CLI (see above) so dependencies (`@netlify/blobs`, `web-push`) install.
2. Set env vars from **VAPID-KEYS.txt**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (plus
   `SYNC_SECRET`, and `RESEND_API_KEY` for email). Redeploy.
3. In the app → **Settings → 24/7 cloud alerts** → paste `SYNC_SECRET` → **Save & sync** → **Enable phone push**
   (grant the notification permission). Your subscription is stored server-side.
4. Add alerts. The cron checks every ~15 min during market hours and pushes/emails on triggers.

Dead push subscriptions are pruned automatically. To stop push, clear the app's notification permission
in the browser/OS settings.
