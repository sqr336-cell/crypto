/**
 * Deletes the calling user's account and everything attached to it.
 * Required by App Store guideline 5.1.1(v) and by the GDPR right to erasure.
 *
 * 1. Verifies the caller's JWT.
 * 2. Removes their files from Storage (images, tracks, audio they sent).
 * 3. Deletes the auth user: every table cascades from auth.users → profiles.
 *    Reports filed about them are kept (target set to null, evidence snapshot).
 */
import { corsHeaders, json } from '../_shared/http.ts';
import { deleteUser, getUser, removeObjects, rpc } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'not_authenticated' }, 401);
  const user = await getUser(authHeader.slice('Bearer '.length));
  if (!user) return json({ error: 'not_authenticated' }, 401);

  try {
    const objects = await rpc<{ bucket_id: string; name: string }[]>('account_storage_objects', { uid: user.id });
    const byBucket = new Map<string, string[]>();
    for (const o of objects) byBucket.set(o.bucket_id, [...(byBucket.get(o.bucket_id) ?? []), o.name]);
    for (const [bucket, names] of byBucket) {
      for (let i = 0; i < names.length; i += 100) await removeObjects(bucket, names.slice(i, i + 100));
    }
    await deleteUser(user.id);
    return json({ deleted: true, files_removed: objects.length });
  } catch (e) {
    console.error('delete-account', user.id, e);
    return json({ error: 'delete_failed' }, 500);
  }
});
