-- =====================================================================
--  Import: route rond OBS Juliana (Overveen) — voor organisator Maaike
--  Run AFTER supabase/setup.sql. Paste into Supabase → SQL Editor → Run.
--  Maaike must already exist as an organiser (Settings → Organisers).
--  Creates a new saved hunt in Maaike's list (not active): she opens it
--  under Hunts. Running it twice does nothing the second time.
--
--  The task texts were not supplied yet: each post has a placeholder.
--  Fill them in in the app (Points → tap a post) before the hunt starts.
-- =====================================================================
do $import$
declare h uuid; m uuid;
begin
  select id into m from public.admins where lower(trim(name)) = 'maaike' order by created_at limit 1;
  if m is null then
    raise exception 'Organiser "Maaike" not found. Add her first in the app under Settings → Organisers, then run this script again.';
  end if;
  if exists (select 1 from public.hunts where title = 'Speurtocht OBS Juliana' and admin_id = m) then
    raise notice 'Maaike already has "Speurtocht OBS Juliana" — nothing imported.';
    return;
  end if;

  insert into public.hunts (admin_id, title, organizer, status, bbox, finish, finish_title, finish_text, radius, spread_start)
  values (
    m,
    'Speurtocht OBS Juliana',
    '',
    'setup',
    '{"w":4.6150,"e":4.6210,"s":52.3902,"n":52.3925}',
    '{"lat":52.391774,"lng":4.616382}',
    'Terug op het schoolplein!',
    $t$Alle posten zijn gehaald! Loop terug naar het schoolplein van OBS Juliana. Daar wacht de finish.$t$,
    15, false)
  returning id into h;

  insert into public.points (hunt_id, n, kind, title, prompt, resp, value, expect, lat, lng) values
  (h, 1, 'assignment', 'De Stille Sluiproute',
   $t$📍 Willem de Zwijgerlaan 116 — direct aan de straat bij het verlaten van het schoolterrein.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.391538, 4.617056),
  (h, 2, 'question', 'De 8,5-Rekensom',
   $t$📍 Willem de Zwijgerlaan 104 — verderop langs de Willem de Zwijgerlaan.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.392192, 4.617426),
  (h, 3, 'activity', 'De Laserstralen van de Strafkelder',
   $t$📍 Prins Mauritslaan 88 — de hoek om richting de Prins Mauritslaan.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.391093, 4.617987),
  (h, 4, 'question', 'Het Vervalste Rapport',
   $t$📍 Prins Mauritslaan 100.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.390975, 4.618852),
  (h, 5, 'activity', 'De Vermomming',
   $t$📍 Prins Mauritslaan 116 — vanaf hier lopen jullie verkleed of achteruit een stukje terug richting de hoek.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.390817, 4.619725),
  (h, 6, 'question', 'De Codekraker',
   $t$📍 Willem de Zwijgerlaan 112 — op de terugweg, vlak voor het schoolplein.

[Opdracht nog invullen]$t$, 'text', 10, '', 52.391803, 4.617237);

  perform public._bump();
  raise notice 'Imported "Speurtocht OBS Juliana" for Maaike. She can open it under Hunts.';
end
$import$;
