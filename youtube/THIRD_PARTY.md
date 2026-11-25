# Licenses and provenance

This project is GPL-3.0-or-later. It uses the existing Waze app's OAP packaging/lifecycle pattern.

Vendored from robertnisipeanu/mgu-store, commit
`d5e305242dc4e1ee3a1265ad48c6f0f19d12fcbf`:

- `oap_link.js`, `oap_pack.js`, base manifest/permissions, renderer client: GPL-3.0-or-later; Robert Nisipeanu and IterioDev. Full license in `LICENSE`.
- Drawing kit: upstream provenance and copyright comments retained. cauliflowermossgrape MIT notice in `vendor/LICENSE-kit.txt`.
- Inter glyph atlases: SIL Open Font License, `vendor/LICENSE-Inter.txt`.
- `vendor/i18n.js` is this project's minimal locale adapter, not an upstream file.

Signal names and speed/selector decoding were checked against cauliflowermossgrape/idrive7-apps `kit/runtime/car.js` (MIT). This app uses independent freshness checks and never treats missing signals as parked.

No BMW SDK, vehicle credentials, captured vehicle data, FFmpeg binaries or yt-dlp binaries are included. The head unit supplies its own SDK. No code from the PolyForm-licensed IterioDev/car-apps is included.
