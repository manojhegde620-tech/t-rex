// Sends an alert email via Resend (free tier). Optional — only used if you configure it.
// Netlify env vars:
//   RESEND_API_KEY   (required)  free key from resend.com
//   RESEND_FROM      (optional)  e.g. "T-Rex Alerts <alerts@yourdomain.com>";
//                                defaults to Resend's shared test sender.
// The app POSTs { to, subject, text }.
exports.handler = async (event) => {
  const headers = { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" };
  if (event.httpMethod !== "POST")
    return { statusCode:405, headers, body:JSON.stringify({error:"POST only"}) };

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "T-Rex Alerts <onboarding@resend.dev>";
  if (!key) return { statusCode:200, headers, body:JSON.stringify({ ok:false, error:"email not configured (set RESEND_API_KEY in Netlify)" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const to = (body.to || "").trim();
  const subject = (body.subject || "T-Rex alert").trim();
  const text = (body.text || "").trim();
  if (!to) return { statusCode:400, headers, body:JSON.stringify({ ok:false, error:"missing 'to'" }) };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
      body: JSON.stringify({ from, to, subject, text })
    });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok) return { statusCode:200, headers, body:JSON.stringify({ ok:false, error:(j && (j.message||j.error)) || ("resend "+r.status) }) };
    return { statusCode:200, headers, body:JSON.stringify({ ok:true, id:j.id }) };
  } catch(e){
    return { statusCode:200, headers, body:JSON.stringify({ ok:false, error:String(e&&e.message||e) }) };
  }
};
