// Daily money quiz: one question a day, answers are multiple choice.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const $ = (x) => `$${x.toFixed(2)}`;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function choices(right, wrongs, fmt = $) {
  const set = new Set([fmt(right)]);
  for (const w of wrongs) if (w >= 0 && set.size < 3) set.add(fmt(w));
  let bump = 1;
  while (set.size < 3) set.add(fmt(right + 0.25 * bump++));
  const list = shuffle([...set]);
  return { options: list, answer: list.indexOf(fmt(right)) };
}

const EASY = [
  () => {
    const price = pick([0.25, 0.5, 0.75, 1, 1.25, 1.5]);
    const paid = price <= 1 ? pick([1, 2, 5]) : pick([2, 5]);
    const r = paid - price;
    return { q: `A lemonade costs ${$(price)}. A customer pays with a ${$(paid)} bill. How much change do you give back?`,
      ...choices(r, [r + 0.25, r - 0.25, paid]), why: `${$(paid)} − ${$(price)} = ${$(r)}` };
  },
  () => {
    const n = ri(2, 6), price = pick([0.5, 1, 2]);
    const r = n * price;
    return { q: `You sell ${n} cups for ${$(price)} each. How much money do you get?`, ...choices(r, [r + price, r - price, n + price]), why: `${n} × ${$(price)} = ${$(r)}` };
  },
  () => {
    const rev = ri(8, 20), cost = ri(2, 7);
    return { q: `You earned $${rev} today but spent $${cost} on lemons and sugar. What was your profit?`,
      ...choices(rev - cost, [rev + cost, cost, rev]), why: `Profit = money in − money out: $${rev} − $${cost} = $${rev - cost}` };
  },
  () => {
    const a = pick([0.25, 0.5, 0.75]), b = pick([0.25, 0.5, 1]);
    return { q: `You have ${$(a)} in quarters and find ${$(b)} more. How much do you have now?`, ...choices(a + b, [a + b + 0.25, a + b - 0.25, Math.abs(a - b)]), why: `${$(a)} + ${$(b)} = ${$(a + b)}` };
  },
  () => {
    const save = ri(2, 5), weeks = ri(3, 6);
    return { q: `If you put $${save} in your piggy bank every week, how much will you have after ${weeks} weeks?`, ...choices(save * weeks, [save + weeks, save * weeks + save, save * (weeks - 1)]), why: `$${save} × ${weeks} weeks = $${save * weeks}` };
  },
  () => {
    const q = pick([['quarters', 0.25], ['dimes', 0.1], ['nickels', 0.05]]);
    const n = ri(3, 8);
    return { q: `How much money is ${n} ${q[0]}?`, ...choices(n * q[1], [n * q[1] + q[1], n * q[1] - q[1], n]), why: `${n} × ${$(q[1])} = ${$(n * q[1])}` };
  },
];

const HARD = [
  () => {
    const n = ri(20, 60), price = pick([0.75, 1, 1.25, 1.5]), cost = pick([0.15, 0.2, 0.25]);
    const r = n * (price - cost);
    return { q: `Each cup costs you ${$(cost)} to make. You sell ${n} cups at ${$(price)}. What is your profit?`,
      ...choices(r, [n * price, n * cost, r + n * 0.05]), why: `Profit per cup: ${$(price)} − ${$(cost)} = ${$(price - cost)}. Times ${n} cups = ${$(r)}` };
  },
  () => {
    const small = pick([[12, 1.8], [12, 1.44], [10, 0.6]]);
    const bigN = small[0] * 4, bigP = +(small[1] * 4 * pick([0.8, 0.9])).toFixed(2);
    const q = `Pack A: ${small[0]} lemons for ${$(small[1])}. Pack B: ${bigN} lemons for ${$(bigP)}. Which is cheaper per lemon?`;
    return { q, options: ['Pack A', 'Pack B', 'They are the same'], answer: 1, why: `A = ${$(small[1] / small[0])} each. B = ${$(bigP / bigN)} each. Bigger packs usually cost less per lemon!` };
  },
  () => {
    const save = pick([100, 200, 50, 400]), rate = pick([10, 5, 25]);
    const r = save * (1 + rate / 100);
    return { q: `You save ${$(save)} and the bank pays ${rate}% interest. How much do you have after one year?`, ...choices(r, [save + rate, save * rate / 100, save]), why: `${rate}% of ${$(save)} is ${$(save * rate / 100)}. ${$(save)} + ${$(save * rate / 100)} = ${$(r)}` };
  },
  () => {
    const price = pick([4, 8, 10, 20]), off = pick([25, 50, 10]);
    const r = price * (1 - off / 100);
    return { q: `Sugar normally costs ${$(price)}. Today it is ${off}% off. What is the sale price?`, ...choices(r, [price - off / 10, price * off / 100, price]), why: `${off}% of ${$(price)} is ${$(price * off / 100)}. ${$(price)} − ${$(price * off / 100)} = ${$(r)}` };
  },
  () => {
    const cost = pick([45, 60, 90, 120]), daily = pick([3, 5, 6]);
    const days = Math.ceil(cost / daily);
    return { q: `A $${cost} juicer helps you earn $${daily} more each day. About how many days until it pays for itself?`,
      ...choices(days, [days * 2, Math.max(1, Math.round(days / 2)), cost], (x) => `${x} days`), why: `$${cost} ÷ $${daily} a day ≈ ${days} days. After that it's extra profit!` };
  },
  () => {
    const rent = pick([10, 15, 30]), profitCup = pick([0.5, 0.75, 1]);
    const r = Math.ceil(rent / profitCup);
    return { q: `Rent at the beach is $${rent}. You make ${$(profitCup)} profit on each cup. How many cups must you sell just to pay the rent?`,
      ...choices(r, [rent, r + 5, Math.round(rent * profitCup)], (x) => `${x} cups`), why: `$${rent} ÷ ${$(profitCup)} = ${r} cups. That's the "break-even" point.` };
  },
  () => {
    const borrow = pick([50, 100, 200]), rate = pick([5, 10]);
    const r = borrow * (1 + rate / 100);
    return { q: `You borrow ${$(borrow)} and must pay ${rate}% interest. How much do you pay back in total?`, ...choices(r, [borrow, borrow * rate / 100, borrow + rate * 2]), why: `${rate}% of ${$(borrow)} is ${$(borrow * rate / 100)}. You pay back ${$(r)}.` };
  },
];

export function makeQuestion(difficulty, streak = 0) {
  const pool = difficulty === 'easy' && streak < 5 ? EASY : Math.random() < 0.3 ? EASY : HARD;
  return pick(pool)();
}
