// td-charts.jsx — self-contained responsive SVG charts for the Talero dashboard.
// All charts use a fixed internal viewBox and scale to 100% width.
// Exports to window: Sparkline, AreaChart, BarChart, Donut, useResize.
(function () {
  const { useState, useRef, useCallback, useMemo } = React;

  const fmtUSD = (n, dp) => {
    const sign = n < 0 ? '-' : '';
    const a = Math.abs(n);
    return sign + '$' + a.toLocaleString('en-US', { minimumFractionDigits: dp ?? 0, maximumFractionDigits: dp ?? 0 });
  };
  const fmtCompact = (n) => {
    const a = Math.abs(n); const s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(1) + 'K';
    return s + '$' + a.toFixed(0);
  };

  // catmull-rom -> bezier smooth path through points [{x,y}]
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  // --- tiny sparkline for KPI cards ---
  function Sparkline({ data, color, height }) {
    const W = 120, H = height || 32, pad = 2;
    const vals = data.map((d) => (typeof d === 'number' ? d : d.value));
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const pts = vals.map((v, i) => ({
      x: pad + (i / (vals.length - 1)) * (W - pad * 2),
      y: H - pad - ((v - min) / span) * (H - pad * 2),
    }));
    const id = useMemo(() => 'sp' + Math.random().toString(36).slice(2, 8), []);
    const area = smoothPath(pts) + ` L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // --- area / line chart with hover crosshair + tooltip ---
  // props: data [{label,value}], color, height, fill (bool), baseline (number|null),
  //        formatValue (fn), formatLabel (fn), gridY (int)
  function AreaChart(props) {
    const {
      data, color, height = 220, fill = true, baseline = null,
      formatValue = (v) => fmtUSD(v), formatLabel = (l) => l, gridY = 4,
      negColor,
    } = props;
    const W = 1000;
    const H = height;
    const padL = 8, padR = 8, padT = 16, padB = 22;
    const [hover, setHover] = useState(null);
    const wrapRef = useRef(null);
    const id = useMemo(() => 'ar' + Math.random().toString(36).slice(2, 8), []);

    const vals = data.map((d) => d.value);
    let min = Math.min(...vals, baseline == null ? Math.min(...vals) : baseline);
    let max = Math.max(...vals, baseline == null ? Math.max(...vals) : baseline);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    min -= range * 0.12; max += range * 0.12;
    const span = max - min;

    const xFor = (i) => padL + (i / (data.length - 1)) * (W - padL - padR);
    const yFor = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);

    const pts = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value) }));
    const line = smoothPath(pts);
    const zeroY = yFor(0);
    const baseY = H - padB;
    const area = line + ` L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;

    const onMove = useCallback((e) => {
      const el = wrapRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      let idx = Math.round(((x - padL) / (W - padL - padR)) * (data.length - 1));
      idx = Math.max(0, Math.min(data.length - 1, idx));
      setHover(idx);
    }, [data.length]);

    const grid = [];
    for (let g = 0; g <= gridY; g++) {
      const v = min + (span * g) / gridY;
      const y = yFor(v);
      grid.push({ y, v });
    }

    return (
      <div className="chart-wrap" ref={wrapRef}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="86%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {grid.map((g, i) => (
            <line key={i} x1={padL} x2={W - padR} y1={g.y} y2={g.y}
              stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {baseline === 0 && min < 0 && max > 0 && (
            <line x1={padL} x2={W - padR} y1={zeroY} y2={zeroY}
              stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          )}
          {fill && <path d={area} fill={`url(#${id})`} />}
          <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
            vectorEffect="non-scaling-stroke" />
          {hover != null && (
            <g>
              <line x1={pts[hover].x} x2={pts[hover].x} y1={padT} y2={baseY}
                stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <circle cx={pts[hover].x} cy={pts[hover].y} r="4.5" fill={color}
                stroke="var(--panel)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        {hover != null && (
          <div className="chart-tip" style={{
            left: `${(pts[hover].x / W) * 100}%`,
            transform: `translate(-50%, 0)`,
          }}>
            <span className="chart-tip-v" style={{ color }}>{formatValue(data[hover].value)}</span>
            <span className="chart-tip-l">{formatLabel(data[hover].label)}</span>
          </div>
        )}
      </div>
    );
  }

  // --- bar chart (distribution / time of day), positive & negative ---
  function BarChart({ data, height = 160, posColor, negColor, formatValue = (v) => v }) {
    const W = 1000, H = height, padT = 14, padB = 22, gap = 0.28;
    const [hover, setHover] = useState(null);
    const vals = data.map((d) => d.value);
    let max = Math.max(0, ...vals), min = Math.min(0, ...vals);
    if (max === min) max = 1;
    const span = (max - min) || 1;
    const yFor = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);
    const zeroY = yFor(0);
    const n = data.length;
    const slot = (W) / n;
    const bw = slot * (1 - gap);

    return (
      <div className="chart-wrap" style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
          <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {data.map((d, i) => {
            const x = i * slot + (slot - bw) / 2;
            const y = d.value >= 0 ? yFor(d.value) : zeroY;
            const h = Math.abs(yFor(d.value) - zeroY);
            const c = d.neg || d.value < 0 ? negColor : posColor;
            return (
              <rect key={i} x={x} y={y} width={bw} height={Math.max(1, h)} rx="3"
                fill={c} opacity={hover == null || hover === i ? 0.92 : 0.4}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            );
          })}
        </svg>
        <div className="bar-axis">
          {data.map((d, i) => <span key={i}>{d.label}</span>)}
        </div>
        {hover != null && (
          <div className="chart-tip" style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: 'translate(-50%,0)' }}>
            <span className="chart-tip-v" style={{ color: data[hover].neg || data[hover].value < 0 ? negColor : posColor }}>
              {formatValue(data[hover].value)}
            </span>
            <span className="chart-tip-l">{data[hover].label}</span>
          </div>
        )}
      </div>
    );
  }

  // --- donut chart ---
  function Donut({ segments, size = 132, thickness = 16, centerLabel, centerSub }) {
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let acc = 0;
    return (
      <div className="donut" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const seg = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={s.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc}
                strokeLinecap="butt" />
            );
            acc += dash;
            return seg;
          })}
        </svg>
        {(centerLabel || centerSub) && (
          <div className="donut-center">
            <div className="donut-center-l">{centerLabel}</div>
            {centerSub && <div className="donut-center-s">{centerSub}</div>}
          </div>
        )}
      </div>
    );
  }

  window.TDCharts = { Sparkline, AreaChart, BarChart, Donut, fmtUSD, fmtCompact };
})();
