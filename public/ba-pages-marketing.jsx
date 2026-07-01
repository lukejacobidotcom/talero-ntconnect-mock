// ba-pages-marketing.jsx — Tournaments (TAL-38), Engagement Alerts (TAL-43),
// CMS Management (TAL-47), Emails (TAL-41), Shortlinks (TAL-49).
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, Sel, SubTabs, StatusPill, Badge, Modal, Note, Empty, Field } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  /* ===================== TOURNAMENTS (TAL-38) ===================== */
  function Tournaments() {
    const [view, setView] = useState(null); // selected tournament
    const [create, setCreate] = useState(false);
    const [yearTab, setYearTab] = useState('2026');
    const current = D.tournaments.filter((t) => t.status === 'Active' || t.status === 'Upcoming');
    const finished = D.tournaments.filter((t) => t.status === 'Ended' || t.status === 'Cancelled');

    function TrnCard({ t }) {
      return (
        <div className="trn-card">
          <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
            <StatusPill value={t.status} />
            <span className="mono cell-sub">{t.id}</span>
          </div>
          <b style={{ fontSize: 15 }}>{t.name}</b>
          <div className="trn-stats">
            <div className="trn-stat"><small>Prize fund</small><b>{t.prize}</b></div>
            <div className="trn-stat"><small>Contestants</small><b>{t.contestants}</b></div>
            <div className="trn-stat"><small>{t.status === 'Active' ? 'Ends in' : 'Starts'}</small><b>{t.status === 'Active' ? t.endsIn : t.start}</b></div>
          </div>
          <div className="row-wrap"><button className="btn btn-ghost btn-sm" onClick={() => setView(t)}>View <Icon name="arrowRight" size={13} /></button></div>
        </div>
      );
    }

    return (
      <div className="page">
        <PageIntro icon="trophy" eyebrow="Marketing · Engagement" title="Tournaments"
          sub="Create and manage trading tournaments shown to clients. Tournaments run on NTC simulation accounts with a configurable starting balance (Max Net Liq); standings return % is computed from sim-account data."
          right={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="plus" size={14} /> Create Tournament</button>} />

        <Card>
          <CardHead title="Current" sub="Active and upcoming tournaments." />
          <div className="trn-grid">{current.map((t) => <TrnCard key={t.id} t={t} />)}</div>
        </Card>
        <Card>
          <CardHead title="Finished" right={<Sel value={yearTab} onChange={setYearTab} options={[{ v: '2026', l: '2026' }, { v: '2025', l: '2025' }]} />} />
          <div className="trn-grid">{finished.map((t) => <TrnCard key={t.id} t={t} />)}</div>
        </Card>

        {view && (
          <Modal wide eyebrow={'Tournament · ' + view.id} title={view.name} onClose={() => setView(null)}
            footer={<><button className="btn btn-ghost" onClick={() => setView(null)}>Close</button><button className="btn btn-ghost"><Icon name="doc" size={14} /> View Rules</button></>}>
            <div className="kpi-grid" style={{ marginBottom: 16 }}>
              <div className="kpi"><span className="kpi-label">Status</span><div style={{ marginTop: 4 }}><StatusPill value={view.status} /></div></div>
              <div className="kpi"><span className="kpi-label">Prize fund</span><div className="kpi-value" style={{ fontSize: 21 }}>{view.prize}</div></div>
              <div className="kpi"><span className="kpi-label">Contestants</span><div className="kpi-value" style={{ fontSize: 21 }}>{view.contestants}</div></div>
              <div className="kpi"><span className="kpi-label">Sim start balance</span><div className="kpi-value mono" style={{ fontSize: 21 }}>{D.money(view.balance)}</div></div>
            </div>
            <CardHead title="Competition Standings" sub="Return % from NTC sim-account data." />
            <DataTable pageSize={5} rows={D.standings} columns={[
              { key: 'rank', label: 'Rank', num: true, render: (r) => <span className="mono" style={{ fontWeight: 700 }}>{r.rank}</span> },
              { key: 'username', label: 'Username', render: (r) => <span className="mono">{r.username}</span> },
              { key: 'ret', label: 'Return %', num: true, render: (r) => <span className="mono pos">+{r.ret}%</span> },
              { key: 'behind', label: '% Behind 1st', num: true, render: (r) => <span className="mono cell-sub">{r.behind ? '-' + r.behind + '%' : '—'}</span> },
              { key: 'prize', label: 'Prize' }, { key: 'country', label: 'Country' },
            ]} />
          </Modal>
        )}
        {create && (
          <Modal eyebrow="New tournament" title="Create Tournament" onClose={() => setCreate(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setCreate(false)}>Create</button></>}>
            <Field label="Tournament name"><input placeholder="e.g. July Energy Open" /></Field>
            <div className="field-row">
              <Field label="Start date"><input type="date" /></Field>
              <Field label="End date"><input type="date" /></Field>
            </div>
            <div className="field-row">
              <Field label="Starting sim balance (Max Net Liq)"><input placeholder="$50,000" /></Field>
              <Field label="Entry fee (optional)"><input placeholder="$0" /></Field>
            </div>
            <Field label="Prize structure"><textarea placeholder="1st: $5,000 · 2nd: $2,500 · 3rd: $1,500…" /></Field>
            <Field label="Eligibility rules"><textarea placeholder="Who can enter, account requirements…" /></Field>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== ENGAGEMENT ALERTS (TAL-43) ===================== */
  function Engagement() {
    const [q, setQ] = useState('');
    const cols = [
      { key: 'label', label: 'Label' }, { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'title', label: 'Title' }, { key: 'content', label: 'Content' },
      { key: 'a', label: 'Actions', sortable: false, render: () => <div className="dt-actions"><button className="iconbtn iconbtn-sm"><Icon name="edit" size={13} /></button><button className="iconbtn iconbtn-sm"><Icon name="eye" size={13} /></button><button className="iconbtn iconbtn-sm"><Icon name="trash" size={13} /></button></div> },
    ];
    return (
      <div className="page">
        <PageIntro icon="engagement" eyebrow="Marketing · Content" title="Engagement Alerts Manager"
          sub="Create, target, preview, and track the in-app nudges that surface to clients. All MFFU seed alerts were wiped — Talero starts fresh."
          right={<button className="btn btn-primary"><Icon name="plus" size={14} /> Create Alert</button>} />
        <Card flush>
          <div style={{ padding: '16px 20px 14px' }}><SearchInput value={q} onChange={setQ} placeholder="Search alerts…" /></div>
          {D.engagementAlerts.length === 0
            ? <div style={{ padding: 24 }}><Empty icon="engagement" title="No alerts yet" action="Create your first alert">In-app engagement alerts will appear here. Add one per campaign as Talero needs specific nudges.</Empty></div>
            : <DataTable columns={cols} rows={D.engagementAlerts} search={q} pageSize={8} />}
        </Card>
      </div>
    );
  }

  /* ===================== CMS MANAGEMENT (TAL-47) ===================== */
  function CMS() {
    const SECTIONS = [
      { name: 'Hero', icon: 'bolt', fields: ['Title', 'Subtitle', 'Primary CTA label', 'Primary CTA link'] },
      { name: 'Pricing', icon: 'billing', fields: ['Section title', 'Subtitle'] },
      { name: 'Community', icon: 'customers', fields: ['Title', 'Link label', 'Link URL'] },
      { name: 'Testimonials', icon: 'news', fields: ['Section title', 'Subtitle'] },
    ];
    return (
      <div className="page">
        <PageIntro icon="cms" eyebrow="Marketing · Content" title="CMS Management"
          sub="Edit the talero.com marketing site and manage blog & news posts. All MFFU seed content was wiped — fields are blank until Marketing supplies Talero copy." />
        <div className="grid-2-13">
          <Card>
            <CardHead title="Website Editor" sub="Section-by-section content fields." />
            {SECTIONS.map((s) => (
              <div className="cms-section" key={s.name}>
                <h4><Icon name={s.icon} size={16} /> {s.name}</h4>
                {s.fields.map((f) => (
                  <Field key={f} label={f}><input placeholder={`Enter ${f.toLowerCase()}…`} /></Field>
                ))}
                <button className="btn btn-ghost btn-sm">Save section</button>
              </div>
            ))}
          </Card>
          <Card flush>
            <CardHead title="Blogs & News" right={<button className="btn btn-primary btn-sm"><Icon name="plus" size={13} /> Create Post</button>} />
            <div style={{ padding: 20 }}>
              <Empty icon="news" title="No posts yet">Blog and news posts will appear here once Marketing publishes Talero content.</Empty>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ===================== EMAILS (TAL-41) ===================== */
  function Emails() {
    const [q, setQ] = useState('');
    const [create, setCreate] = useState(false);
    const cols = [
      { key: 'id', label: 'ID' }, { key: 'created', label: 'Created' }, { key: 'key', label: 'Action Key' },
      { key: 'subject', label: 'Subject' }, { key: 'fields', label: 'Fields' }, { key: 'updated', label: 'Last Updated' },
    ];
    return (
      <div className="page">
        <PageIntro icon="mail" eyebrow="Marketing · Content" title="Emails"
          sub="The email-template manager — create, version, and preview templates tied to action keys with variable injection. All MFFU templates were wiped; build them as Talero features ship."
          right={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="plus" size={14} /> Create Template</button>} />
        <Card flush>
          <div style={{ padding: '16px 20px 14px' }}><SearchInput value={q} onChange={setQ} placeholder="Search templates…" /></div>
          {D.emailTemplates.length === 0
            ? <div style={{ padding: 24 }}><Empty icon="mail" title="No templates yet" action="Create a template" onAction={() => setCreate(true)}>Templates list is empty at launch. {D.actionKeys.length} IIB action keys are registered and ready to wire up.</Empty></div>
            : <DataTable columns={cols} rows={D.emailTemplates} search={q} pageSize={8} />}
        </Card>
        <Card>
          <CardHead title="Registered action keys" sub="IIB lifecycle triggers available to build templates against (TAL-65)." />
          <div className="row-wrap">{D.actionKeys.map((k) => <span className="badge badge-neutral mono" key={k} style={{ padding: '6px 10px', fontWeight: 600 }}>{k}</span>)}</div>
        </Card>
        {create && (
          <Modal wide eyebrow="New email template" title="Email Editor" onClose={() => setCreate(false)}
            footer={<><button className="btn btn-ghost" onClick={() => setCreate(false)}>Back to Email Manager</button><button className="btn btn-primary" onClick={() => setCreate(false)}><Icon name="check" size={14} /> Save</button></>}>
            <div className="field-row">
              <Field label="Action key"><select>{D.actionKeys.map((k) => <option key={k}>{k}</option>)}</select></Field>
              <Field label="Version"><input placeholder="v1" /></Field>
            </div>
            <Field label="Subject"><input placeholder="e.g. Your Talero account is active" /></Field>
            <Field label="Body (HTML)" hint="Use variables like {{ first_name }}, {{ account_number }}."><textarea placeholder="<p>Hi {{ first_name }},</p>…" style={{ minHeight: 120 }} /></Field>
            <div className="row-wrap"><button className="btn btn-ghost btn-sm"><Icon name="bolt" size={13} /> AI Template Generator</button><button className="btn btn-ghost btn-sm"><Icon name="plus" size={13} /> Insert Component</button></div>
          </Modal>
        )}
      </div>
    );
  }

  /* ===================== SHORTLINKS (TAL-49) ===================== */
  function Shortlinks() {
    const [q, setQ] = useState('');
    const cols = [
      { key: 'key', label: 'Key', render: (r) => <span className="mono">talero.com/{r.key}</span> },
      { key: 'value', label: 'Destination', render: (r) => <span className="mono cell-sub">{r.value}</span> },
      { key: 'a', label: 'Actions', sortable: false, render: () => <div className="dt-actions"><button className="iconbtn iconbtn-sm"><Icon name="edit" size={13} /></button><button className="iconbtn iconbtn-sm"><Icon name="trash" size={13} /></button></div> },
    ];
    return (
      <div className="page">
        <PageIntro icon="link" eyebrow="Marketing · Content" title="talero.com Shortlink Store Manager"
          sub="Create short keys that resolve to longer destination URLs on talero.com — for campaigns, support links, and trackable redirects."
          right={<button className="btn btn-primary"><Icon name="plus" size={14} /> Add Key</button>} />
        <Card flush>
          <div style={{ padding: '16px 20px 14px' }}><SearchInput value={q} onChange={setQ} placeholder="Search by key…" /></div>
          {D.shortlinks.length === 0
            ? <div style={{ padding: 24 }}><Empty icon="link" title="No shortlinks yet" action="Add your first key">Shortlinks resolve on the talero.com domain. The store is empty at launch.</Empty></div>
            : <DataTable columns={cols} rows={D.shortlinks} search={q} pageSize={10} />}
        </Card>
      </div>
    );
  }

  window.BAPages.tournaments = Tournaments;
  window.BAPages.engagement = Engagement;
  window.BAPages.cms = CMS;
  window.BAPages.emails = Emails;
  window.BAPages.shortlinks = Shortlinks;
})();
