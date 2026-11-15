-- BEATLINK — functions, triggers and RLS policies.
-- Conventions:
--   * SECURITY DEFINER functions pin `search_path = ''` and qualify every name.
--   * Errors raised for the client use stable machine codes in MESSAGE
--     (e.g. 'daily_interest_limit'); the app maps them to translated copy.
--   * SQLSTATE 'PTxxx' makes PostgREST answer with HTTP status xxx
--     (PT401 not signed in, PT404 not found, PT429 daily limit reached).

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------
create or replace function public.dedupe(arr text[])
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(x order by ord), '{}')
  from (select x, min(ord) as ord from unnest(arr) with ordinality as u (x, ord) group by x) s;
$$;

-- Trims, drops empties, de-duplicates case-insensitively, keeps first spelling and order.
create or replace function public.normalize_tags(tags text[], max_len integer default 40)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(t order by ord), '{}')
  from (
    select distinct on (lower(btrim(x))) btrim(x) as t, ord
    from unnest(tags) with ordinality as u (x, ord)
    where btrim(x) <> '' and char_length(btrim(x)) <= max_len
    order by lower(btrim(x)), ord
  ) s;
$$;

create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.is_conversation_member(conv uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and profile_id = auth.uid()
  );
$$;

create or replace function public.is_collaboration_member(collab uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collaboration_members
    where collaboration_id = collab and profile_id = auth.uid()
  );
$$;

-- A member can post if nobody in the conversation is blocked by/blocking them and,
-- for direct conversations, the two people are still linked.
create or replace function public.can_post(conv uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_conversation_member(conv)
    and not exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conv and m.profile_id <> auth.uid()
        and public.is_blocked_pair(auth.uid(), m.profile_id)
    )
    and (
      exists (select 1 from public.conversations c where c.id = conv and c.kind = 'group')
      or exists (select 1 from public.connections x where x.conversation_id = conv)
    );
$$;

create or replace function public.current_plan(uid uuid)
returns public.plan_tier language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select e.plan from public.entitlements e
      where e.profile_id = uid and (e.expires_at is null or e.expires_at > now())),
    'free'::public.plan_tier
  );
$$;

create or replace function public.limits_for(uid uuid)
returns public.plan_limits language sql stable security definer set search_path = '' as $$
  select l.* from public.plan_limits l where l.plan = public.current_plan(uid);
$$;

