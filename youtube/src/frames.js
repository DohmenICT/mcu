'use strict';
const fs = require('fs');
// mgu-render protocol 4: three I420 slots; publish slot before sequence.
class Frames {
    constructor(file, width, height) {
        this.file = file; this.size = width * height * 3 / 2; this.slot = 2; this.seq = 0;
        if (width % 2 || height % 2 || width < 16 || height < 16 || width > 2048 || height > 2048) throw new Error('Invalid video dimensions');
        this.fd = fs.openSync(file, 'wx', 0o644);
        fs.ftruncateSync(this.fd, 64 + 3 * this.size);
        const header = Buffer.alloc(64);
        [0x4656474d, 1, width, height, 0, 0, 3, 1, 0].forEach((v, i) => header.writeUInt32LE(v, i * 4));
        fs.writeSync(this.fd, header, 0, 64, 0);
        this.pending = Buffer.alloc(this.size); this.used = 0;
    }
    push(data) {
        let at = 0;
        while (at < data.length) {
            const n = Math.min(this.size - this.used, data.length - at);
            data.copy(this.pending, this.used, at, at + n); at += n; this.used += n;
            if (this.used === this.size) {
                this.slot = (this.slot + 1) % 3;
                fs.writeSync(this.fd, this.pending, 0, this.size, 64 + this.slot * this.size);
                const word = Buffer.alloc(4); word.writeUInt32LE(this.slot, 0); fs.writeSync(this.fd, word, 0, 4, 20);
                this.seq = (this.seq + 1) >>> 0; word.writeUInt32LE(this.seq, 0); fs.writeSync(this.fd, word, 0, 4, 16);
                this.used = 0;
            }
        }
    }
    close() { if (this.fd !== null) { fs.closeSync(this.fd); this.fd = null; } try { fs.unlinkSync(this.file); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
}
module.exports = { Frames };
