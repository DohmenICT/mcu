# Waze HUD (test) — U11 OS8

App `u11_waze_hud` 0.1.2 en helper `u11-waze-hud` 0.1.0, via mgu-deploy. Getest op een BMW iX1 U11 uit 2023 met OS8, ID8-BCP, x86-64 en een centrale schermbuffer van 1920×960.

De helper leest één schermbeeld per seconde via de bestaande `winston-grabber`, herkent twee bekende posities van de zichtbare Waze-manoeuvrekaart in CarPlay en toont een verkleinde uitsnede via `cluster-render` op het HUD. Geen OCR of injectie in BMW's navigatie. De voorkeur Aan/Uit wordt bewaard; standaard staat automatisch tonen aan. Wisselen naar een onbekende kaartindeling of een mislukt schermbeeld verbergt de uitsnede. Vastgelopen Waze-inhoud in verder nieuwe screenshots wordt niet herkend als verouderde navigatie.

## Bevestigd op de testauto

- De tegel en Aan/Uit-bediening werken.
- Automatisch starten na herstart en het bewaren van de instelling werken.
- Waze-manoeuvrekaart zichtbaar en leesbaar naast snelheid en snelheidslimiet.
- Twee kaartposities (normaal en na aanraken) worden op dezelfde HUD-positie geplaatst.
- Overschakelen naar Spotify terwijl Waze navigeert verbergt de Waze-uitsnede.

## Beperkingen

Dit is herkenning van een vaste pixelindeling, geen betrouwbare identificatie van de actieve app. Waze moet vooraan staan. Andere modellen, resoluties, donkere modus, langere straatnamen, rotondes, rijstrookadvies, BMW-pop-ups en gebruik tijdens rijden zijn niet gevalideerd. Privéreferentiebeelden waarmee de herkenning is ontwikkeld worden niet gepubliceerd.

De helper heeft `cluster-render >= 0.6.9`, `mgu-deploy >= 0.8.22` en de firmwarefunctie `winston-grabber` nodig. De renderer moet de ID8-HUD-uitvoer ondersteunen. Op OS8 wordt een appinstallatie na headunit-herstart actief.

## Bouwen en verwijderen

```powershell
node waze/build.js
```

Uitvoer in `waze/dist`: het app-bronpakket en de helper. De headunit linkt zijn eigen SDK; er wordt geen SDK-code meegeleverd. Verwijder eerst de app en daarna de helper via de Store. Deze app en de YouTube-app gebruiken afzonderlijke IDs, mappen en services.
