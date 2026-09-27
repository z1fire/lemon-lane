// All static game content: supplies, places, upgrades, businesses, goals, events, lessons.

export const START_CASH = 20;
export const DAY_MINUTES = 480; // 9:00 → 17:00
export const WIN_NET_WORTH = 100000;

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SEASONS = [
  { id: 'summer', name: 'Summer', icon: '🌻', weights: { heat: 22, sunny: 38, partly: 22, cloudy: 10, rainy: 6, storm: 2 }, temp: 0 },
  { id: 'fall', name: 'Fall', icon: '🍂', weights: { heat: 3, sunny: 25, partly: 30, cloudy: 22, rainy: 15, storm: 5 }, temp: -10 },
  { id: 'winter', name: 'Winter', icon: '⛄', weights: { heat: 0, sunny: 18, partly: 27, cloudy: 30, rainy: 17, storm: 8 }, temp: -22 },
  { id: 'spring', name: 'Spring', icon: '🌷', weights: { heat: 5, sunny: 30, partly: 28, cloudy: 17, rainy: 16, storm: 4 }, temp: -6 },
];
export const SEASON_DAYS = 28;

// Weather types, ordered from best to worst for lemonade.
export const WEATHER = {
  heat:   { name: 'Heat Wave',     icon: '🥵', temp: [94, 104], thirst: 1.55, wtp: 1.25, traffic: 1.05, rain: 0 },
  sunny:  { name: 'Sunny',         icon: '☀️', temp: [82, 93],  thirst: 1.3,  wtp: 1.1,  traffic: 1.1,  rain: 5 },
  partly: { name: 'Partly Cloudy', icon: '⛅', temp: [72, 84],  thirst: 1.0,  wtp: 1.0,  traffic: 1.0,  rain: 20 },
  cloudy: { name: 'Cloudy',        icon: '☁️', temp: [62, 74],  thirst: 0.75, wtp: 0.92, traffic: 0.9,  rain: 40 },
  rainy:  { name: 'Rainy',         icon: '🌧️', temp: [56, 68],  thirst: 0.5,  wtp: 0.85, traffic: 0.6,  rain: 75 },
  storm:  { name: 'Thunderstorm',  icon: '⛈️', temp: [52, 64],  thirst: 0.35, wtp: 0.8,  traffic: 0.35, rain: 95 },
};
export const WEATHER_ORDER = ['heat', 'sunny', 'partly', 'cloudy', 'rainy', 'storm'];

// Supplies. `base` is the normal price for one unit.
export const SUPPLIES = {
  lemons: { name: 'Lemons', one: 'lemon', icon: '🍋', base: 0.10, swing: 0.35,
    packs: [{ n: 12, off: 0 }, { n: 48, off: 0.1 }, { n: 144, off: 0.2 }],
    note: 'Lemons go bad after a few days. Buy what you can use!' },
  sugar: { name: 'Sugar', one: 'scoop', icon: '🍚', base: 0.05, swing: 0.25,
    packs: [{ n: 10, off: 0 }, { n: 40, off: 0.1 }, { n: 120, off: 0.2 }],
    note: 'Sugar never goes bad. Scoops per pitcher.' },
  cups: { name: 'Cups', one: 'cup', icon: '🥤', base: 0.03, swing: 0.2,
    packs: [{ n: 25, off: 0 }, { n: 100, off: 0.1 }, { n: 300, off: 0.2 }],
    note: 'One cup for every customer.' },
  ice: { name: 'Ice', one: 'cube', icon: '🧊', base: 0.01, swing: 0.3,
    packs: [{ n: 100, off: 0 }, { n: 300, off: 0.1 }, { n: 1000, off: 0.2 }],
    note: 'Ice melts at the end of every day!' },
};
export const SUPPLY_ORDER = ['lemons', 'sugar', 'cups', 'ice'];

export const RECIPE_LIMITS = { lemons: [1, 10], sugar: [0, 10], ice: [0, 8] };
export const PRICE_LIMITS = [0.1, 12];

