-- =====================================================================
--  Import: "De Grote Ontsnapping van de Julianaschool" — voor organisator Maaike
--  Route rond OBS Juliana, Overveen.
--  Run AFTER supabase/setup.sql. Paste into Supabase → SQL Editor → Run.
--  Maaike must already exist as an organiser (Settings → Organisers).
--
--  Safe to run more than once:
--  * no hunt yet  → creates it in Maaike's list (not active; she opens it under Hunts)
--  * hunt exists  → fills in / updates the story and the tasks of the 6 posts,
--                   keeps the pin locations (so pins she dragged stay put)
--
--  Each post reveals the letter earned at the previous post; the last
--  letter and the puzzle are on the finish screen. The password TIENEN is
--  a bonus at the school gate: offer it in the app (Bonus → Offer now).
-- =====================================================================
do $import$
declare h uuid; m uuid;
begin
  select id into m from public.admins where lower(trim(name)) = 'maaike' order by created_at limit 1;
  if m is null then
    raise exception 'Organiser "Maaike" not found. Add her first in the app under Settings → Organisers, then run this script again.';
  end if;

  select id into h from public.hunts
   where admin_id = m and title in ('Speurtocht OBS Juliana', 'De Grote Ontsnapping van de Julianaschool')
   order by created_at limit 1;

  if h is null then
    insert into public.hunts (admin_id, title, organizer, status, bbox, finish, radius, spread_start)
    values (m, 'De Grote Ontsnapping van de Julianaschool', '', 'setup',
            '{"w":4.6150,"e":4.6210,"s":52.3902,"n":52.3925}', '{"lat":52.391774,"lng":4.616382}', 15, false)
    returning id into h;
    insert into public.points (hunt_id, n, title, lat, lng) values
      (h, 1, 'Post 1', 52.391538, 4.617056),
      (h, 2, 'Post 2', 52.392192, 4.617426),
      (h, 3, 'Post 3', 52.391093, 4.617987),
      (h, 4, 'Post 4', 52.390975, 4.618852),
      (h, 5, 'Post 5', 52.390817, 4.619725),
      (h, 6, 'Post 6', 52.391803, 4.617237);
  end if;

  update public.hunts set
    title = 'De Grote Ontsnapping van de Julianaschool',
    spread_start = false,
    finish_title = 'Kraak het slot van het hek!',
    finish_text = $t$Bij de laatste post verdienden jullie de letter N.

Jullie hebben nu alle 6 letters verzameld:
E – N – T – N – I – E

Zet ze in de juiste volgorde. Dat is het geheime wachtwoord van het hek!

