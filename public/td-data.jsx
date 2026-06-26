// td-data.jsx — deterministic sample data for the Talero Trading & Performance dashboard.
// Everything is illustrative / synthetic. Exports window.TD.
(function () {
  // --- seeded RNG (mulberry32) so every reload + every viewport is identical ---
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // gaussian-ish from uniform
  function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }

  // Build a daily P&L series with mild upward drift + volatility.
  function genDaily(seed, n, drift, vol) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = drift + gauss(r) * vol;
      out.push(Math.round(v));
    }
    return out;
  }

  function cumulative(arr, base) {
    let acc = base || 0;
    return arr.map((v) => (acc += v));
  }

  function histogram(arr) {
    // buckets in $ : <-400, -400..-200, -200..0, 0..200, 200..400, 400..600, >600
    const edges = [-400, -200, 0, 200, 400, 600];
    const labels = ['≤-400', '-400', '-200', '0', '+200', '+400', '+600'];
    const counts = new Array(edges.length + 1).fill(0);
    arr.forEach((v) => {
      let placed = false;
      for (let i = 0; i < edges.length; i++) {
        if (v <= edges[i]) { counts[i]++; placed = true; break; }
      }
      if (!placed) counts[counts.length - 1]++;
    });
    return labels.map((l, i) => ({ label: l, value: counts[i], neg: i < 3 }));
  }

  function stats(arr, mult) {
    const wins = arr.filter((v) => v > 0);
    const losses = arr.filter((v) => v < 0);
    const sum = (a) => a.reduce((s, v) => s + v, 0);
    const mean = (a) => (a.length ? sum(a) / a.length : 0);
    const sd = (a) => {
      if (a.length < 2) return 0;
      const m = mean(a);
      return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
    };
    const cum = cumulative(arr, 0);
    let peak = 0, maxDD = 0, maxRU = 0;
    cum.forEach((v) => {
      peak = Math.max(peak, v);
      maxRU = Math.max(maxRU, v);
      maxDD = Math.min(maxDD, v - peak);
    });
    const contractsW = Math.round(wins.length * (2.1 * mult));
    const contractsL = Math.round(losses.length * (1.7 * mult));
    return {
      totalProfit: Math.round(sum(wins)),
      totalLoss: Math.round(sum(losses)),
      numWin: wins.length,
      numLoss: losses.length,
      contractsW,
      contractsL,
      largestWin: wins.length ? Math.max(...wins) : 0,
      largestLoss: losses.length ? Math.min(...losses) : 0,
      avgWin: Math.round(mean(wins)),
      avgLoss: Math.round(mean(losses)),
      sdWin: Math.round(sd(wins)),
      sdLoss: Math.round(sd(losses)),
      avgWinTime: '0h 7m 12s',
      avgLossTime: '0h 11m 48s',
      largestWinTime: '0h 42m 05s',
      largestLossTime: '1h 03m 20s',
      maxRunup: Math.round(maxRU),
      maxDrawdown: Math.round(maxDD),
    };
  }

  // intraday points for "Today" (half-hour marks of an RTH session)
  function intraday(seed, mult) {
    const r = rng(seed);
    const marks = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
    let v = 0;
    return marks.map((t) => {
      v += (gauss(r) * 180 + 26) * mult;
      return { label: t, value: Math.round(v) };
    });
  }

  function timeOfDay(seed, mult) {
    const r = rng(seed);
    const hours = ['08', '09', '10', '11', '12', '13', '14', '15'];
    return hours.map((h) => ({
      label: h, value: Math.round((gauss(r) * 420 + 120) * mult), neg: false,
    })).map((d) => ({ ...d, neg: d.value < 0 }));
  }

  // Build a full range bundle from a daily series.
  function bundle(seed, n, drift, vol, mult, isIntraday) {
    const daily = genDaily(seed, n, drift, vol);
    const pnlHistory = isIntraday
      ? intraday(seed + 7, mult)
      : daily.map((v, i) => ({ label: String(i + 1), value: v }));
    const cum = cumulative(daily, 0).map((v, i) => ({ label: String(i + 1), value: v }));
    return {
      stats: stats(daily, mult),
      pnlHistory,
      cumulative: cum,
      distribution: histogram(daily),
      timeOfDay: timeOfDay(seed + 13, mult),
    };
  }

  function ranges(modeSeed, mult) {
    return {
      today: bundle(modeSeed + 1, 14, 22, 150, mult, true),
      week: bundle(modeSeed + 2, 5, 120, 360, mult, false),
      month: bundle(modeSeed + 3, 22, 95, 420, mult, false),
      ytd: bundle(modeSeed + 4, 112, 78, 480, mult, false),
      all: bundle(modeSeed + 5, 248, 64, 520, mult, false),
    };
  }

  // 30-day equity curve for the hero chart at the bottom
  function equity(seed, base, mult) {
    const daily = genDaily(seed, 30, 90, 380).map((v) => v * mult);
    const cum = cumulative(daily, 0);
    return cum.map((v, i) => ({ label: String(i + 1), value: Math.round(base + v) }));
  }

  const LIVE = {
    account: { id: '1912208', mode: 'Live', label: 'Live account', nickname: 'Castillo · Futures' },
    kpis: {
      buyingPower: 48250, cashBalance: 12640.55,
      realizedPnl: 3284.10, unrealizedPnl: 612.25,
      contractsTraded: 218, notionalVolume: 4_620_000,
      winRate: 61.4, roi: 18.7,
      dayTradesUsed: 1, dayTradesMax: 3, marginTier: 'Day-trade',
    },
    positions: [
      { sym: 'ES', name: 'E-mini S&P 500', exp: 'SEP25', dir: 'Long', qty: 2, avg: 5412.25, last: 5418.50, upnl: 625.00, updated: '12s ago' },
      { sym: 'NQ', name: 'E-mini Nasdaq-100', exp: 'SEP25', dir: 'Short', qty: 1, avg: 19240.00, last: 19255.50, upnl: -310.00, updated: '8s ago' },
      { sym: 'CL', name: 'Crude Oil', exp: 'AUG25', dir: 'Long', qty: 3, avg: 78.42, last: 78.66, upnl: 720.00, updated: '21s ago' },
      { sym: 'GC', name: 'Gold', exp: 'AUG25', dir: 'Short', qty: 1, avg: 2358.0, last: 2354.4, upnl: -422.75, updated: '4s ago' },
    ],
    sentiment: [
      { sym: 'ES', name: 'S&P 500 Futures', long: 62 },
      { sym: 'NQ', name: 'Nasdaq Futures', long: 71 },
      { sym: 'CL', name: 'Crude Oil', long: 38 },
      { sym: 'GC', name: 'Gold', long: 54 },
    ],
    journal: [
      { time: '15:42 ET', sym: 'CL', side: 'Buy', qty: 3, price: 78.42, pnl: null, note: 'Breakout retest above 78.30 VWAP reclaim.' },
      { time: '14:18 ET', sym: 'NQ', side: 'Sell', qty: 1, price: 19240.00, pnl: 215.00, note: 'Faded the open drive into prior day high.' },
      { time: '11:05 ET', sym: 'ES', side: 'Buy', qty: 2, price: 5410.75, pnl: 312.50, note: 'Pullback to rising 20-EMA, risk under 5404.' },
      { time: '10:31 ET', sym: 'GC', side: 'Sell', qty: 1, price: 2358.00, pnl: -188.00, note: 'Stopped — DXY strength, thesis invalidated.' },
    ],
    milestones: [
      { label: 'First trade placed', pct: 100, hint: 'Completed May 22' },
      { label: '100 contracts traded', pct: 100, hint: '218 / 100' },
      { label: '$10M notional volume', pct: 46, hint: '$4.62M / $10M' },
      { label: 'Positive 30-day ROI', pct: 100, hint: '+18.7%' },
    ],
    contractsByInstrument: [
      { label: 'ES', value: 92 }, { label: 'NQ', value: 54 },
      { label: 'CL', value: 41 }, { label: 'GC', value: 31 },
    ],
    ranges: ranges(1000, 1.0),
    equity: equity(2200, 9356.45, 1.0),
  };

  // donut for winning vs losing trades, derived from a range
  function winLossDonut(range) {
    return { win: range.stats.numWin, loss: range.stats.numLoss };
  }

  window.TD = {
    LIVE, winLossDonut,
    RANGE_LABELS: { today: 'Today', week: 'This week', month: 'This month', ytd: 'Year to date', all: 'All time' },
  };
})();
