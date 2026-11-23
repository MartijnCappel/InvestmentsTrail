-- =====================================================================
--  Import: "Escape uit het Haarlemmermeerse Bos — De Verloren Turnster"
--  Run AFTER supabase/setup.sql. Paste into Supabase → SQL Editor → Run.
--  Creates a new saved hunt (not active). Open it in the app under Hunts.
--  Running it twice does nothing the second time.
-- =====================================================================
do $import$
declare h uuid;
begin
  if exists (select 1 from public.hunts where title = 'De Verloren Turnster') then
    raise notice 'Hunt "De Verloren Turnster" already exists — nothing imported.';
    return;
  end if;

  insert into public.hunts (title, organizer, status, bbox, finish, finish_title, finish_text, radius)
  values (
    'De Verloren Turnster',
    'Escape uit het Haarlemmermeerse Bos',
    'setup',
    '{"w":4.6610,"e":4.6765,"s":52.3110,"n":52.3185}',
    '{"lat":52.3169,"lng":4.6668}',
    'Kraak het geheim!',
    $t$Je hebt alle 7 letters verzameld: E – R – P – I – L – Z – E.

Schrijf ze op een blaadje en puzzel ze in de juiste volgorde. Dan ontdek je hét grootste geheim om een topturnster te worden.

Roep het woord hardop om de betovering te verbreken en uit het bos te ontsnappen!$t$,
    25)
  returning id into h;

  insert into public.points (hunt_id, n, kind, title, prompt, resp, value, expect, lat, lng) values
  (h, 1, 'activity', 'De Warming-up van de Bosgeest',
   $t$Oh nee, Elin! Je was onderweg naar de grote turnwedstrijd, maar je bent verkeerd gelopen en verdwaald in het Haarlemmermeerse Bos. Een ondeugende bosgeest heeft de uitgang betoverd. Je kunt alleen ontsnappen als je bewijst dat je een echte topturnster bent. Langs de route liggen 7 verborgen proeven. Bij elke proef doe je een turnopdracht en verdien je een geheime letter. Als je alle 7 letters hebt verzameld, vormen ze samen hét grootste geheim om een topturnster te worden. Kraak het woord, breek de betovering en ontsnap uit het bos!

📍 Bij Papa's Beach House

Turnopdracht: Een topturnster begint nooit koud! Doe 10 jumping jacks, 5 hoge streksprongen met je armen recht omhoog en houd daarna 10 seconden een kaarsrechte plank vast.

Raadsel: Ik ben de eerste letter van jouw naam, en ik zit twee keer in het woord 'evenwicht'. Welke letter ben ik?

Vul de letter in.$t$,
   'text', 10, 'E', 52.3172, 4.6685),

  (h, 2, 'activity', 'De Zand-Balk',
   $t$📍 Het strandje aan het water (noordoostelijke oever)

Turnopdracht: Trek met een stok of je voet een rechte lijn van ongeveer 5 meter in het zand. Dit is jouw evenwichtsbalk! Loop er op je tenen overheen, maak halverwege een zweefstand (arabesque) van 5 seconden zonder om te vallen en eindig met een mooie afsprong in landinghouding (stick the landing!).

Raadsel: Welke letter hoor je als eerste bij een 'radslag' en een 'rekstok'?

Vul de letter in.$t$,
   'text', 10, 'R', 52.3165, 4.6698),

  (h, 3, 'activity', 'De Brug over het Moeras',
   $t$📍 Bospad richting de bruggetjes (oost)

Turnopdracht: Zoek een stevig stukje gras naast het pad. Maak een zo hoog en mooi mogelijk bruggetje (vanaf de grond omhoog duwen) en houd dit 5 tellen vast. Lukt het om daarna één been in de lucht te steken?

Raadsel: Op welke letter begint het woord 'pirouette' én het woord 'podium'?

Vul de letter in.$t$,
   'text', 10, 'P', 52.3148, 4.6742),

  (h, 4, 'activity', 'De Vrije Vloeroefening',
   $t$📍 De grote ligweide (open grasveld, zuidoost)

Turnopdracht: Dit grasveld is jouw wedstrijdvloer! Maak een mini-vloeroefening van 15 seconden waarin in ieder geval 2 radslagen, een koprol (of spagaat/split) en een sierlijke eindpose zitten. De jury (de begeleider) moet een 10 geven!

Raadsel: Ik ben een dunne, rechte letter die eruitziet als een turnster in perfecte strekstand met haar puntjes gestrekt.

Vul de letter in.$t$,
   'text', 10, 'I', 52.3125, 4.6730),

  (h, 5, 'activity', 'Kracht in de Armen',
   $t$📍 Bij de speeltuin / klimtoestellen (zuidkant)

Turnopdracht: Gebruik een rekstok of klimrek (of een stevige lage tak). Hang met gestrekte armen aan de stang en trek je knieën 5 keer zo hoog mogelijk op richting je borst (of hang 15 seconden lang stil met je benen in een L-houding).

Raadsel: Welke letter vorm je met je lichaam als je rechtop zit met je benen recht naar voren gestrekt?

Vul de letter in.$t$,
   'text', 10, 'L', 52.3128, 4.6675),

  (h, 6, 'activity', 'De Ondersteboven-Boom',
   $t$📍 Bospad aan de westkant van de plas

Turnopdracht: Zoek een dikke, stevige boom met een vlak stukje grond ervoor. Zet je handen op de grond en loop met je voeten tegen de boom omhoog (of schop op) tot een handstand tegen de boom. Tel hardop tot 5!

Raadsel: Ik ben de laatste letter van het alfabet, en het geluid dat een bij maakt als hij door het bos vliegt.

Vul de letter in.$t$,
   'text', 10, 'Z', 52.3150, 4.6635),

  (h, 7, 'activity', 'De Grote Finale & Ontsnapping',
   $t$📍 Terug aan het water, richting de uitgang

Turnopdracht: De bosgeest geeft zich bijna gewonnen, maar wil nog één laatste truc zien: jouw allerfavorietste turnoefening! Laat zien waar jij het allerbeste in bent en sluit af met een echte wedstrijdgroet naar de jury.

Raadsel: Je hebt mij bij de allereerste stop ook al verdiend. Ik ben de meest voorkomende letter in het Nederlands!

Vul de letter in.$t$,
   'text', 10, 'E', 52.3169, 4.6668);

  -- The final puzzle as a bonus task at the finish. Offer it in the app (Bonus → Offer now)
  -- once all 7 letters are found. "plezier" is checked automatically.
  insert into public.bonuses (hunt_id, title, prompt, resp, value, expect, lat, lng, radius) values
  (h, 'Kraak het geheim!',
   $t$Je hebt de letters E – R – P – I – L – Z – E verzameld. Zet ze in de juiste volgorde: welk woord is het grootste geheim van een echte topturnster?

Typ het woord en roep het daarna hard: de betovering is verbroken!$t$,
   'text', 30, 'plezier', 52.3169, 4.6668, 40);

  -- A team for Elin; the code shows up under Teams once you open this hunt.
  insert into public.teams (hunt_id, name, code, start_point)
  values (h, 'Elin', public._new_code(), (select id from public.points where hunt_id = h and n = 1));

  perform public._bump();
  raise notice 'Imported "De Verloren Turnster". Open it in the app under Hunts.';
end
$import$;
