// ba-app.jsx — Talero Back Office shell wiring + Tweaks. Mounts the app.
const { useState: useS, useEffect: useE, useRef: useR } = React;
const { Sidebar, TopBar, Icon } = window.BAShell;
const BAPages = window.BAPages || {};

const THEMES = window.TD_THEMES;
const THEME_MAP = window.TD_THEME_MAP;
const ACCENTS = [
  { v: 'default', l: 'Theme', c: null },
  { v: '#4fa3ff', l: 'Signal', c: '#4fa3ff' },
  { v: '#34e0a1', l: 'Emerald', c: '#34e0a1' },
  { v: '#a78bfa', l: 'Violet', c: '#a78bfa' },
  { v: '#e7b94e', l: 'Gold', c: '#e7b94e' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "talero-navy",
  "accent": "default",
  "density": "regular",
  "landing": "dashboard"
}/*EDITMODE-END*/;

function ThemeGrid({ value, onChange }) {
  return (
    <div className="tw-themegrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {THEMES.map((th) => (
        <button key={th.id} onClick={() => onChange(th.id)} title={th.desc}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
            border: '1px solid ' + (value === th.id ? 'var(--accent)' : 'var(--line)'), background: value === th.id ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--panel-2)' }}>
          <span style={{ display: 'flex', gap: 4 }}><i style={{ width: 16, height: 16, borderRadius: 5, background: th.swatch[0] }} /><i style={{ width: 16, height: 16, borderRadius: 5, background: th.swatch[1] }} /></span>
          <span style={{ fontSize: 11.5, fontWeight: 700 }}>{th.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{th.mode}</span>
        </button>
      ))}
    </div>
  );
}
function AccentRow({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ACCENTS.map((a) => (
        <button key={a.v} onClick={() => onChange(a.v)} title={a.l}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 0, background: 'transparent', cursor: 'pointer' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: a.c || 'var(--panel-3)', border: '2px solid ' + (value === a.v ? 'var(--accent)' : 'transparent'), color: '#fff' }}>
            {!a.c && <Icon name="cms" size={13} />}
          </span>
          <small style={{ fontSize: 10, color: 'var(--text-3)' }}>{a.l}</small>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [active, setActive] = useS(t.landing || 'dashboard');
  const [q, setQ] = useS('');
  const [collapsed, setCollapsed] = useS(() => {
    try { return localStorage.getItem('ba-sidebar') === 'collapsed'; } catch (e) { return false; }
  });
  const toggleSidebar = () => setCollapsed((c) => {
    const n = !c; try { localStorage.setItem('ba-sidebar', n ? 'collapsed' : 'expanded'); } catch (e) {} return n;
  });

  const themeObj = THEME_MAP[t.theme] || THEMES[0];
  useE(() => {
    window.applyTheme(t.theme, t.accent === 'default' ? null : t.accent);
    document.documentElement.setAttribute('data-density', t.density);
  }, [t.theme, t.accent, t.density]);

  const lastByMode = useR({ dark: 'talero-navy', light: 'talero-light' });
  useE(() => { lastByMode.current[themeObj.mode] = t.theme; }, [t.theme]);
  const toggleMode = () => {
    const target = themeObj.mode === 'dark' ? 'light' : 'dark';
    const next = lastByMode.current[target] || THEMES.find((x) => x.mode === target).id;
    setTweak('theme', next);
  };

  const logout = () => { window.location.href = 'Talero Auth.html#login'; };

  const renderPage = () => {
    const Page = BAPages[active] || BAPages.dashboard;
    return <Page onNav={setActive} />;
  };

  return (
    <div className={'shell' + (collapsed ? ' sb-collapsed' : '')}>
      <Sidebar active={active} onNav={setActive} collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="main">
        <TopBar isDark={themeObj.mode === 'dark'} onToggleMode={toggleMode} onLogout={logout} q={q} setQ={setQ} />
        <div className="scroll">{renderPage()}</div>
      </div>

      <TweaksPanel>
        <TweakSection label="Default landing page" />
        <TweakSelect label="After login" value={t.landing} onChange={(v) => { setTweak('landing', v); setActive(v); }}
          options={[
            { value: 'dashboard', label: 'Dashboard' }, { value: 'applications', label: 'Account Applications' },
            { value: 'funding', label: 'Funding & Withdrawals' }, { value: 'alerts', label: 'Alert Dashboard' },
            { value: 'audit', label: 'Audit Log' },
          ]} />
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
