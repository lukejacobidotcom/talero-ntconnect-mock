/* ============================================================
   Talero — SVG chart rendering (resolution-independent / crisp)
   Builds the platform-window candlestick chart, watchlist
   sparklines, DOM ladder, and the value-row mini charts.
   ============================================================ */
(function () {
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  // ---- main candlestick chart with grid + volume + price line ----
  function candleChart(el, opts) {
    opts = opts || {};
    var W = 720, H = 360, padR = 8, padB = 34, padT = 8;
    var r = rnd(opts.seed || 7);
    var n = 46;
    var price = 5400, candles = [], vols = [];
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < n; i++) {
      var drift = (r() - 0.46) * 26;
      var o = price, c = price + drift;
      var hi = Math.max(o, c) + r() * 12, lo = Math.min(o, c) - r() * 12;
      candles.push({ o: o, c: c, hi: hi, lo: lo, up: c >= o });
      vols.push(0.3 + r() * 0.7);
      price = c; if (lo < min) min = lo; if (hi > max) max = hi;
    }
    var rng = max - min || 1;
    var plotH = H - padB - padT, plotW = W - padR - 0;
    var cw = plotW / n;
    function y(p) { return padT + (1 - (p - min) / rng) * plotH; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">';
    svg += '<defs><linearGradient id="cl-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3ff" stop-opacity="0.28"/><stop offset="1" stop-color="#4fa3ff" stop-opacity="0"/></linearGradient></defs>';
    // grid
    for (var g = 0; g <= 4; g++) { var gy = padT + (plotH / 4) * g; svg += '<line x1="0" y1="' + gy.toFixed(1) + '" x2="' + plotW + '" y2="' + gy.toFixed(1) + '" stroke="rgba(124,164,228,0.09)" stroke-width="1"/>'; }
    // volume
    for (i = 0; i < n; i++) { var vx = i * cw + cw * 0.18, vw = cw * 0.64, vh = vols[i] * 36; svg += '<rect x="' + vx.toFixed(1) + '" y="' + (H - padB + 2 - vh).toFixed(1) + '" width="' + vw.toFixed(1) + '" height="' + vh.toFixed(1) + '" rx="1" fill="' + (candles[i].up ? 'rgba(70,211,154,0.28)' : 'rgba(255,107,107,0.26)') + '"/>'; }
    // area under closes
    var area = 'M 0 ' + y(candles[0].c).toFixed(1);
    for (i = 0; i < n; i++) area += ' L ' + (i * cw + cw / 2).toFixed(1) + ' ' + y(candles[i].c).toFixed(1);
    area += ' L ' + plotW + ' ' + (H - padB) + ' L 0 ' + (H - padB) + ' Z';
    svg += '<path d="' + area + '" fill="url(#cl-area)"/>';
    // candles
    for (i = 0; i < n; i++) {
      var k = candles[i], x = i * cw + cw / 2, col = k.up ? '#46d39a' : '#ff6b6b';
      svg += '<line x1="' + x.toFixed(1) + '" y1="' + y(k.hi).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + y(k.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>';
      var by = y(Math.max(k.o, k.c)), bh = Math.max(1.5, Math.abs(y(k.o) - y(k.c)));
      svg += '<rect x="' + (x - cw * 0.3).toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (cw * 0.6).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1" fill="' + col + '"/>';
    }
    // last price line + marker
    var ly = y(candles[n - 1].c);
    svg += '<line x1="0" y1="' + ly.toFixed(1) + '" x2="' + plotW + '" y2="' + ly.toFixed(1) + '" stroke="#4fa3ff" stroke-width="1" stroke-dasharray="4 4" opacity="0.7"/>';
    svg += '<circle cx="' + (plotW - cw / 2).toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="4" fill="#84c0ff"/>';
    svg += '<circle cx="' + (plotW - cw / 2).toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="9" fill="none" stroke="#4fa3ff" stroke-width="1.5" opacity="0.5"><animate attributeName="r" values="5;12;5" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite"/></circle>';
    svg += '</svg>';
    el.innerHTML = svg;
  }

  // ---- sparkline ----
  function spark(el, up, seed) {
    var W = 100, H = 24, r = rnd(seed || 3), n = 22, pts = [], v = 0.5;
    for (var i = 0; i < n; i++) { v += (r() - (up ? 0.42 : 0.58)) * 0.18; v = Math.max(0.05, Math.min(0.95, v)); pts.push(v); }
    var d = '';
    for (i = 0; i < n; i++) d += (i === 0 ? 'M ' : ' L ') + (i / (n - 1) * W).toFixed(1) + ' ' + ((1 - pts[i]) * H).toFixed(1);
    var col = up ? '#46d39a' : '#ff6b6b';
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---- value-row mini equity chart (smooth uptrend) ----
  function equityChart(el, seed) {
    var W = 480, H = 300, r = rnd(seed || 11), n = 60, pts = [], v = 0.32;
    for (var i = 0; i < n; i++) { v += (r() - 0.34) * 0.05; v = Math.max(0.06, Math.min(0.95, v)); pts.push(v); }
    // smooth
    var line = '', area = '';
    for (i = 0; i < n; i++) { var x = (i / (n - 1)) * W, yy = (1 - pts[i]) * (H - 30) + 10; line += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + yy.toFixed(1); }
    area = line + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z';
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    svg += '<defs><linearGradient id="eq' + seed + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3ff" stop-opacity="0.34"/><stop offset="1" stop-color="#4fa3ff" stop-opacity="0"/></linearGradient></defs>';
    for (var g = 1; g <= 3; g++) { var gy = (H / 4) * g; svg += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="rgba(124,164,228,0.08)"/>'; }
    svg += '<path d="' + area + '" fill="url(#eq' + seed + ')"/>';
    svg += '<path d="' + line + '" fill="none" stroke="#4fa3ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    var lx = W, ly = (1 - pts[n - 1]) * (H - 30) + 10;
    svg += '<circle cx="' + lx + '" cy="' + ly.toFixed(1) + '" r="4.5" fill="#84c0ff"/></svg>';
    el.innerHTML = svg;
  }

  window.TaleroCharts = { candleChart: candleChart, spark: spark, equityChart: equityChart };
})();
