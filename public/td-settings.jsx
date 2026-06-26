// td-settings.jsx — TAL-16 Personal Settings. Exposes TDPages.settings
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Seg, Badge, IconTile, KYC_STATE } = window.TDUI;

  const INFO = [
    ['Legal name', 'Jordan Castillo'], ['Email', 'jordan.castillo@example.com'],
    ['Mobile phone', '+1 (415) 555-0142'], ['Address', '240 Spear Street, Apt 1804'],
    ['City / State', 'San Francisco, California'], ['Postal code', '94105'], ['Country', 'United States'],
  ];
  const NOTIFS = [
    { k: 'dep', t: 'Deposit confirmed', on: true }, { k: 'wdi', t: 'Withdrawal initiated', on: true },
    { k: 'wdc', t: 'Withdrawal completed', on: true }, { k: 'margin', t: 'Margin call alert', on: true },
    { k: 'state', t: 'Account state change', on: true }, { k: 'sec', t: 'Security alert (login / 2FA change)', on: true },
    { k: 'tourn', t: 'Tournament registration confirmed', on: false },
  ];

  function KycTab({ app }) {
    const k = (app && app.kyc) || 'verified';
    const meta = KYC_STATE[k];
    const copy = {
      verified: 'Verification complete — your identity was verified by NinjaTrader Clearing through its Account Opening Process (CIP/KYC via LexisNexis & Alloy). No additional verification is needed for future accounts.',
      pending: 'Your documents are with NinjaTrader Clearing’s New Accounts team for review — typically a 1–2 business day SLA.',
      action: 'NinjaTrader Clearing needs one more document (government ID, proof of address within 90 days, or SSN/ITIN) to finish verifying your identity before your account can be activated.',
    }[k];
    return (
      <div className="settings-tabbody">
        <div className="kyc-status">
          <IconTile name={k === 'verified' ? 'security' : 'fingerprint'} tone={k === 'verified' ? 'accent' : 'muted'} />
          <div className="kyc-status-meta">
            <div className="kyc-status-top"><b>Identity verification</b><Badge tone={meta.tone} dot>{meta.label}</Badge></div>
            <p>{copy}</p>
          </div>
          {k === 'action' && <button className="btn btn-primary btn-sm">Resume verification</button>}
        </div>
      </div>
    );
  }

  function SettingsPage({ app }) {
    const [tab, setTab] = useState('account');
    const [notifs, setNotifs] = useState(() => Object.fromEntries(NOTIFS.map((n) => [n.k, n.on])));
    const [sms, setSms] = useState(true);

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="gear" size={20} /></div>
            <div>
              <div className="eyebrow">Account · Preferences</div>
              <h1 className="ph-title">Personal settings</h1>
              <p className="ph-sub">Manage your account settings and preferences.</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="seg-wrap">
            <Seg value={tab} onChange={setTab} options={[{ v: 'account', l: 'My Account' }, { v: 'security', l: 'Security' }, { v: 'notifs', l: 'Notifications' }]} />
          </div>

          {tab === 'account' && (
            <div className="settings-tabbody">
              <CardHead title="Personal information" sub="Contact our Support team to make changes to your personal details." />
              <dl className="datarow">
                {INFO.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            </div>
          )}

          {tab === 'security' && (
            <div className="settings-tabbody">
              <div className="ctrl-card" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
                <IconTile name="phone" tone="muted" />
                <div className="ctrl-meta"><b>Two-factor authentication</b><small>TOTP via authenticator app — enforced on every login.</small></div>
                <Badge tone="pos">Enforced</Badge>
                <button className="btn btn-ghost btn-sm">Configure 2FA</button>
              </div>
            </div>
          )}

          {tab === 'notifs' && (
            <div className="settings-tabbody">
              <CardHead title="Notifications" sub="Choose what Talero alerts you about." />
              <ul className="notif-list">
                {NOTIFS.map((n) => (
                  <li key={n.k}>
                    <span>{n.t}</span>
                    <button className={'switch' + (notifs[n.k] ? ' on' : '')} onClick={() => setNotifs((o) => ({ ...o, [n.k]: !o[n.k] }))} aria-label="Toggle"><i /></button>
                  </li>
                ))}
                <li className="notif-sms">
                  <span><b>SMS notifications</b><small>Receive critical alerts by text message.</small></span>
                  <button className={'switch' + (sms ? ' on' : '')} onClick={() => setSms((s) => !s)} aria-label="Toggle"><i /></button>
                </li>
              </ul>
            </div>
          )}
        </Card>
        <p className="fineprint">Brokerage account agreements are available on your Statements &amp; Documents page.</p>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.settings = SettingsPage;
})();
