-- Reference data. Keep in sync with mobile/src/domain/taxonomy.ts
-- (supabase/tests/parity.test.ts compares both).

insert into public.taxonomy (kind, slug, position) values
  -- Creator roles
  ('role', 'beatmaker', 1), ('role', 'producer', 2), ('role', 'rapper', 3), ('role', 'singer', 4),
  ('role', 'songwriter', 5), ('role', 'guitarist', 6), ('role', 'pianist', 7), ('role', 'bassist', 8),
  ('role', 'drummer', 9), ('role', 'engineer', 10), ('role', 'composer', 11), ('role', 'dj', 12),
  ('role', 'other', 13),
  -- Genres
  ('genre', 'trap', 1), ('genre', 'rnb', 2), ('genre', 'alt_rnb', 3), ('genre', 'hiphop', 4),
  ('genre', 'drill', 5), ('genre', 'pop', 6), ('genre', 'afro', 7), ('genre', 'electronic', 8),
  ('genre', 'experimental', 9), ('genre', 'ambient', 10), ('genre', 'soul', 11), ('genre', 'boom_bap', 12),
  ('genre', 'lofi', 13), ('genre', 'cloud', 14), ('genre', 'amapiano', 15), ('genre', 'dancehall', 16),
  ('genre', 'reggaeton', 17), ('genre', 'house', 18), ('genre', 'techno', 19), ('genre', 'uk_garage', 20),
  ('genre', 'jersey_club', 21), ('genre', 'hyperpop', 22), ('genre', 'indie', 23), ('genre', 'rock', 24),
  ('genre', 'jazz', 25), ('genre', 'funk', 26), ('genre', 'gospel', 27), ('genre', 'latin', 28),
  -- Skills
  ('skill', 'composition', 1), ('skill', 'production', 2), ('skill', 'sound_design', 3),
  ('skill', 'mixing', 4), ('skill', 'mastering', 5), ('skill', 'writing', 6), ('skill', 'topline', 7),
  ('skill', 'recording', 8), ('skill', 'instrumentation', 9), ('skill', 'arrangement', 10),
  -- Goals
  ('goal', 'find_artists', 1), ('goal', 'find_beatmakers', 2), ('goal', 'find_singers', 3),
  ('goal', 'collaborate', 4), ('goal', 'grow_network', 5), ('goal', 'offer_services', 6),
  ('goal', 'start_collective', 7);

-- What a person is looking for. Goals win; roles are the fallback.
insert into public.complement_rules (kind, slug, wanted_role) values
  ('goal', 'find_artists', 'rapper'), ('goal', 'find_artists', 'singer'), ('goal', 'find_artists', 'songwriter'),
  ('goal', 'find_beatmakers', 'beatmaker'), ('goal', 'find_beatmakers', 'producer'),
  ('goal', 'find_singers', 'singer'),
  ('role', 'beatmaker', 'rapper'), ('role', 'beatmaker', 'singer'), ('role', 'beatmaker', 'songwriter'),
  ('role', 'producer', 'rapper'), ('role', 'producer', 'singer'), ('role', 'producer', 'songwriter'),
  ('role', 'composer', 'singer'), ('role', 'composer', 'songwriter'), ('role', 'composer', 'producer'),
  ('role', 'rapper', 'beatmaker'), ('role', 'rapper', 'producer'), ('role', 'rapper', 'engineer'),
  ('role', 'singer', 'beatmaker'), ('role', 'singer', 'producer'), ('role', 'singer', 'composer'),
  ('role', 'songwriter', 'beatmaker'), ('role', 'songwriter', 'producer'), ('role', 'songwriter', 'singer'),
  ('role', 'engineer', 'rapper'), ('role', 'engineer', 'singer'), ('role', 'engineer', 'producer'),
  ('role', 'guitarist', 'producer'), ('role', 'guitarist', 'singer'), ('role', 'guitarist', 'songwriter'),
  ('role', 'pianist', 'producer'), ('role', 'pianist', 'singer'), ('role', 'pianist', 'songwriter'),
  ('role', 'bassist', 'producer'), ('role', 'bassist', 'guitarist'), ('role', 'bassist', 'drummer'),
  ('role', 'drummer', 'producer'), ('role', 'drummer', 'guitarist'), ('role', 'drummer', 'bassist'),
  ('role', 'dj', 'producer'), ('role', 'dj', 'beatmaker');

-- Limits are anti-spam first. The free plan must stay fully usable for connecting.
insert into public.plan_limits (plan, daily_interests, daily_requests, max_favorites, max_tracks) values
  ('free', 50, 10, 100, 3),
  ('plus', 200, 30, null, 10),
  ('pro', null, 50, null, 25);
