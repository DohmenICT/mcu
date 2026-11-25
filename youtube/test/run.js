'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), EventEmitter = require('events');
const policy = require('../src/policy'), youtube = require('../src/youtube'), { Frames } = require('../src/frames');
const { Controller } = require('../src/controller'), { Signals } = require('../src/signals');
const view = require('../src/view');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('BMW SDK heartbeat property cannot shadow playback heartbeat', () => {
    const vm = require('vm');
    const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
    let instance;
    class OnlineApp extends EventEmitter {
        constructor() { super(); this.heartbeat = {}; instance = this; }
        start() { return Promise.resolve(); }
    }
    vm.runInNewContext(source, {
        require(name) {
            if (name.indexOf('OnlineApp') >= 0) return OnlineApp;
            if (name.indexOf('/logging/') >= 0) return { getSDKLogger: () => ({}) };
            if (name === 'fs') return fs;
            return {};
        },
        process: { on() {} }, clearInterval, Promise
    });
    let sent;
    instance.send = value => { sent = value; };
    instance.sendPlaybackHeartbeat();
    assert.strictEqual(sent.op, 'heartbeat');
    assert.strictEqual(sent.front, false);
    assert.strictEqual(typeof instance.heartbeat, 'object');
});
let now = 10000;
const fresh = value => ({ value, at: now });
const car = () => ({ speed: fresh(0), gear: fresh('P'), charging: fresh(true) });
test('Only parked with fresh independent signals', () => {
    assert.strictEqual(policy.decision('parked', car(), fresh(true), now), null);
    for (const speed of [0.01, 30, -1, NaN, null, '0']) { const v = car(); v.speed.value = speed; assert(policy.decision('parked', v, fresh(true), now)); }
    for (const gear of ['D', 'N', 'R', null]) { const v = car(); v.gear.value = gear; assert(policy.decision('parked', v, fresh(true), now)); }
});
test('Missing, stale, future data and unknown mode fail closed', () => {
    for (const name of ['speed', 'gear']) for (const value of [null, { value: name === 'speed' ? 0 : 'P', at: now - 3001 }, { value: name === 'speed' ? 0 : 'P', at: now + 1 }]) {
        const v = car(); v[name] = value; assert(policy.decision('parked', v, fresh(true), now));
    }
    assert(policy.decision('always', car(), fresh(true), now));
    assert(policy.decision('parked', car(), null, now));
    assert(policy.decision('parked', car(), fresh(false), now));
});
test('Charging mode needs confirmed active charging as well as P', () => {
    assert.strictEqual(policy.decision('charging', car(), fresh(true), now), null);
    for (const value of [null, false, 1, 'true']) { const v = car(); v.charging.value = value; assert(policy.decision('charging', v, fresh(true), now)); }
    const v = car(); v.charging.at -= 3001; assert(policy.decision('charging', v, fresh(true), now));
});
test('Raw selector does not confuse N/P or initializing with P', () => {
    assert.strictEqual(policy.speed({ speedVehicleCentreOfGravity: 64 }), 1);
    assert.strictEqual(policy.speed({ speedVehicleCentreOfGravity: 65535 }), null);
    assert.strictEqual(policy.gear({ statusActualStageDrive: 1 }), 'P');
    assert.strictEqual(policy.selection({ statusGearSelectionDrive: 3 }), 'P');
    assert.strictEqual(policy.selection({ statusGearSelectionDrive: 4 }), null);
    assert.strictEqual(policy.selection({ statusGearSelectionDrive: 'NP' }), null);
});
test('YouTube URL parsing accepts links and rejects foreign hosts/commands', () => {
    for (const s of ['aqz-KE-bpKQ', 'https://youtu.be/aqz-KE-bpKQ?t=12', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&list=test', 'https://youtube.com/shorts/aqz-KE-bpKQ']) assert.strictEqual(youtube.videoId(s), 'aqz-KE-bpKQ');
    for (const s of ['file:///etc/passwd', 'https://youtube.com.evil/watch?v=aqz-KE-bpKQ', 'https://user@youtube.com/watch?v=aqz-KE-bpKQ', '$(reboot)', 'https://youtube.com/playlist?list=123']) assert.throws(() => youtube.videoId(s));
    assert.strictEqual(youtube.streamUrl('https://rr1.googlevideo.com/videoplayback?a=1'), 'https://rr1.googlevideo.com/videoplayback?a=1');
    for (const s of ['http://rr1.googlevideo.com/v', 'https://127.0.0.1/v', 'https://googlevideo.com.evil/v']) assert.throws(() => youtube.streamUrl(s));
    assert.throws(() => youtube.searchQuery('')); assert.throws(() => youtube.searchQuery('x\n--exec reboot'));
});
test('MGVF writer handles fragmented input and rotates three complete slots', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtube-frames-')), file = path.join(dir, 'video');
    const f = new Frames(file, 16, 16), frame = Buffer.alloc(384, 17);
    f.push(frame.slice(0, 30)); assert.strictEqual(f.seq, 0); f.push(frame.slice(30)); assert.strictEqual(f.seq, 1);
    f.push(Buffer.alloc(384 * 3, 42));
    const b = fs.readFileSync(file); assert.strictEqual(b.readUInt32LE(0), 0x4656474d); assert.strictEqual(b.readUInt32LE(16), 4); assert.strictEqual(b.readUInt32LE(20), 0);
    assert(b.slice(64, 64 + 384).equals(Buffer.alloc(384, 42))); f.close(); assert(!fs.existsSync(file)); fs.rmdirSync(dir);
});
class FakePlayer extends EventEmitter { constructor() { super(); this.stops = 0; this.starts = 0; } stop() { this.stops++; } play(id, allowed) { this.starts++; this.allowed = allowed; return Promise.resolve(); } }
const heartbeat = () => ({ front: true, speed: { value: 0, age: 0 }, gear: { value: 'P', age: 0 }, charging: { value: true, age: 0 } });
test('Movement during asynchronous stream loading cancels playback', () => {
    const p = new FakePlayer(), c = new Controller(p, 'parked', () => now); c.telemetry(heartbeat()); c.play('aqz-KE-bpKQ');
    assert(p.allowed()); c.telemetry(Object.assign(heartbeat(), { speed: { value: 1, age: 0 } })); assert(!p.allowed()); assert.strictEqual(c.phase, 'idle'); assert.strictEqual(p.stops, 1);
});
test('Heartbeat cannot refresh stale vehicle samples; no automatic resume', () => {
    const p = new FakePlayer(), c = new Controller(p, 'parked', () => now); c.telemetry(heartbeat()); c.play('aqz-KE-bpKQ');
    c.telemetry(Object.assign(heartbeat(), { speed: { value: 0, age: 3001 } })); assert.strictEqual(c.phase, 'idle');
    c.telemetry(heartbeat()); assert.strictEqual(c.phase, 'idle'); assert.strictEqual(p.starts, 1);
});
test('UI disconnect, foreground loss, and watchdog expiry stop video', () => {
    for (const change of [c => c.telemetry(Object.assign(heartbeat(), { front: false })), c => { c.front = null; c.tick(); }, c => { now += 3001; c.tick(); }]) {
        const p = new FakePlayer(), c = new Controller(p, 'parked', () => now); c.telemetry(heartbeat()); c.play('aqz-KE-bpKQ'); change(c); assert.strictEqual(c.phase, 'idle'); assert(p.stops > 0);
    }
});
test('Mode persists and changing to charging stops when unplugged', () => {
    const p = new FakePlayer(); let saved;
    const c = new Controller(p, 'parked', () => now, mode => { saved = mode; });
    c.telemetry(Object.assign(heartbeat(), { charging: { value: false, age: 0 } })); c.play('aqz-KE-bpKQ'); c.setMode('charging');
    assert.strictEqual(saved, 'charging'); assert.strictEqual(c.phase, 'idle'); assert.throws(() => c.setMode('always'));
});
test('Conflicting fresh gear sources deny parking', () => {
    const s = new Signals({}, console, null); s.put('gearbox', 'P'); s.put('selection', 'D'); assert.strictEqual(s.snapshot().gear, null);
    s.put('selection', 'P'); assert.strictEqual(s.snapshot().gear.value, 'P');
});
test('Touch targets stay inside screen and search/edit actions work', () => {
    const cv = { clear() {}, text() {}, fillRect() {} };
    for (const model of [{ page: 'home' }, { page: 'settings' }, { keyboard: true }, { state: { results: Array.from({ length: 6 }, (_, i) => ({ id: String(i), title: 'Test' })) } }]) {
        const targets = view.draw(cv, model);
        targets.forEach(t => assert(t.x >= 0 && t.y >= 0 && t.x + t.w <= view.W && t.y + t.h <= view.H));
    }
    const model = { query: '' }; let request; const send = q => { request = q; };
    view.action(model, 'key:A', send); view.action(model, 'key:b', send); view.action(model, 'erase', send); view.action(model, 'search', send);
    assert.deepStrictEqual(request, { op: 'search', term: 'A' });
});
console.log(count + ' test groups passed. No vehicle tests performed.');
