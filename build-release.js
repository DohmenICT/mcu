'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const root = __dirname, out = path.join(root, 'dist', 'release');
fs.mkdirSync(out, { recursive: true });
for (const app of ['waze', 'youtube']) cp.execFileSync(process.execPath, [path.join(root, app, 'build.js')], { cwd: root, stdio: 'inherit' });
const specs = [
    { folder: 'waze', id: 'u11_waze_hud', kind: 'app', version: '0.1.2', title: 'Waze HUD (test)', description: 'Waze CarPlay-kaart op het HUD; getest op iX1 U11 OS8, vaste schermindeling.', requires: { 'u11-waze-hud': '0.1.0' } },
    { folder: 'waze', id: 'u11-waze-hud', kind: 'tool', version: '0.1.0', title: 'Waze HUD U11 helper', description: 'Schermuitsnede en HUD-uitvoer voor Waze HUD.', requires: { 'cluster-render': '0.6.9', 'mgu-deploy': '0.8.22' } },
    { folder: 'youtube', id: 'u11_youtube', kind: 'app', version: '0.1.4', title: 'YouTube (test - setup vereist)', description: 'Lokaal prototype: nog niet afspeelklaar. FFmpeg, yt-dlp, BMW-audio en voertuigsignalen moeten op de auto worden ingericht en getest.', requires: { 'u11-youtube': '0.1.4', 'mgu-render': '0.6.23' } },
    { folder: 'youtube', id: 'u11-youtube', kind: 'tool', version: '0.1.4', title: 'YouTube OS8 player (test)', description: 'Experimentele afspeelservice. Binaries en bevestigde audio-configuratie worden niet meegeleverd.', requires: { 'mgu-deploy': '0.8.22' } }
];
const components = specs.map(spec => {
    const name = spec.id + '@' + spec.version + '.tgz';
    const data = fs.readFileSync(path.join(root, spec.folder, 'dist', name));
    fs.writeFileSync(path.join(out, name), data);
    const entry = Object.assign({}, spec, { mguHmi: ['ID8'], uninstallable: true, artifact: { name, url: 'https://github.com/DohmenICT/mcu/releases/download/catalog/' + name, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') } });
    delete entry.folder; if (spec.kind === 'app') entry.build = 'unit'; return entry;
});
const catalog = JSON.stringify({ schema: 2, components }, null, 2) + '\n';
fs.writeFileSync(path.join(root, 'catalog.json'), catalog); fs.writeFileSync(path.join(out, 'catalog.json'), catalog);
console.log('Release assets prepared in dist/release. No SDK or private vehicle files included.');
