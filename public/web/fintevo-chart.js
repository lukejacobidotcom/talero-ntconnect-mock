/* ============================================================
   Talero × Fintevo — interactive hero chart
   SVG candlesticks · hover crosshair + OHLC tooltip ·
   clickable timeframes · symbol switching · live ticking
   ============================================================ */
(function () {
  var SYMBOLS = {
    ES: { name: 'E-mini S&P 500', base: 5482.25, dec: 2, vol: 1.0 },
    NQ: { name: 'E-mini Nasdaq-100', base: 19640.50, dec: 2, vol: 1.6 },
    CL: { name: 'Crude Oil', base: 78.42, dec: 2, vol: 0.018 },
    GC: { name: 'Gold', base: 2412.30, dec: 1, vol: 0.55 },
    '6E': { name: 'Euro FX', base: 1.0842, dec: 4, vol: 0.0004 }
  };
  var TF = { '1m': 0.4, '5m': 1.0, '1H': 2.4, '1D': 5.2 };
  var N = 48;

  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function FintevoChart(root) {
    this.root = root;
    this.host = root.querySelector('.fin-chart');
    this.symEl = root.querySelector('.pw-sym b');
    this.pxEl = root.querySelector('.pw-sym .px');
    this.chgEl = root.querySelector('.pw-sym .chg');
    this.symbol = 'ES'; this.tf = '5m';
    this.W = 720; this.H = 360; this.padT = 10; this.padB = 34;
    this._build();
    this.generate(); this.render(); this.bind(); this.live();
  }

  FintevoChart.prototype._build = function () {
    this.host.innerHTML =
      '<svg class="fc-svg" viewBox="0 0 ' + this.W + ' ' + this.H + '" preserveAspectRatio="none" aria-hidden="true"></svg>' +
      '<div class="cross-h"></div><div class="cross-v"></div><div class="cross-dot"></div>' +
      '<div class="cross-tip"></div>' +
      '<div class="fin-watermark"><span class="fl">' + FIN_LOGO + '</span><span class="lv"><i></i>LIVE</span></div>';
    this.svg = this.host.querySelector('.fc-svg');
    this.cv = this.host.querySelector('.cross-v');
    this.ch = this.host.querySelector('.cross-h');
    this.cd = this.host.querySelector('.cross-dot');
    this.tip = this.host.querySelector('.cross-tip');
  };

  FintevoChart.prototype.generate = function () {
    var sy = SYMBOLS[this.symbol], step = sy.base * 0.0016 * TF[this.tf] + sy.vol;
    var r = rng((this.symbol.charCodeAt(0) * 131 + this.tf.length * 17 + Math.floor(sy.base)) | 0);
    var p = sy.base * (0.985 + r() * 0.01), c = [], min = Infinity, max = -Infinity;
    for (var i = 0; i < N; i++) {
      var drift = (r() - 0.47) * step * 2.1, o = p, cl = p + drift;
      var hi = Math.max(o, cl) + r() * step, lo = Math.min(o, cl) - r() * step;
      c.push({ o: o, c: cl, hi: hi, lo: lo, up: cl >= o, v: 0.3 + r() * 0.7 });
      p = cl; if (lo < min) min = lo; if (hi > max) max = hi;
    }
    // nudge final close toward listed base so header reads sensibly
    this.candles = c; this.min = min; this.max = max; this.range = (max - min) || 1;
  };

  FintevoChart.prototype.x = function (i) { return i * (this.W / N) + (this.W / N) / 2; };
  FintevoChart.prototype.y = function (val) { return this.padT + (1 - (val - this.min) / this.range) * (this.H - this.padB - this.padT); };

  FintevoChart.prototype.render = function () {
    var c = this.candles, n = c.length, cw = this.W / N, s = '';
    s += '<defs><linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa3ff" stop-opacity="0.26"/><stop offset="1" stop-color="#4fa3ff" stop-opacity="0"/></linearGradient></defs>';
    for (var g = 0; g <= 4; g++) { var gy = this.padT + ((this.H - this.padB - this.padT) / 4) * g; s += '<line x1="0" y1="' + gy.toFixed(1) + '" x2="' + this.W + '" y2="' + gy.toFixed(1) + '" stroke="rgba(124,164,228,0.09)"/>'; }
    for (var i = 0; i < n; i++) { var vh = c[i].v * 34; s += '<rect x="' + (i * cw + cw * 0.2).toFixed(1) + '" y="' + (this.H - this.padB + 2 - vh).toFixed(1) + '" width="' + (cw * 0.6).toFixed(1) + '" height="' + vh.toFixed(1) + '" rx="1" fill="' + (c[i].up ? 'rgba(70,211,154,0.26)' : 'rgba(255,107,107,0.24)') + '"/>'; }
    var area = 'M 0 ' + this.y(c[0].c).toFixed(1);
    for (i = 0; i < n; i++) area += ' L ' + this.x(i).toFixed(1) + ' ' + this.y(c[i].c).toFixed(1);
    area += ' L ' + this.W + ' ' + (this.H - this.padB) + ' L 0 ' + (this.H - this.padB) + ' Z';
    s += '<path d="' + area + '" fill="url(#fc-area)"/>';
    for (i = 0; i < n; i++) {
      var k = c[i], x = this.x(i), col = k.up ? '#46d39a' : '#ff6b6b';
      s += '<line x1="' + x.toFixed(1) + '" y1="' + this.y(k.hi).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + this.y(k.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>';
      var by = this.y(Math.max(k.o, k.c)), bh = Math.max(1.5, Math.abs(this.y(k.o) - this.y(k.c)));
      s += '<rect x="' + (x - cw * 0.3).toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (cw * 0.6).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1" fill="' + col + '"/>';
    }
    var ly = this.y(c[n - 1].c);
    s += '<line x1="0" y1="' + ly.toFixed(1) + '" x2="' + this.W + '" y2="' + ly.toFixed(1) + '" stroke="#4fa3ff" stroke-width="1" stroke-dasharray="4 4" opacity="0.65"/>';
    s += '<circle cx="' + this.x(n - 1).toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.6" fill="#84c0ff"/>';
    s += '<circle cx="' + this.x(n - 1).toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="6" fill="none" stroke="#4fa3ff" stroke-width="1.4" opacity="0.5"><animate attributeName="r" values="5;12;5" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite"/></circle>';
    this.svg.innerHTML = s;
    this.updateHeader();
  };

  FintevoChart.prototype.fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: SYMBOLS[this.symbol].dec, maximumFractionDigits: SYMBOLS[this.symbol].dec }); };

  FintevoChart.prototype.updateHeader = function () {
    var c = this.candles, last = c[c.length - 1].c, first = c[0].o, pct = ((last - first) / first) * 100;
    if (this.symEl) this.symEl.textContent = '/' + this.symbol;
    if (this.pxEl) this.pxEl.textContent = this.fmt(last);
    if (this.chgEl) {
      this.chgEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      this.chgEl.style.color = pct >= 0 ? 'var(--pos)' : 'var(--neg)';
      this.chgEl.style.background = pct >= 0 ? 'rgba(70,211,154,0.13)' : 'rgba(255,107,107,0.13)';
    }
  };

  FintevoChart.prototype.bind = function () {
    var self = this;
    function move(e) {
      var rect = self.host.getBoundingClientRect();
      var clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      var clientY = (e.touches ? e.touches[0].clientY : e.clientY);
      var px = clientX - rect.left;
      var idx = Math.max(0, Math.min(N - 1, Math.round((px / rect.width) * N - 0.5)));
      var k = self.candles[idx];
      var cxPx = (self.x(idx) / self.W) * rect.width;
      var cyPx = (self.y(k.c) / self.H) * rect.height;
      self.cv.style.left = cxPx + 'px'; self.cv.style.opacity = 1;
      self.ch.style.top = cyPx + 'px'; self.ch.style.opacity = 1;
      self.cd.style.left = cxPx + 'px'; self.cd.style.top = cyPx + 'px'; self.cd.style.opacity = 1;
      self.tip.innerHTML = '<div class="tt-sym" style="color:' + (k.up ? 'var(--pos)' : 'var(--neg)') + '">/' + self.symbol + '</div>' +
        '<div class="tt-row">O <b>' + self.fmt(k.o) + '</b></div>' +
        '<div class="tt-row">H <b>' + self.fmt(k.hi) + '</b></div>' +
        '<div class="tt-row">L <b>' + self.fmt(k.lo) + '</b></div>' +
        '<div class="tt-row">C <b>' + self.fmt(k.c) + '</b></div>';
      self.tip.style.opacity = 1;
      var tipW = self.tip.offsetWidth || 110, tipH = self.tip.offsetHeight || 90;
      var tx = cxPx + 12; if (tx + tipW > rect.width) tx = cxPx - tipW - 12;
      var ty = Math.min(Math.max(cyPx - tipH / 2, 4), rect.height - tipH - 4);
      self.tip.style.left = tx + 'px'; self.tip.style.top = ty + 'px';
    }
    function leave() { self.cv.style.opacity = 0; self.ch.style.opacity = 0; self.cd.style.opacity = 0; self.tip.style.opacity = 0; }
    this.host.addEventListener('mousemove', move);
    this.host.addEventListener('mouseleave', leave);
    this.host.addEventListener('touchstart', move, { passive: true });
    this.host.addEventListener('touchmove', move, { passive: true });
    this.host.addEventListener('touchend', leave);

    // timeframe tabs
    this.root.querySelectorAll('.pw-tabs span[data-tf]').forEach(function (t) {
      t.addEventListener('click', function () {
        self.root.querySelectorAll('.pw-tabs span').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on'); self.tf = t.getAttribute('data-tf');
        self.generate(); self.render();
      });
    });
    // watchlist symbol switch
    this.root.querySelectorAll('.wl-row[data-sym]').forEach(function (w) {
      w.addEventListener('click', function () {
        var sym = w.getAttribute('data-sym'); if (!SYMBOLS[sym]) return;
        self.root.querySelectorAll('.wl-row').forEach(function (x) { x.classList.remove('active'); });
        w.classList.add('active'); self.symbol = sym;
        self.generate(); self.render();
      });
    });
  };

  FintevoChart.prototype.live = function () {
    var self = this, ticks = 0;
    if (self._iv) clearInterval(self._iv);
    self._iv = setInterval(function () {
      if (document.hidden) return;
      var c = self.candles, last = c[c.length - 1], sy = SYMBOLS[self.symbol];
      var step = (sy.base * 0.0006 * TF[self.tf]) + sy.vol * 0.5;
      last.c += (Math.random() - 0.5) * step;
      last.hi = Math.max(last.hi, last.c); last.lo = Math.min(last.lo, last.c); last.up = last.c >= last.o;
      ticks++;
      if (ticks % 7 === 0) { // roll a new candle
        c.shift();
        var o = last.c, cl = o + (Math.random() - 0.5) * step * 2;
        c.push({ o: o, c: cl, hi: Math.max(o, cl) + Math.random() * step, lo: Math.min(o, cl) - Math.random() * step, up: cl >= o, v: 0.3 + Math.random() * 0.7 });
      }
      self.min = Infinity; self.max = -Infinity;
      for (var i = 0; i < c.length; i++) { if (c[i].lo < self.min) self.min = c[i].lo; if (c[i].hi > self.max) self.max = c[i].hi; }
      self.range = (self.max - self.min) || 1;
      self.render();
    }, 1500);
  };

  // small Fintevo wordmark for the watermark
  var FIN_LOGO = '<svg viewBox="0 0 455 153" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fintevo"><path d="M83.356 120.542V53.8181H100.436V120.542H83.356ZM83.4033 66.6361V53.8181H100.436V66.6361H83.4033Z"></path><rect x="38.2828" y="27" width="154.56" height="15.36"></rect><path d="M45.9637 27C41.7223 27 38.2832 30.4383 38.2831 34.6797V66.751L71.7147 66.6367V81.1436L38.2831 81.2588V120.542H21.0038V44.2803C21.0038 34.7369 28.7398 27.0003 38.2831 27H45.9637Z"></path><path d="M192.843 27C201.653 27.0085 208.788 34.1621 208.772 42.9746L208.755 52.5205H229.322V65.0547H208.732L208.679 95.2832C208.679 98.5598 209.538 101.099 211.259 102.901C213.061 104.622 215.601 105.481 218.878 105.481H229.322V120.104H219.737C213.593 120.104 208.515 119.326 204.501 117.77C200.569 116.131 197.619 113.428 195.653 109.66C193.687 105.81 192.704 100.648 192.704 94.1768L192.758 65.0547H182.137V52.5205H192.78L192.813 34.042C192.489 30.0992 189.189 27.0002 185.163 27H192.843Z"></path><path d="M114.123 120.773V54.049H127.64V82.68H126.411C126.411 75.8807 127.312 70.2282 129.114 65.7226C130.916 61.1351 133.579 57.6944 137.101 55.4007C140.706 53.1069 145.17 51.96 150.495 51.96H151.233C159.179 51.96 165.2 54.5405 169.296 59.7015C173.392 64.7805 175.44 72.3991 175.44 82.5571V120.773H158.36V81.0826C158.36 76.9866 157.172 73.6688 154.796 71.1293C152.502 68.5898 149.307 67.32 145.211 67.32C141.034 67.32 137.634 68.6307 135.012 71.2522C132.473 73.7917 131.203 77.2323 131.203 81.5741V120.773H114.123Z"></path><path d="M405.976 122.877C400.078 122.877 394.876 121.935 390.37 120.051C385.865 118.167 382.055 115.627 378.942 112.432C375.83 109.155 373.454 105.469 371.815 101.373C370.259 97.277 369.481 93.0172 369.481 88.5935V86.013C369.481 81.4255 370.3 77.0838 371.938 72.9878C373.659 68.8098 376.075 65.1234 379.188 61.9286C382.383 58.6518 386.233 56.1122 390.739 54.31C395.245 52.4258 400.324 51.4838 405.976 51.4838C411.629 51.4838 416.708 52.4258 421.213 54.31C425.719 56.1122 429.528 58.6518 432.641 61.9286C435.836 65.1234 438.253 68.8098 439.891 72.9878C441.529 77.0838 442.349 81.4255 442.349 86.013V88.5935C442.349 93.0172 441.529 97.277 439.891 101.373C438.334 105.469 436 109.155 432.887 112.432C429.774 115.627 425.965 118.167 421.459 120.051C416.953 121.935 411.792 122.877 405.976 122.877ZM405.976 108.254C410.154 108.254 413.677 107.353 416.544 105.551C419.411 103.667 421.582 101.168 423.056 98.0553C424.531 94.8604 425.268 91.2559 425.268 87.2418C425.268 83.1458 424.49 79.5414 422.934 76.4284C421.459 73.2335 419.247 70.735 416.298 68.9327C413.431 67.0486 409.99 66.1065 405.976 66.1065C401.962 66.1065 398.48 67.0486 395.531 68.9327C392.664 70.735 390.452 73.2335 388.896 76.4284C387.339 79.5414 386.561 83.1458 386.561 87.2418C386.561 91.2559 387.298 94.8604 388.773 98.0553C390.329 101.168 392.541 103.667 395.408 105.551C398.276 107.353 401.798 108.254 405.976 108.254Z"></path><path d="M322.21 120.542L301.321 53.8186H318.893L338.922 120.542H322.21ZM327.248 120.542V106.534H345.312V120.542H327.248ZM334.007 120.542L351.21 53.8186H367.676L349.613 120.542H334.007Z"></path><path d="M267.444 122.877C261.71 122.877 256.672 121.894 252.33 119.928C248.07 117.962 244.507 115.34 241.639 112.064C238.854 108.705 236.724 104.978 235.25 100.882C233.857 96.7855 233.161 92.6076 233.161 88.3478V86.013C233.161 81.5894 233.857 77.3295 235.25 73.2335C236.724 69.0556 238.854 65.3692 241.639 62.1743C244.507 58.8975 248.029 56.317 252.207 54.4329C256.385 52.4668 261.218 51.4838 266.707 51.4838C273.916 51.4838 279.937 53.0812 284.77 56.2761C289.686 59.389 293.372 63.526 295.83 68.687C298.287 73.766 299.516 79.2547 299.516 85.1529V91.2969H240.411V80.8521H288.825L283.542 86.013C283.542 81.7532 282.927 78.1078 281.698 75.0767C280.47 72.0457 278.585 69.711 276.046 68.0726C273.588 66.4342 270.475 65.615 266.707 65.615C262.939 65.615 259.744 66.4751 257.122 68.1954C254.501 69.9158 252.494 72.4143 251.101 75.6911C249.79 78.886 249.135 82.7362 249.135 87.2418C249.135 91.4198 249.79 95.1471 251.101 98.4239C252.412 101.619 254.419 104.158 257.122 106.042C259.826 107.845 263.266 108.746 267.444 108.746C271.622 108.746 275.022 107.927 277.643 106.288C280.265 104.568 281.944 102.479 282.681 100.021H298.41C297.427 104.609 295.543 108.623 292.757 112.064C289.972 115.504 286.409 118.167 282.067 120.051C277.807 121.935 272.933 122.877 267.444 122.877Z"></path></svg>';

  window.FintevoChart = FintevoChart;
})();
