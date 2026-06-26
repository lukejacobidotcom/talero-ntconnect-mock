// td-onboarding.jsx — TAL-48 Account Opening (NTC AOP) flow. Exposes TDPages.onboarding
// Grounded in NinjaTrader Clearing FCM docs: AOP collects CIP/suitability/disclosures;
// NTC New Accounts reviews (1–2 business day SLA); then fund → activate.
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge, IconTile, Seg } = window.TDUI;

  const STEPS = ['Application', 'Identity (CIP)', 'Suitability', 'Agreements', 'Review'];
  const JOURNEY = ['Submitted', 'Under review', 'Approved', 'Fund', 'Trade'];

  const AGREEMENTS = [
    { k: 'cust', t: 'NinjaTrader Clearing Customer Agreement' },
    { k: 'nfa', t: 'NFA Risk Disclosure Statement' },
    { k: 'risk', t: 'Risk disclosure certifications (loss, leverage, debit & additional-deposit risk)' },
    { k: 'suit', t: 'Suitability acknowledgment' },
    { k: 'md', t: 'Non-Professional Market Data Agreement' },
    { k: 'w8', t: 'W-8BEN (non-US residents only)', optional: true },
  ];

  function Field({ label, children, hint, full }) {
    return (
      <label className={'fld' + (full ? ' fld-full' : '')}>
        <span className="fld-l">{label}</span>
        {children}
        {hint && <span className="fld-hint">{hint}</span>}
      </label>
    );
  }
  function Sel({ value, onChange, opts }) {
    return <div className="fld-sel"><select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o}>{o}</option>)}</select><span className="fld-chev"><Icon name="chevron" size={13} /></span></div>;
  }

  function OnboardingPage({ app, onNav }) {
    const [mode, setMode] = useState('embedded');
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [agreed, setAgreed] = useState({});
    const [econsent, setEconsent] = useState(true);
    const [f, setF] = useState({
      first: 'Jordan', last: 'Castillo', email: 'jordan.castillo@example.com', password: '', phone: '+1 (415) 555-0142',
      dob: '1991-08-23', ssn: '••• •• 4821', addr: '240 Spear Street, Apt 1804', city: 'San Francisco',
      region: 'California', zip: '94105', country: 'United States',
      exp: '3–5 years', income: '$100k–$250k', net: '$250k–$1M', liquid: '$100k–$250k',
      objective: 'Speculation', risk: 'High', employ: 'Employed',
    });
    const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

    const required = AGREEMENTS.filter((a) => !a.optional);
    const allAgreed = required.every((a) => agreed[a.k]) && econsent;
    const canContinue = step < 4;

    if (submitted) {
      return (
        <div className="page">
          <div className="pagehead">
            <div className="pagehead-l">
              <div className="ph-icon"><Icon name="user" size={20} /></div>
              <div><h1 className="ph-title">Open an account</h1></div>
            </div>
          </div>
          <Card className="aop-done">
            <span className="aop-done-ic"><Icon name="check" size={26} /></span>
            <h2 className="aop-done-h">Application submitted to NinjaTrader Clearing</h2>
            <p className="aop-done-sub">Your application has been submitted through NinjaTrader Clearing’s Account Opening Process. The New Accounts team typically reviews within a <b>1–2 business day</b> SLA. We’ll notify you here and by email when a decision is made.</p>
            <ol className="stepper aop-journey">
              {JOURNEY.map((s, i) => {
                const st = i === 0 ? 'done' : i === 1 ? 'current' : 'todo';
                return <li className={'step ' + st} key={s}><span className="step-dot">{i === 0 ? <Icon name="check" size={12} /> : i + 1}</span><span className="step-l">{s}</span></li>;
              })}
            </ol>
            <div className="aop-done-cta">
              <button className="btn btn-primary" onClick={() => onNav('funding')}><Icon name="download" size={15} /><span>Fund your account</span></button>
              <button className="btn btn-ghost" onClick={() => onNav('dashboard')}>Back to dashboard</button>
            </div>
            <p className="fineprint">Funding becomes available once NinjaTrader Clearing approves your account and creates your platform credentials. <span className="muted">[approval is simulated in this preview]</span></p>
          </Card>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="user" size={20} /></div>
            <div>
              <h1 className="ph-title">Open an account</h1>
              <p className="ph-sub">Talero introduces your account to <b>NinjaTrader Clearing, LLC</b> — the carrying broker (FCM). Identity, suitability, and disclosures are collected and verified through NinjaTrader’s Account Opening Process (AOP).</p>
            </div>
          </div>
          <div className="pagehead-r">
            <Seg value={mode} onChange={setMode} options={[{ v: 'embedded', l: 'Embedded' }, { v: 'redirect', l: 'Redirect to NTC' }]} />
          </div>
        </div>

        <div className="aop-banner">
          <IconTile name="security" tone="accent" />
          <div className="aop-banner-b">
            <b>{mode === 'embedded' ? 'NinjaTrader AOP — embedded in Talero' : 'You’ll be redirected to NinjaTrader Clearing'}</b>
            <small>{mode === 'embedded'
              ? 'The account-opening steps below run NinjaTrader’s ClearX process inside Talero. CIP/KYC is performed by NinjaTrader Clearing (LexisNexis InstantID + Alloy).'
              : 'Continuing opens NinjaTrader Clearing’s hosted application in a new tab. You’ll return to Talero once it’s submitted.'}
              <span className="muted"> [integration mode pending Product]</span></small>
          </div>
        </div>

        {mode === 'redirect' ? (
          <Card className="aop-redirect">
            <IconTile name="open" tone="muted" size={20} />
            <div><b>Continue on NinjaTrader Clearing</b><small>You’ll complete identity, suitability, and disclosures on NTC’s secure hosted page, then come back to fund.</small></div>
            <a className="btn btn-primary" href="https://fintevo.com" target="_blank" rel="noopener noreferrer" onClick={() => setSubmitted(true)}><span>Open NTC application</span><Icon name="open" size={15} /></a>
          </Card>
        ) : (
          <>
            <div className="card aop-steprail">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button className={'aop-step' + (i === step ? ' on' : i < step ? ' done' : '')} onClick={() => setStep(i)}>
                    <span className="aop-step-n">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
                    <span className="aop-step-t">{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className={'aop-step-line' + (i < step ? ' done' : '')} />}
                </React.Fragment>
              ))}
            </div>

            <Card>
              {step === 0 && (
                <>
                  <CardHead eyebrow="Step 1" title="Your details" sub="Collected by Talero and submitted to NinjaTrader Clearing’s AOP. Encrypted in transit and at rest." />
                  <div className="aop-fields">
                    <Field label="Legal first name"><input value={f.first} onChange={set('first')} /></Field>
                    <Field label="Legal last name"><input value={f.last} onChange={set('last')} /></Field>
                    <Field label="Email"><input type="email" value={f.email} onChange={set('email')} /></Field>
                    <Field label="Create password" hint="Used with your email to sign in to Talero."><input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" /></Field>
                    <Field label="Mobile phone"><input value={f.phone} onChange={set('phone')} /></Field>
                    <Field label="Date of birth"><input type="date" value={f.dob} onChange={set('dob')} /></Field>
                    <Field label="SSN / ITIN" hint="Required by CIP (Customer Identification Program)"><input value={f.ssn} onChange={set('ssn')} /></Field>
                    <Field label="Residential address" full><input value={f.addr} onChange={set('addr')} /></Field>
                    <Field label="City"><input value={f.city} onChange={set('city')} /></Field>
                    <Field label="State / Region"><input value={f.region} onChange={set('region')} /></Field>
                    <Field label="Postal code"><input value={f.zip} onChange={set('zip')} /></Field>
                    <Field label="Country of residence"><Sel value={f.country} onChange={(v) => setF((o) => ({ ...o, country: v }))} opts={['United States', 'Canada', 'United Kingdom', 'Singapore', 'Australia']} /></Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <CardHead eyebrow="Step 2" title="Identity verification (CIP)" sub="NinjaTrader Clearing verifies your identity via LexisNexis InstantID and Alloy. Upload a government photo ID and proof of address dated within 90 days." />
                  <div className="aop-uploads">
                    <div className="upload-box"><span className="upload-ic"><Icon name="fileText" size={20} /></span><b>Government photo ID</b><small>Passport or driver’s license</small><button className="btn btn-ghost btn-sm">Upload</button></div>
                    <div className="upload-box"><span className="upload-ic"><Icon name="mapPin" size={20} /></span><b>Proof of address</b><small>Utility bill, bank statement, or lease · within 90 days</small><button className="btn btn-ghost btn-sm">Upload</button></div>
                  </div>
                  <div className="flow-note"><Icon name="info" size={14} /> Verification is performed and finally dispositioned by NinjaTrader Clearing’s AML team. Most checks complete automatically; some route to manual review.</div>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHead eyebrow="Step 3" title="Suitability questionnaire" sub="Required by NTC to assess suitability for futures trading." />
                  <div className="aop-fields">
                    <Field label="Trading experience"><Sel value={f.exp} onChange={(v) => setF((o) => ({ ...o, exp: v }))} opts={['< 1 year', '1–3 years', '3–5 years', '5+ years']} /></Field>
                    <Field label="Employment status"><Sel value={f.employ} onChange={(v) => setF((o) => ({ ...o, employ: v }))} opts={['Employed', 'Self-employed', 'Retired', 'Student', 'Unemployed']} /></Field>
                    <Field label="Annual income"><Sel value={f.income} onChange={(v) => setF((o) => ({ ...o, income: v }))} opts={['< $50k', '$50k–$100k', '$100k–$250k', '$250k+']} /></Field>
                    <Field label="Net worth"><Sel value={f.net} onChange={(v) => setF((o) => ({ ...o, net: v }))} opts={['< $100k', '$100k–$250k', '$250k–$1M', '$1M+']} /></Field>
                    <Field label="Liquid net worth"><Sel value={f.liquid} onChange={(v) => setF((o) => ({ ...o, liquid: v }))} opts={['< $50k', '$50k–$100k', '$100k–$250k', '$250k+']} /></Field>
                    <Field label="Investment objective"><Sel value={f.objective} onChange={(v) => setF((o) => ({ ...o, objective: v }))} opts={['Speculation', 'Hedging', 'Income', 'Growth']} /></Field>
                    <Field label="Risk tolerance"><Sel value={f.risk} onChange={(v) => setF((o) => ({ ...o, risk: v }))} opts={['Low', 'Medium', 'High']} /></Field>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHead eyebrow="Step 4" title="Agreements & disclosures" sub="Review and accept the documents required by NinjaTrader Clearing. You can read each in full before accepting." />
                  <ul className="agree-list">
                    {AGREEMENTS.map((a) => (
                      <li key={a.k} className="agree-row">
                        <button className={'checkbox' + (agreed[a.k] ? ' on' : '')} onClick={() => setAgreed((o) => ({ ...o, [a.k]: !o[a.k] }))} aria-label="Accept">{agreed[a.k] && <Icon name="check" size={13} />}</button>
                        <span className="agree-t">{a.t}{a.optional && <span className="agree-opt"> · optional</span>}</span>
                        <button className="linkbtn">Read</button>
                      </li>
                    ))}
                  </ul>
                  <label className="agree-row aop-econsent">
                    <button className={'checkbox' + (econsent ? ' on' : '')} onClick={() => setEconsent((s) => !s)} aria-label="Consent">{econsent && <Icon name="check" size={13} />}</button>
                    <span className="agree-t">I consent to electronic delivery of all account documents, statements, and notices.</span>
                  </label>
                  <div className="flow-note"><Icon name="security" size={14} /> Agreements are captured and retained by NinjaTrader Clearing through the AOP — Talero doesn’t run a separate e-signature process.</div>
                </>
              )}

              {step === 4 && (
                <>
                  <CardHead eyebrow="Step 5" title="Review & submit" sub="Confirm your details before submitting to NinjaTrader Clearing." />
                  <dl className="datarow aop-review">
                    <div><dt>Name</dt><dd>{f.first} {f.last}</dd></div>
                    <div><dt>Email</dt><dd>{f.email}</dd></div>
                    <div><dt>Country</dt><dd>{f.country}</dd></div>
                    <div><dt>Trading experience</dt><dd>{f.exp}</dd></div>
                    <div><dt>Objective · risk</dt><dd>{f.objective} · {f.risk}</dd></div>
                    <div><dt>Agreements</dt><dd>{allAgreed ? 'All required accepted' : 'Incomplete'}</dd></div>
                  </dl>
                  {!allAgreed && <div className="flow-note warn"><Icon name="alert" size={14} /> Please accept all required agreements (Step 4) and e-delivery consent before submitting.</div>}
                  <div className="flow-note"><Icon name="info" size={14} /> On submit, your application goes to NinjaTrader Clearing’s New Accounts team (1–2 business day review). You’ll fund the account once approved.</div>
                </>
              )}

              <div className="aop-foot">
                <button className="btn btn-ghost btn-sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><Icon name="arrowLeft" size={14} /> Back</button>
                {canContinue
                  ? <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(4, s + 1))}><span>Continue: {STEPS[step + 1]}</span><Icon name="arrowRight" size={15} /></button>
                  : <button className="btn btn-primary" disabled={!allAgreed} onClick={() => setSubmitted(true)}><span>Submit to NinjaTrader Clearing</span><Icon name="arrowRight" size={15} /></button>}
              </div>
            </Card>
          </>
        )}

        <p className="fineprint">NinjaTrader Clearing holds final KYC/AML and account-approval authority; Talero collects your application and provides first-line support. <span className="muted">[final disclosures pending Legal · TAL-63]</span></p>
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.onboarding = OnboardingPage;
})();
