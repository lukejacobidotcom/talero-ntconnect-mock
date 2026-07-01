// ba-pages-overview.jsx — Admin Dashboard landing (TAL-23). Registers BAPages.dashboard.
(function () {
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, Kpi, IconTile, StatusPill, Badge } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  function QueueRow({ icon, tone, title, sub, count, onNav }) {
    return (
      <div className="qrow">
        <IconTile name={icon} tone={tone} size={17} />
        <div className="q-meta"><b>{title}</b><small>{sub}</small></div>
        <span className={'q-count ' + (tone === 'neg' ? 'neg' : tone === 'warn' ? '' : '')} style={tone === 'warn' ? { color: 'var(--warn)' } : {}}>{count}</span>
        <button className="iconbtn iconbtn-sm" title="Open" onClick={onNav}><Icon name="arrowRight" size={14} /></button>
      </div>
    );
  }

  function Dashboard({ onNav }) {
    const pendingWdr = D.withdrawals.filter((w) => w.status === 'Pending Review').length;
    const kycPending = D.customers.filter((c) => c.kyc === 'Pending Review').length;
    const openApps = D.applications.filter((a) => a.status !== 'Active' && a.status !== 'Rejected').length;
    const openFlags = D.flags.filter((f) => f.review === 'Open').length;
    const restricted = D.brokerageAccounts.filter((a) => a.status !== 'Active').length;

    return (
      <div className="page">
        <PageIntro icon="dashboard" eyebrow="Back office · Overview"
          title="Operations Dashboard"
          sub="Your starting point for the day. Live counts across onboarding, money movement, and compliance — every figure links straight to the page that actions it."
          right={<div className="row-wrap"><Badge tone="info" dot>NinjaTrader · v1 FCM</Badge><span className="badge badge-neutral">Updated 2m ago</span></div>} />

        <div className="kpi-grid">
          <Kpi label="Open applications" value={openApps} sub="In onboarding pipeline" icon="applications" iconTone="info" onClick={() => onNav('applications')} />
          <Kpi label="Withdrawals pending review" value={pendingWdr} sub="Awaiting NTC Treasury" icon="funding" iconTone="warn" tone={pendingWdr ? '' : ''} onClick={() => onNav('funding')} />
          <Kpi label="KYC in review" value={kycPending} sub="Identity verification" icon="shield" iconTone="info" onClick={() => onNav('customers')} />
          <Kpi label="Open risk flags" value={openFlags} sub="Awaiting manual review" icon="alert" iconTone="neg" tone="neg" onClick={() => onNav('alerts')} />
          <Kpi label="Active brokerage accounts" value={D.brokerageAccounts.filter((a) => a.status === 'Active').length} sub={`${restricted} restricted / limited`} icon="brokerage" iconTone="accent" onClick={() => onNav('brokerage')} />
          <Kpi label="Deposits today" value={D.money(72000)} sub="6 transfers · gross" icon="bank" iconTone="pos" onClick={() => onNav('funding')} />
        </div>

        <div className="grid-2-13">
          <Card flush>
            <CardHead title="Action queues" sub="Items waiting on an operator." right={<button className="btn btn-ghost btn-sm" onClick={() => onNav('applications')}>Go to onboarding</button>} />
            <div style={{ padding: '0 20px 14px' }}>
              <div className="qlist">
                <QueueRow icon="applications" tone="info" title="Account applications in progress" sub="KYC, agreements & funding stages" count={openApps} onNav={() => onNav('applications')} />
                <QueueRow icon="funding" tone="warn" title="Withdrawals pending review" sub="Read-only — processed by NTC Treasury" count={pendingWdr} onNav={() => onNav('funding')} />
                <QueueRow icon="alert" tone="neg" title="Risk flags to review" sub="Duplicate cards, KYC & jurisdiction" count={openFlags} onNav={() => onNav('alerts')} />
                <QueueRow icon="shield" tone="info" title="KYC submissions in review" sub="Pending identity verification" count={kycPending} onNav={() => onNav('customers')} />
                <QueueRow icon="agreements" tone="accent" title="Agreements awaiting signature" sub="Talero-specific disclosures" count={3} onNav={() => onNav('agreements')} />
              </div>
            </div>
          </Card>

          <div className="stack">
            <Card flush>
              <CardHead title="Recent admin activity" sub="From the immutable Audit Log." right={<button className="btn btn-ghost btn-sm" onClick={() => onNav('audit')}>Full log</button>} />
              <div style={{ padding: '0 20px 8px' }}>
                {D.audit.slice(0, 5).map((a) => (
                  <div className="qrow" key={a.id}>
                    <IconTile name={a.kind === 'trading' ? 'brokerage' : a.kind === 'user' ? 'customers' : 'shield'} tone={a.kind === 'trading' ? 'accent' : a.kind === 'user' ? 'info' : 'violet'} size={15} />
                    <div className="q-meta"><b style={{ fontSize: 12.5 }}>{a.action}</b><small>{a.user} · {a.when}</small></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHead title="Account states" sub="PRD §8 lifecycle set." />
              <div className="stack" style={{ gap: 10 }}>
                {['Active', 'Restricted', 'Liquidation Only', 'Suspended'].map((s) => {
                  const n = D.brokerageAccounts.filter((a) => a.status === s).length;
                  return <div className="perm-row" key={s} style={{ fontSize: 13 }}><StatusPill value={s} /><span className="perm-n">{n}</span></div>;
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  window.BAPages.dashboard = Dashboard;
})();
