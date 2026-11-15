/**
 * Deletes the calling user's account and everything attached to it.
 * Required by App Store guideline 5.1.1(v) and by the GDPR right to erasure.
 *
 * 1. Verifies the caller's JWT.
 * 2. Removes their files from Storage (images, tracks, audio they sent).
 * 3. Deletes the auth user: every table cascades from auth.users → profiles.
 *    Reports filed about them are kept (target set to null, evidence snapshot).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'not_authenticated' }, 401);

  const url = requireEnv('SUPABASE_URL');
  const admin = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice('Bearer '.length));
  if (userError || !userData.user) return json({ error: 'not_authenticated' }, 401);
  const userId = userData.user.id;

  const { data: objects, error: listError } = await admin.rpc('account_storage_objects', { uid: userId });
  if (listError) return json({ error: 'storage_listing_failed', detail: listError.message }, 500);

  const byBucket = new Map<string, string[]>();
  for (const o of (objects ?? []) as { bucket_id: string; name: string }[]) {
    byBucket.set(o.bucket_id, [...(byBucket.get(o.bucket_id) ?? []), o.name]);
  }
  for (const [bucket, names] of byBucket) {
    for (let i = 0; i < names.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(names.slice(i, i + 100));
      if (error) return json({ error: 'storage_delete_failed', detail: error.message }, 500);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed', detail: deleteError.message }, 500);

  return json({ deleted: true, files_removed: objects?.length ?? 0 });
});
