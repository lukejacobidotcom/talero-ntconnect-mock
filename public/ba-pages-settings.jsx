// ba-pages-settings.jsx — Business Admin (TAL-50), Team Management (TAL-46), Tax Tracking (TAL-32).
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, Sel, SubTabs, StatusPill, Badge, Modal, Note, Empty, Field } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  /* ===================== BUSINESS ADMIN (TAL-50) ===================== */
  const BIZ_TABS = [
    { v: 'alerts', l: 'Site Alerts' }, { v: 'risk', l: 'Risk Categories' }, { v: 'cache', l: 'Cache Control' },
    { v: 'fcms', l: 'FCMs' }, { v: 'countries', l: 'Restricted Countries' },
  ];
  function BusinessAdmin() {
    const [tab, setTab] = useState('risk');
    const [cats, setCats] = useState(D.riskCategories);
    const [halt, setHalt] = useState(null); // category id pending confirm
    const doHalt = (id, to) => { setCats((c) => c.map((x) => x.id === id ? { ...x, status: to } : x)); setHalt(null); };

    return (
      <div className="page">
        <PageIntro icon="business" eyebrow="Administration" title="Business Admin"
          sub="Operational control panel — site alerts, trading risk categories, cache, FCMs, and restricted countries." />
        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={BIZ_TABS} onChange={setTab} /></div>
          <div style={{ padding: 20 }}>
            {tab === 'risk' && (
              <div className="stack">
                <Note tone="warn" icon="halt" title="Halt = trading restriction only">Halting a risk category puts all its accounts in Liquidation Only — no new position-opening orders; existing positions can be reduced or closed. It does <b>not</b> block deposits or new account openings. The full halt console — org-wide, per-account, and scheduled — lives in <b>Risk Controls › Trading Halts</b>. Halt / Unhalt calls the NTC API and is always written to the Audit Log.</Note>
                <div className="rolecards">
                  {cats.map((c) => (
                    <div className="rolecard" key={c.id}>
                      <div className="rolecard-top"><b>{c.name}</b><StatusPill value={c.status === 'Active' ? 'Active' : 'Halted'} /></div>
                      <div className="perm-row"><span>Accounts in category</span><span className="perm-n">{c.accounts}</span></div>
                      {c.status === 'Active'
                        ? <button className="btn btn-danger btn-sm" onClick={() => setHalt(c)}><Icon name="halt" size={13} /> Halt All</button>
                        : <button className="btn btn-primary btn-sm" onClick={() => doHalt(c.id, 'Active')}><Icon name="play" size={13} /> Unhalt All</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === 'alerts' && <Empty icon="alert" title="No site alerts" action="Create site alert">System-wide banners (active/inactive, message, severity) surface to clients. MFFU seed alerts were wiped.</Empty>}
            {tab === 'cache' && (
              <div className="stack">
                <Note tone="info" title="Cache Control">Flush cached content across the platform. Carried over from MFFU.</Note>
                <div className="row-wrap"><button className="btn btn-ghost"><Icon name="refresh" size={14} /> Flush page cache</button><button className="btn btn-ghost"><Icon name="refresh" size={14} /> Flush CDN</button><button className="btn btn-ghost"><Icon name="refresh" size={14} /> Flush config cache</button></div>
              </div>
            )}
            {tab === 'fcms' && (
              <DataTable pageSize={5} rows={D.brokersFCM.map((b, i) => ({ id: i, ...b }))} columns={[
                { key: 'name', label: 'FCM', render: (r) => <span className="cell-strong">{r.name}</span> },
                { key: 'role', label: 'Role', render: (r) => <Badge tone="info">{r.role}</Badge> },
                { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
              ]} />
            )}
            {tab === 'countries' && (
              <div className="stack">
                <CardHead title="Restricted countries" sub="Clients from these jurisdictions cannot open accounts. Reviewed by Compliance against Talero's licensing footprint." />
                <div className="row-wrap">{D.restrictedCountries.map((c) => <span className="badge badge-neg" key={c} style={{ padding: '6px 11px' }}><Icon name="blacklist" size={12} /> {c}</span>)}</div>
                <div><button className="btn btn-ghost btn-sm"><Icon name="plus" size={13} /> Add country</button></div>
              </div>
            )}
          </div>
        </Card>
        {halt && (
          <Modal eyebrow="Confirm trading halt" title={'Halt all accounts — ' + halt.name} onClose={() => setHalt(null)}
            footer={<><button className="btn btn-ghost" onClick={() => setHalt(null)}>Cancel</button><button className="btn btn-danger" onClick={() => doHalt(halt.id, 'Halted')}><Icon name="halt" size={14} /> Halt {halt.accounts} accounts</button></>}>
            <Note tone="warn" title="This is a regulated action">All {halt.accounts} accounts in <b>{halt.name}</b> will move to Liquidation Only via the NTC API. Existing positions can be closed; no new positions can be opened. This will be recorded in the Audit Log.</Note>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== TEAM MANAGEMENT (TAL-46) ===================== */
  function Team() {
    const [q, setQ] = useState('');
    const [role, setRole] = useState('All');
    const [addMember, setAddMember] = useState(false);
    const rows = role === 'All' ? D.members : D.members.filter((m) => m.role === role);
    const cols = [
      { key: 'name', label: 'User', render: (r) => <span className="cell-strong">{r.name}</span> },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'twofa', label: '2FA Enabled', render: (r) => r.twofa === 'Yes' ? <Badge tone="pos" dot>Yes</Badge> : <Badge tone="warn" dot>No</Badge> },
      { key: 'role', label: 'Role', render: (r) => <Badge tone="violet">{r.role}</Badge> },
      { key: 'a', label: 'Actions', sortable: false, render: () => <div className="dt-actions"><button className="iconbtn iconbtn-sm" title="Edit"><Icon name="edit" size={13} /></button><button className="iconbtn iconbtn-sm" title="Permissions"><Icon name="shield" size={13} /></button><button className="iconbtn iconbtn-sm" title="Delete"><Icon name="trash" size={13} /></button></div> },
    ];
    return (
      <div className="page">
        <PageIntro icon="team" eyebrow="Administration · RBAC" title="Team Management"
          sub="Define roles, assign permissions, and manage staff. 2FA is mandatory for every admin user — there is no bypass."
          right={<button className="btn btn-ghost"><Icon name="plus" size={14} /> Add Role</button>} />
        <Note tone="info" icon="lock" title="2FA enforced for all admins">Staff without an enrolled second factor cannot access the back office. Every role/member change is written to the Audit Log.</Note>
        <Card>
          <CardHead title="Roles" sub="v1 default role set for Talero's IIB org." />
          <div className="rolecards">
            {D.roles.map((r) => (
              <div className="rolecard" key={r.id}>
                <div className="rolecard-top"><b>{r.name}</b><span className="badge badge-neutral">{r.members} {r.members === 1 ? 'member' : 'members'}</span></div>
                <div className="perm-list">
                  {Object.entries(r.perms).map(([k, v]) => <div className="perm-row" key={k}><span>{k}</span><span className="perm-n">{v}</span></div>)}
                </div>
                <button className="btn btn-ghost btn-sm">Edit Role</button>
              </div>
            ))}
          </div>
        </Card>
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search user…" />
            <Sel value={role} icon="filter" onChange={setRole} options={[{ v: 'All', l: 'All Roles' }, ...D.roles.map((r) => ({ v: r.name, l: r.name }))]} />
            <div className="spacer" />
            <button className="btn btn-primary" onClick={() => setAddMember(true)}><Icon name="plus" size={14} /> Add Member</button>
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['name', 'email']} pageSize={8} />
        </Card>
        {addMember && (
          <Modal eyebrow="Invite staff" title="Add Member" onClose={() => setAddMember(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setAddMember(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setAddMember(false)}>Send invite</button></>}>
            <Field label="Full name"><input placeholder="Jane Doe" /></Field>
            <Field label="Work email"><input placeholder="jane.doe@talero.com" /></Field>
            <Field label="Role"><select>{D.roles.map((r) => <option key={r.id}>{r.name}</option>)}</select></Field>
            <Note tone="info" icon="lock" title="2FA required on first login">The invitee must enrol a second factor before they can access the back office.</Note>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== TAX TRACKING (TAL-32 — placeholder) ===================== */
  function Tax() {
    return (
      <div className="page">
        <PageIntro icon="tax" eyebrow="Administration" title="Tax Tracking"
          sub="A surface for tax-related ops workflows that don't involve issuing forms." />
        <Note tone="warn" icon="info" title="Under evaluation — need & location TBD">NinjaTrader (the FCM) issues client 1099-B forms, not Talero. This surface is a placeholder while Product, Ops, and Legal decide whether a dedicated tax-tracking page is needed at v1, or whether these workflows are handled through Customers and the Audit Log.</Note>
        <div className="grid-3">
          {[
            { ic: 'doc', t: '1099 issuance audit trail', d: 'Track that the FCM issued a 1099 for each client (audit / compliance record).' },
            { ic: 'mail', t: 'Client tax inquiries', d: 'Handle questions about missing or incorrect tax forms; coordinate FCM corrections.' },
            { ic: 'download', t: 'Transaction-history exports', d: 'Support client requests for transaction-history exports during tax season.' },
          ].map((c) => (
            <Card key={c.t}>
              <div className="icontile tile-muted" style={{ marginBottom: 12 }}><Icon name={c.ic} size={18} /></div>
              <b style={{ fontSize: 14 }}>{c.t}</b>
              <p className="card-sub" style={{ marginTop: 6 }}>{c.d}</p>
              <div style={{ marginTop: 12 }}><Badge tone="neutral">Proposed · not built</Badge></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  window.BAPages.business = BusinessAdmin;
  window.BAPages.team = Team;
  window.BAPages.tax = Tax;
})();