create or replace function public.assert_ready(uid uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  if not exists (select 1 from public.profiles where id = uid and onboarded_at is not null) then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.validate_profile()
returns trigger language plpgsql set search_path = '' as $$
declare
  bad text;
begin
  new.display_name := btrim(new.display_name);
  new.handle := nullif(lower(btrim(new.handle)), '');
  new.country_code := nullif(upper(btrim(new.country_code)), '');
  new.city := nullif(btrim(new.city), '');
  new.bio := nullif(btrim(new.bio), '');
  new.looking_for := nullif(btrim(new.looking_for), '');
  new.roles := public.dedupe(new.roles);
  new.genres := public.dedupe(new.genres);
  new.skills := public.dedupe(new.skills);
  new.goals := public.dedupe(new.goals);
  new.languages := public.dedupe(array(select lower(btrim(l)) from unnest(new.languages) l));
  new.influences := public.normalize_tags(new.influences);

  select r into bad from unnest(new.roles) r
    where not exists (select 1 from public.taxonomy t where t.kind = 'role' and t.slug = r) limit 1;
  if bad is not null then raise exception 'invalid_role' using errcode = '22023', detail = bad; end if;

  select g into bad from unnest(new.genres) g
    where not exists (select 1 from public.taxonomy t where t.kind = 'genre' and t.slug = g) limit 1;
  if bad is not null then raise exception 'invalid_genre' using errcode = '22023', detail = bad; end if;

  select s into bad from unnest(new.skills) s
    where not exists (select 1 from public.taxonomy t where t.kind = 'skill' and t.slug = s) limit 1;
  if bad is not null then raise exception 'invalid_skill' using errcode = '22023', detail = bad; end if;

  select g into bad from unnest(new.goals) g
    where not exists (select 1 from public.taxonomy t where t.kind = 'goal' and t.slug = g) limit 1;
  if bad is not null then raise exception 'invalid_goal' using errcode = '22023', detail = bad; end if;

  if exists (select 1 from unnest(new.languages) l where l !~ '^[a-z]{2}$') then
    raise exception 'invalid_language' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_validate before insert or update on public.profiles
  for each row execute function public.validate_profile();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.create_default_entitlement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.entitlements (profile_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger profiles_entitlement after insert on public.profiles
  for each row execute function public.create_default_entitlement();

create or replace function public.enforce_track_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lim public.plan_limits := public.limits_for(new.owner_id);
begin
  if (select count(*) from public.tracks where owner_id = new.owner_id) >= lim.max_tracks then
    raise exception 'track_limit' using errcode = 'P0001', hint = lim.max_tracks::text;
  end if;
  return new;
end $$;

create trigger tracks_limit before insert on public.tracks
  for each row execute function public.enforce_track_limit();

create or replace function public.enforce_favorite_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lim public.plan_limits := public.limits_for(new.owner_id);
begin
  if lim.max_favorites is not null
     and (select count(*) from public.favorites where owner_id = new.owner_id) >= lim.max_favorites then
    raise exception 'favorite_limit' using errcode = 'P0001', hint = lim.max_favorites::text;
  end if;
  return new;
end $$;

create trigger favorites_limit before insert on public.favorites
  for each row execute function public.enforce_favorite_limit();

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at
    where id = new.conversation_id and (last_message_at is null or last_message_at < new.created_at);
  -- The sender has obviously read their own conversation.
  if new.sender_id is not null then
    update public.conversation_members set last_read_at = new.created_at
      where conversation_id = new.conversation_id and profile_id = new.sender_id;
  end if;
  return new;
end $$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

create trigger collaborations_updated_at before update on public.collaborations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Matching — explainable compatibility (mirrored in mobile/src/domain/matching.ts)
-- ---------------------------------------------------------------------------
create or replace function public.wanted_roles(p public.profiles)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(
    nullif(array(
      select distinct c.wanted_role from public.complement_rules c
      where c.kind = 'goal' and c.slug = any (p.goals) order by 1
    ), '{}'::text[]),
    array(
      select distinct c.wanted_role from public.complement_rules c
      where c.kind = 'role' and c.slug = any (p.roles) order by 1
    )
  );
$$;

-- Score of candidate `b` from viewer `a`'s point of view (0–100) with its breakdown.
create or replace function public.compatibility(a public.profiles, b public.profiles)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  a_wants text[] := public.wanted_roles(a);
  b_wants text[] := public.wanted_roles(b);
  shared_genres text[];
  genre_denom integer;
  genre_pts integer := 0;
  shared_infl text[];
  infl_pts integer;
  they_fit boolean;
  you_fit boolean;
  role_pts integer;
  comp_skills text[];
  skill_pts integer;
  avail_pts integer;
  shared_goals text[];
  reciprocal boolean;
  goal_pts integer;
  shared_langs text[];
  remote_ok boolean;
  same_city boolean;
  logi_pts integer;
  total integer;
begin
  -- Genres (30)
  shared_genres := array(
    select g from unnest(b.genres) with ordinality as u (g, o) where g = any (a.genres) order by o
  );
  genre_denom := least(3, cardinality(a.genres), cardinality(b.genres));
  if genre_denom > 0 then
    genre_pts := round(30.0 * least(1.0, cardinality(shared_genres)::numeric / genre_denom));
  end if;

  -- Complementary roles (20)
  they_fit := b.roles && a_wants;
  you_fit := a.roles && b_wants;
  role_pts := (case when they_fit then 12 else 0 end) + (case when you_fit then 8 else 0 end);

  -- Influences (15)
  shared_infl := array(
    select i from unnest(b.influences) with ordinality as u (i, o)
    where lower(i) in (select lower(x) from unnest(a.influences) x) order by o
  );
  infl_pts := case least(cardinality(shared_infl), 3) when 0 then 0 when 1 then 8 when 2 then 12 else 15 end;

  -- Complementary skills (10)
  comp_skills := array(
    select s from unnest(b.skills) with ordinality as u (s, o) where not (s = any (a.skills)) order by o
  );
  skill_pts := 5 * least(2, cardinality(comp_skills));

  -- Availability (10)
  avail_pts := case b.availability when 'looking' then 10 when 'available' then 8 when 'open' then 5 else 0 end;

  -- Goals (10)
  shared_goals := array(
    select g from unnest(b.goals) with ordinality as u (g, o)
    where g = any (a.goals) and g in ('collaborate', 'grow_network', 'start_collective') order by o
  );
  reciprocal := (a.goals && array['find_artists', 'find_singers'] and b.goals && array['find_beatmakers'])
             or (b.goals && array['find_artists', 'find_singers'] and a.goals && array['find_beatmakers']);
  goal_pts := 5 * least(2, cardinality(shared_goals) + (case when reciprocal then 1 else 0 end));

  -- Logistics (5)
  shared_langs := array(
    select l from unnest(b.languages) with ordinality as u (l, o) where l = any (a.languages) order by o
  );
  remote_ok := a.collab_mode <> 'in_person' and b.collab_mode <> 'in_person';
  same_city := a.city is not null and b.city is not null
    and lower(a.city) = lower(b.city)
    and coalesce(a.country_code, '') = coalesce(b.country_code, '');
  logi_pts := (case when cardinality(shared_langs) > 0 then 3 else 0 end)
            + (case when remote_ok or same_city then 2 else 0 end);

  total := genre_pts + role_pts + infl_pts + skill_pts + avail_pts + goal_pts + logi_pts;

  return jsonb_build_object(
    'score', total,
    'tier', case when total >= 70 then 'strong' when total >= 45 then 'good' else 'explore' end,
    'genres', jsonb_build_object('points', genre_pts, 'shared', to_jsonb(shared_genres)),
    'roles', jsonb_build_object('points', role_pts, 'they_fit_you', they_fit, 'you_fit_them', you_fit),
    'influences', jsonb_build_object('points', infl_pts, 'shared', to_jsonb(shared_infl)),
    'skills', jsonb_build_object('points', skill_pts, 'complementary', to_jsonb(comp_skills)),
    'availability', jsonb_build_object('points', avail_pts, 'value', b.availability),
    'goals', jsonb_build_object('points', goal_pts, 'shared', to_jsonb(shared_goals), 'reciprocal', reciprocal),
    'logistics', jsonb_build_object('points', logi_pts, 'shared_languages', to_jsonb(shared_langs),
                                    'remote_ok', remote_ok, 'same_city', same_city)
  );
end $$;

-- Public-safe projection of a profile row.
create or replace function public.profile_json(p public.profiles)
returns jsonb language sql stable set search_path = '' as $$
  select to_jsonb(p) - 'age_confirmed_at';
$$;

create or replace function public.profile_mini(pid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'display_name', p.display_name, 'handle', p.handle,
    'avatar_path', p.avatar_path, 'roles', p.roles, 'availability', p.availability
  ) from public.profiles p where p.id = pid;
$$;

-- ---------------------------------------------------------------------------
-- Internal: connections & conversations (not callable by clients)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_direct_conversation(p_a uuid, p_b uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  conv uuid;
begin
  select m1.conversation_id into conv
  from public.conversation_members m1
  join public.conversation_members m2 on m2.conversation_id = m1.conversation_id and m2.profile_id = p_b
  join public.conversations c on c.id = m1.conversation_id and c.kind = 'direct'
  where m1.profile_id = p_a
  limit 1;

  if conv is null then
    insert into public.conversations (kind) values ('direct') returning id into conv;
    insert into public.conversation_members (conversation_id, profile_id) values (conv, p_a), (conv, p_b);
  end if;
  return conv;
end $$;

create or replace function public.ensure_connection(p_a uuid, p_b uuid, p_origin public.connection_origin)
returns table (connection_id uuid, conversation_id uuid, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  lo uuid := least(p_a, p_b);
  hi uuid := greatest(p_a, p_b);
  c public.connections;
  conv uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(lo::text || hi::text, 0));

  select * into c from public.connections x where x.user_a = lo and x.user_b = hi;
  if c.id is not null then
    if c.conversation_id is null then
      conv := public.ensure_direct_conversation(lo, hi);
      update public.connections x set conversation_id = conv where x.id = c.id;
      c.conversation_id := conv;
    end if;
    return query select c.id, c.conversation_id, false;
    return;
  end if;

  conv := public.ensure_direct_conversation(lo, hi);
  insert into public.connections (user_a, user_b, origin, conversation_id)
    values (lo, hi, p_origin, conv) returning * into c;
  insert into public.messages (conversation_id, sender_id, kind, meta)
    values (conv, null, 'system', jsonb_build_object('event', 'linked', 'origin', p_origin));
  return query select c.id, c.conversation_id, true;
end $$;

create or replace function public.bump_usage(uid uuid, what text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  lim public.plan_limits := public.limits_for(uid);
  used integer;
  cap integer;
begin
  insert into public.daily_usage (profile_id, day) values (uid, current_date) on conflict do nothing;
  if what = 'interest' then
    select interests into used from public.daily_usage where profile_id = uid and day = current_date for update;
    cap := lim.daily_interests;
    if cap is not null and used >= cap then
      raise exception 'daily_interest_limit' using errcode = 'PT429', hint = cap::text;
    end if;
    update public.daily_usage set interests = interests + 1 where profile_id = uid and day = current_date;
  else
    select requests into used from public.daily_usage where profile_id = uid and day = current_date for update;
    cap := lim.daily_requests;
    if used >= cap then
      raise exception 'daily_request_limit' using errcode = 'PT429', hint = cap::text;
    end if;
    update public.daily_usage set requests = requests + 1 where profile_id = uid and day = current_date;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: usage & activity
-- ---------------------------------------------------------------------------
create or replace function public.my_usage()
returns jsonb language sql stable security definer set search_path = '' as $$
  with lim as (select * from public.limits_for(auth.uid())),
       u as (select * from public.daily_usage where profile_id = auth.uid() and day = current_date)
  select jsonb_build_object(
    'plan', (select plan from lim),
    'interests_used', coalesce((select interests from u), 0),
    'interests_limit', (select daily_interests from lim),
    'requests_used', coalesce((select requests from u), 0),
    'requests_limit', (select daily_requests from lim),
    'favorites_count', (select count(*) from public.favorites where owner_id = auth.uid()),
    'favorites_limit', (select max_favorites from lim),
    'tracks_count', (select count(*) from public.tracks where owner_id = auth.uid()),
    'tracks_limit', (select max_tracks from lim)
  );
$$;

create or replace function public.touch_activity()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '5 minutes';
$$;

-- ---------------------------------------------------------------------------
-- RPC: discovery
-- ---------------------------------------------------------------------------
create or replace function public.discover_feed(
  p_limit integer default 20,
  p_roles text[] default null,
  p_genres text[] default null,
  p_availability public.availability[] default null,
  p_remote_only boolean default false
)
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me public.profiles;
begin
  perform public.assert_ready(auth.uid());
  select * into me from public.profiles where id = auth.uid();

  return query
  with pool as (
    -- Bounded candidate pool, most recently active first. Replace with a
    -- pre-computed recommendation table when the network grows.
    select c as k
    from public.profiles c
    where c.id <> me.id
      and c.onboarded_at is not null
      and c.is_discoverable
      and not public.is_blocked_pair(me.id, c.id)
      and not exists (
        select 1 from public.swipes s
        where s.actor_id = me.id and s.target_id = c.id
          and (s.decision = 'interest' or s.created_at > now() - interval '30 days')
      )
      and not exists (
        select 1 from public.connections x
        where x.user_a = least(me.id, c.id) and x.user_b = greatest(me.id, c.id)
      )
      and not exists (
        select 1 from public.collab_requests r
        where r.sender_id = me.id and r.recipient_id = c.id and r.status = 'pending'
      )
      and (p_roles is null or cardinality(p_roles) = 0 or c.roles && p_roles)
      and (p_genres is null or cardinality(p_genres) = 0 or c.genres && p_genres)
      and (p_availability is null or cardinality(p_availability) = 0 or c.availability = any (p_availability))
      and (not coalesce(p_remote_only, false) or c.collab_mode <> 'in_person')
    order by c.last_active_at desc
    limit 500
  ),
  scored as (
    select pool.k, public.compatibility(me, pool.k) as fit from pool
  )
  select jsonb_build_object(
    'profile', public.profile_json(s.k),
    'fit', s.fit,
    'tracks', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.position, t.created_at)
      from public.tracks t where t.owner_id = (s.k).id
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.position)
      from public.profile_links l where l.profile_id = (s.k).id
    ), '[]'::jsonb),
    'is_saved', exists (select 1 from public.favorites f where f.owner_id = me.id and f.target_id = (s.k).id)
  )
  from scored s
  -- Small daily-stable jitter (0–6 pts) so equal scores do not always surface the same people.
  order by (s.fit ->> 'score')::integer + (abs(hashtext((s.k).id::text || current_date::text)) % 7) desc,
           (s.k).last_active_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

