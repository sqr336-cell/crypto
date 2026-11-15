#!/usr/bin/env node
/**
 * Seeds a LOCAL Supabase stack (`supabase start`) with the 12 fictional demo
 * creators, their generated covers and procedural sounds, so the app can be
 * tried against a real backend. Refuses to run against anything but localhost.
 *
 *   npm run db:seed
 *
 * Accounts: demo+<key>@beatlink.local, password "beatlink-demo".
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = new URL('..', import.meta.url).pathname;
const status = JSON.parse(execSync('npx supabase status -o json', { cwd: root }).toString().replace(/^[^{]*/, ''));
const url = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) throw new Error(`Refusing to seed non-local project: ${url}`);
const admin = createClient(url, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const profiles = JSON.parse(readFileSync(`${root}mobile/src/data/demo/profiles.json`, 'utf8'));
const audio = JSON.parse(readFileSync(`${root}mobile/assets/demo/audio/manifest.json`, 'utf8'));
const PASSWORD = 'beatlink-demo';

async function userFor(key) {
  const email = `demo+${key}@beatlink.local`;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

async function upload(bucket, path, file, contentType) {
  const { error } = await admin.storage.from(bucket).upload(path, readFileSync(file), { contentType, upsert: true });
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
}

for (const seed of profiles) {
  const id = await userFor(seed.key);
  const img = `${root}mobile/assets/demo/images/${seed.key}`;
  await upload('images', `${id}/avatar.jpg`, `${img}-avatar.jpg`, 'image/jpeg');
  await upload('images', `${id}/banner.jpg`, `${img}-cover.jpg`, 'image/jpeg');
  const p = seed.profile;
  const { error } = await admin.from('profiles').upsert({
    id,
    handle: p.handle,
    display_name: p.displayName,
    avatar_path: `${id}/avatar.jpg`,
    banner_path: `${id}/banner.jpg`,
    bio: p.bio,
    looking_for: p.lookingFor,
    city: p.city,
    country_code: p.countryCode,
    languages: p.languages,
    roles: p.roles,
    genres: p.genres,
    influences: p.influences,
    skills: p.skills,
    goals: p.goals,
    availability: p.availability,
    collab_mode: p.collabMode,
    age_confirmed_at: new Date().toISOString(),
    onboarded_at: new Date().toISOString(),
    last_active_at: new Date(Date.now() - seed.activeHoursAgo * 3600_000).toISOString(),
  });
  if (error) throw new Error(`profile ${seed.key}: ${error.message}`);

  await admin.from('tracks').delete().eq('owner_id', id);
  for (const [i, key] of seed.tracks.entries()) {
    const a = audio[key];
    const path = `${id}/${key}.m4a`;
    await upload('tracks', path, `${root}mobile/assets/demo/audio/${key}.m4a`, 'audio/mp4');
    const t = await admin.from('tracks').insert({
      owner_id: id, title: a.title, storage_path: path, duration_ms: a.durationMs, waveform: a.waveform,
      bpm: a.bpm, musical_key: a.musicalKey, genre: a.genre, position: i,
    });
    if (t.error) throw new Error(`track ${key}: ${t.error.message}`);
  }
  await admin.from('profile_links').delete().eq('profile_id', id);
  if (seed.links.length) {
    await admin.from('profile_links').insert(seed.links.map((l, i) => ({ profile_id: id, platform: l.platform, url: l.url, position: i })));
  }
  console.log(`seeded ${p.displayName} (demo+${seed.key}@beatlink.local)`);
}
console.log(`Done. Password for every demo account: ${PASSWORD}`);
