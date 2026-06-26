// td-statements.jsx — TAL-18 Statements & Documents (client dashboard).
// Reframed around the NinjaTrader REST document model:
//   • Agreements/disclosures  → Get Agreement Document (render inline) · Sign Agreement Documents · Get Localized Agreement Document
//   • Signed records          → Get User Signed Document / User Signed Document List
//   • Tax (W-8)               → Download W-8 Certification Document · Sign W-8
//   • Statements              → NO REST endpoint → GCP file-delivery pipeline (native) + NinjaTrader Dashboards fallback
// Every document carries an explicit ACTION: 'read' (read-only) · 'sign' (signature required) · 'signed'.
// Exposes TDPages.statements
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, Sel, Seg, Badge, Empty } = window.TDUI;

  const SIGNER = 'Jordan Castillo';
  const ACCT = '#1912208';

  // ---- action classification (the core of this page) ----
  const ACTION = {
    read:   { label: 'Read-only',          tone: 'info', ic: 'eye' },
    sign:   { label: 'Signature required', tone: 'warn', ic: 'edit' },
    signed: { label: 'Signed',             tone: 'pos',  ic: 'check' },
  };

  // ---- document corpus ----
  // group: 'statements' | 'agreements' | 'tax'
  // action: 'read' | 'sign' | 'signed' (statements use action 'statement')
  // endpoint: backing NinjaTrader REST endpoint (surfaced to the user as provenance)
  // body: inline-rendered content (what Get Agreement Document returns)
  const INIT_DOCS = [
    // ===== Trade statements (no REST endpoint — GCP-delivered, hosted natively) =====
    { id: 's1', date: 'Jun 09, 2026', name: 'Daily Statement', meta: 'Jun 09, 2026', cat: 'Daily', group: 'statements', sub: 'daily' },
    { id: 's2', date: 'Jun 06, 2026', name: 'Daily Statement', meta: 'Jun 06, 2026', cat: 'Daily', group: 'statements', sub: 'daily' },
    { id: 's3', date: 'Jun 05, 2026', name: 'Daily Statement', meta: 'Jun 05, 2026', cat: 'Daily', group: 'statements', sub: 'daily' },
    { id: 's4', date: 'May 31, 2026', name: 'Monthly Statement — May 2026', meta: 'Statement period May 2026', cat: 'Monthly', group: 'statements', sub: 'monthly' },
    { id: 's5', date: 'Apr 30, 2026', name: 'Monthly Statement — April 2026', meta: 'Statement period Apr 2026', cat: 'Monthly', group: 'statements', sub: 'monthly' },
    { id: 's6', date: 'Dec 31, 2025', name: 'Annual Statement — 2025', meta: 'Tax year 2025', cat: 'Annual', group: 'statements', sub: 'annual' },

    // ===== Agreements & disclosures (Get Agreement Document / Sign Agreement Documents) =====
    {
      id: 'a1', date: 'Action required', name: 'Updated Customer Agreement (v2026.2)', cat: 'Agreement',
      group: 'agreements', sub: 'sign', action: 'sign', langs: ['English', 'Español', 'Français'],
      endpoint: 'Get Agreement Document → Sign Agreement Documents',
      body: [
        'This Customer Agreement (the "**Agreement**") is entered into between you (the "**Customer**") and NinjaTrader Clearing, LLC ("**NTC**"), the Futures Commission Merchant carrying your account, introduced by Talero.',
        'Version 2026.2 updates the margin and liquidation provisions of Section 7 and the electronic-communications consent of Section 12. By signing below you acknowledge that you have read, understood, and agree to be bound by the revised terms.',
        '**7. Margin & Liquidation.** Customer shall maintain margin as required by NTC. NTC may, without prior notice, liquidate positions to satisfy a margin deficiency. Intraday breaches of the maintenance threshold may be liquidated without notice.',
        '**12. Electronic Delivery.** Customer consents to receive all confirmations, statements, disclosures, and tax documents electronically through the Talero dashboard.',
      ],
    },
    {
      id: 'a2', date: 'Optional', name: 'Pre-Dispute Arbitration Agreement', cat: 'Agreement',
      group: 'agreements', sub: 'sign', action: 'sign', langs: ['English', 'Español'],
      endpoint: 'Get Agreement Document → Sign Agreement Documents',
      body: [
        'This Arbitration Agreement is **optional** and is not a condition of opening or maintaining your account.',
        'By signing, the Customer agrees that any controversy arising out of the account shall be resolved by binding arbitration before the National Futures Association or other designated forum, rather than in court.',
        'You may decline to sign this agreement without affecting your ability to trade.',
      ],
    },
    {
      id: 'a3', date: 'May 12, 2026', name: 'NTC Customer Agreement (v2026.1)', cat: 'Agreement',
      group: 'agreements', sub: 'signed', action: 'signed', signedOn: 'May 12, 2026', langs: ['English'],
      endpoint: 'Get User Signed Document',
      body: [
        'This Customer Agreement governs the relationship between the Customer and NinjaTrader Clearing, LLC for the carrying of the Customer\'s futures account introduced by Talero.',
        'The Customer acknowledges the risks of trading futures and authorizes NTC to act on instructions transmitted through the Talero platform.',
      ],
    },
    {
      id: 'a4', date: 'May 12, 2026', name: 'NFA Risk Disclosure Statement', cat: 'Disclosure',
      group: 'agreements', sub: 'signed', action: 'signed', signedOn: 'May 12, 2026', langs: ['English'],
      endpoint: 'Get User Signed Document',
      body: [
        'The risk of loss in trading commodity futures contracts can be substantial. You should therefore carefully consider whether such trading is suitable in light of your financial condition.',
        'You may sustain a total loss of the funds that you deposit with your broker and may be required to deposit additional funds on short notice to maintain your position.',
      ],
    },
    {
      id: 'a5', date: 'May 12, 2026', name: 'Non-Professional Market Data Agreement', cat: 'Agreement',
      group: 'agreements', sub: 'signed', action: 'signed', signedOn: 'May 12, 2026', langs: ['English'],
      endpoint: 'Get User Signed Document',
      body: [
        'By executing this agreement you certify that you qualify as a Non-Professional Subscriber under the rules of the relevant exchanges and will use market data solely for your personal, non-commercial use.',
        'Misrepresentation of subscriber status may result in retroactive professional data fees assessed by the exchanges.',
      ],
    },
    {
      id: 'a6', date: 'Jun 01, 2026', name: 'Fee Schedule Notice', cat: 'Notice',
      group: 'agreements', sub: 'read', action: 'read', langs: ['English'],
      endpoint: 'Get Agreement Document',
      body: [
        'This notice summarizes the commissions, exchange fees, NFA assessment fees, and platform fees applicable to your account effective June 1, 2026.',
        'No signature is required. This document is provided for your records.',
      ],
    },
    {
      id: 'a7', date: 'Apr 18, 2026', name: 'Margin Requirement Notice', cat: 'Notice',
      group: 'agreements', sub: 'read', action: 'read', langs: ['English'],
      endpoint: 'Get Agreement Document',
      body: [
        'Initial and maintenance margin requirements are set by NinjaTrader Clearing and may exceed exchange minimums. Requirements may change without notice in response to market volatility.',
        'No signature is required. This document is provided for your records.',
      ],
    },

    // ===== Tax forms (W-8 has dedicated endpoints) =====
    {
      id: 't1', date: 'Action required', name: 'W-8BEN Certification (2026 renewal)', cat: 'Tax',
      group: 'tax', sub: 'sign', action: 'sign', langs: ['English', 'Español'],
      endpoint: 'Download W-8 Certification Document → Sign W-8',
      body: [
        'The IRS Form W-8BEN certifies that you are not a U.S. person and, where applicable, claims a reduced rate of withholding under an income-tax treaty.',
        'Your W-8BEN on file expires December 31, 2026. Re-certify now to avoid a lapse that would trigger default backup withholding.',
        '**Part II — Claim of Treaty Benefits.** Country of residence and treaty article as previously declared. Review and re-sign to confirm no change in circumstances.',
      ],
    },
    {
      id: 't2', date: 'May 12, 2026', name: 'W-8BEN Certification (on file)', cat: 'Tax',
      group: 'tax', sub: 'signed', action: 'signed', signedOn: 'May 12, 2026', langs: ['English'],
      endpoint: 'Download W-8 Certification Document',
      body: [
        'Form W-8BEN — Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting (Individuals).',
        'This is the executed certification currently on file for your account.',
      ],
    },
    {
      id: 't3', date: 'Feb 15, 2026', name: '1099-B (2025 tax year)', cat: 'Tax',
      group: 'tax', sub: 'read', action: 'read', langs: ['English'],
      endpoint: 'GCP file delivery',
      body: [
        'Form 1099-B reports proceeds from broker and barter exchange transactions for tax year 2025, as furnished by NinjaTrader Clearing.',
        'No signature is required. Retain for your tax records.',
      ],
    },
    {
      id: 't4', date: 'Feb 15, 2026', name: '1099 Composite (2025 tax year)', cat: 'Tax',
      group: 'tax', sub: 'read', action: 'read', langs: ['English'],
      endpoint: 'GCP file delivery',
      body: [
        'Your 2025 composite tax statement consolidating 1099 reporting for the account.',
        'No signature is required. Retain for your tax records.',
      ],
    },
  ];

  const CAT_TONE = { Daily: 'info', Monthly: 'accent', Annual: 'warn', Tax: 'violet', Notice: 'info', Agreement: 'pos', Disclosure: 'pos' };

  const GROUPS = [
    { v: 'statements', l: 'Trade Statements' },
    { v: 'agreements', l: 'Agreements & Disclosures' },
    { v: 'tax', l: 'Tax Forms' },
  ];
  const SUBFILTERS = {
    statements: [{ v: 'all', l: 'All statements' }, { v: 'daily', l: 'Daily' }, { v: 'monthly', l: 'Monthly' }, { v: 'annual', l: 'Annual' }],
    agreements: [{ v: 'all', l: 'All' }, { v: 'sign', l: 'Signature required' }, { v: 'signed', l: 'Signed' }, { v: 'read', l: 'Read-only' }],
    tax: [{ v: 'all', l: 'All tax forms' }, { v: 'sign', l: 'Signature required' }, { v: 'signed', l: 'Signed' }, { v: 'read', l: 'Read-only' }],
  };
  const GROUP_NOUN = { statements: 'statements', agreements: 'documents', tax: 'tax forms' };

  /* ============ inline document reader / e-sign drawer ============ */
  function DocReader({ doc, onClose, onSigned }) {
    const isSignable = doc.action === 'sign';
    const [lang, setLang] = useState((doc.langs && doc.langs[0]) || 'English');
    const [agreed, setAgreed] = useState(false);
    const [name, setName] = useState('');
    const [signing, setSigning] = useState(false);
    const [done, setDone] = useState(false);

    const canSign = agreed && name.trim().length >= 3 && !signing;
    function doSign() {
      if (!canSign) return;
      setSigning(true);
      setTimeout(() => { setSigning(false); setDone(true); onSigned && onSigned(doc.id); }, 1300);
    }
    const isW8 = doc.group === 'tax';

    return ReactDOM.createPortal((
      <div className="doc-reader" onClick={onClose}>
        <div className="dr-card" onClick={(e) => e.stopPropagation()}>
          <div className="dr-head">
            <span className="dr-tile"><Icon name={doc.group === 'tax' ? 'fileText' : doc.action === 'signed' ? 'check' : 'fileText'} size={18} /></span>
            <div className="dr-head-t">
              <b>{doc.name}</b>
              <small>{ACCT} · {doc.endpoint}</small>
            </div>
            {doc.langs && doc.langs.length > 1 && !done && (
              <div className="dr-lang">
                <Sel value={lang} onChange={setLang} icon="globe" options={doc.langs.map((l) => ({ v: l, l }))} />
              </div>
            )}
            <button className="soon-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>

          {done ? (
            <div className="dr-foot"><div className="dr-success">
              <span className="ic"><Icon name="check" size={24} /></span>
              <b>{isW8 ? 'W-8 certification signed' : 'Document signed'}</b>
              <p>Your signature was recorded with NinjaTrader Clearing via <b>{isW8 ? 'Sign W-8' : 'Sign Agreement Documents'}</b>. A signed copy is now in your document history and available to download.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
                <button className="btn btn-primary btn-sm" onClick={onClose}><Icon name="download" size={13} /> Download signed copy</button>
              </div>
            </div></div>
          ) : (
            <>
              <div className="dr-doc">
                <div className="dr-paper">
                  <h4>{doc.name}</h4>
                  <div className="dr-meta">{lang !== 'English' ? lang + ' · ' : ''}Rendered from NinjaTrader Clearing · {doc.endpoint.split(' →')[0]}</div>
                  {doc.body.map((para, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                  ))}
                  {doc.action === 'signed' && (
                    <div className="dr-signedmark">
                      <Icon name="check" size={16} />
                      <div><b>Signed by {SIGNER}</b><small>Executed {doc.signedOn} · retained by NinjaTrader Clearing</small></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="dr-foot">
                {isSignable ? (
                  <div className="dr-sign-block">
                    <label className="dr-ack">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                      <span>I have read and agree to the {doc.name}{isW8 ? ', and certify under penalties of perjury that the information is true and correct' : ''}.</span>
                    </label>
                    <div className="dr-sign-row">
                      <label className="fld">
                        <span className="fld-l">Type your full legal name to sign</span>
                        <input placeholder="Jordan Castillo" value={name} onChange={(e) => setName(e.target.value)} />
                      </label>
                      <button className={'btn btn-primary' + (signing ? ' is-loading' : '')} disabled={!canSign} onClick={doSign}>
                        <Icon name={signing ? 'clock' : 'edit'} size={14} />
                        <span>{signing ? 'Recording…' : isW8 ? 'Sign W-8' : 'Sign document'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dr-foot-simple">
                    <span className="dr-note">{doc.action === 'signed' ? 'Signed record pulled via Get User Signed Document.' : 'Read-only — no signature required.'}</span>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
                    <button className="btn btn-primary btn-sm" onClick={onClose}><Icon name="download" size={13} /> Download PDF</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    ), document.body);
  }

  /* ============ page ============ */
  function StatementsPage({ app }) {
    const [docs, setDocs] = useState(INIT_DOCS);
    const [group, setGroup] = useState('statements');
    const [sub, setSub] = useState('all');
    const [range, setRange] = useState('90');
    const [q, setQ] = useState('');
    const [reading, setReading] = useState(null); // doc being read/signed
    const [dl, setDl] = useState(null);            // id mid-download
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);

    const empty = app && app.dataMode === 'new';
    const error = app && app.dataMode === 'error';

    const setGroupReset = (g) => { setGroup(g); setSub('all'); setExported(false); };

    // signature-required across the whole account (drives the action bar + attention)
    const needsSign = docs.filter((d) => d.action === 'sign');
    const signedCount = docs.filter((d) => d.action === 'signed').length;

    const shown = docs.filter((d) =>
      d.group === group &&
      (sub === 'all' || d.sub === sub) &&
      (q === '' || (d.name + (d.cat || '')).toLowerCase().includes(q.toLowerCase()))
    );
    const exportable = shown.filter((d) => d.action !== 'sign');

    function markSigned(id) {
      setDocs((ds) => ds.map((d) => d.id === id
        ? { ...d, action: 'signed', sub: 'signed', date: 'Today', signedOn: 'Today', endpoint: d.group === 'tax' ? 'Download W-8 Certification Document' : 'Get User Signed Document' }
        : d));
    }
    function download(id) {
      if (dl) return;
      setDl(id);
      setTimeout(() => setDl(null), 1200);
    }
    function exportAll() {
      if (exporting || !exportable.length) return;
      setExporting(true); setExported(false);
      setTimeout(() => { setExporting(false); setExported(true); }, 1400);
    }
    function jumpToSign() {
      // surface the first item needing signature
      const first = needsSign[0];
      if (!first) return;
      setGroup(first.group); setSub('all'); setReading(first);
    }

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="fileText" size={20} /></div>
            <div>
              <div className="eyebrow">Records · Documents</div>
              <h1 className="ph-title">Statements &amp; documents</h1>
              <p className="ph-sub">Read, sign, and download your account documents without leaving Talero. Agreements and tax forms are pulled from and recorded back to NinjaTrader Clearing, the FCM that carries your account.</p>
            </div>
          </div>
          <div className="pagehead-r">
            <Sel value={range} onChange={setRange} icon="calendar"
              options={[{ v: '30', l: 'Last 30 days' }, { v: '90', l: 'Last 90 days' }, { v: 'ytd', l: 'Year to date' }, { v: 'all', l: 'All (7 years)' }]} />
            <button className={'btn btn-primary btn-sm' + (exporting ? ' is-loading' : '')} onClick={exportAll} disabled={exporting || !exportable.length}>
              <Icon name={exported ? 'check' : 'download'} size={14} />
              <span>{exporting ? 'Preparing ZIP…' : exported ? 'Exported' : `Export all (${exportable.length})`}</span>
            </button>
          </div>
        </div>

        {/* action summary — assigns every document to read / sign / signed */}
        <div className="doc-actionbar">
          <div className={'doc-stat' + (needsSign.length ? ' alert' : ' ok')}>
            <span className="doc-stat-ic"><Icon name="edit" size={16} /></span>
            <div>
              <div className="doc-stat-n">{needsSign.length}</div>
              <div className="doc-stat-l">Need your signature</div>
            </div>
            {needsSign.length > 0 && <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={jumpToSign}>Review &amp; sign</button>}
          </div>
          <div className="doc-stat ok">
            <span className="doc-stat-ic"><Icon name="check" size={16} /></span>
            <div><div className="doc-stat-n">{signedCount}</div><div className="doc-stat-l">Signed &amp; on file</div></div>
          </div>
          <div className="doc-stat">
            <span className="doc-stat-ic"><Icon name="fileText" size={16} /></span>
            <div><div className="doc-stat-n">{docs.filter((d) => d.group === 'statements').length}</div><div className="doc-stat-l">Statements available</div></div>
          </div>
        </div>

        <Card>
          <div className="seg-wrap">
            <Seg value={group} onChange={setGroupReset} options={GROUPS} />
          </div>

          {/* statements delivery model — no REST endpoint */}
          {group === 'statements' && (
            <div className="stmt-callout">
              <span className="ci"><Icon name="info" size={16} /></span>
              <div className="cb">
                <b>Statements are delivered, not generated on demand</b>
                <p>There is no statement API. Daily, monthly, and annual statements are pushed to Talero through NinjaTrader’s GCP file-delivery pipeline after end-of-day processing (typically by 10pm CST) and hosted here for native download. If a recent file hasn’t synced yet, you can view it directly in NinjaTrader’s dashboard.</p>
              </div>
              <a className="dash-link" href="https://clearing.ninjatrader.com" target="_blank" rel="noopener noreferrer">NinjaTrader dashboard <Icon name="open" size={13} /></a>
            </div>
          )}
          {group !== 'statements' && needsSign.length > 0 && (
            <div className="docnote" style={{ marginTop: 0, marginBottom: 14 }}>
              <Icon name="info" size={14} /> Documents marked <b>Signature required</b> open inline for you to read and e-sign — your signature is recorded back to NinjaTrader Clearing. Signed and read-only documents can be downloaded any time.
            </div>
          )}

          <div className="stmt-toolbar">
            <Sel value={sub} options={SUBFILTERS[group]} onChange={(v) => { setSub(v); setExported(false); }} icon="filter" />
            <label className="tb-search doc-search"><Icon name="search" size={15} /><input placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <span className="updated">Retained 7 years by your FCM</span>
          </div>

          {error ? (
            <div className="errorcard" style={{ boxShadow: 'none', border: 0, padding: '24px 0' }}>
              <span className="errorcard-ic"><Icon name="alert" size={20} /></span>
              <div><b>Can’t reach your FCM document service</b><small>Last sync 14:38 ET. Try again shortly.</small></div>
              <button className="btn btn-sm">Retry</button>
            </div>
          ) : empty ? (
            <Empty icon="fileText" title="No documents yet">Statements and agreements will appear here once your account is active.</Empty>
          ) : shown.length === 0 ? (
            <Empty icon="fileText" title="Nothing here yet">No {GROUP_NOUN[group]} match this filter.</Empty>
          ) : (
            <div className="stmt-table">
              <div className="stmt-head"><span>Document</span><span>Status</span><span>Date</span><span>Account</span><span></span></div>
              {shown.map((d) => {
                const isStmt = d.group === 'statements';
                const act = ACTION[d.action];
                const dling = dl === d.id;
                return (
                  <div className="stmt-row" key={d.id}>
                    <span data-k="Document">
                      <span className="doc-name">
                        <span className="doc-ic"><Icon name={isStmt ? 'file' : d.action === 'signed' ? 'check' : 'fileText'} size={14} /></span>
                        <span className="doc-name-t">
                          <b>{d.name}</b>
                          {d.endpoint && <small>{d.endpoint.split(' →')[0]}</small>}
                        </span>
                      </span>
                    </span>
                    <span data-k="Status">
                      {isStmt
                        ? <Badge tone={CAT_TONE[d.cat]}>{d.cat}</Badge>
                        : <Badge tone={act.tone} dot>{act.label}</Badge>}
                      {!isStmt && d.langs && d.langs.length > 1 && d.action !== 'signed' && (
                        <span className="doc-langtag" style={{ marginLeft: 8 }}><Icon name="globe" size={11} /> {d.langs.length} langs</span>
                      )}
                    </span>
                    <span className={d.action === 'sign' ? 'stmt-due' : 'dim'} data-k="Date">{d.date}</span>
                    <span className="mono dim" data-k="Account">{ACCT}</span>
                    <span className="stmt-act">
                      <span className="doc-acts">
                        {isStmt ? (
                          <>
                            <button className={'btn btn-ghost btn-sm' + (dling ? ' is-loading' : '')} onClick={() => download(d.id)}>
                              <Icon name={dling ? 'check' : 'download'} size={13} /> {dling ? 'Saved' : 'Download'}
                            </button>
                          </>
                        ) : d.action === 'sign' ? (
                          <button className="btn btn-primary btn-sm" onClick={() => setReading(d)}>
                            <Icon name="edit" size={13} /> Review &amp; sign
                          </button>
                        ) : (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => setReading(d)}>
                              <Icon name="eye" size={13} /> {d.action === 'signed' ? 'View signed' : 'Read'}
                            </button>
                            <button className={'doc-iconbtn' + (dling ? ' is-loading' : '')} title="Download PDF" onClick={() => download(d.id)}>
                              <Icon name={dling ? 'check' : 'download'} size={14} />
                            </button>
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <p className="fineprint">NinjaTrader Clearing holds the authoritative records and retains them at least 7 years (BSA/AML), exceeding the CFTC/NFA minimum. Agreements render via <span className="mono">Get Agreement Document</span>, signatures record via <span className="mono">Sign Agreement Documents</span> / <span className="mono">Sign W-8</span>, and signed copies are pulled via <span className="mono">Get User Signed Document</span>. Statements have no API and arrive through NinjaTrader’s GCP delivery pipeline.</p>

        {reading && <DocReader doc={reading} onClose={() => setReading(null)} onSigned={markSigned} />}
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.statements = StatementsPage;
})();
