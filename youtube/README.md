# YouTube voor BMW OS8 — experimentele versie 0.1.0

Eigen OAP-app en achtergrondservice, verpakt voor dezelfde MGU Store/mgu-deploy-route als het [Waze HUD-project](../waze/README.md). Doelauto: de 2023 iX1 U11 met OS8.

**Lokaal gebouwd; nog niet op de auto getest. Het pakket is nog niet gebruiksklaar voor video.** Het bevat de interface, YouTube-zoekfunctie/streamresolver, FFmpeg-afspeeladapter, MGU-videobuffer, voertuigstatuslezers en stopvoorwaarden. Voor afspelen ontbreken nog een op de headunit werkende FFmpeg/yt-dlp-installatie, een bevestigde BMW-audioroute en validatie van de voertuigsignalen. De laadstatus is bewust niet geraden. De officiële YouTube-app of een browser wordt niet op de MGU geïnstalleerd.

## Bediening

- Eigen tegel **YouTube (test)** en aanraaktoetsenbord.
- Zoeken op YouTube (maximaal zes resultaten) of een video-ID openen.
- Afspelen en stoppen. Na stoppen kies je opnieuw de video; pauze/hervatten op dezelfde positie is nog niet geïmplementeerd.
- **Tijdens parkeren:** actuele snelheid exact nul en selector P.
- **Alleen tijdens laden:** dezelfde voorwaarden, plus bevestigde actieve laadstatus.
- De keuze blijft bewaard. Geen automatisch afspelen bij starten of na een onderbreking.
- Ontbrekende/ongeldige voertuigdata, data ouder dan drie seconden, een verdwenen UI-verbinding of verlies van schermvoorgrond stoppen de speler. Een controle loopt elke 200 ms; de UI meldt zich elke 500 ms. Dit is geen gecertificeerde voertuigbeveiliging; de timing moet op de auto worden getest.

## Lokaal

Node.js is voldoende; geen npm-installatie nodig. Vanuit deze map:

```powershell
node test/run.js
node build.js
node preview.js
```

Preview: `http://127.0.0.1:8788`. Dit is uitsluitend een interfacesimulatie met fictieve zoekresultaten. De simulator kan de auto niet besturen. Stop met Ctrl+C. `dist/preview-home.png` toont dezelfde schermindeling.

De build maakt:

- `dist/u11_youtube@0.1.0.tgz`: OAP-bronpakket, door de headunit tegen zijn eigen SDK te linken.
- `dist/u11-youtube@0.1.0.tgz`: achtergrondservice.
- `dist/catalog.json`: lokaal catalogusbestand met hashes en afhankelijkheden.

De build werkt onafhankelijk van de genegeerde `../upstream`-map. Onder `vendor` staan de benodigde open-source bouw- en tekenonderdelen met licenties. BMW SDK-code en sleutels zitten niet in deze pakketten.

## Nog nodig op de auto

1. Bestaande root SSH en MGU Store, mgu-deploy >= 0.8.22, mgu-render >= 0.6.23 met video en werkende voorgrondcontrole. Geen nieuwe root-flash nodig.
2. Een **Linux x86-64** FFmpeg die op de glibc van deze headunit draait, met HTTPS, video/audio-decoders, filters, rawvideo en ALSA-uitvoer. yt-dlp moet ook op die omgeving werken; recente YouTube-extractie kan aanvullende JavaScript-runtime/yt-dlp-componenten vereisen. Deze binaries worden niet meegeleverd. De aanwezigheid van Node voor OAP betekent niet dat die Node-versie geschikt is voor yt-dlp.
3. Internet voor de **helperservice**. `mguInternet` regelt de app, maar bewijst niet dat de helper internet heeft. Tijdens de test controleren met de bestaande uplink; niet blind firewall/routing wijzigen.
4. Een door BMW bruikbare ALSA-audioroute. Audiofocus, volume en onderbreking door BMW-meldingen moeten worden getest. De ALSA-adapter is een eerste implementatie: als BMW een afzonderlijke audiofocusservice vereist, moet die nog worden toegevoegd voordat `audioVerified` wordt aangezet.
5. De twee selectorvelden en snelheid op deze iX1 controleren. Ze komen uit publieke MGU-appvoorbeelden en zijn hier niet live gevalideerd. Tegenstrijdige geldige selectorwaarden blokkeren de speler.
6. De echte hoogvolt-laadstatus uit de lokale catalogus identificeren en tijdens starten/stoppen van laden controleren. Een aangesloten kabel, accupercentage of 12V-laadspanning telt niet als actief laden.

