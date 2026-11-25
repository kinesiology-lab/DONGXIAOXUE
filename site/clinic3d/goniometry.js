import {drawPosture,drawPassiveHands} from './goniometry-figures.js';

// Neutral-zero convention. Angles are authored values for this simulated patient.
export const ROM = [
  {key:'up',name:'背伸',sagittal:true,sign:-1,L:[18,22],R:[10,14]},
  {key:'down',name:'跖屈',sagittal:true,sign:1,L:[45,50],R:[40,45]},
  {key:'in',name:'内翻',sign:1,L:[18,21],R:[14,18]},
  {key:'out',name:'外翻',sign:-1,L:[8,10],R:[4,7]}
];
export const romTrials=['L','R'].flatMap(side=>ROM.flatMap(move=>['主动','被动'].map((mode,i)=>({
  side,move,mode,key:side+'_'+(move.sagittal?'':'rear_')+move.key+'_'+i,angle:move[side][i]
}))));
export const sideLabel=s=>s==='L'?'左':'右';
const element=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const rad=degrees=>degrees*Math.PI/180;
export function validReading(receipt,t){return receipt?.scope==='simulated-goniometry' && receipt.readings?.[t.key]===t.angle;}
export function romComplete(receipt){return romTrials.every(t=>validReading(receipt,t));}

export function romRows(receipt){
  return ROM.map(move=>{
    const cells=romTrials.filter(t=>t.move===move);
    return {move,cells,values:cells.map(t=>validReading(receipt,t)?t.angle+'°':'—')};
  });
}
// Earlier sessions used the anterior sitting protocol. Retain those values under their original method.
export function previousROM(receipt){
  const rows=[];
  for(const move of ROM.filter(m=>!m.sagittal)){
    const values=['L','R'].flatMap(side=>[0,1].map(i=>receipt?.readings?.[side+'_'+move.key+'_'+i]));
    if(values.some(Number.isFinite))rows.push({name:move.name,values:values.map(value=>Number.isFinite(value)?value+'°':'—')});
  }
  return rows;
}
export function romTable(receipt){
  const table=element('table'),header=table.createTHead().insertRow();
  table.setAttribute('aria-label','病例模拟量角结果，单位度');
  for(const label of ['动作','左主动','左被动','右主动','右被动'])header.append(element('th',label));
  const body=table.createTBody();
  for(const {move,values} of romRows(receipt)){
    const row=body.insertRow();row.append(element('th',(move.sagittal?'':'后足')+move.name));for(const v of values)row.append(element('td',v));
  }
  for(const row of previousROM(receipt)){
    const tr=body.insertRow();tr.append(element('th','旧记录 · 坐位前方'+row.name));
    for(const value of row.values)tr.append(element('td',value));
  }
  return table;
}
export const romReport=[
  ...ROM.map((m,i)=>{
    const intro=['先说勾脚','往下绷脚','脚跟往里翻','脚跟往外翻'][i];
    if(i===0)return '先说勾脚。您自己勾，左脚 '+m.L[0]+'°、右脚 '+m.R[0]+'°。我帮您活动时，左脚 '+m.L[1]+'°、右脚 '+m.R[1]+'°。';
    return intro+'，您自己动是左脚 '+m.L[0]+'°、右脚 '+m.R[0]+'°。我帮您动是左脚 '+m.L[1]+'°、右脚 '+m.R[1]+'°。';
  }),
  '两边一比，您的右脚往上勾、往外翻，幅度都比左脚小。我帮您时还能再动一点。我们再看站着时，这个差别对您有没有影响。'
];

