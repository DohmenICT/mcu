'use strict';
const { speed, gear, selection } = require('./policy.js');
// Typed proxies use the unit's own SDK and generated SOME/IP catalogue.
class Signals {
    constructor(builders, log, chargingSignal) { this.builders = builders; this.log = log; this.chargingSignal = chargingSignal; this.values = {}; this.timers = []; this.proxies = []; this.closed = false; }
    put(name, value) { this.values[name] = { value, at: Date.now() }; }
    async watch(iface, field, name, decode, canRead) {
        try {
            // Do not enter native SOME/IP from an SDK initialization promise chain.
            await new Promise(resolve => setImmediate(resolve));
            const p = await this.builders.buildTypedProxy(iface, '1'); this.proxies.push(p);
            await p.init(); await p.waitUntilAvailable(); if (this.closed) return;
            const f = p[field]; if (!f) throw new Error('veld ontbreekt');
            const receive = value => { if (!this.closed) this.put(name, decode(value)); };
            await f.subscribe(receive);
            let pending = false;
            const poll = () => {
                if (pending || this.closed) return;
                pending = true;
                Promise.resolve().then(() => f.getValue()).then(receive, () => this.put(name, null)).then(() => { pending = false; });
            };
            if (canRead !== false) { poll(); this.timers.push(setInterval(poll, 1000)); }
        } catch (e) { this.put(name, null); this.log.warn('YouTube signal ' + name + ': ' + e.message); }
    }
    start() {
        this.watch('de.bmw.infotainment.vehicle.Vehicle2', 'statusCarSpeed2', 'speed', speed);
        this.watch('de.bmw.infrastructure.VehicleInformation', 'statusGearboxDrive', 'gearbox', gear, false);
        this.watch('de.bmw.infrastructure.VehicleInformation', 'DataPowerTrain2', 'selection', selection, false);
        const c = this.chargingSignal;
        // Only an explicitly configured and car-verified charging enum is accepted.
        if (c && c.verified === true && Array.isArray(c.activeValues) && c.activeValues.length && Array.isArray(c.inactiveValues)) {
            this.watch(c.interface, c.field, 'charging', v => {
                const value = c.member.split('.').reduce((o, k) => o && o[k], v);
                return c.activeValues.indexOf(value) >= 0 ? true : c.inactiveValues.indexOf(value) >= 0 ? false : null;
            });
        }
    }
    snapshot() {
        const now = Date.now(), out = {};
        ['speed', 'charging'].forEach(k => { const v = this.values[k]; out[k] = v ? { value: v.value, age: now - v.at } : null; });
        const stages = ['gearbox', 'selection'].map(k => this.values[k]).filter(v => v && v.value !== null && now - v.at <= 3000);
        out.gear = stages.length && stages.every(v => v.value === stages[0].value) ? { value: stages[0].value, age: Math.max.apply(null, stages.map(v => now - v.at)) } : null;
        return out;
    }
    close() { this.closed = true; this.timers.forEach(clearInterval); this.proxies.forEach(p => { try { if (p.shutdown) p.shutdown(); } catch (e) {} }); }
}
module.exports = { Signals };
