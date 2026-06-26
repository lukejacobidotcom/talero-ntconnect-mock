// td-billing.jsx — TAL-10 Billing (+ TAL-21 market-data subscribe entry). Exposes TDPages.billing
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, IconTile, Empty } = window.TDUI;

  const PAYMENTS = [
    { brand: 'Visa', last: '4821', exp: '08 / 28', primary: true },
    { brand: 'Mastercard', last: '7720', exp: '11 / 27' },
  ];
  const SUBS = [
    { started: 'May 2026', name: 'CME Group (Non-Pro)', renews: 'Renews Jun 12', price: '$11.00/mo', method: 'Visa ••4821', status: 'Active' },
    { started: 'May 2026', name: 'CBOT (Non-Pro)', renews: 'Renews Jun 12', price: '$11.00/mo', method: 'Visa ••4821', status: 'Active' },
    { started: 'Apr 2026', name: 'NYMEX (Non-Pro)', renews: 'Expires Jun 09', price: '$11.00/mo', method: 'Visa ••4821', status: 'Expiring' },
    { started: 'Feb 2026', name: 'COMEX (Non-Pro)', renews: 'Cancelled May 01', price: '$11.00/mo', method: '—', status: 'Cancelled' },
  ];
  const SUB_TONE = { Active: 'pos', Expiring: 'warn', Cancelled: 'neutral' };
  const RECEIPTS = [
    { date: 'May 12, 2026', inv: 'INV-100482', desc: 'CME + CBOT market data — monthly', price: '$22.00', status: 'Processed', cat: 'Subscription' },
    { date: 'May 12, 2026', inv: 'INV-100483', desc: 'NYMEX market data — monthly', price: '$11.00', status: 'Processed', cat: 'Subscription' },
    { date: 'May 03, 2026', inv: 'INV-100455', desc: 'Historical data backfill (2y)', price: '$40.00', status: 'Processed', cat: 'Add-on' },
    { date: 'Jun 01, 2026', inv: 'INV-100501', desc: 'CME + CBOT market data — monthly', price: '$22.00', status: 'Pending', cat: 'Subscription' },
  ];
  const REC_TONE = { Processed: 'pos', Pending: 'info', Failed: 'neg' };

  function BillingPage({ onNav }) {
    const [tab, setTab] = useState('All');
    const [q, setQ] = useState('');
    const plan = (window.TDStore && window.TDStore.plan) || 'standard';
    const planTx = (window.TDStore && window.TDStore.planTx) || [];
    const subs = SUBS.filter((s) => tab === 'All' || s.status === tab);
    const receipts = [...planTx, ...RECEIPTS].filter((r) => q === '' || (r.inv + r.desc + r.cat).toLowerCase().includes(q.toLowerCase()));

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="receipt" size={20} /></div>
            <div>
              <div className="eyebrow">Account · Billing</div>
              <h1 className="ph-title">Billing</h1>
              <p className="ph-sub">Your Talero plan, payment methods, recurring exchange market-data subscriptions, and invoices.</p>
            </div>
          </div>
          <div className="pagehead-r">
            <div className="plan-chip">
              <span><small>Current plan</small><b>{plan === 'pro' ? 'Talero Pro · $129/mo' : 'Standard'}</b></span>
              <button className="btn btn-ghost btn-sm" onClick={() => onNav(plan === 'pro' ? 'plans' : 'checkout')}>{plan === 'pro' ? 'Manage' : 'Upgrade'}</button>
            </div>
          </div>
        </div>

        {/* payment methods */}
        <Card>
          <CardHead title="Payment methods" right={<button className="btn btn-ghost btn-sm"><Icon name="plus" size={14} /> Add new</button>} />
          <div className="pay-grid">
            {PAYMENTS.map((p) => (
              <div className="pay-card" key={p.last}>
                <div className="pay-top"><Icon name="card" size={18} /><span>{p.brand}</span>{p.primary && <Badge tone="accent">Primary</Badge>}</div>
                <div className="pay-num mono">•••• •••• •••• {p.last}</div>
                <div className="pay-exp">Expires {p.exp}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* market data subscriptions */}
        <Card>
          <CardHead eyebrow="Recurring" title="Market data subscriptions"
            right={
              <div className="ch-actions">
                <div className="doc-tabs">{['All', 'Active', 'Expiring'].map((c) => <button key={c} className={'doc-tab' + (tab === c ? ' on' : '')} onClick={() => setTab(c)}>{c}</button>)}</div>
                <button className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> Subscribe</button>
              </div>
            } />
          <p className="assume-note"><Icon name="info" size={13} /> Non-professional subscribers must accept the Market Data Agreement before live data is enabled; pricing differs for professional vs. non-professional use per exchange rules. Subscribe flow (TAL-21) assumed to live here in Billing — location pending Product. <span className="muted">[per NTC]</span></p>
          {subs.length ? (
            <div className="mtable">
              <div className="mtable-head"><span>Started</span><span>Subscription</span><span>Renews / Expires</span><span>Price</span><span>Method</span><span>Status</span><span></span></div>
              {subs.map((s, i) => (
                <div className="mtable-row" key={i}>
                  <span data-k="Started">{s.started}</span>
                  <span data-k="Subscription"><b>{s.name}</b></span>
                  <span data-k="Renews / Expires">{s.renews}</span>
                  <span className="mono" data-k="Price">{s.price}</span>
                  <span data-k="Method">{s.method}</span>
                  <span data-k="Status"><Badge tone={SUB_TONE[s.status]} dot>{s.status}</Badge></span>
                  <span className="mtable-act">{s.status !== 'Cancelled' ? <button className="linkbtn">Manage</button> : <button className="linkbtn">Resubscribe</button>}</span>
                </div>
              ))}
            </div>
          ) : <Empty icon="stats" title="No market data subscriptions" action="Subscribe to market data">Subscribe to an exchange to receive live quotes in Fintevo.</Empty>}
        </Card>

        {/* receipts & invoices */}
        <Card>
          <CardHead title="Receipts &amp; invoices" sub="Recurring renewals and one-time add-on charges."
            right={
              <div className="ch-actions">
                <label className="tb-search doc-search"><Icon name="search" size={15} /><input placeholder="Search invoices…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
                <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={14} /> Date range</button>
              </div>
            } />
          {receipts.length ? (
            <div className="rtable">
              <div className="rtable-head"><span>Date</span><span>Invoice</span><span>Description</span><span className="num">Price</span><span>Status</span><span>Category</span><span></span></div>
              {receipts.map((r, i) => (
                <div className="rtable-row" key={i}>
                  <span data-k="Date">{r.date}</span>
                  <span className="mono dim" data-k="Invoice">{r.inv}</span>
                  <span data-k="Description">{r.desc}</span>
                  <span className="num mono" data-k="Price">{r.price}</span>
                  <span data-k="Status"><Badge tone={REC_TONE[r.status]} dot>{r.status}</Badge></span>
                  <span data-k="Category"><Badge tone={r.cat === 'Subscription' ? 'info' : 'violet'}>{r.cat}</Badge></span>
                  <span className="rtable-act"><button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> Invoice</button></span>
                </div>
              ))}
            </div>
          ) : <Empty icon="receipt" title="No charges yet">Your invoices and receipts will appear here.</Empty>}
          <p className="fineprint" style={{ marginTop: 12 }}>Market-data subscriptions are assigned through NinjaTrader Clearing; exchange fees are set by the exchanges and differ for professional vs. non-professional subscribers. <span className="muted">[invoice-ownership detail pending NTC]</span></p>
        </Card>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.billing = BillingPage;
})();
