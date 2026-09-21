// Free stock news via Google News RSS (no key). Server-side to avoid browser CORS.
// Call: /.netlify/functions/news?q=Infosys&symbol=INFY
exports.handler = async (event) => {
  const headers = { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=600" };
  const qs = event.queryStringParameters || {};
  const q = (qs.q || qs.symbol || "").trim();
  if (!q) return { statusCode:400, headers, body:JSON.stringify({error:"missing q"}) };

  const query = encodeURIComponent(`${q} stock`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const r = await fetch(url, { headers:{ "User-Agent":"Mozilla/5.0 (compatible; T-Rex/1.0)" } });
    if (!r.ok) return { statusCode:502, headers, body:JSON.stringify({error:"news "+r.status}) };
    const xml = await r.text();
    const items = [];
    const blocks = xml.split(/<item>/).slice(1);
    for (const b of blocks.slice(0, 10)) {
      const item = b.split(/<\/item>/)[0];
      let title = pick(item, "title");
      const link = pick(item, "link");
      const pub = pick(item, "pubDate");
      let source = pick(item, "source");
      if (!source && title.includes(" - ")) source = title.slice(title.lastIndexOf(" - ") + 3);
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
      if (title && link) items.push({ title: clean(title), link, source: clean(source||""), pub });
    }
    return { statusCode:200, headers, body:JSON.stringify({ items }) };
  } catch(e){
    return { statusCode:500, headers, body:JSON.stringify({error:String(e&&e.message||e)}) };
  }
};
function pick(s, tag){
  const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}
function clean(s){
  return s.replace(/<!\[CDATA\[|\]\]>/g,"")
          .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"')
          .replace(/<[^>]+>/g,"").trim();
}