// Places to sell. traffic = people walking by per day at 2.5 stars.
export const LOCATIONS = [
  { id: 'street', name: 'Home Street', icon: '🏡', traffic: 75, price: 1.0, rent: 0, permit: 0, rep: 0,
    weekend: 1.3, weatherSens: 1, sweet: 0, blurb: 'Quiet street by your house. Free to sell here!' },
  { id: 'park', name: 'City Park', icon: '🌳', traffic: 130, price: 1.1, rent: 4, permit: 40, rep: 30,
    weekend: 1.45, weatherSens: 1.1, sweet: -0.8, blurb: 'Lots of families. Kids here like it sweet!' },
  { id: 'beach', name: 'Beach Boardwalk', icon: '🏖️', traffic: 210, price: 1.35, rent: 14, permit: 160, rep: 45,
    weekend: 1.4, weatherSens: 1.45, sweet: 0, iceLove: 1, blurb: 'Packed on hot days, empty in the rain. Extra ice!' },
  { id: 'downtown', name: 'Downtown', icon: '🏙️', traffic: 320, price: 1.55, rent: 30, permit: 450, rep: 55, tier: 1,
    weekend: 0.75, weatherSens: 0.65, sweet: 0.8, blurb: 'Busy office workers on weekdays. They like it tart.' },
  { id: 'stadium', name: 'Sports Stadium', icon: '🏟️', traffic: 420, price: 1.85, rent: 80, permit: 1800, rep: 68, tier: 2,
    weekend: 1.6, weatherSens: 0.9, sweet: 0, blurb: 'Huge crowds on game days and weekends.' },
  { id: 'fair', name: 'Summer Fair', icon: '🎡', traffic: 520, price: 2.1, rent: 160, permit: 6000, rep: 80, tier: 3,
    weekend: 1.35, weatherSens: 1.1, sweet: -0.5, blurb: 'Rides, games and giant crowds with money to spend.' },
];

// Your stand grows through these tiers.
export const TIERS = [
  { name: 'Crate Stand', icon: '📦', cost: 0, wtp: 1.0, speed: 1.0, stop: 0, blurb: 'Some crates and a hand-drawn sign.' },
  { name: 'Wooden Stand', icon: '🪵', cost: 120, wtp: 1.1, speed: 0.9, stop: 0.05, blurb: 'A real stand with a striped roof. People trust it more.' },
  { name: 'Lemonade Cart', icon: '🛒', cost: 900, wtp: 1.2, speed: 0.8, stop: 0.1, blurb: 'A shiny cart with wheels and a big umbrella.' },
  { name: 'Lemon Truck', icon: '🚚', cost: 5000, wtp: 1.3, speed: 0.7, stop: 0.15, blurb: 'Your own food truck! Serves people fast.' },
  { name: 'Lemon Café', icon: '🏪', cost: 22000, wtp: 1.4, speed: 0.6, stop: 0.22, blurb: 'A real shop with tables. The fanciest lemonade in town.' },
];

// One-time equipment purchases.
export const UPGRADES = [
  { id: 'umbrella', name: 'Shade Umbrella', icon: '⛱️', cost: 25, desc: '+15% more people stop on hot and sunny days.' },
  { id: 'sign', name: 'Painted Sign', icon: '🪧', cost: 30, desc: '+10% more people notice your stand.' },
  { id: 'juicer', name: 'Hand Juicer', icon: '🍋', cost: 45, desc: 'Squeeze more juice: 10 cups per pitcher instead of 8.' },
  { id: 'cashbox', name: 'Cash Box', icon: '💰', cost: 50, desc: 'Make change faster. Serve people 20% quicker.' },
  { id: 'cooler', name: 'Ice Cooler', icon: '🧊', cost: 70, desc: 'Half of your leftover ice stays frozen overnight.' },
  { id: 'speaker', name: 'Music Speaker', icon: '🎵', cost: 110, desc: 'Fun music! People wait longer in line and +5% stop.' },
  { id: 'fridge', name: 'Lemon Fridge', icon: '❄️', cost: 150, desc: 'Lemons stay fresh for 7 days instead of 4.' },
  { id: 'neon', name: 'Neon Sign', icon: '💡', cost: 400, desc: '+20% more people notice your stand.', needs: 'sign' },
  { id: 'projuicer', name: 'Electric Juicer', icon: '⚡', cost: 450, desc: '12 cups per pitcher!', needs: 'juicer' },
  { id: 'freezer', name: 'Ice Freezer', icon: '🥶', cost: 500, desc: 'ALL leftover ice stays frozen overnight.', needs: 'cooler' },
  { id: 'card', name: 'Card Reader', icon: '💳', cost: 600, desc: 'People can pay with cards. They spend 10% more and pay faster.', needs: 'cashbox' },
];

