/* ============================================================
   TALERO MARKETS — landing interactions
   1) Hero scrub: the blue Talero logomark dissolves into a
      rising equity line as you scroll.
      Canvas only. No <video>. No scroll listener — rAF + getBoundingClientRect.
   2) Ticker strip duplication
   3) Scroll-triggered reveals (IntersectionObserver)
   ============================================================ */
(function () {
  'use strict';

  var DEEP = '#070D1A';
  var LINE = '#4FA3FF';     // brand blue
  var LINE_HI = '#84C0FF';  // brand blue light
  var N = 1400;             // particle count

  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function lerp(a,b,t){return a+(b-a)*t;}

  /* ---------- equity line series (the shape we resolve into) ---------- */
  var SER = 170;
  var serRnd = mulberry32(424242);
  var series = [];
  var v = 0;
  for (var s = 0; s < SER; s++) {
    var midDip = Math.sin((s / SER) * Math.PI * 1.7) * 0.10; // gentle plateau mid-way
    v += 0.0135 + (serRnd() - 0.5) * 0.055;
    series.push(v + midDip);
  }
  var sMin = Math.min.apply(null, series), sMax = Math.max.apply(null, series);
  for (var s2 = 0; s2 < SER; s2++) series[s2] = (series[s2] - sMin) / (sMax - sMin);

  /* ---------- Talero logomark → normalized point cloud ---------- */
  var LOGO_CW = 28.1, LOGO_CH = 21.3; // content bbox of the mark
  var P1 = new Path2D('M 3.908 3.889 L 7.855 0 L 14.031 0 L 28.061 0 L 24.193 3.928 L 20.323 7.777 L 14.031 7.777 L 0 7.777 L 3.908 3.889 Z');
  var P2 = new Path2D('M 2.892 16.45 L 19.346 0 L 14.461 0 L 8.285 0 L 0 8.225 L 0 19.289 L 0.957 18.375 L 2.892 16.45 Z');
  var P3 = new Path2D('M 7.816 0 L 0 0 L 0 12.522 L 7.816 12.522 L 7.816 0 Z');

  var logoNorm = null; // array of [nx,ny] in [0,1] over the logo bbox
  function buildLogoCloud(count) {
    var ocw = 320, sc = ocw / LOGO_CW, och = Math.round(LOGO_CH * sc);
    var oc = document.createElement('canvas'); oc.width = ocw; oc.height = och;
    var o = oc.getContext('2d');
    o.fillStyle = '#fff';
    o.save(); o.scale(sc, sc);
    o.save(); o.translate(0.039, 0); o.fill(P1); o.restore();
    o.save(); o.translate(0, 8.711); o.fill(P2); o.restore();
    o.save(); o.translate(20.284, 8.711); o.fill(P3); o.restore();
    o.restore();
    var d = o.getImageData(0, 0, ocw, och).data;
    var pool = [];
    for (var y = 0; y < och; y += 2) for (var x = 0; x < ocw; x += 2) {
      if (d[(y * ocw + x) * 4 + 3] > 128) pool.push([x / ocw, y / och]);
    }
    // shuffle (seeded) then take `count`
    var r = mulberry32(99), arr = pool.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = (r() * (i + 1)) | 0; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    var out = [];
    for (var k = 0; k < count; k++) out.push(arr[k % arr.length]);
    return out;
  }

  var container = document.getElementById('heroScroll');
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var cw = 0, ch = 0, dpr = 1;

  // geometry rebuilt on resize
  var logoPts = [];     // {x,y} placed in canvas space, sorted by x
  var lineTargets = []; // {x,y} along the equity line, one per particle (x ascending)
  var lineCurve = [];   // {x,y} the SER polyline for crisp stroke
  var logoBox = {};     // placement rect of the crisp vector logo

  function buildGeometry() {
    if (!logoNorm) logoNorm = buildLogoCloud(N);
    // equity polyline
    var mx = cw * 0.05;
    var yLow = ch * 0.70, yHigh = ch * 0.40;
    lineCurve = [];
    for (var i = 0; i < SER; i++) {
      var x = mx + (i / (SER - 1)) * (cw - 2 * mx);
      var y = yLow + series[i] * (yHigh - yLow);
      lineCurve.push({ x: x, y: y });
    }
    // particle targets sampled along the polyline
    lineTargets = [];
    for (var p = 0; p < N; p++) {
      var t = (p / (N - 1)) * (SER - 1), idx = Math.floor(t), f = t - idx;
      var a = lineCurve[idx], b = lineCurve[Math.min(SER - 1, idx + 1)];
      lineTargets.push({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) });
    }
    // crisp logo placement
    var lh = Math.min(ch * 0.40, cw * 0.34);
    var lw = lh * (LOGO_CW / LOGO_CH);
    var cx = cw / 2, cyTop = ch * 0.40 - lh / 2;
    logoBox = { x: cx - lw / 2, y: cyTop, w: lw, h: lh };
    // place + sort logo cloud by x to pair with x-ascending line
    var placed = [];
    for (var q = 0; q < N; q++) {
      placed.push({ x: logoBox.x + logoNorm[q][0] * lw, y: logoBox.y + logoNorm[q][1] * lh });
    }
    placed.sort(function (m, n) { return m.x - n.x; });
    logoPts = placed;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGeometry();
  }

  function drawVectorLogo(alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(logoBox.x, logoBox.y);
    ctx.scale(logoBox.w / LOGO_CW, logoBox.h / LOGO_CH);
    var g = ctx.createLinearGradient(0, 0, 0, LOGO_CH);
    g.addColorStop(0, LINE_HI); g.addColorStop(1, '#2E7FE0');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(79,163,255,0.8)';
    ctx.shadowBlur = 26;
    ctx.save(); ctx.translate(0.039, 0); ctx.fill(P1); ctx.restore();
    ctx.save(); ctx.translate(0, 8.711); ctx.fill(P2); ctx.restore();
    ctx.save(); ctx.translate(20.284, 8.711); ctx.fill(P3); ctx.restore();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function draw(progress) {
    ctx.fillStyle = DEEP;
    ctx.fillRect(0, 0, cw, ch);

    var mRaw = clamp((progress - 0.10) / 0.72, 0, 1);   // morph progress (linear)
    var vecAlpha = 1 - ease(clamp(progress / 0.20, 0, 1)); // crisp logo fades out early
    var lineAlpha = ease(clamp((progress - 0.80) / 0.20, 0, 1)); // clean stroke fades in late
    var partAlpha = ease(clamp(progress / 0.14, 0, 1)) * (1 - lineAlpha); // particles in early, out at end

    // 1) crisp Talero logomark (the "blue Talero image" at the start)
    if (vecAlpha > 0.01) drawVectorLogo(vecAlpha);

    // 2) particle morph — logo cloud streams + fans out into the line
    if (partAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = LINE;
      ctx.shadowColor = 'rgba(79,163,255,0.55)';
      ctx.shadowBlur = 6;
      for (var i = 0; i < N; i++) {
        var st = (i / N) * 0.16;                         // left points morph slightly earlier
        var pe = ease(clamp((mRaw - st) / (1 - 0.16), 0, 1));
        var lp = logoPts[i], tp = lineTargets[i];
        var x = lerp(lp.x, tp.x, pe);
        var y = lerp(lp.y, tp.y, pe);
        ctx.globalAlpha = partAlpha * (0.55 + 0.45 * pe);
        var rad = lerp(1.5, 1.0, pe);
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 3) crisp glowing equity line + leading dot (final state)
    if (lineAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = lineAlpha;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(79,163,255,0.9)';
      ctx.shadowBlur = 22 * lineAlpha;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (var j = 0; j < SER; j++) {
        if (j === 0) ctx.moveTo(lineCurve[j].x, lineCurve[j].y);
        else ctx.lineTo(lineCurve[j].x, lineCurve[j].y);
      }
      ctx.stroke();
      var end = lineCurve[SER - 1];
      ctx.fillStyle = LINE_HI;
      ctx.shadowColor = 'rgba(132,192,255,1)';
      ctx.shadowBlur = 18 * lineAlpha;
      ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  window.__heroDraw = draw;
  var lastQ = -1;
  function frame() {
    if (container) {
      var top = container.getBoundingClientRect().top;
      var denom = container.offsetHeight - window.innerHeight;
      var progress = denom > 0 ? clamp(-top / denom, 0, 1) : 0;
      var q = Math.round(progress * 600);
      if (q !== lastQ) { lastQ = q; draw(progress); }
    }
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    draw(0);
    requestAnimationFrame(frame);
    document.body.classList.add('hero-loaded');
  }

  window.addEventListener('resize', function () { resize(); lastQ = -1; });
  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else window.addEventListener('DOMContentLoaded', init);

  /* ---------- ticker duplication (seamless 50% loop) ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var track = document.getElementById('tickerTrack');
    if (track) track.innerHTML = track.innerHTML + track.innerHTML;

    /* ---------- reveals ---------- */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var els = Array.prototype.slice.call(e.target.querySelectorAll('.reveal'));
          var group = e.target.classList.contains('reveal') ? [e.target] : els;
          group.forEach(function (el, idx) {
            setTimeout(function () { el.classList.add('in'); }, idx * 80);
          });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 4% 0px' });

    document.querySelectorAll('[data-reveal-group]').forEach(function (g) { io.observe(g); });
    document.querySelectorAll('.reveal:not([data-reveal-group] .reveal)').forEach(function (el) {
      var solo = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); solo.unobserve(en.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px 4% 0px' });
      solo.observe(el);
    });

    /* safety net — never leave a blank band: reveal anything that
       has scrolled into the viewport even if its observer hasn't fired */
    function sweepReveals(){
      var vh = window.innerHeight;
      document.querySelectorAll('.reveal:not(.in)').forEach(function(el){
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) el.classList.add('in');
      });
    }
    window.addEventListener('scroll', sweepReveals, { passive: true });
    window.addEventListener('resize', sweepReveals);
    sweepReveals();
  });
})();
