'use strict';
process.chdir(__dirname);
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {tgz,MTIME}=require('../youtube/vendor/oap_pack');
const linker=require('../youtube/vendor/oap_link');
const OUT=path.join(__dirname,'dist'), SRC=path.join(OUT,'app-source'), TREE=path.join(SRC,'package');
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
function json(file,data){write(file,JSON.stringify(data,null,2)+'\n');}
const ID='u11_waze_hud',VER='0.1.2',TOOL_VER='0.1.0';
const common={Visible:{value:1,type:'UInt'}};
function text(value){return {value,type:'Text'};}
const components={
  10:{type:'title',name:'hudTitle',properties:common,rows:[{Text:text('Waze HUD (test)')}]},
  20:{type:'label',name:'hudStatus',properties:Object.assign({},common,{Focusable:{value:0,type:'UInt'}}),rows:[{Text:text('Verbinden...')}]},
  23:{type:'label',name:'hudInfo',properties:Object.assign({},common,{Focusable:{value:0,type:'UInt'}}),rows:[{Text:text('Automatisch bij zichtbare Waze-aanwijzingen. Experimenteel.')}]}
};
for(const [id,name,label] of [[21,'hudEnable','Inschakelen'],[22,'hudDisable','Uitschakelen']]){
  components[id]={type:'button',name,properties:Object.assign({},common,{Focusable:{value:3,type:'UInt'}}),rows:[{
    PrimaryText:text(label),FrequencyText:text(''),FrequencyVisible:{value:false,type:'Bool'},IconVisible:{value:false,type:'Bool'},
    ProgressVisible:{value:false,type:'Bool'},IsPlaying:{value:false,type:'Bool'}}]};
}
json(path.join(SRC,'mgu-app.json'),{schema:1,id:ID,version:VER,tree:'package',mguHmi:['ID8'],modules:['src/app.js'],sdk:['oap-sdk/src/core/OnlineApp.js','oap-sdk/src/logging/logging']});
write(path.join(SRC,'src/app.js'),fs.readFileSync('app/app.js'));
json(path.join(TREE,'package.json'),{name:ID,version:VER,description:'Experimentele Waze-aanwijzingen op de HUD van de geteste U11',
  main:'javascript/runner.js',author:'owner',license:'GPL-3.0-or-later',mguLocalOnly:true,mguHmi:['ID8'],
  requires:{'u11-waze-hud':'0.1.0'},engines:{node:'>=8.7.0'},dependencies:{'oap-sdk':'24.10.2'},
  oapAppSettings:{maxDiskUsage:5242880,cpuLimit:15,memoryThresholdKB:65536,priority:'PRIO_MEDIUM',visibility:'FOREGROUND',latencyClass:'FOREGROUND',loggingId:'UHUD',userLoginRequired:false,backgroundPriority:150,someipManifest:'manifest.json'},
  files:['config','rhmiData','package.json','permissions.json','manifest.json','javascript','LICENSE']});
