// T-Rex price proxy (server-side).
// DEFAULT: uses Yahoo Finance — FREE, no API key, covers NSE (.NS) and BSE (.BO).
// Yahoo blocks browsers (CORS) but not servers, so this function fetches it for you.
//
// OPTIONAL: if you'd rather use a keyed provider, set ONE env var in Netlify and it takes priority:
//   TWELVEDATA_API_KEY    (NSE/BSE only on Twelve Data PAID plans)
//   ALPHAVANTAGE_API_KEY  (free ~25 calls/day, mainly .BSE symbols)
//
// App calls:  /.netlify/functions/price?symbol=RELIANCE      (blank suffix -> Yahoo .NS)
//   or        /.netlify/functions/price?symbol=RELIANCE.BO   (BSE)
// Returns:    { "price": 2980.5, "source": "yahoo" }   or   { "error": "..." }

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60"
  };
  const raw = (event.queryStringParameters && event.queryStringParameters.symbol || "").trim();
  if (!raw) return { statusCode: 400, headers, body: JSON.stringify({ error: "missing symbol" }) };

  const td = process.env.TWELVEDATA_API_KEY;
  const av = process.env.ALPHAVANTAGE_API_KEY;

  try {
    // 1) Keyed providers take priority if configured
    if (td) {
      let price = await twelveData(raw, td);
      if (price == null && !/[:.]/.test(raw)) price = await twelveData(raw + ":NSE", td);
      if (price != null) return ok(headers, price, "twelvedata");
    }
    if (av) {
      const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(raw)}&apikey=${av}`);
      const j = await r.json();
      const p = j["Global Quote"] && j["Global Quote"]["05. price"];
      if (p) return ok(headers, parseFloat(p), "alphavantage");
    }

    // 2) Default: Yahoo Finance, free, no key.
    // If the app didn't give an exchange suffix, default to NSE (.NS).
    const y = /\.(NS|BO)$/i.test(raw) ? raw : raw + ".NS";
    let price = await yahoo(y);
    if (price == null && !/\.(NS|BO)$/i.test(raw)) price = await yahoo(raw + ".BO"); // fall back to BSE
    if (price != null) return ok(headers, price, "yahoo");

    return { statusCode: 502, headers, body: JSON.stringify({ error: "no price found", symbol: raw }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e && e.message || e) }) };
  }
};

async function yahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; T-Rex/1.0)" } });
  if (!r.ok) return null;
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  const m = res && res.meta;
  const p = m && (m.regularMarketPrice != null ? m.regularMarketPrice : m.previousClose);
  return p != null ? parseFloat(p) : null;
}
async function twelveData(symbol, key) {
  const r = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${key}`);
  const j = await r.json();
  return j && j.price != null ? parseFloat(j.price) : null;
}
function ok(headers, price, source) {
  return { statusCode: 200, headers, body: JSON.stringify({ price, source }) };
}
