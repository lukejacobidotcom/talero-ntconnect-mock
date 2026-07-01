// ba-pages-money.jsx — Funding & Withdrawals (TAL-37), Billing Transactions (TAL-34).
(function () {
  const { useState } = React;
  const { Icon } = window.BAShell;
  const { PageIntro, Card, CardHead, DataTable, SearchInput, Sel, SubTabs, StatusPill, Badge, Note } = window.BAUI;
  const D = window.BAData;
  window.BAPages = window.BAPages || {};

  /* ===================== FUNDING & WITHDRAWALS (TAL-37) ===================== */
  const FW_TABS = [{ v: 'deposits', l: 'Deposits' }, { v: 'withdrawals', l: 'Withdrawals' }];
  function Funding() {
    const [tab, setTab] = useState('deposits');
    const [q, setQ] = useState('');
    const isDep = tab === 'deposits';
    const rows = isDep ? D.deposits : D.withdrawals;
    const cols = [
      { key: 'created', label: 'Created' },
      { key: 'client', label: 'Client', render: (r) => <span className="cell-strong">{r.client}</span> },
      { key: 'account', label: 'Account', render: (r) => <span className="mono">#{r.account}</span> },
      { key: 'method', label: 'Method', render: (r) => <Badge tone="neutral">{r.method}</Badge> },
      { key: 'amount', label: 'Amount', num: true, render: (r) => <span className="mono">{D.money(r.amount)}</span> },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      { key: 'ref', label: 'Reference #', render: (r) => <span className="mono cell-sub">{r.ref}</span> },
    ];
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return (
      <div className="page">
        <PageIntro icon="funding" eyebrow="Money · Transfers" title="Funding & Withdrawals"
          sub="Admin visibility into client deposits and withdrawals. Withdrawals are processed by NTC Treasury under a manual review model — this queue is read-only at v1." />
        <Note tone="info" title="View-only queue">No approve / reject / mark-processed actions at v1. Withdrawal processing is handled by NTC Treasury; Talero admin has read-only visibility. Affiliates and Payout Analytics have been removed.</Note>
        <Card flush>
          <div style={{ padding: '4px 12px 0' }}><SubTabs value={tab} tabs={FW_TABS} onChange={(v) => { setTab(v); setQ(''); }} /></div>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder={'Search client, account, reference…'} />
            <div className="spacer" />
            <span className="badge badge-neutral">{rows.length} {isDep ? 'deposits' : 'withdrawals'}</span>
            <span className="badge badge-accent">{D.money(total)} total</span>
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['client', 'account', 'ref']} pageSize={8} />
        </Card>
      </div>
    );
  }

  /* ===================== BILLING TRANSACTIONS (TAL-34) ===================== */
  const TX_STATUS = ['All', 'Pending', 'Processed', 'Failed', 'Refunded', 'Disputed'];
  const TX_CAT = ['All', 'Subscription', 'Add-on'];
  function Transactions() {
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('All');
    const [cat, setCat] = useState('All');
    let rows = D.transactions;
    if (status !== 'All') rows = rows.filter((r) => r.status === status);
    if (cat !== 'All') rows = rows.filter((r) => r.category === cat);
    const cols = [
      { key: 'id', label: 'ID', render: (r) => <span className="mono">{r.id}</span> },
      { key: 'date', label: 'Date' },
      { key: 'amount', label: 'Amount', num: true, render: (r) => <span className="mono">{D.money(r.amount)}</span> },
      { key: 'category', label: 'Category', render: (r) => <Badge tone={r.category === 'Subscription' ? 'info' : 'violet'}>{r.category}</Badge> },
      { key: 'payment', label: 'Payment Type', render: (r) => <span className="mono cell-sub">{r.payment}</span> },
      { key: 'processor', label: 'Processor' },
      { key: 'txid', label: 'Transaction ID', render: (r) => <span className="mono cell-sub">{r.txid}</span> },
      { key: 'client', label: 'Client', render: (r) => <span className="linklike">{r.client}</span> },
      { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    ];
    return (
      <div className="page">
        <PageIntro icon="billing" eyebrow="Money · Billing" title="Billing Transactions"
          sub="The admin view of client credit-card transactions — market-data subscriptions and add-on charges. ACH / wire money movement lives in Funding & Withdrawals."
          right={<div className="row-wrap"><button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Export</button><button className="btn btn-ghost btn-sm"><Icon name="doc" size={14} /> Ranged Invoice</button></div>} />
        <Card flush>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={q} onChange={setQ} placeholder="Search Transaction ID or Client…" />
            <Sel value={status} icon="filter" onChange={setStatus} options={TX_STATUS.map((s) => ({ v: s, l: s === 'All' ? 'All statuses' : s }))} />
            <Sel value={cat} onChange={setCat} options={TX_CAT.map((s) => ({ v: s, l: s === 'All' ? 'All categories' : s }))} />
          </div>
          <DataTable columns={cols} rows={rows} search={q} searchKeys={['id', 'txid', 'client']} pageSize={8} />
        </Card>
      </div>
    );
  }

  window.BAPages.funding = Funding;
  window.BAPages.transactions = Transactions;
})();