-- Everything the profile screen needs in one round trip.
create or replace function public.get_profile_bundle(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me public.profiles;
  them public.profiles;
  conn public.connections;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'PT401'; end if;
  select * into me from public.profiles where id = auth.uid();
  select * into them from public.profiles where id = p_id;
  if them.id is null
     or (them.id <> auth.uid() and (them.onboarded_at is null or public.is_blocked_pair(auth.uid(), them.id))) then
    raise exception 'profile_not_found' using errcode = 'PT404';
  end if;

  select * into conn from public.connections x
    where x.user_a = least(auth.uid(), p_id) and x.user_b = greatest(auth.uid(), p_id);

  return jsonb_build_object(
    'profile', public.profile_json(them),
    'fit', case when me.id is not null and me.id <> them.id then public.compatibility(me, them) end,
    'tracks', coalesce((select jsonb_agg(to_jsonb(t) order by t.position, t.created_at)
                        from public.tracks t where t.owner_id = them.id), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(to_jsonb(l) order by l.position)
                       from public.profile_links l where l.profile_id = them.id), '[]'::jsonb),
    'is_saved', exists (select 1 from public.favorites f where f.owner_id = auth.uid() and f.target_id = them.id),
    'my_decision', (select s.decision from public.swipes s where s.actor_id = auth.uid() and s.target_id = them.id),
    'connection', case when conn.id is null then null
                  else jsonb_build_object('id', conn.id, 'conversation_id', conn.conversation_id, 'created_at', conn.created_at) end,
    'pending_sent', (select to_jsonb(r) from public.collab_requests r
                     where r.sender_id = auth.uid() and r.recipient_id = them.id and r.status = 'pending'),
    'pending_received', (select to_jsonb(r) from public.collab_requests r
                         where r.sender_id = them.id and r.recipient_id = auth.uid() and r.status = 'pending')
  );
