// td-market.jsx — Market Framework data adapter + News & Markets page.
// ===========================================================================
//  >>> LIVE-DATA INTEGRATION POINT <<<
//  Everything below the MOCK_* blocks is presentation. To go live, replace the
//  bodies of fetchQuotes / fetchNews / fetchSentiment / fetchVolume with real
//  calls to Market Framework's API. The UI does not care where the data comes
//  from — it only consumes the shapes documented above each mock.
//
//  Example (once you have an API base + key, and the endpoint allows CORS — or
//  you proxy it through a backend):
//
//    const API_BASE = 'https://api.marketframework.com';   // TODO: real base
//    async function fetchQuotes() {
//      const r = await fetch(`${API_BASE}/v1/quotes?symbols=ES,NQ,YM,...`, {
//        headers: { Authorization: `Bearer ${MF_TOKEN}` }   // do NOT hard-code a secret in prod
//      });
//      const j = await r.json();
//      return j.map(q => ({ sym: q.symbol, name: q.name, last: q.last, chg: q.change, pct: q.changePct }));
//    }
//
//  NOTE: a browser prototype usually CANNOT call a third-party API directly
//  unless that API sends CORS headers. If it doesn't, route through a small
//  backend/proxy and point API_BASE at that.
// ===========================================================================
(function () {
  const { useState, useEffect, useRef } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, Seg } = window.TDUI;

  // --- shape: { sym, name, last:Number, chg:Number, pct:Number } ---
  const MOCK_QUOTES = [
    { sym: 'ES', name: 'E-mini S&P 500', last: 5482.25, chg: 18.50, pct: 0.34 },
    { sym: 'NQ', name: 'E-mini Nasdaq 100', last: 19640.75, chg: -86.25, pct: -0.44 },
    { sym: 'YM', name: 'E-mini Dow', last: 40218, chg: 122, pct: 0.30 },
    { sym: 'RTY', name: 'E-mini Russell 2000', last: 2034.6, chg: 7.9, pct: 0.39 },
    { sym: 'CL', name: 'Crude Oil', last: 91.84, chg: -1.42, pct: -1.52 },
    { sym: 'GC', name: 'Gold', last: 2388.4, chg: -9.6, pct: -0.40 },
    { sym: 'SI', name: 'Silver', last: 29.31, chg: 0.18, pct: 0.62 },
    { sym: 'ZB', name: '30Y T-Bond', last: 117.06, chg: -0.22, pct: -0.19 },
    { sym: 'ZN', name: '10Y T-Note', last: 110.41, chg: -0.09, pct: -0.08 },
    { sym: '6E', name: 'Euro FX', last: 1.0742, chg: 0.0013, pct: 0.12 },
    { sym: '6J', name: 'Japanese Yen', last: 0.6291, chg: -0.0008, pct: -0.13 },
    { sym: 'BTC', name: 'Bitcoin Futures', last: 69240, chg: 1820, pct: 2.70 },
    { sym: 'ETH', name: 'Ether Futures', last: 3612, chg: 96, pct: 2.73 },
    { sym: 'HG', name: 'Copper', last: 4.612, chg: 0.034, pct: 0.74 },
  ];

  // --- shape: { title, category, url, ago } --- (snapshot of real MF headlines; links open on marketframework.com)
  const MOCK_NEWS = [
    { title: 'The Dow Jones Advantage: Less Silicon, More Cyclicals as Semis Wobble', category: 'Index Products', ago: '1h', url: 'https://www.marketframework.com/analysis/the-dow-jones-advantage-less-silicon-more-cyclicals-as-semis-wobble' },
    { title: 'Why Wednesday’s May CPI Report Could Trigger Outsized Moves Across Futures Markets', category: 'Inflation', ago: '3h', url: 'https://www.marketframework.com/analysis/may-cpi-report-wednesday-futures-market-volatility' },
    { title: 'Natural Gas Ignores Latest Middle East Turmoil, but Risks Are Building', category: 'Energy', ago: '19h', url: 'https://www.marketframework.com/news/natural-gas-ignores-latest-middle-east-turmoil-but-risks-are-building' },
    { title: 'Bitcoin Futures Rally 6% as Strategy’s Return and Short Squeeze Collide', category: 'Crypto', ago: '21h', url: 'https://www.marketframework.com/analysis/bitcoin-futures-rally-6-as-strategys-return-and-short-squeeze-collide' },
    { title: 'Nasdaq Reels Back From 4% Chip-Led Wipeout: Why Apple Could Make or Break Recovery', category: 'Futures Trading', ago: '23h', url: 'https://www.marketframework.com/news/1145-nasdaq-reels-4-percent-chip-wipeout-apple-make-or-break-recovery' },
    { title: 'Gold Under Pressure: Why the Metal’s Biggest Enemy Right Now Isn’t US-Iran Tensions — It’s the Fed', category: 'Monetary Policy', ago: '1d', url: 'https://www.marketframework.com/news/gold-under-pressure-why-the-metals-biggest-enemy-right-now-isnt-us-iran-tensions-its-the-fed' },
    { title: 'Will the ECB Deliver an Insurance Hike as Expected and Trigger a EUR/USD Rally?', category: 'Central Bank', ago: '3d', url: 'https://www.marketframework.com/analysis/will-the-ecb-deliver-an-insurance-hike-as-expected-and-trigger-a-eurusd-rally' },
    { title: 'COT Data Reveals Silver Market Health: Is the Bullish Structure Intact?', category: 'Commodities', ago: '3d', url: 'https://www.marketframework.com/analysis/cot-data-reveals-silver-market-health-is-the-bullish-structure-intact' },
  ];
  const CATS = ['All', 'Index Products', 'Energy', 'Crypto', 'Monetary Policy', 'Central Bank', 'Commodities', 'Inflation', 'Futures Trading'];
  const CAT_TONE = { 'Index Products': 'info', Energy: 'warn', Crypto: 'violet', 'Monetary Policy': 'accent', 'Central Bank': 'accent', Commodities: 'pos', Inflation: 'warn', 'Futures Trading': 'info' };

  // --- shape: { sym, long:Number(0-100) } --- per cohort. short = 100 - long
  const MOCK_SENTIMENT = {
    all:     [{ sym: 'ES', long: 58 }, { sym: 'NQ', long: 47 }, { sym: 'CL', long: 39 }, { sym: 'GC', long: 64 }, { sym: 'BTC', long: 71 }, { sym: 'YM', long: 55 }],
    winners: [{ sym: 'ES', long: 66 }, { sym: 'NQ', long: 52 }, { sym: 'CL', long: 31 }, { sym: 'GC', long: 70 }, { sym: 'BTC', long: 78 }, { sym: 'YM', long: 60 }],
    losers:  [{ sym: 'ES', long: 44 }, { sym: 'NQ', long: 41 }, { sym: 'CL', long: 54 }, { sym: 'GC', long: 51 }, { sym: 'BTC', long: 58 }, { sym: 'YM', long: 47 }],
  };

  // --- shape: { sym, vol:Number } ---
  const MOCK_VOLUME = [
    { sym: 'ES', vol: 1480000 }, { sym: 'NQ', vol: 1120000 }, { sym: 'CL', vol: 640000 },
    { sym: 'GC', vol: 410000 }, { sym: 'MES', vol: 980000 }, { sym: 'MNQ', vol: 760000 },
  ];

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // simulate small live movement so the prototype feels real (remove once live)
  const jitter = (q) => {
    const d = (Math.random() - 0.5) * (q.last * 0.0012);
    const last = +(q.last + d).toFixed(q.last > 1000 ? 2 : 4);
    const chg = +(q.chg + d).toFixed(2);
    return { ...q, last, chg, pct: +((chg / (last - chg)) * 100).toFixed(2) };
  };

  const TDMarket = {
    async fetchQuotes(seedJitter) { await wait(60); return seedJitter ? MOCK_QUOTES.map(jitter) : MOCK_QUOTES.slice(); },
    async fetchNews() { await wait(60); return MOCK_NEWS.slice(); },
    async fetchSentiment(cohort = 'all') { await wait(60); return MOCK_SENTIMENT[cohort] || MOCK_SENTIMENT.all; },
    async fetchVolume() { await wait(60); return MOCK_VOLUME.slice(); },
    CATS, CAT_TONE,
  };

  // ---- scrolling quote ticker (used on Markets page + Dashboard) ----
  function MarketTicker({ live = true }) {
    const [quotes, setQuotes] = useState(MOCK_QUOTES);
    useEffect(() => {
      let on = true;
      const tick = async () => { const q = await TDMarket.fetchQuotes(live); if (on) setQuotes(q); };
      tick();
      const id = live ? setInterval(tick, 5000) : null;
      return () => { on = false; if (id) clearInterval(id); };
    }, [live]);
    const row = quotes.concat(quotes); // duplicate for seamless loop
    return (
      <div className="ticker" role="marquee" aria-label="Live futures quotes">
        <div className="ticker-track">
          {row.map((q, i) => (
            <span className="tk" key={i}>
              <b>{q.sym}</b>
              <span className="tk-last mono">{q.last.toLocaleString('en-US', { minimumFractionDigits: q.last < 10 ? 4 : 2, maximumFractionDigits: q.last < 10 ? 4 : 2 })}</span>
              <span className={'tk-chg ' + (q.chg >= 0 ? 'up' : 'down')}>{q.chg >= 0 ? '▲' : '▼'} {Math.abs(q.pct).toFixed(2)}%</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  function SentimentBar({ d }) {
    const long = d.long, short = 100 - long;
    const bias = long >= 55 ? 'Long' : long <= 45 ? 'Short' : 'Mixed';
    const tone = long >= 55 ? 'up' : long <= 45 ? 'down' : 'flat';
    return (
      <div className="sent-row">
        <div className="sent-top"><b>{d.sym}</b><span className={'sent-bias ' + tone}>{bias} bias</span></div>
        <div className="sent-bar">
          <span className="sent-long" style={{ width: long + '%' }}>{long}%</span>
          <span className="sent-short" style={{ width: short + '%' }}>{short}%</span>
        </div>
      </div>
    );
  }

  function Locked({ onNav, children }) {
    return (
      <div className="locked">
        <div className="locked-inner" aria-hidden="true">{children}</div>
        <div className="locked-overlay">
          <span className="locked-ic"><Icon name="lock" size={20} /></span>
          <b className="locked-title">Real-time data locked</b>
          <p className="locked-msg"><span className="locked-i"><Icon name="info" size={13} /></span>Fund your account with <b>$5,000+</b> to unlock real-time trading data.</p>
          <button className="btn btn-primary btn-sm" onClick={() => onNav && onNav('funding')}><Icon name="download" size={14} /> Deposit funds</button>
        </div>
      </div>
    );
  }

  function MarketsPage({ app, onNav }) {
    const [cat, setCat] = useState('All');
    const [news, setNews] = useState(MOCK_NEWS);
    const [cohort, setCohort] = useState('all');
    const [sent, setSent] = useState(MOCK_SENTIMENT.all);
    const [vol, setVol] = useState(MOCK_VOLUME);
    const [updatedAgo, setUpdatedAgo] = useState(0);

    useEffect(() => { TDMarket.fetchNews().then(setNews); TDMarket.fetchVolume().then(setVol); }, []);
    useEffect(() => { TDMarket.fetchSentiment(cohort).then(setSent); }, [cohort]);
    useEffect(() => { const id = setInterval(() => setUpdatedAgo((s) => s + 5), 5000); return () => clearInterval(id); }, []);

    const shownNews = news.filter((n) => cat === 'All' || n.category === cat);
    const maxVol = Math.max(...vol.map((v) => v.vol));

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="news" size={20} /></div>
            <div>
              <div className="eyebrow">Powered by Market Framework</div>
              <h1 className="ph-title">News &amp; markets</h1>
              <p className="ph-sub">Live futures quotes, market news, and trader positioning from Market Framework — Talero’s research partner.</p>
            </div>
          </div>
          <div className="pagehead-r">
            <a className="btn btn-ghost" href="https://www.marketframework.com/" target="_blank" rel="noopener noreferrer">Open Market Framework <Icon name="open" size={14} /></a>
          </div>
        </div>

        <MarketTicker live />

        <div className="rail-2 mk-grid">
          {/* news */}
          <Card>
            <CardHead eyebrow="Market Framework" title="Latest news"
              right={<a className="btn btn-ghost btn-sm" href="https://www.marketframework.com/articles" target="_blank" rel="noopener noreferrer">All articles <Icon name="open" size={13} /></a>} />
            <div className="doc-tabs mk-tabs">
              {TDMarket.CATS.map((c) => <button key={c} className={'doc-tab' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <ul className="news-list">
              {shownNews.map((n, i) => (
                <li key={i}>
                  <a className="news-item" href={n.url} target="_blank" rel="noopener noreferrer">
                    <div className="news-meta">
                      <div className="news-top"><Badge tone={TDMarket.CAT_TONE[n.category] || 'neutral'}>{n.category}</Badge><span className="news-ago">{n.ago} ago</span></div>
                      <b className="news-title">{n.title}</b>
                    </div>
                    <span className="news-ext"><Icon name="open" size={14} /></span>
                  </a>
                </li>
              ))}
              {!shownNews.length && <div className="ptable-empty">No headlines in this category right now.</div>}
            </ul>
          </Card>

          {/* sentiment + volume — gated behind $5k funding */}
          <div className="mk-rail">
            <Locked onNav={onNav}>
            <Card>
              <CardHead eyebrow="Trade Validator" title="Trader positioning"
                right={<span className="freshness live"><i className="live-dot" /> Live</span>} />
              <div className="seg-wrap"><Seg value={cohort} onChange={setCohort} options={[{ v: 'all', l: 'All' }, { v: 'winners', l: 'Winners' }, { v: 'losers', l: 'Losers' }]} /></div>
              <div className="sent-list">
                {sent.map((d) => <SentimentBar key={d.sym} d={d} />)}
              </div>
              <div className="sent-legend"><span><i className="dot-long" /> Long</span><span><i className="dot-short" /> Short</span></div>
            </Card>
            </Locked>

            <Locked onNav={onNav}>
            <Card>
              <CardHead title="Top contracts by volume" sub="Where capital is moving today." />
              <div className="vol-list">
                {vol.slice().sort((a, b) => b.vol - a.vol).map((v) => (
                  <div className="vol-row" key={v.sym}>
                    <b>{v.sym}</b>
                    <span className="vol-bar"><i style={{ width: (v.vol / maxVol * 100) + '%' }} /></span>
                    <span className="vol-num mono">{(v.vol / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            </Card>
            </Locked>
          </div>
        </div>

        <p className="fineprint"><Icon name="info" size={13} /> Quotes, news, and positioning are provided by Market Framework and shown for information only — not investment advice or an order-execution venue. Values shown here are illustrative sample data pending live API connection. <span className="muted">[data source: Market Framework API — integration pending]</span></p>
      </div>
    );
  }

  window.TDMarket = TDMarket;
  window.TDMarket.MarketTicker = MarketTicker;
  window.TDPages = window.TDPages || {};
  window.TDPages.markets = MarketsPage;
})();