// Staff you can hire. Wage is paid every day you open.
export const STAFF = [
  { id: 'helper', name: 'Helper Sam', icon: '🧑‍🍳', wage: 8, desc: 'Pours while you take money. Serve 40% faster.' },
  { id: 'promoter', name: 'Promoter Maya', icon: '📣', wage: 14, desc: 'Waves a big sign down the road. +20% people walk by.', rep: 35 },
  { id: 'manager', name: 'Manager Leo', icon: '🧑‍💼', wage: 45, desc: 'Keeps the line moving. Serve 35% faster, +8% happier customers.', rep: 60 },
];

// Advertising for one day.
export const ADS = [
  { id: 'none', name: 'No ads', icon: '🚫', cost: 0, boost: 0 },
  { id: 'flyers', name: 'Flyers', icon: '📄', cost: 3, boost: 0.12 },
  { id: 'paper', name: 'Newspaper Ad', icon: '📰', cost: 15, boost: 0.3, rep: 25 },
  { id: 'radio', name: 'Radio Ad', icon: '📻', cost: 60, boost: 0.55, rep: 50 },
  { id: 'tv', name: 'TV Commercial', icon: '📺', cost: 220, boost: 1.0, rep: 70 },
];

// Businesses you can own. They earn money every day, even when your stand is closed.
export const BUSINESSES = [
  { id: 'stand2', name: "Friend's Lemonade Stand", icon: '🍋', cost: 150, income: [4, 11], sens: 1, blurb: 'Your friend runs a second stand. You keep part of the money.' },
  { id: 'cookies', name: 'Cookie Table', icon: '🍪', cost: 400, income: [9, 20], sens: 0.3, blurb: 'Cookies sell in any weather. Good when it rains!' },
  { id: 'popsicle', name: 'Popsicle Cart', icon: '🍧', cost: 1100, income: [12, 55], sens: 1.6, blurb: 'Huge money on hot days, slow on cold ones.' },
  { id: 'cocoa', name: 'Hot Cocoa Hut', icon: '☕', cost: 2500, income: [30, 95], sens: -1.2, blurb: 'Does best when it is cold and rainy. Opposite of lemonade!' },
  { id: 'juicetruck', name: 'Juice Truck', icon: '🚚', cost: 6000, income: [70, 170], sens: 0.8, blurb: 'Drives to wherever the crowds are.' },
  { id: 'smoothie', name: 'Smoothie Shop', icon: '🥤', cost: 15000, income: [170, 380], sens: 0.6, blurb: 'A popular shop at the mall.' },
  { id: 'orchard', name: 'Lemon Orchard', icon: '🌳', cost: 35000, income: [320, 700], sens: 0.2, blurb: 'Grow your own lemons! Also makes your lemons 40% cheaper.' },
  { id: 'factory', name: 'Lemonade Factory', icon: '🏭', cost: 70000, income: [700, 1500], sens: 0.4, blurb: 'Bottles of your lemonade in every store in town.' },
];
export const BIZ_LEVEL_MULT = [0, 1, 1.7, 2.6]; // income multiplier per level
export const BIZ_LEVEL_COST = [0, 1, 1.2, 2.0];  // upgrade cost (× base cost) to reach level

// Rank titles, by number of goals finished.
export const RANKS = [
  { at: 0, name: 'Lemon Rookie', icon: '🌱' },
  { at: 3, name: 'Stand Starter', icon: '🍋' },
  { at: 7, name: 'Street Seller', icon: '🏡' },
  { at: 11, name: 'Local Favorite', icon: '⭐' },
  { at: 16, name: 'Juice Boss', icon: '😎' },
  { at: 21, name: 'Business Owner', icon: '💼' },
  { at: 26, name: 'Lemon Mogul', icon: '🎩' },
  { at: 31, name: 'Lemonade Tycoon', icon: '👑' },
];

