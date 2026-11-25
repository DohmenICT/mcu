'use strict';
const net = require('net');
const fs = require('fs');
function diagnostic(message) {
    try {
        const file = '/dev/shm/u11-youtube-ui-' + process.getuid() + '.log';
        if (fs.existsSync(file) && fs.statSync(file).size > 65536) fs.writeFileSync(file, '');
        fs.appendFileSync(file, new Date().toISOString() + ' ' + message + '\n');
    } catch (e) {}
}
process.on('uncaughtException', e => { diagnostic(e.stack || e.message); process.exit(1); });
process.on('unhandledRejection', e => diagnostic('Rejected: ' + (e && e.stack || e)));
const OnlineApp = require('oap-sdk/src/core/OnlineApp.js');
const log = require('oap-sdk/src/logging/logging').getSDKLogger();
const builders = require('oap-sdk/src/someip/someipBuilders');
const kit = require('./kit_record.js');
const { RenderClient, videoOp } = require('./mgu_render_client.js');
const { Signals } = require('./signals.js');
const view = require('./view.js');
const chargingSignal = require('./charging-config.js');
class YouTubeApp extends OnlineApp {
    constructor() {
        super(); this.model = { page: 'home', query: '', state: null }; this.front = false; this.closed = false; this.sock = null;
        this.on('initialized', () => this.setup().catch(e => { diagnostic(e.stack || e.message); log.error(e.stack || e.message); }));
        this.on('entryPointExecute', id => { if (this.rhmiApplication) { this.registerActive(); this.rhmiApplication.openEntryState(id).catch(e => log.warn(e.message)); } });
        this.on('shutdown', () => this.close());
        this.on('error', e => log.warn(e.message));
    }
    async setup() {
        if (!this.rhmiApplication) return this.initialized();
        const r = this.rhmiApplication, page = r.getByName('ST_U11_YouTube');
        this.label = r.getByName('ytStatus');
        await page.updateResources();
        const entry = this.getEntryPoints().find(e => this.appDescription.application.entryPoints.some(d => d.uuid === e.getDescription().uuid));
        if (!entry) throw new Error('YouTube entry point ontbreekt');
        await entry.init(); await r.mapEntryState(entry.getDescription().uuid, page); await entry.setAvailability('ENABLED');
        this.registerActive(); await this.initialized();
        this.signals = new Signals(builders, log, chargingSignal); this.signals.start();
        this.gpu = new RenderClient('u11_youtube', log, { mode: 'layer', kit });
        this.gpu.on('ready', (screen, info) => {
            diagnostic('Renderer ready: ' + JSON.stringify(info));
            if (!info || !info.video || !info.frontGate || info.modes.indexOf('layer') < 0) { this.label.setValue(0, 'Text', 'Werk mgu-render bij: video/voorgrondcontrole ontbreekt', 'Text').catch(() => {}); return; }
            const box = info.appArea, scale = Math.min(box.w / view.W, box.h / view.H);
            this.gpu.place({ x: box.x, y: box.y, w: box.w, h: box.h, scale, ox: (box.w - view.W * scale) / 2, oy: (box.h - view.H * scale) / 2 });
            this.gpu.show(true); this.draw();
        });
        this.gpu.on('state', s => { this.front = s.front === true && s.onScreen === true; this.sendPlaybackHeartbeat(); });
        this.gpu.on('close', () => { this.front = false; this.sendPlaybackHeartbeat(); });
        this.gpu.on('closed', () => { this.front = false; this.send({ op: 'stop' }); this.gpu.show(true); });
        this.gpu.on('touch', (phase, x, y) => {
            if (phase !== 'up' && phase !== 3) return;
            const t = view.hit(this.targets || [], x, y); if (t) { view.action(this.model, t.id, q => this.send(q)); this.draw(); }
        });
        this.gpu.connect(); this.connect();
        this.timer = setInterval(() => { if (!this.sock) this.connect(); this.sendPlaybackHeartbeat(); this.draw(); }, 500);
        const id = this.getLastExecutedEntryPointUuid && this.getLastExecutedEntryPointUuid(); if (id) await r.openEntryState(id);
    }
    connect() {
        if (this.sock || this.closed) return;
        const s = net.connect('/run/u11-youtube/ctl.sock'); this.sock = s; let buf = '';
        s.on('connect', () => this.sendPlaybackHeartbeat()); s.on('error', () => {});
        s.on('close', () => { if (this.sock === s) { this.sock = null; this.model.state = { blocked: 'Speler niet verbonden - herstart na installatie' }; this.draw(); } });
        s.on('data', b => {
            buf += b; if (buf.length > 32768) { s.destroy(); return; } let n;
            while ((n = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, n); buf = buf.slice(n + 1);
                try { const state = JSON.parse(line); if (state.error) { this.model.state = Object.assign({}, this.model.state, { message: state.error }); } else this.model.state = state; this.draw(); } catch (e) { log.warn('YouTube: onleesbare spelerstatus'); }
            }
        });
    }
    sendPlaybackHeartbeat() { this.send(Object.assign({ op: 'heartbeat', front: this.front }, this.signals ? this.signals.snapshot() : {})); }
    send(q) { if (this.sock && !this.sock.destroyed) this.sock.write(JSON.stringify(q) + '\n'); }
    draw() {
        if (!this.gpu || !this.gpu.ready) return;
        const cv = new kit.Recorder(view.W, view.H); this.targets = view.draw(cv, this.model);
        this.gpu.claim(this.targets);
        const playing = this.model.state && this.model.state.phase === 'playing' && !this.model.state.blocked;
        if (playing) {
            this.gpu.video(1, '/dev/shm/mgu-video-u11-youtube');
            const ops = videoOp(1, 320, 185, 640, 360, 0);
            cv._grow(ops.length); cv.u.set(ops, cv.n); cv.n += ops.length;
        } else this.gpu.video(1, null);
        this.gpu.frame(cv);
    }
    close() {
        this.closed = true; clearInterval(this.timer); this.send({ op: 'stop' });
        if (this.sock) this.sock.destroy(); if (this.signals) this.signals.close();
        if (this.gpu) this.gpu.close();
        Promise.resolve(this.destroyBundles()).then(() => process.exit(0), () => process.exit(0));
    }
}
new YouTubeApp().start().catch(e => log.error('YouTube start: ' + e.message));
