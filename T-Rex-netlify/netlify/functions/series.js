// Returns daily price series + key stats for a symbol, free via Yahoo (no key).
// Used by the Signals panel and the alert engine (RSI, volume, 52-week range).
// Call: /.netlify/functions/series?symbol=INFY&range=6mo
exports.handler = async (event) => {
  const headers = { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=120" };
  const qs = event.queryStringParameters || {};
  const raw = (qs.symbol || "").trim();
  const range = (qs.range || "6mo").trim();
  if (!raw) return { statusCode:400, headers, body:JSON.stringify({error:"missing symbol"}) };

  async function chart(sym){
    const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${encodeURIComponent(range)}`;
    const r = await fetch(u, { headers:{ "User-Agent":"Mozilla/5.0 (compatible; T-Rex/1.0)" } });
    if (!r.ok) return null;
    const j = await r.json();
    const res = j && j.chart && j.chart.result && j.chart.result[0];
    if (!res) return null;
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
    const m = res.meta || {};
    return {
      symbol: sym,
      timestamps: res.timestamp || [],
      closes: q.close || [], highs: q.high || [], lows: q.low || [], volumes: q.volume || [],
      meta: {
        price: m.regularMarketPrice,
        prevClose: (m.previousClose != null ? m.previousClose : m.chartPreviousClose),
        dayHigh: m.regularMarketDayHigh, dayLow: m.regularMarketDayLow,
        high52: m.fiftyTwoWeekHigh, low52: m.fiftyTwoWeekLow, currency: m.currency
      }
    };
  }
  const hasEx = /\.(NS|BO)$/i.test(raw);
  try {
    let d = await chart(hasEx ? raw : raw + ".NS");
    const empty = !d || (d.closes||[]).filter(x=>x!=null).length === 0;
    if (empty && !hasEx) d = await chart(raw + ".BO");
    if (!d) return { statusCode:502, headers, body:JSON.stringify({error:"no data", symbol:raw}) };
    return { statusCode:200, headers, body:JSON.stringify(d) };
  } catch(e){
    return { statusCode:500, headers, body:JSON.stringify({error:String(e&&e.message||e)}) };
  }
};
