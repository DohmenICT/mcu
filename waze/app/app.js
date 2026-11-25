'use strict';
const net=require('net');
const fs=require('fs');
function debug(s){try{fs.appendFileSync('/dev/shm/u11-hud-ui-'+process.getuid()+'.log',new Date().toISOString()+' '+s+'\n');}catch(e){}}
const OnlineApp=require('oap-sdk/src/core/OnlineApp.js');
const logging=require('oap-sdk/src/logging/logging');
const log=logging.getSDKLogger();
class HudApp extends OnlineApp {
  constructor(){
    super();this.sock=null;this.timer=null;this.closed=false;this.lastPress=0;this.state=null;
    debug('constructed');
    this.on('initialized',()=>{debug('initialized event');this.setup().catch(e=>{debug(e.stack||e.message);log.error('Waze HUD: '+e.message);});});
    this.on('entryPointExecute',id=>{if(this.rhmiApplication){this.registerActive();this.rhmiApplication.openEntryState(id).catch(e=>log.warn(e.message));}});
    this.on('shutdown',()=>{this.closed=true;clearInterval(this.timer);if(this.sock)this.sock.destroy();Promise.resolve(this.destroyBundles()).then(()=>process.exit(0),()=>process.exit(0));});
    this.on('error',e=>{debug('error '+e.message);log.warn('Waze HUD: '+e.message);});
  }
  setup(){
    debug('setup rhmi='+Boolean(this.rhmiApplication));
    if(!this.rhmiApplication)return this.initialized();
    const r=this.rhmiApplication;
    this.page=r.getByName('ST_U11_Waze_Hud');this.label=r.getByName('hudStatus');
    const buttons={21:true,22:false};
    const press=id=>{if(!(id in buttons)||Date.now()-this.lastPress<400)return;this.lastPress=Date.now();this.request({op:'set',enabled:buttons[id]});};
    r.getByName('hudEnable').on('action',()=>press(21));
    r.getByName('hudDisable').on('action',()=>press(22));
    r.on('userEvent',ev=>{if(ev&&ev.eventType==='ACTION')press(Number(ev.sourceId));});
    r.on('restoreHmi',()=>this.render());
    debug('components bound');
    return this.page.updateResources().then(()=>{
      debug('resources updated');
      const descriptions=this.appDescription.application.entryPoints;
      const ep=this.getEntryPoints().find(e=>descriptions.some(d=>d.uuid===e.getDescription().uuid));
      if(!ep)throw new Error('Entry point unavailable');
      return ep.init().then(()=>{debug('entry initialized');return r.mapEntryState(ep.getDescription().uuid,this.page);}).then(()=>ep.setAvailability('ENABLED'));
    }).then(()=>{this.registerActive();return this.initialized();}).then(()=>{
      debug('app initialized');this.connect();this.timer=setInterval(()=>{if(!this.sock)this.connect();else this.request({op:'get'});},2000);
      const id=this.getLastExecutedEntryPointUuid&&this.getLastExecutedEntryPointUuid();
      if(id)return r.openEntryState(id);
    });
  }
  connect(){
    if(this.sock||this.closed)return;
    const s=net.connect('/run/u11-waze-hud/ctl.sock');this.sock=s;let buf='';
    s.on('connect',()=>this.request({op:'get'}));
    s.on('error',()=>{});
    s.on('close',()=>{if(this.sock===s)this.sock=null;this.state=null;this.render();});
    s.on('data',d=>{buf+=d;if(buf.length>8192){s.destroy();return;}let n;while((n=buf.indexOf('\n'))>=0){const line=buf.slice(0,n);buf=buf.slice(n+1);try{const state=JSON.parse(line);if(typeof state.enabled==='boolean'){this.state=state;this.render();}}catch(e){}}});
  }
  request(q){if(this.sock&&!this.sock.destroyed)this.sock.write(JSON.stringify(q)+'\n');}
  render(){
    if(!this.label)return;
    const states={'showing':'Aanwijzing zichtbaar','waiting-for-waze':'Automatisch - wacht op Waze','starting':'Starten...',
      'disabled':'Uitgeschakeld','capture-unavailable':'Scherm tijdelijk niet beschikbaar','capture-stale':'Wachten op nieuw schermbeeld',
      'renderer-unavailable':'HUD tijdelijk niet beschikbaar','renderer-refused':'HUD niet beschikbaar','unsupported':'Niet ondersteund'};
    const text=this.state?(states[this.state.phase]||'Wachten...'):'Nog niet verbonden - herstart iDrive na installatie';
    this.label.setValue(0,'Text',text,'Text').catch(e=>log.warn(e.message));
  }
}
new HudApp().start().catch(e=>{debug('start failed '+(e.stack||e.message));log.error('Waze HUD start: '+e.message);});
