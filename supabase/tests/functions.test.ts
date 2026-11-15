/**
 * Edge Functions, against `supabase functions serve`. Skipped when the local
 * functions runtime is not running.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { admin, createUser, onboard, stack } from './helpers';

let available = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${stack.url}/functions/v1/delete-account`, { method: 'OPTIONS' });
    available = res.status < 500;
  } catch {
    available = false;
  }
});

describe('delete-account', () => {
  it('rejects anonymous calls', async (ctx) => {
    if (!available) ctx.skip();
    const res = await fetch(`${stack.url}/functions/v1/delete-account`, { method: 'POST', headers: { apikey: stack.anon } });
    expect(res.status).toBe(401);
  });

  it('deletes the account, its rows and its files', async (ctx) => {
    if (!available) ctx.skip();
    const user = await createUser('leaving');
    await onboard(user, { display_name: 'Leaving', roles: ['dj'], genres: ['house'] });
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]);
    expect((await user.client.storage.from('tracks').upload(`${user.id}/a.mp3`, bytes, { contentType: 'audio/mpeg' })).error).toBeNull();
    expect((await user.client.storage.from('images').upload(`${user.id}/avatar.jpg`, bytes, { contentType: 'image/jpeg' })).error).toBeNull();
    await user.client.from('tracks').insert({ owner_id: user.id, title: 'a', storage_path: `${user.id}/a.mp3` });

    const { data, error } = await user.client.functions.invoke('delete-account', { method: 'POST' });
    expect(error).toBeNull();
    expect(data).toMatchObject({ deleted: true, files_removed: 2 });

    const gone = await admin.auth.admin.getUserById(user.id);
    expect(gone.data.user).toBeNull();
    expect((await admin.from('profiles').select('id').eq('id', user.id)).data).toHaveLength(0);
    expect((await admin.from('tracks').select('id').eq('owner_id', user.id)).data).toHaveLength(0);
    const files = await admin.storage.from('tracks').list(user.id);
    expect(files.data ?? []).toHaveLength(0);
  });
});

describe('push-on-message', () => {
  it('refuses calls without the webhook secret', async (ctx) => {
    if (!available) ctx.skip();
    const res = await fetch(`${stack.url}/functions/v1/push-on-message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': 'wrong' },
      body: JSON.stringify({ type: 'INSERT', table: 'messages', record: {} }),
    });
    expect([403, 500]).toContain(res.status);
  });
});
