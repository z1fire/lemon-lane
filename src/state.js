// Game state: new game, saving, the morning setup, shopping, banking and the end-of-day books.
import {
  START_CASH, SEASONS, SEASON_DAYS, WEATHER, WEATHER_ORDER, SUPPLIES, SUPPLY_ORDER, LOCATIONS, TIERS,
  UPGRADES, STAFF, ADS, BUSINESSES, BIZ_LEVEL_MULT, BIZ_LEVEL_COST, GOALS, RANKS, EVENTS, netWorth,
} from './data.js';
import { lemonLife, stars, cupsPerPitcher } from './sim.js';

const SAVE_KEY = 'lemonlane.save.v1';
export const SAVINGS_RATE = 0.03; // per week
export const LOAN_RATE = 0.05;    // per week

export const r2 = (x) => Math.round(x * 100) / 100;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));

export function newGame({ name = '', difficulty = 'easy' } = {}) {
  const s = {
    v: 1,
    name: name.trim().slice(0, 14),
    difficulty,
    day: 1,
    cash: START_CASH,
    savings: 0,
    loan: 0,
    rep: 20,
    inv: {
      lemons: [],
      sugar: { n: 0, cost: 0 },
      cups: { n: 0, cost: 0 },
      ice: { n: 0, cost: 0 },
    },
    recipe: { lemons: 4, sugar: 4, ice: 3 },
    price: 1.0,
    location: 'street',
    unlocked: ['street'],
    upgrades: {},
    tier: 0,
    staff: {},
    ad: 'none',
    biz: {},
    bizEarned: {},
    market: {},
    trend: { lemons: 0, sugar: 0, cups: 0, ice: 0 },
    weather: null,
    event: null,
    eventDone: false,
    mods: {},
    goalsDone: [],
    lessons: ['profit'],
    newLessons: [],
    stats: { cups: 0, customers: 0, revenue: 0, bestProfit: 0, bestCups: 0, bestPerfect: 0, perfect: 0, daysOpen: 0 },
    history: [],
    gambles: [],
    quizDay: 0,
    quizStreak: 0,
    helpDay: -99,
    won: false,
    tutorial: 0,
    settings: { sound: true, speed: 1 },
  };
  morning(s, true);
  return s;
}

export function save(s) {
  try {
    const json = JSON.stringify(s);
    localStorage.setItem(SAVE_KEY, json);
    localStorage.setItem(SAVE_KEY + '.bak', json);
  } catch (e) { /* storage full or blocked: keep playing */ }
}

export function load() {
  for (const key of [SAVE_KEY, SAVE_KEY + '.bak']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const s = JSON.parse(raw);
      if (s && s.v === 1 && s.inv) return s;
    } catch (e) { /* try the backup */ }
  }
  return null;
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '.bak'); } catch (e) { /* ignore */ }
}

// ───────── Calendar & weather ─────────
export const seasonOf = (day) => SEASONS[Math.floor((day - 1) / SEASON_DAYS) % 4];
export const dayOfWeek = (day) => (day - 1) % 7; // 0 = Mon
export const isWeekend = (day) => dayOfWeek(day) >= 5;

function rollWeather(s) {
  const season = seasonOf(s.day);
  const prev = s.weather && s.weather.today && s.weather.today.type;
  let type;
  if (prev && Math.random() < 0.4) {
    // Weather tends to stick around for a few days.
    const i = WEATHER_ORDER.indexOf(prev) + irand(-1, 1);
    type = WEATHER_ORDER[Math.max(0, Math.min(5, i))];
    if (!season.weights[type]) type = prev;
  } else {
    const entries = Object.entries(season.weights);
    let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
    for (const [k, w] of entries) { r -= w; if (r <= 0) { type = k; break; } }
    type = type || 'partly';
  }
  const [lo, hi] = WEATHER[type].temp;
  const temp = Math.round(rand(lo, hi) + season.temp);
  const today = { type, temp };

  // The forecast is usually right — but not always.
  const accuracy = s.difficulty === 'easy' ? 0.88 : 0.72;
  let fType = type;
  if (Math.random() > accuracy) {
    const i = WEATHER_ORDER.indexOf(type) + (Math.random() < 0.5 ? -1 : 1);
    fType = WEATHER_ORDER[Math.max(0, Math.min(5, i))];
    if (fType === type) fType = WEATHER_ORDER[WEATHER_ORDER.indexOf(type) === 0 ? 1 : WEATHER_ORDER.indexOf(type) - 1];
  }
  const rain = Math.max(0, Math.min(100, Math.round((WEATHER[fType].rain + irand(-8, 8)) / 5) * 5));
  const forecast = { type: fType, temp: temp + irand(-3, 3), rain };
  return { today, forecast };
}

