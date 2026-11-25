# BMW OS8 apps: Waze HUD and YouTube

Custom apps for a BMW MGU head unit with root SSH access and **MGU Store**. Built around the app and helper structure provided by [mgu-store](https://github.com/robertnisipeanu/mgu-store). Target platform: the tested 2023 BMW iX1 U11 with OS8 (ID8-BCP, x86-64).

| App | Status | What does it do? |
|---|---|---|
| **Waze HUD (test)** 0.1.2 | Tested on that iX1, with limitations | Copies the visible Waze maneuver card from CarPlay to the HUD. |
| **YouTube (test)** 0.1.0 | **Local prototype, not ready for use** | Provides a UI and playback service for video while parked or charging. Native playback software, BMW audio, and vehicle signals still require setup and testing on the car. |

**Installing YouTube does not currently give you a working video player.** The yt-dlp and FFmpeg binaries are not included. Playback cannot start without a verified audio configuration and current parking status. Charging mode remains blocked until the actual charging signal is connected. See the [YouTube documentation](youtube/README.md).

## Add to MGU Store

1. Open **Settings → Add source**.
2. Enter `DohmenICT/mcu` and select **Releases**.
3. Install the app you want and its helper. The catalog lists the required renderer and deployer; keep the default Store sources available for these dependencies.
4. Restart the head unit through the Store when OS8 requests it.

Alternatively, add the [direct catalog](https://raw.githubusercontent.com/DohmenICT/mcu/main/catalog.json) as an HTTPS source. Do not select a Branch/Tags source: this repository distributes installation packages through Releases.

All downloads are in the [catalog release](https://github.com/DohmenICT/mcu/releases/tag/catalog). The catalog includes each package's size and SHA-256 checksum.

## USB or cable?

A correctly prepared USB source can be installed through MGU Store's USB page. Use the existing mgu-store installation script:

```powershell
node mgu-install.js usb-repo D:\ github:DohmenICT/mcu
```

**ENET/SSH is recommended for the first YouTube test**, so that dependencies, audio, vehicle status, and logs can be checked. Never copy an SSH key into this repository or onto the installation drive. These packages do not perform another root flash.

## Build locally

Requires Node.js; no npm installation is needed:

```powershell
node waze/build.js
node youtube/build.js
node youtube/test/run.js
node youtube/test/player.js
node youtube/test/package.js
node youtube/preview.js
```

To build the combined catalog and release assets, run `node build-release.js`.

`node youtube/preview.js` starts a local UI simulator at `http://127.0.0.1:8788`; it does not control the car or play real video. Build output is written to each app's `dist` directory. The car links the app against its own BMW SDK. This repository contains the custom source code and required open-source build and drawing components, with no BMW SDK, vehicle keys, private images, or vehicle logs.

See [Waze HUD](waze/README.md), [YouTube](youtube/README.md), and [licenses and provenance](youtube/THIRD_PARTY.md). This project is not affiliated with BMW, Waze, or YouTube.
