# The Investment Trail

Speurtocht-app (in het Engels) voor ABN AMRO Investments. Teams lopen met hun telefoon langs punten op de kaart. De opdracht van een punt gaat pas open als het team binnen 15 meter staat.

- **Hosting:** GitHub Pages (statische bestanden, geen build-stap)
- **Data, realtime en foto's:** Supabase
- **Kaart:** OpenStreetMap via Leaflet (gratis, geen API-key nodig)

## Eenmalig instellen

### 1. Database klaarzetten
1. Open je project op [supabase.com](https://supabase.com) en ga naar **SQL Editor → New query**.
2. Plak de volledige inhoud van [`supabase/setup.sql`](supabase/setup.sql) en klik op **Run**.

Het script maakt de tabellen, de foto-opslag (bucket `photos`) en de beveiliging aan. Je kunt het later gewoon opnieuw draaien; bestaande gegevens blijven staan.

### 2. App koppelen aan Supabase
1. Ga in Supabase naar **Project Settings → API**.
2. Zet de **Project URL** en de **anon public** key in [`config.js`](config.js).

De anon key is bedoeld voor browsers en mag publiek staan. Zet hier **nooit** de `service_role` key.

### 3. GitHub Pages aanzetten
1. Ga in de repository naar **Settings → Pages**.
2. Kies bij *Source* **Deploy from a branch**, met branch `main` en map `/ (root)`.
3. Na een minuut staat de app op `https://martijncappel.github.io/InvestmentsTrail/`.

## Gebruik

**Organisator:** log in met **`ADMIN-2026`** en wijzig die code meteen onder **Settings**.

| Wat | Hoe |
|---|---|
| Gebied kiezen | *Select area*, tik twee hoeken aan |
| Punt toevoegen | *Add point* en tik op de kaart. Kleur = type: blauw = vraag, oranje = opdracht, roze = activiteit |
| Punt verplaatsen | Sleep de pin |
| Straal | Standaard 15 m (Settings); per punt aan te passen |
| Teams | Tab *Teams*: aanmaken, code delen, voortgang en laatste locatie bekijken |
| GPS werkt niet bij een team | *Teams → Edit → Unlock a point by hand* |
| Antwoorden en foto's | Tab *Review*: goedkeuren met punten, of afwijzen met een notitie |
| Bonusopdracht | Tab *Bonus*: aanmaken en *Release now*. Het eerste team dat claimt, krijgt hem; voor de andere teams verdwijnt hij tot het team klaar is of opgeeft |
| Finish | *Set finish*. Een team ziet de finish met een kompas pas als al zijn opdrachten gedaan zijn |
| Einde | *End & pick winner*. De winnaar verschijnt bij alle teams |
| Na een testrondje | *Settings → Clear all progress* (teams en punten blijven staan) |

**Teams:** openen de link op hun telefoon, loggen in met hun code (bijvoorbeeld `K7P-3QX`) en geven toestemming voor locatie.

## Goed om te weten

- **GPS-nauwkeurigheid:** tussen hoge gebouwen wijkt GPS vaak 10 tot 30 meter af. De app rekent daarom tot 20 m van de onnauwkeurigheid mee. Lukt het toch niet, ontgrendel het punt dan met de hand.
- **Beveiliging:** de opdrachten, de finish en de juiste antwoorden worden pas door de server meegestuurd als dat mag. Wel is de locatie die een telefoon doorgeeft te vervalsen voor wie technisch handig is. Voor een teamuitje is dat acceptabel.
- **Opslag van foto's:** foto's worden verkleind tot maximaal 1600 px en staan in de Supabase-bucket `photos`. Iedereen met de link van een foto kan die bekijken; de links zijn niet te raden.
