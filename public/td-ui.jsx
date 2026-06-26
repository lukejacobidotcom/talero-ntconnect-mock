// td-ui.jsx — shared UI primitives used by the app shell and all pages.
// Exposes window.TDUI. Loaded after td-shell, before page files + td-app.
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;

  function Card({ className = '', children, ...rest }) {
    return <section className={'card ' + className} {...rest}>{children}</section>;
  }
  function CardHead({ eyebrow, title, right, sub }) {
    return (
      <div className="card-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && <h3 className="card-title">{title}</h3>}
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {right && <div className="card-head-right">{right}</div>}
      </div>
    );
  }
  function Seg({ value, options, onChange }) {
    return (
      <div className="seg" role="tablist">
        {options.map((o) => (
          <button key={o.v} role="tab" aria-selected={value === o.v}
            className={'seg-btn' + (value === o.v ? ' on' : '')} onClick={() => onChange(o.v)}>{o.l}</button>
        ))}
      </div>
    );
  }
  function Sel({ value, options, onChange, icon }) {
    return (
      <label className="sel">
        {icon && <span className="sel-ico"><Icon name={icon} size={15} /></span>}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span className="sel-chev"><Icon name="chevron" size={13} /></span>
      </label>
    );
  }

  // Page intro header (eyebrow · title · subtitle, optional right content + lead icon)
  function PageIntro({ icon, eyebrow, title, sub, right }) {
    return (
      <div className="pagehead">
        <div className="pagehead-l">
          {icon && <div className="ph-icon"><Icon name={icon} size={20} /></div>}
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1 className="ph-title">{title}</h1>
            {sub && <p className="ph-sub">{sub}</p>}
          </div>
        </div>
        {right && <div className="pagehead-r">{right}</div>}
      </div>
    );
  }

  // Status badge — tone: pos | neg | warn | info | neutral
  function Badge({ tone = 'neutral', children, dot }) {
    return <span className={'badge badge-' + tone}>{dot && <i className="badge-dot" />}{children}</span>;
  }

  // Rounded square icon tile
  function IconTile({ name, tone = 'accent', size = 18 }) {
    return <span className={'icontile tile-' + tone}><Icon name={name} size={size} /></span>;
  }

  // ---- account / KYC state model (shared by the Tweaks state simulator) ----
  const ACCT_STATE = {
    active: { label: 'Active', tone: 'pos' },
    restricted: { label: 'Restricted', tone: 'warn' },
    liqonly: { label: 'Liquidation Only', tone: 'neg' },
    suspended: { label: 'Suspended', tone: 'neg' },
  };
  const KYC_STATE = {
    verified: { label: 'Verified', tone: 'pos' },
    pending: { label: 'Pending Review', tone: 'info' },
    action: { label: 'Action Required', tone: 'warn' },
  };

  // generic empty state
  function Empty({ icon = 'file', title, children, action, onAction }) {
    return (
      <div className="empty">
        <span className="empty-ic"><Icon name={icon} size={24} /></span>
        {title && <b>{title}</b>}
        {children && <small>{children}</small>}
        {action && <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={onAction}>{action}</button>}
      </div>
    );
  }

  // persistent state banner row + margin/KYC banners, driven by the simulator
  function Banner({ tone, icon, title, children, action }) {
    return (
      <div className={'banner banner-' + tone}>
        <span className="banner-ic"><Icon name={icon} size={18} /></span>
        <div className="banner-body"><b>{title}</b><span>{children}</span></div>
        {action && <button className="btn btn-sm banner-act">{action}</button>}
      </div>
    );
  }
  function StateBanners({ app }) {
    if (!app) return null;
    const out = [];
    if (app.acctState === 'restricted')
      out.push(<Banner key="st" tone="warn" icon="alert" title="Account Restricted" action="Contact support">New orders and some actions are limited until this is resolved. Existing positions are unaffected.</Banner>);
    if (app.acctState === 'liqonly')
      out.push(<Banner key="st" tone="neg" icon="alert" title="Liquidation Only" action="Contact support">Your account may only reduce or close existing positions. Opening new positions is blocked.</Banner>);
    if (app.acctState === 'suspended')
      out.push(<Banner key="st" tone="neg" icon="lock" title="Account Suspended" action="Contact support">Trading and money movement are paused. Reach out to support to restore access.</Banner>);
    if (app.marginCall)
      out.push(<Banner key="mc" tone="neg" icon="alert" title="Margin Call" action="Add funds">Maintenance margin has crossed the threshold set by your FCM. Add funds or reduce exposure to avoid auto-liquidation.</Banner>);
    if (app.kyc === 'pending')
      out.push(<Banner key="kyc" tone="info" icon="info" title="Identity verification in review">Your KYC submission is being reviewed. Funding and trading unlock once verification completes.</Banner>);
    if (app.kyc === 'action')
      out.push(<Banner key="kyc" tone="warn" icon="alert" title="Action required: identity verification" action="Resume verification">We need one more document to verify your identity before your account can be activated.</Banner>);
    return out.length ? <div className="banners">{out}</div> : null;
  }

  // ---- "Open account" — choose a new trading account type (not registration) ----
  const ACCT_TYPES = [
    { id: 'individual', ic: 'user', t: 'Individual', d: 'A standard single-holder trading account.' },
    { id: 'joint', ic: 'users', t: 'Joint', d: 'Two account holders with shared ownership.' },
    { id: 'entity', ic: 'bank', t: 'Entity (LLC / Corp)', d: 'Trade under a registered business entity.' },
    { id: 'ira', ic: 'security', t: 'IRA', d: 'Tax-advantaged retirement account (cash only).' },
    { id: 'trust', ic: 'certificate', t: 'Trust', d: 'Held in the name of a trust.' },
  ];
  function OpenAccountModal({ onClose, onContinue }) {
    const [pick, setPick] = useState('individual');
    const [done, setDone] = useState(false);
    const sel = ACCT_TYPES.find((a) => a.id === pick);
    return ReactDOM.createPortal((
      <div className="acctpick-modal" onClick={onClose}>
        <div className="acctpick-card" onClick={(e) => e.stopPropagation()}>
          <div className="acctpick-head">
            <div><div className="eyebrow">Add to your profile</div><b>Open a new trading account</b></div>
            <button className="soon-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>
          {done ? (
            <div className="oa-done">
              <span className="oa-done-ic"><Icon name="check" size={22} /></span>
              <b>Opening your {sel.t} account</b>
              <small>NinjaTrader Clearing is provisioning a new {sel.t.toLowerCase()} account under your profile. You’ll see it in Accounts and get platform credentials once it’s ready (typically 1–2 business days).</small>
              <button className="btn btn-primary btn-sm" onClick={() => { setDone(false); onClose(); onContinue && onContinue(); }}>View accounts</button>
            </div>
          ) : (
            <>
              <p className="oa-intro">Choose the type of account to open. This adds a new trading account to your existing Talero profile — no new registration required.</p>
              <div className="oa-types">
                {ACCT_TYPES.map((a) => (
                  <button key={a.id} className={'oa-type' + (pick === a.id ? ' on' : '')} onClick={() => setPick(a.id)}>
                    <IconTile name={a.ic} tone={pick === a.id ? 'accent' : 'muted'} size={16} />
                    <span className="oa-type-t"><b>{a.t}</b><small>{a.d}</small></span>
                    <span className={'oa-radio' + (pick === a.id ? ' on' : '')} />
                  </button>
                ))}
              </div>
              <div className="oa-foot">
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => setDone(true)}><Icon name="plus" size={14} /> Open {sel.t} account</button>
              </div>
            </>
          )}
        </div>
      </div>
    ), document.body);
  }

  // ---- regulatory footer (collapsed/partial by default, expandable) ----
  function RegFooter() {
    const [open, setOpen] = useState(false);
    return (
      <footer className="reg-footer">
        <div className="reg-head">
          <span className="reg-title"><Icon name="info" size={13} /> Important regulatory information</span>
          <button className="reg-toggle" onClick={() => setOpen((o) => !o)}>{open ? 'Show less' : 'Show more'}<span className={'reg-chev' + (open ? ' up' : '')}><Icon name="chevron" size={13} /></span></button>
        </div>
        <div className={'reg-body' + (open ? '' : ' collapsed')}>
          <p><b>Important Regulatory Information:</b> MFB Capital, LLC is an introducing broker registered with the Commodity Futures Trading Commission (CFTC) and a Member of the National Futures Association (NFA). NFA ID: 0573109. Our principal place of business is 5800 Granite Parkway, Plano, TX 75024.</p>
          <p><b>Risk Disclosure Statement:</b> Trading futures and options on futures involves substantial risk of loss and is not suitable for all investors. You may lose all of your invested capital and may be required to deposit additional margin funds on short notice. Losses may exceed the amount of funds initially deposited.</p>
          <p>MFB is registered with the Commodity Futures Trading Commission (CFTC) as an introducing broker and is a member of the National Futures Association (NFA). We do not accept or hold customer funds. All customer accounts are carried and maintained by one or more Futures Commission Merchants (FCMs).</p>
          <p>Past performance is not indicative of future results. No representation is being made that any account will or is likely to achieve profits or losses similar to those discussed or shown. Information provided is for educational purposes only and does not constitute investment advice or a recommendation to trade.</p>
          <p>As required by CFTC Rule 1.55, you will receive the applicable FIA Combined Futures and Options Risk Disclosure Statement from the FCM prior to trading and should review it carefully.</p>
          <p><b>NFA Compliance:</b> As a Member of the National Futures Association, MFB Capital, LLC is subject to regulatory oversight. You may verify our registration status by visiting the NFA website at <a href="https://www.nfa.futures.org/basicnet/" target="_blank" rel="noopener noreferrer">NFA BASIC</a>. Any complaints may be filed with the NFA through their website or by calling (312) 781-1300. MFB Capital, LLC is required to provide all prospective clients with the most current versions of the CFTC risk disclosure documents prior to opening an account.</p>
        </div>
      </footer>
    );
  }

  // ---- platform credentials modal (shared by Stats + Accounts) ----
  function CredsModal({ onClose, account }) {
    const [show, setShow] = useState(false);
    const [copied, setCopied] = useState('');
    const email = (account && account.email) || 'jordan.castillo@example.com';
    const pass = (account && account.password) || 'Nt$9fK2pQ7w';
    const copy = (txt, which) => { try { navigator.clipboard.writeText(txt); } catch (e) {} setCopied(which); setTimeout(() => setCopied(''), 1200); };
    return ReactDOM.createPortal(
      <div className="creds-modal" onClick={onClose}>
        <div className="creds-card" onClick={(e) => e.stopPropagation()}>
          <div className="creds-head">
            <div><div className="eyebrow">NinjaTrader Clearing{account ? ` · #${account.id}` : ''}</div><b>Platform credentials</b></div>
            <button className="soon-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>
          <p className="creds-note">Use these to sign in to Fintevo / NinjaTrader. Keep them private — Talero will never ask for your password.</p>
          <div className="creds-grid">
            <div className="creds-row">
              <span className="creds-l">Email</span>
              <span className="creds-v mono">{email}</span>
              <button className="iconbtn iconbtn-sm" title="Copy" onClick={() => copy(email, 'u')}><Icon name={copied === 'u' ? 'check' : 'file'} size={14} /></button>
            </div>
            <div className="creds-row">
              <span className="creds-l">Password</span>
              <span className="creds-v mono">{show ? pass : '•••••••••••'}</span>
              <button className="iconbtn iconbtn-sm" title={show ? 'Hide' : 'Show'} onClick={() => setShow((s) => !s)}><Icon name="eye" size={14} /></button>
              <button className="iconbtn iconbtn-sm" title="Copy" onClick={() => copy(pass, 'p')}><Icon name={copied === 'p' ? 'check' : 'file'} size={14} /></button>
            </div>
          </div>
          <a className="btn btn-primary creds-open" href="https://fintevo.com" target="_blank" rel="noopener noreferrer"><span>Open Fintevo</span><Icon name="open" size={15} /></a>
        </div>
      </div>, document.body);
  }

  window.TDUI = { Card, CardHead, Seg, Sel, PageIntro, Badge, IconTile, Empty, Banner, StateBanners, ACCT_STATE, KYC_STATE, OpenAccountModal, CredsModal, RegFooter };
  window.TDStore = window.TDStore || { plan: 'standard', planTx: [] };
})();
