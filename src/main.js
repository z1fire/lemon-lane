import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

import {
  DAYS, WEATHER, SUPPLIES, SUPPLY_ORDER, LOCATIONS, TIERS, UPGRADES, STAFF, ADS, BUSINESSES, BIZ_LEVEL_MULT,
  GOALS, RANKS, LESSONS, RECIPE_LIMITS, PRICE_LIMITS, bizValue, netWorth, WIN_NET_WORTH,
} from './data.js';
import * as G from './state.js';
import { simulateDay, stars, typicalTaste, iceIdeal, baseWTP, expectedTraffic, stopChance, serviceMinutes, cupsPerPitcher, lemonLife } from './sim.js';
import { DayScene, drawPreview } from './scene.js';
import { sfx, setSound } from './audio.js';
import { makeQuestion } from './quiz.js';

const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

let s = null;
let tab = 'stand';
let scene = null;
const $ = (sel) => document.querySelector(sel);

// ───────── Formatting ─────────
function money(x, cents) {
  const neg = x < 0 ? '−' : '';
  const a = Math.abs(x);
  if (!cents && a >= 1000) return `${neg}$${Math.round(a).toLocaleString('en-US')}`;
  return `${neg}$${a.toFixed(2)}`;
}
const signed = (x) => (x >= 0 ? '+' : '') + money(x);
const cents = (x) => (x < 0.995 ? `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}¢` : money(x));
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const standName = () => (s.name ? `${esc(s.name)}'s Lemonade` : 'Your Lemonade Stand');
function starsHtml(rep) {
  const n = stars(rep);
  let out = '';
  for (let i = 1; i <= 5; i++) out += n >= i - 0.25 ? '★' : n >= i - 0.75 ? '<span style="opacity:.55">★</span>' : '<span class="off">★</span>';
  return `<span class="stars">${out}</span>`;
}
function bars(n, max = 5) {
  let h = '<span class="bars">';
  for (let i = 0; i < max; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`;
  return h + '</span>';
}

// ───────── Toasts, confetti, modals ─────────
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function confetti(n = 70) {
  const cols = ['#ffd23f', '#1fb766', '#3a9bff', '#ea4d4b', '#8a5cf6', '#ff9f43'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = cols[i % cols.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}

const modalStack = [];
function modal(html, { wide = false, closable = true, onClose = null } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${closable ? '<button class="close" data-a="closeModal" aria-label="Close">✕</button>' : ''}${html}</div>`;
  $('#modals').appendChild(wrap);
  const m = { wrap, closable, onClose };
  modalStack.push(m);
  if (closable) wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
  return wrap.querySelector('.modal');
}
function closeModal() {
  const m = modalStack.pop();
  if (!m) return;
  m.wrap.remove();
  if (m.onClose) m.onClose();
}
function closeAllModals() { while (modalStack.length) { const m = modalStack.pop(); m.wrap.remove(); } }

function commit() {
  G.save(s);
  render();
}

// ───────── HUD & tabs ─────────
function renderHud() {
  const season = G.seasonOf(s.day);
  const rank = G.rankOf(s);
  $('#hud').innerHTML = `
    <div class="hud-day">
      <div class="d1">Day ${s.day} <span style="font-weight:500">· ${DAYS[G.dayOfWeek(s.day)]}</span></div>
      <div class="d2">${season.icon} ${season.name} · ${rank.icon} ${rank.name}</div>
    </div>
    <div class="pill" title="Reputation">${starsHtml(s.rep)}</div>
    <div class="pill cash" id="cashPill">💵 ${money(s.cash)}</div>
    <button class="icon-btn" data-a="settings" aria-label="Settings">⚙️</button>`;
}

function renderTabs() {
  const goalsReady = s.newLessons.length || (s.quizDay !== s.day ? 1 : 0);
  const items = [
    ['stand', '🍋', 'Stand'],
    ['shop', '🛒', 'Shop'],
    ['upgrades', '🔨', 'Upgrades'],
    ['money', '🏦', 'Money'],
    ['goals', '🎯', 'Goals', goalsReady],
  ];
  $('#tabs').innerHTML = items.map(([id, ic, name, dot]) =>
    `<button class="${tab === id ? 'on' : ''}" data-a="tab" data-t="${id}"><span class="ti">${ic}</span>${name}${dot ? '<span class="dot">!</span>' : ''}</button>`).join('');
}

function render() {
  renderHud();
  renderTabs();
  const main = $('#main');
  const html = { stand: standTab, shop: shopTab, upgrades: upgradesTab, money: moneyTab, goals: goalsTab }[tab]();
  main.innerHTML = `<div class="page">${html}</div>`;
  if (tab === 'stand') paintPreview();
  if (tab === 'goals') paintChart();
}

function paintPreview() {
  const c = $('#preview');
  if (c) drawPreview(c, s, s.weather.forecast.type);
}

// ───────── Zest's advice ─────────
function expectedCustomers() {
  const f = s.weather.forecast;
  const people = expectedTraffic(s, s.location, f.type) * stopChance(s, f.type);
  const wtp = baseWTP(s, f.type);
  // share of people whose willingness-to-pay is above your price (log-normal)
  const z = Math.log(s.price / wtp) / 0.3;
  const share = 1 - 0.5 * (1 + erf(z / Math.SQRT2));
  const ad = ADS.find((a) => a.id === s.ad).boost;
  const n = people * share * (1 + ad) * ((480 - (s.mods.lateStart || 0)) / 480);
  const cap = (480 - (s.mods.lateStart || 0)) / serviceMinutes(s);
  return { n: Math.round(n), cap: Math.round(cap), share, wtp };
}
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function zestHint() {
  const can = G.cupsPossible(s);
  const f = s.weather.forecast;
  const exp = expectedCustomers();
  const low = Math.max(0, Math.round(exp.n * 0.75)), high = Math.round(exp.n * 1.25) + 1;
  const missing = SUPPLY_ORDER.filter((k) => G.have(s, k) === 0 && (k !== 'sugar' || s.recipe.sugar) && (k !== 'ice' || s.recipe.ice));
  if (s.day === 1 && can.n === 0) {
    return { text: `Hi, I'm <b>Zest</b>! 🍋 To make lemonade you need <b>lemons, sugar, cups and ice</b>. Let's go shopping! Tip: use <b>Quick Buy</b> to get everything at once.`, act: ['tab', 'shop', '🛒 Go to the Shop'] };
  }
  if (missing.length) {
    return { text: `Uh oh, you have no <b>${missing.map((k) => SUPPLIES[k].name.toLowerCase()).join(' or ')}</b>! You can't make lemonade without ${missing.length > 1 ? 'them' : 'it'}.`, act: ['tab', 'shop', '🛒 Go to the Shop'] };
  }
  if (can.n < low) {
    return { text: `I think <b>${low}–${high}</b> people will buy today, but you only have enough for <b>${can.n}</b> cups. You'll run out of <b>${SUPPLIES[can.by].name.toLowerCase()}</b> first!`, act: ['tab', 'shop', '🛒 Buy more'] };
  }
  if (s.day <= 2) {
    return { text: `Looking good! Check your <b>recipe</b> and <b>price</b> below, then press <b>OPEN</b>. I guess about <b>${low}–${high}</b> customers today.` };
  }
  if (exp.share < 0.35) return { text: `Hmm, <b>${money(s.price)}</b> is a lot for ${LOCATIONS.find((l) => l.id === s.location).name} today. Most people will say "too pricey!" Try a lower price.` };
  if (exp.share > 0.95 && s.price < exp.wtp * 0.6) return { text: `Everyone will buy at <b>${money(s.price)}</b> — maybe too cheap! You could charge more and still sell lots.` };
  if (exp.n > exp.cap * 0.9) return { text: `So many customers! The line might get too long. A <b>helper</b> or <b>cash box</b> would let you serve people faster.`, act: ['tab', 'upgrades', '🔨 Upgrades'] };
  if (f.type === 'heat') return { text: `It's going to be <b>HOT</b>! Thirsty people pay more and want lots of ice. 🧊` };
  if (f.type === 'storm') return { text: `A storm is coming. Very few people will be out. You could <b>stay closed</b> today to save rent and ice.` };
  if (f.rain >= 60) return { text: `Rain is likely (${f.rain}%). Fewer customers — don't buy too much ice! It melts tonight.` };
  if (can.n > high * 2.5 && s.inv.ice.n > high * s.recipe.ice * 2) return { text: `You have lots of ice! Remember, <b>ice melts</b> at the end of the day unless you have a cooler.` };
  const tips = [
    `I guess about <b>${low}–${high}</b> customers today. You can make <b>${can.n}</b> cups.`,
    `Listen to what customers say! If they say "too sour", add sugar. If they say "too pricey", lower your price.`,
    `Happy customers raise your ⭐ stars. More stars = more customers!`,
    `Try the <b>Money Quiz</b> in Goals for a daily bonus! 🧠`,
    `Businesses earn money even while you sleep. Check the <b>Money</b> tab!`,
  ];
  return { text: tips[s.day % tips.length] };
}

// ───────── Stand tab ─────────
function standTab() {
  const loc = LOCATIONS.find((l) => l.id === s.location);
  const f = s.weather.forecast;
  const W = WEATHER[f.type];
  const season = G.seasonOf(s.day);
  const hint = zestHint();
  const ev = G.currentEvent(s);
  const costs = G.openingCosts(s);
  const can = G.cupsPossible(s);
  const exp = expectedCustomers();
  const canOpen = s.cash >= costs.total && can.n > 0 && (s.eventDone || !ev);
  const cpc = G.costPerCup(s);
  const profitCup = s.price - cpc;
  const taste = typicalTaste(s, f.temp);
  const tasteStars = Math.max(1, Math.min(5, Math.round(taste.score / 20)));
  const P = cupsPerPitcher(s);

  let tasteTip = 'Tastes great! 😋';
  if (taste.score < 85) {
    const issues = [
      [Math.abs(taste.dDiff) * 13, taste.dDiff > 0 ? 'A bit sour — try more sugar or fewer lemons.' : 'A bit sweet — try more lemons or less sugar.'],
      [Math.abs(taste.dStr) * 6, taste.dStr > 0 ? 'Very strong — people may want it lighter.' : 'A little watery — add lemons and sugar.'],
      [Math.abs(taste.dIce) * 8, taste.dIce > 0 ? `Lots of ice for ${f.temp}°F — try less.` : `Needs more ice for a ${f.temp}°F day!`],
    ].sort((a, b) => b[0] - a[0]);
    tasteTip = issues[0][1];
  }
  const ratio = s.price / exp.wtp;
  const priceSay = ratio < 0.55 ? ['Super cheap! Everyone buys, but you earn little.', 'warn']
    : ratio < 0.85 ? ['Good deal! Most people will buy. 👍', 'good']
    : ratio < 1.05 ? ['Fair price. Many will buy.', 'good']
    : ratio < 1.3 ? ['Pricey — lots of people will walk away.', 'warn']
    : ['Way too expensive for today! 😬', 'bad'];

  const newsHtml = ev ? `
    <div class="card news">
      <div class="row"><span style="font-size:34px">${ev.icon}</span><div><div class="title">📰 ${ev.title}</div><div class="small">${ev.text}</div></div></div>
      ${ev.choices && !s.eventDone ? `<div class="choices">${ev.choices.map((c, i) => `<button class="btn ${i === 0 ? 'green' : 'ghost'}" data-a="choose" data-i="${i}">${c.label}</button>`).join('')}</div>` : ''}
      ${ev.choices && s.eventDone ? `<div class="chip good" style="display:inline-block;margin-top:8px">✓ You chose: ${ev.choices[s.eventChoice || 0].label}</div>` : ''}
    </div>` : '';

  const locCards = LOCATIONS.map((l) => {
    const have = s.unlocked.includes(l.id);
    const u = G.canUnlock(s, l);
    const traffic = Math.round(expectedTraffic(s, l.id, f.type) * stopChance(s, f.type, l.id));
    const busy = Math.max(1, Math.min(5, Math.round(Math.log2(l.traffic / 40) + 0.5)));
    return `<button class="loc ${s.location === l.id ? 'on' : ''} ${have ? '' : 'locked'}" data-a="loc" data-id="${l.id}">
      ${have ? '' : '<span class="lock">🔒</span>'}
      <div class="li">${l.icon}</div>
      <div class="ln">${l.name}</div>
      <div class="lx">Crowd ${bars(busy)}<br>
      ${have ? `Rent: <b>${l.rent ? money(l.rent) + '/day' : 'FREE'}</b><br>~${traffic} thirsty people` :
        u.why ? `🔒 ${u.why}<br>Permit: ${money(l.permit)}` : `Permit: <b>${money(l.permit)}</b><br>Tap to unlock!`}</div>
    </button>`;
  }).join('');

  const adHtml = ADS.map((a) => {
    const locked = a.rep && s.rep < a.rep;
    return `<button class="ad ${s.ad === a.id ? 'on' : ''}" data-a="ad" data-id="${a.id}" ${locked ? 'disabled' : ''}>
      <div class="ai">${a.icon}</div><div class="an">${a.name}</div>
      <div class="ac">${locked ? `🔒 ${(a.rep / 20).toFixed(1)}⭐` : a.cost ? `${money(a.cost)} · +${Math.round(a.boost * 100)}%` : 'Free'}</div></button>`;
  }).join('');

  const stepper = (k, icon, name, help) => {
    const [lo, hi] = RECIPE_LIMITS[k];
    const v = s.recipe[k];
    return `<div class="stepper">
      <div class="lbl"><div class="n">${icon} ${name}</div><div class="h">${help}</div><div class="icons-row">${icon.repeat(Math.min(v, 10))}</div></div>
      <div class="ctl">
        <button class="round" data-a="recipe" data-k="${k}" data-d="-1" ${v <= lo ? 'disabled' : ''}>−</button>
        <div class="val">${v}</div>
        <button class="round" data-a="recipe" data-k="${k}" data-d="1" ${v >= hi ? 'disabled' : ''}>+</button>
      </div></div>`;
  };

  const stockHtml = SUPPLY_ORDER.map((k) => {
    const n = G.have(s, k);
    const low = (k === 'lemons' && n < s.recipe.lemons) || (k === 'sugar' && n < s.recipe.sugar) || (k === 'cups' && n < 1) || (k === 'ice' && s.recipe.ice && n < s.recipe.ice);
    return `<div class="s ${low ? 'low' : ''}"><div class="i">${SUPPLIES[k].icon}</div><div class="n">${n}</div><div class="tiny muted">${SUPPLIES[k].name}</div></div>`;
  }).join('');

  let openWhy = '';
  if (ev && ev.choices && !s.eventDone) openWhy = 'Decide on the news first ☝️';
  else if (can.n === 0) openWhy = 'You need supplies to open!';
  else if (s.cash < costs.total) openWhy = `You need ${money(costs.total)} for today's costs.`;

  return `
  <div class="cols">
    <div class="col">
      <div class="hero"><canvas id="preview"></canvas>
        <div class="tag">${loc.icon} ${loc.name}</div>
        <div class="tag tag2">${W.icon} ${f.temp}°F</div>
      </div>
      <div class="zest"><div class="face">🍋</div><div><div class="say">${hint.text}</div>
        ${hint.act ? `<div class="act"><button class="btn small" data-a="${hint.act[0]}" data-t="${hint.act[1]}">${hint.act[2]}</button></div>` : ''}</div></div>
      ${newsHtml}
      <div class="card">
        <h3>🌤️ Today's Forecast <span class="sub">${season.icon} ${season.name}</span></h3>
        <div class="forecast">
          <div class="wx">${W.icon}</div>
          <div><div class="big">${W.name}, ${f.temp}°F</div>
            <div class="chips">
              <span class="chip ${f.rain >= 50 ? 'bad' : f.rain >= 25 ? 'warn' : 'good'}">☔ ${f.rain}% chance of rain</span>
              <span class="chip">${G.isWeekend(s.day) ? '🎉 Weekend' : '📅 Weekday'}</span>
            </div></div>
        </div>
        <div class="tiny muted" style="margin-top:8px">Forecasts are usually right… but not always! <a href="#" data-a="lesson" data-id="weather">Why?</a></div>
      </div>
      <div class="card">
        <h3>📍 Where to sell <span class="sub">Tap to choose</span></h3>
        <div class="locs">${locCards}</div>
        <div class="small muted">${loc.blurb}</div>
      </div>
    </div>
    <div class="col">
      <div class="card">
        <h3>🧪 Recipe <span class="sub">1 pitcher = ${P} cups</span></h3>
        ${stepper('lemons', '🍋', 'Lemons', 'per pitcher — more = more sour')}
        ${stepper('sugar', '🍚', 'Sugar', 'scoops per pitcher — more = sweeter')}
        ${stepper('ice', '🧊', 'Ice', 'cubes per cup — hot days need more')}
        <div class="row" style="margin-top:8px;background:#f8f4e8;border-radius:12px;padding:8px 10px">
          <span style="font-size:24px">👅</span>
          <div style="flex:1"><div class="small"><b>Zest's taste test:</b> ${'⭐'.repeat(tasteStars)}${'<span style="opacity:.25">⭐</span>'.repeat(5 - tasteStars)}</div><div class="tiny muted">${tasteTip}</div></div>
        </div>
      </div>
      <div class="card">
        <h3>🏷️ Price per cup</h3>
        <div class="row" style="justify-content:center;gap:14px">
          <button class="round" data-a="price" data-d="-0.05" ${s.price <= PRICE_LIMITS[0] ? 'disabled' : ''}>−</button>
          <div class="price-big">${money(s.price)}</div>
          <button class="round" data-a="price" data-d="0.05" ${s.price >= PRICE_LIMITS[1] ? 'disabled' : ''}>+</button>
        </div>
        <div class="chips" style="justify-content:center">
          ${[0.5, 0.75, 1, 1.5, 2, 3, 4, 5].filter((p) => p <= Math.max(1.5, exp.wtp * 2.2)).map((p) => `<button class="chip" style="border:0" data-a="setPrice" data-p="${p}">${money(p)}</button>`).join('')}
        </div>
        <div class="chip ${priceSay[1]}" style="display:block;text-align:center;margin-top:8px">${priceSay[0]}</div>
        <div class="money-grid">
          <div class="money-box"><div class="k">Each cup costs you</div><div class="v">${cents(cpc)}</div></div>
          <div class="money-box"><div class="k">You keep per cup</div><div class="v ${profitCup >= 0 ? 'green' : 'red'}">${profitCup >= 0 ? '' : '−'}${cents(Math.abs(profitCup))}</div></div>
        </div>
        <div class="tiny muted" style="margin-top:6px"><a href="#" data-a="lesson" data-id="costPerCup">What's "cost per cup"?</a> · <a href="#" data-a="lesson" data-id="demand">How do I pick a price?</a></div>
      </div>
      <div class="card">
        <h3>📣 Advertising today</h3>
        <div class="ads">${adHtml}</div>
      </div>
      <div class="card">
        <h3>📦 Supplies <span class="sub">Enough for <b>${can.n === Infinity ? 0 : can.n}</b> cups</span></h3>
        <div class="stock">${stockHtml}</div>
        <button class="btn ghost full small" style="margin-top:10px" data-a="tab" data-t="shop">🛒 Go shopping</button>
      </div>
      <div class="open-bar">
        <button class="btn big green ${canOpen ? 'open-btn' : ''}" data-a="open" ${canOpen ? '' : 'disabled'}>🍋 OPEN THE STAND!</button>
        <div class="open-meta">${openWhy || `Today's costs: ${costs.total ? `${costs.rent ? `rent ${money(costs.rent)}` : ''}${costs.ad ? ` · ads ${money(costs.ad)}` : ''}${costs.wages ? ` · wages ${money(costs.wages)}` : ''}` : 'nothing! 🎉'}`}
          · <a href="#" data-a="stayClosed">Stay closed today</a></div>
      </div>
    </div>
  </div>`;
}

// ───────── Shop tab ─────────
function shopTab() {
  const exp = expectedCustomers();
  const low = Math.max(5, Math.round(exp.n * 0.8 / 5) * 5);
  const sizes = [...new Set([low, Math.round(exp.n * 1.1 / 5) * 5 + 5, Math.round(exp.n * 1.5 / 10) * 10 + 10].map((x) => Math.max(10, x)))];
  const life = lemonLife(s);

  const quick = sizes.map((n) => {
    const need = G.needFor(s, n);
    let est = 0;
    for (const k of SUPPLY_ORDER) est += Math.max(0, need[k] - G.have(s, k)) * s.market[k];
    return `<button class="btn blue" data-a="quick" data-n="${n}"><span>${n} cups</span><span class="price">${est > 0.004 ? `~${money(est)}` : "✓ you have enough"}</span></button>`;
  }).join('');

  const items = SUPPLY_ORDER.map((k) => {
    const it = SUPPLIES[k];
    const price = s.market[k];
    const prev = s.prevMarket[k] || price;
    const trend = price > prev * 1.03 ? '<span class="trend-up">▲ up</span>' : price < prev * 0.97 ? '<span class="trend-down">▼ down</span>' : '<span class="muted">● same</span>';
    const packs = it.packs.map((p, i) => {
      const cost = G.packPrice(s, k, i);
      return `<button class="btn pack ${i === 2 ? 'purple' : i === 1 ? 'green' : ''}" data-a="buy" data-k="${k}" data-i="${i}" ${s.cash < cost ? 'disabled' : ''}>
        ${p.off ? `<span class="save-tag">SAVE ${Math.round(p.off * 100)}%</span>` : ''}
        <span class="q">${p.n} ${it.icon}</span><span>${money(cost)}</span><span class="each">${cents(cost / p.n)} each</span></button>`;
    }).join('');
    let fresh = '';
    if (k === 'lemons' && s.inv.lemons.length) {
      fresh = `<div class="fresh">${s.inv.lemons.slice().sort((a, b) => b.age - a.age).map((b) => {
        const left = life - b.age;
        return `<span class="chip ${left <= 1 ? 'bad' : left <= 2 ? 'warn' : 'good'}">${b.n} 🍋 ${left <= 1 ? 'go bad tonight!' : `good for ${left} days`}</span>`;
      }).join('')}</div>`;
    }
    return `<div class="card">
      <div class="item-head"><div class="ii">${it.icon}</div>
        <div><div style="font-weight:600;font-size:18px">${it.name}</div><div class="tiny muted">Today: ${cents(price)} each · ${trend}</div></div>
        <div class="have"><b>${G.have(s, k)}</b><div class="tiny muted">you have</div></div></div>
      <div class="packs">${packs}</div>
      <div class="tiny muted" style="margin-top:8px">💡 ${it.note}</div>
      ${fresh}
    </div>`;
  }).join('');

  return `<div class="stack">
    <div class="card">
      <h3>⚡ Quick Buy <span class="sub">for your recipe</span></h3>
      <div class="small muted" style="margin-bottom:10px">Zest guesses about <b>${Math.max(0, Math.round(exp.n * 0.75))}–${Math.round(exp.n * 1.25) + 1}</b> customers today. Buy enough to make:</div>
      <div class="quick">${quick}</div>
      <div class="tiny muted" style="margin-top:8px">Quick Buy only buys what you're missing. You have enough for <b>${G.cupsPossible(s).n}</b> cups now.</div>
    </div>
    <div class="grid2">${items}</div>
    <div class="zest"><div class="face">🍋</div><div class="say">Big packs are cheaper for each item — but lemons go bad and ice melts! <a href="#" data-a="lesson" data-id="bulk">Learn about bulk buying</a></div></div>
  </div>`;
}

// ───────── Upgrades tab ─────────
function upgradesTab() {
  const next = TIERS[s.tier + 1];
  const cur = TIERS[s.tier];
  const tierRow = TIERS.map((t, i) => `<div class="t ${i <= s.tier ? 'have' : ''} ${i === s.tier ? 'cur' : ''}">${t.icon}</div>`).join('');
  const ups = UPGRADES.map((u) => {
    const own = s.upgrades[u.id];
    const locked = u.needs && !s.upgrades[u.needs];
    return `<div class="up ${own ? 'owned' : ''} ${locked ? 'locked' : ''}">
      <div class="ui">${u.icon}</div>
      <div class="ub"><div class="un">${u.name}</div><div class="ud">${u.desc}${locked ? `<br>🔒 Needs ${UPGRADES.find((x) => x.id === u.needs).name}` : ''}</div></div>
      ${own ? '<div class="chip good">✓ Owned</div>' : `<button class="btn small green" data-a="upgrade" data-id="${u.id}" ${s.cash < u.cost || locked ? 'disabled' : ''}>${money(u.cost)}</button>`}
    </div>`;
  }).join('');
  const staff = STAFF.map((st) => {
    const on = s.staff[st.id];
    const locked = st.rep && s.rep < st.rep;
    return `<div class="up ${on ? 'owned' : ''} ${locked ? 'locked' : ''}">
      <div class="ui">${st.icon}</div>
      <div class="ub"><div class="un">${st.name}</div><div class="ud">${st.desc}<br><b>Wage: ${money(st.wage)} each day you open</b>${locked ? `<br>🔒 Needs ${(st.rep / 20).toFixed(1)} ⭐` : ''}</div></div>
      ${on ? `<button class="btn small ghost" data-a="staff" data-id="${st.id}" data-on="0">Let go</button>` : `<button class="btn small blue" data-a="staff" data-id="${st.id}" data-on="1" ${locked ? 'disabled' : ''}>Hire</button>`}
    </div>`;
  }).join('');
  return `<div class="stack">
    <div class="card">
      <h3>${cur.icon} Your Stand: ${cur.name}</h3>
      <div class="tier-row">${tierRow}</div>
      ${next ? `<div class="up" style="box-shadow:none;background:#fff8dc">
        <div class="ui">${next.icon}</div>
        <div class="ub"><div class="un">Upgrade to ${next.name}</div><div class="ud">${next.blurb}<br>People pay <b>${Math.round((next.wtp / cur.wtp - 1) * 100)}% more</b>, serve faster, and more people stop.</div></div>
        <button class="btn green" data-a="tier" ${s.cash < next.cost ? 'disabled' : ''}>${money(next.cost)}</button></div>`
        : '<div class="chip good">🏆 You have the best stand in town!</div>'}
    </div>
    <div class="sect-title">🧰 Equipment</div>
    <div class="grid2">${ups}</div>
    <div class="sect-title">👥 Staff</div>
    <div class="grid2">${staff}</div>
    <div class="zest"><div class="face">🍋</div><div class="say">Upgrades cost money now but help you earn more later. That's called <b>investing</b>! Workers cost money every day — only hire when you're busy. <a href="#" data-a="lesson" data-id="invest">Learn more</a></div></div>
  </div>`;
}

// ───────── Money tab ─────────
function moneyTab() {
  const nw = netWorth(s);
  const bv = bizValue(s);
  const daysToSunday = 6 - G.dayOfWeek(s.day);
  const limit = G.loanLimit(s);
  const biz = BUSINESSES.map((b) => {
    const lvl = s.biz[b.id] || 0;
    const open = G.bizUnlocked(s, b);
    const cost = G.bizNextCost(s, b);
    const [lo, hi] = G.bizIncomeRange(b, Math.max(1, lvl));
    const avg = (lo + hi) / 2;
    const payback = Math.ceil(b.cost / ((b.income[0] + b.income[1]) / 2));
    const lvlDots = `<span class="lvl">${[1, 2, 3].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`;
    if (!open) {
      return `<div class="up locked"><div class="ui">❓</div><div class="ub"><div class="un">Secret business</div><div class="ud">Buy the business before this one to unlock it.</div></div></div>`;
    }
    const nextRange = lvl && lvl < 3 ? G.bizIncomeRange(b, lvl + 1) : null;
    return `<div class="up ${lvl ? 'owned' : ''}">
      <div class="ui">${b.icon}</div>
      <div class="ub"><div class="un">${b.name}${lvl ? lvlDots : ''}</div>
        <div class="ud">${b.blurb}<br>Earns <b>${money(lo)}–${money(hi)}</b>/day${lvl ? '' : ` · pays for itself in ~${payback} days`}</div>
        ${lvl ? `<div class="biz-earn">Earned so far: ${money(s.bizEarned[b.id] || 0)}</div>` : ''}
        ${nextRange ? `<div class="tiny muted">Level ${lvl + 1}: ${money(nextRange[0])}–${money(nextRange[1])}/day</div>` : ''}
      </div>
      ${cost == null ? '<div class="chip good">MAX</div>' : `<button class="btn small ${lvl ? 'blue' : 'green'}" data-a="biz" data-id="${b.id}" ${s.cash < cost ? 'disabled' : ''}>${lvl ? 'Grow' : 'Buy'}<br>${money(cost)}</button>`}
    </div>`;
    void avg;
  }).join('');
  const amts = (list, max) => list.filter((a) => a === 'all' || a <= Math.max(max, 0)).map((a) => a);
  return `<div class="cols">
    <div class="col">
      <div class="card">
        <h3>🏆 Net Worth <span class="sub"><a href="#" data-a="lesson" data-id="networth">What's this?</a></span></h3>
        <div class="nw">${money(nw)}</div>
        <div class="meter" style="margin-top:6px"><i style="width:${Math.min(100, (nw / WIN_NET_WORTH) * 100)}%"></i></div>
        <div class="tiny muted" style="margin-top:4px">Goal: ${money(WIN_NET_WORTH)} to become a Lemonade Tycoon 👑</div>
        <div class="nw-parts">
          <div class="money-box"><div class="k">💵 Cash</div><div class="v">${money(s.cash)}</div></div>
          <div class="money-box"><div class="k">🐷 Savings</div><div class="v">${money(s.savings)}</div></div>
          <div class="money-box"><div class="k">🏢 Businesses</div><div class="v">${money(bv)}</div></div>
          <div class="money-box"><div class="k">🏦 Loans</div><div class="v ${s.loan ? 'red' : ''}">${s.loan ? '−' : ''}${money(s.loan)}</div></div>
        </div>
      </div>
      <div class="card">
        <h3>🐷 Savings Account <span class="sub">${Math.round(G.SAVINGS_RATE * 100)}% interest every week</span></h3>
        <div class="row"><div style="font-size:30px;font-weight:700">${money(s.savings)}</div><div class="spacer"></div>
          <div class="small muted" style="text-align:right">Next interest: <b>${daysToSunday ? `in ${daysToSunday} day${daysToSunday > 1 ? 's' : ''}` : 'tonight!'}</b><br>You'll earn about <b class="green">${money(s.savings * G.SAVINGS_RATE, true)}</b></div></div>
        <div class="bank-row">
          ${amts([5, 20, 100, 1000], s.cash).map((a) => `<button class="btn small green" data-a="deposit" data-n="${a}" ${s.cash < a ? 'disabled' : ''}>Save ${money(a)}</button>`).join('')}
          <button class="btn small green" data-a="deposit" data-n="all" ${s.cash < 0.01 ? 'disabled' : ''}>Save all</button>
        </div>
        <div class="bank-row">
          ${amts([5, 20, 100, 1000], s.savings).map((a) => `<button class="btn small ghost" data-a="withdraw" data-n="${a}" ${s.savings < a ? 'disabled' : ''}>Take ${money(a)}</button>`).join('')}
          <button class="btn small ghost" data-a="withdraw" data-n="all" ${s.savings < 0.01 ? 'disabled' : ''}>Take all</button>
        </div>
        <div class="tiny muted" style="margin-top:8px">The bank pays you for saving. The more you save, the more it grows! <a href="#" data-a="lesson" data-id="saving">Learn more</a></div>
      </div>
      <div class="card">
        <h3>🏦 Borrow Money <span class="sub">${Math.round(G.LOAN_RATE * 100)}% interest every week</span></h3>
        <div class="row"><div><div class="small muted">You owe</div><div style="font-size:26px;font-weight:700" class="${s.loan ? 'red' : ''}">${money(s.loan)}</div></div><div class="spacer"></div>
          <div class="small muted" style="text-align:right">You can borrow up to<br><b>${money(Math.max(0, limit - s.loan))}</b> more</div></div>
        <div class="bank-row">
          ${[20, 100, 500, 2500].filter((a) => a <= Math.max(20, limit)).map((a) => `<button class="btn small ghost" data-a="borrow" data-n="${a}" ${limit - s.loan < a ? 'disabled' : ''}>Borrow ${money(a)}</button>`).join('')}
        </div>
        ${s.loan ? `<div class="bank-row"><button class="btn small green" data-a="repay" data-n="all" ${s.cash < 0.01 ? 'disabled' : ''}>Pay back ${money(Math.min(s.cash, s.loan))}</button></div>` : ''}
        <div class="tiny muted" style="margin-top:8px">⚠️ Loans grow every week until you pay them back! <a href="#" data-a="lesson" data-id="loan">Learn more</a></div>
      </div>
    </div>
    <div class="col">
      <div class="sect-title">🏢 Businesses you can own</div>
      <div class="zest"><div class="face">🍋</div><div class="say">Businesses earn money <b>every day</b> — even when your stand is closed! Buy one, then grow it to earn more.</div></div>
      ${biz}
    </div>
  </div>`;
}

// ───────── Goals tab ─────────
function goalsTab() {
  const rank = G.rankOf(s);
  const done = s.goalsDone.length;
  const toNext = rank.next ? (done - rank.at) / (rank.next.at - rank.at) : 1;
  const goals = G.activeGoals(s).map((g) => {
    const [cur, target] = g.check(s);
    const pct = Math.max(0, Math.min(1, cur / target));
    const show = g.stars ? `${stars(cur).toFixed(1)} / ${stars(target).toFixed(1)} ⭐` : g.money ? `${money(Math.max(0, cur))} / ${money(target)}` : `${Math.min(cur, target)} / ${target}`;
    return `<div class="goal"><div class="gi">🎯</div><div class="gb"><div class="gt">${g.text}</div>
      <div class="meter"><i style="width:${pct * 100}%"></i></div><div class="tiny muted">${show}</div></div>
      <div class="gr">+${money(g.reward)}</div></div>`;
  }).join('') || '<div class="center">🏆 You finished every goal! You are a true tycoon!</div>';
  const lessons = Object.entries(LESSONS).map(([id, l]) => {
    const have = s.lessons.includes(id);
    return `<button class="lesson ${have ? '' : 'locked'} ${s.newLessons.includes(id) ? 'new' : ''}" data-a="lesson" data-id="${id}" ${have ? '' : 'disabled'}>
      <div class="li">${have ? l.icon : '🔒'}</div><div class="ln">${have ? l.title : '???'}</div></button>`;
  }).join('');
  const st = s.stats;
  const quizReady = s.quizDay !== s.day;
  return `<div class="cols">
    <div class="col">
      <div class="card">
        <div class="rank"><div class="ri">${rank.icon}</div><div style="flex:1"><div class="small muted">Your rank</div><div class="rn">${rank.name}</div>
          ${rank.next ? `<div class="meter purple" style="margin-top:6px"><i style="width:${toNext * 100}%"></i></div><div class="tiny muted">${rank.next.at - done} more goal${rank.next.at - done > 1 ? 's' : ''} to become <b>${rank.next.icon} ${rank.next.name}</b></div>` : '<div class="chip good">Top rank!</div>'}
        </div></div>
      </div>
      <div class="card"><h3>🎯 Goals <span class="sub">${done} / ${GOALS.length} done</span></h3>${goals}</div>
      <div class="card">
        <h3>🧠 Money Quiz</h3>
        <div class="small" style="margin-bottom:10px">Answer one money question each day for a bonus! ${s.quizStreak > 1 ? `🔥 Streak: <b>${s.quizStreak}</b>` : ''}</div>
        <button class="btn full ${quizReady ? 'purple' : 'ghost'}" data-a="quiz" ${quizReady ? '' : 'disabled'}>${quizReady ? `Start today's question (+${money(quizReward())})` : '✓ Done for today — come back tomorrow!'}</button>
      </div>
    </div>
    <div class="col">
      <div class="card"><h3>📈 Profit each day <span class="sub">last ${Math.min(14, s.history.length)} days</span></h3>
        ${s.history.length ? '<canvas class="chart" id="chart"></canvas>' : '<div class="muted small">Open your stand to see your profit here!</div>'}
      </div>
      <div class="card"><h3>📒 Zest's Money Notebook <span class="sub">${s.lessons.length}/${Object.keys(LESSONS).length}</span></h3>
        <div class="lessons">${lessons}</div></div>
      <div class="card"><h3>📊 Records</h3>
        <div class="stats">
          <div class="money-box"><div class="k">Cups sold</div><div class="v">${st.cups.toLocaleString()}</div></div>
          <div class="money-box"><div class="k">Money earned</div><div class="v">${money(st.revenue)}</div></div>
          <div class="money-box"><div class="k">Best day profit</div><div class="v">${money(st.bestProfit)}</div></div>
          <div class="money-box"><div class="k">Most cups in a day</div><div class="v">${st.bestCups}</div></div>
          <div class="money-box"><div class="k">"Perfect!" cups</div><div class="v">${st.perfect}</div></div>
          <div class="money-box"><div class="k">Days open</div><div class="v">${st.daysOpen}</div></div>
        </div></div>
    </div>
  </div>`;
}

function paintChart() {
  const c = $('#chart');
  if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  c.width = r.width * dpr; c.height = r.height * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const data = s.history.slice(-14);
  const W = r.width, H = r.height, pad = 18;
  const max = Math.max(1, ...data.map((d) => d.profit));
  const min = Math.min(0, ...data.map((d) => d.profit));
  const span = max - min;
  const y0 = pad + ((max) / span) * (H - pad * 2);
  const bw = (W - 8) / 14;
  ctx.strokeStyle = '#e6d9b5'; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
  ctx.font = '500 10px Fredoka, sans-serif'; ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const x = 4 + i * bw + bw * 0.15;
    const h = (Math.abs(d.profit) / span) * (H - pad * 2);
    ctx.fillStyle = d.profit >= 0 ? '#1fb766' : '#ea4d4b';
    const y = d.profit >= 0 ? y0 - h : y0;
    ctx.beginPath();
    const w = bw * 0.7, rad = Math.min(4, w / 2, h / 2 || 0);
    ctx.moveTo(x, y + rad); ctx.arcTo(x, y, x + w, y, rad); ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8b7651';
    ctx.fillText(WEATHER[d.w] ? WEATHER[d.w].icon : '', x + w / 2, H - 3);
    if (i === data.length - 1 || d.profit === max) { ctx.fillStyle = '#3b2a10'; ctx.fillText(money(d.profit), x + w / 2, d.profit >= 0 ? y - 3 : y + h + 11); }
  });
}

// ───────── Opening the stand: the live day ─────────
function openStand() {
  const costs = G.openingCosts(s);
  if (s.cash < costs.total) return;
  s.cash = G.r2(s.cash - costs.total);
  s.inDay = { costs }; // cleared when the day finishes; lets us recover if the app is killed mid-day
  const ad = ADS.find((a) => a.id === s.ad);
  if (ad.cost) G.learn(s, 'ads');
  G.learn(s, 'costPerCup');
  if (s.day >= 3) G.learn(s, 'demand');
  if (s.rep >= 30) G.learn(s, 'reputation');
  const result = simulateDay(s, ad.boost);
  const startCups = G.cupsPossible(s).n;
  G.save(s);
  sfx.open();
  const day = $('#day');
  day.hidden = false;
  const W = WEATHER[s.weather.today.type];
  const surprise = s.weather.today.type !== s.weather.forecast.type;
  day.innerHTML = `
    <canvas id="dayCanvas"></canvas>
    <div class="day-top">
      <div class="pill clock" id="dClock">9:00 AM</div>
      <div class="pill">${W.icon} ${s.weather.today.temp}°F</div>
      <div class="pill" style="color:var(--green-d)">💵 <span id="dMoney">$0.00</span></div>
      <div class="pill">🥤 <span id="dServed">0</span> sold</div>
      <div class="pill" id="dLeftPill">🍋 <span id="dLeft">${startCups}</span> left</div>
      <div class="progress"><i id="dProg"></i></div>
    </div>
    <div class="feed" id="dFeed"></div>
    <div class="day-bottom">
      <div class="speed">
        ${[1, 2, 4].map((x) => `<button class="btn small ${s.settings.speed === x ? 'on' : ''}" data-a="speed" data-x="${x}">${x}×</button>`).join('')}
        <button class="btn small ghost" data-a="skip">⏭</button>
      </div>
    </div>
    ${surprise ? `<div class="banner" id="dBanner">Surprise! It's ${W.icon} ${W.name.toLowerCase()} today!</div>` : `<div class="banner" id="dBanner">${W.icon} Open for business!</div>`}`;
  setTimeout(() => { const b = $('#dBanner'); if (b) b.remove(); }, 2200);
  const feed = $('#dFeed');
  const pushFeed = (text) => {
    const d = document.createElement('div');
    d.textContent = text;
    feed.appendChild(d);
    while (feed.children.length > (window.innerHeight > window.innerWidth * 1.1 ? 6 : 3)) feed.firstChild.remove();
  };
  let sold = 0;
  scene = new DayScene($('#dayCanvas'), s, result, {
    onSale: (c, visible) => { sold++; if (visible) sfx.coin(); },
    onSay: (text, c) => { if (c.kind === 'soldout' ? Math.random() < 0.15 : c.kind !== 'buy' || Math.random() < 0.5) pushFeed(text); },
    onIncident: (text) => { sfx.splash(); pushFeed(text); toast(text, 'bad'); },
    onTick: (sc) => {
      const m = Math.min(480, sc.min);
      const h = 9 + Math.floor(m / 60), mm = Math.floor(m % 60);
      const hh = h > 12 ? h - 12 : h;
      $('#dClock').textContent = `${hh}:${String(Math.floor(mm / 15) * 15).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      $('#dMoney').textContent = money(sc.money);
      $('#dServed').textContent = sold;
      $('#dLeft').textContent = Math.max(0, startCups - sold - (result.tally.lostCups && sc.min >= (result.customers.find((c) => c.kind === 'incident') || {}).t ? result.tally.lostCups : 0));
      $('#dProg').style.width = `${(m / 480) * 100}%`;
      if (result.soldOut && sc.min >= result.soldOutAt && !sc.soldShown) {
        sc.soldShown = true;
        pushFeed(`😱 Out of ${SUPPLIES[result.soldOut].name.toLowerCase()}! SOLD OUT!`);
        $('#dLeftPill').style.background = '#ffe1e0';
      }
    },
    onDone: () => finishDay(result, costs),
  });
}

