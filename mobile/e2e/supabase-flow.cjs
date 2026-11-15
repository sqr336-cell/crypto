// Two real users against the local Supabase stack (web build on :8082).
const { chromium } = require('playwright');
const path = require('path');
const { createClient } = require(path.join(__dirname, '..', '..', 'node_modules', '@supabase', 'supabase-js'));
const { execSync } = require('child_process');
const OUT = process.env.OUT || __dirname + '/screenshots/supabase';
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8082';
const ASSETS = path.join(__dirname, '..', 'assets', 'demo');
const status = JSON.parse(execSync('npx supabase status -o json', { cwd: path.join(__dirname, '..', '..') }).toString().replace(/^[^{]*/, ''));
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = Date.now().toString(36);

async function signUpAndOnboard(page, who) {
  const tid = (id) => page.locator(`[data-testid="${id}"]`).first();
  await page.goto(BASE + '/');
  await page.waitForTimeout(2000);
  await tid('welcome-email').click();
  await page.waitForTimeout(600);
  await tid('auth-email').fill(`${who.name.toLowerCase()}.${run}@beatlink.test`);
  await tid('auth-password').fill('password-123');
  await tid('auth-terms').click();
  await tid('auth-submit').click();
  await page.waitForTimeout(2500);
  // Identity with a real photo upload
  if (who.photo) {
    const chooser = page.waitForEvent('filechooser');
    await tid('onboarding-photo').click();
    await (await chooser).setFiles(who.photo);
    await page.waitForTimeout(500);
  }
  await tid('onboarding-name').fill(who.name);
  await tid('onboarding-handle').fill(`${who.name.toLowerCase()}${run}`);
  await tid('onboarding-age').click();
  await tid('onboarding-next').click();
  await page.waitForTimeout(1500);
  for (const r of who.roles) await tid(`role-${r}`).click();
  await tid('onboarding-next').click();
  await page.waitForTimeout(1000);
  for (const g of who.genres) await tid(`genre-${g}`).click();
  await tid('onboarding-next').click();
  await page.waitForTimeout(1000);
  for (const g of who.goals) await tid(`goal-${g}`).click();
  await tid('onboarding-next').click();
  await page.waitForTimeout(1000);
  if (who.sound) {
    await tid('onboarding-add-sound').click();
    await page.waitForTimeout(800);
    const chooser = page.waitForEvent('filechooser');
    await tid('add-sound-pick').click();
    await (await chooser).setFiles(who.sound);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${who.name}-add-sound.png` });
    await tid('add-sound-submit').click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${who.name}-onboarding-sounds.png` });
  }
  await tid('onboarding-next').click();
  await page.waitForTimeout(2500);
  const { data } = await admin.from('profiles').select('id, avatar_path, onboarded_at').eq('display_name', who.name).order('created_at', { ascending: false }).limit(1).single();
  return data;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/DevTools|favicon/.test(m.text())) errors.push(`${name} console: ${m.text().slice(0, 200)}`); });
    return page;
  };
  const A = await mk('Alma');
  const B = await mk('Bruno');
  const tA = (id) => A.locator(`[data-testid="${id}"]`).first();
  const tB = (id) => B.locator(`[data-testid="${id}"]`).first();

  const alma = await signUpAndOnboard(A, { name: 'Alma', photo: `${ASSETS}/images/lina-avatar.jpg`, roles: ['singer', 'songwriter'], genres: ['rnb', 'soul'], goals: ['find_beatmakers'], sound: `${ASSETS}/audio/koz-lune.m4a` });
  console.log('alma', alma);
  await A.screenshot({ path: `${OUT}/01-alma-discover.png` });
  const bruno = await signUpAndOnboard(B, { name: 'Bruno', roles: ['producer'], genres: ['rnb', 'alt_rnb'], goals: ['find_singers'] });
  console.log('bruno', bruno);

  const tracks = await admin.from('tracks').select('title, duration_ms, waveform, storage_path').eq('owner_id', alma.id);
  console.log('alma tracks', tracks.data.map((t) => [t.title, t.duration_ms, t.waveform?.length, t.storage_path]));

  // Alma links Bruno, then Bruno links back -> mutual link.
  await A.goto(`${BASE}/profile/${bruno.id}`);
  await A.waitForTimeout(2000);
  await tA('profile-link').click();
  await A.waitForTimeout(1500);
  await A.goto(`${BASE}/messages`);
  await A.waitForTimeout(1500);
  await B.goto(`${BASE}/profile/${alma.id}`);
  await B.waitForTimeout(2000);
  await B.screenshot({ path: `${OUT}/02-bruno-sees-alma.png` });
  await tB('profile-link').click();
  await B.waitForTimeout(2000);
  await B.screenshot({ path: `${OUT}/03-bruno-new-link.png` });
  const linkedVisible = await tB('linked-message').isVisible();
  console.log('mutual link modal:', linkedVisible);
  await tB('linked-message').click();
  await B.waitForTimeout(1500);
  await tB('chat-input').fill('Salut Alma, ta topline est folle. On bosse ensemble ?');
  await tB('chat-send').click();
  await B.waitForTimeout(3000);

  // Alma sitting on Messages should see the conversation appear live (realtime).
  await A.screenshot({ path: `${OUT}/04-alma-messages-live.png` });
  const rows = await A.locator('[data-testid="conversation-row"]').count();
  console.log('alma conversation rows (live):', rows);
  await A.locator('[data-testid="conversation-row"]').first().click();
  await A.waitForTimeout(1500);
  await tA('chat-input').fill('Carrément ! Je t’envoie une idée.');
  await tA('chat-send').click();
  const chooser = A.waitForEvent('filechooser');
  await tA('chat-attach').click();
  await (await chooser).setFiles(`${ASSETS}/audio/lina-neon.m4a`);
  await A.waitForTimeout(4000);
  await A.screenshot({ path: `${OUT}/05-alma-chat.png` });

  // Bruno sees both live without reloading, then plays the audio message.
  await B.waitForTimeout(2000);
  await B.screenshot({ path: `${OUT}/06-bruno-chat-live.png` });
  const bText = await B.locator('body').innerText();
  console.log('bruno sees text:', bText.includes('Je t’envoie une idée'));
  const playButtons = B.locator('[aria-label="Lire"]');
  console.log('play buttons in bruno chat:', await playButtons.count());
  if (await playButtons.count()) {
    await playButtons.last().click();
    await B.waitForTimeout(3000);
    const after = await B.locator('body').innerText();
    console.log('audio message progressed:', /0:0[1-9]/.test(after));
    await B.screenshot({ path: `${OUT}/07-bruno-playing.png` });
  }

  // Bruno proposes a project; Alma accepts it.
  await B.goto(`${BASE}/propose/${alma.id}`);
  await B.waitForTimeout(1500);
  await tB('propose-title').fill('EP Velours');
  await tB('propose-message').fill('On fait un EP de 4 titres ?');
  await tB('propose-send').click();
  await B.waitForTimeout(2000);
  await A.goto(`${BASE}/links?segment=requests`);
  await A.waitForTimeout(2000);
  await A.screenshot({ path: `${OUT}/08-alma-request.png` });
  await tA('request-accept').click();
  await A.waitForTimeout(2500);
  await A.screenshot({ path: `${OUT}/09-alma-project-chat.png` });
  const collabs = await admin.from('collaborations').select('title, status');
  console.log('collaborations:', collabs.data);

  // Alma blocks Bruno: Bruno's conversation closes.
  await A.goto(`${BASE}/profile/${bruno.id}`);
  await A.waitForTimeout(1500);
  await tA('profile-menu').click();
  await A.waitForTimeout(400);
  await tA('menu-block').click();
  await A.waitForTimeout(400);
  await tA('dialog-confirm').click();
  await A.waitForTimeout(1500);
  await B.goto(`${BASE}/messages`);
  await B.waitForTimeout(2000);
  await B.screenshot({ path: `${OUT}/10-bruno-after-block.png` });
  console.log('bruno conversation rows after block:', await B.locator('[data-testid="conversation-row"]').count());

  // Settings: export works, delete account is wired to the Edge Function.
  await A.goto(`${BASE}/settings`);
  await A.waitForTimeout(1500);
  await A.screenshot({ path: `${OUT}/11-alma-settings.png`, fullPage: true });

  console.log('ERRORS', JSON.stringify(errors, null, 1));
  await browser.close();
})().catch((e) => { console.error('FLOW FAILED', e.message); process.exit(1); });
