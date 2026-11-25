import {replies} from './clinic-dialogue.js?v=69';
import {bothBedsideTests} from './progress-migration.js?v=72';
import {createDialogueAudio} from './dialogue-audio.js';
import {preparationDuration,preparationLabel} from './exam-protection.js';
export const PRACTICE_LINES={
 consent:replies.explain_consent,
 prepare:"您请脱掉鞋袜，上床躺下，放松就好。慢一点，注意安全。",
 drawer:"我固定您的小腿，托住足跟轻轻向前带。这是前抽屉试验，主要看距腓前韧带能不能限制脚踝向前滑动。",
 tilt:"我扶住您的小腿和足跟，让脚底慢慢向内翻。这是内翻加压试验，主要看跟腓韧带能不能限制过度内翻。",
 sorry:"不好意思，弄疼您了，我再慢一点。",
 again:"现在可以继续吗？",
 agree:'可以。',
 fast:'有点疼，请先停一下。',
 finish:'两项床旁查体已完成，结果已记录。'
};
export function createBedsidePractice({ui,camera,seek,onSkip=()=>ui.querySelector('[data-back]')?.click(),onComplete=()=>{},onContinue,checkpoint,saveCheckpoint=()=>{},agreed=false,prepared=false,beginBedPrep,stepBedPrep,onPrepared,record=()=>{},voiceEnabled=()=>true,onSpeaker=()=>{},patientExpression=()=>{}}){
 const bottom=ui.querySelector('.bedside-bottom'),line=ui.querySelector('.bedside-line');
 ui.classList.add('bedside-practice');ui.querySelector('.bedside-controls').hidden=true;
 const actions=document.createElement('div');actions.className='practice-actions';
 const status=document.createElement('p');status.className='practice-feedback';status.setAttribute('role','status');
 const markers=document.createElement('div');markers.className='practice-markers';ui.append(markers);bottom.append(status,actions);
 const audio=createDialogueAudio({enabled:voiceEnabled,onTalking:role=>onSpeaker(stage==='consent'||stage==='retry'&&retryNeedsConsent?role:null),onStatus:message=>{status.textContent=message;}});
 let preparationHeard=false,painReported=Boolean(checkpoint?.painReported),stageRevision=0;
 const explained=new Set(checkpoint?.explained||[]);
 const explanation=createDialogueAudio({enabled:voiceEnabled,onTalking:()=>{},onStatus:()=>{}});
 const spoken=document.createElement('p');spoken.className='practice-feedback';spoken.hidden=true;line.after(spoken);
 let explanationRevision=0;
 function stopExplanation(){explanationRevision++;explanation.cancel();spoken.hidden=true;}
 function explain(){
  if(explained.has(test))return;
  explained.add(test);stopExplanation();
  const version=explanationRevision,text=test===0?PRACTICE_LINES.drawer:PRACTICE_LINES.tilt;
  spoken.textContent='林治疗师：'+text;spoken.hidden=false;
  explanation.speak('林治疗师',text).then(()=>{if(version===explanationRevision)spoken.hidden=true;});
 }
 let active=true,stage='consent',test=0,pose,transfer=0,amount=0,drag=null,grips={fixedWeight:0,heelWeight:0},attempts=0,errors=0,completed=[],demo=null,currentSample=0,lastAspect=camera.aspect;
 const origin=performance.now(),omitted=new Set(checkpoint?.omitted||[]);
 if(checkpoint){
  test=checkpoint.test===1?1:0;completed=[...new Set(checkpoint.completed||[])];
  grips={...grips,...checkpoint.grips};attempts=checkpoint.attempts||0;errors=checkpoint.errors||0;
 }
 const elapsed=()=>Math.round((performance.now()-origin)/1000)+(checkpoint?.elapsedSeconds||0);
 let retryNeedsConsent=!!checkpoint?.retryNeedsConsent;
 let pressElapsed=0;
 let path=null;
 const svgNS='http://www.w3.org/2000/svg';
 const label=()=>test===0?'前抽屉试验':'内翻加压试验';
 const emit=(type,payload={})=>record('clinic3d_bedside_'+type,{test:label(),stage,...payload,teachingSimulation:true,measuredForce:false});
 async function say(role,text){
  stopExplanation();
  patientExpression(role==='patient'&&text===PRACTICE_LINES.fast?'pain':'neutral');
  const start=performance.now(),source=stage;
  while(active&&stage===source){
   const result=await audio.speak(role==='patient'?'陈女士':'林治疗师',text);
   if(!result.failed||!active||stage!==source)break;
   await new Promise(resolve=>{
    const retry=button('重播这句',()=>{retry.remove();resolve();},'replay-voice');
    const observer=new MutationObserver(()=>{if(!retry.isConnected){observer.disconnect();resolve();}});
    observer.observe(ui,{childList:true,subtree:true});
   });
  }
  const remaining=Math.max(1500,Math.min(6000,text.length*65))-(performance.now()-start);if(active&&remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));};
 function button(text,fn,attr){const b=document.createElement('button');b.type='button';b.textContent=text;if(attr)b.dataset.practice=attr;b.onclick=fn;actions.append(b);return b;}
 function clear(){actions.replaceChildren();markers.replaceChildren();status.textContent='';drag=null;}
 function draw(value){currentSample=value;if(lastAspect!==camera.aspect){path=null;drag=null;}lastAspect=camera.aspect;pose=seek(value,{...grips,showForces:stage==='demo'||stage==='pressing',conversation:stage==='consent'?'initial':stage==='retry'&&retryNeedsConsent?'retry':null});lastAspect=camera.aspect;positionMarkers();}
 function baseline(){return test===0?6.55:10.97;}
 function poseAmount(value){amount=value;draw((test===0?6.6:11.25)+value*(test===0?1.45:1.55));}
 function startDemo(){
  demo={elapsed:0,from:stage,grips:{...grips}};emit('demo',{from:stage});
  grips={fixedWeight:0,heelWeight:0};setStage('demo');draw(baseline());
 }
 function endDemo(){if(!demo)return;const previous=demo;demo=null;grips=previous.grips;setStage(previous.from,true);}
 function setStage(next,resuming=false){
  const revision=++stageRevision;
  if(!['move','settle','return','pressure','pressing','next','interpret'].includes(next))stopExplanation();
  patientExpression('neutral');audio.cancel();stage=next;ui.dataset.practiceStage=next;ui.dataset.practiceTest=String(test);clear();
  if(next==='consent'){
   draw(-preparationDuration);line.textContent='检查前，先向陈女士说明目的并征求同意。';
   const consent=button('说明检查并征求同意',async()=>{
     consent.disabled=true;
     emit('consent',{agreed:false});
     line.textContent='林治疗师：'+PRACTICE_LINES.consent;
     await say('therapist',PRACTICE_LINES.consent);
     if(!active||stage!=='consent')return;
     line.textContent='陈女士：'+PRACTICE_LINES.agree;
     await say('patient',PRACTICE_LINES.agree);
     if(!active||stage!=='consent')return;
     emit('consent',{agreed:true});
     setStage(prepared?'protection':'bedprep');
   },'consent');
  }else if(next==='bedprep'){
   preparationHeard=false;beginBedPrep();line.textContent='林治疗师：'+PRACTICE_LINES.prepare;
   say('therapist',PRACTICE_LINES.prepare).then(()=>{if(active&&stageRevision===revision)preparationHeard=true;});
  }else if(next==='protection'){transfer=resuming?Math.min(preparationDuration,checkpoint?.phaseTime||0):0;draw(transfer-preparationDuration);line.textContent=preparationLabel(transfer);if(!resuming)emit('protection_started');
  }else if(next==='transfer'){transfer=resuming?Math.min(6.2,checkpoint?.phaseTime||0):0;draw(transfer);line.textContent='陈女士将双腿移到床上，慢慢躺好。';}
  else if(next==='fixed'||next==='heel'){
   draw(baseline());line.textContent=next==='fixed'?(test===1?'内翻加压试验：右手应固定哪里？':label()+'：左手应固定在哪里？'):(test===1?'左手虎口应贴住哪里？':label()+'：右手应托握哪里？');
   let targets=next==='fixed'?[['胫骨下段','shin'],['前足','toes'],['足跟','heel']]:[['足跟','heel'],['脚趾','toes'],['小腿中段','shin']];
   if(test===1)targets=next==='fixed'?[['小腿中段','oppositeShin'],['胫骨下缘（踝关节上方）','shin'],['前足','toes']]:[['足内侧缘','oppositeHeel'],['前足','toes'],['足外侧缘（靠近足跟）','heel']];
   for(const [i,[text,id]] of targets.entries()){const b=document.createElement('button');b.type='button';b.textContent=String(test===1?i+1:['shin','heel','toes'].indexOf(id)+1);b.setAttribute('aria-label',text);b.dataset.target=id;b.onclick=()=>{
    const correct=id===(stage==='fixed'?'shin':'heel');emit('placement',{target:id,location:text,hand:(stage==='fixed')===(test===1)?'right':'left',correct});
    if(!correct){errors++;status.textContent=test===1?(stage==='fixed'?'右手整掌固定踝关节上方的胫骨下缘。':'左手虎口贴住靠近足跟的足外侧缘。'):stage==='fixed'?'固定点在踝关节上方的小腿下段。':'右手兜住跟骨，从后足带动。';return;}
    if(stage==='fixed'){grips.fixedWeight=1;setStage('heel');}else{grips.heelWeight=1;setStage('move');}
   };markers.append(b);button(b.textContent+' · '+text,()=>b.click());}
   button('看双手示范',startDemo,'demo');positionMarkers();
  }else if(next==='move'){
   amount=0;path=null;draw(baseline());if(!resuming)attempts++;
   line.textContent=test===0?'托住足跟，沿箭头向前拖一小段后松手。':'稳住小腿，顺着箭头将后足向内翻一小段后松手。';
   explain();
   const handle=document.createElement('button');handle.type='button';handle.className='practice-handle';handle.dataset.target='drag';
   handle.textContent=test===0?'带动足跟':'内收、内翻';handle.setAttribute('aria-label',handle.textContent+'，也可按相应方向键');markers.append(handle);
   const guide=document.createElement('span');guide.className='practice-direction';markers.append(guide);
   if(test===1){
    guide.hidden=true;
    const arc=document.createElementNS(svgNS,'svg');arc.classList.add('inversion-arc');arc.setAttribute('aria-hidden','true');
    for(const name of ['polyline','polygon'])arc.append(document.createElementNS(svgNS,name));
    markers.append(arc);
   }
   const leader=document.createElement('span');leader.className='heel-leader';markers.append(leader);
   handle.onpointerdown=e=>{
    if(drag||!e.isPrimary||e.button!==0)return;
    e.preventDefault();handle.setPointerCapture(e.pointerId);
    drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,best:0};
    emit('motion_start',{attempt:attempts});
   };
   function track(e){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    const end=path[path.length-1],length=Math.hypot(end.x,end.y);
    const forward=(dx*end.x+dy*end.y)/length;
    const aligned=forward>=Math.hypot(dx,dy)*.45;
    if(aligned&&forward>travel()*2.25){fail('too_fast',PRACTICE_LINES.fast);return;}
    if(aligned)drag.best=Math.max(drag.best,forward);
    poseAmount(aligned?Math.min(1,forward/travel()):0);
    if(drag&&drag.best>=travel()*.24)status.textContent='方向正确，可以松手。';
   }
   handle.onpointermove=e=>{if(drag?.pointer===e.pointerId)track(e);};
   handle.onpointerup=e=>{
    if(drag?.pointer!==e.pointerId)return;
    track(e);if(!drag)return;
    const accepted=drag.best>=travel()*.24;
    drag=null;
    if(accepted)setStage('settle');
    else{poseAmount(0);status.textContent='顺着箭头再拖一小段。';}
   };
   handle.onpointercancel=e=>{if(drag?.pointer===e.pointerId){drag=null;poseAmount(0);status.textContent='可以从原处再拖一次。';}};
   handle.onkeydown=e=>{
    const keys={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowRight:[1,0],ArrowLeft:[-1,0]},key=keys[e.key];
    if(!key||drag)return;e.preventDefault();
    const end=path[path.length-1];
    if((key[0]*end.x+key[1]*end.y)/Math.hypot(end.x,end.y)<.45){status.textContent='请按与箭头方向相近的方向键。';return;}
    emit('motion_start',{attempt:attempts});poseAmount(.3);setStage('settle');
   };
   button('停止检查',()=>fail('student_stop','检查已停止。先让患者放松，再决定是否重新尝试。'),'stop');
   button('看双手示范',startDemo,'demo');
   positionMarkers();
  }else if(next==='settle'){
   if(resuming)poseAmount(.3);
   line.textContent=test===0?'方向正确。观察治疗师短暂停留，再将足跟缓慢送回原位。':'方向正确。观察治疗师将后足带到终末位，准备轻压外踝外侧。';
   button('停止检查',()=>fail('student_stop','检查已停止。'),'stop');
  }else if(next==='return'){
   draw(13.65);line.textContent='压力已解除。观察足跟缓慢回到中立位。';
  }else if(next==='pressure'){
   draw(12.8);line.textContent='保持终末位，在右外踝外侧轻轻加压。';
   const press=()=>{if(stage!=='pressure')return;emit('lateral_pressure',{location:'lateral_malleolus',atEndRange:true});pressElapsed=0;setStage('pressing');};
   const pin=document.createElement('button');pin.type='button';pin.textContent='＋';pin.dataset.target='malleolus';pin.setAttribute('aria-label','在右外踝外侧轻压');pin.onclick=press;markers.append(pin);
   button('轻压外踝外侧',press,'press').focus();button('停止检查',()=>fail('student_stop','检查已停止。'),'stop');positionMarkers();
  }else if(next==='pressing'){
   line.textContent='保持跟骨位置，轻压后松开。';draw(12.8);
  }else if(next==='demo'){
   line.textContent=test===0?'左手整掌贴稳小腿，右手托住足跟。红箭头显示施力方向。':'右手固定胫骨下缘，左手虎口贴住足外侧缘。';
   button('返回自己操作',endDemo,'end-demo');
  }else if(next==='retry'){
   if(retryNeedsConsent){
    draw(baseline());
    const current=()=>active&&stageRevision===revision;
    const retry=button('询问是否可以继续',async()=>{
     retry.disabled=true;line.textContent='林治疗师：'+PRACTICE_LINES.again;
     await say('therapist',PRACTICE_LINES.again);if(!current())return;
     line.textContent='陈女士：好。';await say('patient','好。');
     if(current()){emit('consent',{agreed:true,retry:true});painReported=false;retryNeedsConsent=false;grips={fixedWeight:0,heelWeight:0};setStage('fixed');}
    },'retry');
    button('结束本次检查',onSkip,'leave');
    if(painReported){
     retry.disabled=true;
     line.textContent='陈女士：'+PRACTICE_LINES.fast;
     (async()=>{
      await say('patient',PRACTICE_LINES.fast);if(!current())return;
      line.textContent='林治疗师：'+PRACTICE_LINES.sorry;
      await say('therapist',PRACTICE_LINES.sorry);if(current())retry.disabled=false;
     })();
    }else line.textContent='检查已暂停，等陈女士休息好再询问。';
   }else button('重新操作',()=>setStage('move'),'retry');
  }else if(next==='next'){draw(10.2);
   line.textContent='陈女士保持仰卧，接下来做内翻加压试验。';
   button('开始内翻加压试验',()=>{test=1;grips={fixedWeight:0,heelWeight:0};setStage('neutral');},'next-test');
  }else if(next==='neutral'){
   draw(10.2);line.textContent='陈女士仰卧。先将右踝摆在中立位。';
   button('摆至中立位',()=>{transfer=0;setStage('positioning');},'neutral');
  }else if(next==='positioning'){
   line.textContent='将右脚摆正，足底与小腿约呈直角。';draw(10.2);
  }else if(next==='interpret'){draw(15);
   line.textContent='本病例右踝前抽屉和内翻应力试验阳性，左踝为阴性对照。怎样解释这一发现？';
   const notes=document.createElement('details');notes.className='stress-notes';
   const heading=document.createElement('summary');heading.textContent='怎样理解两项手法？';notes.append(heading);
   for(const text of ['前抽屉比较足跟向前的移动及终末阻力，主要关注距腓前韧带。中立位内翻加压比较倾斜幅度及终末阻力，主要关注跟腓韧带。','若另有足部外旋受伤、踝上方疼痛等线索，可另行评估下胫腓联合。外旋应力试验关注是否诱发熟悉的联合区疼痛，并结合压痛、损伤机制及其他检查判断。']){
    const paragraph=document.createElement('p');paragraph.textContent=text;notes.append(paragraph);
   }
   actions.append(notes);
   button('提示机械性松弛，还需结合病史和功能检查',()=>{emit('interpretation',{correct:true});setStage('complete');},'interpret-correct');
   button('可以直接确定韧带完全断裂',()=>{errors++;emit('interpretation',{correct:false});status.textContent='单凭手法检查不能确定韧带完全断裂，请重新选择。';},'interpret-wrong');
  }else if(next==='complete'){draw(15);
   line.textContent=omitted.size?'床旁练习已结束，跳过的操作已单独记录。':PRACTICE_LINES.finish;
   status.textContent='记录的是本次学习操作，不是患者实测位移、角度或施力大小。';
   const result={completed:[...completed],attempts,errors,elapsedSeconds:elapsed(),scope:'simulated-operation',clinicalSkillAssessed:false};if(!omitted.size){
    if(!bothBedsideTests(result)){
     test=completed.includes('anterior_drawer')?1:0;grips={fixedWeight:0,heelWeight:0};
     return setStage(test===1?'neutral':'fixed');
    }
    if(!resuming)emit('completed',result);
    onComplete(result);
   }
   button(onContinue?'继续接诊':'结束本项练习',()=>omitted.size?onSkip():(onContinue||(()=>ui.querySelector('[data-back]').click()))(),'continue');
  }
  snapshot();
 }
 function snapshot(){
  if(stage!=='demo')saveCheckpoint({stage,test,omitted:[...omitted],completed:[...completed],grips:{...grips},attempts,errors,retryNeedsConsent,painReported,explained:[...explained],phaseTime:transfer,elapsedSeconds:elapsed()});
 }
 function travel(){return markers.clientWidth<450?65:100;}
 function project(v){const r=markers.getBoundingClientRect(),p=v.clone().project(camera);return {x:(p.x+1)*r.width/2,y:(1-p.y)*r.height/2};}
 function gesturePath(){
  const origin=project(pose.heel),points=[];
  for(let i=0;i<=16;i++){
   const t=i/16,v=pose.heel.clone();
   if(test===0)v.addScaledVector(pose.anterior,.1*t);
   else v.addScaledVector(pose.sole,.1*(Math.cos(t*.86)-1)).addScaledVector(pose.tiltDirection,.1*Math.sin(t*.86));
   const q=project(v);points.push({x:q.x-origin.x,y:q.y-origin.y});
  }
  const length=points.slice(1).reduce((s,q,i)=>s+Math.hypot(q.x-points[i].x,q.y-points[i].y),0);
  return points.map(q=>({x:q.x*travel()/length,y:q.y*travel()/length}));
 }
 function pointAt(t){const f=t*16,i=Math.min(15,Math.floor(f)),a=path[i],b=path[i+1];return {x:a.x+(b.x-a.x)*(f-i),y:a.y+(b.y-a.y)*(f-i)};}
 // Include the area immediately around each numbered landmark for touch and mouse.
 function nearbyLandmark(event){
  const frame=event.target.closest('.exam-detail-frame');
  if(!frame||event.target.closest('button')||!['fixed','heel','pressure'].includes(stage))return;
  let nearest=null,distance=42;
  for(const pin of markers.querySelectorAll('button[data-target]')){
   const box=pin.getBoundingClientRect();
   const gap=Math.hypot(event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2);
   if(gap<distance){nearest=pin;distance=gap;}
  }
  nearest?.click();
 }
 ui.addEventListener('click',nearbyLandmark);
 function positionMarkers(){if(!pose)return;
  const points=[...markers.querySelectorAll('[data-target]:not(.practice-handle)')].map(b=>{
   const id=b.dataset.target;
   let point=id==='shin'?pose.fixed:id==='toes'?pose.bigToe:id==='malleolus'?pose.malleolus:pose.heel;
   if(id==='oppositeShin'||id==='oppositeHeel'){
     if(id==='oppositeShin')point=pose.fixed.clone().lerp(pose.shin,.47);
     else{point=pose.heel.clone();point.x=2*pose.neutral.x-point.x;}
   }
   const p=project(point);
   return {b,...p,top:p.y};
  }).sort((a,b)=>a.y-b.y);
  for(let i=0;i<points.length;i++){
   const q=points[i];for(const other of points.slice(0,i))if(Math.abs(q.x-other.x)<44)q.top=Math.max(q.top,other.top+44);
   q.b.style.left=q.x+'px';q.b.style.top=q.top+'px';q.b.style.setProperty('--pin-rise',(q.top-q.y)+'px');
  }
  const guide=markers.querySelector('.practice-direction');if(guide){
    if(!path)path=gesturePath();
    const p=project(pose.heel),d=path[16],dx=p.x>markers.clientWidth*.6?-1:1;
    const minX=Math.min(...path.map(q=>q.x)),maxX=Math.max(...path.map(q=>q.x));
    const x=Math.max(48-minX,Math.min(markers.clientWidth-48-maxX,p.x+dx*Math.min(140,markers.clientWidth*.26))),y=p.y-8;
    const h=markers.querySelector('.practice-handle'),leader=markers.querySelector('.heel-leader');
    const q=pointAt(amount),hx=x+q.x,hy=y+q.y;h.style.left=hx+'px';h.style.top=hy+'px';
    leader.style.left=p.x+'px';leader.style.top=p.y+'px';leader.style.width=Math.hypot(hx-p.x,hy-p.y)+'px';leader.style.transform=`rotate(${Math.atan2(hy-p.y,hx-p.x)}rad)`;
    guide.style.left=x+'px';guide.style.top=y+'px';guide.style.transform=`rotate(${Math.atan2(d.y,d.x)}rad)`;guide.style.width=travel()+'px';
    const arc=markers.querySelector('.inversion-arc');if(arc){
     arc.style.left=x+'px';arc.style.top=y+'px';arc.firstChild.setAttribute('points',path.map(q=>q.x+','+q.y).join(' '));
     const end=d,prev=path[15],angle=Math.atan2(end.y-prev.y,end.x-prev.x),cx=Math.cos(angle),cy=Math.sin(angle);
     arc.lastChild.setAttribute('points',[[end.x,end.y],[end.x-12*cx+5*cy,end.y-12*cy-5*cx],[end.x-12*cx-5*cy,end.y-12*cy+5*cx]].map(p=>p.join(',')).join(' '));
    }
  }
 }
 function fail(kind,message){if(['direction','too_fast'].includes(kind))errors++;emit('motion_feedback',{kind,amplitude:amount});painReported=kind==='too_fast';retryNeedsConsent=painReported||kind==='student_stop';if(retryNeedsConsent)grips={fixedWeight:0,heelWeight:0};drag=null;amount=0;draw(baseline());setStage('retry');if(!retryNeedsConsent)line.textContent=message;}
 function success(){emit('motion_complete',{returned:true,assistedEndRangeAndReturn:true,amplitudeIsInterfaceScale:true});const key=test===0?'anterior_drawer':'inversion_stress';if(!omitted.has(test)&&!completed.includes(key))completed.push(key);draw(baseline());
  if(test===0&&completed.includes('inversion_stress')){test=1;setStage('interpret');}else setStage(test===0?'next':'interpret');}
 function keydown(e){if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(stage==='move'||stage==='settle')fail('student_stop','检查已停止。先让患者放松，再决定是否重新尝试。');else if(stage==='demo'){endDemo();}else ui.querySelector('[data-back]')?.click();}if(e.key==='Tab'){const nodes=[...ui.querySelectorAll('button')].filter(x=>!x.disabled&&x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(!ui.contains(document.activeElement)){e.preventDefault();first.focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 function visibility(){if(document.hidden)snapshot();if(document.hidden&&['move','pressure','pressing'].includes(stage)&&(drag||amount>0))fail('interrupted','操作已暂停。返回后确认患者状态，再重新尝试。');}
 window.addEventListener('pagehide',snapshot);
 document.addEventListener('keydown',keydown,true);document.addEventListener('visibilitychange',visibility);
 const resumeStage=agreed&&checkpoint?.stage==='consent'?null:checkpoint?.stage;
 // Resume a gesture at a stable pose, retaining completed manoeuvres.
 const restore={positioning:'fixed',pressing:'return'};
 setStage((restore[resumeStage]||resumeStage)||(agreed?(prepared?'protection':'bedprep'):'consent'),!!resumeStage);
 actions.querySelector('button')?.focus();
 function skip(){
   if(!active)return;
   if(stage==='complete'){actions.querySelector('[data-practice=continue]').click();return;}
   if(stage==='demo'){endDemo();return;}
   if(stage==='next'){actions.querySelector('[data-practice="next-test"]').click();return;}
   emit('step_skipped',{assessmentCredit:false});omitted.add(test);
   if(stage==='consent'||stage==='bedprep'||(stage==='retry'&&retryNeedsConsent)){onSkip();return;}
   if(stage==='fixed')grips.fixedWeight=1;
   if(stage==='heel')grips.heelWeight=1;
   const next={protection:'transfer',transfer:'fixed',neutral:'fixed',positioning:'fixed',fixed:'heel',heel:'move',move:test===0?'next':'pressure',settle:test===0?'next':'pressure',pressure:'return',pressing:'return',return:'interpret',retry:test===0?'next':'interpret',interpret:'complete'}[stage];
   if(next)setStage(next);else onSkip();
 }
 return {skip,changeView(){path=null;if(stage==='move'&&(drag||amount>0)){drag=null;amount=0;draw(baseline());status.textContent='已切换视角，从原位开始。';}else draw(currentSample);},tick(dt){
  if(camera.aspect!==lastAspect&&stage!=='bedprep')draw(currentSample);
  if(document.hidden)return;
  if(stage==='bedprep'){
   if(stepBedPrep(dt)&&preparationHeard){prepared=true;onPrepared();setStage('protection');}
  }else if(stage==='protection'){transfer=Math.min(preparationDuration,transfer+dt);draw(transfer-preparationDuration);line.textContent=preparationLabel(transfer);if(transfer>=preparationDuration){emit('protection_completed',{mask:true,gloves:true,handHygieneDemonstration:true,handHygieneEpisodes:1,dispenserPresses:1,sequenceSeconds:preparationDuration});setStage('transfer');}}
  else if(stage==='transfer'){transfer=Math.min(6.2,transfer+dt);draw(transfer);if(transfer>=6.2)setStage('fixed');}
  else if(stage==='positioning'){transfer=Math.min(.77,transfer+dt);draw(10.2+transfer);if(transfer>=.77){emit('position',{patient:'supine',ankle:'neutral'});setStage('fixed');}}
  else if(stage==='pressing'){pressElapsed=Math.min(.85,pressElapsed+dt);draw(12.8+pressElapsed);if(pressElapsed>=.85)setStage('return');}
  else if(stage==='demo'&&demo){
   demo.elapsed+=dt;const t=demo.elapsed;
   const between=(a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
   grips.fixedWeight=between(0,.55);grips.heelWeight=between(.28,.88);
   if(test===0){
     poseAmount(between(1.3,2.9)*(1-between(3.65,5.15)));
     if(t>=5.55)endDemo();
   }else{
     draw(t<1.3?10.97:Math.min(15,11.25+t-1.3));
     line.textContent=t<1.3?'右踝中立，右手固定胫骨下缘，左手虎口贴住足外侧缘。':t<2.85?'从足跟带动跟骨内收、内翻。':t<3.7?'保持终末位，在外踝外侧轻轻加压。':'解除压力，缓慢回位。';
     if(t>=5.6)endDemo();
   }
  }
  else if(stage==='settle'){
   const end=test===0?10.2:12.8;
   draw(Math.min(end,currentSample+dt));
   if(currentSample>=end){if(test===0)success();else setStage('pressure');}
  }else if(stage==='return'){
   draw(Math.min(15,currentSample+dt));if(currentSample>=15)success();
  }
  positionMarkers();
 },close(){snapshot();active=false;ui.removeEventListener('click',nearbyLandmark);stopExplanation();explanation.dispose();audio.dispose();window.removeEventListener('pagehide',snapshot);document.removeEventListener('keydown',keydown,true);document.removeEventListener('visibilitychange',visibility);markers.remove();},getState:()=>({stage,test,amount,loaded:stage==='pressure'||stage==='pressing',completed:[...completed]})};
}