// Goals are finished in order; three are active at a time.
// check(state) returns [current, target].
export const GOALS = [
  { id: 'first', text: 'Sell your first cup of lemonade', reward: 5, check: (s) => [s.stats.cups, 1] },
  { id: 'profit10', text: 'Make $10 profit in one day', reward: 5, check: (s) => [s.stats.bestProfit, 10], money: true },
  { id: 'serve50', text: 'Serve 50 customers', reward: 8, check: (s) => [s.stats.cups, 50] },
  { id: 'upgrade1', text: 'Buy your first upgrade', reward: 5, check: (s) => [Object.keys(s.upgrades).length, 1], lesson: 'invest' },
  { id: 'save20', text: 'Put $20 in your savings', reward: 5, check: (s) => [s.savings, 20], money: true, lesson: 'saving' },
  { id: 'stars2', text: 'Reach 2 stars ⭐⭐', reward: 10, check: (s) => [s.rep, 40], stars: true },
  { id: 'park', text: 'Unlock City Park', reward: 10, check: (s) => [s.unlocked.includes('park') ? 1 : 0, 1] },
  { id: 'perfect5', text: 'Get 5 "Perfect!" cups in one day', reward: 10, check: (s) => [s.stats.bestPerfect, 5] },
  { id: 'tier1', text: 'Build a Wooden Stand', reward: 15, check: (s) => [s.tier, 1] },
  { id: 'profit30', text: 'Make $30 profit in one day', reward: 15, check: (s) => [s.stats.bestProfit, 30], money: true },
  { id: 'biz1', text: 'Buy your first business', reward: 20, check: (s) => [bizCount(s), 1], lesson: 'business' },
  { id: 'hire', text: 'Hire a helper', reward: 15, check: (s) => [Object.values(s.staff).filter(Boolean).length, 1], lesson: 'fixed' },
  { id: 'serve500', text: 'Serve 500 customers', reward: 25, check: (s) => [s.stats.cups, 500] },
  { id: 'stars3', text: 'Reach 3 stars ⭐⭐⭐', reward: 25, check: (s) => [s.rep, 60], stars: true },
  { id: 'beach', text: 'Unlock the Beach Boardwalk', reward: 25, check: (s) => [s.unlocked.includes('beach') ? 1 : 0, 1] },
  { id: 'cups100', text: 'Sell 100 cups in one day', reward: 30, check: (s) => [s.stats.bestCups, 100] },
  { id: 'nw1000', text: 'Reach a net worth of $1,000', reward: 40, check: (s) => [netWorth(s), 1000], money: true, lesson: 'networth' },
  { id: 'profit100', text: 'Make $100 profit in one day', reward: 40, check: (s) => [s.stats.bestProfit, 100], money: true },
  { id: 'downtown', text: 'Unlock Downtown', reward: 50, check: (s) => [s.unlocked.includes('downtown') ? 1 : 0, 1] },
  { id: 'tier2', text: 'Get a Lemonade Cart', reward: 60, check: (s) => [s.tier, 2] },
  { id: 'biz3', text: 'Own 3 different businesses', reward: 75, check: (s) => [bizCount(s), 3], lesson: 'diversify' },
  { id: 'stars4', text: 'Reach 4 stars ⭐⭐⭐⭐', reward: 75, check: (s) => [s.rep, 80], stars: true },
  { id: 'nw5000', text: 'Reach a net worth of $5,000', reward: 100, check: (s) => [netWorth(s), 5000], money: true },
  { id: 'stadium', text: 'Unlock the Sports Stadium', reward: 150, check: (s) => [s.unlocked.includes('stadium') ? 1 : 0, 1] },
  { id: 'profit400', text: 'Make $400 profit in one day', reward: 150, check: (s) => [s.stats.bestProfit, 400], money: true },
  { id: 'tier3', text: 'Buy a Lemon Truck', reward: 250, check: (s) => [s.tier, 3] },
  { id: 'nw20000', text: 'Reach a net worth of $20,000', reward: 300, check: (s) => [netWorth(s), 20000], money: true },
  { id: 'fair', text: 'Unlock the Summer Fair', reward: 400, check: (s) => [s.unlocked.includes('fair') ? 1 : 0, 1] },
  { id: 'stars5', text: 'Reach 5 stars ⭐⭐⭐⭐⭐', reward: 400, check: (s) => [s.rep, 97], stars: true },
  { id: 'tier4', text: 'Open the Lemon Café', reward: 800, check: (s) => [s.tier, 4] },
  { id: 'orchard', text: 'Own the Lemon Orchard', reward: 1000, check: (s) => [s.biz.orchard || 0, 1] },
  { id: 'tycoon', text: 'Reach $100,000 net worth — become a TYCOON!', reward: 5000, check: (s) => [netWorth(s), WIN_NET_WORTH], money: true },
];