// ───────── Market ─────────
function rollMarket(s) {
  const m = s.mods || {};
  for (const k of SUPPLY_ORDER) {
    s.trend[k] = Math.max(-1, Math.min(1, s.trend[k] * 0.7 + rand(-0.45, 0.45)));
    let p = SUPPLIES[k].base * (1 + SUPPLIES[k].swing * s.trend[k]);
    if (m[k]) p *= m[k];
    if (k === 'lemons' && s.biz.orchard) p *= 0.6;
    s.market[k] = Math.max(0.004, p);
  }
}

export function packPrice(s, item, i) {
  const pack = SUPPLIES[item].packs[i];
  return r2(Math.max(0.01, s.market[item] * pack.n * (1 - pack.off)));
}

// ───────── Morning ─────────
export function morning(s, first = false) {
  s.prevMarket = { ...s.market };
  s.mods = {};
  s.event = null;
  s.eventDone = false;
  s.ad = 'none';
  s.weather = rollWeather(s);
  if (!first && s.day > 2 && Math.random() < 0.45) {
    const recent = s.recentEvents || [];
    const options = EVENTS.filter((e) => !recent.includes(e.id) && (!e.when || e.when(s)));
    if (options.length) {
      const e = options[Math.floor(Math.random() * options.length)];
      s.event = e.id;
      s.recentEvents = [e.id, ...recent].slice(0, 6);
      if (e.mods) Object.assign(s.mods, JSON.parse(JSON.stringify(e.mods)));
      if (!e.choices) s.eventDone = true;
    }
  }
  if (first) s.market = {};
  rollMarket(s);
  if (first) s.prevMarket = { ...s.market };
}

export const currentEvent = (s) => (s.event ? EVENTS.find((e) => e.id === s.event) : null);

// Apply a choice from a decision event. Returns a message to show.
export function chooseEvent(s, idx) {
  const e = currentEvent(s);
  if (!e || s.eventDone || !e.choices) return null;
  const c = e.choices[idx];
  if (!c) return null;
  if (c.cost > 0 && s.cash < c.cost) return { error: `You need $${c.cost.toFixed(2)} for that.` };
  s.eventDone = true;
  s.eventChoice = idx;
  s.eventMoney = -(c.cost || 0);
  if (c.cost) s.cash = r2(s.cash - c.cost);
  const fx = c.effect || {};
  if (fx.lemons) s.inv.lemons.push({ n: fx.lemons, age: fx.age ? lemonLife(s) - 1 : 0, cost: c.cost / fx.lemons });
  if (fx.sugar) addStock(s.inv.sugar, fx.sugar, c.cost);
  if (fx.cups) addStock(s.inv.cups, fx.cups, c.cost);
  if (fx.rep) s.rep = Math.min(100, s.rep + fx.rep);
  if (fx.lateStart) s.mods.lateStart = fx.lateStart;
  if (fx.insurance) s.mods.insurance = fx.insurance;
  if (fx.contest) s.mods.contest = fx.contest;
  if (fx.samples) s.mods.samples = true;
  if (fx.gamble) s.gambles.push({ ...fx.gamble, due: s.day + fx.gamble.days, cost: c.cost });
  if (c.lesson) learn(s, c.lesson);
  return { msg: c.say || (c.cost ? 'Done!' : 'Okay!') };
}

