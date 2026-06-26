// td-plans.jsx — Plans & pricing + Talero subscription checkout. Exposes TDPages.plans + TDPages.checkout
// NOTE: this is a TALERO platform subscription — funds go to Talero, NOT the FCM (NinjaTrader).
// The charge is recorded in window.TDStore.planTx and surfaced under Billing.
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, IconTile } = window.TDUI;

  const PLANS = [
    { id: 'standard', name: 'Standard', price: 0, per: 'Pay as you trade', micros: 0.38, minis: 1.29,
      features: ['Full platform access via Fintevo', 'Daily statements & tax docs', 'Standard email support'] },
    { id: 'pro', name: 'Talero Pro', price: 129, per: 'per month', micros: 0.29, minis: 0.99, featured: true,
      features: ['Lower commissions on every contract', 'Priority support', 'Everything in Standard'] },
  ];

  function PlanCard({ p, current, onUpgrade }) {
    const isCurrent = current === p.id;
    return (
      <div className={'plan-card' + (p.featured ? ' featured' : '') + (isCurrent ? ' current' : '')}>
        {p.featured && <span className="plan-flag">Best value</span>}
        <div className="plan-top">
          <b className="plan-name">{p.name}</b>
          {isCurrent && <Badge tone="pos" dot>Current plan</Badge>}
        </div>
        <div className="plan-price"><span className="plan-amt mono">${p.price}</span><span className="plan-per">{p.price === 0 ? p.per : '/ mo'}</span></div>
        {p.price !== 0 && <div className="plan-sub">{p.per}</div>}
        <div className="plan-comm">
          <div className="comm-row"><span><Icon name="bolt" size={13} /> Micros</span><b className="mono">${p.micros.toFixed(2)} <small>/ contract</small></b></div>
          <div className="comm-row"><span><Icon name="stats" size={13} /> Minis</span><b className="mono">${p.minis.toFixed(2)} <small>/ contract</small></b></div>
        </div>
        <ul className="plan-feats">
          {p.features.map((f) => <li key={f}><Icon name="check" size={14} /> {f}</li>)}
        </ul>
        {isCurrent
          ? <button className="btn btn-ghost plan-cta" disabled>Your current plan</button>
          : p.id === 'pro'
            ? <button className="btn btn-primary plan-cta" onClick={onUpgrade}><Icon name="sparkles" size={15} /> Upgrade to Pro</button>
            : <button className="btn btn-ghost plan-cta" disabled>Included</button>}
      </div>
    );
  }

  function PlansPage({ onNav }) {
    const current = (window.TDStore && window.TDStore.plan) || 'standard';
    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="sparkles" size={20} /></div>
            <div>
              <h1 className="ph-title">Plans &amp; pricing</h1>
              <p className="ph-sub">Lower your per-contract commissions with Talero Pro. Plan fees are billed by Talero and are separate from exchange and clearing fees charged by NinjaTrader.</p>
            </div>
          </div>
          <div className="pagehead-r"><Badge tone={current === 'pro' ? 'accent' : 'neutral'} dot>{current === 'pro' ? 'Talero Pro' : 'Standard plan'}</Badge></div>
        </div>

        <div className="plan-grid">
          {PLANS.map((p) => <PlanCard key={p.id} p={p} current={current} onUpgrade={() => onNav('checkout')} />)}
        </div>

        <Card>
          <CardHead title="Commission comparison" sub="Per-contract commission by plan. Exchange & NFA fees are passed through separately." />
          <div className="cmp-table">
            <div className="cmp-head"><span>Contract type</span><span className="num">Standard</span><span className="num">Talero Pro</span><span className="num">You save</span></div>
            <div className="cmp-row"><span>Micros (e.g. MES, MNQ)</span><span className="num mono">$0.38</span><span className="num mono">$0.29</span><span className="num mono pos">$0.09 / contract</span></div>
            <div className="cmp-row"><span>Minis (e.g. ES, NQ)</span><span className="num mono">$1.29</span><span className="num mono">$0.99</span><span className="num mono pos">$0.30 / contract</span></div>
          </div>
          <p className="fineprint">Talero Pro is $129 / month, billed by Talero. <span className="muted">[commission schedule illustrative — pending final pricing]</span></p>
        </Card>
      </div>
    );
  }

  function CheckoutPage({ onNav }) {
    const [paid, setPaid] = useState(false);
    const [f, setF] = useState({ name: 'Jordan Castillo', card: '', exp: '', cvc: '', zip: '' });
    const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
    const valid = f.card.replace(/\s/g, '').length >= 12 && f.exp && f.cvc && f.zip;

    const pay = () => {
      if (!valid) return;
      try {
        window.TDStore.plan = 'pro';
        const now = new Date();
        const d = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        window.TDStore.planTx = [{ date: d, inv: 'TAL-' + Date.now().toString().slice(-6), desc: 'Talero Pro plan — monthly subscription', price: '$129.00', status: 'Processed', cat: 'Subscription' }, ...(window.TDStore.planTx || [])];
      } catch (e) {}
      setPaid(true);
    };

    if (paid) {
      return (
        <div className="page">
          <div className="pagehead"><div className="pagehead-l"><div className="ph-icon"><Icon name="check" size={20} /></div><div><h1 className="ph-title">Payment complete</h1></div></div></div>
          <Card className="co-done">
            <span className="co-done-ic"><Icon name="check" size={26} /></span>
            <h2 className="co-done-h">You’re on Talero Pro</h2>
            <p className="co-done-sub">Your $129/month subscription is active. Micros now trade at $0.29 and Minis at $0.99 per contract. A receipt has been added to your Billing page.</p>
            <div className="co-done-cta">
              <button className="btn btn-primary" onClick={() => onNav('billing')}><Icon name="receipt" size={15} /> View in Billing</button>
              <button className="btn btn-ghost" onClick={() => onNav('plans')}>Back to plans</button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="card" size={20} /></div>
            <div>
              <h1 className="ph-title">Checkout</h1>
              <p className="ph-sub">Upgrade to Talero Pro. This subscription is billed by Talero — it’s separate from your brokerage funding, which is held at NinjaTrader Clearing.</p>
            </div>
          </div>
          <div className="pagehead-r"><button className="btn btn-ghost btn-sm" onClick={() => onNav('plans')}><Icon name="arrowLeft" size={14} /> Back to plans</button></div>
        </div>

        <div className="co-grid">
          <Card className="co-form">
            <CardHead eyebrow="Billed by Talero" title="Payment details" />
            <div className="co-fields">
              <label className="fld fld-full"><span className="fld-l">Name on card</span><input value={f.name} onChange={set('name')} /></label>
              <label className="fld fld-full"><span className="fld-l">Card number</span><div className="fld-icon"><Icon name="card" size={15} /><input inputMode="numeric" placeholder="1234 5678 9012 3456" value={f.card} onChange={set('card')} /></div></label>
              <label className="fld"><span className="fld-l">Expiry</span><input placeholder="MM / YY" value={f.exp} onChange={set('exp')} /></label>
              <label className="fld"><span className="fld-l">CVC</span><input inputMode="numeric" placeholder="123" value={f.cvc} onChange={set('cvc')} /></label>
              <label className="fld fld-full"><span className="fld-l">Billing ZIP / postcode</span><input value={f.zip} onChange={set('zip')} /></label>
            </div>
            <div className="flow-note"><Icon name="security" size={14} /> Payments are processed securely. Talero Pro is a platform subscription paid to Talero — no funds move to or from your NinjaTrader brokerage account.</div>
            <button className="btn btn-primary co-pay" disabled={!valid} onClick={pay}><Icon name="lock" size={15} /> Pay $129.00</button>
          </Card>

          <Card className="co-summary">
            <CardHead title="Order summary" />
            <div className="co-line"><span>Talero Pro</span><b className="mono">$129.00</b></div>
            <div className="co-line dim"><span>Billing cycle</span><span>Monthly</span></div>
            <div className="co-line dim"><span>Renews</span><span>Auto, cancel anytime</span></div>
            <div className="co-divider" />
            <div className="co-line co-total"><span>Due today</span><b className="mono">$129.00</b></div>
            <ul className="co-perks">
              <li><Icon name="check" size={13} /> Micros $0.38 → <b>$0.29</b> / contract</li>
              <li><Icon name="check" size={13} /> Minis $1.29 → <b>$0.99</b> / contract</li>
              <li><Icon name="check" size={13} /> Priority support</li>
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.plans = PlansPage;
  window.TDPages.checkout = CheckoutPage;
})();
