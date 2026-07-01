// ba-pages-riskcontrols.jsx — Trading Risk (TAL-51), Trading Halts (TAL-52),
// Market Data subscriptions (TAL-53). Backed by NT Connect Risks + Fees/entitlements groups.
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, Sel, SubTabs, StatusPill, Badge, Modal, Note, Empty, Field, DefRows, IconTile } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  const money = D.money;

  /* ===================== TRADING RISK (TAL-51) ===================== */
  // Pre/post-trade risk limit profiles applied to accounts via the NTC Risks API.
  const LIMIT_DEFS = [
    { key: 'maxPosition', label: 'Max position size', unit: 'contracts', phase: 'pre' },
    { key: 'maxOrderQty', label: 'Max single-order qty', unit: 'contracts', phase: 'pre' },
    { key: 'maxOpenOrders', label: 'Max working orders', unit: 'orders', phase: 'pre' },
    { key: 'marginMult', label: 'Margin multiplier', unit: '×', phase: 'pre' },
    { key: 'dayLossLimit', label: 'Daily loss limit', unit: '$', phase: 'post' },
    { key: 'trailingDD', label: 'Trailing drawdown', unit: '$', phase: 'post' },
    { key: 'autoLiq', label: 'Auto-liquidate at', unit: '% MTE', phase: 'post' },
  ];
  const fmtLimit = (d, v) => d.unit === '$' ? money(v) : d.unit === '×' ? v.toFixed(1) + '×' : d.unit === '% MTE' ? v + '% MTE' : v + ' ' + d.unit;

  function RiskProfiles() {
    const [profiles, setProfiles] = useState(D.riskProfiles);
    const [edit, setEdit] = useState(null);   // profile being edited (draft copy)
    const [orig, setOrig] = useState(null);
    const [create, setCreate] = useState(false);

    const openEdit = (p) => { setOrig(p); setEdit({ ...p }); };
    const save = () => { setProfiles((ps) => ps.map((p) => p.id === edit.id ? edit : p)); setEdit(null); setOrig(null); };
    const setField = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

    const cols = [
      { key: 'name', label: 'Risk Profile', render: (r) => <div className="cell-2"><span className="cell-strong">{r.name}</span><span className="cell-sub mono">{r.id}</span></div> },
      { key: 'accounts', label: 'Accounts', num: true, render: (r) => <span className="mono">{r.accounts}</span> },
      { key: 'maxPosition', label: 'Max pos.', num: true, render: (r) => <span className="mono">{r.maxPosition}</span> },
      { key: 'dayLossLimit', label: 'Daily loss', num: true, render: (r) => <span className="mono">{money(r.dayLossLimit)}</span> },
      { key: 'trailingDD', label: 'Trailing DD', num: true, render: (r) => <span className="mono">{money(r.trailingDD)}</span> },
      { key: 'autoLiq', label: 'Auto-liq', num: true, render: (r) => <span className="mono">{r.autoLiq}%</span> },
      { key: 'mode', label: 'Enforcement', render: (r) => <Badge tone="info">{r.mode}</Badge> },
      { key: 'a', label: '', sortable: false, render: (r) => <div className="dt-actions"><button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Icon name="edit" size={13} /> Edit limits</button></div> },
    ];

    return (
      <div className="page">
        <PageIntro icon="shield" eyebrow="Risk Controls" title="Trading Risk"
          sub="Pre- and post-trade risk profiles applied to brokerage accounts. Limits are enforced by NinjaTrader Clearing via the Risks API — pre-trade limits reject orders at entry; post-trade limits drive monitoring and auto-liquidation."
          right={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="plus" size={14} /> Create profile</button>} />
        <Note tone="info" icon="shield" title="Enforced at the FCM, logged at Talero">Applying or editing a profile calls the NTC Risks API and writes an Audit Log entry. Pre-trade changes take effect on the next order; post-trade threshold changes apply to live positions immediately.</Note>
        <Card flush>
          <CardHead title="Risk profiles" sub="Each account inherits exactly one profile, usually from its risk category." />
          <DataTable columns={cols} rows={profiles} onRowClick={openEdit} pageSize={8} />
        </Card>

        {edit && (
          <Modal eyebrow={'Risk profile · ' + edit.id} title={edit.name} wide onClose={() => setEdit(null)}
            footer={<><span className="hint" style={{ marginRight: 'auto' }}>{edit.accounts} accounts inherit this profile</span><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={save}><Icon name="check" size={14} /> Apply to {edit.accounts} accounts</button></>}>
            <div className="rc-limit-grid">
              {['pre', 'post'].map((phase) => (
                <div key={phase} className="rc-phase">
                  <div className="rc-phase-h"><Badge tone={phase === 'pre' ? 'accent' : 'warn'}>{phase === 'pre' ? 'Pre-trade · order entry' : 'Post-trade · monitoring'}</Badge></div>
                  {LIMIT_DEFS.filter((d) => d.phase === phase).map((d) => (
                    <Field key={d.key} label={d.label} hint={d.unit === '$' ? 'USD' : d.unit}>
                      <input type="number" value={edit[d.key]} step={d.unit === '×' ? 0.1 : 1}
                        onChange={(e) => setField(d.key, d.unit === '×' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)} />
                    </Field>
                  ))}
                </div>
              ))}
            </div>
            <Field label="Allowed products"><input value={edit.products} onChange={(e) => setField('products', e.target.value)} /></Field>
          </Modal>
        )}

        {create && (
          <Modal eyebrow="New risk profile" title="Create risk profile" onClose={() => setCreate(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setCreate(false)}>Create profile</button></>}>
            <Field label="Profile name"><input placeholder="e.g. High-Frequency Tier" /></Field>
            <div className="field-row">
              <Field label="Bind to risk category"><select>{D.riskCategories.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Enforcement"><select><option>Pre + Post-trade</option><option>Pre-trade only</option><option>Post-trade only</option></select></Field>
            </div>
            <Note tone="info" title="Limits set after creation">You'll set position, loss, drawdown, and auto-liquidation limits on the next screen, then push to the NTC Risks API.</Note>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== TRADING HALTS (TAL-52) ===================== */
  const HALT_TABS = [{ v: 'org', l: 'Org-wide' }, { v: 'category', l: 'By Category' }, { v: 'account', l: 'Per-Account' }, { v: 'scheduled', l: 'Scheduled' }];
  function Halts() {
    const [tab, setTab] = useState('org');
    const [orgHalted, setOrgHalted] = useState(false);
    const [confirm, setConfirm] = useState(null); // { kind, label, accounts, onYes }
    const [cats, setCats] = useState(D.riskCategories);
    const [accts, setAccts] = useState(D.brokerageAccounts);
    const [sched, setSched] = useState(D.scheduledHalts);
    const [q, setQ] = useState('');
    const [addSched, setAddSched] = useState(false);

    const haltedAccts = accts.filter((a) => a.enabled === 'Disabled' || a.status === 'Liquidation Only' || a.status === 'Suspended').length;

    const ask = (c) => setConfirm(c);
    const run = () => { confirm.onYes(); setConfirm(null); };

    const acctRows = accts.filter((a) => q === '' || (a.accountName + a.name + a.id).toLowerCase().includes(q.toLowerCase()));

    return (
      <div className="page">
        <PageIntro icon="halt" eyebrow="Risk Controls" title="Trading Halts"
          sub="Restrict order entry across the org, a risk category, or a single account. A halt forces Liquidation Only — open positions can be reduced or closed, no new positions can be opened. It never blocks deposits, withdrawals, or onboarding."
          right={<Badge tone={orgHalted ? 'neg' : 'pos'} dot>{orgHalted ? 'ORG HALT ACTIVE' : 'Trading live'}</Badge>} />
        <Note tone="warn" icon="halt" title="Halts are regulated actions">Every halt and resume calls the NTC Risks API and is written to the immutable Audit Log with operator, scope, and timestamp. Halts do not auto-liquidate; they prevent new position-opening orders.</Note>

        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={HALT_TABS} onChange={setTab} /></div>
          <div style={{ padding: 20 }}>
            {tab === 'org' && (
              <div className={'rc-killswitch' + (orgHalted ? ' on' : '')}>
                <div className="rc-ks-l">
                  <IconTile name={orgHalted ? 'halt' : 'play'} tone={orgHalted ? 'neg' : 'pos'} size={20} />
                  <div>
                    <b>{orgHalted ? 'Organization-wide trading is HALTED' : 'Organization-wide trading is live'}</b>
                    <small>{orgHalted ? 'All accounts are in Liquidation Only. Resume to restore normal trading.' : 'Use for emergencies or unscheduled market events. Affects every account across all categories.'}</small>
                  </div>
                </div>
                {orgHalted
                  ? <button className="btn btn-primary" onClick={() => ask({ label: 'Resume all trading', accounts: 'every account', danger: false, onYes: () => setOrgHalted(false) })}><Icon name="play" size={14} /> Resume all trading</button>
                  : <button className="btn btn-danger" onClick={() => ask({ label: 'Halt all trading org-wide', accounts: 'every account in the organization', danger: true, onYes: () => setOrgHalted(true) })}><Icon name="halt" size={14} /> Halt all trading</button>}
              </div>
            )}

            {tab === 'category' && (
              <div className="rolecards">
                {cats.map((c) => (
                  <div className="rolecard" key={c.id}>
                    <div className="rolecard-top"><b>{c.name}</b><StatusPill value={c.status === 'Active' ? 'Active' : 'Halted'} /></div>
                    <div className="perm-row"><span>Accounts in category</span><span className="perm-n">{c.accounts}</span></div>
                    {c.status === 'Active'
                      ? <button className="btn btn-danger btn-sm" onClick={() => ask({ label: 'Halt category — ' + c.name, accounts: c.accounts + ' accounts in ' + c.name, danger: true, onYes: () => setCats((cs) => cs.map((x) => x.id === c.id ? { ...x, status: 'Halted' } : x)) })}><Icon name="halt" size={13} /> Halt category</button>
                      : <button className="btn btn-primary btn-sm" onClick={() => ask({ label: 'Resume category — ' + c.name, accounts: c.accounts + ' accounts in ' + c.name, danger: false, onYes: () => setCats((cs) => cs.map((x) => x.id === c.id ? { ...x, status: 'Active' } : x)) })}><Icon name="play" size={13} /> Resume category</button>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'account' && (
              <div className="stack">
                <SearchInput value={q} onChange={setQ} placeholder="Search account name, holder, ID…" />
                <DataTable pageSize={7} rows={acctRows} search="" columns={[
                  { key: 'accountName', label: 'Account', render: (r) => <div className="cell-2"><span className="cell-strong">{r.accountName}</span><span className="cell-sub mono">#{r.id}</span></div> },
                  { key: 'name', label: 'Holder' },
                  { key: 'status', label: 'State', render: (r) => <StatusPill value={r.status} /> },
                  { key: 'enabled', label: 'Trading', render: (r) => <StatusPill value={r.enabled} /> },
                  { key: 'a', label: '', sortable: false, render: (r) => (r.enabled === 'Disabled' || r.status === 'Liquidation Only' || r.status === 'Suspended')
                    ? <button className="btn btn-primary btn-sm" onClick={() => ask({ label: 'Resume account #' + r.id, accounts: r.accountName, danger: false, onYes: () => setAccts((as) => as.map((x) => x.id === r.id ? { ...x, enabled: 'Enabled', status: x.status === 'Suspended' ? 'Suspended' : 'Active' } : x)) })}><Icon name="play" size={12} /> Resume</button>
                    : <button className="btn btn-danger btn-sm" onClick={() => ask({ label: 'Halt account #' + r.id, accounts: r.accountName, danger: true, onYes: () => setAccts((as) => as.map((x) => x.id === r.id ? { ...x, enabled: 'Disabled', status: 'Liquidation Only' } : x)) })}><Icon name="halt" size={12} /> Halt</button> },
                ]} />
              </div>
            )}

            {tab === 'scheduled' && (
              <div className="stack">
                <div className="row-wrap"><CardHead title="Scheduled & holiday halts" sub="Auto-applied at the window start and lifted at the end. Useful for exchange holidays and early closes." /><div className="spacer" /><button className="btn btn-primary btn-sm" onClick={() => setAddSched(true)}><Icon name="plus" size={13} /> Schedule halt</button></div>
                <DataTable pageSize={6} rows={sched} columns={[
                  { key: 'name', label: 'Name', render: (r) => <span className="cell-strong">{r.name}</span> },
                  { key: 'scope', label: 'Scope', render: (r) => <Badge tone="neutral">{r.scope}</Badge> },
                  { key: 'date', label: 'Date' },
                  { key: 'window', label: 'Window', render: (r) => <span className="mono cell-sub">{r.window}</span> },
                  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
                  { key: 'a', label: '', sortable: false, render: (r) => <div className="dt-actions"><button className="btn btn-ghost btn-sm" onClick={() => setSched((s) => s.filter((x) => x.id !== r.id))}><Icon name="x" size={12} /> Cancel</button></div> },
                ]} />
              </div>
            )}
          </div>
        </Card>

        {confirm && (
          <Modal eyebrow={confirm.danger ? 'Confirm trading halt' : 'Confirm resume'} title={confirm.label} onClose={() => setConfirm(null)}
            footer={<><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className={confirm.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={run}><Icon name={confirm.danger ? 'halt' : 'play'} size={14} /> {confirm.danger ? 'Halt' : 'Resume'} — {confirm.accounts}</button></>}>
            <Note tone={confirm.danger ? 'warn' : 'info'} title={confirm.danger ? 'This affects live trading' : 'Restores order entry'}>
              {confirm.danger
                ? <>This moves <b>{confirm.accounts}</b> to Liquidation Only via the NTC Risks API. Existing positions can be closed; no new positions can be opened. Recorded in the Audit Log.</>
                : <>This restores normal trading for <b>{confirm.accounts}</b> via the NTC Risks API and is recorded in the Audit Log.</>}
            </Note>
          </Modal>
        )}

        {addSched && (
          <Modal eyebrow="Schedule a halt" title="New scheduled halt" onClose={() => setAddSched(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setAddSched(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setSched((s) => [{ id: 'SH-' + Date.now().toString().slice(-4), name: 'New scheduled halt', scope: 'Org-wide', date: 'TBD', window: 'Full day', status: 'Scheduled' }, ...s]); setAddSched(false); }}>Schedule</button></>}>
            <Field label="Name"><input placeholder="e.g. Labor Day — market closed" /></Field>
            <div className="field-row">
              <Field label="Scope"><select><option>Org-wide</option>{D.riskCategories.map((c) => <option key={c.id}>Category · {c.name}</option>)}</select></Field>
              <Field label="Date"><input type="text" placeholder="Sep 07, 2026" /></Field>
            </div>
            <Field label="Window" hint="Local exchange time (CT)"><input placeholder="Full day, or 12:00 CT → EOD" /></Field>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== MARKET DATA (TAL-53) ===================== */
  const MD_TABS = [{ v: 'subs', l: 'Subscriptions' }, { v: 'packages', l: 'Packages & Pricing' }];
  function MarketData() {
    const [tab, setTab] = useState('subs');
    const [subs, setSubs] = useState(D.mdSubscriptions);
    const [q, setQ] = useState('');
    const [assign, setAssign] = useState(false);
    const [manage, setManage] = useState(null);

    const cancel = (id) => setSubs((s) => s.map((x) => x.id === id ? { ...x, status: 'Cancelled', renews: '—' } : x));
    const reactivate = (id) => setSubs((s) => s.map((x) => x.id === id ? { ...x, status: 'Active', renews: 'Jul 09, 2026' } : x));

    const subCols = [
      { key: 'customer', label: 'Customer', render: (r) => <div className="cell-2"><span className="cell-strong">{r.customer}</span><span className="cell-sub mono">{r.cid}</span></div> },
      { key: 'pkg', label: 'Package' },
      { key: 'tier', label: 'Tier', render: (r) => <Badge tone={r.tier === 'Pro' ? 'violet' : 'neutral'}>{r.tier}</Badge> },
      { key: 'mda', label: 'MDA', render: (r) => <StatusPill value={r.mda === 'Signed' ? 'Signed' : 'Required'} /> },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'renews', label: 'Renews' },
      { key: 'a', label: '', sortable: false, render: (r) => <div className="dt-actions"><button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setManage(r); }}>Manage</button></div> },
    ];
    const pkgCols = [
      { key: 'name', label: 'Package', render: (r) => <span className="cell-strong">{r.name}</span> },
      { key: 'exchange', label: 'Exchanges', render: (r) => <span className="cell-sub">{r.exchange}</span> },
      { key: 'tier', label: 'Tier', render: (r) => <Badge tone={r.tier === 'Pro' ? 'violet' : 'neutral'}>{r.tier}</Badge> },
      { key: 'price', label: 'Monthly', num: true, render: (r) => <span className="mono">{money(r.price)}</span> },
      { key: 'mda', label: 'MDA required', render: (r) => r.mda ? <Badge tone="warn" dot>Yes</Badge> : <Badge tone="neutral">No</Badge> },
    ];

    return (
      <div className="page">
        <PageIntro icon="server" eyebrow="Money · Entitlements" title="Market Data"
          sub="Assign and cancel exchange market-data subscriptions per customer. Subscriptions are provisioned through NinjaTrader's add-market-data-subscription API and billed via Stripe — charges appear in Billing Transactions."
          right={<button className="btn btn-primary" onClick={() => setAssign(true)}><Icon name="plus" size={14} /> Assign subscription</button>} />
        <Note tone="warn" icon="lock" title="Non-Professional data requires a signed MDA">A Non-Professional Market Data Agreement must be signed before non-pro data can be entitled. Misclassifying a Professional subscriber exposes Talero to retroactive exchange fees — verify status before assigning.</Note>
        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={MD_TABS} onChange={setTab} /></div>
          {tab === 'subs' ? (
            <>
              <div style={{ padding: '16px 20px 14px' }}><SearchInput value={q} onChange={setQ} placeholder="Search customer, CID, package…" /></div>
              <DataTable columns={subCols} rows={subs} search={q} searchKeys={['customer', 'cid', 'pkg']} onRowClick={setManage} pageSize={8} />
            </>
          ) : (
            <DataTable columns={pkgCols} rows={D.mdPackages.map((p, i) => ({ id: i, ...p }))} pageSize={8} />
          )}
        </Card>

        {assign && (
          <Modal eyebrow="Assign market data" title="Assign subscription" onClose={() => setAssign(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setAssign(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setAssign(false)}><Icon name="check" size={14} /> Assign & provision</button></>}>
            <Field label="Customer"><select>{D.customers.map((c) => <option key={c.id}>{c.name} · {c.id}</option>)}</select></Field>
            <div className="field-row">
              <Field label="Package"><select>{[...new Set(D.mdPackages.map((p) => p.name))].map((n) => <option key={n}>{n}</option>)}</select></Field>
              <Field label="Tier"><select><option>Non-Pro</option><option>Pro</option></select></Field>
            </div>
            <Note tone="info" icon="lock" title="MDA check runs on assign">If the customer hasn't signed the Non-Professional MDA, the subscription is created in <b>MDA Required</b> and data stays gated until they sign in their dashboard.</Note>
          </Modal>
        )}

        {manage && (
          <Modal eyebrow={'Subscription · ' + manage.id} title={manage.customer} onClose={() => setManage(null)}
            footer={<>
              <button className="btn btn-ghost" onClick={() => setManage(null)}>Close</button>
              {manage.status === 'Cancelled'
                ? <button className="btn btn-primary" onClick={() => { reactivate(manage.id); setManage(null); }}><Icon name="refresh" size={14} /> Reactivate</button>
                : <button className="btn btn-danger" onClick={() => { cancel(manage.id); setManage(null); }}><Icon name="x" size={14} /> Cancel subscription</button>}
            </>}>
            <DefRows rows={[
              { l: 'Customer', v: manage.customer + ' · ' + manage.cid },
              { l: 'Package', v: manage.pkg }, { l: 'Tier', v: <Badge tone={manage.tier === 'Pro' ? 'violet' : 'neutral'}>{manage.tier}</Badge> },
              { l: 'MDA', v: <StatusPill value={manage.mda === 'Signed' ? 'Signed' : 'Required'} /> },
              { l: 'Status', v: <StatusPill value={manage.status} /> },
              { l: 'Started', v: manage.started }, { l: 'Renews', v: manage.renews },
            ]} />
            {manage.mda !== 'Signed' && <><div style={{ height: 12 }} /><Note tone="warn" title="Data gated — MDA unsigned">This non-pro entitlement won't deliver data until the customer signs the MDA. You can re-send the signature request from the customer's record.</Note></>}
          </Modal>
        )}
      </div>
    );
  }

  window.BAPages.riskprofiles = RiskProfiles;
  window.BAPages.halts = Halts;
  window.BAPages.marketdata = MarketData;
})();