export function bizCount(s) {
  return Object.values(s.biz).filter((l) => l > 0).length;
}
export function bizValue(s) {
  let v = 0;
  for (const b of BUSINESSES) {
    const lvl = s.biz[b.id] || 0;
    for (let i = 1; i <= lvl; i++) v += b.cost * BIZ_LEVEL_COST[i];
  }
  return v;
}
export function netWorth(s) {
  return s.cash + s.savings + bizValue(s) - s.loan;
}

// Money lessons from Zest the lemon. Unlocked as they come up in the game.
export const LESSONS = {
  profit: { title: 'Revenue vs. Profit', icon: '💵',
    text: '<b>Revenue</b> is all the money customers give you.<br><b>Profit</b> is what is left after you pay for everything: lemons, sugar, cups, ice, rent and ads.<br><br><i>Profit = Revenue − Costs</i><br><br>A busy day is only a good day if you made a profit!' },
  costPerCup: { title: 'Cost per Cup', icon: '🧮',
    text: 'Every cup costs you money to make: a bit of lemon, a bit of sugar, the cup and the ice.<br><br>If a cup costs you <b>$0.15</b> to make and you sell it for <b>$1.00</b>, you keep <b>$0.85</b>.<br><br>Always know your cost per cup — never sell for less!' },
  demand: { title: 'Supply & Demand', icon: '⚖️',
    text: 'When your price is <b>low</b>, more people buy — but you earn less on each cup.<br>When your price is <b>high</b>, you earn more per cup — but fewer people buy.<br><br>The best price is somewhere in the middle. And on hot days, people will pay more!' },
  bulk: { title: 'Buying in Bulk', icon: '📦',
    text: 'Big packs cost less for each lemon. Buying 144 lemons saves 20%!<br><br>But careful: if you buy too many lemons, they go bad before you use them. Then the savings are gone.<br><br>Buy big for things that last (cups, sugar). Buy smart for things that spoil.' },
  waste: { title: 'Waste Costs Money', icon: '🗑️',
    text: 'Rotten lemons and melted ice are money thrown away.<br><br>Good business owners plan how much they need. A cooler or fridge can help — it costs money now but saves money later.' },
  weather: { title: 'Weather & Risk', icon: '🌦️',
    text: 'The forecast is a <b>guess</b>, not a promise. "30% chance of rain" means it rains about 3 out of 10 times.<br><br>Businesses plan for what is <i>likely</i> but stay ready for surprises. Don\'t buy 200 cups of ice when it might storm!' },
  ads: { title: 'Advertising', icon: '📣',
    text: 'Ads bring more people to your stand. But ads cost money!<br><br>An ad is worth it only if the <b>extra profit</b> is bigger than the ad cost. Ads work best on sunny days when people are thirsty.' },
  invest: { title: 'Investing', icon: '📈',
    text: 'An <b>investment</b> is spending money now to earn more later.<br><br>If a $45 juicer helps you earn $3 more every day, it <b>pays for itself</b> in 15 days. After that, it\'s all extra money!' },
  fixed: { title: 'Fixed & Variable Costs', icon: '🧾',
    text: '<b>Variable costs</b> change with how much you sell: lemons, sugar, cups, ice.<br><b>Fixed costs</b> you pay no matter what: rent and wages.<br><br>On a slow rainy day, fixed costs can make you lose money. Plan for them!' },
  saving: { title: 'Saving & Interest', icon: '🐷',
    text: 'Money in savings earns <b>interest</b> — the bank pays you for keeping it there!<br><br>And the interest earns interest too. That\'s called <b>compound interest</b>. Save early and your money grows by itself.' },
  loan: { title: 'Borrowing Money', icon: '🏦',
    text: 'A <b>loan</b> lets you buy something now. But you must pay it back <b>plus interest</b>.<br><br>Borrowing is smart only if what you buy earns more than the interest. Otherwise, it makes you poorer.' },
  reputation: { title: 'Happy Customers', icon: '😊',
    text: 'Happy customers tell their friends. That\'s your <b>reputation</b> (your stars).<br><br>More stars = more customers who will pay more. Great taste and fair prices build stars. Long lines and sell-outs lose them.' },
  location: { title: 'Location & Choices', icon: '📍',
    text: 'Busy places have more customers but cost rent. Choosing one place means giving up another — that\'s called <b>opportunity cost</b>.<br><br>Ask: will the extra customers pay more than the rent?' },
  business: { title: 'Owning a Business', icon: '🏢',
    text: 'A business earns money even when you\'re not working. That is called <b>passive income</b>.<br><br>To know if it is a good deal, see how many days until it <b>pays for itself</b>.' },
  diversify: { title: "Don't Put All Your Lemons in One Basket", icon: '🧺',
    text: 'If all your businesses need sunny weather, one rainy week hurts them all.<br><br>Owning different kinds of businesses (like a Hot Cocoa Hut!) keeps money coming in no matter what. That\'s called <b>diversifying</b>.' },
  networth: { title: 'Net Worth', icon: '🏆',
    text: '<b>Net worth</b> = everything you own − everything you owe.<br><br>Cash + savings + businesses − loans.<br><br>Tycoons grow their net worth by making smart choices over and over.' },
  insurance: { title: 'Insurance', icon: '☂️',
    text: '<b>Insurance</b> is paying a little money to protect yourself from a big loss.<br><br>Most of the time nothing bad happens and you "lose" the small cost. But when something bad does happen, you\'re protected!' },
};

