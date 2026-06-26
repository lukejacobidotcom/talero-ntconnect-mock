// td-shell.jsx — app chrome: Talero logo mark, sidebar, top bar, mobile bottom nav.
(function () {
  const { useState } = React;

  // ---- icon set (inline stroke svgs) ----
  const P = (d) => <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />;
  const ICONS = {
    onboarding: <>{P('M8 3h6l4 4v14H6V5')}{P('M14 3v4h4')}{P('M9 12h6M9 16h6')}</>,
    funding: <>{P('M3 9l9-5 9 5')}{P('M5 9v9h14V9')}{P('M9 13v2M12 13v2M15 13v2')}</>,
    documents: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}{P('M10 12h5M10 15h5')}</>,
    trading: <>{P('M4 19V5')}{P('M4 19h16')}{P('M7 15l3-4 3 2 4-6')}</>,
    support: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M9.2 9.2a3 3 0 1 1 4 3.2c-.8.4-1.2 1-1.2 1.8')}{P('M12 17.5h.01')}</>,
    messages: <>{P('M4 5h16v11H8l-4 4z')}{P('M8 9h8M8 12h5')}</>,
    security: <>{P('M12 3l7 3v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6z')}{P('M9.5 12l1.8 1.8L15 10')}</>,
    settings: <>{P('M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z')}{P('M19 12l1.6-1.1-1.5-2.6-1.9.6a6.6 6.6 0 0 0-1.7-1l-.3-2h-3l-.3 2a6.6 6.6 0 0 0-1.7 1l-1.9-.6L4.4 11 6 12l-1.6 1.1 1.5 2.6 1.9-.6c.5.4 1.1.7 1.7 1l.3 2h3l.3-2c.6-.3 1.2-.6 1.7-1l1.9.6 1.5-2.6z')}</>,
    search: <>{P('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z')}{P('M20 20l-3.5-3.5')}</>,
    lock: <>{P('M6 10V8a6 6 0 0 1 12 0v2')}{P('M5 10h14v10H5z')}{P('M12 14v3')}</>,
    logout: <>{P('M15 4h4v16h-4')}{P('M10 8l-4 4 4 4')}{P('M6 12h10')}</>,
    bell: <>{P('M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z')}{P('M10 20a2 2 0 0 0 4 0')}</>,
    help: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M9.2 9.2a3 3 0 1 1 4 3.2c-.8.4-1.2 1-1.2 1.8')}{P('M12 17.5h.01')}</>,
    sun: <>{P('M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z')}{P('M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19')}</>,
    moon: <>{P('M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z')}</>,
    gear: <>{P('M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z')}{P('M19 12l1.6-1.1-1.5-2.6-1.9.6a6.6 6.6 0 0 0-1.7-1l-.3-2h-3l-.3 2a6.6 6.6 0 0 0-1.7 1l-1.9-.6L4.4 11 6 12l-1.6 1.1 1.5 2.6 1.9-.6c.5.4 1.1.7 1.7 1l.3 2h3l.3-2c.6-.3 1.2-.6 1.7-1l1.9.6 1.5-2.6z')}</>,
    open: <>{P('M14 4h6v6')}{P('M20 4l-8 8')}{P('M18 14v6H4V6h6')}</>,
    chevron: <>{P('M9 6l6 6-6 6')}</>,
    x: <>{P('M6 6l12 12M18 6L6 18')}</>,
    pulse: <>{P('M3 12h4l2-6 4 14 2-8h6')}</>,
    palette: <>{P('M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z')}{P('M7.5 12.5h.01M10 8.5h.01M14 8h.01M16.5 11h.01')}</>,
    check: <>{P('M5 12.5l4.5 4.5L19 7')}</>,
    plus: <>{P('M12 5v14M5 12h14')}</>,
    filter: <>{P('M4 5h16l-6 7.5V19l-4 2v-8.5z')}</>,
    download: <>{P('M12 4v11')}{P('M8 11l4 4 4-4')}{P('M5 20h14')}</>,
    eye: <>{P('M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12z')}{P('M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z')}</>,
    file: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}</>,
    fileText: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}{P('M9.5 12h5M9.5 15.5h5')}</>,
    user: <>{P('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')}{P('M5 20a7 7 0 0 1 14 0')}</>,
    users: <>{P('M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z')}{P('M2.5 20a6.5 6.5 0 0 1 13 0')}{P('M16 4.2a3.5 3.5 0 0 1 0 6.8')}{P('M17.5 13.6a6.5 6.5 0 0 1 4 6.4')}</>,
    globe: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M3 12h18')}{P('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z')}</>,
    fingerprint: <>{P('M12 11v3a6 6 0 0 0 1.5 4')}{P('M8.5 7.5a6 6 0 0 1 9.5 4.9V14')}{P('M6 13v-1a6 6 0 0 1 .8-3')}{P('M9 19.5A8 8 0 0 1 7.5 15')}{P('M15.8 18.8c.1-.6.2-1.2.2-1.8')}</>,
    key: <>{P('M9 12a3.5 3.5 0 1 0 3.4 4.3L17 16.7l2 .3.3-2 1.7-.2v-2.3l-2.6-.1L9.9 11A3.5 3.5 0 0 0 9 12z')}</>,
    mail: <>{P('M4 6h16v12H4z')}{P('M4.5 7l7.5 5.5L19.5 7')}</>,
    phone: <>{P('M6 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4 6.2 2 2 0 0 1 6 4z')}</>,
    calendar: <>{P('M5 5h14v15H5z')}{P('M5 9.5h14')}{P('M9 3v4M15 3v4')}</>,
    send: <>{P('M4 11.5l16-7.5-7.5 16-2.5-6z')}{P('M10 14l3-3')}</>,
    bank: <>{P('M3 9l9-5 9 5')}{P('M5 9v9h14V9')}{P('M9 13v2M12 13v2M15 13v2')}</>,
    card: <>{P('M3 6.5h18v11H3z')}{P('M3 10.5h18')}{P('M6.5 14.5h3')}</>,
    bolt: <>{P('M13 3L5 13h6l-1 8 8-10h-6z')}</>,
    swap: <>{P('M5 8h12l-3-3')}{P('M19 16H7l3 3')}</>,
    clock: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M12 7.5V12l3 2')}</>,
    sparkles: <>{P('M12 4l1.6 4.2L18 10l-4.4 1.8L12 16l-1.6-4.2L6 10l4.4-1.8z')}{P('M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7z')}</>,
    edit: <>{P('M4 20h4L18 10l-4-4L4 16z')}{P('M13 7l4 4')}</>,
    target: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z')}{P('M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z')}</>,
    trophy: <>{P('M7 4h10v4a5 5 0 0 1-10 0z')}{P('M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3')}{P('M12 13v3M9 20h6M10 16h4')}</>,
    info: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M12 11v5M12 7.5h.01')}</>,
    flag: <>{P('M6 4v16')}{P('M6 4.5h11l-2.2 4 2.2 4H6')}</>,
    mapPin: <>{P('M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z')}{P('M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z')}</>,
    arrowRight: <>{P('M5 12h14')}{P('M13 6l6 6-6 6')}</>,
    arrowLeft: <>{P('M19 12H5')}{P('M11 6l-6 6 6 6')}</>,
    sidebar: <>{P('M4 5h16v14H4z')}{P('M9 5v14')}</>,
    book: <>{P('M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z')}{P('M5 4v19')}{P('M17 7h2v13h-3')}</>,
    home: <>{P('M4 11l8-6.5 8 6.5')}{P('M6 9.7V20h12V9.7')}{P('M10 20v-5h4v5')}</>,
    stats: <>{P('M3 20h18')}{P('M6 20v-7')}{P('M11 20V5')}{P('M16 20v-9')}{P('M20.5 20v-4')}</>,
    wallet: <>{P('M3 7.5h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1z')}{P('M3 7.5V6a1.5 1.5 0 0 1 1.5-1.5H16')}{P('M16.5 12.5h.5')}</>,
    certificate: <>{P('M12 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z')}{P('M9.2 12L8 21l4-2.2L16 21l-1.2-9')}</>,
    receipt: <>{P('M5 3h14v18l-2.4-1.6L13.8 21 12 19.4 10.2 21 7.4 19.4 5 21z')}{P('M8.5 8h7M8.5 11.5h7M8.5 15h4')}</>,
    monitor: <>{P('M3 5h18v11H3z')}{P('M9 20h6')}{P('M12 16v4')}</>,
    news: <>{P('M4 5h13v14H5a2 2 0 0 1-2-2V7')}{P('M17 9h3v8a2 2 0 0 1-2 2')}{P('M7 8.5h6M7 12h6M7 15h4')}</>,
    alert: <>{P('M12 3.5L21 19H3z')}{P('M12 9.5v4.5')}{P('M12 17h.01')}</>,
  };
  function Icon({ name, size = 20 }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }}>{ICONS[name]}</svg>;
  }

  // ---- Talero logo mark: signal-blue angular monogram (talero.com brand) ----
  function Logo({ size = 30, color = '#4fa3ff' }) {
    return (
      <svg width={size} height={size} viewBox="-1 -1 30 30" style={{ display: 'block' }} aria-label="Talero" fill={color}>
        <g transform="translate(0.039 0)"><path d="M 3.908 3.889 L 7.855 0 L 14.031 0 L 28.061 0 L 24.193 3.928 L 20.323 7.777 L 14.031 7.777 L 0 7.777 L 3.908 3.889 Z" /></g>
        <g transform="translate(0 8.711)"><path d="M 2.892 16.45 L 19.346 0 L 14.461 0 L 8.285 0 L 0 8.225 L 0 19.289 L 0.957 18.375 L 2.892 16.45 Z" /></g>
        <g transform="translate(20.284 8.711)"><path d="M 7.816 0 L 0 0 L 0 12.522 L 7.816 12.522 L 7.816 0 Z" /></g>
      </svg>
    );
  }

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'stats', label: 'Stats', icon: 'stats' },
    { id: 'accounts', label: 'Accounts', icon: 'wallet' },
    { id: 'funding', label: 'Funding & Withdrawals', icon: 'swap' },
    { id: 'certificates', label: 'Certificates', icon: 'certificate' },
    { id: 'billing', label: 'Billing', icon: 'receipt' },
    { id: 'statements', label: 'Statements & Documents', icon: 'fileText' },
    { id: 'platforms', label: 'Trading Platforms', icon: 'monitor' },
    { id: 'settings', label: 'Personal Settings', icon: 'gear' },
    { id: 'help', label: 'Help Center', icon: 'help', href: 'https://help.talero.com', external: true },
  ];

  function Sidebar({ active, onNav, collapsed, onToggle }) {
    return (
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="sb-top">
          <span className="sb-logo"><Logo size={28} /></span>
          {!collapsed && (
            <span className="sb-word">
              <b>Talero</b>
              <small>CLIENT DASHBOARD</small>
            </span>
          )}
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            n.external ? (
              <a key={n.id} className="navitem" href={n.href} target="_blank" rel="noopener noreferrer" title={collapsed ? n.label : ''}>
                <span className="navicon"><Icon name={n.icon || n.id} /></span>
                <span className="navlabel">{n.label}</span>
                {!collapsed && <span className="navext"><Icon name="open" size={13} /></span>}
              </a>
            ) : (
              <button key={n.id}
                className={'navitem' + (active === n.id ? ' active' : '')}
                onClick={() => onNav(n.id)} title={collapsed ? n.label : ''}>
                <span className="navicon"><Icon name={n.icon || n.id} /></span>
                <span className={'navlabel' + (n.blurLabel ? ' navlabel-blur' : '')}>{n.label}</span>
                {n.badge ? <span className="navbadge">{n.badge}</span> : null}
              </button>
            )
          ))}
        </nav>
        <button className="sb-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          <span className={'sb-toggle-ic' + (collapsed ? ' flip' : '')}><Icon name="chevron" size={16} /></span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    );
  }

  function BottomNav({ active, onNav }) {
    const ids = ['dashboard', 'stats', 'funding', 'billing', 'settings'];
    const items = ids.map((id) => NAV.find((n) => n.id === id));
    return (
      <nav className="bottomnav">
        {items.map((n) => (
          <button key={n.id} className={'bnav' + (active === n.id ? ' active' : '')} onClick={() => onNav(n.id)}>
            <Icon name={n.icon || n.id} size={22} />
            <span>{n.label.split(' ')[0]}</span>
            {n.badge ? <i className="bnav-dot" /> : null}
          </button>
        ))}
      </nav>
    );
  }

  function TopBar({ themeId, themes, onPickTheme, onToggleMode, isDark, account, onNav, app }) {
    const [open, setOpen] = useState(false);
    const [acctOpen, setAcctOpen] = useState(false);
    const [acctsOpen, setAcctsOpen] = useState(false);
    const [openAcct, setOpenAcct] = useState(false);
    const ACCTS = [
      { id: '1912208', type: 'Individual', state: 'active', cash: 12640.55, opened: 'May 12, 2026' },
      { id: '1912240', type: 'Entity — Castillo Capital LLC', state: 'active', cash: 46980.00, opened: 'May 20, 2026' },
    ];
    const STATES = (window.TDUI && window.TDUI.ACCT_STATE) || {};
    const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <header className="topbar">
        <div className="tb-brand">
          <span className="tb-mark"><Logo size={28} /></span>
        </div>

        <button className="tb-accts" onClick={() => setAcctsOpen(true)} title="Your accounts">
          <Icon name="wallet" size={16} />
          <span>Accounts</span>
          <span className="tb-accts-chev"><Icon name="chevron" size={13} /></span>
        </button>
        {acctsOpen && ReactDOM.createPortal((
          <div className="acctpick-modal" onClick={() => setAcctsOpen(false)}>
            <div className="acctpick-card" onClick={(e) => e.stopPropagation()}>
              <div className="acctpick-head">
                <div><div className="eyebrow">Your accounts</div><b>Accounts</b></div>
                <button className="soon-x" onClick={() => setAcctsOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
              </div>
              <div className="acctpick-list">
                {ACCTS.map((a) => {
                  const rs = a.id === ACCTS[0].id ? ((app && app.acctState) || 'active') : a.state;
                  const meta = STATES[rs] || { label: 'Active', tone: 'pos' };
                  return (
                    <div className="acctpick-row" key={a.id}>
                      <div className="acctpick-main" style={{ cursor: 'default' }}>
                        <div className="acctpick-top">
                          <span className="acct-id mono">#{a.id}</span>
                          <span className={'badge badge-' + meta.tone}><i className="badge-dot" />{meta.label}</span>
                        </div>
                        <div className="acctpick-meta"><span>{a.type}</span><span className="dotsep">·</span><span>Opened {a.opened}</span></div>
                        <div className="acctpick-cash">Cash balance <b className="mono">{money(a.cash)}</b></div>
                      </div>
                      <div className="acctpick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => { onNav('funding'); setAcctsOpen(false); }}>Fund</button>
                        <button className="btn btn-primary btn-sm" onClick={() => { onNav('stats'); setAcctsOpen(false); }}>View <Icon name="arrowRight" size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="acctpick-foot"><button className="btn btn-ghost btn-sm" onClick={() => { onNav('accounts'); setAcctsOpen(false); }}>Manage all accounts <Icon name="arrowRight" size={13} /></button></div>
            </div>
          </div>
        ), document.body)}

        <div className="tb-right">
          <button className="tb-icon tb-hasdot" title="Notifications"><Icon name="bell" size={18} /></button>
          <button className="tb-icon" onClick={onToggleMode} title="Toggle light / dark" aria-label="Toggle light / dark">
            <Icon name={isDark ? 'sun' : 'moon'} size={18} />
          </button>
          <button className="btn btn-ghost btn-sm tb-cta" onClick={() => setOpenAcct(true)}><Icon name="plus" size={14} /><span>Open account</span></button>
          <button className="btn btn-primary btn-sm tb-cta" onClick={() => onNav('funding')}><Icon name="download" size={14} /><span>Deposit</span></button>
          <div className="tb-user-wrap">
            <button className={'tb-user' + (acctOpen ? ' on' : '')} title={account.name} onClick={() => setAcctOpen((o) => !o)}>
              <span className="tb-avatar">JC</span>
              <span className="tb-user-meta">
                <b>{account.name}</b>
              </span>
              <span className={'tb-user-chev' + (acctOpen ? ' up' : '')}><Icon name="chevron" size={14} /></span>
            </button>
            {acctOpen && (
              <>
                <div className="tb-pop-scrim" onClick={() => setAcctOpen(false)} />
                <div className="tb-acct-pop">
                  <div className="tb-acct-head">
                    <span className="tb-acct-av">JC</span>
                    <div className="tb-acct-id">
                      <b>{account.name}</b>
                      <small>jordan.castillo@example.com</small>
                    </div>
                  </div>
                  <dl className="tb-acct-rows">
                    <div><dt>Account</dt><dd className="mono">#1912208</dd></div>
                    <div><dt>Type</dt><dd>Individual</dd></div>
                  </dl>
                  <div className="tb-acct-sec">
                    <button className="tb-acct-item" onClick={() => { onNav('plans'); setAcctOpen(false); }}><Icon name="sparkles" size={16} /><span>Plans</span><Icon name="chevron" size={13} /></button>
                    <button className="tb-acct-item" onClick={() => { onNav('billing'); setAcctOpen(false); }}><Icon name="pulse" size={16} /><span>Margin reqs</span><Icon name="chevron" size={13} /></button>
                    <button className="tb-acct-item" onClick={() => { onNav('billing'); setAcctOpen(false); }}><Icon name="receipt" size={16} /><span>Account fees</span><Icon name="chevron" size={13} /></button>
                  </div>
                  <div className="tb-acct-foot">
                    <button className="tb-acct-signout" onClick={() => { setAcctOpen(false); if (app && app.logout) app.logout(); }}><Icon name="logout" size={15} /> Log out</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {openAcct && window.TDUI.OpenAccountModal && <window.TDUI.OpenAccountModal onClose={() => setOpenAcct(false)} onContinue={() => onNav('accounts')} />}
      </header>
    );
  }

  window.TDShell = { Logo, Sidebar, TopBar, BottomNav, Icon, NAV };
})();