// ───────── Inventory ─────────
function addStock(stock, n, cost) {
  const total = stock.n * stock.cost + cost;
  stock.n += n;
  stock.cost = stock.n ? total / stock.n : 0;
}
export const lemonsHave = (s) => s.inv.lemons.reduce((a, b) => a + b.n, 0);
export function have(s, item) {
  return item === 'lemons' ? lemonsHave(s) : s.inv[item].n;
}
function unitCost(s, item) {
  if (item === 'lemons') {
    const n = lemonsHave(s);
    return n ? s.inv.lemons.reduce((a, b) => a + b.n * b.cost, 0) / n : s.market.lemons;
  }
  return s.inv[item].n ? s.inv[item].cost : s.market[item];
}

export function buy(s, item, i) {
  const price = packPrice(s, item, i);
  if (s.cash < price) return false;
  const n = SUPPLIES[item].packs[i].n;
  s.cash = r2(s.cash - price);
  if (item === 'lemons') {
    const fresh = s.inv.lemons.find((b) => b.age === 0);
    if (fresh) { fresh.cost = (fresh.cost * fresh.n + price) / (fresh.n + n); fresh.n += n; }
    else s.inv.lemons.push({ n, age: 0, cost: price / n });
  } else addStock(s.inv[item], n, price);
  s.boughtToday = r2((s.boughtToday || 0) + price);
  if (i === 2) learn(s, 'bulk');
  return true;
}

// What you need to make `cups` cups with the current recipe.
export function needFor(s, cups) {
  const P = cupsPerPitcher(s);
  const pitchers = Math.ceil(cups / P);
  return { lemons: pitchers * s.recipe.lemons, sugar: pitchers * s.recipe.sugar, cups, ice: cups * s.recipe.ice };
}

// Buy the cheapest mix of packs to reach enough stock for `cups` cups. Returns money spent.
export function buyFor(s, cups) {
  const need = needFor(s, cups);
  let spent = 0;
  for (const item of SUPPLY_ORDER) {
    let short = need[item] - have(s, item);
    let guard = 0;
    while (short > 0 && guard++ < 40) {
      const packs = SUPPLIES[item].packs;
      // Biggest pack that isn't more than ~1.6× what we still need, else the smallest.
      let pi = 0;
      for (let i = packs.length - 1; i >= 0; i--) if (packs[i].n <= short * 1.6 || i === 0) { pi = i; break; }
      const price = packPrice(s, item, pi);
      if (!buy(s, item, pi)) return { spent, short: item };
      spent += price;
      short -= packs[pi].n;
    }
  }
  return { spent: r2(spent) };
}

// How many cups can we make right now, and what runs out first.
export function cupsPossible(s) {
  const P = cupsPerPitcher(s);
  const R = s.recipe;
  const lim = {
    lemons: Math.floor(lemonsHave(s) / R.lemons) * P,
    sugar: R.sugar ? Math.floor(s.inv.sugar.n / R.sugar) * P : Infinity,
    cups: s.inv.cups.n,
    ice: R.ice ? Math.floor(s.inv.ice.n / R.ice) : Infinity,
  };
  let min = Infinity, by = null;
  for (const k of SUPPLY_ORDER) if (lim[k] < min) { min = lim[k]; by = k; }
  return { n: min, by, lim };
}

export function costPerCup(s) {
  const P = cupsPerPitcher(s);
  const R = s.recipe;
  return (R.lemons * unitCost(s, 'lemons') + R.sugar * unitCost(s, 'sugar')) / P + unitCost(s, 'cups') + R.ice * unitCost(s, 'ice');
}

// ───────── Costs of opening ─────────
export function openingCosts(s) {
  const loc = LOCATIONS.find((l) => l.id === s.location);
  const ad = ADS.find((a) => a.id === s.ad);
  const wages = STAFF.reduce((a, st) => a + (s.staff[st.id] ? st.wage : 0), 0);
  return { rent: loc.rent, ad: ad.cost, wages, total: loc.rent + ad.cost + wages };
}

