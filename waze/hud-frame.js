'use strict';
// Conservative pixel-layout gate for the observed 1920x960 Waze card.
// This is NOT app identification or OCR; unknown layouts must remain hidden.
const WIDTH=1920, HEIGHT=960;
function region(raw,x,y,w,h) {
  let dark=0,white=0,total=0;
  for(let j=y;j<y+h;j+=2) for(let i=x;i<x+w;i+=2) {
    const p=(j*WIDTH+i)*4, v=(raw[p]+raw[p+1]+raw[p+2])/3;
    dark+=v<55; white+=v>160; total++;
  }
  return {dark:dark/total,white:white/total};
}
function inspect(raw) {
  if(!Buffer.isBuffer(raw)||raw.length!==WIDTH*HEIGHT*4) return {valid:false,reason:'capture-size'};
  for(const offset of [0,132]) {
    if(checkCard(raw,offset)) return {valid:true,reason:'observed-card-layout',offset};
  }
  return {valid:false,reason:'card-not-found'};
}
function checkCard(raw,offset) {
  const borders=[[240,105,480,20],[300,215,400,20],[240,300,480,12],[760,140,30,140]];
  if(borders.some(r=>region(raw,r[0],r[1]+offset,r[2],r[3]).dark<0.97)) return false;
  for(const r of [[210,135,80,85],[320,150,250,55],[205,245,400,45]]) {
    const s=region(raw,r[0],r[1]+offset,r[2],r[3]);
    if(s.white<0.035||s.white>0.45||s.dark<0.5) return false;
  }
  return true;
}
function render(raw) {
  const verdict=inspect(raw);
  if(!verdict.valid) return {verdict,pixels:null};
  const pixels=Buffer.alloc(220*90*4);
  for(let y=0;y<90;y++) for(let x=0;x<220;x++) {
    let v=0;
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++) {
      const p=((125+verdict.offset+y*2+dy)*WIDTH+195+x*2+dx)*4;
      v+=(raw[p]+raw[p+1]+raw[p+2])/12;
    }
    const p=(y*220+x)*4;
    pixels[p]=pixels[p+1]=pixels[p+2]=240;
    pixels[p+3]=Math.round(Math.max(0,Math.min(255,(v-40)*255/215)));
  }
  return {verdict,pixels};
}
module.exports={inspect,render};
