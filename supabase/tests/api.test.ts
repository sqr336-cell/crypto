/**
 * End-to-end tests against a real local Supabase stack (Auth, PostgREST,
 * Storage, Realtime). Run with `npm run test:db` after `supabase start`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { computeFit, type MatchInput } from '../../mobile/src/domain/matching';
import { COMPLEMENT_RULES, GENRES, GOALS, ROLES, SKILLS } from '../../mobile/src/domain/taxonomy';
import { PLAN_LIMITS } from '../../mobile/src/domain/plans';
import { admin, anon, createUser, dbClient, expectPgError, onboard, type TestUser } from './helpers';

let nayla: TestUser; // alt R&B producer looking for singers
let koz: TestUser; // singer / songwriter looking for beatmakers
let mira: TestUser; // drill rapper
let sam: TestUser; // not onboarded

beforeAll(async () => {
  [nayla, koz, mira, sam] = await Promise.all([
    createUser('nayla'),
    createUser('koz'),
    createUser('mira'),
    createUser('sam'),
  ]);
  await onboard(nayla, {
    display_name: 'Nayla',
    roles: ['producer', 'beatmaker'],
    genres: ['alt_rnb', 'rnb', 'soul'],
    influences: ['Frank Ocean', 'SZA', 'Kaytranada'],
    skills: ['production', 'mixing'],
    goals: ['find_singers', 'collaborate'],
    availability: 'looking',
    city: 'Paris',
    country_code: 'FR',
  });
  await onboard(koz, {
    display_name: 'K.Oz',
    roles: ['singer', 'songwriter'],
    genres: ['rnb', 'alt_rnb', 'pop'],
    influences: ['frank ocean', 'Brent Faiyaz'],
    skills: ['topline', 'writing'],
    goals: ['find_beatmakers', 'collaborate'],
    availability: 'available',
    city: 'paris',
    country_code: 'FR',
  });
  await onboard(mira, {
    display_name: 'Mira',
    roles: ['rapper'],
    genres: ['drill', 'trap'],
    goals: ['find_beatmakers'],
    availability: 'open',
    languages: ['en'],
    collab_mode: 'in_person',
  });
});

describe('access control', () => {
  it('anonymous visitors read taxonomy but nothing else', async () => {
    const tax = await anon.from('taxonomy').select('slug').eq('kind', 'genre');
    expect(tax.error).toBeNull();
    expect(tax.data?.length).toBe(GENRES.length);

    const profiles = await anon.from('profiles').select('id');
    expect(profiles.data ?? []).toHaveLength(0);

    const feed = await anon.rpc('discover_feed', { p_limit: 5 });
    expect(feed.error).not.toBeNull();
  });

  it('profile validation rejects unknown slugs and onboarding without age confirmation', async () => {
    const bad = await sam.client.from('profiles').insert({ id: sam.id, display_name: 'Sam', genres: ['polka'] });
    expectPgError(bad.error, 'invalid_genre');

    const noAge = await sam.client
      .from('profiles')
      .insert({ id: sam.id, display_name: 'Sam', roles: ['dj'], onboarded_at: new Date().toISOString() });
    expectPgError(noAge.error, 'onboarding_requires_age');

    const ok = await sam.client.from('profiles').insert({ id: sam.id, display_name: '  Sam  ', roles: ['dj', 'dj'] }).select().single();
    expect(ok.error).toBeNull();
    expect(ok.data.display_name).toBe('Sam');
    expect(ok.data.roles).toEqual(['dj']);
  });

  it('users cannot write someone else\'s profile or their own entitlements', async () => {
    const other = await koz.client.from('profiles').update({ bio: 'hacked' }).eq('id', nayla.id).select();
    expect(other.data ?? []).toHaveLength(0);

    const ent = await nayla.client.from('entitlements').update({ plan: 'pro' }).eq('profile_id', nayla.id).select();
    expect(ent.data ?? []).toHaveLength(0);
    const mine = await nayla.client.from('entitlements').select('plan').single();
    expect(mine.data?.plan).toBe('free');
  });

  it('profiles that have not finished onboarding are invisible to others', async () => {
    const res = await nayla.client.from('profiles').select('id').eq('id', sam.id);
    expect(res.data ?? []).toHaveLength(0);
  });
});

describe('matching', () => {
  it('discover feed ranks complementary profiles and explains why', async () => {
    const { data, error } = await nayla.client.rpc('discover_feed', { p_limit: 50 });
    expect(error).toBeNull();
    const ids = (data as any[]).map((c) => c.profile.id);
    expect(ids).toContain(koz.id);
    expect(ids).toContain(mira.id);
    expect(ids).not.toContain(sam.id);
    expect(ids).not.toContain(nayla.id);

    const kozCard = (data as any[]).find((c) => c.profile.id === koz.id);
    expect(kozCard.fit.tier).toBe('strong');
    expect(kozCard.fit.genres.shared).toEqual(['rnb', 'alt_rnb']);
    expect(kozCard.fit.influences.shared).toEqual(['frank ocean']);
    expect(kozCard.fit.roles).toMatchObject({ they_fit_you: true, you_fit_them: true });
    expect(kozCard.fit.logistics.same_city).toBe(true);
    expect(kozCard.profile.age_confirmed_at).toBeUndefined();
  });

  it('filters by role and remote preference', async () => {
    const singers = await nayla.client.rpc('discover_feed', { p_roles: ['singer'], p_limit: 50 });
    expect((singers.data as any[]).map((c) => c.profile.id)).toContain(koz.id);
    expect((singers.data as any[]).every((c) => c.profile.roles.includes('singer'))).toBe(true);
    const remote = await nayla.client.rpc('discover_feed', { p_remote_only: true, p_limit: 50 });
    expect((remote.data as any[]).map((c) => c.profile.id)).not.toContain(mira.id);
  });

  it('SQL and TypeScript compatibility formulas agree on random profiles', async () => {
    const db = dbClient();
    await db.connect();
    try {
      let seed = 42;
      const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
      const pick = <T,>(xs: readonly T[], max: number) =>
        Array.from(new Set(Array.from({ length: Math.floor(rand() * (max + 1)) }, () => xs[Math.floor(rand() * xs.length)])));
      const infl = ['Frank Ocean', 'SZA', 'Metro Boomin', 'Burna Boy', 'Aphex Twin', 'Daft Punk'];
      const mk = (): MatchInput & { collab_mode: string; country_code: string | null } => {
        const collabMode = (['remote', 'in_person', 'both'] as const)[Math.floor(rand() * 3)];
        const city = rand() < 0.5 ? (rand() < 0.5 ? 'Paris' : 'paris') : rand() < 0.5 ? 'Lyon' : null;
        const countryCode = rand() < 0.8 ? 'FR' : 'BE';
        return {
          roles: pick(ROLES, 3),
          genres: pick(GENRES.slice(0, 8), 4),
          influences: pick(infl, 4).map((i) => (rand() < 0.3 ? i.toLowerCase() : i)),
          skills: pick(SKILLS, 4),
          goals: pick(GOALS, 3),
          languages: pick(['fr', 'en', 'es'], 2),
          availability: (['looking', 'available', 'open', 'unavailable'] as const)[Math.floor(rand() * 4)],
          collabMode,
          collab_mode: collabMode,
          city,
          countryCode,
          country_code: countryCode,
        };
      };
      for (let i = 0; i < 300; i++) {
        const a = mk();
        const b = mk();
        const ts = computeFit(a, b);
        const { rows } = await db.query(
          `select public.compatibility(jsonb_populate_record(null::public.profiles, $1),
                                       jsonb_populate_record(null::public.profiles, $2)) as fit`,
          [JSON.stringify(a), JSON.stringify(b)],
        );
        const sql = rows[0].fit;
        expect({ i, score: sql.score, tier: sql.tier, genres: sql.genres.points, roles: sql.roles.points, infl: sql.influences.points, skills: sql.skills.points, goals: sql.goals.points, logi: sql.logistics.points })
          .toEqual({ i, score: ts.score, tier: ts.tier, genres: ts.genres.points, roles: ts.roles.points, infl: ts.influences.points, skills: ts.skills.points, goals: ts.goals.points, logi: ts.logistics.points });
        expect(sql.genres.shared).toEqual(ts.genres.shared);
        expect(sql.influences.shared).toEqual(ts.influences.shared);
      }
    } finally {
      await db.end();
    }
  });

  it('taxonomy, complement rules and plan limits match the app', async () => {
    const tax = await anon.from('taxonomy').select('kind, slug').order('position');
    const by = (k: string) => tax.data!.filter((t) => t.kind === k).map((t) => t.slug);
    expect(by('role')).toEqual([...ROLES]);
    expect(by('genre')).toEqual([...GENRES]);
    expect(by('skill')).toEqual([...SKILLS]);
    expect(by('goal')).toEqual([...GOALS]);

    const rules = await anon.from('complement_rules').select('kind, slug, wanted_role');
    const key = (r: { kind: string; slug: string; wanted: string }) => `${r.kind}:${r.slug}:${r.wanted}`;
    expect(rules.data!.map((r) => key({ kind: r.kind, slug: r.slug, wanted: r.wanted_role })).sort()).toEqual(
      COMPLEMENT_RULES.map((r) => key({ kind: r.kind, slug: r.slug, wanted: r.wantedRole })).sort(),
    );

    const limits = await nayla.client.from('plan_limits').select('*');
    for (const row of limits.data!) {
      const ts = PLAN_LIMITS[row.plan as keyof typeof PLAN_LIMITS];
      expect([row.daily_interests, row.daily_requests, row.max_favorites, row.max_tracks]).toEqual([
        ts.dailyInterests, ts.dailyRequests, ts.maxFavorites, ts.maxTracks,
      ]);
    }
  });
});

let conversationId: string;

describe('mutual interest → link → conversation', () => {
  it('a one-sided interest stays private', async () => {
    const r = await nayla.client.rpc('record_swipe', { p_target: koz.id, p_decision: 'interest' });
    expect(r.error).toBeNull();
    expect(r.data.connected).toBe(false);
    expect(r.data.usage.interests_used).toBe(1);

    const seen = await koz.client.from('swipes').select('*');
    expect(seen.data ?? []).toHaveLength(0);

    const feed = await nayla.client.rpc('discover_feed', { p_limit: 50 });
    expect((feed.data as any[]).map((c) => c.profile.id)).not.toContain(koz.id);
  });

  it('reciprocal interest creates the link and the conversation', async () => {
    const r = await koz.client.rpc('record_swipe', { p_target: nayla.id, p_decision: 'interest' });
    expect(r.error).toBeNull();
    expect(r.data.connected).toBe(true);
    conversationId = r.data.conversation_id;
    expect(conversationId).toBeTruthy();

    const links = await nayla.client.rpc('list_connections');
    expect((links.data as any[]).map((l) => l.other.id)).toEqual([koz.id]);

    const convs = await nayla.client.rpc('list_conversations');
    const conv = (convs.data as any[]).find((c) => c.id === conversationId);
    expect(conv.other.id).toBe(koz.id);
    expect(conv.last_message.kind).toBe('system');
    expect(conv.unread_count).toBe(1);
    expect(conv.can_post).toBe(true);
  });

  it('members exchange messages; outsiders can neither read nor post', async () => {
    const sent = await nayla.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: nayla.id, kind: 'text', body: 'Hey, j’ai une prod pour toi' })
      .select()
      .single();
    expect(sent.error).toBeNull();

    const forged = await nayla.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: koz.id, kind: 'text', body: 'fake' });
    expect(forged.error).not.toBeNull();

    const system = await nayla.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: nayla.id, kind: 'system', meta: { event: 'linked' } });
    expect(system.error).not.toBeNull();

    const spy = await mira.client.from('messages').select('*').eq('conversation_id', conversationId);
    expect(spy.data ?? []).toHaveLength(0);
    const intrude = await mira.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: mira.id, kind: 'text', body: 'hi' });
    expect(intrude.error).not.toBeNull();

    const kozConvs = await koz.client.rpc('list_conversations');
    expect((kozConvs.data as any[]).find((c) => c.id === conversationId).unread_count).toBe(2);
    await koz.client.rpc('mark_conversation_read', { p_conversation: conversationId });
    const after = await koz.client.rpc('list_conversations');
    expect((after.data as any[]).find((c) => c.id === conversationId).unread_count).toBe(0);
  });

  it('realtime delivers new messages to the other member', async () => {
    const token = (await koz.client.auth.getSession()).data.session!.access_token;
    await koz.client.realtime.setAuth(token);
    const received = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no realtime event within 10 s')), 10_000);
      const channel = koz.client
        .channel(`test:${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            // Realtime may replay earlier inserts of this conversation; wait for ours.
            if ((payload.new as { body?: string }).body !== 'realtime ping') return;
            clearTimeout(timer);
            koz.client.removeChannel(channel);
            resolve(payload.new);
          },
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Give the server a moment to register the postgres_changes binding.
            await new Promise((r) => setTimeout(r, 500));
            await nayla.client
              .from('messages')
              .insert({ conversation_id: conversationId, sender_id: nayla.id, kind: 'text', body: 'realtime ping' });
          }
        });
    });
    const msg = await received;
    expect(msg.body).toBe('realtime ping');
  }, 15_000);
});

describe('storage', () => {
  it('owners upload tracks to their own folder only; others stream through signed URLs', async () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0]);
    const own = await nayla.client.storage.from('tracks').upload(`${nayla.id}/demo.mp3`, bytes, { contentType: 'audio/mpeg' });
    expect(own.error).toBeNull();

    const foreign = await nayla.client.storage.from('tracks').upload(`${koz.id}/evil.mp3`, bytes, { contentType: 'audio/mpeg' });
    expect(foreign.error).not.toBeNull();

    const wrongType = await nayla.client.storage.from('tracks').upload(`${nayla.id}/x.html`, bytes, { contentType: 'text/html' });
    expect(wrongType.error).not.toBeNull();

    const signed = await mira.client.storage.from('tracks').createSignedUrl(`${nayla.id}/demo.mp3`, 60);
    expect(signed.error).toBeNull();
    const res = await fetch(signed.data!.signedUrl);
    expect(res.status).toBe(200);

    const track = await nayla.client
      .from('tracks')
      .insert({ owner_id: nayla.id, title: 'Velours (demo)', storage_path: `${nayla.id}/demo.mp3`, duration_ms: 30000, bpm: 92, musical_key: 'Dm', waveform: [10, 40, 80, 60] })
      .select()
      .single();
    expect(track.error).toBeNull();

    const outside = await nayla.client
      .from('tracks')
      .insert({ owner_id: nayla.id, title: 'x', storage_path: `${koz.id}/x.mp3` });
    expect(outside.error).not.toBeNull();
  });

  it('enforces the track limit of the free plan', async () => {
    for (let i = 0; i < 2; i++) {
      const r = await nayla.client.from('tracks').insert({ owner_id: nayla.id, title: `t${i}`, storage_path: `${nayla.id}/t${i}.mp3` });
      expect(r.error).toBeNull();
    }
    const fourth = await nayla.client.from('tracks').insert({ owner_id: nayla.id, title: 'too many', storage_path: `${nayla.id}/t9.mp3` });
    expectPgError(fourth.error, 'track_limit');
  });

  it('conversation audio is readable and writable by members only', async () => {
    const bytes = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]);
    const ok = await koz.client.storage.from('message-audio').upload(`${conversationId}/topline.m4a`, bytes, { contentType: 'audio/mp4' });
    expect(ok.error).toBeNull();
    const intruder = await mira.client.storage.from('message-audio').upload(`${conversationId}/spam.m4a`, bytes, { contentType: 'audio/mp4' });
    expect(intruder.error).not.toBeNull();
    const peek = await mira.client.storage.from('message-audio').createSignedUrl(`${conversationId}/topline.m4a`, 60);
    expect(peek.error).not.toBeNull();
    const member = await nayla.client.storage.from('message-audio').createSignedUrl(`${conversationId}/topline.m4a`, 60);
    expect(member.error).toBeNull();

    const msg = await koz.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: koz.id, kind: 'audio', attachment_path: `${conversationId}/topline.m4a`, meta: { duration_ms: 12000 } });
    expect(msg.error).toBeNull();
    const elsewhere = await koz.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: koz.id, kind: 'audio', attachment_path: `other/topline.m4a` });
    expect(elsewhere.error).not.toBeNull();
  });
});

describe('collaboration requests', () => {
  let requestId: string;

  it('sends a request with a brief and an attached sound', async () => {
    const track = await nayla.client.from('tracks').select('id').eq('owner_id', nayla.id).eq('title', 'Velours (demo)').single();
    expect(track.error).toBeNull();
    const r = await nayla.client.rpc('send_collab_request', {
      p_target: mira.id,
      p_message: 'Je suis tombée sur tes sons, je cherche une voix drill pour un projet. Ça te dit ?',
      p_project_title: 'Nuit blanche',
      p_track_id: track.data!.id,
    });
    expect(r.error).toBeNull();
    requestId = r.data.request.id;
    expect(r.data.usage.requests_used).toBe(1);

    const again = await nayla.client.rpc('send_collab_request', { p_target: mira.id, p_message: 'relance' });
    expectPgError(again.error, 'request_already_pending');

    const received = await mira.client.rpc('list_requests', { p_box: 'received' });
    const req = (received.data as any[]).find((x) => x.id === requestId);
    expect(req.other.id).toBe(nayla.id);
    expect(req.track.title).toBe('Velours (demo)');
  });

  it('only the recipient can accept; acceptance opens the conversation and the project', async () => {
    const hijack = await koz.client.rpc('respond_collab_request', { p_request: requestId, p_accept: true });
    expectPgError(hijack.error, 'request_not_found');

    const r = await mira.client.rpc('respond_collab_request', { p_request: requestId, p_accept: true });
    expect(r.error).toBeNull();
    expect(r.data.status).toBe('accepted');

    const msgs = await mira.client
      .from('messages')
      .select('kind, body, meta, sender_id')
      .eq('conversation_id', r.data.conversation_id)
      .order('created_at');
    expect(msgs.data!.map((m) => m.kind)).toEqual(['system', 'text', 'track', 'system']);
    expect(msgs.data![1].sender_id).toBe(nayla.id);
    expect(msgs.data![3].meta).toMatchObject({ event: 'project_started', title: 'Nuit blanche' });

    const projects = await nayla.client.rpc('list_collaborations');
    expect((projects.data as any[]).map((p) => p.title)).toContain('Nuit blanche');

    const done = await mira.client.rpc('set_collaboration_status', { p_collaboration: r.data.collaboration_id, p_status: 'completed' });
    expect(done.error).toBeNull();
    const outsider = await koz.client.rpc('set_collaboration_status', { p_collaboration: r.data.collaboration_id, p_status: 'archived' });
    expectPgError(outsider.error, 'collaboration_not_found');
  });
});

describe('limits', () => {
  it('stops interests at the daily cap of the plan', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await admin.from('daily_usage').upsert({ profile_id: koz.id, day: today, interests: PLAN_LIMITS.free.dailyInterests });
    const r = await koz.client.rpc('record_swipe', { p_target: mira.id, p_decision: 'interest' });
    expectPgError(r.error, 'daily_interest_limit');
    const pass = await koz.client.rpc('record_swipe', { p_target: mira.id, p_decision: 'pass' });
    expect(pass.error).toBeNull();
  });
});

describe('safety', () => {
  it('reports keep a snapshot of the reported message', async () => {
    const msg = await koz.client.from('messages').select('id').eq('conversation_id', conversationId).eq('kind', 'text').limit(1).single();
    const r = await koz.client.rpc('report_content', { p_reason: 'spam', p_message: msg.data!.id, p_details: 'test' });
    expect(r.error).toBeNull();
    const { data } = await admin.from('reports').select('*').eq('id', r.data).single();
    expect(data.target_profile_id).toBe(nayla.id);
    expect(data.evidence.message.body).toBeTruthy();
    const theirs = await nayla.client.from('reports').select('*');
    expect(theirs.data ?? []).toHaveLength(0);
  });

  it('blocking removes the link, hides both profiles and closes the conversation', async () => {
    const r = await koz.client.rpc('block_user', { p_target: nayla.id });
    expect(r.error).toBeNull();

    const profile = await nayla.client.from('profiles').select('id').eq('id', koz.id);
    expect(profile.data ?? []).toHaveLength(0);
    const links = await nayla.client.rpc('list_connections');
    expect((links.data as any[]).map((l) => l.other.id)).not.toContain(koz.id);
    const convs = await nayla.client.rpc('list_conversations');
    expect((convs.data as any[]).map((c) => c.id)).not.toContain(conversationId);
    const post = await nayla.client
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: nayla.id, kind: 'text', body: 'still there?' });
    expect(post.error).not.toBeNull();
    const swipe = await nayla.client.rpc('record_swipe', { p_target: koz.id, p_decision: 'interest' });
    expectPgError(swipe.error, 'target_unavailable');

    const blocked = await koz.client.rpc('list_blocked');
    expect((blocked.data as any[])[0].profile.id).toBe(nayla.id);

    await koz.client.rpc('unblock_user', { p_target: nayla.id });
    const back = await nayla.client.from('profiles').select('id').eq('id', koz.id);
    expect(back.data).toHaveLength(1);
  });

  it('exports the user\'s own data', async () => {
    const r = await nayla.client.rpc('export_my_data');
    expect(r.error).toBeNull();
    expect(r.data.profile.id).toBe(nayla.id);
    expect(r.data.tracks.length).toBeGreaterThan(0);
    expect(r.data.messages_sent.length).toBeGreaterThan(0);
  });

  it('internal helpers are not callable from the API', async () => {
    const r = await nayla.client.rpc('ensure_connection', { p_a: nayla.id, p_b: mira.id, p_origin: 'mutual_interest' });
    expect(r.error).not.toBeNull();
    const objs = await nayla.client.rpc('account_storage_objects', { uid: koz.id });
    expect(objs.error).not.toBeNull();
  });
});
