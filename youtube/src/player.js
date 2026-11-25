'use strict';
const cp = require('child_process'), fs = require('fs'), EventEmitter = require('events');
const { Frames } = require('./frames.js');
const { videoId, streamUrl, searchQuery } = require('./youtube.js');
class Player extends EventEmitter {
    constructor(config, spawn, FrameWriter) { super(); this.config = config; this.spawn = spawn || cp.spawn; this.FrameWriter = FrameWriter || Frames; this.children = new Set(); this.generation = 0; this.frames = null; this.query = null; }
    ready() {
        for (const key of ['ytDlp', 'ffmpeg']) {
            if (typeof this.config[key] !== 'string' || !this.config[key].startsWith('/')) throw new Error(key + ': configureer een absoluut uitvoerbaar pad');
            fs.accessSync(this.config[key], fs.constants.X_OK);
        }
        if (!this.config.audioVerified || typeof this.config.audioDevice !== 'string' || !/^[A-Za-z0-9_:.,=-]{1,120}$/.test(this.config.audioDevice)) {
            throw new Error('BMW-audiouitvoer moet eerst op de auto worden geconfigureerd en getest');
        }
    }
    run(args) {
        if (this.query) return Promise.reject(new Error('Er loopt al een zoekopdracht'));
        return new Promise((resolve, reject) => {
            const p = this.spawn(this.config.ytDlp, ['--ignore-config', '--no-cache-dir', '--no-playlist', '--socket-timeout', '10'].concat(args), { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
            this.query = p; this.children.add(p); let data = '', done = false;
            const finish = (error) => { if (done) return; done = true; clearTimeout(timer); this.children.delete(p); if (this.query === p) this.query = null; error ? reject(error) : resolve(data); };
            const timer = setTimeout(() => { p.kill('SIGKILL'); finish(new Error('YouTube antwoordt niet op tijd')); }, 45000);
            p.stdout.on('data', b => { data += b; if (data.length > 2 * 1024 * 1024) { p.kill('SIGKILL'); finish(new Error('Antwoord te groot')); } });
            p.stderr.on('data', () => {}); // Stream URLs / account hints must not go into the journal.
            p.on('error', () => finish(new Error('YouTube-programma ontbreekt of kan niet starten')));
            p.on('close', code => finish(code === 0 ? null : new Error('YouTube ophalen mislukt; controleer internet en yt-dlp')));
        });
    }
    async search(term) {
        const rows = await this.run(['--flat-playlist', '--dump-json', '--', 'ytsearch6:' + searchQuery(term)]);
        return rows.trim().split('\n').filter(Boolean).map(s => JSON.parse(s)).filter(v => /^[A-Za-z0-9_-]{11}$/.test(v.id)).slice(0, 6).map(v => ({ id: v.id, title: String(v.title || v.id).slice(0, 180) }));
    }
    async play(input, allowed) {
        const id = videoId(input);
        this.stop(); this.ready(); const generation = this.generation;
        // One muxed stream keeps audio/video clocks together. No login/cookie extraction.
        const data = JSON.parse(await this.run(['--dump-single-json', '-f', 'best[height<=720][vcodec!=none][acodec!=none]', '--', 'https://www.youtube.com/watch?v=' + id]));
        if (generation !== this.generation || !allowed()) return;
        const url = streamUrl(data.url);
        const file = '/dev/shm/mgu-video-u11-youtube';
        this.frames = new this.FrameWriter(file, 960, 540);
        const args = ['-nostdin', '-hide_banner', '-loglevel', 'error', '-threads', '2', '-re', '-rw_timeout', '15000000', '-protocol_whitelist', 'https,tls,tcp', '-i', url,
            '-map', '0:v:0', '-vf', 'scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25,scale=out_color_matrix=bt709:out_range=tv',
            '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1', '-map', '0:a:0', '-ac', '2', '-ar', '48000', '-f', 'alsa', this.config.audioDevice];
        const p = this.spawn(this.config.ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
        this.children.add(p); let first = true;
        p.stdout.on('data', b => {
            if (generation !== this.generation) return;
            if (!allowed()) { this.stop(); return; }
            try { this.frames.push(b); if (first && this.frames.seq) { first = false; this.emit('playing', { id, title: String(data.title || id).slice(0, 180), file }); } }
            catch (e) { this.stop(); this.emit('failure', 'Videobuffer kon niet worden geschreven'); }
        });
        p.stderr.on('data', () => {});
        p.on('error', () => { if (generation === this.generation) { this.stop(); this.emit('failure', 'Videospeler kon niet starten'); } });
        p.on('close', code => {
            this.children.delete(p);
            if (generation === this.generation) { this.stop(); this.emit(code === 0 ? 'ended' : 'failure', 'Video of audio kon niet worden afgespeeld'); }
        });
    }
    stop() {
        this.generation++;
        this.children.forEach(p => p.kill('SIGKILL')); this.children.clear();
        if (this.frames) { this.frames.close(); this.frames = null; }
    }
}
module.exports = { Player };