// Skin and bone layers share the BodyParts3D anatomy, orthographic camera, pivot and pixels per metre.
const views=new Map();
function loadFoot(view){
  if(!views.has(view)){
    const image=new Image();
    image.src=new URL('./assets/gonio-'+view+'.webp?v=79.2',import.meta.url).href;
    const ready=image.decode().catch(()=>{});
    views.set(view,{image,ready});
  }
  return views.get(view);
}
// Projected left-side BodyParts3D meshes share the skin atlas landmark. Mirror both for the right ankle.
const bones=new Image();
bones.src=new URL('./assets/gonio-bones.png?v=79.2',import.meta.url).href;
const cutaway=document.createElement('canvas');cutaway.width=328;cutaway.height=329;
function drawBones(g,skin,tile,lateral,angle){
  if(!bones.complete||!bones.naturalWidth)return;
  const c=cutaway.getContext('2d');
  c.clearRect(0,0,328,329);
  // The shank stays fixed. In the posterior view the calcaneus tilts beneath the talus.
  for(const col of [2,1,0]){
    c.save();c.translate(188,162);
    if(col===2||(col===1&&lateral))c.rotate(rad(lateral?angle:-angle));
    c.drawImage(bones,col*328,lateral?0:329,328,329,-188,-162,328,329);c.restore();
  }
  c.save();c.globalCompositeOperation='destination-in';
  c.drawImage(skin,(tile%8)*328,Math.floor(tile/8)*329,328,329,0,0,328,329);c.restore();
  g.save();g.globalAlpha=.88;g.drawImage(cutaway,-188,-162);g.restore();
}
function figure(canvas,trial,stage,angle,placement,showBones){
  const g=canvas.getContext('2d'),{move,side,mode}=trial,W=660,H=370;
  const ratio=Math.min(2,devicePixelRatio||1);
  if(canvas.width!==W*ratio||canvas.height!==H*ratio){canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);}
  g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  const bg='#eff5f2',ink='#234b43',green='#206e63',orange='#b45e22';
  const text=(s,x,y,size=14,color=ink,bold=false)=>{g.fillStyle=color;g.font=(bold?'650 ':'400 ')+size+'px "Microsoft YaHei",sans-serif';g.fillText(s,x,y);};
  function line(x,y,xx,yy,color,width,dash=[]){
    g.beginPath();g.setLineDash(dash);g.moveTo(x,y);g.lineTo(xx,yy);g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.stroke();g.setLineDash([]);
  }
  function disc(x,y,r,fill,stroke){
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=1.3;g.stroke();
  }
  const lateral=!!move.sagittal,mirror=side==='L'?1:-1;
  const zoom=lateral?1.24:1.18;
  const X=lateral?(side==='L'?412:298):355,Y=lateral?(move.key==='down'?124:184):165;
  const physicalAngle=(move.key==='down'||move.key==='out'?-1:1)*angle;
  const theta=rad(physicalAngle*mirror*(lateral?1:-1));
  const view=lateral?'lateral':'rear',image=views.get(view)?.image;
  g.fillStyle=bg;g.fillRect(0,0,W,H);
  if(image?.complete&&image.naturalWidth){
    const tile=Math.round(physicalAngle)+(lateral?50:10);
    g.save();g.translate(X,Y);g.scale(mirror*zoom,zoom);
    g.drawImage(image,(tile%8)*328,Math.floor(tile/8)*329,328,329,-188,-162,328,329);
    if(showBones)drawBones(g,image,tile,lateral,physicalAngle);
    if(mode==='被动'&&['aligned','instruction','moving','read'].includes(stage)){
      drawPassiveHands(g,{image,tile,angle:physicalAngle,lateral,up:move.key==='up'});
    }
    g.restore();
    const fade=g.createLinearGradient(0,0,0,36);fade.addColorStop(0,bg);fade.addColorStop(.38,bg);fade.addColorStop(1,'rgba(239,245,242,0)');g.fillStyle=fade;g.fillRect(0,0,W,36);
  }else{text(image?.complete?'足踝模型未载入，请重新打开此环节。':'正在载入足踝模型…',X-90,Y+55);}
  const rear=!lateral, placing=['axis','fixed','mobile'].includes(stage);
  const easing=x=>x*x*(3-2*x);
  const p=easing(placement);
  const faceSide=lateral?-mirror:(move.key==='in'?mirror:-mirror);
  const neutral=lateral?(side==='L'?Math.PI-rad(9.33):rad(9.33)):Math.PI/2-mirror*rad(4);
  const fixedAngle=-Math.PI/2+(lateral?rad(2):-rad(6))*mirror;
  const movingAngle=neutral+theta;
  const length=lateral?139:93;
  const topLength=Math.min(116,(Y-23)/zoom);
  const point=(a,r)=>[Math.cos(a)*r,Math.sin(a)*r];
  text(sideLabel(side)+(rear?'足 · 后方观':'踝 · 外侧观'),19,30,18,ink,true);
  text(rear?'俯卧 · 足伸出床沿':'坐位 · 屈膝 90°',19,55,14);
  drawPosture(g,trial,angle);
  g.save();g.translate(X,Y);g.scale(zoom,zoom);
  if(stage!=='position'){
    // Draw the patient's reference lines first so the approaching tool can be seen aligning with them.
    line(0,0,...point(fixedAngle,topLength),'#528276',1.5,[3,4]);
    line(0,0,...point(movingAngle,length),'#967547',1.5,[3,4]);
    if(stage==='moving'||stage==='read')line(0,0,...point(neutral,length),'#709387',1.5,[4,5]);
    const entry=stage==='axis'?1-p:0;
    const fixedTurn=stage==='axis'?1:stage==='fixed'?1-p:0;
    g.save();g.translate(98*entry,-35*entry);g.rotate(faceSide*rad(34)*fixedTurn);
    const start=fixedAngle,end=start+Math.PI*faceSide,radius=35;
    // Transparent semicircular scale and two rigid, hinged ruler arms.
    g.beginPath();g.arc(0,0,radius,start,end,faceSide<0);g.closePath();
    g.fillStyle='rgba(255,252,233,.72)';g.fill();g.strokeStyle='#8d8069';g.lineWidth=1.3;g.stroke();
    for(let n=0;n<=180;n+=5){
      const a=start+faceSide*rad(n),mark=n%30===0?8:n%10===0?5:3;
      line(...point(a,radius-mark),...point(a,radius),'#68624e',.85);
      if(n===0||n===180){const [lx,ly]=point(a+faceSide*(n===0?0.15:-0.15),radius-6);g.textAlign='center';text(String(n),lx,ly+2,5.3,'#514e40');g.textAlign='left';}
      if(n%45===0&&n!==0&&n!==180){const [tx,ty]=point(a,radius-12);g.textAlign='center';text(String(n),tx,ty+2.8,6.4,'#514e40');g.textAlign='left';}
    }
    function ruler(a,len,color){
      g.save();g.rotate(a);
      g.beginPath();g.roundRect(-5,-6.3,len+7,12.6,3);
      g.fillStyle='rgba(249,248,235,.56)';g.fill();g.strokeStyle='#a39b87';g.lineWidth=1;g.stroke();
      line(0,0,len-1,0,color,2.4);
      for(let k=12;k<len-2;k+=7)line(k,5.8,k,k%2===0?3:4,'#89816e',.65);
      g.restore();
    }
    ruler(start,topLength,green);
    let amount=stage==='axis'||stage==='fixed'?0:stage==='mobile'?p:1;
    const folded=start+faceSide*rad(13);
    let sweep=(neutral-folded)%(2*Math.PI);
    if(faceSide>0&&sweep<0)sweep+=2*Math.PI;
    if(faceSide<0&&sweep>0)sweep-=2*Math.PI;
    ruler(folded+sweep*amount+(placing?0:theta),length,orange);
    disc(0,0,4.8,'#fff9e8','#33594e');disc(0,0,1.6,'#6b6b61','#6b6b61');g.restore();
    if(stage==='axis'||stage==='fixed'||stage==='mobile'){
      const focus=stage==='axis'?[0,0]:stage==='fixed'?point(fixedAngle,topLength*.7):point(neutral,length*.76);
      const toward=mirror*(lateral?1:-1);
      const offset=toward*(lateral?68:87);
      line(focus[0],focus[1],focus[0]+offset,focus[1]-10,'#477668',1);
      disc(...focus,3.1,'#fffdf2','#386c5c');
      g.textAlign=toward>0?'left':'right';
      text(stage==='axis'?(rear?'两踝之间 · 后方':'外踝中心'):stage==='fixed'?(rear?'小腿后侧中线':'腓骨外侧长轴'):(rear?'跟骨后面中线':'第五跖骨长轴'),focus[0]+offset+toward*4,focus[1]-8,12,ink,true);
      g.textAlign='left';
    }
  }
  g.restore();
  line(17,H-40,W-17,H-40,'#cfddd5',1);
  line(21,H-18,40,H-18,green,3);text('固定臂',49,H-13,14);
  line(113,H-18,132,H-18,orange,3);text('移动臂',141,H-13,14);
  g.textAlign='right';text(stage==='read'||stage==='moving'?move.name+'  '+Math.round(angle)+'°':({position:'摆好体位',axis:'放置轴心',fixed:'对齐固定臂',mobile:'对齐移动臂',instruction:'中立位  0°',aligned:'中立位  0°'})[stage],W-19,H-12,19,ink,true);g.textAlign='left';
}