// ───────── Upgrades, locations, businesses ─────────
export function canUnlock(s, loc) {
  if (s.unlocked.includes(loc.id)) return { ok: false, have: true };
  if (s.rep < loc.rep) return { ok: false, why: `Needs ${(loc.rep / 20).toFixed(1)} ⭐` };
  if (loc.tier && s.tier < loc.tier) return { ok: false, why: `Needs a ${TIERS[loc.tier].name}` };
  if (s.cash < loc.permit) return { ok: false, why: 'Not enough cash', afford: false };
  return { ok: true };
}
export function unlockLocation(s, id) {
  const loc = LOCATIONS.find((l) => l.id === id);
  if (!canUnlock(s, loc).ok) return false;
  s.cash = r2(s.cash - loc.permit);
  s.unlocked.push(id);
  s.location = id;
  learn(s, 'location');
  return true;
}

export function buyUpgrade(s, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || s.upgrades[id] || s.cash < u.cost || (u.needs && !s.upgrades[u.needs])) return false;
  s.cash = r2(s.cash - u.cost);
  s.upgrades[id] = true;
  learn(s, 'invest');
  return true;
}

export function buyTier(s) {
  const next = TIERS[s.tier + 1];
  if (!next || s.cash < next.cost) return false;
  s.cash = r2(s.cash - next.cost);
  s.tier++;
  learn(s, 'invest');
  return true;
}

export function setStaff(s, id, on) {
  const st = STAFF.find((x) => x.id === id);
  if (on && st.rep && s.rep < st.rep) return false;
  s.staff[id] = !!on;
  if (on) learn(s, 'fixed');
  return true;
}

export function bizNextCost(s, b) {
  const lvl = s.biz[b.id] || 0;
  if (lvl >= 3) return null;
  return Math.round(b.cost * BIZ_LEVEL_COST[lvl + 1]);
}
export function buyBiz(s, id) {
  const b = BUSINESSES.find((x) => x.id === id);
  const cost = bizNextCost(s, b);
  if (cost == null || s.cash < cost || !bizUnlocked(s, b)) return false;
  s.cash = r2(s.cash - cost);
  s.biz[id] = (s.biz[id] || 0) + 1;
  learn(s, 'business');
  if (id === 'orchard') s.market.lemons *= 0.6;
  return true;
}
// Businesses unlock one at a time: you must own the one before it.
export function bizUnlocked(s, b) {
  const i = BUSINESSES.indexOf(b);
  return i === 0 || (s.biz[BUSINESSES[i - 1].id] || 0) > 0;
}
export function bizIncomeRange(b, lvl) {
  const k = BIZ_LEVEL_MULT[Math.max(1, lvl)];
  return [Math.round(b.income[0] * k), Math.round(b.income[1] * k)];
}

const WEATHER_SCORE = { heat: 0.55, sunny: 0.3, partly: 0, cloudy: -0.2, rainy: -0.45, storm: -0.6 };
function bizIncome(s, b, wType) {
  const lvl = s.biz[b.id] || 0;
  if (!lvl) return 0;
  const f = Math.max(0.15, Math.min(2.2, 1 + b.sens * WEATHER_SCORE[wType]));
  const [lo, hi] = b.income;
  return r2(rand(lo, hi) * f * BIZ_LEVEL_MULT[lvl]);
}