// Random news for the morning. Some are just news; others ask you to decide.
// `when(s)` limits when an event can show up.
export const EVENTS = [
  { id: 'lemonShort', icon: '🍋', title: 'Lemon Shortage!', text: 'A storm hit the lemon farms. Lemons cost twice as much today.', mods: { lemons: 2 } },
  { id: 'lemonSale', icon: '🏷️', title: 'Lemon Sale!', text: 'The market has too many lemons. Lemons are half price today!', mods: { lemons: 0.5 } },
  { id: 'sugarSale', icon: '🏷️', title: 'Sugar Sale', text: 'Sugar is 50% off at the market today.', mods: { sugar: 0.5 } },
  { id: 'cupShort', icon: '🥤', title: 'Cup Factory Closed', text: 'The cup factory is fixing a machine. Cups cost 60% more today.', mods: { cups: 1.6 } },
  { id: 'iceSale', icon: '🧊', title: 'Ice Sale', text: 'The ice shop has extra ice. Ice is half price today!', mods: { ice: 0.5 } },
  { id: 'parade', icon: '🎉', title: 'Parade Downtown!', text: 'There is a big parade downtown today. Twice as many people!', mods: { loc: { downtown: 2 } }, when: (s) => s.unlocked.includes('downtown') },
  { id: 'bigGame', icon: '🏈', title: 'Big Game Today!', text: 'The home team plays at the stadium today. Huge crowds!', mods: { loc: { stadium: 1.9 } }, when: (s) => s.unlocked.includes('stadium') },
  { id: 'surf', icon: '🏄', title: 'Surf Contest', text: 'A surf contest is at the beach. More people than usual!', mods: { loc: { beach: 1.6 } }, when: (s) => s.unlocked.includes('beach') },
  { id: 'soccer', icon: '⚽', title: 'Kids Soccer Tournament', text: 'Soccer games at the park all day. Lots of thirsty kids!', mods: { loc: { park: 1.7 } }, when: (s) => s.unlocked.includes('park') },
  { id: 'yardSale', icon: '🏷️', title: 'Street Yard Sale', text: 'Everyone on your street is having a yard sale. More people are walking around!', mods: { loc: { street: 1.8 } } },
  { id: 'construction', icon: '🚧', title: 'Road Work', text: 'Workers are fixing your street. Fewer people will walk by today.', mods: { loc: { street: 0.5 } } },
  { id: 'competitor', icon: '😤', title: 'A Rival Stand!', text: 'Another kid opened a lemonade stand nearby. Customers will be pickier about price today.', mods: { wtp: 0.85 } },
  { id: 'blogger', icon: '📸', title: 'Food Blogger in Town', text: 'A famous food blogger is visiting! If they love your lemonade, your stars go up.', mods: { blogger: true } },
  { id: 'lemonDay', icon: '🎈', title: 'National Lemonade Day!', text: 'Everyone wants lemonade today. More customers who will pay more!', mods: { traffic: 1.3, wtp: 1.15 } },
  // Decisions
  { id: 'oldLemons', icon: '🍋', title: 'Cheap Old Lemons', text: 'A farmer offers you 40 lemons for just $2. But they are old and will go bad after today.',
    choices: [{ label: 'Buy them ($2)', cost: 2, effect: { lemons: 40, age: 99 }, lesson: 'waste' }, { label: 'No thanks' }] },
  { id: 'fundraiser', icon: '🏫', title: 'School Fundraiser', text: 'Your school asks if you can donate $10 to buy new books. People will hear about it!',
    choices: [{ label: 'Donate $10', cost: 10, effect: { rep: 6 }, say: 'Thank you! People think your stand is great.' }, { label: 'Not this time' }] },
  { id: 'dogWalk', icon: '🐕', title: 'Dog-Walking Job', text: 'Mrs. Lee will pay you $8 to walk her dog this morning. But then you will open your stand 2 hours late.',
    choices: [{ label: 'Walk the dog (+$8)', cost: -8, effect: { lateStart: 120 }, lesson: 'location' }, { label: 'Stay at my stand' }],
    when: (s) => s.day < 40 },
  { id: 'insurance', icon: '☂️', title: 'Rain Insurance', text: 'An insurance agent offers a deal: pay $4 now. If it rains or storms today, you get $25.',
    choices: [{ label: 'Buy insurance ($4)', cost: 4, effect: { insurance: 25 }, lesson: 'insurance' }, { label: 'Take my chances' }] },
  { id: 'sugarBulk', icon: '🍚', title: 'Big Sugar Deal', text: 'The baker has extra sugar: 60 scoops for $1.80. That is 40% off!',
    choices: [{ label: 'Buy it ($1.80)', cost: 1.8, effect: { sugar: 60 }, lesson: 'bulk' }, { label: 'No thanks' }] },
  { id: 'contest', icon: '🏆', title: 'Lemonade Contest', text: 'There is a lemonade taste contest today. It costs $5 to enter. The best recipe wins $30!',
    choices: [{ label: 'Enter ($5)', cost: 5, effect: { contest: 30 } }, { label: 'Skip it' }] },
  { id: 'friendIdea', icon: '💡', title: "Friend's Business Idea", text: 'Your friend wants $15 to start a car wash. If it works (about half the time), they pay you back $40 in a week.',
    choices: [{ label: 'Invest $15', cost: 15, effect: { gamble: { pay: 40, days: 7, chance: 0.5 } }, lesson: 'invest' }, { label: 'Keep my money' }], when: (s) => s.cash >= 40 },
  { id: 'cupDeal', icon: '🥤', title: 'Party Leftovers', text: 'A neighbor has 80 leftover cups from a party. They will sell them for $1.',
    choices: [{ label: 'Buy them ($1)', cost: 1, effect: { cups: 80 } }, { label: 'No thanks' }] },
  { id: 'freeSample', icon: '🎁', title: 'Free Samples?', text: 'Give away free cups for the first hour? It costs you some lemonade, but more people will try it and like you.',
    choices: [{ label: 'Give free samples', effect: { samples: true }, lesson: 'ads' }, { label: 'No free cups' }] },
];