end $$;

create or replace function public.record_swipe(p_target uuid, p_decision public.swipe_decision)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  prev public.swipe_decision;
  conn_id uuid;
  conv_id uuid;
  mutual boolean := false;
begin
  perform public.assert_ready(me);
  if p_target = me then raise exception 'invalid_target' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_target and onboarded_at is not null)
     or public.is_blocked_pair(me, p_target) then
    raise exception 'target_unavailable' using errcode = 'PT404';
  end if;

  select decision into prev from public.swipes where actor_id = me and target_id = p_target;
  if p_decision = 'interest' and prev is distinct from 'interest' then
    perform public.bump_usage(me, 'interest');
  end if;

  insert into public.swipes (actor_id, target_id, decision) values (me, p_target, p_decision)
  on conflict (actor_id, target_id) do update set decision = excluded.decision, created_at = now();

  if p_decision = 'interest' and exists (
    select 1 from public.swipes where actor_id = p_target and target_id = me and decision = 'interest'
  ) then
    select e.connection_id, e.conversation_id into conn_id, conv_id
      from public.ensure_connection(me, p_target, 'mutual_interest') e;
    mutual := true;
  end if;

  return jsonb_build_object(
    'connected', mutual,
    'connection_id', conn_id,
    'conversation_id', conv_id,
    'usage', public.my_usage()
  );
