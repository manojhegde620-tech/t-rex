// Sends a test Web Push to all stored subscriptions (guarded by SYNC_SECRET).
// Lets you confirm phone delivery in one tap after deploy.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
const H = { "content-type": "application/json" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

export default async (req) => {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return json({ ok:false, error:"SYNC_SECRET is not set on the server" });
  if (req.method !== "POST") return json({ ok:false, error:"method not allowed" }, 405);

  let b = {};
  try { b = await req.json(); } catch {}
  if (b.secret !== secret) return json({ ok:false, error:"bad secret" }, 401);

  const vapPub = process.env.VAPID_PUBLIC_KEY, vapPriv = process.env.VAPID_PRIVATE_KEY;
  if (!vapPub || !vapPriv) return json({ ok:false, error:"VAPID keys not set — add them in Netlify env vars" });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:alerts@example.com", vapPub, vapPriv);

  const store = getStore("trex");
  let subs = (await store.get("subs", { type:"json" })) || [];
  if (!subs.length) return json({ ok:false, error:"no push subscriptions yet — tap ‘Enable phone push’ first" });

  const payload = JSON.stringify({ title: "T-Rex test push ✅", body: "Push notifications are working.", tag: "trex-test", url: "./" });
  let sent = 0; const dead = new Set();
  for (const sub of subs) {
    try { await webpush.sendNotification(sub, payload); sent++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.add(sub.endpoint); }
  }
  if (dead.size) { subs = subs.filter(s => !dead.has(s.endpoint)); await store.setJSON("subs", subs); }
  return json({ ok:true, sent, removed: dead.size });
};
