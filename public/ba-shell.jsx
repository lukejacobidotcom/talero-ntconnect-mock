// ba-shell.jsx — Talero Back Office chrome: logo, icon set, grouped sidebar, top bar.
// Exposes window.BAShell.
(function () {
  const { useState } = React;

  const P = (d) => <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />;
  const ICONS = {
    dashboard: <>{P('M4 13h7V4H4z')}{P('M13 20h7V4h-7z')}{P('M4 20h7v-4H4z')}</>,
    applications: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}{P('M9.5 12h5M9.5 15.5h3')}</>,
    customers: <>{P('M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z')}{P('M2.5 20a6.5 6.5 0 0 1 13 0')}{P('M16 4.2a3.5 3.5 0 0 1 0 6.8')}{P('M17.5 13.6a6.5 6.5 0 0 1 4 6.4')}</>,
    brokerage: <>{P('M3 9l9-5 9 5')}{P('M5 9v9h14V9')}{P('M9 13v2M12 13v2M15 13v2')}</>,
    search: <>{P('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z')}{P('M20 20l-3.5-3.5')}</>,
    funding: <>{P('M5 8h12l-3-3')}{P('M19 16H7l3 3')}</>,
    billing: <>{P('M5 3h14v18l-2.4-1.6L13.8 21 12 19.4 10.2 21 7.4 19.4 5 21z')}{P('M8.5 8h7M8.5 11.5h7M8.5 15h4')}</>,
    alert: <>{P('M12 3.5L21 19H3z')}{P('M12 9.5v4.5')}{P('M12 17h.01')}</>,
    audit: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}{P('M9.5 12h5M9.5 15.5h5')}{P('M9.5 9h2')}</>,
    blacklist: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M5.6 5.6l12.8 12.8')}</>,
    ip: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M3 12h18')}{P('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z')}</>,
    agreements: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}{P('M9.5 14.5l1.7 1.7 3.3-3.6')}</>,
    trophy: <>{P('M7 4h10v4a5 5 0 0 1-10 0z')}{P('M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3')}{P('M12 13v3M9 20h6M10 16h4')}</>,
    engagement: <>{P('M5 5h14v11H8l-4 4z')}{P('M8 9h8M8 12h5')}</>,
    cms: <>{P('M4 5h16v14H4z')}{P('M4 9h16')}{P('M7 7h.01')}</>,
    mail: <>{P('M4 6h16v12H4z')}{P('M4.5 7l7.5 5.5L19.5 7')}</>,
    link: <>{P('M9.5 14.5l5-5')}{P('M8 12l-2 2a3 3 0 0 0 4 4l2-2')}{P('M16 12l2-2a3 3 0 0 0-4-4l-2 2')}</>,
    business: <>{P('M4 20V8l6-4 6 4v12')}{P('M4 20h16')}{P('M16 11h4v9')}{P('M8 11h.01M12 11h.01M8 15h.01M12 15h.01')}</>,
    team: <>{P('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')}{P('M5 20a7 7 0 0 1 14 0')}</>,
    tax: <>{P('M7 3h10v18H7z')}{P('M10 7h4M10 11h4M10 15h2')}</>,
    chevron: <>{P('M9 6l6 6-6 6')}</>, x: <>{P('M6 6l12 12M18 6L6 18')}</>,
    bell: <>{P('M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z')}{P('M10 20a2 2 0 0 0 4 0')}</>,
    sun: <>{P('M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z')}{P('M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19')}</>,
    moon: <>{P('M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z')}</>,
    logout: <>{P('M15 4h4v16h-4')}{P('M10 8l-4 4 4 4')}{P('M6 12h10')}</>,
    plus: <>{P('M12 5v14M5 12h14')}</>, check: <>{P('M5 12.5l4.5 4.5L19 7')}</>,
    edit: <>{P('M4 20h4L18 10l-4-4L4 16z')}{P('M13 7l4 4')}</>, trash: <>{P('M5 7h14')}{P('M9 7V5h6v2')}{P('M7 7l1 13h8l1-13')}</>,
    eye: <>{P('M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12z')}{P('M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z')}</>,
    download: <>{P('M12 4v11')}{P('M8 11l4 4 4-4')}{P('M5 20h14')}</>,
    filter: <>{P('M4 5h16l-6 7.5V19l-4 2v-8.5z')}</>, calendar: <>{P('M5 5h14v15H5z')}{P('M5 9.5h14')}{P('M9 3v4M15 3v4')}</>,
    arrowRight: <>{P('M5 12h14')}{P('M13 6l6 6-6 6')}</>, arrowUpRight: <>{P('M7 17L17 7')}{P('M8 7h9v9')}</>,
    sort: <>{P('M8 9l4-4 4 4')}{P('M8 15l4 4 4-4')}</>, sortUp: <>{P('M8 14l4-4 4 4')}</>, sortDown: <>{P('M8 10l4 4 4-4')}</>,
    info: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M12 11v5M12 7.5h.01')}</>,
    lock: <>{P('M6 10V8a6 6 0 0 1 12 0v2')}{P('M5 10h14v10H5z')}{P('M12 14v3')}</>,
    shield: <>{P('M12 3l7 3v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6z')}{P('M9.5 12l1.8 1.8L15 10')}</>,
    flag: <>{P('M6 4v16')}{P('M6 4.5h11l-2.2 4 2.2 4H6')}</>,
    card: <>{P('M3 6.5h18v11H3z')}{P('M3 10.5h18')}{P('M6.5 14.5h3')}</>,
    bank: <>{P('M3 9l9-5 9 5')}{P('M5 9v9h14V9')}{P('M9 13v2M12 13v2M15 13v2')}</>,
    refresh: <>{P('M20 11a8 8 0 1 0-.6 4')}{P('M20 4v7h-7')}</>, phone: <>{P('M6 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4 6.2 2 2 0 0 1 6 4z')}</>,
    globe: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M3 12h18')}{P('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z')}</>,
    clock: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M12 7.5V12l3 2')}</>,
    doc: <>{P('M7 3h7l4 4v14H7z')}{P('M14 3v4h4')}</>, halt: <>{P('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}{P('M9 9h6v6H9z')}</>,
    play: <>{P('M8 5v14l11-7z')}</>, server: <>{P('M4 5h16v6H4z')}{P('M4 13h16v6H4z')}{P('M7.5 8h.01M7.5 16h.01')}</>,
    user: <>{P('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')}{P('M5 20a7 7 0 0 1 14 0')}</>,
    bolt: <>{P('M13 3L5 13h6l-1 8 8-10h-6z')}</>, news: <>{P('M4 5h13v14H5a2 2 0 0 1-2-2V7')}{P('M17 9h3v8a2 2 0 0 1-2 2')}{P('M7 8.5h6M7 12h6M7 15h4')}</>,
    menu: <>{P('M4 7h16M4 12h16M4 17h16')}</>,
  };
  function Icon({ name, size = 20 }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }}>{ICONS[name] || ICONS.info}</svg>;
  }

  function Logo({ size = 28, color = '#4fa3ff' }) {
    return (
      <svg width={size} height={size} viewBox="-1 -1 30 30" style={{ display: 'block' }} aria-label="Talero" fill={color}>
        <g transform="translate(0.039 0)"><path d="M 3.908 3.889 L 7.855 0 L 14.031 0 L 28.061 0 L 24.193 3.928 L 20.323 7.777 L 14.031 7.777 L 0 7.777 L 3.908 3.889 Z" /></g>
        <g transform="translate(0 8.711)"><path d="M 2.892 16.45 L 19.346 0 L 14.461 0 L 8.285 0 L 0 8.225 L 0 19.289 L 0.957 18.375 L 2.892 16.45 Z" /></g>
        <g transform="translate(20.284 8.711)"><path d="M 7.816 0 L 0 0 L 0 12.522 L 7.816 12.522 L 7.816 0 Z" /></g>
      </svg>
    );
  }

  // Grouped nav: each item { id, label, icon, badge?, tone? }
  const NAV_GROUPS = [
    { label: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    ]},
    { label: 'Clients', items: [
      { id: 'applications', label: 'Account Applications', icon: 'applications', badge: 7 },
      { id: 'customers', label: 'Customers', icon: 'customers' },
      { id: 'brokerage', label: 'Brokerage Accounts', icon: 'brokerage' },
      { id: 'entity', label: 'Entity Search', icon: 'search' },
    ]},
    { label: 'Money', items: [
      { id: 'funding', label: 'Funding & Withdrawals', icon: 'funding', badge: 4 },
      { id: 'transactions', label: 'Billing Transactions', icon: 'billing' },
      { id: 'marketdata', label: 'Market Data', icon: 'server' },
    ]},
    { label: 'Risk Controls', items: [
      { id: 'riskprofiles', label: 'Trading Risk', icon: 'shield' },
      { id: 'halts', label: 'Trading Halts', icon: 'halt', tone: 'warn' },
    ]},
    { label: 'Risk & Compliance', items: [
      { id: 'alerts', label: 'Alert Dashboard', icon: 'alert', badge: 5, tone: 'warn' },
      { id: 'audit', label: 'Audit Log', icon: 'audit' },
      { id: 'blacklister', label: 'Blacklister', icon: 'blacklist' },
      { id: 'ipauditor', label: 'IP Auditor', icon: 'ip' },
      { id: 'agreements', label: 'Agreements', icon: 'agreements' },
    ]},
    { label: 'Marketing & Content', items: [
      { id: 'tournaments', label: 'Tournaments', icon: 'trophy' },
      { id: 'engagement', label: 'Engagement Alerts', icon: 'engagement' },
      { id: 'cms', label: 'CMS Management', icon: 'cms' },
      { id: 'emails', label: 'Emails', icon: 'mail' },
      { id: 'shortlinks', label: 'Shortlinks', icon: 'link' },
    ]},
    { label: 'Administration', items: [
      { id: 'business', label: 'Business Admin', icon: 'business' },
      { id: 'team', label: 'Team Management', icon: 'team' },
      { id: 'tax', label: 'Tax Tracking', icon: 'tax' },
    ]},
  ];

  function Sidebar({ active, onNav, collapsed, onToggle, mobileOpen }) {
    return (
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' mobile-open' : '')}>
        <div className="sb-top">
          <span className="sb-logo"><Logo size={26} /></span>
          {!collapsed && (
            <span className="sb-word"><b>Talero</b><small>BACK OFFICE</small></span>
          )}
          {!collapsed && <span className="sb-admin-tag"><Icon name="lock" size={9} />ADMIN</span>}
        </div>
        <nav className="sidebar-nav scroll">
          {NAV_GROUPS.map((g) => (
            <React.Fragment key={g.label}>
              <div className="nav-group-label">{g.label}</div>
              {g.items.map((n) => (
                <button key={n.id} className={'navitem' + (active === n.id ? ' active' : '')}
                  onClick={() => onNav(n.id)} title={collapsed ? n.label : ''}>
                  <span className="navicon"><Icon name={n.icon} size={19} /></span>
                  <span className="navlabel">{n.label}</span>
                  {n.badge ? <span className={'navbadge' + (n.tone === 'warn' ? '' : ' muted')}>{n.badge}</span> : null}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <button className="sb-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          <span className={'sb-toggle-ic' + (collapsed ? ' flip' : '')}><Icon name="chevron" size={15} /></span>
          <span>Collapse</span>
        </button>
      </aside>
    );
  }

  function TopBar({ isDark, onToggleMode, onMenu, onLogout, q, setQ }) {
    const [open, setOpen] = useState(false);
    return (
      <header className="topbar">
        <button className="tb-icon" style={{ display: 'none' }} />
        <span className="tb-area"><span className="dot" />ADMIN AREA</span>
        <div className="tb-search">
          <BAShellIcon name="search" size={16} />
          <input placeholder="Search customers, accounts, transactions…" value={q} onChange={(e) => setQ(e.target.value)} />
          <kbd>⌘K</kbd>
        </div>
        <div className="tb-right">
          <button className="tb-icon tb-hasdot" title="Notifications"><Icon name="bell" size={18} /></button>
          <button className="tb-icon" onClick={onToggleMode} title="Toggle light / dark"><Icon name={isDark ? 'sun' : 'moon'} size={18} /></button>
          <div style={{ position: 'relative' }}>
            <button className="tb-user" onClick={() => setOpen((o) => !o)}>
              <span className="tb-avatar">RM</span>
              <span className="tb-user-meta"><b>Riley Morgan</b><small>Compliance Officer</small></span>
              <Icon name="chevron" size={13} />
            </button>
            {open && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 230, background: 'var(--panel)',
                  border: '1px solid var(--line-strong)', borderRadius: 13, boxShadow: 'var(--shadow)', zIndex: 41, padding: 8 }}>
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--line)' }}>
                    <b style={{ fontSize: 13 }}>Riley Morgan</b>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>riley.morgan@talero.com</div>
                    <div style={{ marginTop: 7 }}><span className="badge badge-pos"><i className="badge-dot" />2FA enabled</span></div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', marginTop: 6, border: 0 }} onClick={onLogout}>
                    <Icon name="logout" size={15} /> Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }
  // small helper so TopBar can use Icon before definition order issues
  function BAShellIcon(props) { return <Icon {...props} />; }

  window.BAShell = { Logo, Icon, Sidebar, TopBar, NAV_GROUPS };
})();