end $$;

-- ---------------------------------------------------------------------------
-- RPC: collaboration requests & projects
-- ---------------------------------------------------------------------------
create or replace function public.send_collab_request(
  p_target uuid,
  p_message text,
  p_project_title text default null,
  p_track_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  req public.collab_requests;
  conv_id uuid;
  mutual boolean := false;
begin
  perform public.assert_ready(me);
  if p_target = me then raise exception 'invalid_target' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_target and onboarded_at is not null)
     or public.is_blocked_pair(me, p_target) then
    raise exception 'target_unavailable' using errcode = 'PT404';
  end if;
  if exists (select 1 from public.collab_requests
             where sender_id = me and recipient_id = p_target and status = 'pending') then
    raise exception 'request_already_pending' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.collab_requests
             where sender_id = p_target and recipient_id = me and status = 'pending') then
    raise exception 'request_pending_from_them' using errcode = 'P0001';
  end if;
  if p_track_id is not null and not exists (select 1 from public.tracks where id = p_track_id and owner_id = me) then
    raise exception 'invalid_track' using errcode = '22023';
  end if;

  perform public.bump_usage(me, 'request');

  insert into public.collab_requests (sender_id, recipient_id, message, project_title, track_id)
  values (me, p_target, btrim(p_message), nullif(btrim(p_project_title), ''), p_track_id)
  returning * into req;

  -- A proposal implies interest (not counted against the daily interest limit).
  insert into public.swipes (actor_id, target_id, decision) values (me, p_target, 'interest')
  on conflict (actor_id, target_id) do update set decision = 'interest', created_at = now();
  if exists (select 1 from public.swipes where actor_id = p_target and target_id = me and decision = 'interest') then
    select e.conversation_id into conv_id from public.ensure_connection(me, p_target, 'mutual_interest') e;
    mutual := true;
  end if;

  return jsonb_build_object(
    'request', to_jsonb(req),
    'connected', mutual,
    'conversation_id', conv_id,
    'usage', public.my_usage()
  );
end $$;

