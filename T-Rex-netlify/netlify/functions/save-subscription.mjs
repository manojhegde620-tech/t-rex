// Stores/removes Web Push subscriptions (Netlify Blobs), guarded by SYNC_SECRET.
import { getStore } from "@netlify/blobs";
const H = { "content-type": "application/json" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

export default async (req) => {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return json({ ok:false, error:"SYNC_SECRET is not set on the server" });
  if (req.method !== "POST") return json({ ok:false, error:"method not allowed" }, 405);

  let b = {};
  try { b = await req.json(); } catch {}
  if (b.secret !== secret) return json({ ok:false, error:"bad secret" }, 401);

  const store = getStore("trex");
  let subs = (await store.get("subs", { type:"json" })) || [];

  if (b.unsubscribe) {
    subs = subs.filter(s => s.endpoint !== b.unsubscribe);
    await store.setJSON("subs", subs);
    return json({ ok:true, count: subs.length });
  }
  if (!b.subscription || !b.subscription.endpoint) return json({ ok:false, error:"no subscription" }, 400);
  if (!subs.some(s => s.endpoint === b.subscription.endpoint)) subs.push(b.subscription);
  await store.setJSON("subs", subs);
  return json({ ok:true, count: subs.length });
};
