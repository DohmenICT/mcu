'use strict';
const assert = require('assert'), EventEmitter = require('events'), { PassThrough } = require('stream');
const { Player } = require('../src/player');
function fixture() {
    const calls = [];
    const spawn = (bin, args, options) => {
        const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.killed = false;
        child.kill = () => { child.killed = true; setImmediate(() => child.emit('close', 137)); };
        calls.push({ bin, args, options, child }); return child;
    };
    class Writer { constructor() { this.seq = 0; this.closed = false; } push() { this.seq++; } close() { this.closed = true; } }
    const p = new Player({ ytDlp: '/yt-dlp', ffmpeg: '/ffmpeg', audioDevice: 'verified-test-device' }, spawn, Writer);
    p.ready = () => {}; // Dependency existence/audio setup is verified separately on the car.
    const resolve = () => { const child = calls[0].child; child.stdout.write(JSON.stringify({ title: 'Test video', url: 'https://rr1.googlevideo.com/videoplayback?test=1' })); child.emit('close', 0); };
    return { p, calls, resolve };
}
async function main() {
    {
        const f = fixture(); let playing = 0; f.p.on('playing', () => playing++);
        const done = f.p.play('aqz-KE-bpKQ', () => true); f.resolve(); await done;
        assert.strictEqual(f.calls.length, 2); assert.strictEqual(f.calls[1].options.shell, false);
        assert(f.calls[1].args.includes('rawvideo')); assert(f.calls[1].args.includes('alsa'));
        f.calls[1].child.stdout.write(Buffer.from([1])); assert.strictEqual(playing, 1);
        const frames = f.p.frames; f.p.stop(); assert(frames.closed); assert(f.calls[1].child.killed);
        console.log('PASS native backend resolves, starts video/audio, publishes and stops');
    }
    {
        const f = fixture(); let allowed = true;
        const done = f.p.play('aqz-KE-bpKQ', () => allowed); allowed = false; f.resolve(); await done;
        assert.strictEqual(f.calls.length, 1);
        console.log('PASS lost permission while resolving never starts FFmpeg');
    }
    {
        const f = fixture(); const done = f.p.play('aqz-KE-bpKQ', () => true); f.p.stop(); f.resolve(); await done;
        assert.strictEqual(f.calls.length, 1);
        console.log('PASS stop invalidates a late successful resolver reply');
    }
    {
        const p = new Player({}); assert.throws(() => p.ready());
        console.log('PASS missing native dependencies do not silently fall back');
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