// ───────── Bank ─────────
export const loanLimit = (s) => Math.round(100 + Math.max(0, netWorth(s) + s.loan) * 0.5);
export function deposit(s, amt) {
  amt = r2(Math.min(amt, s.cash));
  if (amt <= 0) return false;
  s.cash = r2(s.cash - amt); s.savings = r2(s.savings + amt);
  learn(s, 'saving');
  return true;
}
export function withdraw(s, amt) {
  amt = r2(Math.min(amt, s.savings));
  if (amt <= 0) return false;
  s.cash = r2(s.cash + amt); s.savings = r2(s.savings - amt);
  return true;
}
export function borrow(s, amt) {
  amt = r2(Math.min(amt, loanLimit(s) - s.loan));
  if (amt <= 0) return false;
  s.cash = r2(s.cash + amt); s.loan = r2(s.loan + amt);
  learn(s, 'loan');
  return true;
}
export function repay(s, amt) {
  amt = r2(Math.min(amt, s.cash, s.loan));
  if (amt <= 0) return false;
  s.cash = r2(s.cash - amt); s.loan = r2(s.loan - amt);
  return true;
}

// ───────── Lessons, goals, ranks ─────────
export function learn(s, id) {
  if (!s.lessons.includes(id)) { s.lessons.push(id); s.newLessons.push(id); }
}

export function activeGoals(s) {
  return GOALS.filter((g) => !s.goalsDone.includes(g.id)).slice(0, 3);
}
export function checkGoals(s) {
  const done = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of activeGoals(s)) {
      const [cur, target] = g.check(s);
      if (cur >= target) {
        s.goalsDone.push(g.id);
        s.cash = r2(s.cash + g.reward);
        if (g.lesson) learn(s, g.lesson);
        done.push(g);
        changed = true;
      }
    }
  }
  return done;
}
export function rankOf(s) {
  let r = RANKS[0], i = 0;
  RANKS.forEach((x, k) => { if (s.goalsDone.length >= x.at) { r = x; i = k; } });
  return { ...r, index: i, next: RANKS[i + 1] };
}

