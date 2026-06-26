// td-themes.jsx — curated theme presets for the Talero dashboard.
// Each theme is a complete token set (not just an accent swap) so the dashboard
// reads as a distinct, deliberate institutional design direction.
// Exports window.TD_THEMES (array, ordered) + window.TD_THEME_MAP.
(function () {
  // Shared semantic pieces reused across dark themes
  const THEMES = [
    {
      id: 'talero-navy', name: 'Talero Navy', mode: 'dark',
      desc: 'talero.com brand — deep brand navy canvas, signal-blue accent, white type.',
      swatch: ['#0e1729', '#4fa3ff'],
      tokens: {
        '--bg': '#0a1120', '--bg-2': '#0e1729', '--glow': 'rgba(79,163,255,0.13)',
        '--panel': '#111d33', '--panel-2': '#16233f', '--panel-3': '#1d2c4b',
        '--line': 'rgba(120,160,225,0.12)', '--line-strong': 'rgba(120,160,225,0.22)',
        '--text': '#eaf1fb', '--text-2': '#9fb1cf', '--text-3': '#647394',
        '--accent': '#4fa3ff', '--accent-ink': '#06122a', '--accent-2': '#7ab9ff',
        '--teal': '#38bdf8', '--info': '#4fa3ff', '--pos': '#46d39a', '--neg': '#ff6b6b', '--warn': '#f5b13d',
        '--ring-track': 'rgba(120,160,225,0.13)',
        '--chip-pos-bg': 'rgba(70,211,154,0.13)', '--chip-neg-bg': 'rgba(255,107,107,0.13)',
        '--shadow': '0 24px 60px -34px rgba(0,0,0,0.82)', '--tip-bg': '#111d33',
        '--radius': '14px', '--radius-sm': '10px', '--radius-pill': '20px',
      },
    },
    {
      id: 'talero-light', name: 'Talero Light', mode: 'light',
      desc: 'talero.com brand — white surfaces, brand navy type, signal-blue accent.',
      swatch: ['#eef3f8', '#4fa3ff'],
      tokens: {
        '--bg': '#e8eef5', '--bg-2': '#eef3f8', '--glow': 'rgba(79,163,255,0.12)',
        '--panel': '#ffffff', '--panel-2': '#f4f8fc', '--panel-3': '#eaf1f9',
        '--line': 'rgba(14,23,41,0.09)', '--line-strong': 'rgba(14,23,41,0.17)',
        '--text': '#0e1729', '--text-2': '#475569', '--text-3': '#8593a8',
        '--accent': '#2e7fe0', '--accent-ink': '#ffffff', '--accent-2': '#4fa3ff',
        '--teal': '#0d9488', '--info': '#2e7fe0', '--pos': '#0f9d6b', '--neg': '#dc4a4a', '--warn': '#c47f12',
        '--ring-track': 'rgba(14,23,41,0.08)',
        '--chip-pos-bg': 'rgba(15,157,107,0.12)', '--chip-neg-bg': 'rgba(220,74,74,0.12)',
        '--shadow': '0 20px 44px -32px rgba(14,23,41,0.34)', '--tip-bg': '#0e1729',
        '--radius': '14px', '--radius-sm': '10px', '--radius-pill': '20px',
      },
    },
    {
      id: 'midnight', name: 'Midnight Emerald', mode: 'dark',
      desc: 'Talero v0.1 — near-black canvas, emerald signal, soft glow.',
      swatch: ['#06090b', '#34e0a1'],
      tokens: {
        '--bg': '#06090b', '--bg-2': '#080c0e', '--glow': 'rgba(52,224,161,0.10)',
        '--panel': '#0c1214', '--panel-2': '#0f1719', '--panel-3': '#121c1e',
        '--line': 'rgba(255,255,255,0.065)', '--line-strong': 'rgba(255,255,255,0.13)',
        '--text': '#e9f1ef', '--text-2': '#93a5a2', '--text-3': '#5d6f6c',
        '--accent': '#34e0a1', '--accent-ink': '#04150d', '--accent-2': '#16b97e',
        '--teal': '#2dd4bf', '--info': '#5aa9ff', '--pos': '#34e0a1', '--neg': '#ff6b6b', '--warn': '#f5b13d',
        '--ring-track': 'rgba(255,255,255,0.07)',
        '--chip-pos-bg': 'rgba(52,224,161,0.12)', '--chip-neg-bg': 'rgba(255,107,107,0.12)',
        '--shadow': '0 24px 60px -34px rgba(0,0,0,0.85)', '--tip-bg': '#0a1214',
        '--radius': '16px', '--radius-sm': '12px', '--radius-pill': '22px',
      },
    },
    {
      id: 'carbon', name: 'Carbon Orange', mode: 'dark',
      desc: 'NinjaTrader-inspired — flat carbon, hot-orange signal, sharp corners.',
      swatch: ['#0c0c0d', '#ff5a1f'],
      tokens: {
        '--bg': '#0a0a0b', '--bg-2': '#0d0d0f', '--glow': 'rgba(255,90,31,0.10)',
        '--panel': '#141416', '--panel-2': '#1a1a1d', '--panel-3': '#202024',
        '--line': 'rgba(255,255,255,0.07)', '--line-strong': 'rgba(255,255,255,0.15)',
        '--text': '#f4f4f5', '--text-2': '#a0a0a8', '--text-3': '#6b6b73',
        '--accent': '#ff5a1f', '--accent-ink': '#1a0a02', '--accent-2': '#ff7e4d',
        '--teal': '#1fd6a6', '--info': '#5aa9ff', '--pos': '#22c55e', '--neg': '#ff5247', '--warn': '#f5b13d',
        '--ring-track': 'rgba(255,255,255,0.08)',
        '--chip-pos-bg': 'rgba(34,197,94,0.14)', '--chip-neg-bg': 'rgba(255,82,71,0.14)',
        '--shadow': '0 20px 50px -34px rgba(0,0,0,0.9)', '--tip-bg': '#141416',
        '--radius': '8px', '--radius-sm': '6px', '--radius-pill': '8px',
      },
    },
    {
      id: 'navy', name: 'Obsidian Navy', mode: 'dark',
      desc: 'Institutional terminal — deep navy, brushed-gold accent, dense.',
      swatch: ['#0a1322', '#e7b94e'],
      tokens: {
        '--bg': '#070d18', '--bg-2': '#0a1322', '--glow': 'rgba(231,185,78,0.09)',
        '--panel': '#0e1a2c', '--panel-2': '#122236', '--panel-3': '#162a42',
        '--line': 'rgba(150,180,225,0.10)', '--line-strong': 'rgba(150,180,225,0.20)',
        '--text': '#eaf1fb', '--text-2': '#93a6c4', '--text-3': '#5d709a',
        '--accent': '#e7b94e', '--accent-ink': '#241a06', '--accent-2': '#f0cd7a',
        '--teal': '#39c2c9', '--info': '#69a8ff', '--pos': '#46d39a', '--neg': '#ff7a72', '--warn': '#e7b94e',
        '--ring-track': 'rgba(150,180,225,0.12)',
        '--chip-pos-bg': 'rgba(70,211,154,0.13)', '--chip-neg-bg': 'rgba(255,122,114,0.13)',
        '--shadow': '0 24px 60px -34px rgba(0,0,0,0.8)', '--tip-bg': '#0e1a2c',
        '--radius': '12px', '--radius-sm': '9px', '--radius-pill': '20px',
      },
    },
    {
      id: 'graphite', name: 'Graphite', mode: 'dark',
      desc: 'Restrained neutral — warm graphite, cool teal, quiet and calm.',
      swatch: ['#17181a', '#2dd4bf'],
      tokens: {
        '--bg': '#151618', '--bg-2': '#191a1c', '--glow': 'rgba(45,212,191,0.07)',
        '--panel': '#1e2022', '--panel-2': '#24262a', '--panel-3': '#2b2e32',
        '--line': 'rgba(255,255,255,0.075)', '--line-strong': 'rgba(255,255,255,0.16)',
        '--text': '#eceef0', '--text-2': '#9ba2a8', '--text-3': '#6a7077',
        '--accent': '#2dd4bf', '--accent-ink': '#06201c', '--accent-2': '#5ce0d0',
        '--teal': '#38bdf8', '--info': '#818cf8', '--pos': '#34d399', '--neg': '#f87171', '--warn': '#fbbf24',
        '--ring-track': 'rgba(255,255,255,0.08)',
        '--chip-pos-bg': 'rgba(52,211,153,0.13)', '--chip-neg-bg': 'rgba(248,113,113,0.13)',
        '--shadow': '0 20px 48px -34px rgba(0,0,0,0.7)', '--tip-bg': '#1e2022',
        '--radius': '14px', '--radius-sm': '10px', '--radius-pill': '20px',
      },
    },
    {
      id: 'porcelain', name: 'Porcelain', mode: 'light',
      desc: 'Talero premium light — warm porcelain, emerald, airy whitespace.',
      swatch: ['#eef1f1', '#10b981'],
      tokens: {
        '--bg': '#e9edec', '--bg-2': '#e2e7e6', '--glow': 'rgba(16,185,129,0.10)',
        '--panel': '#ffffff', '--panel-2': '#f5f8f7', '--panel-3': '#eef3f2',
        '--line': 'rgba(7,22,20,0.09)', '--line-strong': 'rgba(7,22,20,0.17)',
        '--text': '#0b1614', '--text-2': '#51605c', '--text-3': '#879490',
        '--accent': '#10b981', '--accent-ink': '#ffffff', '--accent-2': '#0f9d6b',
        '--teal': '#0d9488', '--info': '#2563eb', '--pos': '#0f9d6b', '--neg': '#dc4a4a', '--warn': '#c47f12',
        '--ring-track': 'rgba(7,22,20,0.08)',
        '--chip-pos-bg': 'rgba(16,185,129,0.13)', '--chip-neg-bg': 'rgba(220,74,74,0.12)',
        '--shadow': '0 20px 44px -32px rgba(20,40,36,0.40)', '--tip-bg': '#0b1614',
        '--radius': '16px', '--radius-sm': '12px', '--radius-pill': '22px',
      },
    },
    {
      id: 'arctic', name: 'Arctic Indigo', mode: 'light',
      desc: 'Cool light — arctic blue-grey surfaces, indigo accent, crisp.',
      swatch: ['#eef1f6', '#4f46e5'],
      tokens: {
        '--bg': '#e7ebf2', '--bg-2': '#e0e5ee', '--glow': 'rgba(79,70,229,0.10)',
        '--panel': '#ffffff', '--panel-2': '#f4f6fb', '--panel-3': '#eceff7',
        '--line': 'rgba(20,28,52,0.09)', '--line-strong': 'rgba(20,28,52,0.17)',
        '--text': '#0e1430', '--text-2': '#525a76', '--text-3': '#8189a3',
        '--accent': '#4f46e5', '--accent-ink': '#ffffff', '--accent-2': '#6366f1',
        '--teal': '#0891b2', '--info': '#2563eb', '--pos': '#0f9d6b', '--neg': '#e0445a', '--warn': '#c47f12',
        '--ring-track': 'rgba(20,28,52,0.08)',
        '--chip-pos-bg': 'rgba(15,157,107,0.12)', '--chip-neg-bg': 'rgba(224,68,90,0.12)',
        '--shadow': '0 20px 44px -32px rgba(24,30,60,0.42)', '--tip-bg': '#0e1430',
        '--radius': '14px', '--radius-sm': '10px', '--radius-pill': '20px',
      },
    },
  ];

  const map = {};
  THEMES.forEach((t) => { map[t.id] = t; });
  window.TD_THEMES = THEMES;
  window.TD_THEME_MAP = map;

  // apply a theme's tokens to :root, returns the theme object
  window.applyTheme = function (id, accentOverride) {
    const t = map[id] || THEMES[0];
    const root = document.documentElement;
    Object.entries(t.tokens).forEach(([k, v]) => root.style.setProperty(k, v));
    if (accentOverride) {
      root.style.setProperty('--accent', accentOverride);
      // pick readable ink for the accent
      root.style.setProperty('--accent-ink', t.mode === 'light' ? '#ffffff' : '#04150d');
    }
    root.setAttribute('data-theme', t.mode);
    root.setAttribute('data-theme-id', t.id);
    return t;
  };
})();
