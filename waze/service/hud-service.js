'use strict';
const fs=require('fs'),net=require('net'),cp=require('child_process');
const frame=require('./hud-frame');
const {ClusterRender}=require('/var/opt/cluster-render/current/cluster_render_client.js');
const ROOT='/var/opt/u11-waze-hud', RUN='/run/u11-waze-hud';
const STATE=ROOT+'/settings.json', SOCKET=RUN+'/ctl.sock', CAPTURE=RUN+'/capture.rgb';
let enabled=true;
try {const s=JSON.parse(fs.readFileSync(STATE,'utf8')); if(typeof s.enabled==='boolean') enabled=s.enabled;} catch(e) {}
const cr=new ClusterRender('u11_waze_hud');
let ref,child,timer,ending=false,consecutive=0,lastGood=0,phase='starting',lastOffset=null;
const clients=new Set();
function status(){return {enabled,phase,offset:lastOffset,version:'0.1.0'};}
function send(c){if(!c.destroyed)c.write(JSON.stringify(status())+'\n');}
function publish(){clients.forEach(send);}
function phaseTo(s){if(phase!==s){phase=s;console.log(s);publish();}}
function hide(s){consecutive=0;lastGood=0;if(ref!==undefined)cr.set(ref,{visible:false});phaseTo(s);}
function cleanup(){try{fs.unlinkSync(CAPTURE);}catch(e){}}
function setEnabled(value){
  // Persist only a boolean; socket callers cannot supply paths or commands.
  fs.writeFileSync(STATE+'.new',JSON.stringify({enabled:value})+'\n',{mode:0o600});
  fs.renameSync(STATE+'.new',STATE); enabled=value;
  if(!enabled)hide('disabled');
  publish();
}
function capture(){
  if(ending)return;
  if(!enabled||ref===undefined||!cr.ready){
    hide(enabled?'renderer-unavailable':'disabled');timer=setTimeout(capture,1000);return;
  }
  child=cp.execFile('/usr/bin/winston-grabber',['-s','0','-n','1',CAPTURE],
    {env:Object.assign({},process.env,{XDG_RUNTIME_DIR:'/run/wayland'}),timeout:2500,maxBuffer:262144},err=>{
      child=null;
      if(ending){cleanup();return;}
      try{
        if(err)throw err;
        if(!enabled){hide('disabled');}
        else{
          const r=frame.render(fs.readFileSync(CAPTURE));
          if(!r.verdict.valid)hide('waiting-for-waze');
          else{
            lastGood=Date.now();lastOffset=r.verdict.offset;consecutive++;
            if(consecutive>=2){cr.pixels(ref,null,r.pixels);cr.set(ref,{visible:true});phaseTo('showing');}
          }
        }
      }catch(e){hide('capture-unavailable');}
      cleanup();timer=setTimeout(capture,1000);
    });
}
const watchdog=setInterval(()=>{if(lastGood&&Date.now()-lastGood>2000)hide('capture-stale');},250);
const server=net.createServer(c=>{
  if(clients.size>=8){c.destroy();return;}
  clients.add(c);c.setTimeout(30000,()=>c.destroy());let buf='';send(c);
  c.on('error',()=>{});c.on('close',()=>clients.delete(c));
  c.on('data',d=>{
    buf+=d;if(buf.length>2048){c.destroy();return;}
    let n;while((n=buf.indexOf('\n'))>=0){
      const line=buf.slice(0,n);buf=buf.slice(n+1);
      try{
        const q=JSON.parse(line);
        if(q.op==='set'&&typeof q.enabled==='boolean')setEnabled(q.enabled);
        else if(q.op!=='get')throw new Error('Unknown operation');
        send(c);
      }catch(e){c.write(JSON.stringify({error:'Request failed'})+'\n');}
    }
  });
});
function stop(){
  if(ending)return;ending=true;clearTimeout(timer);clearInterval(watchdog);
  if(child)child.kill('SIGKILL');
  if(ref!==undefined)cr.drop(ref);
  clients.forEach(c=>c.destroy());server.close();
  setTimeout(()=>{cr.close();cleanup();try{fs.unlinkSync(SOCKET);}catch(e){}process.exit(0);},300);
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
try{fs.unlinkSync(SOCKET);}catch(e){if(e.code!=='ENOENT')throw e;}
server.listen(SOCKET,()=>fs.chmodSync(SOCKET,0o660));
server.on('error',e=>{console.error(e.message);stop();});
cr.on('refused',(op,id,why)=>hide('renderer-refused'));
cr.on('disconnected',()=>hide('renderer-unavailable'));
cr.on('ready',()=>{
  if(cr.backend!=='id8'){hide('unsupported');return;}
  if(ref===undefined)ref=cr.image({target:'hud',klass:'overlay',x:12,y:65,w:330,h:135,iw:220,ih:90,
    sampling:'bilinear',visible:false,exclusive:false,contend:false});
});
cr.connect();capture();
