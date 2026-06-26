// td-stats.jsx — TAL-5 Stats Page (real-money IIB account). Exposes TDPages.stats
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Seg, Badge, Empty, StateBanners, ACCT_STATE, CredsModal } = window.TDUI;
  const { AreaChart, fmtUSD } = window.TDCharts;
  const TD = window.TD;

  // ---- deterministic PRNG ----
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // realized-P&L for a month grid (weekdays only)
  function monthDays(seed) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < 31; i++) {
      const dow = (i + 3) % 7;
      const weekday = dow !== 0 && dow !== 6;
      let pnl = null, trades = 0;
      if (weekday && i < 24) { pnl = Math.round((r() - 0.42) * 1100); trades = Math.round(1 + r() * 8); }
      out.push({ day: i + 1, dow, pnl, trades });
    }
    return out;
  }

  // ---- overall trading statistics (illustrative) ----
  const STATS = {
    winRate: 58.4, profitFactor: 1.84, trades: 148, contracts: 612,
    best: 1840, worst: -920, avgWin: 312.40, avgLoss: -184.60,
    longContracts: 360, shortContracts: 252, winStreak: 9, lossStreak: 4,
  };

  const sgn = (n) => (n >= 0 ? '+' : '-');
  const usd0 = (n) => sgn(n) + fmtUSD(Math.abs(n), 0).replace('-', '');

  function MetricCard({ label, value, sub, tone, fresh }) {
    return (
      <Card className="metric">
        <div className="metric-top">
          <span className="kpi-label">{label}</span>
          <span className={'freshness ' + (fresh === 'live' ? 'live' : 'eod')}>
            {fresh === 'live' ? <><i className="live-dot" /> Live</> : 'EOD'}
          </span>
        </div>
        <div className={'metric-val mono ' + (tone || '')}>{value}</div>
        {sub && <div className={'metric-sub ' + (tone || '')}>{sub}</div>}
      </Card>
    );
  }

  function StatTile({ label, value, tone }) {
    return (
      <div className="stat-tile">
        <span className="kpi-label">{label}</span>
        <span className={'stat-v mono ' + (tone || '')}>{value}</span>
      </div>
    );
  }

  function PnlCalendar({ empty }) {
    const days = monthDays(77);
    const net = empty ? 0 : days.reduce((s, d) => s + (d.pnl || 0), 0);
    const wins = days.filter((d) => d.pnl != null && d.pnl > 0).length;
    const losses = days.filter((d) => d.pnl != null && d.pnl < 0).length;
    const blanks = days[0].dow;
    return (
      <Card>
        <CardHead eyebrow="Realized P&amp;L · June 2026" title="P&amp;L calendar"
          sub="Realized P&L per trading day, from your FCM end-of-day cash-balance log. Open (unrealized) P&L is shown live on the metric cards above."
          right={
            <div className="ch-actions cal-summary">
              <span className="cal-sum-item"><small>Net</small><b className={net >= 0 ? 'pos' : 'neg'}>{usd0(net)}</b></span>
              <span className="cal-sum-item"><small>Green / red days</small><b>{wins} / {losses}</b></span>
              <button className="iconbtn" title="Sync"><Icon name="pulse" size={16} /></button>
            </div>
          } />
        <div className="cal cal-lg">
          <div className="cal-dow">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d}>{d}</span>)}</div>
          <div className="cal-grid">
            {Array.from({ length: blanks }).map((_, i) => <div key={'b' + i} className="cal-cell blank" />)}
            {days.map((d) => {
              const pnl = empty ? null : d.pnl;
              const cls = pnl == null ? 'flat' : pnl >= 0 ? 'pos' : 'neg';
              return (
                <div key={d.day} className={'cal-cell ' + cls}>
                  <span className="cal-day">{d.day}</span>
                  {pnl != null && <span className="cal-pnl">{pnl >= 0 ? '+' : '-'}${Math.abs(Math.round(pnl)).toLocaleString()}</span>}
                  {pnl != null && <span className="cal-trades">{d.trades} {d.trades === 1 ? 'trade' : 'trades'}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  function StatsPage({ app }) {
    const [range, setRange] = useState('mtd');
    const [credsOpen, setCredsOpen] = useState(false);
    const empty = app && app.dataMode === 'new';
    const error = app && app.dataMode === 'error';
    const stateMeta = ACCT_STATE[app ? app.acctState : 'active'];

    const eq = empty ? TD.LIVE.equity.map((p) => ({ ...p, value: 10000 })) : TD.LIVE.equity;
    const m = empty
      ? { net: '$0.00', netSub: '0.0% this period', cash: '$0.00', equity: '$10,000.00', netliq: '$10,000.00', tone: '' }
      : { net: '+$3,284.10', netSub: '+12.4% this period', cash: '$12,640.55', equity: '$13,252.80', netliq: '$13,252.80', tone: 'pos' };

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="stats" size={20} /></div>
            <div>
              <div className="eyebrow">Account · Performance</div>
              <h1 className="ph-title">Account stats</h1>
              <div className="stats-meta">
                <span className="mono">#1912208</span>
                <span className="dotsep">·</span>
                <span>Individual</span>
                <span className="dotsep">·</span>
                <Badge tone={stateMeta.tone} dot>{stateMeta.label}</Badge>
              </div>
            </div>
          </div>
          <div className="pagehead-r">
            <button className="btn btn-ghost" onClick={() => setCredsOpen(true)}><Icon name="key" size={15} /> Platform credentials</button>
            <a className="btn btn-primary" href="https://fintevo.com" target="_blank" rel="noopener noreferrer"><span>Open Fintevo</span><Icon name="open" size={15} /></a>
          </div>
        </div>

        <StateBanners app={app} />

        {error &&
          <Card className="errorcard">
            <span className="errorcard-ic"><Icon name="alert" size={20} /></span>
            <div><b>Can’t reach NinjaTrader right now</b><small>Showing last sync · 14:38 ET. Live values are paused until the connection is restored.</small></div>
            <button className="btn btn-sm">Retry</button>
          </Card>
        }

        <div className="metric-grid">
          <MetricCard label="Net P&L" value={m.net} sub={m.netSub} tone={m.tone} fresh="eod" />
          <MetricCard label="Cash Balance" value={m.cash} sub="Settled funds" fresh="live" />
          <MetricCard label="Current Equity" value={m.equity} sub="Cash + open positions" fresh="live" />
          <MetricCard label="Net Liquidating Value" value={m.netliq} sub="Account close-out value" fresh="live" />
        </div>

        <Card>
          <CardHead eyebrow="Account equity curve" title="Equity over time"
            sub="Daily equity from your NinjaTrader Clearing cash-balance snapshot, streamed via WebSocket. Illustrative — past performance is not indicative of future results."
            right={
              <Seg value={range} onChange={setRange}
                options={[{ v: 'mtd', l: 'MTD' }, { v: '3m', l: '3M' }, { v: 'ytd', l: 'YTD' }, { v: 'all', l: 'All' }]} />
            } />
          <AreaChart data={eq} color="var(--accent)" height={250}
            formatValue={(v) => fmtUSD(v, 2)} formatLabel={(l) => 'Day ' + l} gridY={4} />
          {empty && <p className="fineprint">No trading activity yet — your equity curve will populate after your first session.</p>}
        </Card>

        {/* trading statistics */}
        <Card>
          <CardHead eyebrow="All-time" title="Trading statistics"
            sub="Across all closed trades on this account." />
          {empty ? <Empty icon="stats" title="No statistics yet">Your trading statistics will populate after your first closed trade.</Empty> : (
            <div className="statgrid">
              <StatTile label="Win rate" value={STATS.winRate + '%'} tone="pos" />
              <StatTile label="Profit factor" value={STATS.profitFactor.toFixed(2)} tone="pos" />
              <StatTile label="No. of trades" value={STATS.trades} />
              <StatTile label="Contracts" value={STATS.contracts} />
              <StatTile label="Best trade" value={usd0(STATS.best)} tone="pos" />
              <StatTile label="Worst trade" value={usd0(STATS.worst)} tone="neg" />
              <StatTile label="Avg win" value={usd0(STATS.avgWin)} tone="pos" />
              <StatTile label="Avg loss" value={usd0(STATS.avgLoss)} tone="neg" />
              <StatTile label="Long contracts" value={STATS.longContracts} />
              <StatTile label="Short contracts" value={STATS.shortContracts} />
              <StatTile label="Longest winning streak" value={STATS.winStreak} tone="pos" />
              <StatTile label="Longest losing streak" value={STATS.lossStreak} tone="neg" />
            </div>
          )}
        </Card>

        {/* enlarged P&L calendar */}
        <PnlCalendar empty={empty} />

        {/* account details */}
        <Card>
          <CardHead title="Account details" />
          <dl className="datarow">
            <div><dt>Account opened</dt><dd>May 12, 2026</dd></div>
            <div><dt>Account type</dt><dd>Individual</dd></div>
            <div><dt>Cash balance</dt><dd className="mono">{m.cash}</dd></div>
            <div><dt>FCM (carrying broker)</dt><dd>NinjaTrader Clearing, LLC</dd></div>
            <div><dt>Platform</dt><dd>Fintevo <span className="muted">[per TAL-15]</span></dd></div>
            <div><dt>Last updated</dt><dd>{error ? '14:38 ET (stale)' : 'just now'}</dd></div>
          </dl>
        </Card>

        <p className="fineprint">Live balances (cash, equity, net liq) stream from NinjaTrader Clearing via WebSocket (~2.5s heartbeat); open (unrealized) P&amp;L is computed in-app from your fills and live quotes. Figures are indicative and may differ from your official FCM statement of record. <span className="muted">[risk disclosure pending Legal · TAL-63]</span></p>

        {credsOpen && <CredsModal onClose={() => setCredsOpen(false)} />}
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.stats = StatsPage;
})();
