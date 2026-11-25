import {createBedsideMotion,chapters,duration,instruction,preparationDuration} from './bedside-motion.js?v=771';
import {createBedsidePractice} from './bedside-practice.js?v=79';

import {seatOnExamBed} from './actors.js?v=79';

export function startBedside({host,actors,room,camera,renderer,onClose,backLabel='返回接诊',onSkip,skipExamination=false,film=false,onComplete,onContinue,checkpoint,saveCheckpoint,agreed=false,prepared=false,onPrepared=()=>{},record,voiceEnabled,onSpeaker=()=>{}}){
  const barefoot=film||prepared||Boolean(checkpoint?.stage&&!['consent','bedprep'].includes(checkpoint.stage));
  const motion=createBedsideMotion(actors,room,{seatedStart:!film,barefoot});
  const ui=document.createElement('section');
  ui.className='bedside-player';ui.setAttribute('aria-label','床旁右踝被动检查');
  ui.innerHTML='<div class="bedside-title"><strong>陈女士 · 右踝床旁查体</strong><button type="button" data-back>返回接诊</button></div><div class="bedside-bottom"><p class="bedside-line"></p><div class="bedside-controls"><button type="button" data-play>暂停</button><input aria-label="查体播放进度" type="range" step=".05" min="0" max="16" value="0"><div class="bedside-chapters"></div></div></div>';
  host.append(ui);host.dataset.bedsideActive='true';
  if(film)ui.classList.add('bedside-film');
  const btn=ui.querySelector('[data-play]'), back=ui.querySelector('[data-back]'),line=ui.querySelector('p'),slider=ui.querySelector('input');
  let time=0,playing=!film,previous=-1,lastAspect=0;
  for(const [position,label] of chapters){
    const item=document.createElement('button');item.type='button';item.textContent=label;
    item.onclick=()=>{playing=true;seek(position);};ui.querySelector('.bedside-chapters').append(item);
  }
  const originalFov=camera.fov;
  let view='auto';
  const views=document.createElement('div');
  views.className='bedside-views';views.setAttribute('role','group');views.setAttribute('aria-label','查体观察视角');
  for(const [id,name] of Object.entries({auto:'随检查',side:'侧面',end:'足端',above:'俯视',wide:'全景'})){
    const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.examView=id;
    b.setAttribute('aria-pressed',String(id===view));views.append(b);
    b.onclick=()=>{view=id;for(const item of views.children)item.setAttribute('aria-pressed',String(item===b));if(practice)practice.changeView();else seek(time);};
  }
  ui.append(views);
  let frameWidth=0,frameHeight=0;
  const canvas=renderer.domElement,home=canvas.parentNode,after=canvas.nextSibling;
  const frame=document.createElement('div');frame.className='exam-detail-frame';frame.hidden=true;
  const tags=['右踝 · 患侧','左踝 · 健侧'].map((s,i)=>{const el=document.createElement('span');el.className='ankle-side-tag';el.dataset.side=i?'left':'right';el.textContent=s;frame.append(el);return el;});
  ui.insertBefore(frame,ui.querySelector('.bedside-bottom'));ui.insertBefore(views,frame);
  function layout(detail){
    if(detail!==(ui.dataset.detail==='true')){
      ui.dataset.detail=String(detail);frame.hidden=!detail;
      const markers=ui.querySelector('.practice-markers');
      if(detail){frame.append(canvas);if(markers)frame.append(markers);}
      else{home.insertBefore(canvas,after);if(markers)ui.append(markers);}
    }
    const area=detail?frame:host,w=area.clientWidth,h=area.clientHeight;
    if(!w||!h)return;
    const ratio=renderer.getPixelRatio();
    if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio))renderer.setSize(w,h,false);
    camera.aspect=w/h;if(detail){frameWidth=w;frameHeight=h;}
  }
  function seek(value,grips){
    time=Math.max(-preparationDuration,Math.min(duration,value));
    if(time>=duration)playing=false;
    layout(!film&&time>=6.2&&!grips?.conversation);
    const pose=motion.sample(time,grips);
    const halfAngle=(time<6.2||grips?.conversation?45:33)*Math.PI/360;
    camera.fov=Math.atan(Math.tan(halfAngle)*Math.max(1,1.42/camera.aspect))*360/Math.PI;
    camera.clearViewOffset();camera.updateProjectionMatrix();
    views.hidden=film||time<6.2||Boolean(grips?.conversation);
    motion.cameraAt(camera,time,pose,view,grips?.conversation);camera.updateMatrixWorld(true);
    for(const [i,v] of [pose.neutral,pose.left].entries()){
       const pt=v.clone().project(camera),el=tags[i];el.hidden=Math.abs(pt.x)>.97||Math.abs(pt.y)>.96||Math.abs(pt.z)>1;
       el.style.left=Math.max(11,Math.min(89,50+50*pt.x))+'%';el.style.top=Math.max(10,Math.min(85,50-50*pt.y+(i?-12:13)))+'%';
    }
    slider.value=time;btn.textContent=playing?'暂停':time>=duration?'重看':'播放';
    const message=instruction(time);if(film&&line.textContent!==message)line.textContent=message;
    const index=time<0?0:time<6.2?1:time<10.9?2:3;
    if(index!==previous){[...ui.querySelectorAll('.bedside-chapters button')].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));previous=index;}
    lastAspect=camera.aspect;
    return pose;
  }
  btn.onclick=()=>{playing=!playing;seek(time>=duration?-preparationDuration:time);};
  slider.oninput=()=>{playing=false;seek(+slider.value);};
  back.textContent=backLabel;back.onclick=onClose;back.hidden=!onClose;
  if(onSkip&&!film){
    const skip=document.createElement('button');skip.type='button';skip.className='skip-step';skip.textContent=skipExamination?'跳过床旁查体':'跳过此步骤';
    skip.onclick=skipExamination?onSkip:()=>practice.skip();back.before(skip);
  }
  slider.min=-preparationDuration;seek(-preparationDuration);
  function beginBedPrep(){
    seek(-preparationDuration,{conversation:'initial',fixedWeight:0,heelWeight:0});
    seatOnExamBed(actors.patient,room.objects.examBed);
    actors.patient.setFootwear('shoes');
    actors.patient.startFootwearRemoval();
    camera.position.set(.72,1.34,1.35);camera.lookAt(-1.48,.92,.18);camera.updateMatrixWorld(true);
  }
  function stepBedPrep(dt){
    actors.patient.update(dt,dt);
    return actors.patient.getState().footwearRemoval.completed;
  }
  const practice=film?null:createBedsidePractice({ui,camera,seek,onComplete,onContinue,onSkip,checkpoint,saveCheckpoint,agreed,prepared:barefoot,beginBedPrep,stepBedPrep,onPrepared,record,voiceEnabled,onSpeaker,patientExpression:value=>actors.patient.setEmotion(value)});
  return {seek,getPracticeState:()=>practice?.getState(),tick(dt){actors.patient.updateFace(dt);if(practice){if(ui.dataset.detail==='true'&&(frame.clientWidth!==frameWidth||frame.clientHeight!==frameHeight||camera.aspect!==frameWidth/frameHeight))practice.changeView();practice.tick(dt);}else if(playing||camera.aspect!==lastAspect)seek(time+(playing?dt:0));},
    close(){practice?.close();actors.patient.setEmotion('neutral');layout(false);motion.release();ui.remove();delete host.dataset.bedsideActive;camera.fov=originalFov;camera.updateProjectionMatrix();}};
}
