// 24/7 alert checker — runs on a schedule even when the app is closed.
// Reads synced alerts from Netlify Blobs, checks free Yahoo prices, and on a NEW trigger sends:
//   • a Web Push notification to your phone/desktop (if VAPID keys are set), and
//   • an email (if RESEND_API_KEY is set).
// Re-arms an alert when its condition clears.
//
// Netlify env vars:
//   SYNC_SECRET        (same value the app uses)
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT   (for push)   -- from VAPID-KEYS.txt
//   RESEND_API_KEY / RESEND_FROM                            (for email, optional)
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

export const config = { schedule: "*/15 3-10 * * 1-5" }; // ~every 15 min, NSE hours, Mon–Fri (UTC)

export default async () => {
  const store = getStore("trex");
  const cfg = await store.get("config", { type:"json" });
  if (!cfg || !Array.isArray(cfg.alerts) || !cfg.alerts.length) return new Response("no config");

  const active = cfg.alerts.filter(a => a.active);
  if (!active.length) return new Response("no active alerts");

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "T-Rex Alerts <onboarding@resend.dev>";
  const vapPub = process.env.VAPID_PUBLIC_KEY, vapPriv = process.env.VAPID_PRIVATE_KEY;
  const vapSub = process.env.VAPID_SUBJECT || "mailto:alerts@example.com";
  const pushOn = !!(vapPub && vapPriv);
  if (pushOn) webpush.setVapidDetails(vapSub, vapPub, vapPriv);

  const suffix = cfg.suffix || "";
  const syms = [...new Set(active.map(a => a.symbol))];
  const data = {};
  for (const s of syms) { try { data[s] = await fetchSeries(s, suffix); } catch (e) {} }

  const fired = [];
  let changed = false;
  for (const a of active) {
    const d = data[a.symbol]; if (!d) continue;
    const price = d.price, prev = d.prevClose;
    const dayPct = (price != null && prev) ? (price - prev) / prev * 100 : null;
    const rsi = rsi14(d.closes);
    const met = alertMet(a, price, dayPct, rsi);
    if (met && !a.triggered) { a.triggered = true; a.lastTriggered = Date.now(); changed = true; fired.push({ a, price, dayPct }); }
    else if (!met && a.triggered) { a.triggered = false; changed = true; }
  }

  let emails = 0, pushes = 0;
  if (fired.length) {
    let subs = pushOn ? ((await store.get("subs", { type:"json" })) || []) : [];
    const dead = new Set();
    for (const f of fired) {
      const subject = `T-Rex: ${f.a.symbol} ${LABEL[f.a.kind]||f.a.kind} ${f.a.value}`;
      const line = `${f.a.symbol} at ${f.price != null ? f.price : "?"}`
        + (f.dayPct != null ? ` (${f.dayPct>=0?"+":""}${f.dayPct.toFixed(2)}% today)` : "")
        + (f.a.note ? ` — ${f.a.note}` : "");
      // email
      if (resendKey && cfg.email) { try { await sendEmail(resendKey, from, cfg.email, subject, line); emails++; } catch (e) {} }
      // push
      if (pushOn && subs.length) {
        const payload = JSON.stringify({ title: subject, body: line, tag: "trex-"+f.a.symbol, url: "./" });
        for (const sub of subs) {
          try { await webpush.sendNotification(sub, payload); pushes++; }
          catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.add(sub.endpoint); }
        }
      }
    }
    if (dead.size) { subs = subs.filter(s => !dead.has(s.endpoint)); await store.setJSON("subs", subs); }
  }

  if (changed) await store.setJSON("config", cfg);
  return new Response(`checked ${active.length}; fired ${fired.length}; emails ${emails}; pushes ${pushes}`);
};

const LABEL = { priceAbove:"Price ≥", priceBelow:"Price ≤", pctUp:"Day % ≥", pctDown:"Day % ≤ −", rsiBelow:"RSI ≤", rsiAbove:"RSI ≥" };

function alertMet(a, price, dayPct, rsi) {
  switch (a.kind) {
    case "priceAbove": return price != null && price >= a.value;
    case "priceBelow": return price != null && price <= a.value;
    case "pctUp":      return dayPct != null && dayPct >= a.value;
    case "pctDown":    return dayPct != null && dayPct <= -Math.abs(a.value);
    case "rsiBelow":   return rsi != null && rsi <= a.value;
    case "rsiAbove":   return rsi != null && rsi >= a.value;
  }
  return false;
}
function rsi14(cl, period = 14) {
  cl = (cl || []).filter(x => x != null); if (cl.length <= period) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) { const c = cl[i]-cl[i-1]; if (c>=0) g+=c; else l-=c; }
  g/=period; l/=period; let rsi = l===0?100:100-100/(1+g/l);
  for (let i = period+1; i < cl.length; i++) { const c=cl[i]-cl[i-1], gi=c>0?c:0, li=c<0?-c:0; g=(g*(period-1)+gi)/period; l=(l*(period-1)+li)/period; rsi=l===0?100:100-100/(1+g/l); }
  return rsi;
}
async function fetchSeries(sym, suffix) {
  const raw = sym + (suffix || "");
  const has = /\.(NS|BO)$/i.test(raw);
  async function chart(s) {
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=6mo`;
    const r = await fetch(u, { headers: { "User-Agent":"Mozilla/5.0 (compatible; T-Rex/1.0)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const res = j && j.chart && j.chart.result && j.chart.result[0]; if (!res) return null;
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
    const m = res.meta || {};
    return { price: m.regularMarketPrice, prevClose: (m.previousClose != null ? m.previousClose : m.chartPreviousClose), closes: (q.close||[]).filter(x=>x!=null) };
  }
  let d = await chart(has ? raw : raw + ".NS");
  if ((!d || !d.closes.length) && !has) d = await chart(raw + ".BO");
  return d;
}
async function sendEmail(key, from, to, subject, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: text + "\n\n— T-Rex Portfolio Desk (24/7 alert)" })
  });
  if (!r.ok) throw new Error("resend " + r.status);
}
