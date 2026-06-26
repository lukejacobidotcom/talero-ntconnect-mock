// td-dashboard.jsx — TAL-20 Dashboard landing (lifecycle-aware home). Exposes TDPages.dashboard
// NOTE: TAL-20 scope is partly TBD in Jira — this is a best-guess layout with labeled assumptions.
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, IconTile, StateBanners, ACCT_STATE } = window.TDUI;
  const { fmtUSD } = window.TDCharts;

  const STEPS = ['Register', 'Apply', 'Verify identity', 'Activate', 'Fund', 'Trade'];

  // per-account figures (illustrative). Keyed by account number.
  const ACCOUNTS = [
    { id: '1912208', type: 'Individual', state: 'active', opened: 'May 12, 2026', netliq: 13252.80, cash: 12640.55, buyingPower: 25281.10, upnl: 612.25, pnlMtd: 3284.10, pnlPct: 12.4, positions: 4, posSplit: '2 long · 2 short' },
    { id: '1912240', type: 'Entity — Castillo Capital LLC', state: 'active', opened: 'May 20, 2026', netliq: 48200.00, cash: 46980.00, buyingPower: 93960.00, upnl: -340.80, pnlMtd: 5120.40, pnlPct: 8.1, positions: 2, posSplit: '2 long' },
  ];

  function lifecycle(app) {
    // derive a journey step from the simulator state
    if (!app) return { idx: 5 };
    if (app.kyc === 'action') return { idx: 2 };
    if (app.kyc === 'pending') return { idx: 2 };
    if (app.kyc === 'verified' && app.dataMode === 'new') return { idx: 4 };
    return { idx: 5 };
  }

  function DashboardPage({ app, onNav }) {
    const [acctId, setAcctId] = useState(ACCOUNTS[0].id);
    const [pickOpen, setPickOpen] = useState(false);
    const acct = ACCOUNTS.find((a) => a.id === acctId) || ACCOUNTS[0];
    const lc = lifecycle(app);
    const name = 'Jordan';
    const funded = app && app.kyc === 'verified' && app.dataMode !== 'new';
    const isNew = app && app.dataMode === 'new';
    const stateMeta = ACCT_STATE[(app && app.acctState) || 'active'];
    // a brand-new (unfunded) account zeroes out the live figures
    const v = isNew
      ? { netliq: 0, cash: 0, buyingPower: 0, upnl: 0, pnlMtd: 0, pnlPct: 0, positions: 0, posSplit: '\u2014' }
      : acct;

    let headline, sub, cta, ctaGo;
    if (app && app.kyc === 'action') {
      headline = `${name}, finish verifying your identity`;
      sub = 'We need one more document before your account can be activated.';
      cta = 'Resume verification'; ctaGo = 'settings';
    } else if (app && app.kyc === 'pending') {
      headline = `${name}, your application is in review`;
      sub = 'A specialist is reviewing your details. Funding and trading unlock once verification completes.';
      cta = 'Track application'; ctaGo = 'settings';
    } else if (app && app.dataMode === 'new') {
      headline = `${name}, fund your account to start trading`;
      sub = 'Your account is approved. Make your first deposit to unlock buying power.';
      cta = 'Fund your account'; ctaGo = 'funding';
    } else {
      headline = `Welcome back, ${name}`;
      sub = 'Your account is active. Jump into the platform or review your performance.';
      cta = 'Open Fintevo'; ctaGo = null;
    }

    const shortcuts = [
      { id: 'stats', ic: 'stats', t: 'Account stats', d: 'Equity, P&L, margin' },
      { id: 'funding', ic: 'swap', t: 'Funding & withdrawals', d: 'Deposit or withdraw' },
      { id: 'statements', ic: 'fileText', t: 'Statements', d: 'Daily, monthly, tax docs' },
      { id: 'billing', ic: 'receipt', t: 'Billing', d: 'Market data & invoices' },
      { id: 'platforms', ic: 'monitor', t: 'Trading platform', d: 'Open Fintevo' },
      { id: 'settings', ic: 'gear', t: 'Personal settings', d: 'Profile, security, KYC' },
    ];

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="home" size={20} /></div>
            <div>
              <div className="eyebrow">Home <span className="muted">· layout proposed (TAL-20 scope partly TBD)</span></div>
              <h1 className="ph-title">Dashboard</h1>
            </div>
          </div>
        </div>

        <StateBanners app={app} />

        {/* account selector + live summary row */}
        <div className="acctbar">
          <button className="acctbar-select" onClick={() => setPickOpen(true)} title="Switch account">
            <span className={'acctbar-state s-' + stateMeta.tone}><i />{stateMeta.label}</span>
            <span className="acctbar-acct mono">{acct.id} · {acct.type}</span>
            <span className="acctbar-switch">Switch</span>
            <span className="acctbar-chev"><Icon name="chevron" size={15} /></span>
          </button>
          <div className="acctbar-stats">
            <div className="acctbar-stat">
              <span className="acctbar-l">Buying Power</span>
              <span className="acctbar-pill mono"><em>USD</em> {fmtUSD(v.buyingPower, 2)}</span>
            </div>
            <div className="acctbar-stat">
              <span className="acctbar-l">Unrealized PnL</span>
              <span className={'acctbar-pill mono' + (v.upnl > 0 ? ' up' : v.upnl < 0 ? ' down' : '')}><em>USD</em> {v.upnl < 0 ? '-' : ''}{fmtUSD(Math.abs(v.upnl), 2)}</span>
            </div>
          </div>
        </div>

        {pickOpen && (
          <div className="acctpick-modal" onClick={() => setPickOpen(false)}>
            <div className="acctpick-card" onClick={(e) => e.stopPropagation()}>
              <div className="acctpick-head">
                <div><div className="eyebrow">Your accounts</div><b>Select an account</b></div>
                <button className="soon-x" onClick={() => setPickOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
              </div>
              <div className="acctpick-list">
                {ACCOUNTS.map((a) => {
                  const rs = a.id === ACCOUNTS[0].id ? ((app && app.acctState) || 'active') : a.state;
                  const meta = ACCT_STATE[rs];
                  const sel = a.id === acctId;
                  return (
                    <div className={'acctpick-row' + (sel ? ' on' : '')} key={a.id}>
                      <button className="acctpick-main" onClick={() => { setAcctId(a.id); setPickOpen(false); }}>
                        <div className="acctpick-top">
                          <span className="acct-id mono">#{a.id}</span>
                          {sel && <Badge tone="accent">Selected</Badge>}
                          <Badge tone={meta.tone} dot>{meta.label}</Badge>
                        </div>
                        <div className="acctpick-meta"><span>{a.type}</span><span className="dotsep">·</span><span>Opened {a.opened}</span></div>
                        <div className="acctpick-cash">Cash balance <b className="mono">{fmtUSD(a.cash, 2)}</b></div>
                      </button>
                      <div className="acctpick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => { onNav('funding'); setPickOpen(false); }}>Fund</button>
                        <button className="btn btn-primary btn-sm" onClick={() => { setAcctId(a.id); onNav('stats'); setPickOpen(false); }}>View <Icon name="arrowRight" size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="acctpick-foot"><button className="btn btn-ghost btn-sm" onClick={() => { onNav('accounts'); setPickOpen(false); }}>Manage all accounts <Icon name="arrowRight" size={13} /></button></div>
            </div>
          </div>
        )}

        {/* lifecycle hero */}
        <Card className="dash-hero">
          <div className="dash-hero-l">
            <h2 className="dash-h2">{headline}</h2>
            <p className="dash-sub">{sub}</p>
            <div className="dash-cta">
              {ctaGo
                ? <button className="btn btn-primary" onClick={() => onNav(ctaGo)}><span>{cta}</span><Icon name="arrowRight" size={15} /></button>
                : <a className="btn btn-primary" href="https://fintevo.com" target="_blank" rel="noopener noreferrer"><span>{cta}</span><Icon name="open" size={15} /></a>}
              <button className="btn btn-ghost" onClick={() => onNav('stats')}>View account stats</button>
            </div>
          </div>
          <div className="dash-journey">
            <div className="eyebrow">Your journey</div>
            <ol className="journey">
              {STEPS.map((s, i) => (
                <li key={s} className={'jstep ' + (i < lc.idx ? 'done' : i === lc.idx ? 'now' : 'todo')}>
                  <span className="jstep-n">{i < lc.idx ? <Icon name="check" size={12} /> : i + 1}</span>
                  <span className="jstep-t">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        {/* at-a-glance (only when funded/active) */}
        {funded && (
          <div className="metric-grid">
            <Card className="metric"><div className="metric-top"><span className="kpi-label">Net Liquidating Value</span><span className="freshness live"><i className="live-dot" /> Live</span></div><div className="metric-val mono">{fmtUSD(v.netliq, 2)}</div><div className="metric-sub">Account close-out value</div></Card>
            <Card className="metric"><div className="metric-top"><span className="kpi-label">Cash Balance</span><span className="freshness live"><i className="live-dot" /> Live</span></div><div className="metric-val mono">{fmtUSD(v.cash, 2)}</div><div className="metric-sub">Settled funds</div></Card>
            <Card className="metric"><div className="metric-top"><span className="kpi-label">Net P&L (MTD)</span><span className="freshness eod">EOD</span></div><div className={'metric-val mono ' + (v.pnlMtd >= 0 ? 'pos' : 'neg')}>{v.pnlMtd >= 0 ? '+' : '-'}{fmtUSD(Math.abs(v.pnlMtd), 2)}</div><div className={'metric-sub ' + (v.pnlMtd >= 0 ? 'pos' : 'neg')}>{v.pnlMtd >= 0 ? '+' : ''}{v.pnlPct}% this month</div></Card>
            <Card className="metric"><div className="metric-top"><span className="kpi-label">Open positions</span><span className="freshness live"><i className="live-dot" /> Live</span></div><div className="metric-val mono">{v.positions}</div><div className="metric-sub">{v.posSplit}</div></Card>
          </div>
        )}

        {/* shortcuts */}
        <Card>
          <CardHead title="Quick links" sub="Jump to any part of your account." />
          <div className="dash-grid">
            {shortcuts.map((s) => (
              <button key={s.id} className="dash-tile" onClick={() => onNav(s.id)}>
                <IconTile name={s.ic} tone="muted" />
                <span className="dash-tile-t"><b>{s.t}</b><small>{s.d}</small></span>
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.dashboard = DashboardPage;
})();