function finishDay(result, costs) {
  delete s.inDay;
  if (scene) { scene.destroy(); scene = null; }
  $('#day').hidden = true;
  $('#day').innerHTML = '';
  const rep = G.endDay(s, result, costs);
  G.save(s);
  tab = 'stand';
  render();
  showReport(rep);
}

function stayClosed() {
  const e = G.currentEvent(s);
  if (e && e.choices && !s.eventDone) G.chooseEvent(s, e.choices.length - 1);
  const rep = G.endDay(s, null, null);
  G.save(s);
  render();
  showReport(rep);
}

// ───────── End-of-day report ─────────
function showReport(r) {
  const t = r.tally;
  const W = WEATHER[r.weather.type];
  const good = r.profit >= 0;
  if (r.goals.length || r.won) { sfx.fanfare(); confetti(r.won ? 160 : 70); } else if (good && r.open) sfx.win();

  let advice = '';
  if (r.open && t) {
    const tops = ['sour', 'sweet', 'weak', 'strong', 'warm', 'cold'].map((k) => [k, t[k]]).sort((a, b) => b[1] - a[1]);
    const served = Math.max(1, t.served);
    if (r.soldOut) advice = `You <b>sold out</b> of ${SUPPLIES[r.soldOut].name.toLowerCase()}! ${t.soldout} people wanted lemonade but couldn't get any. Buy more supplies next time.`;
    else if (t.line > 3) advice = `${t.line} people left because the <b>line was too long</b>. A helper or cash box would let you serve faster.`;
    else if (t.pricey > t.served) advice = `<b>${t.pricey}</b> people said your price was too high — more than the ${t.served} who bought! Try a lower price, or wait for a hot day.`;
    else if (tops[0][1] > served * 0.3) {
      const msg = { sour: 'said it was <b>too sour</b>. Add sugar or use fewer lemons.', sweet: 'said it was <b>too sweet</b>. Add lemons or use less sugar.', weak: 'said it was <b>watery</b>. Use more lemons and sugar.', strong: 'said it was <b>too strong</b>. Use a little less lemon and sugar.', warm: 'wanted it <b>colder</b>. Add more ice!', cold: 'said it had <b>too much ice</b>. Use fewer cubes.' }[tops[0][0]];
      advice = `${tops[0][1]} customers ${msg}`;
    } else if (t.pricey === 0 && t.served > 8) advice = `Nobody said "too pricey!" — you might be able to <b>raise your price</b> a little and earn more.`;
    else if (r.spoiledCost > 0.5) advice = `${r.spoiled} lemons went bad and you lost ${money(r.spoiledCost)}. Buy fewer lemons at a time!`;
    else advice = t.perfect > served * 0.4 ? 'Customers LOVED your lemonade! Keep it up! 🌟' : 'Nice work today! Try small changes to your recipe and price to earn even more.';
  } else {
    advice = 'Your stand was closed today. You saved on rent and wages, but you made no sales.';
  }

  const row = (label, val, cls = '') => `<tr class="${cls}"><td>${label}</td><td class="${val >= 0 ? '' : 'red'}">${val >= 0 ? '' : '−'}${money(Math.abs(val), true)}</td></tr>`;
  const costs = r.costs || { rent: 0, ad: 0, wages: 0 };
  let ledger = '';
  if (r.open) {
    ledger += row(`🥤 Sold ${t.served} cups${t.free ? ` (${t.free} free)` : ''}`, r.revenue);
    if (r.tips) ledger += row('🪙 Tips', r.tips);
    ledger += row('🍋 Supplies used', -r.cogs);
    if (costs.rent) ledger += row('🏠 Rent', -costs.rent);
    if (costs.ad) ledger += row('📣 Ads', -costs.ad);
    if (costs.wages) ledger += row('🧑‍🍳 Wages', -costs.wages);
    ledger += row('<b>Stand profit</b>', r.standProfit, 'sub');
  }
  if (r.spoiledCost) ledger += row(`🤢 ${r.spoiled} lemons went bad`, -r.spoiledCost);
  if (r.meltedCost >= 0.01) ledger += row(`💧 ${r.melted} ice cubes melted`, -r.meltedCost);
  for (const b of r.biz) ledger += row(`${b.icon} ${b.name}`, b.amount);
  if (r.other) ledger += row(r.other > 0 ? '💼 Extra job' : '📰 News choice', r.other);
  if (r.insurance) ledger += row(r.insurance.paid ? '☂️ Insurance paid out!' : '☂️ Insurance (no rain)', r.insurance.paid);
  if (r.contest) ledger += row(r.contest.win ? '🏆 Won the contest!' : '🏆 Contest (didn\'t win)', r.contest.prize);
  if (r.interest) ledger += row('🐷 Savings interest', r.interest);
  if (r.loanInterest) ledger += row('🏦 Loan interest (added to loan)', -r.loanInterest);
  ledger += `<tr class="total"><td>Total profit</td><td class="${good ? 'green' : 'red'}">${signed(r.profit)}</td></tr>`;

  const people = r.open ? `
    <div class="people">
      <div class="p"><div class="pi">😋</div><div class="pn">${t.served}</div><div class="pl">bought</div></div>
      <div class="p"><div class="pi">🤩</div><div class="pn">${t.perfect}</div><div class="pl">said "Perfect!"</div></div>
      <div class="p"><div class="pi">💸</div><div class="pn">${t.pricey}</div><div class="pl">too pricey</div></div>
      <div class="p"><div class="pi">⏰</div><div class="pn">${t.line}</div><div class="pl">line too long</div></div>
      <div class="p"><div class="pi">😢</div><div class="pn">${t.soldout}</div><div class="pl">sold out</div></div>
    </div>` : '';

  const repChange = r.repAfter - r.repBefore;
  const extras = [];
  if (r.blogger) extras.push(r.blogger.happy ? '📸 The food blogger LOVED your lemonade! Stars went up!' : '📸 The food blogger was not impressed... Stars went down.');
  for (const g of r.gambles) extras.push(g.won ? `💡 Your friend's business worked! They paid you back ${money(g.pay)}! 🎉` : `💡 Your friend's business didn't work out. Your ${money(g.cost)} is gone. That's the risk of investing.`);

  const m = modal(`
    <h2>${r.open ? `Day ${r.day} Results` : `Day ${r.day}: Closed`}</h2>
    <div class="center small muted">${W.icon} ${W.name}, ${r.weather.temp}°F · ${LOCATIONS.find((l) => l.id === r.location).name}</div>
    <div class="report-profit"><div class="v ${good ? 'green' : 'red'}">${signed(r.profit)}</div><div class="small muted">${good ? (r.profit > 0 ? 'profit today! 🎉' : 'broke even') : 'loss today 😬'}</div></div>
    ${people}
    <div class="card" style="margin-top:10px"><table class="ledger">${ledger}</table>
      <div class="tiny muted" style="margin-top:6px"><a href="#" data-a="lesson" data-id="profit">What's the difference between money in and profit?</a></div></div>
    <div class="row" style="justify-content:center;margin-top:10px;gap:10px">
      <span class="pill">${starsHtml(r.repAfter)} <span class="${repChange >= 0 ? 'green' : 'red'}">${repChange >= 0.05 ? '▲' : repChange <= -0.05 ? '▼' : '●'}</span></span>
      <span class="pill">💵 ${money(s.cash)}</span>
    </div>
    ${extras.map((e) => `<div class="goal-done">${e}</div>`).join('')}
    <div class="zest" style="margin-top:10px"><div class="face">🍋</div><div class="say">${advice}</div></div>
    ${r.goals.map((g) => `<div class="goal-done">🎯 Goal done: ${g.text} <span class="spacer"></span><b class="green">+${money(g.reward)}</b></div>`).join('')}
    ${r.newLessons.length ? `<div class="goal-done" style="background:#e8f3ff">📒 New in Zest's Notebook: <b>${r.newLessons.map((id) => LESSONS[id].title).join(', ')}</b></div>` : ''}
    <div class="actions">
      ${r.newLessons.length ? `<button class="btn ghost" data-a="reportLesson" data-id="${r.newLessons[0]}">📒 Read lesson</button>` : ''}
      <button class="btn green big" data-a="nextDay">☀️ Next Day</button>
    </div>`, { closable: false });
  void m;
  if (r.won) setTimeout(showWin, 400);
}

function showWin() {
  sfx.fanfare(); confetti(200);
  modal(`<div class="big-emoji">👑🍋</div><h2>YOU ARE A LEMONADE TYCOON!</h2>
    <div class="lesson-card center">You turned $20 and a crate of lemons into a business empire worth <b>${money(netWorth(s))}</b>!<br><br>
    You learned about profit, prices, saving, investing and taking smart risks. That's what real business owners do!<br><br>
    You can keep playing to grow even bigger. 🚀</div>
    <div class="actions"><button class="btn green big" data-a="closeModal">Keep Playing!</button></div>`);
}

function showLesson(id) {
  const l = LESSONS[id];
  if (!l) return;
  s.newLessons = s.newLessons.filter((x) => x !== id);
  G.save(s);
  modal(`<div class="big-emoji">${l.icon}</div><h2>${l.title}</h2><div class="lesson-card">${l.text}</div>
    <div class="actions"><button class="btn green" data-a="closeModal">Got it! 👍</button></div>`, { onClose: () => render() });
}

// ───────── Quiz ─────────
function quizReward() { return Math.max(2, Math.min(100, Math.round(2 + netWorth(s) * 0.004))); }
function showQuiz() {
  const q = makeQuestion(s.difficulty, s.quizStreak);
  const reward = quizReward();
  const m = modal(`<div class="big-emoji">🧠</div><h2>Money Quiz</h2>
    <div class="lesson-card" style="font-size:18px">${q.q}</div>
    <div id="qOpts">${q.options.map((o, i) => `<button class="btn ghost quiz-opt" data-i="${i}">${String.fromCharCode(65 + i)}. ${o}</button>`).join('')}</div>
    <div id="qWhy"></div>`);
  m.querySelectorAll('.quiz-opt').forEach((b) => b.addEventListener('click', () => {
    if (m.dataset.done) return;
    m.dataset.done = '1';
    const i = +b.dataset.i;
    const right = i === q.answer;
    m.querySelectorAll('.quiz-opt')[q.answer].classList.add('right');
    if (!right) b.classList.add('wrong');
    s.quizDay = s.day;
    if (right) {
      s.quizStreak++;
      s.cash = G.r2(s.cash + reward);
      sfx.win(); confetti(40);
    } else { s.quizStreak = 0; sfx.no(); }
    G.save(s);
    m.querySelector('#qWhy').innerHTML = `<div class="zest" style="margin-top:12px"><div class="face">🍋</div><div class="say">${right ? `<b>Correct!</b> You earned ${money(reward)}! ` : '<b>Not quite!</b> '}${q.why}</div></div>
      <div class="actions"><button class="btn green" data-a="closeModal">OK</button></div>`;
    renderHud();
  }));
}

// ───────── Settings & new game ─────────
function showSettings() {
  modal(`<h2>⚙️ Settings</h2>
    <div class="card">
      <div class="toggle"><span>🔊 Sound effects</span><button class="btn small ${s.settings.sound ? 'green' : 'ghost'}" data-a="toggleSound">${s.settings.sound ? 'ON' : 'OFF'}</button></div>
      <div class="toggle"><span>🏷️ Stand name</span><span class="muted">${s.name ? esc(s.name) : '—'}</span></div>
      <div class="toggle"><span>🎚️ Difficulty</span><span class="muted">${s.difficulty === 'easy' ? '😊 Easy' : '😎 Normal'}</span></div>
      <div class="toggle"><span>📅 Days played</span><span class="muted">${s.day - 1}</span></div>
      <div class="toggle" style="border:0"><span>🆕 Start over</span><button class="btn small red" data-a="askReset">New game</button></div>
    </div>
    <div class="card" style="margin-top:10px">
      <h3>👪 For grown-ups</h3>
      <div class="small">Lemon Lane teaches profit, pricing, supply & demand, saving, interest, loans, investing and risk. Tap lessons in the <b>Goals</b> tab to read them together. Everything is saved on this device only; there are no ads, accounts or in-app purchases.</div>
    </div>
    <div class="center tiny muted" style="margin-top:10px">Lemon Lane v${VERSION}</div>`);
}

function askReset() {
  modal(`<div class="big-emoji">🤔</div><h2>Start a new game?</h2>
    <div class="lesson-card center">All your money, upgrades and businesses will be gone. This can't be undone!</div>
    <div class="actions"><button class="btn ghost" data-a="closeModal">Keep playing</button><button class="btn red" data-a="doReset">Yes, start over</button></div>`);
}

function showWelcome() {
  let diff = 'easy';
  const m = modal(`
    <div class="welcome-logo"><div class="l">🍋</div><h1>Lemon Lane</h1><div class="muted">Build a lemonade empire!</div></div>
    <label class="field"><span>What's your name?</span><input id="wName" maxlength="14" placeholder="Your name" autocomplete="off" /></label>
    <div class="field"><span>How hard?</span>
      <div class="choice-row">
        <button class="choice on" data-d="easy"><div class="ci">😊</div><div class="cn">Easy</div><div class="cd">More customers, fresher lemons, better forecasts</div></button>
        <button class="choice" data-d="normal"><div class="ci">😎</div><div class="cn">Normal</div><div class="cd">A real business challenge</div></button>
      </div></div>
    <div class="actions"><button class="btn green big" id="wGo">🍋 Start my stand!</button></div>`, { closable: false });
  m.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
    diff = b.dataset.d;
    m.querySelectorAll('.choice').forEach((x) => x.classList.toggle('on', x === b));
    sfx.tap();
  }));
  m.querySelector('#wGo').addEventListener('click', () => {
    const name = m.querySelector('#wName').value;
    s = G.newGame({ name, difficulty: diff });
    setSound(s.settings.sound);
    G.save(s);
    closeAllModals();
    tab = 'stand';
    render();
    sfx.win();
    showIntro(0);
  });
}

const INTRO = [
  ['🍋', 'Hi! I\'m Zest!', 'I\'ll help you run your very own <b>lemonade stand</b>. You start with <b>$20</b>. Let\'s turn it into a lemonade empire!'],
  ['🛒', 'Buy supplies', 'Buy <b>lemons, sugar, cups and ice</b> in the Shop. Prices change every day, so look for deals!'],
  ['🧪', 'Make it yummy', 'Pick your <b>recipe</b> and <b>price</b>. Listen to your customers — they\'ll tell you if it\'s too sour, too sweet, or too pricey!'],
  ['🌤️', 'Watch the weather', 'Hot days = thirsty customers! Rainy days = fewer people. Check the forecast every morning.'],
  ['🎯', 'Grow your business', 'Finish <b>goals</b>, buy <b>upgrades</b>, unlock new <b>places</b>, and own <b>businesses</b>. Reach $100,000 to become a <b>Lemonade Tycoon</b>! 👑'],
];
function showIntro(i) {
  const [ic, title, text] = INTRO[i];
  const last = i === INTRO.length - 1;
  const m = modal(`<div class="big-emoji">${ic}</div><h2>${title}</h2><div class="lesson-card center">${text}</div>
    <div class="center tiny muted" style="margin-top:8px">${INTRO.map((_, k) => (k === i ? '●' : '○')).join(' ')}</div>
    <div class="actions"><button class="btn green big" id="iNext">${last ? "Let's go! 🚀" : 'Next →'}</button></div>`, { closable: false });
  m.querySelector('#iNext').addEventListener('click', () => {
    closeModal();
    sfx.tap();
    if (!last) showIntro(i + 1);
    else { s.tutorial = 1; G.save(s); }
  });
}

function afterNextDay() {
  // Pop up a news decision so it isn't missed.
  const e = G.currentEvent(s);
  if (G.needsHelp(s)) {
    s.helpDay = s.day;
    s.cash = G.r2(s.cash + 10);
    G.save(s);
    modal(`<div class="big-emoji">👵</div><h2>Grandma helps out!</h2><div class="lesson-card center">You ran out of money! Grandma believes in you and gives you <b>$10</b> to buy supplies.<br><br>Next time, try to keep some money for tomorrow's supplies. 😉</div>
      <div class="actions"><button class="btn green" data-a="closeModal">Thanks, Grandma!</button></div>`, { onClose: () => render() });
    return;
  }
  if (e && e.choices && !s.eventDone) {
    const m = modal(`<div class="big-emoji">${e.icon}</div><h2>${e.title}</h2><div class="lesson-card center">${e.text}</div>
      <div class="actions">${e.choices.map((c, i) => `<button class="btn ${i === 0 ? 'green' : 'ghost'}" data-a="choose" data-i="${i}" data-modal="1">${c.label}</button>`).join('')}</div>`, { closable: false });
    void m;
  } else if (e) {
    toast(`${e.icon} <b>${e.title}</b> ${e.text}`);
  }
}

// ───────── Actions ─────────
const actions = {
  tab: (d) => { tab = d.t; sfx.tap(); render(); $('#main').scrollTop = 0; },
  closeModal: () => closeModal(),
  settings: () => showSettings(),
  toggleSound: () => { s.settings.sound = !s.settings.sound; setSound(s.settings.sound); G.save(s); closeModal(); showSettings(); },
  askReset: () => askReset(),
  doReset: () => { G.wipe(); closeAllModals(); s = null; showWelcome(); },
  loc: (d) => {
    const loc = LOCATIONS.find((l) => l.id === d.id);
    if (s.unlocked.includes(d.id)) { s.location = d.id; sfx.tap(); commit(); return; }
    const u = G.canUnlock(s, loc);
    if (!u.ok) { sfx.no(); toast(`🔒 ${loc.name}: ${u.why}`, 'bad'); return; }
    modal(`<div class="big-emoji">${loc.icon}</div><h2>Unlock ${loc.name}?</h2>
      <div class="lesson-card center">${loc.blurb}<br><br>Permit: <b>${money(loc.permit)}</b> (one time)<br>Rent: <b>${money(loc.rent)}</b> every day you sell here</div>
      <div class="actions"><button class="btn ghost" data-a="closeModal">Not yet</button><button class="btn green" data-a="unlock" data-id="${loc.id}">Unlock for ${money(loc.permit)}</button></div>`);
  },
  unlock: (d) => { if (G.unlockLocation(s, d.id)) { closeModal(); sfx.buy(); confetti(40); toast('📍 New place unlocked!', 'good'); checkGoalsNow(); commit(); } },
  recipe: (d) => {
    const [lo, hi] = RECIPE_LIMITS[d.k];
    s.recipe[d.k] = Math.max(lo, Math.min(hi, s.recipe[d.k] + +d.d));
    sfx.pop(); commit();
  },
  price: (d) => { s.price = G.r2(Math.max(PRICE_LIMITS[0], Math.min(PRICE_LIMITS[1], Math.round((s.price + +d.d) * 20) / 20))); sfx.tap(); commit(); },
  setPrice: (d) => { s.price = +d.p; sfx.tap(); commit(); },
  ad: (d) => { s.ad = d.id; sfx.tap(); commit(); },
  choose: (d) => {
    const res = G.chooseEvent(s, +d.i);
    if (!res) return;
    if (res.error) { sfx.no(); toast(res.error, 'bad'); return; }
    if (d.modal) closeModal();
    sfx.buy(); toast(res.msg, 'good'); commit();
  },
  buy: (d) => {
    if (G.buy(s, d.k, +d.i)) { sfx.buy(); bumpCash(); checkGoalsNow(); commit(); } else { sfx.no(); toast('Not enough money!', 'bad'); }
  },
  quick: (d) => {
    const r = G.buyFor(s, +d.n);
    if (r.short) { sfx.no(); toast(`Ran out of money buying ${SUPPLIES[r.short].name.toLowerCase()}!`, 'bad'); }
    else if (r.spent) { sfx.buy(); toast(`Bought supplies for ${money(r.spent)} 🛒`, 'good'); }
    else toast('You already have enough! 👍');
    bumpCash(); commit();
  },
  upgrade: (d) => { if (G.buyUpgrade(s, d.id)) { sfx.buy(); confetti(30); toast(`${UPGRADES.find((u) => u.id === d.id).icon} Upgrade bought!`, 'good'); checkGoalsNow(); commit(); } },
  tier: () => { if (G.buyTier(s)) { sfx.fanfare(); confetti(90); toast(`${TIERS[s.tier].icon} You now have a ${TIERS[s.tier].name}!`, 'good'); checkGoalsNow(); commit(); } },
  staff: (d) => {
    if (G.setStaff(s, d.id, d.on === '1')) { sfx.tap(); toast(d.on === '1' ? `${STAFF.find((x) => x.id === d.id).name} joined your team! 🎉` : 'Okay, they\'ll look for another job.', d.on === '1' ? 'good' : ''); checkGoalsNow(); commit(); }
  },
  biz: (d) => {
    const b = BUSINESSES.find((x) => x.id === d.id);
    const first = !s.biz[d.id];
    if (G.buyBiz(s, d.id)) { sfx.fanfare(); confetti(60); toast(first ? `${b.icon} You own a ${b.name}!` : `${b.icon} ${b.name} is now level ${s.biz[d.id]}!`, 'good'); checkGoalsNow(); commit(); }
  },
  deposit: (d) => { if (G.deposit(s, d.n === 'all' ? s.cash : +d.n)) { sfx.coin(); checkGoalsNow(); commit(); } },
  withdraw: (d) => { if (G.withdraw(s, d.n === 'all' ? s.savings : +d.n)) { sfx.coin(); commit(); } },
  borrow: (d) => { if (G.borrow(s, +d.n)) { sfx.coin(); toast(`Borrowed ${money(+d.n)}. Remember to pay it back!`); commit(); } },
  repay: () => { if (G.repay(s, s.loan)) { sfx.win(); toast('Loan paid! 🎉', 'good'); commit(); } },
  lesson: (d) => showLesson(d.id),
  reportLesson: (d) => showLesson(d.id),
  quiz: () => showQuiz(),
  open: () => openStand(),
  stayClosed: () => {
    modal(`<div class="big-emoji">😴</div><h2>Stay closed today?</h2><div class="lesson-card center">You won't pay rent or wages, but you won't sell anything. Your businesses still earn money. Lemons still get older and ice still melts!</div>
      <div class="actions"><button class="btn ghost" data-a="closeModal">No, I'll open</button><button class="btn blue" data-a="doClosed">Stay closed</button></div>`);
  },
  doClosed: () => { closeModal(); stayClosed(); },
  speed: (d) => {
    s.settings.speed = +d.x;
    if (scene) scene.setSpeed(+d.x);
    document.querySelectorAll('.speed .btn[data-x]').forEach((b) => b.classList.toggle('on', b.dataset.x === d.x));
    sfx.tap();
  },
  skip: () => { if (scene) scene.finish(); },
  nextDay: () => { closeModal(); sfx.tap(); $('#main').scrollTop = 0; render(); afterNextDay(); },
};

