-- =====================================================================
--  The Investment Trail — Supabase setup
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Safe to run again: it keeps existing data and updates the functions.
--
--  Security model
--  * Teams and the organiser log in with a code, not a Supabase account.
--  * All tables have Row Level Security ON with no policies, so the
--    browser (anon key) cannot read or write them directly.
--  * Everything goes through four functions that check the code first:
--      login(code) · get_state(code) · team_action(...) · admin_action(...)
--  * Each team walks the points in order from its own start point and
--    only ever receives the next one. Task instructions are only returned
--    after the server has checked the team was within the radius.
--  * Bonus tasks have a location. A team that claims one must finish it
--    before its next point appears; other teams don't see it meanwhile.
--    After one team finishes it the bonus closes; the organiser can offer
--    it again to the teams that haven't done it yet.
--  * "ticks" is a one-row public counter; the app listens to it via
--    Realtime and re-fetches its state when it changes.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table if not exists public.settings (
  id           int primary key default 1 check (id = 1),
  admin_hash   text not null,
  title        text not null default 'The Investment Trail',
  organizer    text not null default 'ABN AMRO Investments · Team event',
  status       text not null default 'setup' check (status in ('setup','live','ended')),
  bbox         jsonb,
  finish       jsonb,
  finish_title text not null default 'The finish',
  finish_text  text not null default 'Well done! Head to the finish to meet the organisers.',
  winner_id    uuid,
  radius       int  not null default 15,
  bg_url       text,
  bg_opacity   real not null default 0.85
);

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,
  members    text[] not null default '{}',
  last_lat   float8,
  last_lng   float8,
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.points (
  id         uuid primary key default gen_random_uuid(),
  n          int not null default 0,
  kind       text not null default 'question' check (kind in ('question','assignment','activity')),
  title      text not null,
  prompt     text not null default '',
  resp       text not null default 'text' check (resp in ('text','photo','both')),
  value      int  not null default 10,
  expect     text not null default '',
  lat        float8 not null,
  lng        float8 not null,
  radius     int,
  created_at timestamptz not null default now()
);

create table if not exists public.bonuses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  prompt      text not null default '',
  resp        text not null default 'photo' check (resp in ('text','photo','both')),
  value       int  not null default 25,
  released    boolean not null default false,
  claim_team  uuid references public.teams(id) on delete set null,
  claim_at    timestamptz,
  done_by     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.unlocks (
  team_id  uuid not null references public.teams(id) on delete cascade,
  point_id uuid not null references public.points(id) on delete cascade,
  manual   boolean not null default false,
  at       timestamptz not null default now(),
  primary key (team_id, point_id)
);

create table if not exists public.subs (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  target    text not null check (target in ('point','bonus')),
  target_id uuid not null,
  body      text not null default '',
  photo     text,
  status    text not null default 'review' check (status in ('review','ok','rejected')),
  awarded   int  not null default 0,
  note      text not null default '',
  at        timestamptz not null default now(),
  unique (team_id, target_id)
);

create table if not exists public.msgs (
  id      bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  sender  text not null check (sender in ('team','admin')),
  body    text not null,
  at      timestamptz not null default now()
);

create table if not exists public.reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  side    text not null check (side in ('team','admin')),
  at      timestamptz not null default now(),
  primary key (team_id, side)
);

create table if not exists public.ticks (
  id int primary key default 1 check (id = 1),
  v  bigint not null default 0
);
insert into public.ticks (id, v) values (1, 0) on conflict do nothing;

-- Added later (safe to re-run): start point per team, location-based bonus tasks
alter table public.teams   add column if not exists start_point uuid references public.points(id) on delete set null;
alter table public.bonuses add column if not exists lat float8;
alter table public.bonuses add column if not exists lng float8;
alter table public.bonuses add column if not exists radius int;
alter table public.bonuses add column if not exists claim_unlocked boolean not null default false;
alter table public.bonuses add column if not exists expect text not null default '';

-- First organiser code: ADMIN-2026 (change it in the app under Settings).
insert into public.settings (id, admin_hash)
values (1, extensions.crypt('ADMIN2026', extensions.gen_salt('bf')))
on conflict do nothing;

-- ---------- row level security ----------
alter table public.settings enable row level security;
alter table public.teams    enable row level security;
alter table public.points   enable row level security;
alter table public.bonuses  enable row level security;
alter table public.unlocks  enable row level security;
alter table public.subs     enable row level security;
alter table public.msgs     enable row level security;
alter table public.reads    enable row level security;
alter table public.ticks    enable row level security;

