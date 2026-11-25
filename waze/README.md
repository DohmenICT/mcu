# Waze HUD (test) — U11 OS8

App `u11_waze_hud` 0.1.2 and helper `u11-waze-hud` 0.1.0, installed through mgu-deploy. Tested on a 2023 BMW iX1 U11 with OS8, ID8-BCP, x86-64, and a central display buffer of 1920×960.

The helper captures one screen image per second using the existing `winston-grabber`, recognizes two known positions of the visible Waze maneuver card in CarPlay, and displays a reduced crop on the HUD through `cluster-render`. It does not use OCR or inject instructions into BMW navigation. The on/off preference is saved; automatic display is enabled by default. An unrecognized card layout or failed capture hides the crop. Frozen Waze content within otherwise fresh screenshots is not detected as stale navigation.

## Verified on the test car

- The app tile and on/off controls work.
- Automatic startup after a restart and saving the preference work.
- The Waze maneuver card is visible and readable alongside speed and speed-limit information.
- Two card positions (normal and after touching the screen) map to the same HUD position.
- Switching to Spotify while Waze continues navigating hides the Waze crop.

## Limitations

This recognizes a fixed pixel layout; it does not reliably identify the active app. Waze must remain in the foreground. Other models, resolutions, dark mode, longer street names, roundabouts, lane guidance, BMW pop-ups, and use while driving have not been validated. The private reference images used to develop the recognition are not published.

The helper requires `cluster-render >= 0.6.9`, `mgu-deploy >= 0.8.22`, and the firmware's `winston-grabber` utility. The renderer must support ID8 HUD output. On OS8, an app installation takes effect after the head unit restarts.

## Build and uninstall

From the repository root:

```powershell
node waze/build.js
```

Output in `waze/dist`: the app source package and its helper. The head unit links its own SDK; no SDK code is included. To uninstall, remove the app first, then its helper through the Store. This app and the YouTube app use separate IDs, directories, and services.
