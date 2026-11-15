// End-to-end demo walkthrough of the BEATLINK web build.
const { chromium } = require('playwright');
const OUT = process.env.OUT || __dirname + '/screenshots/demo';
const BASE = process.env.BASE || 'http://localhost:8081';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: process.env.LOCALE || 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const tid = (id) => page.locator(`[data-testid="${id}"]`).first();

  await page.goto(BASE + '/');
  await page.waitForTimeout(2500);
  await shot('01-welcome');

  await tid('welcome-demo').click();
  await page.waitForTimeout(1200);
  await shot('02-onboarding-identity');
  await tid('onboarding-name').fill('Lou Néon');
  await tid('onboarding-age').click();
  await tid('onboarding-next').click();
  await page.waitForTimeout(800);
  for (const r of ['role-producer', 'role-beatmaker', 'skill-production', 'skill-mixing']) await tid(r).click();
  await shot('03-onboarding-craft');
  await tid('onboarding-next').click();
  await page.waitForTimeout(800);
  for (const g of ['genre-alt_rnb', 'genre-rnb', 'genre-soul']) await tid(g).click();
  const tag = tid('tag-input');
  await tag.fill('Frank Ocean'); await tag.press('Enter');
  await tag.fill('SZA'); await tag.press('Enter');
  await shot('04-onboarding-sound');
  await tid('onboarding-next').click();
  await page.waitForTimeout(800);
  for (const g of ['goal-find_singers', 'goal-collaborate', 'availability-looking']) await tid(g).click();
  await tid('onboarding-looking').fill('Une voix soul pour un EP alt R&B');
  await shot('05-onboarding-intent');
  await tid('onboarding-next').click();
  await page.waitForTimeout(800);
  await shot('06-onboarding-sounds');
  await tid('onboarding-next').click();
  await page.waitForTimeout(2000);
  await shot('07-discover');

  await tid('discover-play').click();
  await page.waitForTimeout(2500);
  await shot('08-discover-playing');
  const cardText = await tid('discover-card').innerText();
  console.log('audio progressed:', /0:0[1-9]/.test(cardText));

  await tid('discover-fit').click();
  await page.waitForTimeout(1000);
  await shot('09-fit-breakdown');
  await page.goBack();
  await page.waitForTimeout(800);

  // Link until a mutual link happens (demo profiles koz/lina/sahel/saya have shown interest).
  let linked = false;
  for (let i = 0; i < 8 && !linked; i++) {
    const name = await page.locator('[data-testid="discover-card"] [data-testid="discover-open-profile"]').first().innerText().catch(() => '');
    await tid('discover-link').click();
    await page.waitForTimeout(1200);
    linked = await tid('linked-message').isVisible().catch(() => false);
    console.log('linked with card', i, name.split('\n')[0], linked);
  }
  await shot('10-new-link');
  await tid('linked-message').click();
  await page.waitForTimeout(1200);
  await tid('chat-input').fill('Salut ! Ton topline sur Lune est incroyable. On tente un truc ?');
  await tid('chat-send').click();
  await tid('chat-input').fill('https://soundcloud.com/lou-neon/demo');
  await tid('chat-send').click();
  await page.waitForTimeout(1000);
  await shot('11-chat');

  await page.goto(BASE + '/links');
  await page.waitForTimeout(1500);
  await shot('12-links');
  await tid('segment-requests').click();
  await page.waitForTimeout(800);
  await shot('13-requests');
  await tid('request-accept').click();
  await page.waitForTimeout(1500);
  await shot('14-chat-after-accept');

  await page.goto(BASE + '/messages');
  await page.waitForTimeout(1200);
  await shot('15-messages');

  await page.goto(BASE + '/me');
  await page.waitForTimeout(1500);
  await shot('16-me');

  await page.goto(BASE + '/settings');
  await page.waitForTimeout(1200);
  await shot('17-settings');

  await page.goto(BASE + '/profile/demo-mira');
  await page.waitForTimeout(1500);
  await shot('18-profile-other');
  await tid('profile-menu').click();
  await page.waitForTimeout(500);
  await shot('19-profile-menu');
  await tid('menu-block').click();
  await page.waitForTimeout(500);
  await shot('20-block-confirm');
  await tid('dialog-confirm').click();
  await page.waitForTimeout(1200);
  await page.goto(BASE + '/settings/blocked');
  await page.waitForTimeout(1000);
  await shot('21-blocked');

  await page.goto(BASE + '/propose/demo-dex');
  await page.waitForTimeout(1200);
  await tid('propose-title').fill('EP garage nocturne');
  await tid('propose-message').fill('Je suis tombé sur ton 2-step, j’adore. Je cherche à produire un EP garage/R&B. Partant ?');
  await shot('22-propose');
  await tid('propose-send').click();
  await page.waitForTimeout(1200);
  await shot('23-after-propose');

  console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 1));
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e); process.exit(1); });
