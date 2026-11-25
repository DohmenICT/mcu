'use strict';
const EventEmitter = require('events');
const { decision } = require('./policy.js');
class Controller extends EventEmitter {
    constructor(player, mode, clock, save) {
        super(); this.player = player; this.mode = mode === 'charging' ? mode : 'parked';
        this.clock = clock || Date.now; this.save = save || (() => {}); this.vehicle = {}; this.front = null;
        this.phase = 'idle'; this.message = ''; this.results = []; this.title = ''; this.request = 0;
        player.on('playing', v => { if (!this.allowed()) { this.stop(); return; } this.phase = 'playing'; this.title = v.title; this.publish(); });
        player.on('failure', message => { this.phase = 'error'; this.message = message; this.publish(); });
        player.on('ended', () => { this.phase = 'idle'; this.publish(); });
    }
    blocked() { return decision(this.mode, this.vehicle, this.front, this.clock()); }
    allowed() { return !this.blocked(); }
    status() { return { mode: this.mode, phase: this.phase, message: this.message, blocked: this.blocked(), title: this.title, results: this.results }; }
    publish() { this.emit('status', this.status()); }
    telemetry(q) {
        const now = this.clock(); this.front = { value: q.front === true, at: now };
        for (const name of ['speed', 'gear', 'charging']) {
            const s = q[name];
            this.vehicle[name] = s && Number.isFinite(s.age) && s.age >= 0 && s.age <= 3000 ? { value: s.value, at: now - s.age } : null;
        }
        this.tick();
    }
    tick() { if (!this.allowed() && ['loading', 'playing'].indexOf(this.phase) >= 0) this.stop(this.blocked()); }
    setMode(mode) {
        if (mode !== 'parked' && mode !== 'charging') throw new Error('Kies parkeren of laden');
        this.save(mode); this.mode = mode; this.tick(); this.publish();
    }
    stop(message) { this.request++; this.player.stop(); this.phase = 'idle'; this.message = message || ''; this.publish(); }
    async play(id) {
        if (!this.allowed()) throw new Error(this.blocked());
        this.phase = 'loading'; this.message = ''; const request = ++this.request; this.publish();
        try { await this.player.play(id, () => request === this.request && this.allowed()); }
        catch (e) { if (request === this.request) { this.phase = 'error'; this.message = e.message; this.publish(); } }
    }
    async search(q) {
        if (['loading', 'playing'].indexOf(this.phase) >= 0) this.stop();
        this.phase = 'searching'; this.message = ''; const request = ++this.request; this.publish();
        try { const results = await this.player.search(q); if (request === this.request) { this.results = results; this.phase = 'idle'; this.publish(); } }
        catch (e) { if (request === this.request) { this.phase = 'error'; this.message = e.message; this.publish(); } }
    }
}
module.exports = { Controller };
