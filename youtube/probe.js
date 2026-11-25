'use strict';
// Read-only inventory, intended to run via SSH stdin while parked. No settings or devices opened.
const fs = require('fs'), cp = require('child_process');
function read(file) { try { return fs.readFileSync(file, 'utf8').slice(0, 24000); } catch (e) { return null; } }
const report = { node: process.version, arch: process.arch, os: read('/etc/os-release'), alsa: read('/proc/asound/pcm'), renderer: read('/var/opt/mgu-render/current/component.json'), signals: [] };
for (const command of ['/usr/bin/ffmpeg', '/var/opt/u11-youtube/bin/ffmpeg', '/var/opt/u11-youtube/bin/yt-dlp']) {
    try { const r = cp.spawnSync(command, [command.endsWith('yt-dlp') ? '--version' : '-version'], { timeout: 5000, encoding: 'utf8', maxBuffer: 65536 }); report[command] = { code: r.status, version: (r.stdout || '').split('\n')[0], error: r.error && r.error.code }; } catch (e) { report[command] = { error: e.code }; }
}
// The complete catalogue may exceed the bounded read. Only print relevant interface names, never VIN/settings.
try {
    const raw = fs.readFileSync('/etc/oap/someip/someip-interfaces.json', 'utf8');
    const data = JSON.parse(raw);
    function walk(o, route, depth) {
        if (!o || typeof o !== 'object' || depth > 7) return;
        Object.keys(o).forEach(k => {
            if (/charg|ladestatus|plugstate|carSpeed2|GearboxDrive|DataPowerTrain2/i.test(k)) report.signals.push({ path: route.concat(k).join('.'), schema: JSON.stringify(o[k]).slice(0, 12000) });
            else walk(o[k], route.concat(k), depth + 1);
        });
    }
    walk(data, [], 0); report.signals = report.signals.slice(0, 60);
} catch (e) { report.catalogError = e.message; }
console.log(JSON.stringify(report, null, 2));
