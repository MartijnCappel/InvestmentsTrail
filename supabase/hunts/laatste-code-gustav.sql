-- =====================================================================
--  Import: "Operatie: De Laatste Code van de Gustav"
--  Run AFTER supabase/setup.sql. Paste into Supabase → SQL Editor → Run.
--  Creates a new saved hunt (not active). Open it in the app under Hunts.
--  Running it twice does nothing the second time.
--
--  Locations are approximate (Gustav Mahlerlaan 10 and the Gustav
--  Mahlerplein). The coffee bar and the lunch spot are placeholders:
--  drag those pins (and the finish flag) to the real places in the app.
-- =====================================================================
do $import$
declare h uuid;
begin
  if exists (select 1 from public.hunts where title = 'De Laatste Code van de Gustav') then
    raise notice 'Hunt "De Laatste Code van de Gustav" already exists — nothing imported.';
    return;
  end if;

  insert into public.hunts (title, organizer, status, bbox, finish, finish_title, finish_text, radius, spread_start)
  values (
    'De Laatste Code van de Gustav',
    'ABN AMRO Investments · Team event',
    'setup',
    '{"w":4.8700,"e":4.8790,"s":52.3360,"n":52.3405}',
    '{"lat":52.3384,"lng":4.8762}',
    'De Kluis is Open',
    $t$Jullie hebben de historie van de Gustav geëerd, de perfecte mix gebrouwen en bewezen dat diversiteit het geheime ingrediënt is. De laatste code is gekraakt.

Volg het kompas naar de geheime eindbestemming. Daar ligt de Blauwdruk van Succes op tafel.

Het gebouw aan de Gustav Mahler mag dan verdwijnen, maar de echte waarde van Investments zit niet in de stenen — die zit in hoe wij elkaar weten te vinden.

Tijd om samen te lunchen en de winnaar van de bonuspunten bekend te maken!$t$,
    20, false)
  returning id into h;

  insert into public.points (hunt_id, n, kind, title, prompt, resp, value, expect, lat, lng) values
  (h, 1, 'question', 'De Schaduw van de Dealing Room',
   $t$DE BRIEFING
Jarenlang was Gustav Mahlerlaan 10 het kloppende hart van ABN AMRO. In de legendarische Dealing Room werden in milliseconden beslissingen genomen, koersen gevolgd en de toekomst van Investments vormgegeven. Nu het iconische gebouw langzaam zijn deuren sluit en plaatsmaakt voor een nieuw hoofdstuk, dreigt één ding verloren te gaan: De Blauwdruk van Succesvol Beleggen.

Volgens de overlevering hebben de oude meesters van de Dealing Room hun geheim niet in één systeem opgeslagen, maar opgesplitst in fragmenten rondom het Gustav Mahlerplein. Geen enkele afdeling, specialist of teamlid heeft alle antwoorden in handen. Alleen door écht samen te werken, elkaars talenten te benutten en de juiste verbindingen te leggen, kunnen jullie binnen 60 minuten de kluis kraken — en de geheime eindbestemming vrijspelen.

📍 Recht voor de hoofdingang van Gustav Mahlerlaan 10 (± 10 min)

Kijk omhoog naar het gebouw dat binnenkort geschiedenis is. Hier draaide alles om snelheid, data en vertrouwen. Maar in de wereld van Investments is een briljant idee waardeloos als het niet landt bij de klant of als de techniek hapert.

DE OPDRACHT
Jullie krijgen van de spelleider 4 losse kaartjes: Klantbehoefte, Data & Inzicht, Techniek & Stabiliteit en Risico & Rendement. Elk kaartje bevat een halve aanwijzing of een raadsel over de geschiedenis van de Zuidas en ABN AMRO. Alleen door de kaartjes in de juiste volgorde naast elkaar te leggen, ontstaat een 4-cijferige code.

Vul de code in.$t$,
   'text', 20, '', 52.3376, 4.8740),

  (h, 2, 'activity', 'De Barista-Kluis',
   $t$"Zonder brandstof draait geen enkele motor. Zoek de plek waar druk, timing en de juiste mix samenkomen."

📍 De koffiebar aan het Gustav Mahlerplein (± 25 min)

Een sterke beleggingsportefeuille is net als de perfecte espresso: te veel druk en het wordt bitter, te weinig aandacht en het blijft waterig. Het draait om vakmanschap, de juiste verhoudingen en elkaar de ruimte geven.

WORKSHOP BARISTA
Iedereen zet onder begeleiding (of met de instructiekaart) zijn of haar eigen perfecte kop koffie of cappuccino.

DE ESCAPE-TWIST
Op de onderkant van één van de koffiekopjes (of verstopt bij de bonenmaler) zit een aanwijzing. Pas als het hele team zijn koffie heeft gezet én heeft geproost op de samenwerking, mag je door.

Upload een foto van jullie proost.$t$,
   'photo', 30, '', 52.3389, 4.8748),

  (h, 3, 'assignment', 'De Wereldmarkt & Diversificatie',
   $t$📍 Een rustige hoek of de bankjes op het Gustav Mahlerplein (± 15 min)

De gouden regel binnen Investments? Leg nooit al je eieren in één mandje. Spreiding en diversiteit maken een portefeuille weerbaar. Dat geldt ook voor een team: verschillende smaken, achtergronden en perspectieven maken het geheel sterker.

FAVORIETE KEUKEN
Bespreek tijdens de wandeling elkaars favoriete keuken (Italiaans, Japans, Mexicaans, Surinaams…) en waarom die keuken bij jou past.

DE ESCAPE-TWIST
Stel uit al jullie favorieten één gezamenlijk "Investments-gerecht" samen: een voor-, hoofd- en nagerecht met een knipoog naar beleggen (bijvoorbeeld Carpaccio van Gespreid Risico).

Typ jullie menukaart hieronder en voeg een groepsfoto toe. Daarna verschijnt de geheime eindbestemming.$t$,
   'both', 30, '', 52.3394, 4.8736);

  -- Bonus tasks. In the app only one team at a time can do a bonus: offer them
  -- during the hunt from the Bonus tab. Points are given in Review.
  insert into public.bonuses (hunt_id, title, prompt, resp, value, expect, lat, lng, radius) values
  (h, 'De Dealing Room Throwback',
   $t$Maak een groepsfoto voor het oude ABN AMRO-gebouw alsof jullie midden in een hectische beursdag in 1999 zitten: telefoons aan beide oren, paniek of euforie op de gezichten.$t$,
   'photo', 25, '', 52.3374, 4.8746, 30),
  (h, 'De Elevator Pitch',
   $t$Spreek een willekeurige voorbijganger op de Zuidas aan (of film elkaar) en leg in maximaal 15 seconden uit waarom samenwerking het beste rendement oplevert — zonder het woord "geld" of "bank" te gebruiken.

Upload een foto van het moment en schrijf jullie pitch op.$t$,
   'both', 25, '', 52.3391, 4.8728, 30),
  (h, 'De Latte Art Award',
   $t$Laat jullie latte art zien! De barista of spelleider geeft tot 50 bonuspunten voor de mooiste — of juist de meest rampzalige maar creatieve — latte art.

Upload een foto van jullie beste (of slechtste) kunstwerk.$t$,
   'photo', 50, '', 52.3389, 4.8748, 30),
  (h, 'Het Geheime Woord',
   $t$Verwerk de woorden koers, toekomst en vertrouwen ongemerkt in het gesprek met de gastheer of gastvrouw bij de lunchlocatie.

Vertel kort hoe het ging. Merkte iemand iets?$t$,
   'text', 25, '', 52.3384, 4.8762, 30);

  perform public._bump();
  raise notice 'Imported "De Laatste Code van de Gustav". Open it in the app under Hunts, check the pins and add your teams.';
end
$import$;