drop policy if exists "ticks are public" on public.ticks;
create policy "ticks are public" on public.ticks for select to anon, authenticated using (true);

-- Realtime on the tick counter only
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticks') then
    alter publication supabase_realtime add table public.ticks;
  end if;
end $$;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "trail photo upload" on storage.objects;
create policy "trail photo upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos');

-- ---------- helpers ----------
create or replace function public._norm(t text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(t,''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public._is_admin(p_code text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from settings where admin_hash = extensions.crypt(_norm(p_code), admin_hash))
$$;

create or replace function public._team(p_code text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from teams where _norm(code) = _norm(p_code) and _norm(p_code) <> '' limit 1
$$;

create or replace function public._bump() returns void
language sql security definer set search_path = public as $$
  update ticks set v = v + 1 where id = 1
$$;

create or replace function public._dist(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns float8
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public._new_code() returns text
language plpgsql security definer set search_path = public as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    c := substr(c,1,3) || '-' || substr(c,4,3);
    exit when not exists (select 1 from teams where _norm(code) = _norm(c));
  end loop;
  return c;
end $$;

create or replace function public._score(p_team uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(awarded), 0)::int from subs where team_id = p_team and status = 'ok'
$$;

create or replace function public._all_done(p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from points) > 0 and not exists (
    select 1 from points p where not exists (
      select 1 from subs s where s.team_id = p_team and s.target_id = p.id and s.status <> 'rejected'))
$$;

-- ---------- login ----------
create or replace function public.login(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  if _is_admin(p_code) then return jsonb_build_object('role', 'admin'); end if;
  t := _team(p_code);
  if t is not null then return jsonb_build_object('role', 'team', 'team_id', t); end if;
  return null;
end $$;

-- ---------- route helpers ----------
-- Each team walks all points in order of their number, starting at its own
-- start point and wrapping around. Without a chosen start point, teams are
-- spread over the points in the order they were created.
create or replace function public._team_seq(p_team uuid) returns table(point_id uuid, pos int)
language sql stable security definer set search_path = public as $$
  with pts as (
    select id, (row_number() over (order by n, created_at) - 1)::int as i, count(*) over ()::int as cnt from points
  ), st as (
    select coalesce(
      (select i from pts where id = (select start_point from teams where id = p_team)),
      (select (x.rn % greatest((select count(*) from points), 1))::int
         from (select id, (row_number() over (order by created_at) - 1) rn from teams) x where x.id = p_team),
      0) as s
  )
  select pts.id, ((pts.i - st.s + pts.cnt) % pts.cnt)::int from pts, st
$$;

create or replace function public._next_point(p_team uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select q.point_id from _team_seq(p_team) q
  where not exists (select 1 from subs s where s.team_id = p_team and s.target_id = q.point_id and s.status <> 'rejected')
  order by q.pos limit 1
$$;

create or replace function public._active_bonus(p_team uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from bonuses where claim_team = p_team limit 1
$$;

-- ---------- state ----------
create or replace function public.get_state(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s settings; tid uuid; adm boolean; done boolean; nxt uuid; act uuid;
  res jsonb;
begin
  select * into s from settings where id = 1;
  adm := _is_admin(p_code);
  if not adm then tid := _team(p_code); end if;
  if not adm and tid is null then return null; end if;

  if adm then
    return jsonb_build_object(
      'role', 'admin',
      'config', to_jsonb(s) - 'admin_hash',
      'points', coalesce((select jsonb_agg(to_jsonb(p) order by p.n) from points p), '[]'),
      'bonuses', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at) from bonuses b), '[]'),
      'teams', coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object(
          'score', _score(t.id), 'all_done', _all_done(t.id), 'next_point', _next_point(t.id),
          'start_eff', (select point_id from _team_seq(t.id) where pos = 0)) order by t.created_at) from teams t), '[]'),
      'unlocks', coalesce((select jsonb_agg(to_jsonb(u)) from unlocks u), '[]'),
      'subs', coalesce((select jsonb_agg(to_jsonb(x) order by x.at) from subs x), '[]'),
      'msgs', coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from msgs m), '[]'),
      'reads', coalesce((select jsonb_agg(to_jsonb(r)) from reads r), '[]')
    );
  end if;

  done := _all_done(tid);
  act := case when s.status = 'live' then _active_bonus(tid) end;
  nxt := case when act is null then _next_point(tid) end;
  res := jsonb_build_object(
    'role', 'team',
    'team_id', tid,
    'config', jsonb_build_object(
      'title', s.title, 'organizer', s.organizer, 'status', s.status, 'bbox', s.bbox,
      'radius', s.radius, 'winner_id', case when s.status = 'ended' then s.winner_id end,
      'finish', case when done or s.status = 'ended' then s.finish end,
      'finish_title', case when done then s.finish_title end,
      'finish_text', case when done then s.finish_text end,
      'all_done', done, 'points_total', (select count(*) from points),
      'bonus_active', act is not null),
    -- only points already done, plus the single next point on this team's route
    'points', case when s.status = 'setup' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'seq', q.pos + 1, 'kind', p.kind, 'title', p.title, 'resp', p.resp, 'value', p.value,
        'lat', p.lat, 'lng', p.lng, 'radius', coalesce(p.radius, s.radius),
        'is_next', p.id = nxt,
        'unlocked', u.point_id is not null,
        'prompt', case when u.point_id is not null then p.prompt end) order by q.pos)
      from _team_seq(tid) q join points p on p.id = q.point_id
      left join unlocks u on u.point_id = p.id and u.team_id = tid
      where p.id = nxt or exists (select 1 from subs x where x.team_id = tid and x.target_id = p.id and x.status <> 'rejected')), '[]') end,
    'bonuses', case when s.status <> 'live' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'title', b.title, 'resp', b.resp, 'value', b.value,
        'lat', b.lat, 'lng', b.lng, 'radius', coalesce(b.radius, s.radius),
        'mine', b.claim_team is not distinct from tid,
        'unlocked', b.claim_team is not distinct from tid and b.claim_unlocked,
        'prompt', case when b.claim_team = tid and b.claim_unlocked then b.prompt end) order by b.created_at)
      from bonuses b
      where b.released and b.lat is not null and not (tid = any(b.done_by))
        and (case when act is not null then b.id = act else b.claim_team is null end)), '[]') end,
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'score', _score(t.id),
        'members', case when t.id = tid then to_jsonb(t.members) end) order by t.created_at)
      from teams t where t.id = tid or s.status = 'ended'), '[]'),
    'subs', coalesce((select jsonb_agg(to_jsonb(x) order by x.at) from subs x where x.team_id = tid), '[]'),
    'msgs', coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from msgs m where m.team_id = tid), '[]'),
    'reads', coalesce((select jsonb_agg(to_jsonb(r)) from reads r where r.team_id = tid), '[]')
  );
  return res;