create or replace function public.respond_collab_request(p_request uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.collab_requests;
  res record;
  t public.tracks;
  collab_id uuid;
  collab_title text;
begin
  perform public.assert_ready(me);
  select * into r from public.collab_requests where id = p_request for update;
  if r.id is null or r.recipient_id <> me then
    raise exception 'request_not_found' using errcode = 'PT404';
  end if;
  if r.status <> 'pending' then
    raise exception 'request_not_pending' using errcode = 'P0001';
  end if;
  if public.is_blocked_pair(r.sender_id, r.recipient_id) then
    raise exception 'target_unavailable' using errcode = 'PT404';
  end if;

  if not p_accept then
    update public.collab_requests set status = 'declined', responded_at = now() where id = r.id;
    return jsonb_build_object('status', 'declined');
  end if;

  update public.collab_requests set status = 'accepted', responded_at = now() where id = r.id;
  select * into res from public.ensure_connection(r.sender_id, r.recipient_id, 'collab_request');

  -- The brief opens the conversation, followed by the attached sound.
  insert into public.messages (conversation_id, sender_id, kind, body)
    values (res.conversation_id, r.sender_id, 'text', r.message);
  if r.track_id is not null then
    select * into t from public.tracks where id = r.track_id;
    if t.id is not null then
      insert into public.messages (conversation_id, sender_id, kind, meta)
      values (res.conversation_id, r.sender_id, 'track', jsonb_build_object(
        'track_id', t.id, 'title', t.title, 'duration_ms', t.duration_ms,
        'waveform', to_jsonb(t.waveform), 'storage_path', t.storage_path
      ));
    end if;
  end if;

  collab_title := coalesce(
    r.project_title,
    (select s.display_name from public.profiles s where s.id = r.sender_id)
      || ' × ' || (select d.display_name from public.profiles d where d.id = r.recipient_id)
  );
  insert into public.collaborations (title, conversation_id, request_id, created_by)
    values (left(collab_title, 80), res.conversation_id, r.id, r.sender_id)
    returning id into collab_id;
  insert into public.collaboration_members (collaboration_id, profile_id)
    values (collab_id, r.sender_id), (collab_id, r.recipient_id);
  insert into public.messages (conversation_id, sender_id, kind, meta)
    values (res.conversation_id, null, 'system',
            jsonb_build_object('event', 'project_started', 'title', left(collab_title, 80)));

  return jsonb_build_object(
    'status', 'accepted',
    'connection_id', res.connection_id,
    'conversation_id', res.conversation_id,
    'collaboration_id', collab_id
  );
end $$;

create or replace function public.withdraw_collab_request(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.collab_requests set status = 'withdrawn', responded_at = now()
    where id = p_request and sender_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request_not_found' using errcode = 'PT404'; end if;
end $$;

create or replace function public.start_collaboration(p_conversation uuid, p_title text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  collab_id uuid;
  clean_title text := left(btrim(p_title), 80);
begin
  perform public.assert_ready(auth.uid());
  if not public.can_post(p_conversation) then
    raise exception 'conversation_closed' using errcode = 'P0001';
  end if;
  if clean_title is null or clean_title = '' then
    raise exception 'title_required' using errcode = '22023';
  end if;
  insert into public.collaborations (title, conversation_id, created_by)
    values (clean_title, p_conversation, auth.uid()) returning id into collab_id;
  insert into public.collaboration_members (collaboration_id, profile_id)
    select collab_id, m.profile_id from public.conversation_members m where m.conversation_id = p_conversation;
  insert into public.messages (conversation_id, sender_id, kind, meta)
    values (p_conversation, null, 'system', jsonb_build_object('event', 'project_started', 'title', clean_title));
  return collab_id;
end $$;

create or replace function public.set_collaboration_status(p_collaboration uuid, p_status public.collaboration_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.collaborations;
begin
  if not public.is_collaboration_member(p_collaboration) then
    raise exception 'collaboration_not_found' using errcode = 'PT404';
  end if;
  update public.collaborations set status = p_status where id = p_collaboration returning * into c;
  if p_status = 'completed' and c.conversation_id is not null then
    insert into public.messages (conversation_id, sender_id, kind, meta)
      values (c.conversation_id, null, 'system', jsonb_build_object('event', 'project_completed', 'title', c.title));
  end if;
end $$;

create or replace function public.remove_connection(p_connection uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.connections
    where id = p_connection and auth.uid() in (user_a, user_b);
  if not found then raise exception 'connection_not_found' using errcode = 'PT404'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: lists for the Links and Messages tabs
-- ---------------------------------------------------------------------------
create or replace function public.list_connections()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', x.id, 'origin', x.origin, 'created_at', x.created_at, 'conversation_id', x.conversation_id,
    'other', public.profile_mini(case when x.user_a = auth.uid() then x.user_b else x.user_a end)
  )
  from public.connections x
  where auth.uid() in (x.user_a, x.user_b)
    and not public.is_blocked_pair(x.user_a, x.user_b)
  order by x.created_at desc;
$$;

create or replace function public.list_requests(p_box text)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'status', r.status, 'message', r.message, 'project_title', r.project_title,
    'created_at', r.created_at, 'responded_at', r.responded_at,
    'direction', p_box,
    'other', public.profile_mini(case when p_box = 'received' then r.sender_id else r.recipient_id end),
    'track', (select jsonb_build_object('id', t.id, 'title', t.title, 'duration_ms', t.duration_ms,
                                        'waveform', t.waveform, 'storage_path', t.storage_path)
              from public.tracks t where t.id = r.track_id)
  )
  from public.collab_requests r
  where ((p_box = 'received' and r.recipient_id = auth.uid() and r.status = 'pending')
      or (p_box = 'sent' and r.sender_id = auth.uid() and r.status in ('pending', 'declined')))
    and not public.is_blocked_pair(r.sender_id, r.recipient_id)
  order by r.created_at desc
  limit 100;
$$;

create or replace function public.list_collaborations()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'status', c.status, 'conversation_id', c.conversation_id,
    'created_at', c.created_at, 'updated_at', c.updated_at,
    'members', (select coalesce(jsonb_agg(public.profile_mini(m.profile_id)), '[]'::jsonb)
                from public.collaboration_members m
                where m.collaboration_id = c.id and m.profile_id <> auth.uid())
  )
  from public.collaborations c
  join public.collaboration_members me on me.collaboration_id = c.id and me.profile_id = auth.uid()
  where c.status <> 'archived'
  order by (c.status = 'active') desc, c.updated_at desc;
$$;

create or replace function public.list_favorites()
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  return query
  select jsonb_build_object(
    'created_at', f.created_at,
    'profile', public.profile_mini(p.id),
    'fit', case when me.onboarded_at is not null then public.compatibility(me, p) end
  )
  from public.favorites f
  join public.profiles p on p.id = f.target_id
  where f.owner_id = auth.uid() and not public.is_blocked_pair(auth.uid(), p.id)
  order by f.created_at desc;
end $$;

create or replace function public.list_conversations()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id,
    'kind', c.kind,
    'created_at', c.created_at,
    'last_message_at', c.last_message_at,
    'other', (select public.profile_mini(o.profile_id) from public.conversation_members o
              where o.conversation_id = c.id and o.profile_id <> auth.uid() limit 1),
    'last_message', (select to_jsonb(m) from public.messages m
                     where m.conversation_id = c.id order by m.created_at desc limit 1),
    'unread_count', (select count(*) from public.messages m
                     where m.conversation_id = c.id and m.sender_id is distinct from auth.uid()
                       and (mm.last_read_at is null or m.created_at > mm.last_read_at)),
    'can_post', public.can_post(c.id),
    'muted', mm.muted
  )
  from public.conversation_members mm
  join public.conversations c on c.id = mm.conversation_id
  where mm.profile_id = auth.uid()
    and not exists (
      select 1 from public.conversation_members o
      where o.conversation_id = c.id and o.profile_id <> auth.uid()
        and public.is_blocked_pair(auth.uid(), o.profile_id)
    )
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation and profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- RPC: safety
-- ---------------------------------------------------------------------------
create or replace function public.block_user(p_target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated' using errcode = 'PT401'; end if;
  if p_target = me then raise exception 'invalid_target' using errcode = '22023'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, p_target) on conflict do nothing;
  delete from public.connections where user_a = least(me, p_target) and user_b = greatest(me, p_target);
  update public.collab_requests set status = 'withdrawn', responded_at = now()
    where status = 'pending'
      and ((sender_id = me and recipient_id = p_target) or (sender_id = p_target and recipient_id = me));
  delete from public.favorites
    where (owner_id = me and target_id = p_target) or (owner_id = p_target and target_id = me);
end $$;

create or replace function public.unblock_user(p_target uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target;
$$;

-- Blocked profiles are hidden by RLS, so the settings screen needs this.
create or replace function public.list_blocked()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('blocked_at', b.created_at, 'profile', public.profile_mini(b.blocked_id))
  from public.blocks b where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

create or replace function public.report_content(
  p_reason public.report_reason,
  p_target_profile uuid default null,
  p_message uuid default null,
  p_track uuid default null,
  p_details text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ev jsonb := '{}'::jsonb;
  m public.messages;
  t public.tracks;
  target uuid := p_target_profile;
  report_id uuid;
begin
  if me is null then raise exception 'not_authenticated' using errcode = 'PT401'; end if;
  if (select count(*) from public.reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'report_limit' using errcode = 'PT429';
  end if;

  if p_message is not null then
    select * into m from public.messages where id = p_message;
    if m.id is null or not public.is_conversation_member(m.conversation_id) then
      raise exception 'message_not_found' using errcode = 'PT404';
    end if;
    target := coalesce(target, m.sender_id);
    ev := ev || jsonb_build_object('message', jsonb_build_object(
      'kind', m.kind, 'body', m.body, 'meta', m.meta, 'attachment_path', m.attachment_path,
      'sender_id', m.sender_id, 'created_at', m.created_at));
  end if;

  if p_track is not null then
    select * into t from public.tracks where id = p_track;
    if t.id is null then raise exception 'track_not_found' using errcode = 'PT404'; end if;
    target := coalesce(target, t.owner_id);
    ev := ev || jsonb_build_object('track', jsonb_build_object(
      'title', t.title, 'storage_path', t.storage_path, 'owner_id', t.owner_id));
  end if;

  if target is null then raise exception 'report_target_required' using errcode = '22023'; end if;
  if target = me then raise exception 'invalid_target' using errcode = '22023'; end if;

  ev := ev || jsonb_build_object('profile', (
    select jsonb_build_object('display_name', p.display_name, 'handle', p.handle, 'bio', p.bio,
                              'avatar_path', p.avatar_path, 'looking_for', p.looking_for)
    from public.profiles p where p.id = target));

  insert into public.reports (reporter_id, target_profile_id, target_message_id, target_track_id, reason, details, evidence)
  values (me, target, p_message, p_track, p_reason, nullif(left(btrim(p_details), 1000), ''), ev)
  returning id into report_id;
  return report_id;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: GDPR export
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'links', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.profile_links l where l.profile_id = auth.uid()),
    'tracks', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.tracks t where t.owner_id = auth.uid()),
    'swipes', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.swipes s where s.actor_id = auth.uid()),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.favorites f where f.owner_id = auth.uid()),
    'connections', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.connections x where auth.uid() in (x.user_a, x.user_b)),
    'collab_requests', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.collab_requests r where auth.uid() in (r.sender_id, r.recipient_id)),
    'messages_sent', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.messages m where m.sender_id = auth.uid()),
    'blocks', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.blocks b where b.blocker_id = auth.uid()),
    'reports_filed', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'reason', r.reason, 'created_at', r.created_at, 'status', r.status)), '[]')
                      from public.reports r where r.reporter_id = auth.uid()),
    'entitlement', (select to_jsonb(e) from public.entitlements e where e.profile_id = auth.uid()),
    'push_tokens', (select coalesce(jsonb_agg(jsonb_build_object('platform', pt.platform, 'created_at', pt.created_at)), '[]')
                    from public.push_tokens pt where pt.profile_id = auth.uid())
  );
