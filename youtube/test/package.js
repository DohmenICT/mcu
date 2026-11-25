'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert'), zlib = require('zlib'), crypto = require('crypto');
const root = path.join(__dirname, '..', 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
for (const item of catalog.components) {
    const data = fs.readFileSync(path.join(root, item.artifact.name));
    assert.strictEqual(data.length, item.artifact.size);
    assert.strictEqual(crypto.createHash('sha256').update(data).digest('hex'), item.artifact.sha256);
    const tar = zlib.gunzipSync(data), members = [];
    for (let at = 0; at + 512 <= tar.length; ) {
        const name = tar.slice(at, at + 100).toString().split('\0')[0]; if (!name) break;
        const size = parseInt(tar.slice(at + 124, at + 136).toString().replace(/\0/g, '').trim(), 8) || 0;
        assert(!name.startsWith('/') && name.split('/').indexOf('..') < 0);
        assert(!/known_hosts|private-diagnostics|\.pem$|\.key$|node_modules\/oap-sdk/.test(name));
        members.push(name); at += 512 + Math.ceil(size / 512) * 512;
    }
    if (item.kind === 'app') { assert(members.some(n => /mgu-app.json$/.test(n))); assert(members.some(n => /src\/app.js$/.test(n))); }
    else { assert(members.includes('component.json')); assert(members.includes('files/player.js')); }
    console.log('PASS artifact hashes, safe paths and package contents: ' + item.id);
}
