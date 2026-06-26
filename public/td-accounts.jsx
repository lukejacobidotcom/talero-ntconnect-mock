// td-accounts.jsx — TAL-11 Accounts. Exposes TDPages.accounts
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, Badge, ACCT_STATE, OpenAccountModal, CredsModal } = window.TDUI;
  const { fmtUSD } = window.TDCharts;

  const TYPE_ICON = {
    Individual: 'user',
    Entity: 'users',
    Trust: 'certificate',
    IRA: 'security',
  };
  function typeIcon(type) {
    const key = Object.keys(TYPE_ICON).find((k) => type.indexOf(k) === 0);
    return TYPE_ICON[key] || 'wallet';
  }

  function AccountsPage({ app, onNav }) {
    const [openAcct, setOpenAcct] = useState(false);
    const [creds, setCreds] = useState(null);
    const liveState = (app && app.acctState) || 'active';

    const ROWS = [
      { id: '1912208', type: 'Individual', state: liveState, cash: 12640.55, equity: 13180.20, openPnl: 539.65, opened: 'May 12, 2026', primary: true, email: 'jordan.castillo@example.com', password: 'Nt$9fK2pQ7w' },
      { id: '1912240', type: 'Entity — Castillo Capital LLC', state: 'active', cash: 48200.00, equity: 49715.40, openPnl: 1515.40, opened: 'May 20, 2026', email: 'ops@castillocapital.com', password: 'Cc$4mP1xR8z' },
    ];

    const totalCash = ROWS.reduce((s, r) => s + r.cash, 0);
    const totalEquity = ROWS.reduce((s, r) => s + r.equity, 0);
    const totalOpen = ROWS.reduce((s, r) => s + r.openPnl, 0);

    const SUMMARY = [
      { l: 'Total cash balance', v: fmtUSD(totalCash, 2), ic: 'wallet' },
      { l: 'Total equity', v: fmtUSD(totalEquity, 2), ic: 'stats' },
      { l: 'Open P&L', v: (totalOpen >= 0 ? '+' : '') + fmtUSD(totalOpen, 2), ic: 'pulse', tone: totalOpen >= 0 ? 'pos' : 'neg' },
      { l: 'Open accounts', v: String(ROWS.length), ic: 'users' },
    ];

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="wallet" size={20} /></div>
            <div>
              <div className="eyebrow">Accounts</div>
              <h1 className="ph-title">Your accounts</h1>
              <p className="ph-sub">Every brokerage account under your profile — balances, credentials, and quick access to trade.</p>
            </div>
          </div>
          <div className="pagehead-r">
            <button className="btn btn-ghost" onClick={() => setOpenAcct(true)}><Icon name="plus" size={15} /> Open new account</button>
            <button className="btn btn-primary" onClick={() => onNav('funding')}><Icon name="download" size={15} /> Fund account</button>
          </div>
        </div>

        {/* portfolio summary */}
        <div className="acct-summary">
          {SUMMARY.map((s) => (
            <div className="acct-sum-card" key={s.l}>
              <span className="acct-sum-ic"><Icon name={s.ic} size={16} /></span>
              <div className="acct-sum-meta">
                <span className="acct-sum-l">{s.l}</span>
                <span className={'acct-sum-v mono' + (s.tone ? ' is-' + s.tone : '')}>{s.v}</span>
              </div>
            </div>
          ))}
        </div>

        {/* account cards */}
        <div className="acct-cards">
          {ROWS.map((r) => {
            const meta = ACCT_STATE[r.state];
            const pos = r.openPnl >= 0;
            return (
              <Card className="acct-card" key={r.id}>
                <div className="acct-card-top">
                  <div className="acct-card-id">
                    <span className="acct-type-ic"><Icon name={typeIcon(r.type)} size={18} /></span>
                    <div>
                      <div className="acct-card-num">
                        <span className="mono">#{r.id}</span>
                        {r.primary && <Badge tone="accent">Primary</Badge>}
                      </div>
                      <div className="acct-card-type">{r.type}</div>
                    </div>
                  </div>
                  <Badge tone={meta.tone} dot>{meta.label}</Badge>
                </div>

                <div className="acct-card-stats">
                  <div>
                    <span className="acct-stat-l">Cash balance</span>
                    <span className="acct-stat-v mono">{fmtUSD(r.cash, 2)}</span>
                  </div>
                  <div>
                    <span className="acct-stat-l">Equity</span>
                    <span className="acct-stat-v mono">{fmtUSD(r.equity, 2)}</span>
                  </div>
                  <div>
                    <span className="acct-stat-l">Open P&L</span>
                    <span className={'acct-stat-v mono ' + (pos ? 'is-pos' : 'is-neg')}>{(pos ? '+' : '') + fmtUSD(r.openPnl, 2)}</span>
                  </div>
                  <div>
                    <span className="acct-stat-l">Opened</span>
                    <span className="acct-stat-v">{r.opened}</span>
                  </div>
                </div>

                <div className="acct-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setCreds(r)}><Icon name="key" size={14} /> Credentials</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onNav('funding')}><Icon name="download" size={14} /> Fund</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onNav('stats')}><Icon name="fileText" size={14} /> Stats</button>
                  <a className="btn btn-primary btn-sm acct-trade" href="https://fintevo.com" target="_blank" rel="noopener noreferrer"><Icon name="pulse" size={14} /> Trade</a>
                </div>
              </Card>
            );
          })}
        </div>

        {openAcct && OpenAccountModal && <OpenAccountModal onClose={() => setOpenAcct(false)} onContinue={() => {}} />}
        {creds && CredsModal && <CredsModal account={creds} onClose={() => setCreds(null)} />}
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.accounts = AccountsPage;
})();
