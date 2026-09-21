// Stores the user's alert config server-side (Netlify Blobs) so the scheduled checker can
// run 24/7 even when the app is closed. Protected by a shared secret (SYNC_SECRET env var).
import { getStore } from "@netlify/blobs";

const H = { "content-type": "application/json" };

export default async (req) => {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return json({ ok:false, error:"SYNC_SECRET is not set on the server" });

  const store = getStore("trex");

  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("secret") !== secret) return json({ ok:false, error:"bad secret" }, 401);
    const cfg = await store.get("config", { type:"json" });
    return json({ ok:true, config: cfg || null });
  }

  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    if (body.secret !== secret) return json({ ok:false, error:"bad secret" }, 401);
    const cfg = {
      email: (body.email || "").trim(),
      suffix: (body.suffix || ""),
      alerts: Array.isArray(body.alerts) ? body.alerts : [],
      updated: Date.now()
    };
    await store.setJSON("config", cfg);
    return json({ ok:true, count: cfg.alerts.length });
  }

  return json({ ok:false, error:"method not allowed" }, 405);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: H });
}
