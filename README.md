# BMW OS8 apps: Waze HUD en YouTube

Eigen apps voor een met root SSH en **MGU Store** ingerichte BMW MGU-headunit. Gebaseerd op de app- en helperstructuur van [mgu-store](https://github.com/robertnisipeanu/mgu-store). Doelplatform: de geteste BMW iX1 U11 uit 2023 met OS8 (ID8-BCP, x86-64).

| App | Status | Wat doet hij? |
|---|---|---|
| **Waze HUD (test)** 0.1.2 | Op die iX1 getest, met beperkingen | Kopieert de zichtbare Waze-manoeuvrekaart uit CarPlay naar het HUD. |
| **YouTube (test)** 0.1.0 | **Lokaal prototype, nog niet gebruiksklaar** | Interface en afspeelservice voor video tijdens parkeren/laden. Native afspeelsoftware, BMW-audio en voertuigsignalen moeten nog op de auto worden ingericht en getest. |

**YouTube installeren levert momenteel nog geen werkende videospeler op.** De binaries voor yt-dlp en FFmpeg worden niet meegeleverd. Zonder bevestigde audio-configuratie en actuele parkeerstatus start afspelen niet. De laadmodus blijft geblokkeerd tot de echte laadstatus is gekoppeld. Zie [YouTube-documentatie](youtube/README.md).

## Toevoegen aan MGU Store

1. Open **Settings → Add source**.
2. Vul `DohmenICT/mcu` in en kies **Releases**.
3. Installeer de gewenste app en de bijbehorende helper. De catalogus benoemt de vereiste renderer/deployer; houd de standaard Store-bronnen beschikbaar voor die afhankelijkheden.
4. Herstart de headunit via de Store wanneer OS8 daarom vraagt.

Alternatief: voeg de [directe catalogus](https://raw.githubusercontent.com/DohmenICT/mcu/main/catalog.json) als HTTPS-bron toe. Kies geen Branch/Tags-bron: deze repository publiceert installatiepakketten via Releases.

Alle downloads staan in de [catalog-release](https://github.com/DohmenICT/mcu/releases/tag/catalog). De catalogus bevat grootte en SHA-256 per pakket.

## USB of kabel?

Een correct samengestelde USB-bron is bruikbaar voor installatie via de USB-pagina van MGU Store. Met het bestaande mgu-store-installatiescript:

```powershell
node mgu-install.js usb-repo D:\ github:DohmenICT/mcu
```

**Voor de eerste YouTube-test is ENET/SSH de aangewezen route**, omdat daarmee afhankelijkheden, geluid, voertuigstatus en logs gecontroleerd kunnen worden. Kopieer nooit een SSH-sleutel in deze repository of op de installatiestick. Deze pakketten voeren geen nieuwe root-flash uit.

## Lokaal bouwen

Node.js, geen npm-installatie nodig:

```powershell
node waze/build.js
node youtube/build.js
node youtube/test/run.js
node youtube/test/player.js
node youtube/test/package.js
node youtube/preview.js
```

Voor de gezamenlijke catalogus en releasebestanden: `node build-release.js`.

De laatste opdracht opent een lokale interfacesimulator op `http://127.0.0.1:8788`; die bestuurt de auto niet en toont geen echte video. Bouwresultaten komen in de afzonderlijke `dist`-mappen. De auto linkt de app tegen zijn eigen BMW SDK. Deze repository bevat uitsluitend de eigen broncode en de benodigde open-source bouw-/tekenonderdelen, geen BMW SDK, autosleutels, privébeelden of voertuiglogs.

Zie [Waze HUD](waze/README.md), [YouTube](youtube/README.md) en [licenties/herkomst](youtube/THIRD_PARTY.md). Dit project is niet verbonden aan BMW, Waze of YouTube.
