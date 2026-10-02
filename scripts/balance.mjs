// Headless balance check: a reasonable bot plays many games; prints when milestones happen.
// Usage: node scripts/balance.mjs [games] [days] [easy|normal|hard]
import { LOCATIONS, TIERS, UPGRADES, BUSINESSES, STAFF, ADS, GOALS, netWorth } from '../src/data.js';
import * as G from '../src/state.js';
import { simulateDay, iceIdeal, baseWTP, expectedTraffic, stopChance, serviceMinutes } from '../src/sim.js';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const GAMES = +process.argv[2] || 20, DAYS = +process.argv[3] || 300, DIFF = process.argv[4] || 'easy';

function plan(s) {
  const f = s.weather.forecast;
  if (s.event && !s.eventDone) G.chooseEvent(s, 1);
  // Business & upgrades (keep a cushion).
  for (const b of BUSINESSES) {
    const c = G.bizNextCost(s, b);
    if (c != null && G.bizUnlocked(s, b) && s.cash > c * 1.6 + 30) G.buyBiz(s, b.id);
  }
  const next = TIERS[s.tier + 1];
  if (next && s.cash > next.cost * 1.5 + 20) G.buyTier(s);
  for (const u of UPGRADES) if (s.cash > u.cost * 2 + 20) G.buyUpgrade(s, u.id);
  for (const l of LOCATIONS) if (G.canUnlock(s, l).ok && s.cash > l.permit * 2 + 20) G.unlockLocation(s, l.id);
  // Pick location with best rough expected profit.
  let best = null;
  for (const id of s.unlocked) {
    const loc = LOCATIONS.find((l) => l.id === id);
    const cust = expectedTraffic(s, id, f.type) * stopChance(s, f.type, id);
    const cap = 480 / serviceMinutes(s);
    const price = baseWTP(s, f.type, id) * 0.85;
    const val = Math.min(cust * 0.6, cap) * (price - 0.2) - loc.rent;
    if (!best || val > best.val) best = { id, val, price, cust };
  }
  s.location = best.id;
  const loc = LOCATIONS.find((l) => l.id === s.location);
  s.recipe.lemons = Math.round(4 + (loc.sweet || 0) / 2);
  s.recipe.sugar = Math.round(4 - (loc.sweet || 0) / 2);
  s.recipe.ice = Math.round(iceIdeal(f.temp) + (loc.iceLove || 0));
  s.price = Math.round(best.price * 20) / 20;
  // Staff when lines get long.
  const cap = 480 / serviceMinutes(s);
  if (best.cust * 0.65 > cap * 0.8) {
    for (const st of STAFF) if (!s.staff[st.id] && s.cash > st.wage * 10 && G.setStaff(s, st.id, true)) break;
  }
  s.ad = s.cash > 400 && f.rain < 30 ? 'paper' : s.cash > 60 && f.rain < 30 ? 'flyers' : 'none';
  const costs = G.openingCosts(s);
  const want = Math.ceil(Math.min(best.cust * 0.7, cap) * 1.1) + 4;
  G.buyFor(s, want);
  if (s.cash < costs.total) { s.ad = 'none'; }
  const c2 = G.openingCosts(s);
  if (s.cash < c2.total) { s.location = 'street'; s.staff = {}; }
  // Save a bit.
  if (s.cash > 300 && s.savings < 100) G.deposit(s, 50);
}

const results = [];
for (let g = 0; g < GAMES; g++) {
  const s = G.newGame({ difficulty: DIFF });
  const when = {};
  for (let d = 0; d < DAYS; d++) {
    plan(s);
    const costs = G.openingCosts(s);
    let r = null;
    if (s.cash >= costs.total) {
      s.cash = G.r2(s.cash - costs.total);
      r = simulateDay(s, ADS.find((a) => a.id === s.ad).boost);
    }
    const rep = G.endDay(s, r, r ? costs : null);
    for (const goal of rep.goals) when[goal.id] = s.day - 1;
    if (g === 0 && (d < 12 || d % 25 === 0))
      console.log(`d${rep.day} ${rep.location} ${rep.weather.type} cust=${rep.tally ? rep.tally.served : 0} pricey=${rep.tally?.pricey} line=${rep.tally?.line} so=${rep.tally?.soldout} price=${s.price} profit=${rep.profit} cash=${s.cash} rep=${s.rep.toFixed(1)} nw=${Math.round(netWorth(s))} tier=${s.tier}`);
  }
  results.push({ when, nw: netWorth(s) });
}
console.log('\nGoal → median day reached (reached / games)');
for (const goal of GOALS) {
  const days = results.map((r) => r.when[goal.id]).filter((x) => x != null).sort((a, b) => a - b);
  console.log(`${goal.id.padEnd(10)} ${days.length ? String(days[Math.floor(days.length / 2)]).padStart(4) : '   -'}  (${days.length}/${GAMES})`);
}
console.log('median final net worth', Math.round(results.map((r) => r.nw).sort((a, b) => a - b)[Math.floor(GAMES / 2)]));
