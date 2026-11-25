'use strict';
// Each signal retains its own receipt time. A heartbeat must never freshen a car value.
const MAX_AGE = 3000;
function fresh(s, now) { return s && Number.isFinite(s.at) && now >= s.at && now - s.at <= MAX_AGE; }
function decision(mode, v, front, now) {
    if (mode !== 'parked' && mode !== 'charging') return 'Ongeldige instelling';
    if (!fresh(front, now) || front.value !== true) return 'Open de app op het autoscherm';
    if (!fresh(v.speed, now) || !Number.isFinite(v.speed.value) || v.speed.value < 0) return 'Wachten op actuele snelheid';
    if (v.speed.value !== 0) return 'Video gestopt: auto beweegt';
    if (!fresh(v.gear, now) || v.gear.value !== 'P') return 'Zet de auto in P';
    if (mode === 'charging' && (!fresh(v.charging, now) || v.charging.value !== true)) return 'Wachten op actief laden';
    return null;
}
function speed(v) {
    const n = v && v.speedVehicleCentreOfGravity;
    return Number.isInteger(n) && n >= 0 && n < 65535 ? n / 64 : null;
}
function gear(v) {
    const n = v && v.statusActualStageDrive;
    return ({ P: 'P', R: 'R', N: 'N', D: 'D', 1: 'P', 2: 'R', 3: 'N', 4: 'D' })[n] || null;
}
function selection(v) {
    const n = v && v.statusGearSelectionDrive;
    if (n === 'P' || n === 3) return 'P';
    if (n === 'R' || n === 2) return 'R';
    if (n === 'N' || n === 1) return 'N';
    if ((Number.isInteger(n) && n >= 5 && n <= 13) || /^_[1-9]$/.test(n)) return 'D';
    return null; // NP deliberately does not count as Park.
}
module.exports = { decision, fresh, speed, gear, selection, MAX_AGE };
