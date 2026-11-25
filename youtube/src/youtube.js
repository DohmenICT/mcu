'use strict';
const URL = require('url').URL;
function videoId(input) {
    if (typeof input !== 'string' || input.length > 2048) throw new Error('Ongeldige YouTube-link');
    const s = input.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    let u; try { u = new URL(s); } catch (e) { throw new Error('Gebruik een YouTube-link of video-ID'); }
    if (u.protocol !== 'https:' || u.username || u.password || u.port) throw new Error('Gebruik een https YouTube-link');
    let id;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].indexOf(u.hostname) >= 0) {
        if (u.pathname === '/watch') id = u.searchParams.get('v');
        else { const m = /^\/(?:shorts|live|embed)\/([^/]+)$/.exec(u.pathname); id = m && m[1]; }
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Geen geldige YouTube-video');
    return id;
}
function streamUrl(s) {
    const u = new URL(s);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !/(^|\.)googlevideo\.com$/.test(u.hostname)) {
        throw new Error('Onverwachte videostream geweigerd');
    }
    return s;
}
function searchQuery(s) {
    if (typeof s !== 'string' || !s.trim() || s.length > 160 || /[\x00-\x1f]/.test(s)) throw new Error('Voer een zoekterm in (maximaal 160 tekens)');
    return s.trim();
}
module.exports = { videoId, streamUrl, searchQuery };
