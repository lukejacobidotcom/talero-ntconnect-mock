// td-tournaments.jsx — TAL-12 Tournaments (best-guess; several Product/Legal items blocked). Exposes TDPages.tournaments
(function () {
  const { useState } = React;
  const { Icon } = window.TDShell;
  const { Card, CardHead, Badge } = window.TDUI;

  const TOURNS = {
    active: [
      { name: 'June Futures Open', dates: 'Jun 2 – Jun 30', entry: 'Entry closed', prize: 'Prize pool TBD', elig: 'Already Entered', cta: 'View standings', rank: '#42 · +6.8%' },
    ],
    upcoming: [
      { name: 'Summer Micro Cup', dates: 'Jul 7 – Jul 18', entry: 'Entry opens Jun 25', prize: 'Prize structure TBD', elig: 'Eligible', cta: 'Enter' },
      { name: 'Index Sprint', dates: 'Aug 4 – Aug 8', entry: 'Entry opens Jul 20', prize: 'Prize structure TBD', elig: 'Not Eligible', cta: 'View', reason: 'Requires Verified KYC' },
    ],
    past: [
      { name: 'May Kickoff Challenge', dates: 'May 5 – May 23', entry: 'Ended', prize: 'Awarded', elig: 'Completed', cta: 'View results', rank: 'Finished #128' },
    ],
  };
  const ELIG_TONE = { Eligible: 'pos', 'Already Entered': 'info', 'Not Eligible': 'warn', Completed: 'neutral' };

  function TCard({ t, onSoon }) {
    return (
      <div className="tourn-card">
        <div className="tourn-top">
          <b>{t.name}</b>
          <Badge tone={ELIG_TONE[t.elig]} dot>{t.elig}</Badge>
        </div>
        <div className="tourn-rows">
          <span><Icon name="calendar" size={13} /> {t.dates}</span>
          <span><Icon name="clock" size={13} /> {t.entry}</span>
          <span><Icon name="trophy" size={13} /> {t.prize}</span>
          {t.rank && <span><Icon name="stats" size={13} /> {t.rank}</span>}
        </div>
        {t.reason && <div className="tourn-reason"><Icon name="info" size={12} /> {t.reason}</div>}
        <div className="tourn-cta">
          <button className={'btn btn-sm ' + (t.elig === 'Eligible' ? 'btn-primary' : 'btn-ghost')} onClick={onSoon}>{t.cta}</button>
          <span className="soon-tag">Coming soon</span>
        </div>
      </div>
    );
  }

  function Section({ title, items, onSoon }) {
    if (!items.length) return null;
    return (
      <Card>
        <CardHead title={title} right={<span className="updated">{items.length}</span>} />
        <div className="tourn-grid">{items.map((t) => <TCard key={t.name} t={t} onSoon={onSoon} />)}</div>
      </Card>
    );
  }

  function TournamentsPage() {
    const [soon, setSoon] = useState(false);
    const openSoon = () => setSoon(true);
    return (
      <div className={'page tourn-page' + (soon ? ' soon-open' : '')}>
        <div className="tourn-dim" style={{ filter: soon ? 'blur(5px)' : 'blur(1.5px)', opacity: soon ? 0.7 : 0.92 }} onClick={openSoon}>
        <div className="pagehead">
          <div className="pagehead-l">
            <div className="ph-icon"><Icon name="trophy" size={20} /></div>
            <div>
              <div className="eyebrow">Compete <span className="muted">· best-guess (prizes, entry fees, leaderboard cadence pending Product/Legal)</span></div>
              <h1 className="ph-title">Tournaments</h1>
              <p className="ph-sub">Trading contests for Talero clients, run on dedicated simulation accounts. Browse, check eligibility, and enter.</p>
            </div>
          </div>
        </div>

        <Section title="Active" items={TOURNS.active} onSoon={openSoon} />
        <Section title="Upcoming" items={TOURNS.upcoming} onSoon={openSoon} />
        <Section title="Past" items={TOURNS.past} onSoon={openSoon} />

        <p className="fineprint"><Icon name="info" size={13} /> Eligibility requires an Active account with Verified KYC. Prize structure, entry fees and leaderboard refresh are placeholders pending Product/Legal decisions (TAL-12). <span className="muted">[contest rules pending Legal review]</span></p>
        </div>

        {soon && (
          <div className="soon-modal" onClick={() => setSoon(false)}>
            <div className="soon-card" onClick={(e) => e.stopPropagation()}>
              <button className="soon-x" onClick={() => setSoon(false)} aria-label="Close"><Icon name="x" size={18} /></button>
              <span className="soon-badge-ic"><Icon name="trophy" size={26} /></span>
              <h2 className="soon-title">Talero Tournaments</h2>
              <p className="soon-sub">Coming soon!</p>
              <p className="soon-body">We’re building trading contests for Talero clients. Check back shortly — we’ll notify you when entries open.</p>
              <button className="btn btn-primary" onClick={() => setSoon(false)}>Got it</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.TDPages = window.TDPages || {};
  window.TDPages.tournaments = TournamentsPage;
})();
