# 🍋 Lemon Lane

A lemonade-stand tycoon game for kids that teaches money and business basics. Built for Android phones and Amazon Fire (Kids) tablets. It also runs in any browser.

**▶ Play in the browser:** https://z1fire.github.io/lemon-lane/
**📱 Download the APK:** [latest release](https://github.com/z1fire/lemon-lane/releases/latest) → `LemonLane.apk`

## What's in the game

- **Every morning:** check the weather forecast (it can be wrong!), read the news, pick where to sell, set your recipe (lemons, sugar, ice) and your price, and choose advertising.
- **Shop:** prices change daily. Big packs are cheaper per item, but lemons go bad and ice melts overnight.
- **The day:** an animated street scene. Customers walk by, stop, buy, and tell you what they think ("Too sour!", "Too pricey!", "Perfect!"). Long lines, sell-outs and surprise weather all matter.
- **Evening report:** money in vs. profit, supplies used, waste, rent and wages, plus advice from Zest the lemon.
- **Progress:** 32 goals, 8 ranks, 6 places to sell (street → park → beach → downtown → stadium → summer fair), 5 stand tiers (crate → café), 11 upgrades, 3 staff, and 8 businesses that earn money every day. Reach **$100,000 net worth** to become a Lemonade Tycoon.
- **Money skills:** a savings account with weekly compound interest, loans with interest, decision events (insurance, investing in a friend's idea, opportunity cost), a daily Money Quiz, and 16 lessons in Zest's Money Notebook.
- **Easy** and **Normal** difficulty. No ads, no accounts, no in-app purchases. Your progress is saved on the device.

## Installing on an Amazon Fire / Fire Kids tablet

1. On the **parent profile**, open **Settings → Security & Privacy → Apps from Unknown Sources** and allow the **Silk Browser** (or Files).
2. Open Silk, go to the [latest release](https://github.com/z1fire/lemon-lane/releases/latest), and tap **LemonLane.apk**.
3. Open the download and tap **Install**.
4. To add it to a child profile: **Amazon Kids / Parent Dashboard → Add Content → Apps → Lemon Lane**.

Newer releases install over the old one and keep the saved game.

## Development

```bash
npm install
npm run dev        # play in the browser
npm run balance    # headless balance check: a bot plays many games
npm run icons      # regenerate icons
```

Every push to `main` makes GitHub Actions build a signed APK, publish it as a GitHub Release, and deploy the web version to GitHub Pages.