Roep het wachtwoord hardop bij het schoolhek. Dan is het slot gekraakt, is Mevrouw Cijferbeul verslagen en gaat het hek open. Op het schoolplein wacht een welverdiende beloning!$t$
  where id = h;

  update public.points p set
    title = v.title, kind = v.kind, resp = v.resp, value = v.value, expect = v.expect, prompt = v.prompt
  from (values
    (1, 'De Stille Sluiproute', 'activity', 'text', 10, 'gelukt',
     $t$HET VERHAAL
Paniek op de Julianaschool! De nieuwe, vreselijke directrice — Mevrouw Cijferbeul — heeft een krankzinnige nieuwe regel ingevoerd: iedereen die lager scoort dan een 8,5, moet voor altijd nablijven in de geheime strafkelder. Jullie hebben net een toets teruggekregen met een 8,4... Het hek van het schoolplein zit op slot met een geheim cijferslot, en Mevrouw Cijferbeul is op patrouille. De enige manier om te ontsnappen is door rondom de school 6 geheime aanwijzingen te verzamelen. Bij elke opdracht verdienen jullie een letter. Vorm met alle letters het geheime wachtwoord om het hek te openen voordat ze jullie te pakken krijgt!

📍 Willem de Zwijgerlaan 116 — direct bij het verlaten van het schoolterrein

Mevrouw Cijferbeul heeft oren als een vleermuis. Als ze jullie hoort, zijn jullie erbij.

OPDRACHT
Leg met de hele groep de volgende 20 meter af zonder één geluid te maken. Niet praten, niet lachen en niet met je voeten schuifelen!

EXTRA UITDAGING
Geef tijdens het sluipen de "alarmbel" door: een lepel met een knikker of pingpongbal erop. Valt hij? Opnieuw beginnen!

Gelukt? Typ GELUKT.$t$),

    (2, 'De 8,5-Rekensom', 'question', 'both', 10, '8,5',
     $t$✉️ Bij de vorige post verdienden jullie de letter T.

📍 Willem de Zwijgerlaan 104

De directrice denkt dat jullie niet kunnen rekenen. Bewijs het tegendeel om haar wachtwoord-kluis te kraken!

RAADSEL
Ik ben een getal. Als je mij vermenigvuldigt met 2, krijg je 17. Welk getal ben ik?

OPDRACHT
Om de deur te openen, moet de groep binnen 60 seconden precies dat getal vormen met jullie eigen lichamen op de stoep of in het gras.

Typ het getal en maak een foto van jullie lichaamsgetal. Is het duidelijk leesbaar?$t$),

    (3, 'De Laserstralen van de Strafkelder', 'activity', 'text', 10, 'gelukt',
     $t$✉️ Bij de vorige post verdienden jullie de letter I.

📍 Prins Mauritslaan 88 — de hoek om

Jullie komen bij het geheime beveiligingssysteem van de directrice.

OPDRACHT
Tussen de bomen of palen hangt een wirwar van wol of rood lint: de laserstralen! Klim er met de hele groep doorheen zonder de lasers aan te raken. Raakt iemand een draad? Dan gaat het alarm af en moet diegene terug naar het begin.

Iedereen erdoor zonder alarm? Typ GELUKT.$t$),

    (4, 'Het Vervalste Rapport', 'question', 'both', 10, '5',
     $t$✉️ Bij de vorige post verdienden jullie de letter E.

📍 Prins Mauritslaan 100

Jullie vinden een stapel rapporten die Mevrouw Cijferbeul heeft laten vallen. Tijd om de boel te saboteren!

OPDRACHT
Binnen 10 meter rondom deze post liggen briefjes met onvoldoendes verstopt. Vind ze allemaal binnen 2 minuten en verander elk cijfer met de rode stift in een 10.

Hoeveel briefjes hebben jullie in een 10 veranderd? Typ het aantal en maak een foto van de verbeterde rapporten.$t$),

    (5, 'De Vermomming', 'activity', 'photo', 10, '',
     $t$✉️ Bij de vorige post verdienden jullie de letter N.

📍 Prins Mauritslaan 116

Alarm! Mevrouw Cijferbeul loopt aan het einde van de straat. Jullie moeten onherkenbaar langs haar heen zien te komen.

OPDRACHT
Jullie hebben 2 minuten om je zo goed mogelijk te vermommen als "voorbeeldige superslimme leerlingen" of als "onzichtbare struiken", met wat je ter plekke vindt of uit de verkleedtas: grote brillen, jassen achterstevoren, snorren van papier…

Maak een groepsfoto van jullie vermomming. Loop daarna de volgende 50 meter achteruit of als een pinguïn, zodat jullie niet opvallen!$t$),

    (6, 'De Codekraker', 'question', 'text', 10, 'gelukt',
     $t$✉️ Bij de vorige post verdienden jullie de letter E.

📍 Willem de Zwijgerlaan 112 — vlak voor het schoolplein

Jullie zijn bijna terug bij de Julianaschool, maar de laatste bewaker houdt jullie tegen!

OPDRACHT
De bewaker stelt 3 vragen over jullie eigen school. Bijvoorbeeld: hoeveel deuren heeft de hoofdingang? Wat is de lievelingskleur van de echte directeur? Hoeveel klassen zijn er?

Alle 3 goed? Typ GELUKT.$t$)
  ) as v(n, title, kind, resp, value, expect, prompt)
  where p.hunt_id = h and p.n = v.n;

  if not exists (select 1 from public.bonuses where hunt_id = h and title = 'Het Geheime Wachtwoord') then
    insert into public.bonuses (hunt_id, title, prompt, resp, value, expect, lat, lng, radius)
    values (h, 'Het Geheime Wachtwoord',
      $t$Jullie staan bij het hek. Typ het geheime wachtwoord dat jullie met de 6 letters hebben gevormd — en roep het daarna keihard!$t$,
      'text', 30, 'tienen', 52.391774, 4.616382, 30);
  end if;

  perform public._bump();
  raise notice 'Done: "De Grote Ontsnapping van de Julianaschool" is ready in Maaike''s hunts.';
end
$import$;
