// td-app.jsx — Talero Trading & Performance dashboard page + App shell wiring.
const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR } = React;
const { Sidebar, TopBar, BottomNav, Icon, Logo } = window.TDShell;
const { RegFooter } = window.TDUI;
const { ChatWidget } = window.TDChat;
const TDPages = window.TDPages || {};
const TD = window.TD;


/* ---------- non-trading placeholder ---------- */
function Placeholder({ id, onBack }) {
  const labels = { accounts: 'Accounts', funding: 'Funding & Withdrawals', certificates: 'Withdrawal Certificates', billing: 'Billing', statements: 'Statements & Documents', tournaments: 'Tournaments', settings: 'Personal Settings' };
  return (
    <div className="placeholder">
      <div className="ph-card">
        <div className="ph-ic"><Icon name="book" size={26} /></div>
        <h2>{labels[id] || 'Coming soon'}</h2>
        <p>This page is part of <b>TAL Sprint 2 — Client</b> and is being built out. Head back to your dashboard in the meantime.</p>
        <button className="btn btn-primary" onClick={onBack}><Icon name="home" size={15} /><span>Back to Dashboard</span></button>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "talero-navy",
  "accent": "default",
  "density": "regular",
  "acctState": "active",
  "kyc": "verified",
  "dataMode": "funded",
  "marginCall": false
}/*EDITMODE-END*/;

const THEMES = window.TD_THEMES;
const THEME_MAP = window.TD_THEME_MAP;
const ACCENTS = [
  { v: 'default', l: 'Theme', c: null },
  { v: '#4fa3ff', l: 'Signal', c: '#4fa3ff' },
  { v: '#34e0a1', l: 'Emerald', c: '#34e0a1' },
  { v: '#ff5a1f', l: 'Orange', c: '#ff5a1f' },
  { v: '#e7b94e', l: 'Gold', c: '#e7b94e' },
  { v: '#a78bfa', l: 'Violet', c: '#a78bfa' },
];

function ThemeGrid({ value, onChange }) {
  return (
    <div className="tw-themegrid">
      {THEMES.map((th) => (
        <button key={th.id} className={'tw-themecard' + (value === th.id ? ' on' : '')}
          onClick={() => onChange(th.id)} title={th.desc}>
          <span className="tw-sw"><i style={{ background: th.swatch[0] }} /><i style={{ background: th.swatch[1] }} /></span>
          <span className="tw-tname">{th.name}</span>
          <span className="tw-tmode">{th.mode}</span>
        </button>
      ))}
    </div>
  );
}
function AccentRow({ value, onChange }) {
  return (
    <div className="tw-accents">
      {ACCENTS.map((a) => (
        <button key={a.v} className={'tw-accent' + (value === a.v ? ' on' : '')}
          onClick={() => onChange(a.v)} title={a.l}>
          <span className="tw-accent-sw" style={a.c ? { background: a.c } : {}}>
            {!a.c && <Icon name="palette" size={13} />}
          </span>
          <small>{a.l}</small>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [active, setActive] = useS('dashboard');
  const [collapsed, setCollapsed] = useS(() => {
    try { return localStorage.getItem('td-sidebar') === 'collapsed'; } catch (e) { return false; }
  });
  const toggleSidebar = () => setCollapsed((c) => {
    const n = !c;
    try { localStorage.setItem('td-sidebar', n ? 'collapsed' : 'expanded'); } catch (e) {}
    return n;
  });

  const themeObj = THEME_MAP[t.theme] || THEMES[0];

  useE(() => {
    window.applyTheme(t.theme, t.accent === 'default' ? null : t.accent);
    document.documentElement.setAttribute('data-density', t.density);
  }, [t.theme, t.accent, t.density]);

  // moon/sun: jump to a sensible counterpart in the opposite mode, remembering last per mode
  const lastByMode = useR({ dark: 'talero-navy', light: 'talero-light' });
  useE(() => { lastByMode.current[themeObj.mode] = t.theme; }, [t.theme]);
  const toggleMode = () => {
    const target = themeObj.mode === 'dark' ? 'light' : 'dark';
    const next = lastByMode.current[target] || THEMES.find((x) => x.mode === target).id;
    setTweak('theme', next);
  };

  const TU = (typeof window !== 'undefined' && window.__TALERO_USER__) || null;
  const account = {
    name: (TU && (TU.firstName ? (TU.firstName + ' ' + (TU.lastName || '')).trim() : TU.name)) || 'Jordan Castillo',
    complete: '100% verified'
  };
  const logout = () => {
    try { localStorage.removeItem('talero_token'); localStorage.removeItem('talero_email'); } catch (e) {}
    window.location.href = '/auth';
  };
  const app = { acctState: t.acctState, kyc: t.kyc, dataMode: t.dataMode, marginCall: !!t.marginCall, logout };

  const renderPage = () => {
    const Page = TDPages[active];
    return Page ? <Page app={app} onNav={setActive} /> : <Placeholder id={active} onBack={() => setActive('dashboard')} />;
  };

  return (
    <div className={'shell' + (collapsed ? ' sb-collapsed' : '')}>
      <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="main">
        <TopBar themeId={t.theme} themes={THEMES} onPickTheme={(id) => setTweak('theme', id)}
          onToggleMode={toggleMode} isDark={themeObj.mode === 'dark'} account={account} onNav={setActive} app={app} />
        <div className="scroll">
          {renderPage()}
          <RegFooter />
        </div>
      </div>
      <BottomNav active={active} onNav={setActive} />
      <ChatWidget />

      <TweaksPanel>
        <TweakSection label="State simulator" />
        <TweakSelect label="Account state" value={t.acctState} onChange={(v) => setTweak('acctState', v)}
          options={[{ value: 'active', label: 'Active' }, { value: 'restricted', label: 'Restricted' }, { value: 'liqonly', label: 'Liquidation Only' }, { value: 'suspended', label: 'Suspended' }]} />
        <TweakSelect label="KYC status" value={t.kyc} onChange={(v) => setTweak('kyc', v)}
          options={[{ value: 'verified', label: 'Verified' }, { value: 'pending', label: 'Pending Review' }, { value: 'action', label: 'Action Required' }]} />
        <TweakRadio label="Account data" value={t.dataMode} options={['funded', 'new', 'error']} onChange={(v) => setTweak('dataMode', v)} />
        <TweakToggle label="Margin call" value={t.marginCall} onChange={(v) => setTweak('marginCall', v)} />
        <TweakSection label="Theme preset" />
        <ThemeGrid value={t.theme} onChange={(v) => setTweak('theme', v)} />
        <TweakSection label="Accent override" />
        <AccentRow value={t.accent} onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={['regular', 'compact']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
  );
}

(async function () {
  let data = null;
  try {
    data = await Promise.race([
      (window.__TALERO_BOOT__ || Promise.resolve(null)),
      new Promise((res) => setTimeout(() => res(null), 4000))
    ]);
  } catch (e) { data = null; }
  try { if (data && window.__applyTaleroLive__) window.__applyTaleroLive__(data); } catch (e) {}
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
