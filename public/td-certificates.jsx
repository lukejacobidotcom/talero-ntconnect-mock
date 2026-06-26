// td-certificates.jsx — TAL-14 Withdrawal Certificates. Exposes TDPages.certificates
(function () {
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, Empty } = window.TDUI;

  const CERTS = [
    { id: 'WC-20260518', amount: '$2,500.00', date: 'May 18, 2026', void: false },
    { id: 'WC-20260502', amount: '$1,200.00', date: 'May 02, 2026', void: false },
    { id: 'WC-20260415', amount: '$800.00', date: 'Apr 15, 2026', void: true },
  ];

  function CertCard({ c }) {
    return (
      <div className={'cert-card' + (c.void ? ' void' : '')}>
        <div className="cert-preview">
          <span className="cert-mark"><Icon name="certificate" size={26} /></span>
          <span className="cert-brand">TALERO</span>
          <span className="cert-amt mono">{c.amount}</span>
          <span className="cert-cap">Withdrawal certificate</span>
          {c.void && <span className="cert-voidmark">VOID</span>}
        </div>
        <div className="cert-foot">
          <div className="cert-meta"><b className="mono">{c.amount}</b><small>Completed {c.date} · {c.id}</small></div>
          <button className="btn btn-ghost btn-sm" disabled={c.void}><Icon name="download" size={13} /> Download</button>
        </div>
      </div>
    );
  }

  function CertificatesPage({ app }) {
    const empty = app && app.dataMode === 'new';
    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="certificate" size={20} /></div>
            <div>
              <div className="eyebrow">Records</div>
              <h1 className="ph-title">Withdrawal certificates</h1>
              <p className="ph-sub">A certificate is generated automatically each time a withdrawal completes. Download a PDF for your records.</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHead title={empty ? 'Certificates' : CERTS.length + ' certificates'} sub="Newest first. Certificates for reversed withdrawals are kept but marked void." />
          {empty
            ? <Empty icon="certificate" title="No certificates yet">Your withdrawal certificates will appear here once your first withdrawal is completed.</Empty>
            : <div className="cert-grid">{CERTS.map((c) => <CertCard key={c.id} c={c} />)}</div>}
        </Card>
        <p className="fineprint">Certificates are download-only — there is no public sharing. <span className="muted">[certificate template is a placeholder — pending Design]</span></p>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.certificates = CertificatesPage;
})();
