# T-Rex — Portfolio & Watchlist Desk

A private, installable web app for Indian (NSE/BSE) investors: watchlist with tags & conviction,
multi-client Demat holdings with P&L, aggregated exposure, follow-ups, news, signals, and price
alerts (in-app + email + phone push). All personal data stays in your browser; only stock symbols
are sent to the free price/news functions.

## One-click deploy (recommended — enables 24/7 alerts)

1. Push this folder to a **public GitHub repo** (these files at the repo root).
2. Edit the button URL below to point at your repo, then click it:

   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/YOUR_REPO)

   Netlify will prompt for the environment variables (all optional — skip to use just free prices).
3. Open your new site → it works immediately with **free Yahoo prices** (no key).

### Environment variables (set in the deploy prompt, or later in Site configuration → Environment variables)
| Variable | Purpose |
|---|---|
| `SYNC_SECRET` | Any long random string. Enables 24/7 alerts. Paste the **same** value into the app: Settings → 24/7 cloud alerts. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Phone push. Copy from **VAPID-KEYS.txt** (generated for you). |
| `RESEND_API_KEY` (+ optional `RESEND_FROM`) | Email alerts. Free key from resend.com. |

After setting variables, **redeploy** (Deploys → Trigger deploy).

## Deploy from the command line instead
```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

## After deploy — turn on alerts
1. Install the app: Chrome address-bar **install** icon, or **Install app** in the sidebar (Android: Add to Home screen; **iPhone: Add to Home Screen — required for push on iOS**).
2. In the app → **Settings → 24/7 cloud alerts**: paste your `SYNC_SECRET`, tick **Enable**, **Save & sync**, then **Enable phone push**.
3. Add alerts on the **Price alerts** tab. Test email via **Settings → Send test email**.

## What's free here
Netlify hosting, Scheduled Functions & Blobs; Yahoo prices & Google News; Resend email (free tier);
Web Push (no service cost). See **DEPLOY.md** for full details and the cron schedule.

> Data note: holdings/clients live in each browser's localStorage. Only your alert list + email +
> push subscription are stored server-side (Netlify Blobs) so the 24/7 checker can run when the app is closed.