// ───────── End of day ─────────
// Called after the day is simulated (or with result = null when the stand stayed closed).
export function endDay(s, result, costs) {
  const rep = { day: s.day, open: !!result, weather: s.weather.today, location: s.location, costs };
  const loc = LOCATIONS.find((l) => l.id === s.location);

  if (result) {
    const t = result.tally;
    // Take used supplies out of stock (lemons oldest first).
    let need = result.used.lemons;
    s.inv.lemons.sort((a, b) => b.age - a.age);
    for (const b of s.inv.lemons) { const k = Math.min(b.n, need); b.n -= k; need -= k; }
    const sugarCost = result.used.sugar * s.inv.sugar.cost;
    const cupsCost = result.used.cups * s.inv.cups.cost;
    const iceCost = result.used.ice * s.inv.ice.cost;
    s.inv.sugar.n -= result.used.sugar;
    s.inv.cups.n -= result.used.cups;
    s.inv.ice.n -= result.used.ice;
    rep.cogs = r2(result.used.lemonsCost + sugarCost + cupsCost + iceCost);
    rep.revenue = r2(t.revenue);
    rep.tips = r2(t.tips);
    rep.tally = t;
    rep.used = result.used;
    rep.pitchers = result.pitchers;
    rep.soldOut = result.soldOut;
    rep.soldOutAt = result.soldOutAt;
    rep.avgSat = result.avgSat;
    s.cash = r2(s.cash + t.revenue + t.tips);

    let repDelta = result.repDelta;
    if (result.extras.blogger) { repDelta += result.extras.blogger.rep; rep.blogger = result.extras.blogger; }
    if (result.extras.contest) { rep.contest = result.extras.contest; s.cash = r2(s.cash + result.extras.contest.prize); }
    rep.repBefore = s.rep;
    s.rep = Math.max(0, Math.min(100, s.rep + repDelta));
    rep.repAfter = s.rep;

    s.stats.cups += t.served;
    s.stats.customers += t.served + t.pricey + t.line + t.soldout;
    s.stats.revenue += t.revenue + t.tips;
    s.stats.perfect += t.perfect;
    s.stats.bestCups = Math.max(s.stats.bestCups, t.served);
    s.stats.bestPerfect = Math.max(s.stats.bestPerfect, t.perfect);
    s.stats.daysOpen++;
  } else {
    rep.cogs = 0; rep.revenue = 0; rep.tips = 0;
    rep.repBefore = s.rep;
    s.rep = Math.max(0, s.rep - 0.5);
    rep.repAfter = s.rep;
  }
  if (result && result.extras.insurance) { rep.insurance = result.extras.insurance; s.cash = r2(s.cash + rep.insurance.paid); }

  // Spoiled lemons.
  const life = lemonLife(s);
  let spoiled = 0, spoiledCost = 0;
  for (const b of s.inv.lemons) {
    b.age++;
    if (b.age >= life && b.n > 0) { spoiled += b.n; spoiledCost += b.n * b.cost; b.n = 0; }
  }
  s.inv.lemons = s.inv.lemons.filter((b) => b.n > 0);
  rep.spoiled = spoiled; rep.spoiledCost = r2(spoiledCost);

  // Melted ice.
  const keep = s.upgrades.freezer ? 1 : s.upgrades.cooler ? 0.5 : 0;
  const melted = Math.ceil(s.inv.ice.n * (1 - keep));
  rep.melted = melted; rep.meltedCost = r2(melted * s.inv.ice.cost);
  s.inv.ice.n -= melted;
  if (!s.inv.ice.n) s.inv.ice.cost = 0;
  if (spoiled || melted) learn(s, 'waste');

  // Businesses.
  rep.biz = [];
  for (const b of BUSINESSES) {
    if (!s.biz[b.id]) continue;
    const inc = bizIncome(s, b, s.weather.today.type);
    rep.biz.push({ id: b.id, name: b.name, icon: b.icon, amount: inc });
    s.bizEarned[b.id] = r2((s.bizEarned[b.id] || 0) + inc);
    s.cash = r2(s.cash + inc);
  }
  rep.bizTotal = r2(rep.biz.reduce((a, b) => a + b.amount, 0));

  // Friends paying back (or not).
  rep.gambles = [];
  s.gambles = s.gambles.filter((g) => {
    if (g.due > s.day) return true;
    const won = Math.random() < g.chance;
    if (won) s.cash = r2(s.cash + g.pay);
    rep.gambles.push({ won, pay: g.pay, cost: g.cost });
    return false;
  });

  // Weekly interest on Sundays.
  if (dayOfWeek(s.day) === 6) {
    rep.interest = r2(s.savings * SAVINGS_RATE);
    s.savings = r2(s.savings + rep.interest);
    rep.loanInterest = r2(s.loan * LOAN_RATE);
    s.loan = r2(s.loan + rep.loanInterest);
  }

  // Event money (donations, dog-walking…) counts as other income/costs.
  rep.other = r2(s.eventMoney || 0);
  s.eventMoney = 0;

  const standProfit = r2(rep.revenue + rep.tips - rep.cogs - (costs ? costs.total : 0));
  rep.standProfit = standProfit;
  rep.profit = r2(standProfit + rep.bizTotal + rep.other + (rep.insurance ? rep.insurance.paid : 0) + (rep.contest ? rep.contest.prize : 0) + (rep.interest || 0) - (rep.loanInterest || 0) - rep.spoiledCost - rep.meltedCost);
  s.stats.bestProfit = Math.max(s.stats.bestProfit, rep.profit);
  s.history.push({ day: s.day, profit: rep.profit, cups: rep.tally ? rep.tally.served : 0, w: s.weather.today.type, open: rep.open });
  if (s.history.length > 60) s.history.shift();

  rep.goals = checkGoals(s);
  rep.networth = r2(netWorth(s));
  if (!s.won && s.goalsDone.includes('tycoon')) { s.won = true; rep.won = true; }

  s.boughtToday = 0;
  s.day++;
  morning(s);
  rep.newLessons = s.newLessons.splice(0);
  return rep;
}

// A little help if you go completely broke.
export function needsHelp(s) {
  const nothing = s.cash < 2 && s.savings < 1 && lemonsHave(s) < s.recipe.lemons && !Object.keys(s.biz).length;
  return nothing && s.day - s.helpDay > 7;
}

export { stars };
