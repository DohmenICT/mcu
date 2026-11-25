'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { tgz, MTIME } = require('./vendor/oap_pack');
const linker = require('./vendor/oap_link');
const ROOT = __dirname, OUT = path.join(ROOT, 'dist'), SRC = path.join(OUT, 'source'), TREE = path.join(SRC, 'package');
const ID = 'u11_youtube', VERSION = '0.1.4';
function write(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); }
function json(file, data) { write(file, JSON.stringify(data, null, 2) + '\n'); }
function source(name) { return fs.readFileSync(path.join(ROOT, name)); }
let config = JSON.parse(source('config.example.json'));
if (fs.existsSync(path.join(ROOT, 'config.local.json'))) config = JSON.parse(source('config.local.json'));
const charging = config.chargingSignal;
if (charging && (!/^de\.bmw\.[A-Za-z0-9_.]+$/.test(charging.interface) || !/^[A-Za-z][A-Za-z0-9]*$/.test(charging.field) || !/^[A-Za-z][A-Za-z0-9.]*$/.test(charging.member))) throw new Error('Invalid charging signal configuration');
const modules = ['app.js', 'signals.js', 'policy.js', 'view.js'];
modules.forEach(name => write(path.join(SRC, 'src', name), source('src/' + name)));
const vendorModules = ['kit_record.js', 'kit_canvas.js', 'kit_fonts.js', 'font_regular.js', 'font_semibold.js', 'i18n.js', 'mgu_render_client.js'];
vendorModules.forEach(name => write(path.join(SRC, 'src', name), source('vendor/' + name)));
write(path.join(SRC, 'src/charging-config.js'), "'use strict';\nmodule.exports = " + JSON.stringify(charging) + ';\n');
json(path.join(SRC, 'mgu-app.json'), { schema: 1, id: ID, version: VERSION, tree: 'package', mguHmi: ['ID8'], internet: true,
    modules: modules.concat(vendorModules, ['charging-config.js']).map(n => 'src/' + n),
    sdk: ['oap-sdk/src/core/OnlineApp.js', 'oap-sdk/src/logging/logging', 'oap-sdk/src/someip/someipBuilders'] });
