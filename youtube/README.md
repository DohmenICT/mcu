# YouTube for BMW OS8 — experimental version 0.1.4

A custom OAP app and background service, packaged for the same MGU Store/mgu-deploy workflow as the [Waze HUD project](../waze/README.md). Target car: the 2023 iX1 U11 with OS8.

**Version 0.1.4 opens successfully on the target car. End-to-end playback is not yet verified.** It includes the UI, YouTube search and stream resolution, an FFmpeg playback adapter, an MGU video buffer, vehicle status readers, and playback stop conditions. Playback still requires an FFmpeg/yt-dlp installation that works on the head unit, a verified BMW audio route, and validation of the vehicle signals. The charging status has deliberately not been guessed. This does not install the official YouTube app or a browser on the MGU.

## Controls and behavior

- A dedicated **YouTube (test)** tile and touch keyboard.
- Search YouTube (up to six results) or open a video ID.
- Play and stop. After stopping, select the video again; pause/resume at the same position is not implemented yet.
- **While parked:** current speed must be exactly zero and the selector must be in P.
- **Only while charging:** the same conditions, plus a confirmed active charging status.
- The mode is saved. Playback does not start automatically at startup or after an interruption.
- Missing or invalid vehicle data, data older than three seconds, a disconnected UI, or loss of screen foreground stops the player. A check runs every 200 ms; the UI sends a heartbeat every 500 ms. This is not a certified vehicle safety mechanism; its timing must be tested on the car.

## Local development

Node.js is sufficient; no npm installation is needed. From this directory:

```powershell
node test/run.js
node test/player.js
node build.js
node test/package.js
node preview.js
```

Preview: `http://127.0.0.1:8788`. This is only a UI simulation with mock search results. The simulator cannot control the car. Stop it with Ctrl+C.

The build produces:

- `dist/u11_youtube@0.1.4.tgz`: OAP source package, to be linked against the head unit's own SDK.
- `dist/u11-youtube@0.1.4.tgz`: background service.
- `dist/catalog.json`: local catalog with checksums and dependencies.

The build is self-contained. The required open-source build and drawing components and their licenses are in `vendor`. These packages do not contain BMW SDK code or keys.

## Still required on the car

1. Existing root SSH access and MGU Store, mgu-deploy >= 0.8.22, and mgu-render >= 0.6.23 with video support and working foreground detection. Another root flash is not required.
2. A **Linux x86-64** FFmpeg build compatible with the head unit's glibc, with HTTPS, video/audio decoders, filters, rawvideo, and ALSA output. yt-dlp must also work in that environment; current YouTube extraction may require additional JavaScript runtime or yt-dlp components. These binaries are not included. Having Node installed for OAP does not mean that Node version is suitable for yt-dlp.
3. Internet access for the **helper service**. `mguInternet` covers the app but does not establish that the helper has internet access. Check this with the existing uplink during testing; do not change firewall or routing settings blindly.
4. A usable BMW ALSA audio route. Audio focus, volume, and interruptions by BMW notifications must be tested. The ALSA adapter is an initial implementation: if BMW requires a separate audio-focus service, that integration must be added before enabling `audioVerified`.
5. Verification of both selector fields and speed on this iX1. They come from public MGU app examples and have not been validated live here. Conflicting valid selector values block the player.
6. Identification of the actual high-voltage charging status in the local catalog, followed by verification when charging starts and stops. A connected cable, battery percentage, or 12 V charging voltage does not count as active charging.

`probe.js` collects a bounded, read-only inventory of software, ALSA devices, and relevant catalog fields for these checks. It writes nothing to the car and does not start video or audio. It can later be run through the existing SSH connection using standard input.

## Configuration after hardware testing

Copy `config.example.json` to `config.local.json` locally. This local configuration is excluded from Git. Configure absolute paths to both executables and the tested `audioDevice`; set `audioVerified: true` only after the audio test. The helper reads `/var/opt/u11-youtube/config.json`, outside its `current` version directory. This build never overwrites that file.

`chargingSignal` remains `null` until the actual SOME/IP definition is established. It then has these fields, using verified values rather than guessed examples:

- `interface`, `field`, `member`: catalog names and the path to the value within the field structure.
- `activeValues`, `inactiveValues`: the car's exact enum values; anything else is unknown.
- `verified: true`: only after testing on the car.

Rebuild after configuring this signal: its source configuration and read-only permission must be included in the OAP package. The example without a charging configuration displays the mode but will never allow playback in it.

## Playback and limitations

The helper uses yt-dlp for search and a combined video/audio stream up to 720p. The app accepts only YouTube video IDs or links; the resolver accepts only HTTPS streams from googlevideo.com. There is no shell interpolation, cookie handling, password handling, or account import. It does not bypass access restrictions on paid, private, age-restricted, or otherwise blocked videos. YouTube changes, live video, or a lack of combined streams may prevent playback.

FFmpeg decodes to 960×540 I420 at 25 fps and sends audio from the same input to ALSA. Three volatile framebuffer slots follow the documented mgu-render protocol. No video library is saved to disk. Memory/CPU use and audio/video synchronization have not yet been measured on the car. Native controls currently support touch; full iDrive rotary-controller support, account login, subscriptions, seeking, and playlists are not implemented.

## Installation and removal

The packages target the existing Store/deployer, but **do not install this as an everyday player yet**: first test the dependencies and signals listed above. For USB transfer, use mgu-store's existing `usb-repo` command with the local catalog to prepare the correct distribution layout and dependency metadata. On OS8, app installations take effect after a head-unit restart. To uninstall, remove the YouTube app first, then its helper through the Store. The Waze app uses different IDs, paths, and services.

The helper exposes only a local Unix socket, not a network control port. The socket is accessible to the existing OAP app group; it is not a security boundary against other trusted root/OAP apps already on the same head unit.

See `THIRD_PARTY.md` for provenance and licenses.

## On-car validation (2026-11-25)

- Fixed notification-only gear field permissions and explicit local module extensions.
- Fixed a startup crash caused by the BMW SDK heartbeat property shadowing the playback heartbeat method. A regression test covers this collision.
- The owner confirmed that the YouTube screen remains open after installing 0.1.4.
- Separately installed FFmpeg 7.0.2 and yt-dlp 2026.11.23; both start successfully. FFmpeg passed silent synthetic video and audio processing tests.
- These binaries are not bundled in the app release. The verified Python installation runs yt-dlp.
- Speaker output, YouTube streaming, foreground stop behavior and vehicle signal behavior still need on-car validation. audioVerified remains false; chargingSignal remains unset.