json(path.join(TREE,'config/base.json'),{});
const store='../youtube/vendor/';
const manifest=JSON.parse(fs.readFileSync(store+'base-manifest.json'));
delete manifest.proxies['de.bmw.infotainment.controlelements.FrontCCU'];
delete manifest.proxies['de.bmw.infotainment.KombiIF'];
json(path.join(TREE,'manifest.json'),manifest);
write(path.join(TREE,'permissions.json'),fs.readFileSync(store+'base-permissions.json'));
write(path.join(TREE,'LICENSE'),fs.readFileSync('../LICENSE'));
json(path.join(TREE,'rhmiData/application.json'),{schemaVersion:'1.3.0',application:{
  uuid:'870a65c0-6f85-4da4-9e27-a455277bf184',type:'OnlineApp',name:ID,vendor:'owner',version:VER,defaultLanguage:'en_GB',
  uiDescriptions:[{applicationFilePath:'./uiDescriptions/ID8/application.xml',uiDescriptionFilePath:'./uiDescriptions/ID8/uiDescription.json',hmi:['ID8']}],
  stringBundleUuid:'d0328b5a-271e-4e8a-b690-c72094db844c',resourceBundleUuid:'facfd33e-8eaa-4778-9fea-69f0f14cbf90',
  variantGroups:[{stringsPath:'./variantGroups/Common/texts',resourcesPath:'./variantGroups/Common/images',hmi:['ID8'],brands:['BMW']}],
  entryPoints:[{name:ID,uuid:'e1beee09-a616-48b5-a127-10506300de58',textId:'SID_TITLE',icon:'hud.png',insertionStateId:20974,insertionFocusId:2,
    insertionMode:'INSERT_BELOW',insertionOrder:0,insertionPriority:0,previewType:'NONE',bookmarkable:true,private:null,appearance:'DEFAULT',isGroupHeader:false,insertionGroup:0}]
}});
for(const language of ['en_GB','nl_NL'])json(path.join(TREE,'rhmiData/variantGroups/Common/texts',language+'.json'),{SID_TITLE:'Waze HUD (test)'});
write(path.join(TREE,'rhmiData/variantGroups/Common/images/hud.png'),fs.readFileSync('app/icon.png'));
json(path.join(TREE,'rhmiData/uiDescriptions/ID8/uiDescription.json'),{schemaVersion:'1.3.0',containers:{1:{type:'state',name:'ST_U11_Waze_Hud',components}}});
const element=(id,type,widget,focus)=>`<component id="${id}" type="${type}"${widget?' widget="'+widget+'"':''}><property id="2" value="1"/>${type==='title'?'':'<property id="3" value="'+focus+'"/>'}</component>`;
write(path.join(TREE,'rhmiData/uiDescriptions/ID8/application.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<application><container id="1" type="state" widget="LT_State_Wide_List">
<layoutGroup id="102" name="Titlebar">${element(10,'title','',0)}</layoutGroup>
<layoutGroup id="103" name="List"><property id="3" value="1"/>
${element(20,'label','LT_ScrollLabel',0)}${element(21,'button','LT_Button_MediaEntry_1Row',3)}${element(22,'button','LT_Button_MediaEntry_1Row',3)}${element(23,'label','LT_ScrollLabel',0)}
</layoutGroup></container></application>`);
// SDK and runner are linked from a BMW donor on the head unit by mgu-deploy.
linker.packSource(SRC,path.join(OUT,ID+'@'+VER+'.tgz'));
const files=[['hud-service.js','service/hud-service.js'],['hud-frame.js','hud-frame.js'],['LICENSE','../LICENSE']];
const entries=[],meta=[];
for(const [name,source]of files){const data=fs.readFileSync(source);entries.push({name:'files/'+name,data,mode:0o644});meta.push({path:name,mode:'0644',sha256:crypto.createHash('sha256').update(data).digest('hex')});}
entries.push({name:'units/u11-waze-hud.service',data:fs.readFileSync('service/u11-waze-hud.service'),mode:0o644});
const component={id:'u11-waze-hud',kind:'tool',version:TOOL_VER,title:'Waze HUD U11 helper',description:'Automatische Waze-schermuitsnede voor de geteste U11',
  license:'GPL-3.0-or-later',mguHmi:['ID8'],requires:{'cluster-render':'0.6.9','mgu-deploy':'0.8.22'},uninstallable:true,
  files:meta,units:[{name:'u11-waze-hud.service'}],enable:[{unit:'u11-waze-hud.service',target:'multi-user.target'}],restart:['u11-waze-hud.service']};
entries.push({name:'component.json',data:Buffer.from(JSON.stringify(component,null,2)),mode:0o644});
write(path.join(OUT,'u11-waze-hud@'+TOOL_VER+'.tgz'),tgz(entries,MTIME));
console.log('Built app '+VER+' and helper '+TOOL_VER);
