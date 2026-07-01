// ba-pages-risk.jsx — Alert Dashboard (TAL-42), Audit Log (TAL-40),
// Blacklister (TAL-45), IP Auditor (TAL-44), Agreements (TAL-48).
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, Sel, SubTabs, StatusPill, Badge, Modal, Note, Empty, Field, DefRows } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  /* ===================== ALERT DASHBOARD (TAL-42) ===================== */
  function Alerts() {
    const [flags, setFlags] = useState(D.flags);
    const [q, setQ] = useState('');
    const [flagType, setFlagType] = useState('All');
    const [review, setReview] = useState(null); // row being reviewed
    const [decision, setDecision] = useState('Cleared');
    const [notes, setNotes] = useState('');

    let rows = flags;
    if (flagType !== 'All') rows = rows.filter((f) => f.flag === flagType);

    const submitReview = () => {
      setFlags((fs) => fs.map((f) => f.id === review.id
        ? { ...f, review: decision, reviewedBy: 'Riley Morgan', reviewedAt: 'Jun 09, 2026 · now', notes }
        : f));
      setReview(null); setNotes(''); setDecision('Cleared');
    };

    const cols = [
      { key: 'created', label: 'Created' },
      { key: 'user', label: 'Flagged User', render: (r) => <div className="cell-2"><span className="cell-strong">{r.user}</span><span className="cell-sub">{r.email}</span></div> },
      { key: 'flag', label: 'Flag', render: (r) => <Badge tone="warn">{r.flag}</Badge> },
      { key: 'desc', label: 'Description', render: (r) => <span className="cell-sub" style={{ maxWidth: 260, display: 'inline-block', whiteSpace: 'normal' }}>{r.desc}</span> },
      { key: 'review', label: 'Review Status', render: (r) => <StatusPill value={r.review} /> },
      { key: 'reviewedBy', label: 'Reviewed By' },
      { key: 'action', label: 'Action', sortable: false, render: (r) => r.review === 'Open'
        ? <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setReview(r); }}>Review</button>
        : <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setReview(r); }}><Icon name="eye" size={13} /> View</button> },
    ];
    return (
      <div className="page">
        <PageIntro icon="alert" eyebrow="Risk & Compliance" title="Alert Dashboard"
          sub="Automated risk flags raised against users. Ops reviews each flag, records a decision, and logs it. No flag triggers an automatic account-state change — all require manual review."
          right={<Badge tone="warn" dot>{flags.filter((f) => f.review === 'Open').length} open</Badge>} />
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search flagged user, email, description…" />
            <Sel value={flagType} icon="filter" onChange={setFlagType} options={[{ v: 'All', l: 'All flag types' }, ...D.flagTypes.map((f) => ({ v: f, l: f }))]} />
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['user', 'email', 'desc']} pageSize={7} />
        </Card>
        {review && (
          <Modal eyebrow={'Risk flag · ' + review.id} title={review.flag} onClose={() => setReview(null)}
            footer={review.review === 'Open'
              ? <><button className="btn btn-ghost" onClick={() => setReview(null)}>Cancel</button><button className="btn btn-primary" onClick={submitReview}><Icon name="check" size={14} /> Submit review</button></>
              : <button className="btn btn-ghost" onClick={() => setReview(null)}>Close</button>}>
            <DefRows rows={[
              { l: 'Flagged user', v: review.user }, { l: 'Email', v: review.email },
              { l: 'Detected', v: review.created }, { l: 'Description', v: <span style={{ maxWidth: 280, textAlign: 'right' }}>{review.desc}</span> },
            ]} />
            <div style={{ height: 14 }} />
            {review.review === 'Open' ? (
              <>
                <Field label="Review decision">
                  <Sel value={decision} onChange={setDecision} options={['Cleared', 'Action Taken', 'Escalated'].map((d) => ({ v: d, l: d }))} />
                </Field>
                <Field label="Notes" hint="Reviews are immutable once submitted — a correction creates a new entry.">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you find? What action was taken?" />
                </Field>
                <Note tone="warn" title="No automatic account changes">Submitting a review records a decision and writes an Audit Log entry. It does not change the user's account state.</Note>
              </>
            ) : (
              <DefRows rows={[
                { l: 'Review status', v: <StatusPill value={review.review} /> }, { l: 'Reviewed by', v: review.reviewedBy },
                { l: 'Reviewed at', v: review.reviewedAt }, { l: 'Notes', v: <span style={{ maxWidth: 280, textAlign: 'right' }}>{review.notes || '—'}</span> },
              ]} />
            )}
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== AUDIT LOG (TAL-40) ===================== */
  function AuditLog() {
    const [q, setQ] = useState('');
    const [type, setType] = useState('All');
    const rows = type === 'All' ? D.audit : D.audit.filter((a) => a.type === type);
    const kindTone = { admin: 'violet', trading: 'accent', user: 'info' };
    const cols = [
      { key: 'when', label: 'Date & Time', render: (r) => <span className="mono cell-sub">{r.when}</span> },
      { key: 'type', label: 'Type', render: (r) => <Badge tone={kindTone[r.kind]}>{r.type}</Badge> },
      { key: 'user', label: 'User', render: (r) => <span className="cell-strong">{r.user}</span> },
      { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target', render: (r) => <span className="mono cell-sub">{r.target}</span> },
    ];
    return (
      <div className="page">
        <PageIntro icon="audit" eyebrow="Risk & Compliance" title="Audit Log"
          sub="Immutable, append-only record of every admin action across the back office. Retained 5+ years per CFTC / NFA recordkeeping rules."
          right={<button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Export</button>} />
        <Note tone="info" icon="lock" title="Immutable record">Entries cannot be edited or deleted by anyone, including admins. Corrections are appended as new entries.</Note>
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search by user, action, target…" />
            <Sel value={type} icon="filter" onChange={setType} options={[{ v: 'All', l: 'All log types' }, ...D.auditTypes.map((t) => ({ v: t, l: t }))]} />
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['user', 'action', 'target']} pageSize={9} />
        </Card>
      </div>
    );
  }

  /* ===================== BLACKLISTER (TAL-45) ===================== */
  const BL_TABS = [
    { v: 'bl-ip', l: 'Blacklisted IPs' }, { v: 'bl-user', l: 'Blacklisted Users' },
    { v: 'wl-ip', l: 'Whitelisted IPs' }, { v: 'wl-user', l: 'Whitelisted Users' }, { v: 'proc', l: 'Processor Blacklists' },
  ];
  const BL_CTA = { 'bl-ip': '+ Blacklist IP', 'bl-user': '+ Blacklist User', 'wl-ip': '+ Whitelist IP', 'wl-user': '+ Whitelist User', 'proc': '+ Blacklist Processor' };
  function Blacklister() {
    const [tab, setTab] = useState('bl-ip');
    const [data, setData] = useState(D.blacklist);
    const [q, setQ] = useState('');
    const remove = (id) => setData((d) => ({ ...d, [tab]: d[tab].filter((r) => r.id !== id) }));
    const cols = [
      { key: 'entity', label: 'Entry', render: (r) => <span className="mono">{r.entity}</span> },
      { key: 'created', label: 'Created' },
      { key: 'action', label: '', sortable: false, render: (r) => <div className="dt-actions"><button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}><Icon name="x" size={13} /> Remove</button></div> },
    ];
    return (
      <div className="page">
        <PageIntro icon="blacklist" eyebrow="Risk & Compliance" title="Blacklister"
          sub="Blocklists and allowlists for IPs, users, and payment processors. Critical for fraud and sanctions screening. The MFFU Product Whitelist tab has been removed." />
        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={BL_TABS} onChange={(v) => { setTab(v); setQ(''); }} /></div>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search entries…" />
            <div className="spacer" />
            <button className="btn btn-primary"><Icon name="plus" size={14} /> {BL_CTA[tab].replace('+ ', '')}</button>
          </div>
          <DataTable columns={cols} rows={data[tab]} search={q} searchKeys={['entity']} pageSize={8} emptyTitle="No entries" />
        </Card>
      </div>
    );
  }

  /* ===================== IP AUDITOR (TAL-44) ===================== */
  function IPAuditor() {
    const [q, setQ] = useState('');
    const cols = [
      { key: 'ip', label: 'IP Address', render: (r) => <span className="mono cell-strong">{r.ip}</span> },
      { key: 'app', label: 'App' },
      { key: 'count', label: 'Count', num: true, render: (r) => <span className="mono" style={{ fontWeight: 700 }}>{r.count}</span> },
    ];
    return (
      <div className="page">
        <PageIntro icon="ip" eyebrow="Risk & Compliance" title="IP Auditor"
          sub="How many users, sessions, and accounts are associated with a given IP — a quick signal for multi-account abuse and shared-IP investigations." />
        <Card flush>
          <div style={{ padding: '16px 20px 14px' }}><SearchInput value={q} onChange={setQ} placeholder="Search by IP address (full or partial)…" /></div>
          <DataTable columns={cols} rows={D.ipAudit} search={q} searchKeys={['ip', 'app']} pageSize={8} />
        </Card>
      </div>
    );
  }

  /* ===================== AGREEMENTS (TAL-48) ===================== */
  function Agreements() {
    const [create, setCreate] = useState(false);
    const cols = [
      { key: 'title', label: 'Agreement', render: (r) => <span className="cell-strong">{r.title}</span> },
      { key: 'version', label: 'Version', render: (r) => <span className="mono">{r.version}</span> },
      { key: 'trigger', label: 'Trigger Context', render: (r) => <Badge tone="neutral">{r.trigger}</Badge> },
      { key: 'signed', label: 'Signed', num: true, render: (r) => <span className="mono">{r.signed}</span> },
      { key: 'updated', label: 'Updated' },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'a', label: '', sortable: false, render: () => <div className="dt-actions"><button className="iconbtn iconbtn-sm" title="Edit"><Icon name="edit" size={13} /></button></div> },
    ];
    return (
      <div className="page">
        <PageIntro icon="agreements" eyebrow="Risk & Compliance" title="Agreements"
          sub="Talero-specific agreements clients sign during onboarding and key lifecycle moments. Versions are immutable once signed."
          right={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="plus" size={14} /> Create Agreement</button>} />
        <Note tone="info" title="FCM-required agreements are handled by NinjaTrader">The NTC Customer Agreement, NFA Risk Disclosure, suitability questionnaire, market data and W-8BEN forms are captured and e-signed through the NTC Account Opening Process — not managed here. NTC retains them 7+ years.</Note>
        <Card flush>
          <CardHead title="Talero agreements" />
          <DataTable columns={cols} rows={D.agreements} pageSize={6} />
        </Card>
        <Card>
          <CardHead title="Captured via NTC Account Opening Process" sub="Signed through NTC-hosted redirect or embedded iframe — listed here for reference." />
          <div className="row-wrap">{D.fcmAgreements.map((a) => <span className="badge badge-neutral" key={a} style={{ padding: '6px 11px' }}><Icon name="check" size={12} /> {a}</span>)}</div>
        </Card>
        {create && (
          <Modal eyebrow="New Talero agreement" title="Create Agreement" onClose={() => setCreate(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setCreate(false)}>Save agreement</button></>}>
            <Field label="Title"><input placeholder="e.g. Talero Platform Terms of Service" /></Field>
            <div className="field-row">
              <Field label="Version"><input placeholder="v1.0" /></Field>
              <Field label="Status"><select><option>Draft</option><option>Active</option><option>Inactive</option></select></Field>
            </div>
            <Field label="Trigger context" hint="When the client is asked to sign.">
              <select><option>On registration</option><option>On AOP submission</option><option>On funding initiation</option><option>On market data signup</option></select>
            </Field>
            <Field label="Document body" hint="Rich text or PDF upload (Legal-owned content)."><textarea placeholder="Agreement text…" /></Field>
          </Modal>
        )}
      </div>
    );
  }

  window.BAPages.alerts = Alerts;
  window.BAPages.audit = AuditLog;
  window.BAPages.blacklister = Blacklister;
  window.BAPages.ipauditor = IPAuditor;
  window.BAPages.agreements = Agreements;
})();