end $$;

-- ---------- team actions ----------
create or replace function public.team_action(p_code text, p_action text, p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  tid uuid; s settings; pt points; d float8; eff float8; rad int;
  tgt uuid; st text; aw int; alts text[]; prev subs; b bonuses; act uuid;
  plat float8; plng float8;
begin
  tid := _team(p_code);
  if tid is null then raise exception 'not_logged_in'; end if;
  select * into s from settings where id = 1;
  act := _active_bonus(tid);

  if p_action = 'ping' then
    update teams set last_lat = (p->>'lat')::float8, last_lng = (p->>'lng')::float8, last_seen = now() where id = tid;
    return '{"ok":true}';
  end if;

  if p_action = 'profile' then
    update teams set
      name = coalesce(nullif(left(trim(p->>'name'), 40), ''), name),
      members = coalesce((select array_agg(left(trim(x), 60)) from jsonb_array_elements_text(p->'members') x where trim(x) <> ''), '{}')
    where id = tid;

  elsif p_action = 'msg' then
    if coalesce(trim(p->>'body'), '') = '' then return '{"ok":false}'; end if;
    insert into msgs (team_id, sender, body) values (tid, 'team', left(p->>'body', 1000));

  elsif p_action = 'read' then
    insert into reads (team_id, side, at) values (tid, 'team', now())
    on conflict (team_id, side) do update set at = now();
    return '{"ok":true}';

  elsif p_action = 'unlock' then
    if s.status <> 'live' then return jsonb_build_object('ok', false, 'reason', 'not_live'); end if;
    plat := (p->>'lat')::float8; plng := (p->>'lng')::float8;
    update teams set last_lat = plat, last_lng = plng, last_seen = now() where id = tid;
    if nullif(p->>'bonus_id', '') is not null then
      select * into b from bonuses where id = (p->>'bonus_id')::uuid and claim_team = tid;
      if not found then return jsonb_build_object('ok', false, 'reason', 'not_claimed'); end if;
      rad := coalesce(b.radius, s.radius);
      d := _dist(plat, plng, b.lat, b.lng);
    else
      if act is not null then return jsonb_build_object('ok', false, 'reason', 'bonus_first'); end if;
      select * into pt from points where id = (p->>'point_id')::uuid;
      if not found or pt.id is distinct from _next_point(tid) then return jsonb_build_object('ok', false, 'reason', 'not_next'); end if;
      rad := coalesce(pt.radius, s.radius);
      d := _dist(plat, plng, pt.lat, pt.lng);
    end if;
    -- allow for GPS uncertainty, but never more than 20 m extra
    eff := d - least(greatest(coalesce((p->>'acc')::float8, 0), 0), 20);
    if eff > rad then return jsonb_build_object('ok', false, 'reason', 'too_far', 'dist', round(d)); end if;
    if b.id is not null then update bonuses set claim_unlocked = true where id = b.id;
    else insert into unlocks (team_id, point_id) values (tid, pt.id) on conflict do nothing; end if;

  elsif p_action = 'submit' then
    if s.status <> 'live' then return jsonb_build_object('ok', false, 'reason', 'not_live'); end if;
    tgt := (p->>'target_id')::uuid;
    select * into prev from subs where team_id = tid and target_id = tgt;
    if found and prev.status <> 'rejected' then return jsonb_build_object('ok', false, 'reason', 'already'); end if;

    if p->>'target' = 'point' then
      if act is not null then return jsonb_build_object('ok', false, 'reason', 'bonus_first'); end if;
      select * into pt from points where id = tgt;
      if not found or tgt is distinct from _next_point(tid) then return jsonb_build_object('ok', false, 'reason', 'not_next'); end if;
      if not exists (select 1 from unlocks where team_id = tid and point_id = tgt) then
        return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
      st := 'review'; aw := 0;
      if pt.kind = 'question' and pt.expect <> '' and coalesce(p->>'body', '') <> '' then
        select array_agg(_norm(x)) into alts from unnest(string_to_array(pt.expect, '|')) x where _norm(x) <> '';
        if _norm(p->>'body') = any(alts) then st := 'ok'; aw := pt.value; end if;
      end if;
      insert into subs (team_id, target, target_id, body, photo, status, awarded, note, at)
      values (tid, 'point', tgt, left(coalesce(p->>'body', ''), 4000), p->>'photo', st, aw, '', now())
      on conflict (team_id, target_id) do update set body = excluded.body, photo = excluded.photo,
        status = excluded.status, awarded = excluded.awarded, note = '', at = now();
      perform _bump();
      return jsonb_build_object('ok', true, 'status', st, 'awarded', aw);

    elsif p->>'target' = 'bonus' then
      select * into b from bonuses where id = tgt;
      if not found or b.claim_team is distinct from tid then return jsonb_build_object('ok', false, 'reason', 'not_claimed'); end if;
      if not b.claim_unlocked then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
      st := 'review'; aw := 0;
      if b.expect <> '' and coalesce(p->>'body', '') <> '' then
        select array_agg(_norm(x)) into alts from unnest(string_to_array(b.expect, '|')) x where _norm(x) <> '';
        if _norm(p->>'body') = any(alts) then st := 'ok'; aw := b.value; end if;
      end if;
      insert into subs (team_id, target, target_id, body, photo, status, awarded, note, at)
      values (tid, 'bonus', tgt, left(coalesce(p->>'body', ''), 4000), p->>'photo', st, aw, '', now())
      on conflict (team_id, target_id) do update set body = excluded.body, photo = excluded.photo,
        status = excluded.status, awarded = excluded.awarded, note = '', at = now();
      -- one round = one team: the bonus closes until the organiser offers it again
      update bonuses set claim_team = null, claim_at = null, claim_unlocked = false, released = false,
        done_by = (select array_agg(distinct x) from unnest(done_by || tid) x) where id = tgt;
      perform _bump();
      return jsonb_build_object('ok', true, 'status', st, 'awarded', aw);
    end if;

  elsif p_action = 'claim' then
    if s.status <> 'live' then return jsonb_build_object('ok', false, 'reason', 'not_live'); end if;
    if act is not null then return jsonb_build_object('ok', false, 'reason', 'bonus_first'); end if;
    update bonuses set claim_team = tid, claim_at = now(), claim_unlocked = false
     where id = (p->>'bonus_id')::uuid and released and lat is not null and claim_team is null and not (tid = any(done_by));
    if not found then return jsonb_build_object('ok', false, 'reason', 'taken'); end if;

  else
    raise exception 'unknown_action';
  end if;

  perform _bump();
  return '{"ok":true}';
end $$;

-- ---------- organiser actions ----------
create or replace function public.admin_action(p_code text, p_action text, p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare new_id uuid; c text; w uuid;
begin
  if not _is_admin(p_code) then raise exception 'not_admin'; end if;

  if p_action = 'config' then
    update settings set
      title        = case when p ? 'title'        then coalesce(nullif(trim(p->>'title'), ''), title) else title end,
      organizer    = case when p ? 'organizer'    then coalesce(p->>'organizer', '') else organizer end,
      bbox         = case when p ? 'bbox'         then p->'bbox' else bbox end,
      finish       = case when p ? 'finish'       then p->'finish' else finish end,
      finish_title = case when p ? 'finish_title' then coalesce(p->>'finish_title', '') else finish_title end,
      finish_text  = case when p ? 'finish_text'  then coalesce(p->>'finish_text', '') else finish_text end,
      radius       = case when p ? 'radius'       then greatest(5, least(500, (p->>'radius')::int)) else radius end,
      bg_url       = case when p ? 'bg_url'       then p->>'bg_url' else bg_url end,
      bg_opacity   = case when p ? 'bg_opacity'   then (p->>'bg_opacity')::real else bg_opacity end
    where id = 1;

  elsif p_action = 'admin_code' then
    if length(_norm(p->>'code')) < 4 then raise exception 'code_too_short'; end if;
    if exists (select 1 from teams where _norm(code) = _norm(p->>'code')) then raise exception 'code_in_use'; end if;
    update settings set admin_hash = extensions.crypt(_norm(p->>'code'), extensions.gen_salt('bf')) where id = 1;

  elsif p_action = 'start' then
    update settings set status = 'live' where id = 1;
  elsif p_action = 'reopen' then
    update settings set status = 'live', winner_id = null where id = 1;
  elsif p_action = 'end' then
    select t.id into w from teams t
      order by _score(t.id) desc,
               (select count(*) from subs s where s.team_id = t.id and s.status <> 'rejected' and s.target = 'point') desc,
               (select max(at) from subs s where s.team_id = t.id and s.status = 'ok') asc nulls last
      limit 1;
    update settings set status = 'ended', winner_id = w where id = 1;

  elsif p_action = 'reset' then
    -- clears all progress (answers, unlocks, chat) but keeps teams, points and bonus tasks
    delete from subs where true; delete from unlocks where true; delete from msgs where true; delete from reads where true;
    update bonuses set claim_team = null, claim_at = null, claim_unlocked = false, done_by = '{}', released = false where true;
    update teams set last_lat = null, last_lng = null, last_seen = null where true;
    update settings set status = 'setup', winner_id = null where id = 1;

  elsif p_action = 'point_save' then
    if nullif(p->>'id', '') is null then
      insert into points (n, kind, title, prompt, resp, value, expect, lat, lng, radius)
      values ((select coalesce(max(n), 0) + 1 from points), p->>'kind', p->>'title', coalesce(p->>'prompt', ''),
              p->>'resp', coalesce((p->>'value')::int, 0), coalesce(p->>'expect', ''),
              (p->>'lat')::float8, (p->>'lng')::float8, nullif(p->>'radius', '')::int)
      returning id into new_id;
      perform _bump();
      return jsonb_build_object('ok', true, 'id', new_id);
    end if;
    update points set
      kind   = coalesce(p->>'kind', kind),   title  = coalesce(p->>'title', title),
      prompt = coalesce(p->>'prompt', prompt), resp = coalesce(p->>'resp', resp),
      value  = coalesce((p->>'value')::int, value), expect = coalesce(p->>'expect', expect),
      lat    = coalesce((p->>'lat')::float8, lat), lng = coalesce((p->>'lng')::float8, lng),
      radius = case when p ? 'radius' then nullif(p->>'radius', '')::int else radius end
    where id = (p->>'id')::uuid;

  elsif p_action = 'point_delete' then
    delete from points where id = (p->>'id')::uuid;
    delete from subs where target = 'point' and target_id = (p->>'id')::uuid;
    update points set n = r.rn from (select id, row_number() over (order by n, created_at) rn from points) r where points.id = r.id;

  elsif p_action = 'team_save' then
    if nullif(p->>'id', '') is null then
      c := _new_code();
      insert into teams (name, code, members)
      values (coalesce(nullif(trim(p->>'name'), ''), 'Team ' || ((select count(*) from teams) + 1)), c,
              coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(p->'members') x where trim(x) <> ''), '{}'))
      returning id into new_id;
      perform _bump();
      return jsonb_build_object('ok', true, 'id', new_id, 'code', c);
    end if;
    update teams set
      name = coalesce(nullif(trim(p->>'name'), ''), name),
      members = case when p ? 'members' then coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(p->'members') x where trim(x) <> ''), '{}') else members end,
      start_point = case when p ? 'start_point' then nullif(p->>'start_point', '')::uuid else start_point end
    where id = (p->>'id')::uuid;

  elsif p_action = 'team_newcode' then
    c := _new_code();
    update teams set code = c where id = (p->>'id')::uuid;
    perform _bump();
    return jsonb_build_object('ok', true, 'code', c);

  elsif p_action = 'team_delete' then
    delete from teams where id = (p->>'id')::uuid;

  elsif p_action = 'unlock' then
    if nullif(p->>'bonus_id', '') is not null then
      update bonuses set claim_unlocked = true where id = (p->>'bonus_id')::uuid and claim_team = (p->>'team_id')::uuid;
    else
      insert into unlocks (team_id, point_id, manual) values ((p->>'team_id')::uuid, (p->>'point_id')::uuid, true)
      on conflict do nothing;
    end if;

  elsif p_action = 'review' then
    update subs set status = p->>'status',
      awarded = case when p->>'status' = 'ok' then greatest(0, coalesce((p->>'awarded')::int, 0)) else 0 end,
      note = coalesce(p->>'note', '')
    where id = (p->>'id')::uuid;

  elsif p_action = 'bonus_save' then
    if nullif(p->>'id', '') is null then
      insert into bonuses (title, prompt, resp, value, expect, lat, lng, radius)
      values (p->>'title', coalesce(p->>'prompt', ''), coalesce(p->>'resp', 'photo'), coalesce((p->>'value')::int, 25),
              coalesce(p->>'expect', ''), (p->>'lat')::float8, (p->>'lng')::float8, nullif(p->>'radius', '')::int);
    else
      update bonuses set title = coalesce(p->>'title', title), prompt = coalesce(p->>'prompt', prompt),
        resp = coalesce(p->>'resp', resp), value = coalesce((p->>'value')::int, value),
        expect = coalesce(p->>'expect', expect),
        lat = coalesce((p->>'lat')::float8, lat), lng = coalesce((p->>'lng')::float8, lng),
        radius = case when p ? 'radius' then nullif(p->>'radius', '')::int else radius end
      where id = (p->>'id')::uuid;
    end if;
  elsif p_action = 'bonus_delete' then
    delete from bonuses where id = (p->>'id')::uuid;
    delete from subs where target = 'bonus' and target_id = (p->>'id')::uuid;
  elsif p_action = 'bonus_release' then
    update bonuses set released = coalesce((p->>'released')::boolean, true) where id = (p->>'id')::uuid;
  elsif p_action = 'bonus_free' then
    update bonuses set claim_team = null, claim_at = null, claim_unlocked = false where id = (p->>'id')::uuid;

  elsif p_action = 'msg' then
    if coalesce(trim(p->>'body'), '') = '' then return '{"ok":false}'; end if;
    insert into msgs (team_id, sender, body) values ((p->>'team_id')::uuid, 'admin', left(p->>'body', 1000));
  elsif p_action = 'read' then
    insert into reads (team_id, side, at) values ((p->>'team_id')::uuid, 'admin', now())
    on conflict (team_id, side) do update set at = now();
    return '{"ok":true}';

  else
    raise exception 'unknown_action';
  end if;

  perform _bump();
  return '{"ok":true}';
end $$;

-- ---------- who may call what ----------
revoke all on function public._norm(text), public._is_admin(text), public._team(text), public._bump(),
  public._dist(float8, float8, float8, float8), public._new_code(), public._score(uuid), public._all_done(uuid),
  public._team_seq(uuid), public._next_point(uuid), public._active_bonus(uuid)
  from public, anon, authenticated;
grant execute on function public._norm(text) to anon, authenticated;
grant execute on function public.login(text), public.get_state(text),
  public.team_action(text, text, jsonb), public.admin_action(text, text, jsonb) to anon, authenticated;
