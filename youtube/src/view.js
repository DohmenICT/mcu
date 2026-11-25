'use strict';
// Shared drawing and hit targets for native MGU and the local browser preview.
const W = 1280, H = 600;
function draw(cv, model) {
    const targets = [], state = model.state || {}, page = model.page || 'home';
    cv.clear('#10141c');
    cv.text('YouTube', 32, 47, 32, '#ffffff', { font: 'bold' });
    cv.text('BMW OS8  /  TESTVERSIE', 208, 45, 17, '#9ca8bb');
    const button = (id, text, x, y, w, h, selected) => {
        cv.fillRect(x, y, w, h, selected ? '#bd2c39' : '#263142');
        cv.text(text, x + 15, y + h / 2 + 8, 22, '#ffffff');
        targets.push({ id, x, y, w, h });
    };
    button('home', 'Video zoeken', 32, 76, 210, 54, page === 'home');
    button('settings', 'Instellingen', 254, 76, 210, 54, page === 'settings');
    button('stop', 'Stop', 1040, 76, 208, 54, false);
    const message = state.message || state.blocked || 'Klaar om af te spelen';
    cv.text(message.slice(0, 91), 32, 575, 20, state.blocked ? '#ffc681' : '#9fddc0');
    if (page === 'settings') {
        cv.text('Wanneer mag video afspelen?', 40, 195, 30, '#ffffff');
        button('parked', 'Tijdens parkeren (P)', 40, 230, 570, 70, state.mode === 'parked');
        button('charging', 'Alleen tijdens laden, in P', 40, 316, 570, 70, state.mode === 'charging');
        cv.text('Bij beweging of ontbrekende voertuigstatus stopt de video.', 40, 440, 23, '#a7b5c9');
        cv.text('Opnieuw afspelen vraagt altijd een nieuwe druk op de knop.', 40, 480, 23, '#a7b5c9');
    } else if (state.phase === 'playing') {
        cv.text((state.title || '').slice(0, 80), 32, 169, 22, '#ffffff');
        // Native app adds videoOp in this rectangle, underneath the controls.
    } else if (model.keyboard) {
        cv.text((model.query || 'Zoekterm of video-ID').slice(-65), 32, 180, 26, '#ffffff');
        const rows = [model.upper ? 'QWERTYUIOP' : 'qwertyuiop', model.upper ? 'ASDFGHJKL' : 'asdfghjkl', model.upper ? 'ZXCVBNM' : 'zxcvbnm', '1234567890'];
        rows.forEach((row, r) => row.split('').forEach((ch, col) => button('key:' + ch, ch, 32 + col * 91, 202 + r * 64, 81, 54)));
        button('space', 'Spatie', 32, 470, 260, 58);
        button('upper', 'Aa', 304, 470, 110, 58);
        button('key:-', '-', 426, 470, 80, 58);
        button('key:_', '_', 518, 470, 80, 58);
        button('erase', 'Wissen', 610, 470, 180, 58);
        button('search', 'Zoeken', 964, 202, 284, 72);
        button('direct', 'Video-ID openen', 964, 286, 284, 72);
        button('cancel', 'Terug', 964, 370, 284, 72);
    } else {
        button('input', model.query ? model.query.slice(0, 60) : 'Tik om te zoeken of een video-ID in te voeren', 32, 152, 1216, 60);
        if (state.phase === 'searching' || state.phase === 'loading') cv.text(state.phase === 'searching' ? 'Zoeken op YouTube...' : 'Video laden...', 40, 260, 28, '#a7b5c9');
        else if (state.results && state.results.length) state.results.forEach((v, i) => button('play:' + v.id, v.title.slice(0, 83), 32, 227 + i * 51, 1216, 44));
        else {
            cv.text('Even ontspannen tijdens een laadstop.', 40, 295, 34, '#ffffff');
            cv.text('Zoek een video en tik op het resultaat om af te spelen.', 40, 345, 24, '#a7b5c9');
            cv.text('Eerste installatie: audio en voertuigsignalen testen op de auto.', 40, 405, 21, '#a7b5c9');
        }
    }
    return targets;
}
function action(model, id, send) {
    if (id === 'home' || id === 'settings') { model.page = id; model.keyboard = false; if (id === 'settings') send({ op: 'stop' }); }
    else if (id === 'input') { model.keyboard = true; send({ op: 'stop' }); }
    else if (id === 'cancel') model.keyboard = false;
    else if (id === 'upper') model.upper = !model.upper;
    else if (id === 'erase') model.query = (model.query || '').slice(0, -1);
    else if (id === 'space' || id.indexOf('key:') === 0) model.query = ((model.query || '') + (id === 'space' ? ' ' : id.slice(4))).slice(0, 160);
    else if (id === 'search' || id === 'direct') { model.keyboard = false; send(id === 'search' ? { op: 'search', term: model.query || '' } : { op: 'play', id: model.query || '' }); }
    else if (id === 'parked' || id === 'charging') send({ op: 'mode', mode: id });
    else if (id === 'stop') send({ op: 'stop' });
    else if (id.indexOf('play:') === 0) send({ op: 'play', id: id.slice(5) });
}
function hit(targets, x, y) { return targets.find(t => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h); }
module.exports = { draw, action, hit, W, H };