const directionCue={
  up:'踝背伸，足尖向上运动，做勾脚动作。',
  down:'踝跖屈，足尖向下运动。站立时提踵，也会用到踝跖屈。',
  in:'踝关节内翻，足的外侧缘降低，内侧缘抬高。',
  out:'踝关节外翻，足的外侧缘抬高，内侧缘降低。'
};
const placementCues={
  "lateral": [
    "先把半圆量角器的轴心，对准外踝的中心。",
    "固定臂与腓骨外侧长轴平行，朝向腓骨头。",
    "移动臂与第五跖骨平行。勾脚或绷脚时，小腿固定，移动臂跟着足外侧一起转动。"
  ],
  "rear": [
    "请俯卧，脚伸出床沿。从后方看，把轴心放在内外踝之间的中点。",
    "固定臂与小腿后侧中线平行。扶稳小腿，保持脚踝在背伸和跖屈的中立位。",
    "移动臂顺着足跟后方的中线。脚跟向内或向外倾斜时，移动臂跟着跟骨一起转动。"
  ]
};

export function mountGoniometer({host,receipt,initialKey,onTrial,onRead,onSave,voice,isPaused,onDone,skip}){
  const panel=element('section');panel.className='gonio-panel';host.replaceChildren(panel);
  let i=romTrials.findIndex(t=>t.key===initialKey);
  if(i<0)i=Math.max(0,romTrials.findIndex(t=>!validReading(receipt,t)));
  let stage='position',angle=0,placement=0,disposed=false,frame=0;
  const heading=element('h3'),count=element('small'),canvas=element('canvas');
  canvas.setAttribute('role','img');
  const cue=element('p'),readout=element('strong'),controls=element('div'),tableSlot=element('div');
  controls.className='gonio-actions';
  const summary=element('details');summary.append(element('summary','查看双侧记录（°）'),tableSlot);
  function btn(label,fn){const b=element('button',label);b.type='button';b.addEventListener('click',fn);controls.append(b);return b;}
  const label=element('label'),toggle=element('input');toggle.type='checkbox';toggle.checked=true;
  label.append(toggle,' 显示骨骼与关节');toggle.onchange=()=>draw();
  function draw(){const t=romTrials[i];figure(canvas,t,stage,angle,placement,toggle.checked);canvas.setAttribute('aria-label',sideLabel(t.side)+'踝'+t.mode+t.move.name+'，从中立位起 '+Math.round(angle)+' 度');}
  function view(){
    const t=romTrials[i],s=t.move.sagittal;
    if(panel.dataset.trial!==t.key){panel.dataset.trial=t.key;onTrial?.(t.key);}
    panel.dataset.stage=stage;panel.dataset.view=s?'lateral':'rear';
    count.textContent='病例模拟 · 已记录 '+romTrials.filter(t=>validReading(receipt,t)).length+' / 16';
    heading.textContent=sideLabel(t.side)+(s?'踝 · ':'后足 · ')+t.move.name+' · '+t.mode;
    controls.replaceChildren();tableSlot.replaceChildren(romTable(receipt));
    readout.textContent=stage==='read'?'终末读数　'+t.angle+'°':'';
    if(stage==='position'){
      cue.textContent=s?'请患者坐在床边，屈膝 90°，小腿垂下，脚踝摆在中立位。':'请患者俯卧，小腿有支撑，足踝伸出床沿。固定小腿，脚踝保持背伸、跖屈中立，从后方观察足跟。';
      btn('摆好体位，放置量角器',()=>place());
    }else if(['axis','fixed','mobile'].includes(stage)){
      cue.textContent=placementCues[s?'lateral':'rear'][['axis','fixed','mobile'].indexOf(stage)];
    }else if(stage==='aligned'){
      cue.textContent=s?'轴心对准外踝中心。固定臂平行腓骨、指向腓骨头。移动臂平行第五跖骨，随足一起运动。':'轴心对准踝后两踝之间的中点。固定臂平行小腿后侧中线。移动臂平行跟骨后面中线，随足跟倾斜。';
      btn(t.mode==='主动'?'观察患者主动'+t.move.name:'观察治疗师辅助'+t.move.name,run);
      btn('重看量角器放置',()=>place());
    }else if(stage==='instruction'){
      cue.textContent=t.mode==='主动'?'请您自己活动脚踝，到舒服的尽头就停。':'现在放松，我托着您的脚慢慢带一下，疼了就告诉我。';
    }else if(stage==='moving'){
      cue.textContent=directionCue[t.move.key]+(s?'固定臂留在小腿，移动臂跟着第五跖骨转动。':'固定臂留在小腿，移动臂与跟骨后面中线一起倾斜。');
    }else{
      cue.textContent=directionCue[t.move.key]+' 本次从中立位量得'+t.move.name+' '+t.angle+'°。';
      btn(romTrials.every(other=>other===t||validReading(receipt,other))?'记录并听治疗师报告':'记录，测下一项',()=>{
        if(!validReading(receipt,t)){receipt.readings[t.key]=t.angle;onRead(t,receipt);}
        if(romComplete(receipt)){onDone();return;}
        i=romTrials.findIndex(trial=>!validReading(receipt,trial));if(i<0)i=0;
        stage='aligned';if(t.side!==romTrials[i].side||!!t.move.sagittal!==!!romTrials[i].move.sagittal||(!t.move.sagittal&&t.move!==romTrials[i].move))stage='position';
        angle=0;view();
      });
      btn('重听动作讲解',()=>voice(directionCue[t.move.key]));
      btn('重看这次测量',()=>{stage='aligned';angle=0;view();});
    }
    if(t.mode==='被动'&&['aligned','moving','read'].includes(stage)){
      const guide={up:'托住前脚掌的足底，慢慢向小腿方向带动。',down:'扶住前足的足背，慢慢向足底方向带动。',in:'托住足跟，慢慢带动跟骨向内倾斜。',out:'托住足跟，慢慢带动跟骨向外倾斜。'};
      cue.textContent+=' 治疗师一手固定小腿远端，另一手'+guide[t.move.key];
    }
    draw();
  }
  function animate(duration,update,complete,ready=()=>true){
    let last=performance.now(),elapsed=0;
    function tick(time){
      if(disposed||!panel.isConnected)return;
      if(!isPaused()&&!document.hidden)elapsed+=Math.min(100,time-last);
      last=time;const progress=Math.min(1,elapsed/duration);
      update(progress);draw();
      if(progress===1&&ready()&&!isPaused()&&!document.hidden)complete();
      else frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  function place(index=0){
    const parts=['axis','fixed','mobile'];
    stage=parts[index];placement=0;view();
    let spoken=false;
    Promise.resolve(voice(cue.textContent)).catch(()=>{}).finally(()=>{spoken=true;});
    animate(1250,p=>{placement=p;},()=>{
      if(index<parts.length-1)place(index+1);
      else{stage='aligned';placement=1;view();}
    },()=>spoken);
  }
  async function run(){
    if(stage!=='aligned')return;
    const t=romTrials[i];stage='instruction';angle=0;view();
    await Promise.resolve(voice(cue.textContent)).catch(()=>{});
    if(disposed||!panel.isConnected)return;
    stage='moving';view();
    let spoken=false;
    Promise.resolve(voice(directionCue[t.move.key])).catch(()=>{}).finally(()=>{spoken=true;});
    animate(2100,p=>{angle=t.angle*p*p*(3-2*p);},()=>{stage='read';view();},()=>spoken);
  }
  const method=element('details');method.append(element('summary','测量方法与依据'),element('p','内翻和外翻采用俯卧后方测量，观察跟骨相对小腿的倾斜。坐位从前方对线时，还会包含前足的复合运动。两种方法的角度应分别记录。'));
  const reference=element('a','查看两种测量体位的原始研究');reference.href='https://doi.org/10.1186/1471-2474-7-60';reference.target='_blank';reference.rel='noopener';method.append(reference);
  const handSource=element('a','被动检查手法参考');
  handSource.href='https://pmc.ncbi.nlm.nih.gov/articles/PMC5241541/';handSource.target='_blank';handSource.rel='noopener';
  method.append(' · ',handSource);
  panel.append(count,heading,canvas,label,cue,readout,controls,summary,method);
  if(!initialKey&&romComplete(receipt)){stage='read';i=15;angle=romTrials[15].angle;}
  view();
  bones.decode().then(()=>{if(!disposed)draw();}).catch(()=>{});
  for(const viewName of ['lateral','rear'])loadFoot(viewName).ready.then(()=>{if(!disposed)draw();});
  return ()=>{disposed=true;cancelAnimationFrame(frame);};
}
