// The day simulator. Pure logic: takes the game state and returns everything that
// happened today (every customer, what they said, what was used). The scene just replays it.
import { WEATHER, LOCATIONS, TIERS, SAY, DAY_MINUTES } from './data.js';

const HOUR_WEIGHTS = [0.7, 0.85, 1.1, 1.35, 1.2, 1.25, 1.1, 0.85];

export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length)];
function gauss(rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function cupsPerPitcher(s) {
  return s.upgrades.projuicer ? 12 : s.upgrades.juicer ? 10 : 8;
}
export function lemonLife(s) {
  return (s.upgrades.fridge ? 7 : 4) + (s.difficulty === 'easy' ? 1 : s.difficulty === 'hard' ? -1 : 0);
}
export const stars = (rep) => Math.max(0, Math.min(5, rep / 20));

// Ideal ice cubes per cup for a temperature.
export const iceIdeal = (temp) => Math.max(0, Math.min(7, (temp - 55) / 9));

// How much weather matters at a place (beaches care a lot, downtown not much).
function sensed(factor, sens) {
  return Math.max(0.08, 1 + (factor - 1) * sens);
}

// Taste score (0-100) for one customer with their own preferences.
export function tasteScore(recipe, ice, temp, pref) {
  const diff = recipe.lemons - recipe.sugar; // + = sour, − = sweet
  const strength = recipe.lemons + recipe.sugar;
  const dDiff = diff - pref.diff;
  const dStr = strength - pref.strength;
  const dIce = ice - (iceIdeal(temp) + pref.ice);
  const score = 100 - 13 * Math.abs(dDiff) - 6 * Math.abs(dStr) - 8 * Math.abs(dIce);
  return { score: Math.max(0, Math.min(100, score)), dDiff, dStr, dIce };
}

// Average taste for a "typical" customer at a place — used for hints and contests.
export function typicalTaste(s, temp) {
  const loc = LOCATIONS.find((l) => l.id === s.location);
  return tasteScore(s.recipe, s.recipe.ice, temp, { diff: loc.sweet || 0, strength: 8, ice: loc.iceLove || 0 });
}

export function serviceMinutes(s) {
  let t = 2.3 * TIERS[s.tier].speed;
  if (s.upgrades.cashbox) t *= 0.8;
  if (s.upgrades.card) t *= 0.85;
  if (s.staff.helper) t *= 0.6;
  if (s.staff.manager) t *= 0.65;
  return Math.max(0.45, t);
}

// Expected people walking by (before randomness). Also used by the UI for hints.
export function expectedTraffic(s, locId = s.location, wType = s.weather.forecast.type) {
  const loc = LOCATIONS.find((l) => l.id === locId);
  const W = WEATHER[wType];
  const dow = (s.day - 1) % 7;
  const weekend = dow >= 5;
  const m = s.mods || {};
  let t = loc.traffic * (weekend ? loc.weekend : 1) * sensed(W.traffic, loc.weatherSens);
  t *= 0.55 + (s.rep / 100) * 0.9;
  if (s.staff.promoter) t *= 1.2;
  if (m.traffic) t *= m.traffic;
  if (m.loc && m.loc[locId]) t *= m.loc[locId];
  if (s.difficulty === 'easy') t *= 1.15;
  if (s.difficulty === 'hard') t *= 0.88;
  return t;
}

export function stopChance(s, wType, locId = s.location) {
  const loc = LOCATIONS.find((l) => l.id === locId);
  const W = WEATHER[wType];
  let bonus = TIERS[s.tier].stop;
  if (s.upgrades.sign) bonus += 0.1;
  if (s.upgrades.neon) bonus += 0.2;
  if (s.upgrades.speaker) bonus += 0.05;
  if (s.upgrades.umbrella && (wType === 'heat' || wType === 'sunny')) bonus += 0.15;
  return Math.min(0.92, 0.34 * sensed(W.thirst, loc.weatherSens) * (1 + bonus));
}

export function baseWTP(s, wType, locId = s.location) {
  const loc = LOCATIONS.find((l) => l.id === locId);
  const W = WEATHER[wType];
  let v = loc.price * W.wtp * (0.8 + 0.08 * stars(s.rep)) * TIERS[s.tier].wtp;
  if (s.upgrades.card) v *= 1.1;
  if (s.mods && s.mods.wtp) v *= s.mods.wtp;
  return v;
}

/**
 * Simulate one day at the stand.
 * Returns { customers: [...], totals }. Does NOT modify the state.
 */
export function simulateDay(s, adBoost = 0, rnd = Math.random) {
  const loc = LOCATIONS.find((l) => l.id === s.location);
  const wx = s.weather.today;
  const temp = wx.temp;
  const m = s.mods || {};
  const start = m.lateStart || 0;
  const openFrac = (DAY_MINUTES - start) / DAY_MINUTES;

  const traffic = expectedTraffic(s, s.location, wx.type) * (1 + adBoost) * openFrac * (0.88 + rnd() * 0.24);
  const n = Math.max(3, Math.round(traffic));
  const pStop = stopChance(s, wx.type);
  const wtp0 = baseWTP(s, wx.type);

  // Arrival times, weighted toward lunch and afternoon.
  const wsum = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  const people = [];
  for (let i = 0; i < n; i++) {
    let t;
    do {
      let r = rnd() * wsum, h = 0;
      while (r > HOUR_WEIGHTS[h]) { r -= HOUR_WEIGHTS[h]; h++; }
      t = (h + rnd()) * 60;
    } while (t < start);
    people.push({ t, look: Math.floor(rnd() * 1e9) });
  }
  people.sort((a, b) => a.t - b.t);

  // Stock we can use today.
  const lemons = s.inv.lemons.map((b) => ({ ...b })).sort((a, b) => b.age - a.age); // oldest first
  let lemonCount = lemons.reduce((a, b) => a + b.n, 0);
  let sugar = s.inv.sugar.n, cups = s.inv.cups.n, ice = s.inv.ice.n;
  const P = cupsPerPitcher(s);
  const R = s.recipe;
  let pitcherLeft = 0, pitchers = 0;
  const used = { lemons: 0, lemonsCost: 0, sugar: 0, cups: 0, ice: 0 };

  function takeLemons(k) {
    let need = k;
    for (const b of lemons) {
      const take = Math.min(b.n, need);
      b.n -= take; need -= take;
      used.lemonsCost += take * b.cost;
      if (!need) break;
    }
    lemonCount -= k;
    used.lemons += k;
  }

  const svc = serviceMinutes(s);
  const patienceMult = (s.upgrades.speaker ? 1.4 : 1) * (s.staff.manager ? 1.2 : 1);
  let serverFree = start;
  let soldOut = null, soldOutAt = null;

  // A random mishap now and then.
  let incident = null;
  if (rnd() < 0.05 && n > 10) {
    incident = { t: start + rnd() * (DAY_MINUTES - start) * 0.8, text: pick(['A dog knocked over your pitcher! 🐕', 'A bee landed in the pitcher! 🐝', 'Oops! The pitcher tipped over! 💦'], rnd), done: false };
  }

  const out = [];
  const tally = { served: 0, pricey: 0, line: 0, soldout: 0, passed: 0, perfect: 0, revenue: 0, tips: 0, satSum: 0, free: 0,
    sour: 0, sweet: 0, weak: 0, strong: 0, warm: 0, cold: 0, good: 0, lostCups: 0 };

  for (const p of people) {
    if (incident && !incident.done && p.t >= incident.t) {
      incident.done = true;
      tally.lostCups = pitcherLeft;
      pitcherLeft = 0;
      out.push({ t: incident.t, kind: 'incident', text: incident.text });
    }
    const c = { t: p.t, look: p.look, kind: 'pass' };
    out.push(c);
    if (rnd() >= pStop) { tally.passed++; continue; }

    const wtp = wtp0 * Math.exp(gauss(rnd) * 0.3);
    const free = m.samples && p.t < start + 60;
    c.wtp = wtp;
    if (!free && s.price > wtp) {
      c.kind = 'pricey'; c.say = pick(SAY.pricey, rnd); tally.pricey++;
      continue;
    }
    if (soldOut) {
      c.kind = 'soldout'; c.say = pick(SAY.soldout, rnd); tally.soldout++;
      continue;
    }
    const begin = Math.max(p.t, serverFree);
    const patience = (6 + rnd() * 10) * patienceMult;
    if (begin - p.t > patience) {
      c.kind = 'line'; c.say = pick(SAY.line, rnd); c.leave = p.t + patience; tally.line++;
      continue;
    }
    // Make a new pitcher when needed.
    if (pitcherLeft === 0) {
      if (lemonCount < R.lemons || sugar < R.sugar) {
        soldOut = lemonCount < R.lemons ? 'lemons' : 'sugar'; soldOutAt = begin;
        c.kind = 'soldout'; c.say = pick(SAY.soldout, rnd); tally.soldout++;
        continue;
      }
      takeLemons(R.lemons);
      sugar -= R.sugar; used.sugar += R.sugar;
      pitcherLeft = P; pitchers++;
    }
    if (cups < 1) {
      soldOut = 'cups'; soldOutAt = begin;
      c.kind = 'soldout'; c.say = pick(SAY.soldout, rnd); tally.soldout++;
      continue;
    }
    cups--; used.cups++;
    const iceNow = Math.min(R.ice, ice);
    ice -= iceNow; used.ice += iceNow;
    pitcherLeft--;

    const pref = { diff: (loc.sweet || 0) + gauss(rnd) * 0.6, strength: 8 + gauss(rnd) * 1.0, ice: (loc.iceLove || 0) + gauss(rnd) * 0.6 };
    const ts = tasteScore(R, iceNow, temp, pref);
    let sat = ts.score - Math.max(0, s.price / wtp - 0.75) * 40 + (s.staff.manager ? 8 : 0) + (free ? 10 : 0);
    sat = Math.max(0, Math.min(100, sat));
    const dur = svc * (0.7 + rnd() * 0.6);
    c.kind = 'buy'; c.start = begin; c.end = begin + dur; c.sat = sat; c.paid = free ? 0 : s.price;
    serverFree = c.end;
    tally.served++; tally.satSum += sat; tally.revenue += c.paid;
    if (free) tally.free++;

    // What do they say?
    if (ts.score >= 85) {
      tally.perfect++; c.say = pick(SAY.perfect, rnd); c.mood = 3;
    } else {
      const issues = [
        [Math.abs(ts.dDiff) * 13, ts.dDiff > 0 ? 'sour' : 'sweet'],
        [Math.abs(ts.dStr) * 6, ts.dStr > 0 ? 'strong' : 'weak'],
        [Math.abs(ts.dIce) * 8, ts.dIce > 0 ? 'cold' : 'warm'],
      ].sort((a, b) => b[0] - a[0]);
      if (ts.score >= 65) { c.mood = 2; tally.good++; c.say = rnd() < 0.6 ? pick(SAY.good, rnd) : pick(SAY[issues[0][1]], rnd); }
      else { c.mood = ts.score >= 45 ? 1 : 0; c.say = pick(SAY[issues[0][1]], rnd); }
      tally[issues[0][1]]++;
    }
    if (sat >= 85 && !free && rnd() < 0.22) {
      c.tip = Math.max(0.05, Math.round(s.price * (0.1 + rnd() * 0.25) * 20) / 20);
      tally.tips += c.tip;
      if (rnd() < 0.5) c.say = pick(SAY.tip, rnd);
    }
  }

  // Reputation change.
  let rep = 0;
  for (const c of out) if (c.kind === 'buy') rep += ((c.sat - 60) / 40) * 0.1;
  rep -= tally.line * 0.12 + tally.soldout * 0.06;
  if (rep > 0) rep = Math.min(rep, 3.5) * Math.max(0.12, 1.1 - s.rep / 100);
  if (s.difficulty === 'easy' && rep > 0) rep *= 1.25;
  if (s.difficulty === 'hard' && rep > 0) rep *= 0.8;
  rep = Math.max(-6, Math.min(6, rep));

  // Special things from events.
  const extras = {};
  const typical = typicalTaste(s, temp).score;
  if (m.contest) {
    const win = rnd() < (typical >= 82 ? 0.75 : typical >= 70 ? 0.4 : 0.1);
    extras.contest = { win, prize: win ? m.contest : 0, score: Math.round(typical) };
  }
  if (m.blogger) {
    const avg = tally.served ? tally.satSum / tally.served : 50;
    extras.blogger = { happy: avg >= 70, rep: avg >= 70 ? 8 : -4 };
  }
  if (m.insurance) {
    const rained = wx.type === 'rainy' || wx.type === 'storm';
    extras.insurance = { paid: rained ? m.insurance : 0 };
  }

  return {
    customers: out,
    tally,
    used,
    pitchers,
    soldOut,
    soldOutAt,
    repDelta: rep,
    extras,
    start,
    weather: wx,
    avgSat: tally.served ? tally.satSum / tally.served : 0,
    cupsLeftInPitcher: pitcherLeft,
  };
}