$$;

-- Used by the delete-account Edge Function (service role only).
create or replace function public.account_storage_objects(uid uuid)
returns table (bucket_id text, name text) language sql stable security definer set search_path = '' as $$
  select o.bucket_id, o.name from storage.objects o
  where o.owner_id = uid::text
     or (o.bucket_id in ('images', 'tracks') and (storage.foldername(o.name))[1] = uid::text);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
create policy "taxonomy readable" on public.taxonomy for select to anon, authenticated using (true);
create policy "complement rules readable" on public.complement_rules for select to anon, authenticated using (true);
create policy "plan limits readable" on public.plan_limits for select to authenticated using (true);

create policy "profiles visible" on public.profiles for select to authenticated
  using (id = auth.uid() or (onboarded_at is not null and not public.is_blocked_pair(auth.uid(), id)));
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "links visible" on public.profile_links for select to authenticated
  using (profile_id = auth.uid() or not public.is_blocked_pair(auth.uid(), profile_id));
create policy "links insert own" on public.profile_links for insert to authenticated
  with check (profile_id = auth.uid());
create policy "links update own" on public.profile_links for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "links delete own" on public.profile_links for delete to authenticated
  using (profile_id = auth.uid());

create policy "tracks visible" on public.tracks for select to authenticated
  using (owner_id = auth.uid() or not public.is_blocked_pair(auth.uid(), owner_id));