`probe.js` verzamelt hiervoor een begrensde, alleen-lezen inventaris van software, ALSA-apparaten en relevante catalogusvelden. Het schrijft niets op de auto en start geen video/audio. Later kan het via de bestaande SSH-verbinding op stdin worden uitgevoerd.

## Configuratie na de hardwaretest

Kopieer `config.example.json` lokaal naar `config.local.json`. Die lokale configuratie wordt niet in Git opgenomen. Configureer absolute paden naar de twee uitvoerbare bestanden en de geteste `audioDevice`; pas na de audiotest `audioVerified: true` instellen. De helper leest `/var/opt/u11-youtube/config.json`; die blijft buiten zijn `current`-versiemap en wordt door deze build nooit overschreven.

`chargingSignal` blijft `null` tot de echte SOME/IP-definitie is vastgesteld. Daarna heeft het deze velden (geen verzonnen voorbeeldwaarden):

- `interface`, `field`, `member`: catalogusnamen en het pad naar de waarde binnen de veldstructuur.
- `activeValues`, `inactiveValues`: exacte enumwaarden van de auto; alles daarbuiten is onbekend.
- `verified: true`: alleen na de fysieke test.

Bouw opnieuw nadat dit signaal is ingevuld: de bronconfiguratie en de alleen-lezen machtiging moeten in het OAP-pakket worden opgenomen. Het voorbeeld zonder laadconfiguratie laat de optie zien maar zal er nooit mee afspelen.

## Afspelen en beperkingen

De helper gebruikt yt-dlp voor zoeken en een gecombineerde video/audiostream tot 720p. De app accepteert alleen YouTube-video-IDs/links; de resolver accepteert alleen HTTPS-streams van googlevideo.com. Geen shellinterpolatie, cookies, wachtwoorden of accountimport. Er wordt geen toegang tot betaalde, private, leeftijdsgebonden of anderszins geblokkeerde video's omzeild. YouTube-wijzigingen, livevideo of ontbrekende gecombineerde streams kunnen afspelen verhinderen.

FFmpeg decodeert naar 960×540 I420 bij 25 fps en stuurt audio vanuit dezelfde invoer naar ALSA. Drie vluchtige framebuffer-slots volgen het gedocumenteerde mgu-render-protocol. Er wordt geen videobibliotheek op schijf opgeslagen. Het geheugen/CPU-gebruik en lipsynchronisatie zijn nog niet op de auto gemeten. Native bediening is voorlopig touch; geen volledige iDrive-draaiknopbediening, accountlogin, abonnementen, seek of afspeellijsten.

## Installatie en verwijderen

De pakketten zijn gemaakt voor de bestaande Store/deployer, maar **nog niet installeren als dagelijkse speler**: eerst bovenstaande afhankelijkheden en signalen testen. Voor overdracht via USB gebruik je de bestaande mgu-store `usb-repo`-functie met de lokale catalogus, zodat de distributie-indeling en afhankelijke pakketten correct worden opgebouwd. Op OS8 worden appinstallaties na een headunit-herstart actief. Verwijderen: eerst de YouTube-app, daarna de YouTube-helper via de Store. De Waze-app heeft andere IDs, paden en services.

De helper heeft uitsluitend een lokale Unix-socket, geen netwerkbedieningspoort. De socket is toegankelijk voor de bestaande OAP-appgroep; dit is geen beveiligingsgrens tegen andere reeds vertrouwde root/OAP-apps op dezelfde headunit.

Zie `THIRD_PARTY.md` voor herkomst en licenties.
