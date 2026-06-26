// td-funding.jsx — TAL-13 Funding & Withdrawals.
// Configured UI: Talero collects payment details natively (no FCM iframe / redirect).
// Funds settle to NinjaTrader Clearing (the FCM) — every flow surfaces NTC as destination.
// Exposes TDPages.funding
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, IconTile, StateBanners } = window.TDUI;
  const { fmtUSD } = window.TDCharts;

  // ---- NTC destination of record (shown anywhere money leaves the client) ----
  const NTC = {
    bank: 'BMO Harris Bank N.A.',
    bankAddr: '320 S Canal St, Chicago, IL 60606',
    aba: '071000288',
    swift: 'HATRUS44',
    beneficiary: 'NinjaTrader Clearing, LLC — Customer Segregated Funds',
    benAcct: '3719-0048210',
  };

  // capture: how Talero collects payment details for each method
  //   plaid   → link / select a bank, we debit it
  //   card    → Stripe card fields
  //   wire    → show NTC beneficiary instructions for the client to push to
  //   iban    → SEPA: client's IBAN + holder (direct debit)
  //   sortcode→ UK FPS: sort code + account number + holder
  const DEP_METHODS = [
    { id: 'ach', ic: 'bank', t: 'ACH bank transfer', short: 'ACH', d: 'Linked U.S. bank · via Plaid', avail: '1–3 business days', capture: 'plaid', cap: 5000, instant: 0.25, settle: 3, cur: 'USD' },
    { id: 'wire', ic: 'bolt', t: 'Wire transfer', short: 'Wire', d: 'Domestic / international wire', avail: '~1 business day', capture: 'wire', instant: 0.5, settle: 1, cur: 'USD' },
    { id: 'debit', ic: 'card', t: 'Debit card', short: 'Debit card', d: 'Visa / Mastercard · via Stripe', avail: 'Same day', capture: 'card', cap: 25000, instant: 0.5, settle: 0, cur: 'USD' },
    { id: 'rtp', ic: 'bolt', t: 'Real Time Payments', short: 'RTP', d: 'BMO RTP · near-instant', avail: 'Near-instant', capture: 'plaid', instant: 1, settle: 0, cur: 'USD' },
    { id: 'sepa', ic: 'globe', t: 'SEPA (EUR)', short: 'SEPA', d: 'Euro bank transfer', avail: '3–5 business days', capture: 'iban', instant: 0, settle: 5, cur: 'EUR' },
    { id: 'fps', ic: 'globe', t: 'UK Faster Payments (GBP)', short: 'UK FPS', d: 'GBP bank transfer', avail: 'Same day', capture: 'sortcode', instant: 0, settle: 0, cur: 'GBP' },
  ];
  const WD_METHODS = [
    { id: 'ach', ic: 'bank', t: 'ACH bank transfer', short: 'ACH', d: 'To a linked U.S. bank', avail: '1–3 business days', settle: 3 },
    { id: 'wire', ic: 'bolt', t: 'Wire transfer', short: 'Wire', d: 'Requires identity verification', avail: '1–2 business days', settle: 2 },
    { id: 'rto', ic: 'globe', t: 'SEPA / UK Faster Payments', short: 'SEPA / FPS', d: 'Return-to-originator only', avail: '3–5 business days', settle: 5 },
  ];

  const BANKS = [
    { id: 'chase', name: 'Chase', mask: '••4821', type: 'Checking', verified: true },
    { id: 'bmo', name: 'BMO Harris', mask: '••7720', type: 'Savings', verified: true },
  ];

  const SEED = [
    { date: 'May 16, 2026', type: 'Deposit', amount: 10000, method: 'ACH · Chase ••4821', account: '#1912208', status: 'Completed', ref: 'DEP-20260516-1' },
    { date: 'May 14, 2026', type: 'Deposit', amount: 5000, method: 'Wire · BMO ••7720', account: '#1912208', status: 'Completed', ref: 'DEP-20260514-2' },
    { date: 'May 18, 2026', type: 'Withdrawal', amount: -2500, method: 'ACH · Chase ••4821', account: '#1912208', status: 'Processing', ref: 'WD-20260518-7' },
  ];
  const STATUS_TONE = { Completed: 'pos', Processing: 'info', 'Pending Review': 'warn', Failed: 'neg', Cancelled: 'neutral' };
  const ACCT_OPTS = [{ v: '1912208', l: '#1912208 · Individual' }, { v: '1912240', l: '#1912240 · Entity' }];

  const fmtCur = (n, cur) => cur === 'EUR' ? '€' + n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : cur === 'GBP' ? '£' + n.toLocaleString(undefined, { minimumFractionDigits: 2 }) : fmtUSD(n, 2);

  // add N business days to today → "Mon, Jun 15"
  function projDate(days) {
    const d = new Date(2026, 5, 12); let added = 0;
    while (added < days) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++; }
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  /* ---------- transfer-history tracker (unchanged behaviour) ---------- */
  const STEPS = {
    Deposit: ['Submitted', 'Processing', 'Completed'],
    Withdrawal: ['Submitted', 'Pending Review', 'Processing', 'Completed'],
  };
  function trackerFor(type, status) {
    const s = STEPS[type] || STEPS.Deposit;
    if (status === 'Cancelled' || status === 'Failed') return { steps: s, active: -1, bad: status };
    if (status === 'Completed') return { steps: s, active: s.length, bad: null };
    let active = s.indexOf(status); if (active < 0) active = 0;
    return { steps: s, active, bad: null };
  }
  function TxTracker({ row }) {
    const { steps, active, bad } = trackerFor(row.type, row.status);
    if (bad) return <div className="tx-track"><div className="tx-bad"><Icon name="alert" size={14} /> Transfer {bad.toLowerCase()} · {row.ref} · {row.account}</div></div>;
    return (
      <div className="tx-track">
        <div className="tx-track-h">Status · {row.account} · {row.ref}</div>
        <ol className="stepper">
          {steps.map((label, idx) => {
            const st = idx < active ? 'done' : idx === active ? 'current' : 'todo';
            return <li className={'step ' + st} key={idx}><span className="step-dot">{idx < active ? <Icon name="check" size={12} /> : idx + 1}</span><span className="step-l">{label}</span></li>;
          })}
        </ol>
        {(row.status === 'Pending Review' || row.status === 'Processing') && <button className="linkbtn" style={{ marginTop: 14 }}>Contact support to cancel</button>}
      </div>
    );
  }

  /* ---------- small reusable pieces ---------- */
  function CopyRow({ k, v, mono, refField, copied, onCopy }) {
    return (
      <div className={'wire-row' + (refField ? ' ref' : '')}>
        <span className="wire-k">{k}</span>
        <span className={'wire-v' + (mono && !refField ? ' mono' : '')}>{v}</span>
        <button className="wire-copy" title="Copy" onClick={() => onCopy(k, v)}><Icon name={copied === k ? 'check' : 'file'} size={14} /></button>
      </div>
    );
  }
  function BankPicker({ banks, value, onChange, onAdd, linking }) {
    if (linking) return (
      <div className="plaid-linking">
        <span className="plaid-spin" />
        <b>Connecting to your bank…</b>
        <small>Plaid is securely verifying your account. We never see or store your bank login.</small>
      </div>
    );
    return (
      <div className="bank-list">
        {banks.map((b) => (
          <button key={b.id} className={'bank-row' + (value === b.id ? ' on' : '')} onClick={() => onChange(b.id)}>
            <IconTile name="bank" tone={value === b.id ? 'accent' : 'muted'} size={16} />
            <span className="bank-meta">
              <b>{b.name} {b.mask}</b>
              <small>{b.type}{b.verified && <> · <span className="bank-verified"><Icon name="check" size={10} /> Instantly verified</span></>}</small>
            </span>
            <span className="bank-radio" />
          </button>
        ))}
        <button className="plaid-add" onClick={onAdd}><Icon name="plus" size={15} /> Link a new bank with Plaid</button>
      </div>
    );
  }

  /* ===================================================================== */
  function FundingPage({ app }) {
    const [tab, setTab] = useState('deposit');
    const [step, setStep] = useState(0);
    const [method, setMethod] = useState('ach');
    const [acct, setAcct] = useState('1912208');
    const [amount, setAmount] = useState('');
    // capture state
    const [banks, setBanks] = useState(BANKS);
    const [bank, setBank] = useState('chase');
    const [linking, setLinking] = useState(false);
    const [card, setCard] = useState({ num: '', exp: '', cvc: '', zip: '' });
    const [iban, setIban] = useState({ iban: '', bic: '', name: '' });
    const [sort, setSort] = useState({ sort: '', acct: '', name: '' });
    const [wireAck, setWireAck] = useState(false);
    // withdraw
    const [dest, setDest] = useState('chase');
    const [smsSent, setSmsSent] = useState(false);
    const [smsCode, setSmsCode] = useState('');
    // chrome
    const [copied, setCopied] = useState('');
    const [rows, setRows] = useState(SEED);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    const [doneRec, setDoneRec] = useState(null);

    const eligible = app && app.acctState === 'active' && app.kyc === 'verified';
    const available = 9140.55;
    const amt = parseFloat(amount) || 0;
    const isDep = tab === 'deposit';
    const methods = isDep ? DEP_METHODS : WD_METHODS;
    const sel = methods.find((m) => m.id === method) || methods[0];
    const cur = sel.cur || 'USD';
    const selBank = banks.find((b) => b.id === bank) || banks[0];
    const destBank = banks.find((b) => b.id === dest) || banks[0];
    const acctLabel = ACCT_OPTS.find((o) => o.v === acct).l;

    const STEP_LABELS = isDep ? ['Method', 'Details', 'Amount', 'Review'] : ['Method', 'Destination', 'Amount', 'Review'];
    const instantAmt = isDep && sel.instant ? Math.min(amt * sel.instant, 25000) : 0;

    const copy = (k, v) => { try { navigator.clipboard.writeText(String(v)); } catch (e) {} setCopied(k); setTimeout(() => setCopied(''), 1200); };
    const reset = () => {
      setStep(0); setAmount(''); setWireAck(false); setSmsSent(false); setSmsCode('');
      setCard({ num: '', exp: '', cvc: '', zip: '' }); setIban({ iban: '', bic: '', name: '' }); setSort({ sort: '', acct: '', name: '' });
    };
    const switchTab = (t) => { if (t === tab) return; setTab(t); setMethod(t === 'deposit' ? 'ach' : 'ach'); setDoneRec(null); reset(); };
    const startPlaid = () => {
      setLinking(true);
      setTimeout(() => {
        const id = 'wf' + banks.length;
        setBanks((b) => [...b, { id, name: 'Wells Fargo', mask: '••3092', type: 'Checking', verified: true }]);
        setBank(id); setLinking(false);
      }, 1600);
    };

    // ---- per-step validation ----
    const detailsValid = (() => {
      if (!isDep) return !!dest; // withdraw step 2 = destination
      if (sel.capture === 'plaid') return !linking && !!bank;
      if (sel.capture === 'card') return card.num.replace(/\s/g, '').length >= 15 && card.exp.length >= 4 && card.cvc.length >= 3 && card.zip.length >= 4;
      if (sel.capture === 'wire') return wireAck;
      if (sel.capture === 'iban') return iban.iban.replace(/\s/g, '').length >= 15 && iban.name.trim().length > 1;
      if (sel.capture === 'sortcode') return sort.sort.replace(/\D/g, '').length >= 6 && sort.acct.replace(/\D/g, '').length >= 6 && sort.name.trim().length > 1;
      return true;
    })();
    const amtValid = isDep
      ? amt > 0 && !(sel.cap && cur === 'USD' && amt > sel.cap)
      : amt > 0 && amt <= available;
    const needSms = !isDep && amt >= 5000;
    const reviewValid = needSms ? smsSent && smsCode.replace(/\D/g, '').length >= 6 : true;
    const canNext = step === 0 ? true : step === 1 ? detailsValid : step === 2 ? amtValid : reviewValid;

    const submit = () => {
      const ref = (isDep ? 'DEP-' : 'WD-') + Date.now().toString().slice(-6);
      const methodLabel = isDep
        ? (sel.capture === 'plaid' ? sel.short + ' · ' + selBank.name + ' ' + selBank.mask
          : sel.capture === 'card' ? 'Debit · ••' + (card.num.replace(/\s/g, '').slice(-4) || '0000')
          : sel.capture === 'wire' ? 'Wire · inbound'
          : sel.t)
        : sel.short + ' · ' + destBank.name + ' ' + destBank.mask;
      const rec = {
        date: 'Today', type: isDep ? 'Deposit' : 'Withdrawal',
        amount: isDep ? amt : -amt, method: methodLabel, account: '#' + acct,
        status: isDep ? (sel.capture === 'wire' ? 'Submitted' : 'Processing') : 'Pending Review', ref,
      };
      setRows((r) => [rec, ...r]);
      setDoneRec(rec);
    };

    const shown = rows.filter((r) => q === '' || (r.ref + r.method + r.type).toLowerCase().includes(q.toLowerCase()));

    /* ---------------- step bodies ---------------- */
    const renderMethod = () => (
      <>
        <label className="fld" style={{ marginBottom: 14 }}>
          <span className="fld-l">{isDep ? 'Deposit to account' : 'Withdraw from account'}</span>
          <div className="fld-sel"><select value={acct} onChange={(e) => setAcct(e.target.value)}>{ACCT_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select><span className="fld-chev"><Icon name="chevron" size={13} /></span></div>
        </label>
        {!isDep && (
          <div className="withdraw-avail" style={{ marginBottom: 14 }}>
            <span>Available to withdraw</span><b className="mono">{fmtUSD(available, 2)}</b>
          </div>
        )}
        <div className="fld-l" style={{ marginBottom: 8 }}>Choose a {isDep ? 'funding' : 'withdrawal'} method</div>
        <div className="method-list">
          {methods.map((m) => (
            <button key={m.id} className={'method-row' + (method === m.id ? ' on' : '')} onClick={() => setMethod(m.id)}>
              <IconTile name={m.ic} tone={method === m.id ? 'accent' : 'muted'} size={16} />
              <span className="method-meta"><b>{m.t}</b><small>{m.d}</small></span>
              <span className="method-avail">{m.avail}</span>
            </button>
          ))}
        </div>
      </>
    );

    const renderDetails = () => {
      if (!isDep) {
        return (
          <>
            <BankPicker banks={banks} value={dest} onChange={setDest} onAdd={startPlaid} linking={linking} />
            <div className="flow-note"><Icon name="security" size={14} /> Disbursements can only go to an account in your name that you’ve previously funded from, or that’s listed on your account application.</div>
          </>
        );
      }
      if (sel.capture === 'plaid') return (
        <>
          <BankPicker banks={banks} value={bank} onChange={setBank} onAdd={startPlaid} linking={linking} />
          {!linking && <div className="flow-note"><Icon name="security" size={14} /> Linked through Plaid — Talero never sees or stores your bank credentials. The account holder name must match your Talero profile.</div>}
        </>
      );
      if (sel.capture === 'card') return (
        <>
          <div className="card-form">
            <label className="fld fld-full"><span className="fld-l">Card number</span>
              <div className="fld-icon"><Icon name="card" size={15} /><input inputMode="numeric" placeholder="1234 5678 9012 3456" value={card.num} onChange={(e) => setCard({ ...card, num: e.target.value })} /></div></label>
            <label className="fld"><span className="fld-l">Expiry</span><input placeholder="MM / YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></label>
            <label className="fld"><span className="fld-l">CVC</span><input inputMode="numeric" placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} /></label>
            <label className="fld fld-full"><span className="fld-l">Billing ZIP / postal code</span><input placeholder="75024" value={card.zip} onChange={(e) => setCard({ ...card, zip: e.target.value })} /></label>
          </div>
          <div className="card-brandrow"><Icon name="lock" size={13} /> Card details are tokenised by Stripe — debit cards only. Credit cards aren’t accepted.</div>
        </>
      );
      if (sel.capture === 'wire') return (
        <>
          <div className="wire-instr">
            <CopyRow k="Beneficiary" v={NTC.beneficiary} copied={copied} onCopy={copy} />
            <CopyRow k="Beneficiary acct" v={NTC.benAcct} mono copied={copied} onCopy={copy} />
            <CopyRow k="Bank" v={NTC.bank} copied={copied} onCopy={copy} />
            <CopyRow k="ABA / Routing" v={NTC.aba} mono copied={copied} onCopy={copy} />
            <CopyRow k="SWIFT (intl)" v={NTC.swift} mono copied={copied} onCopy={copy} />
            <CopyRow k="Reference — required" v={'Talero acct #' + acct} refField copied={copied} onCopy={copy} />
          </div>
          <div className="flow-note warn"><Icon name="alert" size={14} /> You must include <b>#{acct}</b> in the wire reference field. Wires received without it require manual Treasury resolution and may be delayed.</div>
          <label className="wire-ack">
            <input type="checkbox" checked={wireAck} onChange={(e) => setWireAck(e.target.checked)} />
            <span>I’ve sent (or scheduled) this wire from a bank account in my own name and included my account number in the reference.</span>
          </label>
        </>
      );
      if (sel.capture === 'iban') return (
        <>
          <div className="card-form">
            <label className="fld fld-full"><span className="fld-l">IBAN</span><input placeholder="DE89 3704 0044 0532 0130 00" value={iban.iban} onChange={(e) => setIban({ ...iban, iban: e.target.value })} /></label>
            <label className="fld"><span className="fld-l">BIC / SWIFT</span><input placeholder="COBADEFFXXX" value={iban.bic} onChange={(e) => setIban({ ...iban, bic: e.target.value })} /></label>
            <label className="fld"><span className="fld-l">Account holder</span><input placeholder="Full name" value={iban.name} onChange={(e) => setIban({ ...iban, name: e.target.value })} /></label>
          </div>
          <div className="flow-note"><Icon name="info" size={14} /> SEPA direct debit in EUR. The IBAN holder name must match your Talero profile. Settles in 3–5 business days.</div>
        </>
      );
      if (sel.capture === 'sortcode') return (
        <>
          <div className="card-form">
            <label className="fld"><span className="fld-l">Sort code</span><input inputMode="numeric" placeholder="00-00-00" value={sort.sort} onChange={(e) => setSort({ ...sort, sort: e.target.value })} /></label>
            <label className="fld"><span className="fld-l">Account number</span><input inputMode="numeric" placeholder="12345678" value={sort.acct} onChange={(e) => setSort({ ...sort, acct: e.target.value })} /></label>
            <label className="fld fld-full"><span className="fld-l">Account holder</span><input placeholder="Full name" value={sort.name} onChange={(e) => setSort({ ...sort, name: e.target.value })} /></label>
          </div>
          <div className="flow-note"><Icon name="info" size={14} /> UK Faster Payments in GBP. The account holder name must match your Talero profile.</div>
        </>
      );
      return null;
    };

    const renderAmount = () => (
      <>
        <div className="amount-big">
          <span className="amount-cur">{cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'}</span>
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="amount-chips">
          {[1000, 5000, 10000, 25000].map((v) => <button key={v} className="amount-chip" onClick={() => setAmount(String(v))}>{cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'}{v.toLocaleString()}</button>)}
          {!isDep && <button className="amount-chip" onClick={() => setAmount(String(available))}>Max</button>}
        </div>
        {isDep && sel.cap && cur === 'USD' && amt > sel.cap && <span className="fld-hint neg" style={{ marginTop: 10, display: 'block' }}>{sel.t} is capped at {fmtUSD(sel.cap)} per transaction — use a wire for larger amounts.</span>}
        {!isDep && amt > available && <span className="fld-hint neg" style={{ marginTop: 10, display: 'block' }}>Amount exceeds your available cash ({fmtUSD(available, 2)}).</span>}
        {isDep ? (
          <div className="flow-note"><Icon name="clock" size={14} /> {sel.avail === 'Near-instant' || sel.avail === 'Same day' ? 'Expected available' : 'Projected available to trade'}: <b>{sel.settle === 0 ? 'today' : projDate(sel.settle)}</b>{sel.settle > 0 ? ` (${sel.avail})` : ''}. Timing depends on your bank.</div>
        ) : (
          <div className="flow-note"><Icon name="clock" size={14} /> After Treasury processing, funds typically arrive by <b>{projDate(sel.settle)}</b> ({sel.avail}). Actual timing depends on your bank.</div>
        )}
      </>
    );

    const renderReview = () => (
      <>
        <div className="review-rows">
          <div className="review-row"><span className="review-k">{isDep ? 'Funding method' : 'Withdrawal method'}</span><span className="review-v">{sel.t}</span></div>
          {isDep && sel.capture === 'plaid' && <div className="review-row"><span className="review-k">From</span><span className="review-v">{selBank.name} {selBank.mask}</span></div>}
          {isDep && sel.capture === 'card' && <div className="review-row"><span className="review-k">From</span><span className="review-v">Debit ••{card.num.replace(/\s/g, '').slice(-4) || '0000'}</span></div>}
          {isDep && sel.capture === 'wire' && <div className="review-row"><span className="review-k">From</span><span className="review-v">Your bank → wire</span></div>}
          {isDep && (sel.capture === 'iban' || sel.capture === 'sortcode') && <div className="review-row"><span className="review-k">From</span><span className="review-v">{(iban.name || sort.name) || 'Your bank'}</span></div>}
          {!isDep && <div className="review-row"><span className="review-k">To</span><span className="review-v">{destBank.name} {destBank.mask}</span></div>}
          <div className="review-row"><span className="review-k">{isDep ? 'To account' : 'Debited from'}</span><span className="review-v">{acctLabel}</span></div>
          {isDep && <div className="review-row"><span className="review-k">Held by</span><span className="review-v">NinjaTrader Clearing</span></div>}
          <div className="review-row total"><span className="review-k">Amount</span><span className="review-v mono">{fmtCur(amt, cur)}</span></div>
        </div>

        {isDep && instantAmt > 0 && (
          <div className="instant-bp">
            <Icon name="bolt" size={16} />
            <div><b>Up to <span className="instant-amt">{fmtUSD(instantAmt)}</span> instant buying power</b>
              <small>A portion of this {sel.t.split(' ')[0].toLowerCase()} deposit can be available to trade right away while the full amount settles{sel.settle > 0 ? ` by ${projDate(sel.settle)}` : ' today'}.</small></div>
          </div>
        )}

        {needSms && (
          <div className="sms-box">
            <div className="sms-top"><Icon name="phone" size={14} /> SMS verification required</div>
            <small style={{ fontSize: 11.5, color: 'var(--text-2)' }}>Withdrawals of {fmtUSD(5000)} or more need a one-time code sent to your phone on file (•••• 4471).</small>
            {!smsSent
              ? <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setSmsSent(true)}><Icon name="send" size={13} /> Send code</button>
              : <div className="sms-row"><input inputMode="numeric" maxLength={6} placeholder="••••••" value={smsCode} onChange={(e) => setSmsCode(e.target.value)} /><button className="btn btn-ghost btn-sm" onClick={() => setSmsSent(true)}>Resend</button></div>}
          </div>
        )}

        <div className="flow-note">
          <Icon name={isDep ? 'security' : 'info'} size={14} />
          {isDep
            ? <>Deposits must come from an account in your own name. Talero is an Introducing Broker — funds settle directly to your account at <b>NinjaTrader Clearing</b>; Talero never holds customer money.</>
            : <>Reviewed by NinjaTrader Treasury and submitted as <b>Pending Review</b> — there’s no instant status. Pending requests can’t be self-cancelled; contact support immediately if needed.</>}
        </div>
      </>
    );

    const renderDone = () => (
      <div className="wz-done">
        <span className="wz-done-ic"><Icon name="check" size={26} /></span>
        <h3>{isDep ? (doneRec.status === 'Submitted' ? 'Wire registered' : 'Deposit submitted') : 'Withdrawal requested'}</h3>
        <p>
          {isDep
            ? (doneRec.status === 'Submitted'
              ? <>We’ll match your inbound wire to {acctLabel} once NinjaTrader Treasury receives it. Track it in your transfer history.</>
              : <>{fmtCur(amt, cur)} is on its way to {acctLabel}. {instantAmt > 0 ? <>Up to {fmtUSD(instantAmt)} is available to trade now.</> : ''} Settlement {sel.settle === 0 ? 'today' : 'by ' + projDate(sel.settle)}.</>)
            : <>{fmtUSD(amt, 2)} to {destBank.name} {destBank.mask} is now <b>Pending Review</b> with NinjaTrader Treasury.</>}
        </p>
        <span className="mono">{doneRec.ref}</span>
        <div className="wz-done-acts">
          <button className="btn btn-ghost" onClick={() => { setDoneRec(null); reset(); }}>{isDep ? 'New deposit' : 'New withdrawal'}</button>
          <button className="btn btn-primary" onClick={() => setDoneRec(null)}>Done</button>
        </div>
      </div>
    );

    const bodies = [renderMethod, renderDetails, renderAmount, renderReview];

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="swap" size={20} /></div>
            <div>
              <div className="eyebrow">Money movement</div>
              <h1 className="ph-title">Funding &amp; withdrawals</h1>
              <p className="ph-sub">Move money between your bank and your brokerage account. Talero is the Introducing Broker — transfers settle to NinjaTrader Clearing and are reviewed by NTC Treasury.</p>
            </div>
          </div>
          <div className="pagehead-r">
            <div className="acct-chip">
              <span className="acct-meta"><b className="mono">{fmtUSD(available, 2)}</b><small>Available to withdraw</small></span>
            </div>
          </div>
        </div>

        <StateBanners app={app} />

        {!eligible && (
          <Card className="errorcard">
            <span className="errorcard-ic"><Icon name="alert" size={20} /></span>
            <div><b>Money movement is unavailable right now</b><small>Your account must be Active with Verified KYC to deposit or withdraw. {app && app.kyc !== 'verified' ? 'Finish identity verification in Personal Settings.' : 'Contact support to restore access.'}</small></div>
          </Card>
        )}

        <div className="fund-layout">
          {/* ---- wizard ---- */}
          <Card className="wz-card" style={!eligible ? { opacity: .55, pointerEvents: 'none' } : null}>
            <div className="wz-tabs">
              <button className={'wz-tab' + (isDep ? ' on' : '')} onClick={() => switchTab('deposit')}>Deposit</button>
              <button className={'wz-tab' + (!isDep ? ' on' : '')} onClick={() => switchTab('withdraw')}>Withdraw</button>
            </div>

            {doneRec ? renderDone() : (
              <>
                <ol className="wz-steps">
                  {STEP_LABELS.map((l, i) => (
                    <React.Fragment key={l}>
                      {i > 0 && <span className={'wz-st-bar' + (i <= step ? ' done' : '')} />}
                      <li className={'wz-st ' + (i < step ? 'done' : i === step ? 'current' : 'todo')}>
                        <span className="wz-st-dot">{i < step ? <Icon name="check" size={12} /> : i + 1}</span>
                        <span className="wz-st-l">{l}</span>
                      </li>
                    </React.Fragment>
                  ))}
                </ol>

                <div className="wz-body">
                  <div className="wz-h">
                    {step === 0 ? (isDep ? 'How would you like to fund?' : 'How would you like to withdraw?')
                      : step === 1 ? (isDep ? (sel.capture === 'wire' ? 'Wire to NinjaTrader Clearing' : sel.capture === 'card' ? 'Enter your debit card' : sel.capture === 'plaid' ? 'Choose a bank' : 'Enter your bank details') : 'Where should funds go?')
                      : step === 2 ? (isDep ? 'How much to deposit?' : 'How much to withdraw?')
                      : 'Review & confirm'}
                  </div>
                  <p className="wz-sub">
                    {step === 0 ? (isDep ? 'Talero collects your payment securely and routes it to your NinjaTrader Clearing account.' : 'Withdrawals are processed by NinjaTrader Treasury after review.')
                      : step === 1 ? (isDep && sel.capture === 'wire' ? 'Send a wire from your bank using the details below.' : isDep ? `${sel.t} · ${sel.avail}` : 'Pick a previously-used bank account.')
                      : step === 2 ? (isDep ? `${sel.t} · settles ${sel.settle === 0 ? 'same day' : 'in ' + sel.avail.replace('~', '')}` : `Available ${fmtUSD(available, 2)}`)
                      : (isDep ? 'Confirm the details before we submit.' : 'Confirm the details before we send this to Treasury.')}
                  </p>
                  {bodies[step]()}
                </div>

                <div className="wz-foot">
                  {step > 0 && <button className="btn btn-ghost wz-back" onClick={() => setStep((s) => s - 1)}><Icon name="arrowLeft" size={14} /> Back</button>}
                  {step < 3
                    ? <button className="btn btn-primary wz-next" disabled={!canNext} onClick={() => setStep((s) => s + 1)}><span>Continue</span><Icon name="arrowRight" size={15} /></button>
                    : <button className="btn btn-primary wz-next" disabled={!canNext} onClick={submit}><Icon name={isDep ? 'download' : 'arrowRight'} size={15} /><span>{isDep ? (sel.capture === 'wire' ? "I've sent the wire" : 'Deposit ' + fmtCur(amt, cur)) : (needSms ? 'Verify & request' : 'Request ' + fmtUSD(amt))}</span></button>}
                </div>
              </>
            )}
          </Card>

          {/* ---- summary rail ---- */}
          <Card className="fund-sum">
            <div className="sum-head">
              <IconTile name={isDep ? 'download' : 'arrowRight'} tone="accent" size={16} />
              <div><b>{isDep ? 'Deposit summary' : 'Withdrawal summary'}</b><small>{doneRec ? doneRec.ref : 'Step ' + Math.min(step + 1, 4) + ' of 4'}</small></div>
            </div>
            <div className="sum-rows">
              <div className="sum-row"><span className="sk">Method</span><span className={'sv' + (step >= 0 ? '' : ' muted')}>{sel.short || sel.t}</span></div>
              {isDep && sel.capture === 'plaid' && <div className="sum-row"><span className="sk">Bank</span><span className={'sv' + (step >= 1 ? '' : ' muted')}>{step >= 1 ? selBank.name + ' ' + selBank.mask : '—'}</span></div>}
              {!isDep && <div className="sum-row"><span className="sk">To bank</span><span className={'sv' + (step >= 1 ? '' : ' muted')}>{step >= 1 ? destBank.name + ' ' + destBank.mask : '—'}</span></div>}
              <div className="sum-row"><span className="sk">{isDep ? 'To account' : 'From account'}</span><span className="sv">#{acct}</span></div>
              <div className="sum-row"><span className="sk">Amount</span><span className={'sv' + (amt > 0 ? '' : ' muted')}>{amt > 0 ? fmtCur(amt, cur) : '—'}</span></div>
              {isDep && instantAmt > 0 && amt > 0 && <div className="sum-row"><span className="sk">Instant</span><span className="sv" style={{ color: 'var(--pos)' }}>{fmtUSD(instantAmt)}</span></div>}
              <div className="sum-row"><span className="sk">{isDep ? 'Available' : 'Arrives'}</span><span className="sv muted">{sel.settle === 0 ? (isDep ? 'Today' : projDate(0)) : projDate(sel.settle)}</span></div>
            </div>
            <div className="sum-dest">
              <div className="eyebrow">Destination of record</div>
              <b>NinjaTrader Clearing, LLC</b>
              <small>The FCM that carries, clears &amp; custodies your account. Talero never holds customer funds.</small>
            </div>
            <div className="sum-secure"><Icon name="lock" size={13} /> 256-bit encrypted. Bank links via Plaid; cards tokenised by Stripe — Talero never stores raw credentials.</div>
          </Card>
        </div>

        {/* ---- transfer history ---- */}
        <Card>
          <CardHead title="Transfer history" sub="All deposits and withdrawals across your account."
            right={
              <div className="ch-actions">
                <label className="tb-search doc-search"><Icon name="search" size={15} /><input placeholder="Search reference…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
                <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Export CSV</button>
              </div>
            } />
          <div className="ttable">
            <div className="ttable-head">
              <span>Date</span><span>Type</span><span className="num">Amount</span><span>Account</span><span>Method</span><span>Status</span><span>Reference</span>
            </div>
            {shown.map((r, i) => (
              <React.Fragment key={i}>
                <div className={'ttable-row clickable' + (open === i ? ' open' : '')} onClick={() => setOpen(open === i ? null : i)}>
                  <span data-k="Date">{r.date}</span>
                  <span data-k="Type"><span className={'tdir ' + (r.type === 'Deposit' ? 'in' : 'out')}><Icon name={r.type === 'Deposit' ? 'download' : 'arrowRight'} size={12} /> {r.type}</span></span>
                  <span className={'num mono ' + (r.amount >= 0 ? 'pos' : 'neg')} data-k="Amount">{fmtUSD(r.amount, 2)}</span>
                  <span className="mono" data-k="Account">{r.account}</span>
                  <span data-k="Method">{r.method}</span>
                  <span data-k="Status"><Badge tone={STATUS_TONE[r.status]} dot>{r.status}</Badge></span>
                  <span className="mono dim tx-ref" data-k="Reference">{r.ref}<span className={'tx-chev' + (open === i ? ' up' : '')}><Icon name="chevron" size={13} /></span></span>
                </div>
                {open === i && <TxTracker row={r} />}
              </React.Fragment>
            ))}
            {!shown.length && <div className="ptable-empty">No transfers match your search.</div>}
          </div>
        </Card>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.funding = FundingPage;
})();