create policy "tracks insert own" on public.tracks for insert to authenticated
  with check (owner_id = auth.uid());
create policy "tracks update own" on public.tracks for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "tracks delete own" on public.tracks for delete to authenticated
  using (owner_id = auth.uid());

-- Swipes are private to their author. Writes only through record_swipe().
create policy "swipes own" on public.swipes for select to authenticated using (actor_id = auth.uid());

create policy "favorites own" on public.favorites for select to authenticated using (owner_id = auth.uid());
create policy "favorites insert own" on public.favorites for insert to authenticated
  with check (owner_id = auth.uid() and not public.is_blocked_pair(owner_id, target_id));
create policy "favorites delete own" on public.favorites for delete to authenticated using (owner_id = auth.uid());

create policy "conversations members" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy "conversation members visible" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "connections members" on public.connections for select to authenticated
  using (auth.uid() in (user_a, user_b));

create policy "requests parties" on public.collab_requests for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));

create policy "collaborations members" on public.collaborations for select to authenticated
  using (public.is_collaboration_member(id));
create policy "collaboration members visible" on public.collaboration_members for select to authenticated
  using (public.is_collaboration_member(collaboration_id));

create policy "messages readable by members" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages insert by members" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and kind in ('text', 'link', 'audio')
    and public.can_post(conversation_id)
  );

create policy "blocks own" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks delete own" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy "reports own" on public.reports for select to authenticated using (reporter_id = auth.uid());

create policy "push tokens own" on public.push_tokens for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "entitlements own" on public.entitlements for select to authenticated using (profile_id = auth.uid());
create policy "usage own" on public.daily_usage for select to authenticated using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; internal helpers not callable from the API.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select on public.taxonomy, public.complement_rules to anon;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function
  public.ensure_direct_conversation(uuid, uuid),
  public.ensure_connection(uuid, uuid, public.connection_origin),
  public.bump_usage(uuid, text),
  public.current_plan(uuid),
  public.limits_for(uuid),
  public.assert_ready(uuid),
  public.account_storage_objects(uuid),
  public.profile_mini(uuid)
from authenticated;
grant execute on function public.account_storage_objects(uuid) to service_role;

-- Future functions are not exposed to anon by default.
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.collab_requests, public.connections;
  end if;
end $$;