// Things customers say. Picked from by the simulator.
export const SAY = {
  perfect: ['Perfect! 😍', 'Best ever! 🤩', 'Yum! ⭐', 'So good! 😋', 'Wow! 💛'],
  good: ['Tasty! 🙂', 'Nice! 👍', 'Refreshing!', 'Mmm! 🙂'],
  sour: ['Too sour! 😖', 'Sooo sour! 🍋', 'Needs sugar 😬'],
  sweet: ['Too sweet! 🍬', 'Sugar overload 😵', 'Needs lemon'],
  weak: ['Watery... 💧', 'Weak taste 😐'],
  strong: ['Too strong! 😵'],
  warm: ['Not cold! 🥵', 'Needs ice! 🧊'],
  cold: ['Brr, too icy 🥶', 'Too much ice'],
  pricey: ['Too pricey! 💸', 'Too much $$ 😮', 'No thanks, $$', 'Too expensive!'],
  line: ['Line\'s too long! 😤', 'Can\'t wait 🙄', 'Too slow! ⏰'],
  soldout: ['Sold out?! 😢', 'Aww, all gone 😞'],
  tip: ['Keep the change! 💰', 'Here\'s a tip! 🪙'],
};

export const NAMES_POOL = ['Sam', 'Alex', 'Jordan', 'Riley', 'Max', 'Charlie', 'Leo', 'Mia'];
