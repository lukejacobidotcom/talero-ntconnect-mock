/* ============================================================
   Talero marketing — interactions
   ============================================================ */
(function () {
  var nav = document.querySelector('.nav');
  function onScroll() { if (window.scrollY > 24) nav.classList.add('scrolled'); else nav.classList.remove('scrolled'); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile drawer
  var drawer = document.getElementById('drawer'), burger = document.getElementById('burger');
  function closeDrawer() { drawer.classList.remove('open'); document.body.style.overflow = ''; }
  if (burger) burger.addEventListener('click', function () { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; });
  if (drawer) drawer.addEventListener('click', function (e) {
    if (e.target.matches('.drawer-scrim, .drawer-close') || e.target.closest('.drawer-close, .dlink')) closeDrawer();
  });

  // smooth-scroll offset
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var el = document.querySelector(id); if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' });
    });
  });

  // reveals
  function runReveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // stat counters
  function runCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in window)) { nums.forEach(function (n) { n.textContent = n.getAttribute('data-count') + (n.getAttribute('data-suffix') || ''); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        var el = en.target, target = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', dec = (el.getAttribute('data-dec') || 0) | 0, t0 = null, dur = 1400;
        function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1); var e = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
          if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  // product tabs + table
  var PRODUCTS = {
    index: [
      ['ES', 'E-mini S&P 500', '$50', '0.25 = $12.50', 'Sun 6PM–Fri 5PM'],
      ['MES', 'Micro E-mini S&P 500', '$5', '0.25 = $1.25', 'Sun 6PM–Fri 5PM'],
      ['NQ', 'E-mini Nasdaq-100', '$20', '0.25 = $5.00', 'Sun 6PM–Fri 5PM'],
      ['MNQ', 'Micro E-mini Nasdaq-100', '$2', '0.25 = $0.50', 'Sun 6PM–Fri 5PM'],
      ['YM', 'E-mini Dow Jones', '$5', '1 = $5.00', 'Sun 6PM–Fri 5PM'],
      ['RTY', 'E-mini Russell 2000', '$50', '0.10 = $5.00', 'Sun 6PM–Fri 5PM']
    ],
    energy: [
      ['CL', 'Crude Oil (WTI)', '1,000 bbl', '0.01 = $10.00', 'Sun 6PM–Fri 5PM'],
      ['MCL', 'Micro WTI Crude Oil', '100 bbl', '0.01 = $1.00', 'Sun 6PM–Fri 5PM'],
      ['NG', 'Henry Hub Natural Gas', '10,000 MMBtu', '0.001 = $10.00', 'Sun 6PM–Fri 5PM'],
      ['RB', 'RBOB Gasoline', '42,000 gal', '0.0001 = $4.20', 'Sun 6PM–Fri 5PM']
    ],
    metals: [
      ['GC', 'Gold', '100 oz', '0.10 = $10.00', 'Sun 6PM–Fri 5PM'],
      ['MGC', 'Micro Gold', '10 oz', '0.10 = $1.00', 'Sun 6PM–Fri 5PM'],
      ['SI', 'Silver', '5,000 oz', '0.005 = $25.00', 'Sun 6PM–Fri 5PM'],
      ['HG', 'Copper', '25,000 lbs', '0.0005 = $12.50', 'Sun 6PM–Fri 5PM']
    ],
    rates: [
      ['ZB', 'U.S. T-Bond', '$1,000', '1/32 = $31.25', 'Sun 6PM–Fri 5PM'],
      ['ZN', '10-Year T-Note', '$1,000', '1/64 = $15.63', 'Sun 6PM–Fri 5PM'],
      ['ZF', '5-Year T-Note', '$1,000', '1/128 = $7.81', 'Sun 6PM–Fri 5PM'],
      ['ZT', '2-Year T-Note', '$2,000', '1/256 = $7.81', 'Sun 6PM–Fri 5PM']
    ],
    fx: [
      ['6E', 'Euro FX', '€125,000', '0.00005 = $6.25', 'Sun 6PM–Fri 5PM'],
      ['6J', 'Japanese Yen', '¥12,500,000', '0.0000005 = $6.25', 'Sun 6PM–Fri 5PM'],
      ['6B', 'British Pound', '£62,500', '0.0001 = $6.25', 'Sun 6PM–Fri 5PM'],
      ['6A', 'Australian Dollar', 'A$100,000', '0.0001 = $10.00', 'Sun 6PM–Fri 5PM']
    ],
    crypto: [
      ['BTC', 'Bitcoin', '5 BTC', '5 = $25.00', 'Sun 6PM–Fri 5PM'],
      ['MBT', 'Micro Bitcoin', '0.1 BTC', '5 = $0.50', 'Sun 6PM–Fri 5PM'],
      ['ETH', 'Ether', '50 ETH', '0.50 = $25.00', 'Sun 6PM–Fri 5PM'],
      ['MET', 'Micro Ether', '0.1 ETH', '0.50 = $0.05', 'Sun 6PM–Fri 5PM']
    ]
  };
  function renderTable(cat) {
    var tb = document.getElementById('prodBody'); if (!tb) return;
    tb.innerHTML = (PRODUCTS[cat] || []).map(function (row) {
      return '<tr><td><span class="sym">/' + row[0] + '</span></td><td class="pname">' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td></tr>';
    }).join('');
  }
  document.querySelectorAll('.prod-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.prod-tab').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on'); renderTable(t.getAttribute('data-cat'));
    });
  });
  renderTable('index');

  // platform showcase accordion
  document.querySelectorAll('.sc-item').forEach(function (it) {
    it.addEventListener('click', function () {
      document.querySelectorAll('.sc-item').forEach(function (x) { x.classList.remove('on'); });
      it.classList.add('on');
      var dev = it.getAttribute('data-device');
      if (dev && window.renderShowcaseDevice) window.renderShowcaseDevice(dev);
    });
  });

  // build charts
  function buildCharts() {
    if (window.FintevoChart) {
      var pw = document.getElementById('heroPw');
      if (pw && pw.querySelector('.fin-chart')) new window.FintevoChart(pw);
    }
    if (!window.TaleroCharts) return;
    document.querySelectorAll('[data-spark]').forEach(function (el, i) { window.TaleroCharts.spark(el, el.getAttribute('data-spark') === 'up', i * 5 + 2); });
    document.querySelectorAll('[data-equity]').forEach(function (el, i) { window.TaleroCharts.equityChart(el, (i + 1) * 13); });
  }

  // marquee duplicate for seamless loop
  var mt = document.getElementById('marqueeTrack');
  if (mt) mt.innerHTML = mt.innerHTML + mt.innerHTML;

  function start() { runReveals(); runCounters(); buildCharts(); }
  if (document.body.classList.contains('intro-lock')) {
    window.addEventListener('talero:intro-done', start);
    setTimeout(start, 7000); // fallback
  } else { start(); }
})();
