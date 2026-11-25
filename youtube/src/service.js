'use strict';
const fs = require('fs'), net = require('net');
const { Player } = require('./player.js'), { Controller } = require('./controller.js');
const ROOT = '/var/opt/u11-youtube', SOCKET = '/run/u11-youtube/ctl.sock';
let config = {}, mode = 'parked';
try { config = JSON.parse(fs.readFileSync(ROOT + '/config.json', 'utf8')); } catch (e) {}
try { mode = JSON.parse(fs.readFileSync(ROOT + '/settings.json', 'utf8')).mode; } catch (e) {}
const player = new Player(config);
const controller = new Controller(player, mode, Date.now, value => {
    const file = ROOT + '/settings.json'; fs.writeFileSync(file + '.new', JSON.stringify({ mode: value }), { mode: 0o600 }); fs.renameSync(file + '.new', file);
});
let client = null;
function send(state) { if (client && !client.destroyed) { if (client.writableLength > 65536) client.destroy(); else client.write(JSON.stringify(state) + '\n'); } }
controller.on('status', send);
const server = net.createServer(c => {
    if (client) { c.destroy(); return; } // One foreground UI owns the player.
    client = c; let buf = '';
    c.setTimeout(5000, () => c.destroy());
    c.on('error', () => {});
    c.on('close', () => { if (client === c) { client = null; controller.front = null; controller.stop(); } });
    send(controller.status());
    c.on('data', b => {
        buf += b; if (buf.length > 8192) { c.destroy(); return; }
        let n;
        while ((n = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, n); buf = buf.slice(n + 1);
            try {
                const q = JSON.parse(line);
                if (q.op === 'heartbeat') { controller.telemetry(q); send(controller.status()); }
                else if (q.op === 'mode') controller.setMode(q.mode);
                else if (q.op === 'stop') controller.stop();
                else if (q.op === 'play') controller.play(q.id).catch(e => send({ error: e.message }));
                else if (q.op === 'search') controller.search(q.term);
                else throw new Error('Onbekende opdracht');
            } catch (e) { send({ error: e.message }); }
        }
    });
});
// No network listener; the socket lives in the group-restricted runtime directory.
try { fs.unlinkSync(SOCKET); } catch (e) { if (e.code !== 'ENOENT') throw e; }
// A dead previous process may have left its video buffer. Never follow a symlink.
const frameFile = '/dev/shm/mgu-video-u11-youtube';
try { if (fs.lstatSync(frameFile).isFile()) fs.unlinkSync(frameFile); } catch (e) { if (e.code !== 'ENOENT') throw e; }
server.listen(SOCKET, () => fs.chmodSync(SOCKET, 0o660));
const timer = setInterval(() => controller.tick(), 200);
function close() { clearInterval(timer); controller.stop(); if (client) client.destroy(); server.close(() => process.exit(0)); }
process.on('SIGTERM', close); process.on('SIGINT', close);
