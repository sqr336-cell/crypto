/**
 * Sends an Expo push notification when a message is inserted.
 *
 * Wiring (Supabase Dashboard → Database → Webhooks):
 *   table public.messages, event INSERT, type "Supabase Edge Function",
 *   function push-on-message, HTTP header  x-webhook-secret: <PUSH_WEBHOOK_SECRET>
 *
 * Secrets: PUSH_WEBHOOK_SECRET (required), EXPO_ACCESS_TOKEN (optional, only if
 * "enhanced push security" is enabled on the Expo project).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';

type Locale = 'en' | 'fr';

interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  kind: 'text' | 'link' | 'audio' | 'track' | 'system';
  body: string | null;
  meta: Record<string, unknown>;
}

const COPY: Record<Locale, Record<string, string>> = {
  en: {
    audio: 'Sent you a sound',
    track: 'Shared a track',
    link: 'Sent a link',
    linked: 'New link',
    linkedBody: 'You and {name} linked. Say hi.',
    project: 'Project started: {title}',
  },
  fr: {
    audio: 'T’a envoyé un son',
    track: 'A partagé un morceau',
    link: 'T’a envoyé un lien',
    linked: 'Nouveau link',
    linkedBody: 'Toi et {name} êtes linkés. Dis bonjour.',
    project: 'Projet démarré : {title}',
  },
};

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const preview = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.headers.get('x-webhook-secret') !== requireEnv('PUSH_WEBHOOK_SECRET')) {
    return json({ error: 'forbidden' }, 403);
  }

  const payload = await req.json();
  if (payload?.type !== 'INSERT' || payload?.table !== 'messages') return json({ skipped: 'not_a_message_insert' });
  const msg = payload.record as MessageRecord;
  if (msg.kind === 'system' && msg.meta?.event === 'project_completed') return json({ skipped: 'quiet_event' });

  const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: members } = await admin
    .from('conversation_members')
    .select('profile_id, muted, profiles(display_name)')
    .eq('conversation_id', msg.conversation_id);
  if (!members?.length) return json({ skipped: 'no_members' });

  const nameOf = (id: string | null) =>
    (members.find((m) => m.profile_id === id)?.profiles as { display_name?: string } | null)?.display_name ?? 'BEATLINK';
  const recipients = members.filter((m) => m.profile_id !== msg.sender_id && !m.muted).map((m) => m.profile_id);
  if (!recipients.length) return json({ skipped: 'no_recipients' });

  const { data: tokens } = await admin.from('push_tokens').select('token, profile_id, locale').in('profile_id', recipients);
  if (!tokens?.length) return json({ sent: 0 });

  const notifications = tokens.map((t) => {
    const c = COPY[(t.locale as Locale) ?? 'en'] ?? COPY.en;
    let title = nameOf(msg.sender_id);
    let body = '';
    if (msg.kind === 'system') {
      const other = members.find((m) => m.profile_id !== t.profile_id)?.profile_id ?? null;
      if (msg.meta?.event === 'linked') {
        title = c.linked;
        body = fill(c.linkedBody, { name: nameOf(other) });
      } else {
        title = 'BEATLINK';
        body = fill(c.project, { title: String(msg.meta?.title ?? '') });
      }
    } else if (msg.kind === 'text') body = preview(msg.body ?? '');
    else body = c[msg.kind] ?? '';
    return {
      to: t.token,
      title,
      body,
      sound: 'default',
      data: { conversationId: msg.conversation_id, messageId: msg.id },
    };
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  let sent = 0;
  for (let i = 0; i < notifications.length; i += 100) {
    const batch = notifications.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(batch) });
    const out = await res.json().catch(() => ({}));
    const tickets: { status: string; details?: { error?: string } }[] = out?.data ?? [];
    const stale = tickets
      .map((ticket, j) => (ticket.details?.error === 'DeviceNotRegistered' ? batch[j].to : null))
      .filter((x): x is string => !!x);
    if (stale.length) await admin.from('push_tokens').delete().in('token', stale);
    sent += tickets.filter((ticket) => ticket.status === 'ok').length;
  }
  return json({ sent });
});