function bumpCash() {
  const p = $('#cashPill');
  if (p) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
}

// Goals can complete mid-day from purchases (e.g. "buy your first upgrade").
function checkGoalsNow() {
  const done = G.checkGoals(s);
  for (const g of done) {
    setTimeout(() => { sfx.fanfare(); confetti(60); toast(`🎯 Goal done: ${g.text}! +${money(g.reward)}`, 'good'); }, 300);
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = actions[el.dataset.a];
  if (fn && (s || ['closeModal', 'doReset'].includes(el.dataset.a))) fn(el.dataset, el);
});

let resizeT = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (s && tab === 'stand') paintPreview(); if (s && tab === 'goals') paintChart(); }, 120);
});

// Android back button: close popups, then go back to the Stand tab, then leave.
if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', () => {
    if (scene) return;
    const top = modalStack[modalStack.length - 1];
    if (top) { if (top.closable) closeModal(); return; }
    if (tab !== 'stand') { tab = 'stand'; render(); return; }
    App.minimizeApp();
  });
  App.addListener('pause', () => { if (scene) scene.finish(); else if (s) G.save(s); });
}

// ───────── Boot ─────────
function boot() {
  s = G.load();
  if (s) {
    // Fill in anything added in newer versions.
    const fresh = G.newGame({});
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of Object.keys(fresh.stats)) if (s.stats[k] === undefined) s.stats[k] = fresh.stats[k];
    setSound(s.settings.sound);
    G.checkGoals(s);
    render();
    if (s.inDay) {
      // The app was closed in the middle of a day: give back today's costs and replay it.
      s.cash = G.r2(s.cash + s.inDay.costs.total);
      delete s.inDay;
      G.save(s);
      render();
      toast('Welcome back! Your stand is ready to open again. 🍋');
    }
    if (s.tutorial === 0) showIntro(0);
  } else {
    $('#hud').innerHTML = '';
    showWelcome();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (s && tab === 'stand') paintPreview(); });
}
boot();

void RANKS; void BIZ_LEVEL_MULT; void iceIdeal;

// Dev-only hook for testing in a browser.
if (import.meta.env && import.meta.env.DEV) window.__lemon = { get s() { return s; }, get scene() { return scene; }, render, G };

// Leaving the app (home button, switching apps, screen off) during a day finishes it and saves.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  if (scene) scene.finish();
  else if (s) G.save(s);
});
