// ba-pages-clients.jsx — Account Applications (TAL-39), Customers (TAL-35),
// Brokerage Accounts (TAL-36), Entity Search (TAL-33).
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, TogglePill, Sel, SubTabs, StatusPill, Badge, Modal, Note, Empty, DefRows } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  /* ===================== ACCOUNT APPLICATIONS (TAL-39) ===================== */
  const APP_STATUSES = ['All', 'Application Started', 'KYC Pending', 'Agreements Pending', 'Awaiting Funding', 'Active', 'Rejected'];
  function Applications() {
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('All');
    const [apps, setApps] = useState(D.applications);
    const [sel, setSel] = useState(null);
    const [method, setMethod] = useState('api');   // submission method in the modal: 'api' | 'iframe'
    const [reject, setReject] = useState(false);
    const [rejectReason, setRejectReason] = useState('Compliance');
    const [create, setCreate] = useState(false);
    const [toast, setToast] = useState('');

    const rows = apps.filter((a) => status === 'All' || a.status === status);
    const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

    const detail = sel ? (D.aopDetail[sel.status] || { method: 'NT AOP API', response: '—', docs: [] }) : null;
    const isOpen = sel && sel.status !== 'Active' && sel.status !== 'Rejected';

    const setStatusOf = (id, to, note) => { setApps((as) => as.map((a) => a.id === id ? { ...a, status: to, account: to === 'Active' && a.account === '—' ? String(1912480 + (id.charCodeAt(7) % 40)) : a.account } : a)); setSel((s) => s ? { ...s, status: to } : s); flash(note); };
    const approve = () => setStatusOf(sel.id, 'Active', 'Application approved — account issued via NT AOP API');
    const doReject = () => { setStatusOf(sel.id, 'Rejected', 'Application rejected — client notified (reason withheld per policy)'); setReject(false); };
    const requestDocs = () => flash('Document request sent to client · ' + detail.docs.length + ' item(s)');
    const resubmit = () => flash('Application payload re-submitted to NinjaTrader AOP API');

    const cols = [
      { key: 'created', label: 'Created' },
      { key: 'type', label: 'Application Type', render: (r) => <Badge tone="neutral">{r.type}</Badge> },
      { key: 'user', label: 'User', render: (r) => <div className="cell-2"><span className="cell-strong">{r.user}</span><span className="cell-sub">{r.email}</span></div> },
      { key: 'applicant', label: 'Applicant Name' },
      { key: 'account', label: 'Account ID', render: (r) => <span className="mono">{r.account === '—' ? '—' : '#' + r.account}</span> },
      { key: 'status', label: 'Lifecycle Status', render: (r) => <StatusPill value={r.status} /> },
    ];
    return (
      <div className="page">
        <PageIntro icon="applications" eyebrow="Clients · Onboarding" title="Account Applications"
          sub="The Account Opening Process (AOP) queue. Talero collects applicant data and submits it to NinjaTrader programmatically via the AOP API; ops acts on the API's approve / reject / documents-required response here."
          right={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="plus" size={14} /> New application</button>} />
        {toast && <Note tone="pos" icon="check" title={toast} />}
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search Account ID, User, Applicant, Email…" />
            <Sel value={status} icon="filter" onChange={setStatus} options={APP_STATUSES.map((s) => ({ v: s, l: s === 'All' ? 'All statuses' : s }))} />
            <div className="spacer" />
            <Badge tone="info" dot>{apps.filter((r) => r.status !== 'Active' && r.status !== 'Rejected').length} in progress</Badge>
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['account', 'user', 'applicant', 'email']} onRowClick={(r) => { setSel(r); setMethod('api'); }} pageSize={8} />
        </Card>

        {sel && (
          <Modal eyebrow={'Application · ' + sel.id} title={sel.applicant} wide onClose={() => setSel(null)}
            footer={isOpen
              ? <>
                  <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={resubmit}><Icon name="refresh" size={13} /> Re-submit to NTC</button>
                  <button className="btn btn-danger" onClick={() => setReject(true)}><Icon name="x" size={14} /> Reject</button>
                  <button className="btn btn-primary" onClick={approve}><Icon name="check" size={14} /> Approve & issue account</button>
                </>
              : <button className="btn btn-ghost" onClick={() => setSel(null)}>Close</button>}>
            <div className="rc-submit-row">
              <span className="hint">Submission method</span>
              <div className="seg-mini">
                <button className={'seg-mini-b' + (method === 'api' ? ' on' : '')} onClick={() => setMethod('api')}>NT AOP API</button>
                <button className={'seg-mini-b' + (method === 'iframe' ? ' on' : '')} onClick={() => setMethod('iframe')}>Embedded iframe</button>
              </div>
            </div>
            {method === 'iframe'
              ? <Note tone="info" icon="globe" title="Embedded NTC AOP (alternative)">Instead of the API, this applicant can complete NinjaTrader's hosted AOP inside an iframe in the Talero portal. Talero collects no application data in this mode; status still syncs back here.</Note>
              : <Note tone="info" title={'NTC AOP response · ' + detail.response}>Application data was pushed to NinjaTrader via the AOP API. The FCM returns approval, rejection, or a documents-required response — KYC/AML decisions and reasons are owned by NTC and are not surfaced to clients.</Note>}
            <div style={{ height: 14 }} />
            <DefRows rows={[
              { l: 'Status', v: <StatusPill value={sel.status} /> },
              { l: 'AOP API response', v: <Badge tone={detail.response.startsWith('Approved') ? 'pos' : detail.response.startsWith('Rejected') ? 'neg' : 'warn'}>{detail.response}</Badge> },
              { l: 'Application type', v: sel.type },
              { l: 'User', v: sel.user }, { l: 'Email', v: sel.email },
              { l: 'Account ID', v: sel.account === '—' ? 'Not yet issued' : '#' + sel.account },
              { l: 'Created', v: sel.created }, { l: 'FCM', v: D.FCM },
            ]} />
            {detail.docs.length > 0 && (
              <>
                <div style={{ height: 14 }} />
                <CardHead title="Documents required by NTC" sub="Returned by the AOP API — request these from the applicant." />
                <div className="stack" style={{ gap: 7 }}>
                  {detail.docs.map((d) => <div className="perm-row" key={d} style={{ fontSize: 12.5 }}><span><Icon name="doc" size={13} /> {d}</span><Badge tone="warn" dot>Outstanding</Badge></div>)}
                </div>
                <div style={{ marginTop: 12 }}><button className="btn btn-ghost btn-sm" onClick={requestDocs}><Icon name="mail" size={13} /> Request documents from client</button></div>
              </>
            )}
          </Modal>
        )}

        {reject && (
          <Modal eyebrow={'Reject · ' + sel.id} title="Reject application" onClose={() => setReject(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setReject(false)}>Cancel</button><button className="btn btn-danger" onClick={doReject}><Icon name="x" size={14} /> Reject application</button></>}>
            <Field label="Internal reason" hint="Recorded in the Audit Log. The client is told only that the application wasn't approved — never the underlying reason.">
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option>Compliance</option><option>KYC / identity could not be verified</option><option>Restricted jurisdiction</option><option>Duplicate / fraud signal</option><option>Applicant withdrew</option>
              </select>
            </Field>
            <Note tone="warn" title="Reason is withheld from the client">Per policy, rejection notifications never disclose KYC/AML reasons. Ops can share context only through approved support channels.</Note>
          </Modal>
        )}

        {create && (
          <Modal eyebrow="New account application" title="Submit application to NTC" wide onClose={() => setCreate(false)}
            footer={<><button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setCreate(false)}>Cancel</button><button className="btn btn-ghost" onClick={() => { setCreate(false); flash('Opening embedded NTC AOP iframe…'); }}><Icon name="globe" size={13} /> Use embedded iframe</button><button className="btn btn-primary" onClick={() => { setCreate(false); flash('Application submitted to NinjaTrader AOP API'); }}><Icon name="arrowRight" size={14} /> Submit via AOP API</button></>}>
            <Note tone="info" title="Two ways to open an account">Submit the applicant's data directly to NinjaTrader via the AOP API (Talero-branded, no redirect), or hand off to NTC's hosted application in an embedded iframe. Both return status to this queue.</Note>
            <div style={{ height: 14 }} />
            <div className="field-row">
              <Field label="Applicant full name"><input placeholder="Jane A. Doe" /></Field>
              <Field label="Application type"><select><option>Individual</option><option>Joint</option><option>Entity</option><option>Corporate</option></select></Field>
            </div>
            <div className="field-row">
              <Field label="Email"><input placeholder="jane.doe@example.com" /></Field>
              <Field label="Country of residence"><input placeholder="United States" /></Field>
            </div>
            <Field label="SSN / ITIN (or W-8BEN for non-US)"><input placeholder="•••-••-••••" /></Field>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== CUSTOMERS (TAL-35) ===================== */
  function Customers() {
    const [q, setQ] = useState('');
    const [hasPurchases, setHasPurchases] = useState(false);
    const [hasFunded, setHasFunded] = useState(false);
    const [sel, setSel] = useState(null);
    let rows = D.customers;
    if (hasPurchases) rows = rows.filter((c) => c.hasPurchases);
    if (hasFunded) rows = rows.filter((c) => c.hasFunded);
    const cols = [
      { key: 'joined', label: 'Joined' },
      { key: 'id', label: 'Customer ID', render: (r) => <span className="mono">{r.id}</span> },
      { key: 'name', label: 'Name', render: (r) => <span className="cell-strong">{r.name}</span> },
      { key: 'email', label: 'Email' },
      { key: 'country', label: 'Country' },
      { key: 'auth', label: 'Auth', render: (r) => <Badge tone="neutral">{r.auth}</Badge> },
      { key: 'kyc', label: 'KYC Approved', render: (r) => r.kyc === 'Verified' ? <Badge tone="pos" dot>Yes</Badge> : <Badge tone="neutral">No</Badge> },
      { key: 'kycReview', label: 'KYC Review', render: (r) => <StatusPill value={r.kycReview} /> },
    ];
    return (
      <div className="page">
        <PageIntro icon="customers" eyebrow="Clients · Directory" title="Customers"
          sub="Every customer account on Talero — searchable and filterable for support, compliance, and ops investigations." />
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search by Customer ID, Name, Email…" />
            <TogglePill on={hasPurchases} onChange={setHasPurchases}>Has Purchases</TogglePill>
            <TogglePill on={hasFunded} onChange={setHasFunded}>Has Funded</TogglePill>
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['id', 'name', 'email']} onRowClick={setSel} pageSize={9} />
        </Card>
        {sel && (
          <Modal eyebrow={'Customer · ' + sel.id} title={sel.name} onClose={() => setSel(null)}
            footer={<button className="btn btn-ghost" onClick={() => setSel(null)}>Close</button>}>
            <DefRows rows={[
              { l: 'Email', v: sel.email }, { l: 'Country', v: sel.country }, { l: 'Auth provider', v: sel.auth },
              { l: 'KYC', v: <StatusPill value={sel.kycReview} /> },
              { l: 'Has funded', v: sel.hasFunded ? <Badge tone="pos" dot>Yes</Badge> : <Badge tone="neutral">No</Badge> },
              { l: 'Has purchases', v: sel.hasPurchases ? <Badge tone="pos" dot>Yes</Badge> : <Badge tone="neutral">No</Badge> },
              { l: 'Joined', v: sel.joined },
            ]} />
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== BROKERAGE ACCOUNTS (TAL-36) ===================== */
  const BA_TABS = [{ v: 'accounts', l: 'Accounts' }, { v: 'screener', l: 'Trade Screener' }, { v: 'tradeid', l: 'Trade ID' }, { v: 'inactivity', l: 'Inactivity Analysis' }];
  const ACCT_STATES = ['Active', 'Restricted', 'Liquidation Only', 'Suspended'];
  function BrokerageAccounts() {
    const [tab, setTab] = useState('accounts');
    const [q, setQ] = useState('');
    const [accts, setAccts] = useState(D.brokerageAccounts.map((a) => ({ ...a, profile: (D.riskProfiles.find((p) => p.category === ({ Individual: 'Standard Retail', Joint: 'Standard Retail', Entity: 'Entity / Corporate', Corporate: 'Entity / Corporate' }[a.type])) || D.riskProfiles[0]).id })));
    const [sel, setSel] = useState(null);
    const [bulk, setBulk] = useState(false);
    const [toast, setToast] = useState('');
    const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

    const patch = (id, p, note) => { setAccts((as) => as.map((a) => a.id === id ? { ...a, ...p } : a)); setSel((s) => s ? { ...s, ...p } : s); if (note) flash(note); };
    const toggleTrading = () => patch(sel.id, { enabled: sel.enabled === 'Enabled' ? 'Disabled' : 'Enabled' }, 'Trading permission updated via NTC API · Audit logged');
    const setState = (v) => patch(sel.id, { enabled: v === 'Suspended' || v === 'Liquidation Only' ? 'Disabled' : sel.enabled, status: v }, 'Account state → ' + v + ' · Audit logged');
    const setProfile = (v) => patch(sel.id, { profile: v }, 'Risk profile applied via NTC Risks API');

    const cols = [
      { key: 'created', label: 'Created' },
      { key: 'accountName', label: 'Account Name', render: (r) => <span className="cell-strong">{r.accountName}</span> },
      { key: 'name', label: 'Name' },
      { key: 'fcm', label: 'FCM', render: (r) => <Badge tone="info">{r.fcm}</Badge> },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'cash', label: 'Cash', num: true, render: (r) => <span className="mono">{D.money(r.cash)}</span> },
      { key: 'enabled', label: 'Trading', render: (r) => <StatusPill value={r.enabled} /> },
    ];
    return (
      <div className="page">
        <PageIntro icon="brokerage" eyebrow="Clients · FCM accounts" title="Brokerage Accounts"
          sub="Real-money brokerage accounts carried at NinjaTrader Clearing. Manage trading permissions, account state, and risk profile per account — each action calls the NTC API and is written to the Audit Log."
          right={<button className="btn btn-primary" onClick={() => setBulk(true)}><Icon name="plus" size={14} /> Bulk create</button>} />
        {toast && <Note tone="pos" icon="check" title={toast} />}
        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={BA_TABS} onChange={setTab} /></div>
          {tab === 'accounts' && (
            <>
              <div style={{ padding: '16px 20px 14px' }}>
                <SearchInput value={q} onChange={setQ} placeholder="Search account name, holder, ID…" />
              </div>
              <DataTable columns={cols} rows={accts} search={q} searchKeys={['accountName', 'name', 'id']} onRowClick={setSel} pageSize={8} />
            </>
          )}
          {tab !== 'accounts' && (
            <div style={{ padding: 24 }}>
              <Empty icon={tab === 'inactivity' ? 'clock' : 'search'}
                title={tab === 'screener' ? 'Trade Screener' : tab === 'tradeid' ? 'Trade ID lookup' : 'Inactivity Analysis'}
                action={tab === 'tradeid' ? 'Look up a trade' : tab === 'inactivity' ? 'Run analysis' : 'Open screener'}>
                {tab === 'screener' && 'Investigate trade activity across all brokerage accounts. Sub-tab internals are scoped in a follow-up ticket.'}
                {tab === 'tradeid' && 'Look up an individual trade by its ID. Sub-tab internals are scoped in a follow-up ticket.'}
                {tab === 'inactivity' && 'Flag dormant accounts for outreach or compliance review. Sub-tab internals are scoped in a follow-up ticket.'}
              </Empty>
            </div>
          )}
        </Card>
        {sel && (
          <Modal eyebrow={'Brokerage account · #' + sel.id} title={sel.accountName} wide onClose={() => setSel(null)}
            footer={<><button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setSel(null)}>Close</button>
              {sel.status === 'Liquidation Only' || sel.enabled === 'Disabled'
                ? <button className="btn btn-primary" onClick={() => { patch(sel.id, { enabled: 'Enabled', status: sel.status === 'Suspended' ? 'Suspended' : 'Active' }, 'Account resumed via NTC Risks API'); }}><Icon name="play" size={14} /> Resume trading</button>
                : <button className="btn btn-danger" onClick={() => { patch(sel.id, { enabled: 'Disabled', status: 'Liquidation Only' }, 'Account halted → Liquidation Only · Audit logged'); }}><Icon name="halt" size={14} /> Halt account</button>}
            </>}>
            <DefRows rows={[
              { l: 'Account holder', v: sel.name }, { l: 'Account type', v: sel.type }, { l: 'FCM', v: sel.fcm },
              { l: 'Cash balance', v: <span className="mono">{D.money(sel.cash)}</span> }, { l: 'Opened', v: sel.created },
            ]} />
            <div style={{ height: 16 }} />
            <CardHead title="Controls" sub="Each change calls the NTC API and writes an Audit Log entry." />
            <div className="ba-controls">
              <div className="ba-ctl">
                <span className="ba-ctl-l">Trading permission</span>
                <button className={'toggle-pill' + (sel.enabled === 'Enabled' ? ' on' : '')} onClick={toggleTrading}><span className="toggle-sw" /><span>{sel.enabled === 'Enabled' ? 'Enabled' : 'Disabled'}</span></button>
              </div>
              <div className="ba-ctl">
                <span className="ba-ctl-l">Account state</span>
                <Sel value={sel.status} onChange={setState} options={ACCT_STATES.map((s) => ({ v: s, l: s }))} />
              </div>
              <div className="ba-ctl">
                <span className="ba-ctl-l">Risk profile</span>
                <Sel value={sel.profile} onChange={setProfile} options={D.riskProfiles.map((p) => ({ v: p.id, l: p.name }))} />
              </div>
            </div>
          </Modal>
        )}
        {bulk && (
          <Modal eyebrow="Bulk create accounts" title="Bulk create brokerage accounts" onClose={() => setBulk(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setBulk(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setBulk(false); flash('Bulk account creation queued via NTC API'); }}><Icon name="arrowRight" size={14} /> Create via NTC API</button></>}>
            <Note tone="info" title="Bulk provisioning">NinjaTrader's API supports individual or bulk account creation with trading permissions generated on create. Upload a CSV of approved applicants or specify a count for a category.</Note>
            <div style={{ height: 14 }} />
            <div className="field-row">
              <Field label="Account type"><select><option>Individual</option><option>Entity</option><option>Corporate</option></select></Field>
              <Field label="Risk profile"><select>{D.riskProfiles.map((p) => <option key={p.id}>{p.name}</option>)}</select></Field>
            </div>
            <Field label="Applicant CSV" hint="One approved applicant per row (AOP reference, name, type)."><input type="text" placeholder="approved-applicants-jun.csv" /></Field>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== ENTITY SEARCH (TAL-33) ===================== */
  const MATCHES = [{ v: 'exact', l: 'Exact match' }, { v: 'contains', l: 'Contains' }, { v: 'starts', l: 'Starts with' }];
  function EntitySearch() {
    const [entity, setEntity] = useState('bank');
    const [crit, setCrit] = useState([{ field: 'client', match: 'contains', value: '' }]);
    const [ran, setRan] = useState(true);
    const meta = D.entityTypes.find((e) => e.v === entity);
    const addCrit = () => setCrit((c) => [...c, { field: 'client', match: 'contains', value: '' }]);
    const delCrit = (i) => setCrit((c) => c.filter((_, x) => x !== i));
    const setC = (i, k, v) => setCrit((c) => c.map((row, x) => x === i ? { ...row, [k]: v } : row));

    const FIELDS = {
      bank: [{ v: 'client', l: 'Client name' }, { v: 'holder', l: 'Account holder' }, { v: 'last4', l: 'Last four' }, { v: 'state', l: 'Account state' }],
      brokerage: [{ v: 'client', l: 'Client name' }, { v: 'id', l: 'Account ID' }, { v: 'type', l: 'Account type' }, { v: 'state', l: 'Account state' }],
      users: [{ v: 'name', l: 'Name' }, { v: 'email', l: 'Email' }, { v: 'id', l: 'Customer ID' }],
    };
    const fields = FIELDS[entity] || [{ v: 'client', l: 'Value' }];

    const resultCols = entity === 'bank'
      ? [
          { key: 'client', label: 'Client' }, { key: 'holder', label: 'Account Holder' },
          { key: 'last4', label: 'Last Four', render: (r) => <span className="mono">••{r.last4}</span> },
          { key: 'routing', label: 'Routing', render: (r) => <span className="mono">{r.routing}</span> },
          { key: 'state', label: 'State', render: (r) => <StatusPill value={r.state} /> }, { key: 'added', label: 'Date Added' },
        ]
      : entity === 'brokerage'
      ? [
          { key: 'name', label: 'Client' }, { key: 'id', label: 'Account ID', render: (r) => <span className="mono">#{r.id}</span> },
          { key: 'type', label: 'Type' }, { key: 'status', label: 'State', render: (r) => <StatusPill value={r.status} /> },
          { key: 'created', label: 'Opening Date' }, { key: 'cash', label: 'Cash', num: true, render: (r) => <span className="mono">{D.money(r.cash)}</span> },
        ]
      : [
          { key: 'id', label: 'Customer ID', render: (r) => <span className="mono">{r.id}</span> },
          { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'country', label: 'Country' },
        ];
    const resultRows = entity === 'bank' ? D.bankAccounts : entity === 'brokerage' ? D.brokerageAccounts : D.customers;

    return (
      <div className="page">
        <PageIntro icon="search" eyebrow="Clients · Investigations" title="Entity Search"
          sub="Search across entity types using configurable criteria — a core tool for support, compliance, and investigations. Sensitive fields are masked in results." />
        <Card>
          <CardHead title="Search criteria" right={<Sel value={entity} icon="filter" onChange={(v) => { setEntity(v); setCrit([{ field: (FIELDS[v] || fields)[0].v, match: 'contains', value: '' }]); setRan(false); }} options={D.entityTypes.map((e) => ({ v: e.v, l: e.l }))} />} />
          <div className="stack" style={{ gap: 10 }}>
            {crit.map((row, i) => (
              <div key={i} className="row-wrap" style={{ gap: 8 }}>
                <Sel value={row.field} onChange={(v) => setC(i, 'field', v)} options={fields.map((f) => ({ v: f.v, l: f.l }))} />
                <Sel value={row.match} onChange={(v) => setC(i, 'match', v)} options={MATCHES.map((m) => ({ v: m.v, l: m.l }))} />
                <input value={row.value} onChange={(e) => setC(i, 'value', e.target.value)} placeholder="Value…"
                  style={{ flex: 1, minWidth: 160, height: 36, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                <button className="iconbtn" title="Remove criterion" disabled={crit.length === 1} onClick={() => delCrit(i)}><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <div className="row-wrap">
              <button className="btn btn-ghost btn-sm" onClick={addCrit}><Icon name="plus" size={14} /> Add Criterion</button>
              <div className="spacer" />
              <button className="btn btn-primary" onClick={() => setRan(true)}><Icon name="search" size={15} /> Search</button>
            </div>
          </div>
        </Card>
        <Card flush>
          <CardHead title={'Results · ' + meta.l.split(' — ')[0]} sub="Sortable columns · drill-down on row click." />
          {ran
            ? <DataTable columns={resultCols} rows={resultRows} pageSize={6} onRowClick={() => {}} />
            : <div style={{ padding: 20 }}><Empty icon="search" title="Configure criteria and search" /></div>}
        </Card>
      </div>
    );
  }

  window.BAPages.applications = Applications;
  window.BAPages.customers = Customers;
  window.BAPages.brokerage = BrokerageAccounts;
  window.BAPages.entity = EntitySearch;
})();
