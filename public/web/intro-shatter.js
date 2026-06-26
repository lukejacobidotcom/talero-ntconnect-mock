/* ============================================================
   Talero intro — logo expands, then shatters into thousands
   of particles that fly off-screen, revealing the homepage.
   ============================================================ */
(function () {
  var intro = document.getElementById('intro');
  var logoEl = document.getElementById('introLogo');
  var canvas = document.getElementById('shatterCanvas');
  var skipBtn = document.querySelector('.intro-skip');
  if (!intro || !logoEl || !canvas) { if (intro) intro.classList.add('gone'); document.body.classList.remove('intro-lock'); return; }

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var done = false;
  function finish() {
    if (done) return; done = true;
    intro.classList.add('gone');
    canvas.style.opacity = '0';
    document.body.classList.remove('intro-lock');
    if (skipBtn) skipBtn.style.display = 'none';
    window.dispatchEvent(new Event('talero:intro-done'));
    setTimeout(function () { if (intro && intro.parentNode) intro.style.display = 'none'; canvas.style.display = 'none'; }, 760);
  }

  if (reduce) { finish(); return; }
  if (skipBtn) skipBtn.addEventListener('click', finish);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });

  // ---- Build the particle field by rasterizing the logo SVG ----
  var LOGO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 30 30">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#aed4ff"/><stop offset="0.5" stop-color="#4fa3ff"/><stop offset="1" stop-color="#2e7fe0"/>' +
    '</linearGradient></defs><g fill="url(#g)">' +
    '<g transform="translate(0.039 0)"><path d="M 3.908 3.889 L 7.855 0 L 14.031 0 L 28.061 0 L 24.193 3.928 L 20.323 7.777 L 14.031 7.777 L 0 7.777 L 3.908 3.889 Z"/></g>' +
    '<g transform="translate(0 8.711)"><path d="M 2.892 16.45 L 19.346 0 L 14.461 0 L 8.285 0 L 0 8.225 L 0 19.289 L 0.957 18.375 L 2.892 16.45 Z"/></g>' +
    '<g transform="translate(20.284 8.711)"><path d="M 7.816 0 L 0 0 L 0 12.522 L 7.816 12.522 L 7.816 0 Z"/></g>' +
    '</g></svg>';

  var particles = [];
  var exploded = false, raf = null, startExplode = 0;
  var cx = W / 2, cy = H / 2;

  function buildParticles(img) {
    // Size of the logo at the moment of explosion (matches CSS scale-up peak)
    var base = Math.max(150, Math.min(W * 0.26, 300));
    var L = base * 1.7;                 // exploded logo footprint
    var aspect = img.width / img.height || 1;
    var lw = L, lh = L / aspect;
    var ox = cx - lw / 2, oy = cy - lh / 2;

    var sc = document.createElement('canvas');
    var SW = 220, SH = Math.round(SW / aspect);
    sc.width = SW; sc.height = SH;
    var sctx = sc.getContext('2d');
    sctx.drawImage(img, 0, 0, SW, SH);
    var data;
    try { data = sctx.getImageData(0, 0, SW, SH).data; } catch (e) { finish(); return; }

    var step = 2;                       // dense sampling => thousands of shards
    for (var y = 0; y < SH; y += step) {
      for (var x = 0; x < SW; x += step) {
        var i = (y * SW + x) * 4;
        if (data[i + 3] > 120) {
          var px = ox + (x / SW) * lw;
          var py = oy + (y / SH) * lh;
          var r = data[i], g = data[i + 1], b = data[i + 2];
          particles.push({
            hx: px, hy: py, x: px, y: py,
            vx: 0, vy: 0, ix: 0, iy: 0,
            s: 1.6 + Math.random() * 3.2,
            col: 'rgb(' + r + ',' + g + ',' + b + ')',
            a: 1, life: 0.9 + Math.random() * 0.6, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.5
          });
        }
      }
    }
    // pre-compute explosion impulse from logo centre
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      var dx = p.hx - cx, dy = p.hy - cy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
      var force = (5.5 + Math.random() * 11) * (0.55 + 0.45 * (d / (L * 0.6)));
      p.ix = Math.cos(ang) * force;
      p.iy = Math.sin(ang) * force - 1.5;   // slight upward bias
    }
  }

  function explodeLoop(t) {
    if (!startExplode) startExplode = t;
    var dt = (t - startExplode) / 1000;
    ctx.clearRect(0, 0, W, H);
    var alive = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.a <= 0) continue;
      alive++;
      // ease-out velocity ramp at the very start for a "burst" feel
      if (dt < 0.06) { p.vx = p.ix * (dt / 0.06); p.vy = p.iy * (dt / 0.06); }
      else { p.vx = p.ix; p.vy = p.iy; }
      p.x += p.vx; p.y += p.vy;
      p.iy += 0.16;            // gravity accumulates on the impulse
      p.ix *= 0.992;           // drag
      p.rot += p.vr;
      p.a -= (1 / p.life) * 0.016 * 1.7;
      if (p.a < 0) p.a = 0;
      var sz = p.s;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.col;
      // tiny rotated shard
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive > 0 && dt < 2.2) { raf = requestAnimationFrame(explodeLoop); }
    else { finish(); }
  }

  function triggerExplode() {
    if (exploded) return; exploded = true;
    logoEl.style.transition = 'opacity .12s linear';
    logoEl.style.opacity = '0';
    canvas.style.opacity = '1';
    raf = requestAnimationFrame(explodeLoop);
  }

  // Load logo image, then run the timeline
  var img = new Image();
  img.onload = function () {
    buildParticles(img);
    runTimeline();
  };
  img.onerror = function () { finish(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);

  function runTimeline() {
    // 1. fade + scale in
    requestAnimationFrame(function () {
      logoEl.style.transition = 'opacity .7s cubic-bezier(.22,.61,.36,1), transform .9s cubic-bezier(.22,.61,.36,1)';
      logoEl.style.opacity = '1';
      logoEl.style.transform = 'scale(1)';
    });
    // 2. settle + slight breathe, then expand big
    setTimeout(function () {
      logoEl.style.transition = 'transform .55s cubic-bezier(.5,0,.75,0), filter .55s';
      logoEl.style.transform = 'scale(1.7)';
      logoEl.style.filter = 'drop-shadow(0 30px 90px rgba(79,163,255,0.7)) brightness(1.15)';
    }, 1150);
    // 3. shatter at peak expansion
    setTimeout(triggerExplode, 1620);
  }

  window.addEventListener('resize', function () { if (!exploded) { size(); cx = W / 2; cy = H / 2; } });

  // safety: never trap the user
  setTimeout(finish, 6500);
})();