json(path.join(TREE, 'package.json'), {
    name: ID, version: VERSION, main: 'javascript/runner.js', description: 'Experimentele YouTube-speler voor parkeren en laden op OS8',
    license: 'GPL-3.0-or-later', author: 'owner', mguLocalOnly: true, mguInternet: true, mguHmi: ['ID8'],
    requires: { 'u11-youtube': VERSION, 'mgu-render': '0.6.23' }, engines: { node: '>=8.10.0' }, dependencies: { 'oap-sdk': '24.10.2' },
    oapAppSettings: { maxDiskUsage: 20971520, cpuLimit: 35, memoryThresholdKB: 196608, priority: 'PRIO_MEDIUM', visibility: 'FOREGROUND', latencyClass: 'FOREGROUND', loggingId: 'UYTB', userLoginRequired: false, backgroundPriority: 150, someipManifest: 'manifest.json' },
    files: ['config', 'rhmiData', 'package.json', 'permissions.json', 'manifest.json', 'javascript', 'LICENSE', 'notices']
});
json(path.join(TREE, 'config/base.json'), {});
const manifest = JSON.parse(source('vendor/base-manifest.json'));
delete manifest.proxies['de.bmw.infotainment.controlelements.FrontCCU']; delete manifest.proxies['de.bmw.infotainment.KombiIF'];
manifest.proxies['de.bmw.infotainment.vehicle.Vehicle2'] = { instances: '1', attributes: { statusCarSpeed2: 'rs' } };
manifest.proxies['de.bmw.infrastructure.VehicleInformation'] = { instances: '1', attributes: { statusGearboxDrive: 's', DataPowerTrain2: 's' } };
if (charging) {
    const p = manifest.proxies[charging.interface] || { instances: '1', attributes: {} };
    if (typeof p !== 'object') throw new Error('Charging interface conflicts with base manifest');
    p.attributes = p.attributes || {}; p.attributes[charging.field] = 'rs'; manifest.proxies[charging.interface] = p;
}
json(path.join(TREE, 'manifest.json'), manifest);
write(path.join(TREE, 'permissions.json'), source('vendor/base-permissions.json'));
write(path.join(TREE, 'LICENSE'), source('LICENSE'));
['LICENSE-kit.txt', 'LICENSE-Inter.txt'].forEach(n => write(path.join(TREE, 'notices', n), source('vendor/' + n)));
write(path.join(TREE, 'notices/THIRD_PARTY.md'), source('THIRD_PARTY.md'));
json(path.join(TREE, 'rhmiData/application.json'), { schemaVersion: '1.3.0', application: {
    uuid: '92d83bf0-628a-46a1-959f-e9bc788c63ef', type: 'OnlineApp', name: ID, vendor: 'owner', version: VERSION, defaultLanguage: 'en_GB',
    uiDescriptions: [{ applicationFilePath: './uiDescriptions/ID8/application.xml', uiDescriptionFilePath: './uiDescriptions/ID8/uiDescription.json', hmi: ['ID8'] }],
    stringBundleUuid: '1ad8d491-523b-44d5-85e2-6c2bc794cb14', resourceBundleUuid: 'c899869e-046a-4266-a156-3881a99fe43a',
    variantGroups: [{ stringsPath: './variantGroups/Common/texts', resourcesPath: './variantGroups/Common/images', hmi: ['ID8'], brands: ['BMW'] }],
    entryPoints: [{ name: ID, uuid: '490d8c67-3a25-4651-a62e-f6d303c51a30', textId: 'SID_TITLE', icon: 'youtube.png', insertionStateId: 20974, insertionFocusId: 2,
        insertionMode: 'INSERT_BELOW', insertionOrder: 0, insertionPriority: 0, previewType: 'NONE', bookmarkable: true, private: null, appearance: 'DEFAULT', isGroupHeader: false, insertionGroup: 0 }]
} });
for (const language of ['en_GB', 'nl_NL']) json(path.join(TREE, 'rhmiData/variantGroups/Common/texts', language + '.json'), { SID_TITLE: 'YouTube (test)' });
const { Canvas } = require('./vendor/kit_canvas');
const icon = new Canvas(140, 140); icon.clear('#131924'); icon.fillRect(18, 34, 104, 72, '#bd2c39'); icon.text('YT', 38, 85, 42, '#ffffff', { font: 'bold' });
write(path.join(TREE, 'rhmiData/variantGroups/Common/images/youtube.png'), icon.png());
const common = { Visible: { value: 1, type: 'UInt' } };
json(path.join(TREE, 'rhmiData/uiDescriptions/ID8/uiDescription.json'), { schemaVersion: '1.3.0', containers: { 1: { type: 'state', name: 'ST_U11_YouTube', components: {
    10: { type: 'title', name: 'ytTitle', properties: common, rows: [{ Text: { value: 'YouTube (test)', type: 'Text' } }] },
    20: { type: 'label', name: 'ytStatus', properties: Object.assign({}, common, { Focusable: { value: 0, type: 'UInt' } }), rows: [{ Text: { value: 'YouTube starten... Controleer mgu-render als dit scherm blijft staan.', type: 'Text' } }] }
} } } });
write(path.join(TREE, 'rhmiData/uiDescriptions/ID8/application.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<application><container id="1" type="state" widget="LT_State_Wide_List"><layoutGroup id="102" name="Titlebar"><component id="10" type="title"><property id="2" value="1"/></component></layoutGroup><layoutGroup id="103" name="List"><property id="3" value="1"/><component id="20" type="label" widget="LT_ScrollLabel"><property id="2" value="1"/><property id="3" value="0"/></component></layoutGroup></container></application>');
const appArtifact = ID + '@' + VERSION + '.tgz'; linker.packSource(SRC, path.join(OUT, appArtifact));
const entries = [], files = [];
for (const name of ['service.js', 'controller.js', 'policy.js', 'player.js', 'frames.js', 'youtube.js']) {
    const data = source('src/' + name); entries.push({ name: 'files/' + name, data, mode: 0o644 }); files.push({ path: name, mode: '0644', sha256: crypto.createHash('sha256').update(data).digest('hex') });
}
for (const name of ['LICENSE', 'config.example.json']) { const data = source(name); entries.push({ name: 'files/' + name, data, mode: 0o644 }); files.push({ path: name, mode: '0644', sha256: crypto.createHash('sha256').update(data).digest('hex') }); }
entries.push({ name: 'units/u11-youtube.service', data: source('u11-youtube.service'), mode: 0o644 });
entries.push({ name: 'component.json', mode: 0o644, data: Buffer.from(JSON.stringify({ id: 'u11-youtube', kind: 'tool', version: VERSION, title: 'YouTube OS8 player (test)', license: 'GPL-3.0-or-later', mguHmi: ['ID8'], requires: { 'mgu-deploy': '0.8.22' }, uninstallable: true, files,
    units: [{ name: 'u11-youtube.service' }], enable: [{ unit: 'u11-youtube.service', target: 'multi-user.target' }], restart: ['u11-youtube.service'] })) });
const helperArtifact = 'u11-youtube@' + VERSION + '.tgz'; write(path.join(OUT, helperArtifact), tgz(entries, MTIME));
const artifacts = [[ID, 'app', appArtifact], ['u11-youtube', 'tool', helperArtifact]].map(([id, kind, name]) => {
    const data = fs.readFileSync(path.join(OUT, name));
    const item = { id, kind, version: VERSION, title: kind === 'app' ? 'YouTube (test)' : 'YouTube player (test)', mguHmi: ['ID8'], uninstallable: true,
        artifact: { name, url: name, size: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') } };
    if (kind === 'app') { item.build = 'unit'; item.requires = { 'u11-youtube': VERSION, 'mgu-render': '0.6.23' }; }
    else item.requires = { 'mgu-deploy': '0.8.22' };
    return item;
});
json(path.join(OUT, 'catalog.json'), { schema: 2, components: artifacts });
console.log('Built ' + appArtifact + ', ' + helperArtifact + ' and catalog.json. Experimental; car validation and playback dependencies required.');
