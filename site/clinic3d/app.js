import {caseWorkshops,mountWorkshop} from './case-workshops.js?v=79.2';
import {handRest,placeHand} from './bedside-motion.js';
import {speakerShot} from './speaker-shot.js?v=79';
import {mountAssessment} from './functional-assessment.js?v=79';
import {installEvidenceArchive} from './evidence-archive.js?v=71';
import {soapSummary,spokenFindings} from './soap-summary.js?v=79';
import {expressionForPatientLine} from './patient-expression.js';
import {createGaitReview} from './gait-review.js';
import {showSpokenPressureMap} from './plantar-scan.js?v=79';
import {wallReference} from './posture-reference.js';
import {wallTapeStudy} from './wall-tape.js?v=79';
import {installTaskDesk} from './task-desk.js?v=74';
import {markLearningStep,recoverLearningSteps,encounterProgress} from './encounter-progress.js?v=79';
import {createStrengthBed} from './strength-bed.js?v=77';
import {createStrengthCamera} from './strength-camera.js?v=72';
import {addPractice} from '../learning/case-items.js';
import {openArchObservation} from './arch-observation.js?v=68';
import {openArchBones} from './arch-bones.js';
import {voiceRole,replies,spokenCommunicationChoices} from './clinic-dialogue.js?v=69';
import {openInversionStudy} from './inversion-study.js?v=75';
import {startBedside} from './bedside-player.js?v=79';
import {differentialPanel} from './differential.js';
import {reactionFor,repairLabel,repairSpoken} from './communication-v26.js?v=73';
import {installImmersion} from './immersion-v23.js?v=74';
import {installLearningBubbles} from './learning-bubbles-v25.js?v=68';
import {createUsageTracker} from '../assets/usage-v23.js';
import { SOAP_STAGES } from './soap-route-v20.js?v=72';
import { createDialogueAudio } from './dialogue-audio.js?v=79.2';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createClinicRoom } from './scene-room.js?v=79';
import { createActors,seatOnExamBed } from './actors.js?v=79';
import { samplePlantarScan, sampleStanding, sampleWalking, renderPressureDiagram } from './pressure-engine.js';
import { createPressureStage } from './pressure-stage.js';
import {gaitExcerpt,gaitPhasesComplete} from './gait-phase-task.js?v=72';
import { createLearningUI } from './learning-ui.js?v=79.2';
import { createDialoguePlayer } from './dialogue-player.js?v=74';
import { createFilmSequence } from './film-sequence.js?v=79.2';
import {trainingFilm} from './training-film.js';
import {presentPlan} from './plan-writing.js';
import {submitEncounter} from './finish-encounter.js?v=73';
import {planTurns,selectedPlan} from './plan-discussion.js';
import {mountGoniometer,romComplete,romReport,romTable} from './goniometry.js?v=79.2';
import { createLearningHub } from '../learning/learning-hub.js';
import {strengthComplete,motionComplete} from './clinical-exams.js?v=71';
import { migrateProgress, updateAssessmentOrder, legacyBedsideCheckpoint } from './progress-migration.js?v=72';
import { GAIT_CASE, sampleGait } from './gait-lesson.js';
import { CASE_DATA, FLOW, START_NODE, TEACHER_LIMITATIONS, EVIDENCE_CATALOG } from './case-flow.js?v=79';

const $=id=>document.getElementById(id), profile=window.DXXHub?.profile?.()||null;
const uid=()=>crypto.randomUUID(), now=()=>new Date().toISOString();
const personKey=profile?profile.teacher+'|'+profile.studentId:'guest';
const roundParam=new URLSearchParams(location.search).get('round');
const navigationRound=roundParam&&/^[A-Za-z0-9-]{8,80}$/.test(roundParam)?roundParam:null;
const STORE='dxx_clinic3d_v21_'+personKey+(navigationRound?'_round_'+navigationRound:'');
const chapters=CASE_DATA.acts.map(a=>[a.id,a.title]);
const NAVIGATION_STAGES=SOAP_STAGES;
const reviewParam=new URLSearchParams(location.search).get('review');
const practiceId=new URLSearchParams(location.search).get('practice');
const practice=['injury_mechanism','arch_compare','ankle_stress','muscle_match','gait_events','pressure_compare','alignment','static_cop'].includes(practiceId)?practiceId:null;
if(practice)document.body.dataset.freePractice=practice;
const splitPractice=['gait_events','pressure_compare','muscle_match','alignment','static_cop'].includes(practice);
if(splitPractice)document.body.dataset.splitPractice='true';
const reviewExit=practice?'../index.html#home':'./index.html?demo=1';
const REVIEW_NODE=practice||(['muscle_match','arch_compare','ankle_stress','exam_reasoning','injury_mechanism','acute_differential'].includes(reviewParam)?reviewParam:null);
const flow=Array.isArray(FLOW)?Object.fromEntries(FLOW.map(n=>[n.id,n])):FLOW;
const state={routeVersion:72,sessionId:'clinic3d.'+uid(),caseId:'cai',startedAt:now(),student:profile,node:null,history:[],evidence:[],events:[],visited:[],taskReceipts:{},records:[],exitLock:false,reflection:'',completedAt:null,view:'third',paused:false};
const syncEvidenceArchive=REVIEW_NODE?null:installEvidenceArchive(state);
let renderer,scene,camera,controls,room,actors,activeNode,selectedNext,last=performance.now(),cameraMove,movement,drawerFocus,elapsed=0,talkUntil=0,taskPhase=.08,taskRunning=false,pressureMode='static',toastTimer,flushRunning=false;
let queue=[],saved=null,hasStarted=false,lastDraw=0,immersion=null,usageTracker=null,learningBubbles=null;
try{
 saved=updateAssessmentOrder(JSON.parse(localStorage.getItem(STORE)||'null'));
 if(false)for(const version of []){
  const prior=JSON.parse(localStorage.getItem('dxx_clinic3d_'+version+'_'+personKey)||'null');
  if(prior?.caseId==='cai'&&flow[prior.node]){saved=migrateProgress(prior,version,flow,now());break;}
 }
}catch{}
const stepBook=new Map(), catalog=Array.isArray(EVIDENCE_CATALOG)?Object.fromEntries(EVIDENCE_CATALOG.map(e=>[e.id,e])):EVIDENCE_CATALOG||{};
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3300);}
function record(type,payload={}){if(type==='clinic3d_task_completed')window.dispatchEvent(new CustomEvent('dxx:clinic-task-completed',{detail:{nodeId:payload.nodeId}}));
 if(!hasStarted)return null;const e={id:'v14.'+uid(),sessionId:state.sessionId,type,at:now(),payload:{source:'clinic3d-v14',...payload}};state.events.push(e);queue.push(e);persist();flush();
  return e;}
let lastTeacherSnapshot = '';
function queueTeacherProgress(){
 const rows=encounterProgress(state).rows;
 const signature=state.sessionId+'|'+rows.map(row=>row.status).join('|');
 if(signature===lastTeacherSnapshot)return;
 lastTeacherSnapshot=signature;
 const statuses=['待学习','进行中','已完成','已跳过'];
 const payload={ids:rows.map(row=>row.id),marks:rows.map(row=>statuses.indexOf(row.status)).join('')};
 queue.push({id:'v14.'+uid(),sessionId:state.sessionId,type:'clinic3d_progress_snapshot',at:now(),payload});
 queueMicrotask(flush);
}
function persist(){if(!hasStarted)return;syncEvidenceArchive?.();refreshLearningProgress();queueTeacherProgress();if(activeNode?.task)state.taskState={nodeId:activeNode.id,values:Object.fromEntries(stepBook),phase:taskPhase,pressureMode};try{localStorage.setItem(STORE,JSON.stringify(state));$('saveStatus').textContent='进度已在本机保存';}catch{$('saveStatus').textContent='请及时导出学习记录';}}
async function flush(){if(flushRunning||!queue.length)return;flushRunning=true;const batch=queue.slice(0,50);let sent=false;try{const r=await fetch('/api/learning/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:{id:state.sessionId,caseId:'cai',startedAt:state.startedAt,student:profile},events:batch}),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('offline');const receipt=await r.json();if(receipt.sessionId!==state.sessionId||receipt.accepted+receipt.duplicates!==batch.length)throw Error('receipt');queue=queue.filter(e=>!batch.includes(e));sent=true;$('saveStatus').textContent='本机保存 · 已同步课堂记录';}catch{$('saveStatus').textContent='本机保存 · 可导出记录';}finally{flushRunning=false;if(sent&&queue.length)setTimeout(flush,0);}}
function nodeEl(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;}
function button(label,action){const b=nodeEl('button','',label);b.type='button';b.addEventListener('click',action);return b;}
function showFacts(node,entries){node.replaceChildren();const dl=document.createElement('dl');for(const [term,value] of entries){dl.append(nodeEl('dt','',term),nodeEl('dd','',String(value)));}node.append(dl);}
function evidenceText(id){const x=catalog[id];return typeof x==='string'?x:x?.text||x?.label||x?.title||id;}
function addEvidence(ids=[]){for(const id of ids){if(!state.evidence.includes(id))state.evidence.push(id);} $('evidenceCount').textContent=state.evidence.length;}
function appendLine(speaker,text,kind='dialogue'){state.history.push({at:now(),speaker,text,kind,node:activeNode?.id||null});}
const dialogueAudio=createDialogueAudio({enabled:()=>$('voice').getAttribute('aria-pressed')==='true',onTalking:role=>{actors?.setTalking(role);talkUntil=role?Infinity:0;
 if(!bedside)showSpeaker(visualZone==='consult'&&!activeNode?.task?role:null);},onStatus:message=>{$('audioStatus').textContent=message;$('audioStatus').hidden=!message;}});
function speak(speaker,text){return dialogueAudio.speak(speaker,text);}

function currentAct(){let act=activeNode?.act||'act1';if(typeof act==='number')act='act'+act;return chapters.some(x=>x[0]===act)?act:'act1';}
function displayNodeText(node){
 if(node.id==='arch_intro'){
  const strength=state.taskReceipts?.muscle_match;
  if(strength?.scope!=='simulated-ankle-strength'||!strength.values?.bedStrength_interpret)return '脚踝除了要能活动、能用力，还要能承重。接下来，我想比较您坐着和站着时的足弓，看看踩到地上会有什么变化。';
 }
 if(node.id==='local_explain'&&state.taskReceipts?.wall_measure?.leftCm===9)return '两边用同样的方法测，右脚是六厘米，左脚是九厘米。您右脚踝负重时，往上弯的幅度小一些。';
 const heard=state.filmProgress?.['01A:normal']?.completed;
 const bridge=heard?{history:'根据她刚才的描述，还需要确认什么？'}:{};
 return bridge[node.id]||node.text||'';
}
function cameras(){const a=room?.anchors||{},seat=a.patientSeat||[.8,0,-.82];const laneX=a.pressureStand?.[0]??4.55,plate=a.forcePlate||[-1.03,.157,3.68];
 const shifted=(origin,p)=>[origin[0]+p[0],p[1],origin[2]+p[2]];
 const at=(origin,position,target)=>({position:shifted(origin,position),target:shifted(origin,target)});
 const lane=[laneX,0,0];return{
 consult:{third:{position:activeNode?[-1.1,1.6,.7]:[7.8,5.8,9.1],target:activeNode?[1,.95,-1.65]:[2.0,.45,.8]},first:{position:[1.30,1.32,-2.57],target:[seat[0],1.24,seat[2]]},feet:{position:[seat[0]-.8,.5,seat[2]-.8],target:[seat[0],.18,seat[2]-.35]}},
 exam:{third:at(a.examSeat,[2.57,1.7,1.85],[-.23,.85,-.20]),first:at(a.examSeat,[1.07,1.42,-.15],[-.33,.9,-.20]),feet:at(a.examSeat,[2.07,.65,.90],[.19,.12,0])},
 posturography:{third:at(plate,[2.97,1.72,.87],[0,.97,-.25]),first:at(plate,[-.91,1.65,.80],[0,.95,-.25]),feet:at(plate,[1.37,.97,.62],[0,.24,0])},
 wall:{third:{position:[2.25,1.28,-1.62],target:[-.22,.75,-2.52]},first:{position:[1.44,.99,-2.18],target:[-.20,.53,-2.56]},feet:{position:[.74,.33,-2.31],target:[-.20,.22,-2.60]}},
 gait:{third:at(lane,[-2.25,1.65,2.85],[0,.85,.45]),first:at(lane,[-1.95,1.35,1.15],[0,.85,1.0]),feet:at(lane,[1.35,.48,1.66],[0,.25,1.04])},
 pressure:{third:at(lane,[-2.15,1.65,2.7],[0,.8,1.1]),first:at(lane,[-1.5,1.45,.45],[0,.70,1.1]),feet:at(lane,[.80,.55,1.92],[0,.1,1.1])},
 balance:{third:{position:[-1.8,1.7,2.3],target:[-.1,.9,-.15]},first:{position:[1.1,1.5,.2],target:[-.1,1,-.2]},feet:{position:[.7,.42,.6],target:[-.1,.15,-.15]}}
};}
let platformEntry=null;
let gaitDemo=null;
const gaitAnklePoint=new THREE.Vector3();
let visualZone='consult',pressureStage=null,removalReturn=null,lastPressurePaint=0;
let bedside=null, mechanism=null, footArches=null;
function leaveFootArches(){
 if(!footArches)return;
 footArches.close();footArches=null;paintTask();
 $('taskSurface').querySelector('[data-open-arch-bones]')?.focus();
}
let motionNarration=null;
let archObservation=null,wallTape=null,closeGoniometer=null;
function showArchObservation(){
 if(activeNode?.id!=='arch_view'||archObservation||state.exitLock||state.paused||dialoguePlayer.getState().pending)return;
 if(!ensurePreparation())return;
 if(!contactReady()){
  $('taskDock').hidden=false;$('taskSurface').hidden=false;$('dockTitle').textContent='坐站足弓观察';
  $('taskSurface').replaceChildren(nodeEl('p','','观察患者站立前，请先确认站立安全并取得同意。'),button('补做检查前问诊',returnToIntake));
  return;
 }
 const subject='case',actor=actors.patient,seat=room.anchors.examSeat;
 actorPose(actors.therapist,'examine',room.anchors.examTherapist,-Math.PI/2);
 actorPose(actor,'seated',seat,Math.PI/2);
 setView('third',true);
 $('taskDock').hidden=false;$('taskSurface').hidden=false;$('dockTitle').textContent='坐位与站位足弓比较';
 $('taskStatus').hidden=true;$('next').hidden=true;$('filmCue').hidden=true;$('filmHandoff').hidden=true;
 document.body.dataset.dockCollapsed='false';$('dockToggle').setAttribute('aria-expanded','true');$('dockToggle').textContent='收起操作';
 dialoguePlayer.showPrompt('观察陈女士的右足内侧，比较坐位和站位。','arch_view');
 $('speaker').textContent='观察提示';$('speakerAvatar').textContent='看';
 $('conversation').dataset.speaker='student';$('dialogueKind').textContent='坐站观察';
 const prior=state.archPosturesDraft;
 archObservation=openArchObservation({host:$('taskSurface'),subject,actor,seat,
  standingSeenNext:prior?.subject===subject&&prior.phase==='standing',paused:()=>state.paused||document.hidden||dialoguePlayer.getState().pending,
  onStanding(){state.archPosturesDraft={subject,phase:'standing'};record('clinic3d_arch_seated_observed',{subject});},
  onFinish(){
   if(activeNode?.id!=='arch_view'||state.archPosturesDraft?.phase!=='standing')return;
   if(state.taskReceipts.arch_view?.subject!=='case'){
    const receipt={at:now(),scope:'arch-posture-comparison',subject,positions:['seated','standing']};
    state.taskReceipts.arch_view=receipt;
    addEvidence(['arch_record']);
    record('clinic3d_task_completed',{nodeId:'arch_view',...receipt});
   }
   if(state.skippedSteps)delete state.skippedSteps.arch_view;
   markLearningStep(state,'arch_view');goto('arch_concern');
  }});
}
function enterFootArches(){
 if(footArches||activeNode?.id!=='arch_compare')return;
 state.autoDialogueNext=null;
 footArches=openArchBones({host:$('clinic'),review:!!REVIEW_NODE,showCase:!!REVIEW_NODE||state.evidence.includes('arch_record'),draft:state.archBoneDraft||state.taskReceipts?.arch_compare,
  onBack:previousStep,onSave:draft=>{state.archBoneDraft=draft;if(!REVIEW_NODE)persist();},
  onComplete:draft=>{if(state.taskReceipts?.arch_compare?.scope==='foot-arch-bone-selection')return;
   const receipt={at:now(),scope:'foot-arch-bone-selection',...draft};state.taskReceipts.arch_compare=receipt;
   record('clinic3d_task_completed',{nodeId:'arch_compare',...receipt});
  },
  onSkip:skipCurrentStep,onClose:leaveFootArches,onContinue:()=>{leaveFootArches();if(REVIEW_NODE)location.assign(reviewExit);else continueEncounter();}});
}
function leaveMechanism(){
 if(!mechanism)return;
 mechanism.close();mechanism=null;
 $('taskSurface').querySelector('[data-open-mechanism]')?.focus();
}
function enterMechanism(){
 const afterDeparture=activeNode?.id==='history_closed'&&state.withdrawal?.phase==='closed';
 if(mechanism||(!afterDeparture&&activeNode?.id!=='injury_mechanism'))return;
 const readOnly=afterDeparture&&!!state.completedAt;
 function returnToRecord(){
  leaveMechanism();
  if(afterDeparture){
   delete state.withdrawal.modelOpen;persist();
   $('continueAfterDeparture')?.focus();
  }
 }
 if(afterDeparture&&!state.withdrawal.modelOpen){
  state.withdrawal.modelOpen=true;
  if(!readOnly&&!state.withdrawal.reflectedAt){
   state.withdrawal.reflectedAt=now();
   record('clinic3d_departure_reflection',{nodeId:'history_closed',nextActivity:'injury_mechanism',reason:state.withdrawal.reason});
  }
  persist();
 }
 state.autoDialogueNext=null;dialogueAudio.cancel();
 mechanism=openInversionStudy({narrate:text=>speak('教学旁白',text),stopNarration:()=>dialogueAudio.cancel(),host:$('clinic'),review:!!REVIEW_NODE,draft:state.mechanismDraft,
  afterDeparture,onBack:afterDeparture?returnToRecord:previousStep,onSave:draft=>{if(readOnly)return;state.mechanismDraft=draft;if(!REVIEW_NODE)persist();},
  onDone:result=>{if(readOnly||state.taskReceipts.injury_mechanism?.scope==='anatomical-model-reasoning')return;
   const receipt={at:now(),...result,scope:'anatomical-model-reasoning'};
   state.taskReceipts.injury_mechanism=receipt;record('clinic3d_task_completed',{nodeId:'injury_mechanism',...receipt});},
  onSkip:afterDeparture?null:skipCurrentStep,onClose:returnToRecord,onContinue:()=>{returnToRecord();if(afterDeparture)return;if(REVIEW_NODE)location.assign(reviewExit);else goto('safety');}});
}
function nextAfterBedside(){
 const target=state.afterBedside||'local_intro';delete state.afterBedside;
 return target;
}
function finishBedside(){
 if(REVIEW_NODE){location.assign(reviewExit);return;}
 if(!state.taskReceipts?.ankle_stress){leaveBedside();return;}
 if(state.skippedSteps)delete state.skippedSteps.ankle_stress;
 goto(nextAfterBedside());
}
function contactReady(){return state.evidence.includes('screening')&&state.evidence.includes('consent');}
function returnToIntake(requiredOnly=false){
 state.bedsideSafetyShortcut=requiredOnly===true&&!state.evidence.includes('screening');
 state.preparationReturnNode=activeNode.id;
 goto(state.evidence.includes('screening')?'consent':'safety');
}
function bedsideActionLabel(){
 if(!REVIEW_NODE&&!contactReady())return '继续';
 return state.bedsideCheckpoint?'继续床旁查体':'开始床旁查体';
}
function returnFromBedside(){
 if(REVIEW_NODE){location.assign(reviewExit);return;}
 if(bedside?.getPracticeState()?.stage==='complete')finishBedside();
 else leaveBedside();
}
function enterBedside(){
 if(bedside||activeNode?.id!=='ankle_stress')return;
 if(!REVIEW_NODE){
  if(state.taskReceipts?.ankle_stress&&!activeNode?.revisitingBedside){finishBedside();return;}
  if(!contactReady()){
   actors.patient.setEmotion('anxious');toast('陈女士有些紧张，希望先听清楚检查的目的。请先说明并征得同意。');
   returnToIntake();actors.patient.setEmotion('anxious');return;
  }
 }
 learningBubbles?.hide();
 controls.enabled=false;cameraMove=null;state.autoDialogueNext=null;
 dialoguePlayer.stop();dialogueAudio.cancel();
 bedside=startBedside({onSpeaker:showSpeaker,host:$('clinic'),actors,room,camera,renderer,backLabel:practice?'返回自由练习':REVIEW_NODE?'返回主线':'返回接诊',onClose:returnFromBedside,onSkip:skipCurrentStep,skipExamination:!REVIEW_NODE,onContinue:REVIEW_NODE?undefined:finishBedside,record,
  prepared:state.barefootPrepared,onPrepared:()=>{state.barefootPrepared=true;record('clinic3d_barefoot_prepared',{animationCompleted:true,location:'exam-bed'});persist();},
  agreed:state.evidence.includes('consent'),checkpoint:Object.hasOwn(state,'bedsideCheckpoint')?state.bedsideCheckpoint:legacyBedsideCheckpoint(state.events),
  saveCheckpoint:value=>{state.bedsideCheckpoint=value;persist();},
  voiceEnabled:()=>$('voice').getAttribute('aria-pressed')==='true',
  onComplete:result=>{if(state.taskReceipts?.ankle_stress)return;state.taskReceipts.ankle_stress={at:now(),...result};record('clinic3d_task_completed',{nodeId:'ankle_stress',...state.taskReceipts.ankle_stress});persist();}});
}
function leaveBedside(){
 if(!bedside)return;
 bedside.close();bedside=null;visualZone='';setVisual(activeNode);setView(state.view,true);
 const entry=$('next');entry.hidden=false;entry.textContent=bedsideActionLabel();entry.focus();
}
function updateComposition(){if(!camera||!$('clinic'))return;if(activeNode?.id==='muscle_match'||document.body.hasAttribute('data-wall-study')||document.body.dataset.soapWriting){camera.clearViewOffset();camera.updateProjectionMatrix();return;}const w=$('clinic').clientWidth,h=$('clinic').clientHeight;if(state.view!=='equipment'&&activeNode?.kind==='task'&&w>=651)camera.setViewOffset(w,h,0,state.view==='feet'?h*.04:0,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix();}
function setView(id,immediate=false){updateComposition();const set=cameras()[visualZone]||cameras().consult,preset=id==='equipment'?(room.anchors.equipmentView||{position:[-.9,1.35,1.1],target:[1.825,1.0,2.0]}):set[id]||set.third;state.view=id;camera.fov=['gait','pressure','posturography'].includes(visualZone)&&id==='first'?54:48;document.body.dataset.inspectEquipment=String(id==='equipment');if(room.objects.pressurePrompt)room.objects.pressurePrompt.visible=id!=='equipment';if(id==='equipment'){taskRunning=false;actors?.setTalking(null);dialogueAudio.cancel();}updateComposition();document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===id;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});controls.enabled=false;controls.enableDamping=false;controls.update();cameraMove={at:performance.now(),from:camera.position.clone(),look:controls.target.clone(),to:new THREE.Vector3(...preset.position),target:new THREE.Vector3(...preset.target),duration:immediate?0:1000};$('cameraNote').textContent=id==='equipment'?'康复器材架':id==='first'?(visualZone==='consult'?'治疗师面对患者':'治疗师观察位'):id==='feet'?'观察右足与地面的关系':'第三视角 · 可拖动观察';record('clinic3d_camera',{view:id,zone:visualZone});}
// Point to the moving contact on the forefoot in world space.
let strengthBed=null, strengthCamera=null;
function actorPose(actor,pose,pos,yaw,immediate=false){if(!actor)return;actor.setLocomotion?.(false);if(pos)actor.setPosition(pos);if(yaw!=null)actor.face(yaw);actor.setPose(pose,immediate);}
const interviewCrown=new THREE.Vector3();
let interviewFace=null;
const renderFace=speakerShot();
let speakerRole=null,portraitUntil=0,manualView=null;
function showSpeaker(role){
 speakerRole=role;
 portraitUntil=role?performance.now()+1800:0;
 if(!role)delete document.body.dataset.speakerShot;
}
function followDialogue(enabled){
 const toggle=$('followSpeaker');
 toggle.setAttribute('aria-pressed',String(enabled));
 toggle.textContent=enabled?'对话特写开启':'对话特写关闭';
 if(enabled)manualView=null;
 showSpeaker(null);
}
function renderClinicView(){
 const role=$('followSpeaker').getAttribute('aria-pressed')==='true'&&!state.paused&&!document.hidden&&performance.now()<portraitUntil?speakerRole:null;
 if(role&&state.view!=='equipment'&&!wallTape&&!archObservation&&!gaitDemo&&!movement&&!departureWalk&&!mechanism&&!footArches&&!platformEntry&&!document.body.hasAttribute('data-arrival')&&$('filmOverlay').hidden&&!actors?.patient.getState().footwearRemoval?.active&&renderFace(role,actors,camera,cam=>renderer.render(scene,cam),!bedside)){
 document.body.dataset.speakerShot=role;return;
 }
 delete document.body.dataset.speakerShot;renderer.render(scene,camera);
}
function frameInterview(){
 if($('followSpeaker').getAttribute('aria-pressed')==='false'||!document.body.hasAttribute('data-interview')||!actors||!['first','third'].includes(state.view))return;
 interviewFace??=actors.patient.root.getObjectByName('Reference_face_patient');
 if(!interviewFace)return;
 const card=$('conversation').getBoundingClientRect(),canvas=$('scene').getBoundingClientRect();
 if(!card.height||!canvas.height||!canvas.width)return;
 camera.updateMatrixWorld();
 interviewFace.localToWorld(interviewCrown.set(0,1.767,.049)).project(camera);
 const shift=camera.view?.enabled?camera.view.offsetY:0;
 const crownY=canvas.top+(1-interviewCrown.y)*canvas.height/2+shift;
 const crownX=canvas.left+(1+interviewCrown.x)*canvas.width/2;
 const nearCard=crownX>=card.left-65&&crownX<=card.right+65;
 const offset=nearCard?Math.min(0,Math.round(crownY-card.bottom-16)):0;
 if(Math.abs(offset-shift)>=1)camera.setViewOffset(canvas.width,canvas.height,0,offset,canvas.width,canvas.height);
}
function setVisual(node){
 document.body.toggleAttribute('data-wall-study',['trial','local_record','wall_adjust','wall_measure','local_explain'].includes(node.id));
 document.body.toggleAttribute('data-interview',node.act==='act1'&&node.kind==='dialogue');
 if(node.id==='muscle_match'&&(REVIEW_NODE||contactReady())&&state.barefootPrepared){
  if(!strengthBed){visualZone='strengthBed';movement=null;taskRunning=false;pressureStage?.update(null,false);actors.patient.setFootwear('barefoot');strengthBed=createStrengthBed(actors,room,scene);strengthCamera=createStrengthCamera(camera,controls,$('scene'),$('strengthOrbit'));}
  actors.setTalking(null);actors.therapist.setDocumentation('desk');return;
 }
 if(strengthBed){strengthCamera.close();strengthCamera=null;strengthBed.close();strengthBed=null;visualZone='';}
 const act=node.act||currentAct(),vm=String(node.visualMode||'').toLowerCase();let zone=node.pressureStation?'pressure':act==='act2'?(vm.includes('wall')||node.task?.type==='trial'?'wall':'exam'):['act3','act4'].includes(act)?'exam':act==='act5'?'gait':act==='act6'?'pressure':act==='act7'?'balance':'consult';
 if(node.task?.type==='staticCOP'||node.id==='balance_intro')zone='posturography';
 if(['arch_intro','arch_compare','arch_view'].includes(node.id))zone='exam';
 const archStanding=node.id==='arch_intro'&&state.barefootPrepared;
 const writing=['exam_findings','plan_intro','synthesis','plan','plan_discussion'].includes(node.id);
 document.body.dataset.soapWriting=writing?(['plan','plan_discussion'].includes(node.id)?'P':'A'):'';
 if(writing)zone='consult';
 if(zone!==visualZone||archStanding||document.body.dataset.archStanding==='true'){visualZone=zone;
  document.body.dataset.archStanding=String(archStanding);movement=null;taskRunning=false;room.setActivity?.(zone==='balance'?{zone:'balance',supportRail:true}:zone==='consult'?'reception':zone==='exam'?'static':zone);const a=room.anchors;
  if(zone==='consult'){actorPose(actors.patient,'seated',a.patientSeat,Math.PI);actorPose(actors.therapist,'seated',a.therapistSeat,0);}
  if(zone==='exam'){const seat=a.examSeat||[-1.48,.15,-.1];
   actorPose(actors.patient,archStanding?'standing':'seated',archStanding?[seat[0]+.36,0,seat[2]+.23]:seat,Math.PI/2);actorPose(actors.therapist,'examine',a.examTherapist||[-.8,0,.0],-Math.PI/2);}
  platformEntry=null;
  if(zone==='posturography'){
   const approach=node.id==='balance_intro'&&!state.exitLock;
   actorPose(actors.patient,'standing',approach?a.balanceApproach:a.forcePlate,Math.PI,true);
   actorPose(actors.therapist,'standing',a.balanceGuard,Math.PI*.68,true);
   if(approach){platformEntry={elapsed:0};actors.patient.setLocomotion(true,true);}
  }
  if(zone==='wall'){actorPose(actors.patient,'standing',a.wallLunge||[-.25,0,-2.25],Math.PI);actorPose(actors.therapist,'standing',[-.77,0,-2.32],Math.PI*.57);}
  if(zone==='gait'){actorPose(actors.patient,'standing',a.gait,Math.PI);actorPose(actors.therapist,'standing',a.gaitObserver,Math.PI/2);}
  if(zone==='pressure'){actorPose(actors.patient,'standing',a.pressure,Math.PI);actorPose(actors.therapist,'standing',a.pressureObserver,Math.PI/2);}
  if(zone==='balance'){actorPose(actors.patient,'standing',a.balance||[-.1,0,-.2],0);actorPose(actors.therapist,'standing',a.therapistProtection||[.9,0,-.05],-Math.PI/2);}
  setView(state.view);
 }
 if(zone==='posturography'&&node.id==='static_cop'){
  platformEntry=null;actorPose(actors.patient,'standing',room.anchors.forcePlate,Math.PI,true);
 }
 const wallPose=({trial:'wall-ready',local_record:'wall-heel',wall_adjust:'wall-heel',wall_measure:'wall-retry',local_explain:'wall-retry'})[node.id];
 actors.patient.setPlateFrame('open',null);
 actors.patient.setClinicalPose(zone==='posturography'&&node.id==='balance_intro'&&!platformEntry?'rail-hold':zone==='posturography'?'plate-stand':zone==='wall'?wallPose:null);
 actors.therapist.setClinicalPose(zone==='posturography'||zone==='wall'?'guard':null);
 document.body.dataset.instrument=zone==='posturography'?'static-force-platform':zone==='pressure'?'plantar-scanner':'';
 if(zone==='posturography'&&node.id==='static_cop')room.objects.balanceStation.sample(0);
 actors.setTalking(null);
 actors.therapist.setFootwear?.('shoes');actors.therapist.setDocumentation?.(writing?'write':['consult','balance','posturography','exam','wall'].includes(zone)?'desk':'carry');
 if(writing){
  const patient=room.anchors.patientSeat,therapist=room.anchors.therapistSeat;
  actors.patient.face(Math.atan2(therapist[0]-patient[0],therapist[2]-patient[2]));
  actors.therapist.face(Math.atan2(patient[0]-therapist[0],patient[2]-therapist[2]));
  if(!manualView||state.view==='third'){
   setView('third',true);
   const centre=new THREE.Vector3((patient[0]+therapist[0])*.5,.98,(patient[2]+therapist[2])*.5);
   cameraMove.to.copy(centre).add(new THREE.Vector3(-Math.max(2.5,2.9*Math.max(1,$('scene').clientHeight)/Math.max(1,$('scene').clientWidth)),.38,-.06));cameraMove.target.copy(centre);
  }
  updateWriting();
 }
 if(!actors.patient.getState().footwearRemoval?.active){actors.patient.setFootwear?.((afterExams.has(node.id)||writing||state.completedAt)&&state.examShoesOn?'shoes':state.barefootPrepared?'barefoot':'shoes');}
 if(node.task?.type==='plantarScan'&&!state.exitLock&&!state.barefootPrepared&&!actors.patient.getState().footwearRemoval.active){startPreparation(false);return;}
 if(['act2','act3','act4','act5','act6','act7'].includes(act)&&node.id!=='__preparation'&&node.id!=='ankle_stress'&&node.id!=='arch_intro'&&!state.barefootPrepared&&state.evidence.includes('screening')&&state.evidence.includes('consent')&&!actors.patient.getState().footwearRemoval?.active&&(typeof filmSequence==='undefined'||!filmSequence.needsBriefing(node)))startPreparation(false);
}
function updateWriting(){
 const phase=document.body.dataset.soapWriting;if(!phase)return;
 const summary=soapSummary(state);
 const lines=phase==='P'?summary.P:summary.A.length?summary.A:[...summary.S.slice(-1),...summary.O.slice(0,2)];
 room.objects.writeCaseNote(phase,lines);
}
function drawRail(){ $('chapterRail').replaceChildren();for(const [id,label] of chapters){const b=button(String(chapters.findIndex(x=>x[0]===id)+1),()=>{});b.append(nodeEl('span','',label));const current=id===currentAct();b.classList.toggle('active',current);b.setAttribute('aria-label',label+' · 进度指示');if(current)b.setAttribute('aria-current','step');b.disabled=true;$('chapterRail').append(b);}}
function navigationAccess(act){
 if(!NAVIGATION_STAGES.some(stage=>stage.act===act))return{ok:false,reason:'unknown_stage'};
 if(REVIEW_NODE)return{ok:false,reason:'teacher_preview'};
 if(!actors?.ready||movement)return{ok:false,reason:'not_ready'};
 const working=hasStarted?state:(saved||state);
 if(working.exitLock)return{ok:false,reason:'safety_exit'};
 if(working.completedAt)return{ok:false,reason:'completed'};
 if(actors.patient.getState().footwearRemoval?.active)return{ok:false,reason:'preparing'};
 return{ok:true};
}
function rememberNavigationPosition(){
 if(!activeNode||!NAVIGATION_STAGES.some(stage=>stage.act===activeNode.act))return;
 state.navigationBookmarks=state.navigationBookmarks||{};
 state.navigationBookmarks[activeNode.act]={nodeId:activeNode.id,
  taskState:activeNode.task?{nodeId:activeNode.id,values:Object.fromEntries(stepBook),phase:taskPhase,pressureMode}:null,
  choiceLock:state.choiceLock?.nodeId===activeNode.id?{...state.choiceLock}:null};
}
function studyStep(step){
 const node=step.startsWith('rom:')?'rom_measure':step==='soap_review'?'plan_intro':step;
 const act=flow[node]?.act;
 if(!act)return;
 return jumpToAct(act==='debrief'?'act8':act,{step,node});
}
function jumpToAct(act,lesson=null){
 const access=navigationAccess(act);
 if(!access.ok){toast(({safety_exit:'本轮已因安全或意愿结束。可另开新接诊，原记录保留。',completed:'本轮已保存完成。可另开新接诊，原记录保留。',preparing:'请先看完脱鞋袜动作，再切换环节。',teacher_preview:'这是教师单项预览。请返回普通接诊后使用项目导引。',not_ready:'诊室还在准备，请稍候。'})[access.reason]||'当前无法进入该环节。');return access;}
 const wasStarted=hasStarted;
 if(!hasStarted){
  if(saved?.node){Object.assign(state,saved);queue=[...(state.events||[])];activeNode=flow[state.node]||null;stepBook.clear();if(state.taskState?.nodeId===activeNode?.id){for(const [key,value]of Object.entries(state.taskState.values||{}))stepBook.set(key,value);taskPhase=state.taskState.phase??.08;pressureMode=state.taskState.pressureMode||'static';}}
  hasStarted=true;state.taskReceipts=state.taskReceipts||{};state.records=state.records||[];
 }
 rememberNavigationPosition();
 state.preparationReturnNode=null;
 const stage=NAVIGATION_STAGES.find(item=>item.act===act),bookmark=state.navigationBookmarks?.[act];
 const restore=!lesson&&bookmark&&flow[bookmark.nodeId]?.act===act?bookmark:null;
 const targetId=lesson?.node||restore?.nodeId||stage.entry,fromNode=activeNode?.id||null,fromAct=activeNode?.act||null;
 if(!lesson&&wasStarted&&targetId===fromNode){closeProjectGuide();return{ok:true,unchanged:true,fromNode,toNode:targetId,fromAct,toAct:act,missedStages:[]};}
 const visitedActs=new Set((state.visited||[]).map(id=>flow[id]?.act));
 const missedStages=NAVIGATION_STAGES.slice(0,NAVIGATION_STAGES.findIndex(item=>item.act===act)).filter(item=>!visitedActs.has(item.act)).map(item=>item.act);
 const payload={fromNode,toNode:targetId,fromAct,toAct:act,missedStages,restoredBookmark:!!restore,sessionPreserved:true,notClinicalSkillAssessment:true};
 state.navigationJumps=state.navigationJumps||[];state.navigationJumps.push({at:now(),...payload});
 if(['act2','act3','act4','act5','act6','act7'].includes(act)&&(!state.barefootPrepared||wasStarted&&actors.patient.getState().footwear==='shoes'))state.barefootPrepared=false;
 if(restore){state.taskState=restore.taskState;state.choiceLock=restore.choiceLock;}else state.choiceLock=null;
 closeProjectGuide();state.paused=false;movement=null;taskRunning=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');
 state.pendingEntryEvidence=null;
 if(lesson){
  state.pickedNode=targetId;
  if(lesson.step.startsWith('rom:'))state.currentRomKey=lesson.step.slice(4);
 }else delete state.pickedNode;
 const go=()=>goto(targetId,{restoring:!!restore,navigation:true});
 if(lesson?.step==='soap_review')immersion.paper({id:targetId,go});else go();
 record('student_navigation_jump',{...payload,source:'clinic3d-v16-navigation',scope:'navigation_only_no_assessment_credit'});
 toast(restore?'已回到这一步的原位置；已有证据与操作记录保留。':'已进入所选环节。跳过的检查不会补记为完成。');
 return{ok:true,...payload};
}
function previousStep(){
 const stack=state.stepTrail||[];
 if(!stack.length&&mechanism){leaveMechanism();return;}if(!stack.length&&footArches){leaveFootArches();return;}
 if(!stack.length||state.exitLock||state.completedAt||actors?.patient.getState().footwearRemoval?.dressing)return;
 const frame=stack.pop();state.taskState=frame.task;state.choiceLock=frame.choice;
 speakerRole=null;filmSequence.clear();dialoguePlayer.stop();dialogueAudio.cancel();state.paused=false;
 goto(frame.id,{restoring:true,navigation:true,back:true});
}
$('previousStep').onclick=previousStep;
const afterExams=new Set(['plan_intro','synthesis','plan','plan_discussion','debrief','uncertainty','transfer','finish']);
function goto(id,{restoring=false,navigation=false,back=false}={}) {
 const picked=state.pickedNode===id;
 if(!picked)delete state.pickedNode;
 if(restoring&&state.withdrawal?.phase==='closed')id='history_closed';
 if(restoring&&id==='history'&&state.communicationRepairs?.history?.pending){
  const old=state.communicationRepairs.history;
  const next=flow.history.options.find(o=>o.id===old.optionId)?.next;
  if(flow[next]?.withdrawal){delete state.communicationRepairs.history;id=next;}
 }
 if(state.withdrawal && id!==state.exitReason && id!=='history_closed')return;
 if(!picked&&id==='rom_report'&&!romComplete(state.taskReceipts?.rom_measure))id='trial';
 if(!picked&&afterExams.has(id)&&!REVIEW_NODE&&!state.exitLock&&!state.completedAt){
  if(!state.examShoesOn){state.afterExamClose=id;id='exam_close';}
  else if(!state.examFeedbackDone&&activeNode?.id!=='exam_findings'){state.afterExamClose=id;id='exam_findings';}
 }
 if(!picked&&id==='plan_intro'&&activeNode?.id==='exam_findings'&&state.afterExamClose){id=state.afterExamClose;delete state.afterExamClose;}
 if(id==='teachback'||id==='plan_patient')id='debrief';
 gaitReview.clear();
 $('spokenPressureMap').hidden=true;
 if(id==='pressure_conditions')id='pressure_compare';
 if(!picked&&id==='local_explain'&&!state.taskReceipts?.wall_measure&&!state.exitLock)id='wall_measure';
 if(!picked&&!back&&!REVIEW_NODE&&!state.completedAt&&!state.exitLock){
  if(id==='exam_reasoning'||(id==='ankle_stress'&&(state.taskReceipts?.ankle_stress||state.skippedSteps?.ankle_stress)))id=nextAfterBedside();
  else if(id==='arch_intro'&&activeNode?.id==='ankle_stress'&&state.afterBedside)id=nextAfterBedside();
  if(state.taskReceipts?.arch_view?.subject==='therapist-demo')delete state.taskReceipts.arch_view;
  const finishedBones=state.taskReceipts?.arch_compare?.scope==='foot-arch-bone-selection';
  if(['arch_intro','arch_view','arch_compare'].includes(id)&&!finishedBones&&!state.taskReceipts?.ankle_stress&&!state.skippedSteps?.ankle_stress){
   id='ankle_stress';
  }else if(id==='arch_view'&&!finishedBones&&!state.skippedSteps?.arch_compare){
   id='arch_compare';
  }
 }
 if(!restoring&&!navigation&&!REVIEW_NODE&&id==='arch_concern'&&activeNode?.id==='arch_view'&&state.pressureResume){
  const resume=state.pressureResume;delete state.pressureResume;
  id=resume.nodeId;restoring=!!resume.taskState;
  if(restoring)state.taskState=resume.taskState;
 }
 if(!restoring&&!navigation&&state.clinicalResume&&((id==='local_intro'&&activeNode?.id==='ankle_stress'&&flow[state.clinicalResume]?.act==='act2')||(id==='muscle_intro'&&activeNode?.id==='local_explain'&&flow[state.clinicalResume]?.act==='act3'))){
  id=state.clinicalResume;delete state.clinicalResume;
  const bookmark=state.clinicalResumeBookmark;delete state.clinicalResumeBookmark;
  if(bookmark){state.taskState=bookmark;restoring=true;}
 }
 if(!picked&&restoring&&id==='injury_mechanism'&&!REVIEW_NODE&&!state.mechanismDraft&&!state.taskReceipts?.injury_mechanism&&!state.skippedSteps?.injury_mechanism&&!state.visited.includes('injury_question'))id='injury_question';
 const previewingLinkedStep=(practice==='alignment'&&['rom_measure','rom_report'].includes(id))||(REVIEW_NODE==='injury_mechanism'&&id==='injury_question')||(practice==='pressure_compare'&&['pressure_intro','cop_explain'].includes(id))||(practice==='gait_events'&&id==='gait_interpret');
 if(practice&&id!==practice&&!previewingLinkedStep){location.assign(reviewExit);return;}
 if(REVIEW_NODE&&id!==REVIEW_NODE&&!previewingLinkedStep&&!(REVIEW_NODE==='ankle_stress'&&id==='exam_reasoning')){toast('本页只预览这一项。返回主线可继续原接诊，预览不保存学习结果。');return;}
 if(!picked&&!back&&immersion?.beforeNode(id,()=>goto(id,{restoring,navigation})))return;
 actors?.patient.setEmotion('neutral');actors?.patient.endGesture();$('communicationState').hidden=true;delete $('conversation').dataset.communication;
 const node=flow[id];
 const restoredTask=restoring&&state.taskState?.nodeId===id?state.taskState:null;
 if(!node){toast('当前环节已结束，可查看本次 SOAP 病历。');return;}
 if(state.completedAt){const finalId=state.withdrawal?'history_closed':state.exitLock?'safe_finish':'finish';if(restoring&&id!==finalId)return goto(finalId,{restoring:true});if(!node.terminal){toast('本次学习已保存。');openDrawer('notes');return;}}
 const safetyNodes=['medical_stop','symptom_stop','decline_stop','safe_finish','history_closed','leave_arch','leave_stance'];
 if(node.withdrawal){
  state.exitLock=true;state.exitReason=id;
  state.withdrawal||={reason:node.withdrawal,phase:'reply'};
 }
 const retiredArchChoices=(id==='gait_interpret'&&['observe_only','power_from_picture','arch_to_sprain'].includes(state.choiceLock?.optionId))||['arch_compare','arch_concern','trial','local_explain','pressure_compare','cop_explain'].includes(id);
 const restoredChoice=restoring&&!retiredArchChoices&&state.choiceLock?.nodeId===id?state.choiceLock:null;
 if(restoring&&retiredArchChoices&&state.communicationRepairs?.[id]?.pending){
  state.communicationRepairs[id].pending=false;state.communicationRepairs[id].phase='superseded';
 }
 const restoringSafetyChoice=restoredChoice&&safetyNodes.includes(restoredChoice.nextId);
 if(state.exitLock&&!safetyNodes.includes(id)&&!restoringSafetyChoice){toast('本轮体能任务已结束，请保留停止原因并复盘。');return;}
 if(['medical_stop','symptom_stop','decline_stop','safe_finish'].includes(id)){state.exitLock=true;state.preparationReturnNode=null;if(!state.exitReason)state.exitReason=id;}
 if(!Array.isArray(state.stepTrail)){
  state.stepTrail=[];for(const e of state.events||[]){const n=e.payload?.nodeId;if(e.type==='clinic3d_node'&&flow[n]&&state.stepTrail.at(-1)?.id!==n)state.stepTrail.push({id:n});}
  if(state.stepTrail.at(-1)?.id===id)state.stepTrail.pop();
 }
 if(activeNode&&activeNode.id!==id&&!back){
  state.stepTrail.push({id:activeNode.id,choice:state.choiceLock,task:activeNode.task?{nodeId:activeNode.id,values:Object.fromEntries(stepBook),phase:taskPhase,pressureMode}:null});
 }
 const prev=$('previousStep');prev.hidden=false;prev.disabled=!state.stepTrail.length||!!state.completedAt||!!state.exitLock;
 if(activeNode?.id!==id)filmSequence.clear();
 learningBubbles?.hide();
 motionNarration?.dispose();motionNarration=null;
 const introReplay=$('motionIntroReplay');introReplay.hidden=true;
 if(splitPractice)$('line').after(introReplay);
 closeGoniometer?.();closeGoniometer=null;$('romReportTable')?.remove();$('wallReference')?.remove();$('finalPlanActions')?.remove();
 if(wallTape){wallTape.close();wallTape=null;visualZone='';}
 if(archObservation){archObservation.close();archObservation=null;visualZone='';}
 if(bedside)leaveBedside();
 if(activeNode?.id==='ankle_stress'&&state.skippedSteps?.ankle_stress)state.bedsideCheckpoint=null;
 if(mechanism)leaveMechanism();
 if(footArches)leaveFootArches();
 gaitDemo=null;scanStageFrame=null;actors?.patient.setStrengthTest(null);usageTracker?.flush();activeNode=node;state.node=id;state.autoDialogueNext=null;state.choiceLock=restoredChoice;selectedNext=null;taskRunning=false;stepBook.clear();if(!restoring)taskPhase=node.task?.type==='gait'?0:.08;if(restoredTask){for(const [k,v]of Object.entries(restoredTask.values||{}))stepBook.set(k,v);taskPhase=restoredTask.phase??.08;pressureMode=restoredTask.pressureMode||'static';}if(node.task?.type==='gait'&&restoring){
  const lastPhase=stepBook.get('lastGaitPhase');
  taskPhase=lastPhase&&stepBook.get('seen_'+lastPhase)===true&&['double','rightStance','rightSwing'].includes(lastPhase)?gaitExcerpt(lastPhase,3).phase:0;
 }
 actors?.patient.setGaitPhase?.(null);actors?.patient.setLocomotion?.(false);
 if(!state.visited.includes(id))state.visited.push(id);
 document.body.dataset.nodeKind=node.kind||'dialogue';document.body.dataset.node=id;document.body.dataset.act=currentAct();
 $('welcome').hidden=true;$('conversation').hidden=false;$('conversationBody').scrollTop=0;$('feedback').hidden=true;
 $('taskSurface').hidden=true;$('taskSurface').replaceChildren();$('options').replaceChildren();
 $('next').hidden=false;$('next').disabled=false;$('next').textContent='继续 →';
 const chapter=chapters.find(x=>x[0]===currentAct());
 $('chapterNumber').textContent=currentAct()==='debrief'?'教学复盘':(chapters.indexOf(chapter)+1)+' / '+NAVIGATION_STAGES.length+' · '+(chapter?.[1]||'接诊');
 $('chapterTitle').textContent=chapter?.[1]||'接诊';
 $('purpose').textContent=node.purpose||({'act1':'先了解患者的体验、安全与目标。','act2':'统一方法，再解释检查发现。','act3':'认识肌群，统一检查条件。','act4':'比较负重前后足弓外观。','act5':'同一时间轴，区分事件与推断。','act6':'先核对条件，再比较负荷记录。','act7':'先建立可保护的任务起点。','act8':'围绕目标，选择有依据的下一步。','debrief':'分清已知、未做与尚未证明。'}[currentAct()]);
 $('speaker').textContent=node.speaker||'林治疗师';
 $('taskLabel').textContent=node.kind==='task'?'观察与操作':node.kind==='summary'?'共同复盘':'';
 const conversationTurns=id==='arch_intro'?null:node.turns;
 const presentedText=conversationTurns?conversationTurns[0].text:typeof displayNodeText==='undefined'?node.text||'':displayNodeText(node);
 $('line').textContent=presentedText;$('progressText').textContent='已走过 '+state.visited.length+' 个对话与操作';
 actors.patient.root.visible=id!=='history_closed';room.setOccupied(actors.patient.root.visible);room.objects.door.rotation.y=0;
 setVisual(node);updateComposition();lessonUI.presentNode(node);immersion?.enterNode(node);if(restoring){actors.patient.setPose(actors.patient.getState().pose,true);actors.therapist.setPose(actors.therapist.getState().pose,true);}drawRail();addEvidence([]);
 if(!restoring){
  if(conversationTurns){for(const turn of conversationTurns)appendLine(turn.speaker==='patient'?'陈女士':'林治疗师',turn.text,node.kind);}
  else appendLine(node.speaker||'林治疗师',presentedText,node.kind);
  if(node.evidence&&!navigation&&!node.terminal)state.pendingEntryEvidence=id;
  if(node.record&&!navigation)state.records.push({nodeId:id,...node.record});
  record('clinic3d_node',{nodeId:id,act:currentAct(),kind:node.kind,record:!navigation?node.record||null:null,navigationEntry:navigation});
 }
 if(id==='muscle_match'&&!REVIEW_NODE&&!contactReady()){
  $('taskSurface').hidden=false;
  $('taskSurface').append(nodeEl('p','','开始抗阻操作前，需要完成安全询问并取得患者同意。'),button('补做检查前问诊',returnToIntake));
 }else if(id==='arch_view'){$('taskDock').hidden=true;}else if(node.task){renderTask(node.task);if(!['muscle_match','pressure_compare','gait_events'].includes(id))addPractice($('taskSurface'),id,sampleGait,answer=>record('clinic3d_case_question',{nodeId:id,...answer}));}
 $('skipStep').hidden=!!state.completedAt;
 if(id==='arch_compare'&&REVIEW_NODE)queueMicrotask(enterFootArches);
 if(id==='injury_mechanism'){
   $('taskDock').hidden=false;$('taskSurface').hidden=false;
   const start=button('打开右踝模型练习',enterMechanism);start.dataset.openMechanism='true';$('taskSurface').append(start);
   queueMicrotask(enterMechanism);
 }
 if(id==='exam_reasoning'){
   $('taskSurface').hidden=false;$('taskDock').hidden=false;
   $('taskSurface').append(differentialPanel(payload=>record('clinic3d_differential_practice',payload),{includeCurrent:false}));
 }
 if(node.options?.length){$('next').hidden=true;if(id==='gait_interpret')$('options').append(nodeEl('p','consent-choice-prompt','刚刚治疗师表达的意思是什么？'));if(id==='consent_reply')$('options').append(nodeEl('p','consent-choice-prompt','她担心碰到旧伤会疼。你会怎样回应？'));for(const option of node.options){const b=button(option.shortLabel||option.label,()=>choose(option,b));b.dataset.option=option.id;b.dataset.number=String(node.options.indexOf(option)+1).padStart(2,'0');b.disabled=!!restoredChoice||!!state.completedAt;b.classList.toggle('selected',restoredChoice?.optionId===option.id);$('options').append(b);}if(restoredChoice){const option=node.options.find(x=>x.id===restoredChoice.optionId);selectedNext=restoredChoice.nextId;$('feedback').textContent=option?.feedback||'已恢复上次选择，请继续当前路线。';$('feedback').hidden=false;$('next').hidden=false;$('next').textContent=option?.retry?'重新核对 →':'继续 →';}}
 else selectedNext=node.next;
 if(['plantarScan','gait'].includes(node.task?.type))paintTask();
 if(node.terminal||(!node.next&&!node.options?.length)){$('next').hidden=false;$('next').textContent='保存本次学习 →';selectedNext='__complete';}
 if(node.withdrawal||id==='history_closed'){
  filmSequence.clear();learningBubbles?.hide();$('coach').hidden=true;$('taskDock').hidden=true;$('skipStep').hidden=true;
  if(id==='history_closed'){
   actors.patient.root.visible=false;
   document.body.dataset.departure='closed';
   const message='陈女士已离开诊室。本次问诊提前结束。离开原因：'+state.withdrawal.reason+'。';
   dialoguePlayer.showPrompt(message,id);
   const reflection=button('对每一个患者都应做到工作细致入微，一丝不苟。',enterMechanism);
   reflection.id='continueAfterDeparture';reflection.dataset.number='01';
   reflection.setAttribute('aria-describedby','departureDestination');
   const destination=nodeEl('small','','下一项：右踝扭伤机制模型练习');destination.id='departureDestination';
   $('options').replaceChildren(reflection,destination);
   if(restoring&&state.withdrawal.modelOpen)queueMicrotask(enterMechanism);
   $('next').textContent=state.completedAt?'查看完成情况':'提交本次学习';
  }else{
   $('next').hidden=true;movement=null;
   if(state.withdrawal.phase==='walking')startDeparture();
   else{document.body.dataset.departure='reply';dialoguePlayer.loadSequence([{speaker:'patient',text:node.text}],id,{wholeTurns:true});}
  }
  persist();return;
 }
 if(state.communicationRepairs?.[id]?.pending){state.choiceLock=null;selectedNext=null;playPatientReaction(state.communicationRepairs[id],true);persist();return;}
 if(id==='ankle_stress'){
  activeNode.revisitingBedside=back||picked;
  $('taskSurface').hidden=true;$('taskDock').hidden=true;$('coach').hidden=true;
  $('next').hidden=false;$('next').textContent=bedsideActionLabel();
  const ready=REVIEW_NODE||contactReady();
  dialoguePlayer.showPrompt(ready?'准备床旁查体。':'点击“继续”，核对安全情况并征得陈女士同意后，就可以开始床旁查体。',id);
  if(!ready)$('options').append(button('补做检查前问诊',returnToIntake));
  if(ready)queueMicrotask(enterBedside);
  persist();return;
 }
 if(picked&&id==='local_explain'&&!state.taskReceipts?.wall_measure){
  filmSequence.clear();dialoguePlayer.showPrompt('本次还没有双侧弓步距离。完成软尺测量后，可在这里比较两侧结果。',id);
  $('options').replaceChildren(button('前往软尺测量',()=>studyStep('wall_measure')));$('next').hidden=true;persist();return;
 }
 if(caseWorkshops[id]){
  filmSequence.clear();dialoguePlayer.showPrompt(node.text,id);$('next').hidden=true;
  $('taskDock').hidden=true;$('learningGuide').hidden=true;
  const wrap=nodeEl('div');wrap.id='finalPlanActions';$('line').after(wrap);
  mountWorkshop({host:wrap,id,state,save:persist,record,finish(){
   if(activeNode?.id!==id)return;
   state.taskReceipts[id]={at:now(),scope:'case-workshop',values:{...state.workshopDrafts[id]}};
   markLearningStep(state,id);if(state.skippedSteps)delete state.skippedSteps[id];
   record('clinic3d_task_completed',{nodeId:id,scope:'case-workshop'});persist();goto(node.next);
  }});persist();return;
 }
 if(id==='gait_events'){
  filmSequence.offerGaitTask(node,$('taskSurface'));persist();return;
 }
 if(id==='arch_intro'){
  if(!filmSequence.present({...node,text:presentedText},{restoring}))dialoguePlayer.loadSequence([{speaker:'therapist',text:presentedText}],id,{wholeTurns:true});
  persist();return;
 }
 if(conversationTurns){filmSequence.clear();dialoguePlayer.loadSequence(conversationTurns,id,{wholeTurns:id==='trial'});persist();return;}
 if(id==='exam_close'){
  $('next').hidden=true;filmSequence.clear();dialoguePlayer.loadSequence([{speaker:'therapist',text:node.text}],id,{wholeTurns:true});persist();return;
 }
 if(id==='exam_findings'){
  state.examShoesOn=true;actors.patient.setFootwear('shoes');filmSequence.clear();
  const turns=spokenFindings(state);dialoguePlayer.loadSequence(turns,id);persist();return;
 }
 if(id==='synthesis'){
  filmSequence.clear();dialoguePlayer.showPrompt('陈女士的功能评定',id);$('next').hidden=true;$('taskDock').hidden=true;
  const wrap=nodeEl('div');wrap.id='finalPlanActions';$('line').after(wrap);
  mountAssessment({host:wrap,state,summary:soapSummary(state),save:persist,submit(fields){
    state.assessmentDraft=fields;state.taskReceipts.synthesis={...fields,scope:'written-assessment',at:now()};
    record('clinic3d_assessment_submitted',{nodeId:id,...fields});
    markLearningStep(state,id);goto('plan');
  }});persist();return;
 }
 if(id==='plan'){
  filmSequence.clear();dialoguePlayer.showPrompt(node.text,id);$('next').hidden=true;$('taskDock').hidden=true;
  const wrap=nodeEl('div');wrap.id='finalPlanActions';$('line').after(wrap);
  presentPlan({state,host:wrap,save:persist,record,next(){markLearningStep(state,'plan');goto('plan_discussion');}});persist();return;
 }
 if(id==='plan_discussion'){
  filmSequence.clear();const play=()=>dialoguePlayer.loadSequence(planTurns(state),id,{wholeTurns:true});
  const actions=nodeEl('div','clinical-nav');actions.id='finalPlanActions';
  actions.append(button('回看训练视频',()=>{dialoguePlayer.stop();dialogueAudio.cancel();trainingFilm({state,record,onReturn:()=>{if(activeNode?.id===id)play();}});}));
  $('line').after(actions);
  if(!state.trainingFilmOffered){state.trainingFilmOffered=true;dialoguePlayer.showPrompt('观看训练视频后，听听治疗师怎样和陈女士商量下一步。',id);trainingFilm({state,record,onReturn:()=>{if(activeNode?.id===id)play();}});}else play();
  persist();return;
 }
 if(id==='finish'){
  const actions=nodeEl('div','clinical-nav');actions.id='finalPlanActions';
  if(!state.completedAt && !state.writtenPlan?.submitted){
   actions.append(button('回到治疗计划',()=>goto('plan',{navigation:true})));
  }
  actions.append(button('回看训练视频',()=>{dialoguePlayer.stop();dialogueAudio.cancel();trainingFilm({state,record});}));
  actions.append(button('回听医患计划对话',()=>{filmSequence.clear();dialoguePlayer.loadSequence(planTurns(state),'finish:review',{wholeTurns:true});}));
  $('line').after(actions);filmSequence.clear();dialoguePlayer.showPrompt(state.completedAt?'本次学习已提交。':'本轮接诊结束，可以提交并查看完成情况。',id);
  $('taskDock').hidden=true;$('next').textContent=state.completedAt?'查看完成情况':'提交本次学习';persist();return;
 }
 if(id==='rom_measure'){
  filmSequence.clear();dialoguePlayer.showPrompt(node.text,id);$('next').hidden=true;
  $('taskDock').hidden=false;$('taskSurface').hidden=false;
  $('dockTitle').textContent='半圆量角器 · 双侧活动度';$('coach').hidden=true;
  const receipt=state.taskReceipts.rom_measure?.scope==='simulated-goniometry'?state.taskReceipts.rom_measure:{scope:'simulated-goniometry',readings:{}};
  speak('林治疗师',node.text);
  closeGoniometer=mountGoniometer({host:$('taskSurface'),receipt,initialKey:(picked||restoring)?state.currentRomKey:null,onTrial(key){state.currentRomKey=key;persist();},voice:text=>speak('林治疗师',text),isPaused:()=>state.paused,
    onRead(t){state.taskReceipts.rom_measure=receipt;record('clinic3d_rom_reading',{nodeId:id,side:t.side,mode:t.mode,motion:t.move.key,degrees:t.angle});persist();},
    onDone(){if(romComplete(receipt)){record('clinic3d_task_completed',{nodeId:id,scope:receipt.scope});goto('rom_report');}}});
  persist();return;
 }
 if(id==='rom_report'){
  const panel=romTable(state.taskReceipts.rom_measure);panel.id='romReportTable';$('line').after(panel);
  if(!romComplete(state.taskReceipts.rom_measure)){
   filmSequence.clear();dialoguePlayer.showPrompt('表中列出了已记录的读数。完成双侧测量后，可以听取完整报告。',id);
   $('next').hidden=true;$('options').replaceChildren(button('继续量角器测量',()=>goto('rom_measure',{navigation:true})));persist();return;
  }
  filmSequence.clear();dialoguePlayer.loadSequence(romReport.map(text=>({speaker:'therapist',text})),id,{wholeTurns:true});persist();return;
 }
 if(id==='wall_adjust')$('line').after(wallReference());
 if(id==='wall_measure'){
  filmSequence.clear();dialoguePlayer.showPrompt(node.text,id);$('next').hidden=true;
  beginWallMeasurement();persist();return;
 }
 if(id==='arch_view'){
  $('next').hidden=true;
  if(!filmSequence.present(node,{restoring})){dialoguePlayer.showPrompt(node.text,id);showArchObservation();}
  persist();return;
 }
 if(motionNarration&&id!=='alignment')motionNarration.start(false);
 if(id==='alignment'&&motionNarration){
  filmSequence.clear();dialoguePlayer.showPrompt(presentedText,id);
  if(splitPractice)$('taskSurface').prepend(introReplay);
  introReplay.hidden=false;motionNarration.start();persist();return;
 }
 const filmTrigger=restoredChoice&&!node.options?.find(option=>option.id===restoredChoice.optionId)?.retry?'choice':'entry';
 if(typeof filmSequence==='undefined'||!filmSequence.present(node,{restoring,trigger:filmTrigger})){if(voiceRole(node.speaker))dialoguePlayer.load(presentedText,node.speaker,node.id);else dialoguePlayer.showPrompt(presentedText,node.id);}if(actors?.patient.getState().footwearRemoval?.active)$('next').disabled=true;persist();
}
function choose(option,b) {
 if(typeof filmSequence!=='undefined'&&dialoguePlayer.getState().pending){toast('先听完这段交流，再选择如何回应。');return;}
 if(actors?.patient.getState().footwearRemoval?.active){toast('请等患者坐稳、脱好鞋袜，再继续。');return;}
 if(state.completedAt){toast('本次学习已保存。');return;}
 if(selectedNext)return;
 if(state.exitLock&&!['medical_stop','symptom_stop','decline_stop','safe_finish'].includes(activeNode.id))return;
 if(!REVIEW_NODE&&['act2','act3','act4','act5','act6','act7'].includes(activeNode.act)&&!state.barefootPrepared&&!ensurePreparation())return;
 if(option.requiresTask&&!taskComplete()){toast('请先完成上方观察与核对，再选择下一步。');record('clinic3d_task_needed',{nodeId:activeNode.id,optionId:option.id});return;}
 if(option.requiresEvidence?.some(id=>!state.evidence.includes(id))){toast('当前没有取得这项依据，可先补齐评估或选择其他合理方向。');return;}
 const previous=state.communicationRepairs?.[activeNode.id];
 const priorCount=previous?.attempts||0;
 const reaction=(option.retry||option.good===false)?reactionFor(option.id,priorCount+1):null;
 document.querySelectorAll('#options button').forEach(x=>{x.classList.toggle('selected',x===b);x.disabled=true;});
 appendLine('我的选择',option.label,'choice');
 record('clinic3d_choice',{nodeId:activeNode.id,optionId:option.id,label:option.label,good:option.good??null,safe:option.safe??null,record:option.record||null});
 if(flow[option.next]?.withdrawal){
  delete state.communicationRepairs?.history;
  goto(option.next);return;
 }
 if(reaction){
  state.communicationRepairs||={};
  const repair={nodeId:activeNode.id,optionId:option.id,attempts:priorCount+1,pending:true,phase:'reaction',reaction,selectedText:option.shortLabel||option.label};
  state.communicationRepairs[activeNode.id]=repair;state.choiceLock=null;selectedNext=null;
  record('clinic3d_communication_reaction',{nodeId:activeNode.id,optionId:option.id,attempt:repair.attempts,kind:reaction.kind,emotion:reaction.emotion,reply:reaction.text,scope:'authored_communication_practice',notClinicalSkillScore:true});
  playPatientReaction(repair);persist();return;
 }
 selectedNext=option.next||activeNode.next;if(option.retry&&!selectedNext)selectedNext=activeNode.id;
 state.choiceLock={nodeId:activeNode.id,optionId:option.id,nextId:selectedNext,chosenAt:now()};
 if(['medical_stop','symptom_stop','decline_stop','safe_finish'].includes(selectedNext)){state.exitLock=true;if(!state.exitReason)state.exitReason=selectedNext;}
 if(option.evidence)addEvidence(Array.isArray(option.evidence)?option.evidence:[option.evidence]);
 if(option.record)state.records.push({nodeId:activeNode.id,optionId:option.id,...option.record});
 if(option.planDomain)state.records.push({planDomain:option.planDomain,supports:option.supports?.filter(id=>state.evidence.includes(id))||[]});
 if(document.body.dataset.soapWriting)updateWriting();
 $('feedback').textContent=option.feedback||'已记录您的选择。';$('feedback').hidden=false;
 $('next').hidden=false;$('next').textContent=option.retry?'重新核对 →':'继续 →';
 if((activeNode.id==='plan'&&option.planDomain)||['scan_reading','events_done'].includes(option.id)){continueEncounter();return;}
 if(previous?.pending&&!option.retry&&option.good!==false){
  previous.pending=false;previous.phase='repaired';previous.repairedAt=now();previous.correctedOption=option.id;
  record('clinic3d_communication_repaired',{nodeId:activeNode.id,optionId:option.id,attempts:previous.attempts,notClinicalSkillScore:true});
  $('communicationState').hidden=false;$('communicationState').dataset.tone='calm';$('communicationState').textContent='已回应患者顾虑 · 继续共同商量';
  actors?.patient.setEmotion?.('neutral');
  const reply=option.id==='explain_consent'?replies.explain_consent:repairSpoken(option,previous.optionId);if(reply){appendLine('林治疗师',reply,'communication-repair');dialoguePlayer.loadSequence([{speaker:'therapist',text:reply}],activeNode.id+':repair-accepted',{wholeTurns:option.id==='explain_consent'});}else{dialoguePlayer.showPrompt(option.shortLabel||option.label,activeNode.id+':repair-accepted');}
 }else if(!option.retry&&typeof filmSequence!=='undefined'&&filmSequence.present(activeNode,{trigger:'choice'})){
  // The dialogue for this scene already answers the patient.
 }else if(option.id==='shared_stop'){
  const text='我先扶好，停下来，不会硬撑着练。';appendLine('林治疗师',replies.shared_stop);appendLine('陈女士',text);dialoguePlayer.loadSequence([{speaker:'therapist',text:replies.shared_stop},{speaker:'patient',text}],activeNode.id+':teachback');
 }else if(replies[option.id]){
  const line=replies[option.id];appendLine('林治疗师',line,'dialogue');
  dialoguePlayer.loadSequence([{speaker:'therapist',text:line}],activeNode.id+':'+option.id,{wholeTurns:option.id==='explain_consent'});
 }else{
  $('speaker').textContent='学习操作';$('speakerAvatar').textContent='你';$('conversation').dataset.speaker='student';$('dialogueKind').textContent='你的选择';
  dialoguePlayer.showPrompt(option.shortLabel||option.label,activeNode.id+':'+option.id);
 }
 persist();
}
function playPatientReaction(repair,restoring=false){
 if(!activeNode||repair.nodeId!==activeNode.id)return;
 repair.reaction=reactionFor(repair.optionId,repair.attempts)||repair.reaction;repair.phase='reaction';taskRunning=false;selectedNext=null;
 $('next').hidden=true;$('feedback').hidden=true;$('filmCue').hidden=true;$('filmHandoff').hidden=true;
 $('communicationState').hidden=false;$('communicationState').dataset.tone=repair.reaction.emotion;
 $('communicationState').textContent=repair.reaction.emotion==='upset'?'患者表达不满 · 先倾听，再回应':'患者有顾虑 · 请听完后重新回应';
 $('conversation').dataset.communication='repair';actors?.patient.setEmotion?.(repair.reaction.emotion);
 document.querySelectorAll('#options button').forEach(x=>x.disabled=true);
 const turns=[];
 if(!restoring&&spokenCommunicationChoices.has(repair.optionId)){
  turns.push({speaker:'therapist',text:repair.selectedText});
  appendLine('林治疗师',repair.selectedText,'dialogue');
 }
 if(!restoring)appendLine('陈女士',repair.reaction.text,'patient-reaction');
 turns.push({speaker:'patient',text:repair.reaction.text});
 dialoguePlayer.loadSequence(turns,activeNode.id+':patient-reaction');
}
function offerRepair(){
 const repair=state.communicationRepairs?.[activeNode?.id];if(!repair?.pending)return false;
 repair.phase='respond';selectedNext=null;state.choiceLock=null;
 $('next').hidden=true;$('options').replaceChildren();
 for(const option of activeNode.options||[]){const b=button(repairLabel(option,repair.optionId),()=>choose(option,b));b.dataset.option=option.id;$('options').append(b);}
 $('taskLabel').textContent='请重新回应';
 $('communicationState').textContent='先回应顾虑，再说明理由。您可以重新选择。';
 persist();return true;
}

function taskComplete() {
 const task=activeNode.task;if(!task)return true;let valid=true;
 if(task.type==='goniometer')valid=motionComplete(stepBook);
 if(task.type==='muscle')valid=strengthComplete(stepBook);
 if(task.type==='archPostures')return state.taskReceipts?.arch_view?.scope==='arch-posture-comparison';
 if(task.type==='arch')return state.taskReceipts?.arch_compare?.scope==='foot-arch-bone-selection';
 if(task.type==='gait')valid=gaitPhasesComplete(stepBook);
 if(task.type==='pressure')valid=task.stage==='conditions'?stepBook.has('mode'):stepBook.has('region')&&Number(stepBook.get('dynamicMax')||0)-Number(stepBook.get('dynamicMin')||0)>=.15;
 if(task.type==='plantarScan')valid=scanReady()&&stepBook.get('plantarScan')===true;
 if(task.type==='staticCOP')valid=stepBook.get('cop71_interpreted')===true&&stepBook.get('cop71_open')===true&&stepBook.get('cop71_closed')===true;
 if(task.type==='balance')valid=(task.checklist||[]).every((_,i)=>stepBook.get('check'+i));
 if(valid){state.taskReceipts[activeNode.id]={at:now(),values:Object.fromEntries(stepBook),scope:({gait:'gait-cycle-phases',plantarScan:'case-plantar-scan',muscle:'simulated-ankle-strength',goniometer:'ankle-motion-knowledge',staticCOP:'static-balance-interpretation'})[task.type]||'teaching-operation-only'};record('clinic3d_task_completed',{nodeId:activeNode.id,...state.taskReceipts[activeNode.id]});}
 return valid;
}
function complete(){
 if(!activeNode?.terminal)return;
 void submitEncounter({state,profile,save:saveFinalEncounter});
}
function saveFinalEncounter(partial){
 if(state.completedAt)return;state.completedAt=now();$('skipStep').hidden=true;$('previousStep').disabled=true;$('next').textContent='查看完成情况';const skipped=Object.keys(state.skippedSteps||{});record(partial?'clinic3d_partial_review_saved':'clinic3d_learning_complete',{skipped,caseId:'cai',completedAt:state.completedAt,visited:state.visited,evidence:state.evidence,reflection:state.reflection,notClinicalSkillAssessment:true});try{const list=JSON.parse(localStorage.getItem('dxx_encounter_completed_v1')||'[]');list.push({partial,progress:encounterProgress(state).percent,id:state.sessionId,caseId:'cai',student:profile,source:'clinic3d-v14',completedAt:state.completedAt,summary:{...(state.withdrawal?{withdrawal:state.withdrawal.reason}:{}),visited:state.visited,evidence:state.evidence,reflection:state.reflection,notClinicalSkillAssessment:true}});localStorage.setItem('dxx_encounter_completed_v1',JSON.stringify(list.filter((x,i,arr)=>arr.findIndex(y=>y.id===x.id)===i)));}catch{}toast('本次学习已保存。');}
const knockAudio=new Audio(new URL('./assets/door-knock.wav',import.meta.url));
function arrivalCamera(eye,look){
 cameraMove=null;camera.clearViewOffset();camera.position.set(...eye);controls.target.set(...look);
 camera.lookAt(controls.target);controls.enabled=false;controls.enableDamping=false;controls.update();
}
function intro(){
 hasStarted=true;state.node=START_NODE;
 if(!state.arrivalPending)record('clinic3d_reception_started');
 state.arrivalPending=true;persist();
 const a=room.anchors,seat=a.patientSeat,outside=[-1.63,0,-3.44];
 const curve=points=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const inside=[-1.47,0,-1.96],release=[-1.10,0,-2.54];
 $('welcome').hidden=true;$('conversation').hidden=true;
 document.body.dataset.arrival='knock';room.setOccupied(false);room.objects.door.rotation.y=0;
 actors.patient.root.visible=true;actors.therapist.root.visible=true;
 actorPose(actors.patient,'standing',outside,0,true);actorPose(actors.therapist,'seated',a.therapistSeat,0,true);
 movement={time:0,taps:0,phase:'knock',inside,release,hand:handRest(actors.patient,'R'),
  entrance:curve([outside,[-1.63,0,-2.98],[-1.56,0,-2.42],inside]),
  toChair:curve([release,[-.76,0,-1.52],[.12,0,-.71],[seat[0],0,seat[2]+.36],seat])};
 state.view='third';arrivalCamera([-.68,1.75,-5.40],[-1.63,1.74,-3.12]);
}
function advanceArrival(dt){
 const m=movement;m.time+=dt;
 const p=actors.patient,d=actors.therapist,door=room.objects.door;
 const next=phase=>{m.phase=phase;m.time=0;document.body.dataset.arrival=phase;};
 if(m.phase==='knock'){
  p.setKnock(Math.min(m.time,1.7));
  if(m.taps<2&&m.time>=[.62,1.14][m.taps]){
   m.taps++;if($('voice').getAttribute('aria-pressed')==='true'){knockAudio.currentTime=0;knockAudio.play().catch(()=>{});}
  }
  if(m.time<1.72)return;
  p.setKnock(null);next('open');
  d.setPose('standing');d.face(-1.08);
  arrivalCamera([1.84,1.72,2.47],[-.32,1.0,-2.25]);
 }else if(m.phase==='open'){
  const f=THREE.MathUtils.smoothstep(m.time,0,.8);door.rotation.y=-Math.PI*.43*f;
  if(f===1){p.setLocomotion(true,true);next('enter');}
 }else if(m.phase==='enter'){
  const f=Math.min(m.time/1.64,1);walkRoute(p,m.entrance,f);
  if(f===1){p.setLocomotion(false);m.fromYaw=p.root.rotation.y;next('turn');arrivalCamera([.21,1.53,-.69],[-1.62,1.07,-2.51]);}
 }else if(m.phase==='turn'||m.phase==='close'){
  const closing=m.phase==='close',f=closing?THREE.MathUtils.smoothstep(m.time,.08,1.52):0;
  door.rotation.y=-Math.PI*.43*(1-f);
  const handle=room.objects.doorHandle.getWorldPosition(new THREE.Vector3());
  const x=THREE.MathUtils.lerp(m.inside[0],m.release[0],f),z=THREE.MathUtils.lerp(m.inside[2],m.release[2],f);
  p.setPosition([x,0,z]);
  const yaw=Math.atan2(handle.x-x,handle.z-z);
  const turnWeight=closing?1:THREE.MathUtils.smoothstep(m.time,0,.62);
  p.face(m.fromYaw+turnWeight*Math.atan2(Math.sin(yaw-m.fromYaw),Math.cos(yaw-m.fromYaw)));
  m.grip=turnWeight*(closing?1-THREE.MathUtils.smoothstep(m.time,1.55,1.92):1);
  if(!closing&&turnWeight===1)next('close');
  if(closing&&m.time>=1.92){m.grip=0;door.rotation.y=0;p.setLocomotion(true,true);next('walk');arrivalCamera([2.62,1.76,1.92],[.28,.98,-1.65]);}
 }else if(m.phase==='walk'){
  const f=Math.min(1,m.time/3.15);walkRoute(p,m.toChair,f);
  if(f===1){
   actorPose(p,'seated',room.anchors.patientSeat,Math.PI);
   actorPose(d,'seated',room.anchors.therapistSeat,0);next('sit');
  }
 }else if(m.phase==='sit'&&p.getState().sitting>=.999&&d.getState().sitting>=.999)finishIntro();
}
function poseArrivalHand(){
 if(!movement?.grip)return;
 const handle=room.objects.doorHandle,contact=handle.getWorldPosition(new THREE.Vector3());
 const along=new THREE.Vector3(1,0,0).applyQuaternion(room.objects.door.quaternion);
 placeHand(actors.patient,'R',movement.hand,contact,along,new THREE.Vector3(0,-1,0),movement.grip);
}
function finishIntro(){
 if(!movement)return;movement=null;delete document.body.dataset.arrival;delete state.arrivalPending;
 actors.patient.setKnock(null);room.objects.door.rotation.y=0;room.setOccupied(true);
 actorPose(actors.patient,'seated',room.anchors.patientSeat,Math.PI,true);
 actorPose(actors.therapist,'seated',room.anchors.therapistSeat,0,true);visualZone='consult';
 setView(manualView||'third');goto(START_NODE);
}
function walkRoute(actor,curve,travel){
 const point=curve.getPointAt(travel),direction=curve.getTangentAt(travel);
 actor.setPosition(point).face(Math.atan2(direction.x,direction.z));
 if(actor===actors.patient)room.setOccupied(point.z>=-3);
}
let departureWalk=null;
function startDeparture(){
 if(departureWalk||!activeNode?.withdrawal)return;
 state.withdrawal.phase='walking';
 document.body.dataset.departure='walking';document.body.removeAttribute('data-interview');
 $('conversation').hidden=true;actors.setTalking(null);
 const patient=actors.patient,seat=room.anchors.patientSeat,door=room.anchors.entrance;
 const path=[seat,[seat[0],0,seat[2]+.5],[-.35,0,-.67],[-1.4,0,-1.65],door,[door[0],0,-3.55]];
 departureWalk={time:0,stepping:false,curve:new THREE.CatmullRomCurve3(path.map(x=>new THREE.Vector3(...x)))};
 actorPose(patient,'standing',seat,null);patient.setEmotion('upset');
 setView('third',true);cameraMove=null;camera.clearViewOffset();
 camera.position.set(1.15,1.85,2.85);controls.target.set(-.62,.94,-1.48);camera.lookAt(controls.target);controls.update();
 persist();
}
function updateDeparture(dt){
 if(!departureWalk)return;
 const walk=departureWalk;
 if(actors.patient.getState().sitting>.01)return;
 walk.time+=dt;
 if(!walk.stepping){actors.patient.setLocomotion(true,true);walk.stepping=true;}
 const travel=Math.min(1,walk.time/4.6);
 room.objects.door.rotation.y=-Math.PI*.43*THREE.MathUtils.smoothstep(travel,.44,.68);
 walkRoute(actors.patient,walk.curve,travel);
 if(travel<1)return;
 actors.patient.setLocomotion(false);actors.patient.root.visible=false;departureWalk=null;
 state.withdrawal.phase='closed';
 state.records.push({nodeId:activeNode.id,completion:'patient_withdrew',reason:state.withdrawal.reason,physicalTasks:'not_performed'});
 record('clinic3d_patient_departed',{nodeId:activeNode.id,reason:state.withdrawal.reason});
 goto('history_closed');
}
function approachPlatform(dt){
 if(!platformEntry||visualZone!=='posturography')return;
 const plate=room.anchors.forcePlate;
 platformEntry.elapsed+=dt;
 const progress=Math.min(1,platformEntry.elapsed/2.5);
 const z=THREE.MathUtils.lerp(room.anchors.balanceApproach[2],plate[2],progress);
 const stepUp=THREE.MathUtils.smoothstep(progress,.15,.45);
 actors.patient.setPosition([plate[0],plate[1]*stepUp,z]);
 if(progress>.40)actors.patient.setClinicalPose('rail-hold');
 if(progress>=1){
  actors.patient.setLocomotion(false);platformEntry=null;
 }
}
function syncMotionAudio(){
 if(motionNarration)motionNarration.setPaused(document.hidden||state.paused||!$('filmOverlay').hidden||!$('projectGuide').hidden||!$('teacher').hidden||lessonUI.anatomyIsOpen()||learningHub.isOpen());
}
document.addEventListener('visibilitychange',syncMotionAudio);
function animate(t){requestAnimationFrame(animate);syncMotionAudio();if(mechanism||footArches){lastDraw=t;return;}if(t-lastDraw<32)return;lastDraw=t;if(!$('spokenGait').hidden)gaitReview.sync();const realDelta=(t-last)/1000,dt=Math.min(realDelta,.05);last=t;if(strengthBed){
 const info=strengthBed.update(state.paused?0:Math.min(realDelta,.12));
 cameraMove=null;strengthCamera.aim(state.view,strengthBed.aim(state.view));strengthBed.showHands(camera);
 document.body.dataset.strengthPosture=info.posture;document.body.dataset.strengthHands=info.fixedHand+','+info.resistHand;document.body.dataset.strengthContact=[info.fixedGap,info.contactGap].map(n=>n.toFixed(3)).join(',');document.body.dataset.strengthMuscles=info.projection.join(',');
 if(!lessonUI.anatomyIsOpen()&&!learningHub.isOpen())renderer.render(scene,camera);return;
 }if(bedside){bedside.tick(Math.min(realDelta,.5));renderClinicView();return;}if(!state.paused){elapsed+=dt;if(actors&&elapsed>talkUntil)actors.setTalking(null);if(movement)advanceArrival(Math.min(realDelta,.15));updateDeparture(Math.min(realDelta,.35));approachPlatform(Math.min(realDelta,.12));actors?.update(departureWalk?Math.min(realDelta,.1):dt,Math.min(realDelta,.5));poseArrivalHand();archObservation?.tick();
 if(wallTape){wallTape.tick(Math.min(realDelta,.15));}
 if(gaitDemo){advanceGaitPhase(Math.min(realDelta,.18));}
 if(taskRunning){const rate=pressureMode==='static'?1/8:.25/(2*GAIT_CASE.cycleSeconds);taskPhase=Math.min(1,taskPhase+dt*rate);if(taskPhase>=1)taskRunning=false;stepBook.set('observed',true);const slider=$('taskPhase');if(slider)slider.value=String(taskPhase);if(t-lastPressurePaint>100||!taskRunning){paintTask();lastPressurePaint=t;}}syncGaitVisual();updatePreparation();
 }
 if(cameraMove&&!wallTape?.tracking){const v=cameraMove.duration?Math.min((t-cameraMove.at)/cameraMove.duration,1):1,k=v*v*(3-2*v);camera.position.lerpVectors(cameraMove.from,cameraMove.to,k);controls.target.lerpVectors(cameraMove.look,cameraMove.target,k);camera.lookAt(controls.target);if(v>=1){cameraMove=null;controls.enabled=state.view==='third';controls.enableDamping=state.view==='third';}}
 if(actors)actors.therapist.root.visible=(hasStarted||REVIEW_NODE)&&(!!document.body.dataset.soapWriting||state.view==='third'||!!archObservation||!!wallTape?.tracking)&&!actors.patient.getState().footwearRemoval?.active;if(!wallTape?.tracking)controls?.update();frameInterview();if(activeNode?.task?.type==='gait')positionGaitLabel();if(!lessonUI.anatomyIsOpen()&&!learningHub.isOpen())renderer&&renderClinicView();}

function startPreparation(replay=false){
 if(!actors||actors.patient.getState().footwearRemoval?.active)return;
 taskRunning=false;const returnView=state.view;
 removalReturn=replay?{view:returnView,preview:true}:{view:returnView,preview:false};
 document.body.dataset.inspectEquipment='false';state.view='third';
 document.body.dataset.footwearPreparation='true';
 if(visualZone!=='exam')setVisual({act:'act2',visualMode:'exam',id:'__preparation'});
 seatOnExamBed(actors.patient,room.objects.examBed);
 actors.patient.setFootwear('shoes');actors.patient.startFootwearRemoval();
 state.paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');
 $('next').disabled=true;focusPreparation();record('clinic3d_footwear_preparation',{replay,source:'authored-continuous-action'});
 lessonUI.refreshCoach();
}
function focusPreparation(){
 if(!camera)return;state.paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');controls.enabled=false;controls.enableDamping=false;
 cameraMove={at:performance.now(),from:camera.position.clone(),look:controls.target.clone(),to:new THREE.Vector3(1.05,1.18,1.15),target:new THREE.Vector3(-1.42,.85,.18),duration:700};
 $('cameraNote').textContent='赤足准备 · 坐位观察';
}
function updatePreparation(){
 const removal=actors?.patient.getState().footwearRemoval;
 if(activeNode?.id==='exam_close'&&removal?.phase==='shod'){markLearningStep(state,'exam_close');state.examShoesOn=true;goto('exam_findings');return;}
 if(removal?.active){$('next').disabled=true;lessonUI.refreshCoach();return;}
 if(removalReturn&&removal?.completed){
  const previous=removalReturn;removalReturn=null;state.barefootPrepared=true;document.body.dataset.footwearPreparation='false';$('next').disabled=false;
  visualZone='';
  setVisual(activeNode||{act:'act1',visualMode:'consult'});
  if(activeNode?.task?.type==='plantarScan')renderTask(activeNode.task);
  setView(manualView||(previous.preview?previous.view:'third'));
  if(activeNode?.id==='wall_measure')beginWallMeasurement();
  if(activeNode?.id==='arch_view'&&!dialoguePlayer.getState().pending)showArchObservation();
  record('clinic3d_barefoot_prepared',{animationCompleted:true,clinicalSkillAssessed:false});lessonUI.refreshCoach();if(state.autoDialogueNext===activeNode?.id&&!dialoguePlayer.getState().pending){state.autoDialogueNext=null;continueEncounter();}
 }
}
function staticFootCentres(){
 const result={};for(const [side,name]of [['left','foot.L'],['right','foot.R']]){const p=actors.patient.bones.get(name).getWorldPosition(new THREE.Vector3());result[side]={x:p.x,z:p.z};}return result;
}
let scanStageFrame=null;
function currentPressureFrame(){
 const isGait=activeNode?.task?.type==='gait';
 if(isGait||pressureMode==='dynamic')return sampleWalking(taskPhase*(isGait?1:2),{origin:{x:room.anchors.pressureWalkStart[0],z:room.anchors.pressureWalkStart[2]},protectiveGait:isGait,archBySide:{left:'typical',right:'low'}});
 return sampleStanding(taskPhase,{centres:staticFootCentres()});
}
function positionGaitLabel(){
 const label=$('gaitFootLabel');
 const bone=actors?.patient.bones.get('foot.R');
 if(!bone||(!gaitDemo&&!stepBook.get('lastGaitPhase'))){label.hidden=true;return;}
 camera.updateMatrixWorld();
 bone.getWorldPosition(gaitAnklePoint).project(camera);
 const point=gaitAnklePoint, rect=renderer.domElement.getBoundingClientRect();
 label.hidden=point.z<0||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
 label.style.transform='translate('+Math.round(rect.left+(point.x+1)*rect.width/2)+'px,'+Math.round(rect.top+(1-point.y)*rect.height/2)+'px)';
}
function playGaitPhase(id){
 if(activeNode?.task?.type!=='gait'||stepBook.get('cycleAnswer')!=='cycle')return;
 if(state.paused){state.paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');$('pause').setAttribute('aria-label','暂停场景');}
 gaitDemo={id,seconds:0,segment:-1};
 if(!manualView)setView('feet',true);
 actors.patient.setLocomotion(false);
 advanceGaitPhase(0);
 syncGaitVisual();
}
function advanceGaitPhase(delta){
 const demo=gaitDemo;
 demo.seconds+=delta;
 const frame=gaitExcerpt(demo.id,demo.seconds);
 taskPhase=frame.phase;
 if(frame.finished){
  stepBook.set('seen_'+demo.id,true);
  stepBook.set('lastGaitPhase',demo.id);
  gaitDemo=null;
  record('clinic3d_gait_phase_viewed',{phaseId:demo.id});
  paintTask();
 }else if(demo.segment!==frame.segment){
  demo.segment=frame.segment;
  paintTask();
 }
}
function scanReady(){
 const patient=actors?.patient.getState();
 return activeNode?.task?.type==='plantarScan'&&!state.exitLock&&state.barefootPrepared&&patient?.footwear==='barefoot'&&!patient.footwearRemoval.active;
}
function beginWallMeasurement(){
 if(wallTape||activeNode?.id!=='wall_measure'||state.exitLock||actors.patient.getState().footwearRemoval.active)return;
 if(!state.barefootPrepared){startPreparation(false);return;}
 setView(manualView||'third',true);if(!manualView)cameraMove=null;camera.clearViewOffset();
 wallTape=wallTapeStudy({scene,room,actors,camera,controls,followTape:()=>!manualView,onPhase:(side,n,reading)=>{
  $('line').textContent=(side==='R'?'右脚':'左脚')+' · 第 '+n+' 次测量。'+(reading===undefined?'软尺从墙边沿地面展开。':'零刻度贴墙，大脚趾尖对齐 '+reading.toFixed(1)+' 厘米。');
 },onDone:results=>{
  state.taskReceipts.wall_measure={at:now(),scope:'wblt-tape',...results};
  record('clinic3d_wall_distances_measured',state.taskReceipts.wall_measure);
  goto('local_explain');
 }});
}
function syncGaitVisual(){
 if(!actors||actors.patient.getState().footwearRemoval?.active){pressureStage?.update(null,false);return;}
 if(activeNode?.task?.type==='plantarScan'||activeNode?.id==='cop_explain'){
  if(activeNode.task?.type==='plantarScan'&&!scanReady()){pressureStage?.update(null,false);return;}
  actors.patient.setLocomotion(false);
  actors.patient.setPosition(room.anchors.pressureStand);
  const acquired=activeNode.id==='cop_explain'?state.taskReceipts.pressure_compare?.scope==='case-plantar-scan':stepBook.get('plantarScan')===true;
  if(acquired&&!scanStageFrame)scanStageFrame=samplePlantarScan(staticFootCentres());
  pressureStage?.update(acquired?scanStageFrame:null,acquired);
  return;
 }
 const isGait=activeNode?.task?.type==='gait',isPressure=activeNode?.task?.type==='pressure',walking=isGait||(isPressure&&pressureMode==='dynamic');
 if(walking){const cycle=taskPhase*(isGait?1:2),start=room.anchors.pressureWalkStart||[-.1,0,1.45];actors.patient.setGaitPhase(cycle%1);actors.patient.setPosition([start[0],0,start[2]-GAIT_CASE.strideLength*cycle]);if(actors.patient.getState().footwear!=='barefoot')actors.patient.setFootwear('barefoot');}
 else if(isPressure){actors.patient.setGaitPhase(null);actors.patient.setLocomotion(false);actors.patient.setPosition(room.anchors.pressureStand||[-.1,0,1.1]);}
 const showPressure=(isPressure&&pressureMode!=='maximum');pressureStage?.update(showPressure?currentPressureFrame():null,showPressure);
}
document.addEventListener('clinic-single-stance',event=>{
 if(visualZone!=='posturography'||activeNode?.id!=='static_cop')return;
 const {side,t}=event.detail;
 actors.patient.setClinicalPose(side?'plate-single-'+side:'plate-stand');
 const amplitude=side==='R'?2.8:1.25;
 actors.patient.setPlateFrame(side?'closed':'open',side?[t,amplitude*Math.sin(t*2),amplitude*Math.cos(t)]:null);
});
document.addEventListener('clinic-balance-frame',event=>{
 if(visualZone==='posturography'&&activeNode?.id==='static_cop'){const {fraction,condition,point}=event.detail;room.objects.balanceStation.sample(fraction,condition);actors.patient.setPlateFrame(condition,point);}
});
function renderTask(task){motionNarration=lessonUI.presentTask(task)||null;}
function paintTask(){lessonUI.paintTask();}
function drawPressure(svg){
 const isGait=activeNode?.task?.type==='gait',mode=isGait?'dynamic':pressureMode;
 if(mode==='dynamic'&&!isGait){stepBook.set('dynamicMin',Math.min(Number(stepBook.get('dynamicMin')??1),taskPhase));stepBook.set('dynamicMax',Math.max(Number(stepBook.get('dynamicMax')??0),taskPhase));}
 renderPressureDiagram(svg,{mode,phase:taskPhase*(mode==='dynamic'&&!isGait?2:1),centres:mode==='static'?staticFootCentres():undefined});
}
const gaitReview=createGaitReview($('spokenGait'),()=>state.paused||!$('filmOverlay').hidden||!$('projectGuide').hidden||!$('teacher').hidden||lessonUI.anatomyIsOpen()||learningHub.isOpen());
const dialoguePlayer=createDialoguePlayer({$,speak,recordedSegments:dialogueAudio.recordedSegments,cancelSpeech:()=>dialogueAudio.cancel(),record,
 isPaused:()=>state.paused||!$('projectGuide').hidden||!$('teacher').hidden||lessonUI.anatomyIsOpen()||learningHub.isOpen(),
 onChange:()=>lessonUI.refreshCoach(),onUtterance:info=>{
  if(actors&&!bedside){
    const patient=info.speaker==='陈女士';
    const repair=info.nodeId?.endsWith(':patient-reaction')?state.communicationRepairs?.[activeNode?.id]?.reaction?.emotion:null;
    actors.patient.setEmotion(patient?(activeNode?.withdrawal?'upset':repair||expressionForPatientLine(info.text,info.nodeId)):'neutral');
    if(patient&&info.nodeId==='injury_question'&&info.index===0&&!state.mechanismGestureSeen){
      actors.patient.scratchTemple();state.mechanismGestureSeen=true;
    }
  }
  if(visualZone==='posturography'&&info.text==='站稳后松开手，双眼看前方。'&&!platformEntry)actors.patient.setClinicalPose('plate-stand');
  if(visualZone==='wall'&&activeNode?.id==='trial')actors.patient.setClinicalPose(['wall-ready','wall-position','wall-kneel','wall-forward'][info.index]||'wall-forward');
  if(visualZone==='wall'&&activeNode?.id==='local_explain'&&info.index>=1)actors.patient.setClinicalPose('wall-retry');
  const holder=$('spokenPressureMap');
  const film=filmSequence.getActive();
  const showMap=info.nodeId?.endsWith(':film:06A')&&(film?.branch.normal||film?.branch.condition==='pressure_data_missing'&&info.speaker==='林治疗师');
  if(showMap || activeNode?.id==='cop_explain')showSpokenPressureMap(holder,state);
  else holder.hidden=true;
  gaitReview.turn(info,film?.branch);
  document.body.dataset.gaitPrint=String(info.nodeId?.endsWith(':film:05B')&&info.text.includes('脚印图'));
  filmSequence.onUtterance(info);if(!state.withdrawal&&!bedside&&activeNode?.id!=='ankle_stress')learningBubbles?.utterance(info);},
 onComplete:()=>{speakerRole=null;if(activeNode?.withdrawal){startDeparture();return;}if(activeNode?.id==='exam_findings'){state.examFeedbackDone=true;markLearningStep(state,'exam_findings');persist();}
 if(activeNode?.id==='exam_close'){
  if(actors.patient.getState().footwear==='shoes'){markLearningStep(state,'exam_close');state.examShoesOn=true;goto('exam_findings');return;}
  const seat=room.anchors.patientSeat;
  actorPose(actors.patient,'seated',seat,Math.PI,true);
  if(!manualView){
   controls.enabled=false;cameraMove={at:performance.now(),from:camera.position.clone(),look:controls.target.clone(),to:new THREE.Vector3(seat[0]-1.65,1.00,seat[2]-.63),target:new THREE.Vector3(seat[0],.52,seat[2]-.16),duration:600};
  }
  actors.patient.startFootwearDressing();$('next').disabled=true;$('line').textContent='陈女士坐稳，穿上鞋。';return;
 }
 if(activeNode?.id==='arch_view'){showArchObservation();return;}if(activeNode?.id==='ankle_stress')return;if(offerRepair())return;if(activeNode&&(activeNode.kind==='dialogue'||state.choiceLock?.nodeId===activeNode.id)&&selectedNext&&!activeNode?.terminal&&!state.paused){state.autoDialogueNext=activeNode.id;if(!actors?.patient.getState().footwearRemoval?.active)continueEncounter();}else if(!activeNode&&selectedNext===START_NODE&&!state.paused){const wait=()=>{if(state.paused)return;if(movement){setTimeout(wait,200);return;}continueEncounter();};wait();}}
});
let filmPauseRevision=0;
function pauseSceneForFilm(){
 const previous={paused:state.paused,running:taskRunning,nodeId:activeNode?.id,revision:filmPauseRevision};
 state.paused=true;taskRunning=false;actors?.setTalking(null);dialogueAudio.cancel();
 $('pause').textContent='▶';$('pause').setAttribute('aria-pressed','true');return previous;
}
function resumeSceneFromFilm(previous){
 if(previous&&previous.nodeId===activeNode?.id&&previous.revision===filmPauseRevision&&!state.exitLock){state.paused=!!previous.paused;taskRunning=previous.running;}
 $('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-pressed',String(state.paused));
}
const filmSequence=createFilmSequence({$,state,player:dialoguePlayer,record,persist,appendLine,
 refreshCoach:()=>lessonUI.refreshCoach(),
 pauseScene:pauseSceneForFilm,resumeScene:resumeSceneFromFilm
});
const lessonUI=createLearningUI({scanReady,toast,$ ,state,catalog,stepBook,nodeEl,button,record,enterFootArches,
 getCurrent:()=>({node:activeNode,phase:taskPhase,running:taskRunning,pressureMode,gaitDemo}),playGaitPhase,
 balanceVoice:text=>speak('林治疗师',text),saveTask:persist,strengthVoice(text){if(strengthBed)return speak('林治疗师',text);},
 projectMuscle(value){strengthBed?.project(value);},
 strengthPose(side,mode,motion,flex,projection){
  if(strengthBed){
   return strengthBed.set(side,mode,motion,flex,projection);
  }
  return Promise.resolve(false);
 },
 getRemovalState:()=>actors?.patient.getState().footwearRemoval,focusPreparation,replayPreparation:()=>startPreparation(true),
 setPhase(value){gaitDemo=null;taskRunning=false;taskPhase=value;actors.patient.setLocomotion(false);syncGaitVisual();paintTask();},
 toggleRun(){if(state.paused){state.paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');$('pause').setAttribute('aria-label','暂停场景');}if(taskPhase>=1)taskPhase=0;taskRunning=!taskRunning;record('clinic3d_task_play',{nodeId:activeNode.id,playing:taskRunning});},
 setPressureMode(value){pressureMode=value;taskPhase=0;taskRunning=false;actors?.patient.setGaitPhase(null);syncGaitVisual();},pauseTask(){taskRunning=false;},setView,openDrawer,drawPressure,
 focusTask(){if(activeNode?.task?.type==='gait')setView('first');$('taskSurface')?.scrollIntoView({block:'nearest',behavior:'smooth'});}
});
let learningPauseBefore=false;
const learningHub=createLearningHub({
 inertTarget:$('clinic'),
 getSession(){const selected=hasStarted?state:(saved||state);return {id:selected.sessionId,caseId:'cai',startedAt:selected.startedAt,student:selected.student||profile};},
 getObjective(){const n=Number(String(currentAct()).replace('act',''));return 'O'+(n>=1&&n<=8?n:8);},
 onOpen(){learningPauseBefore=state.paused;state.paused=true;taskRunning=false;actors?.setTalking(null);dialogueAudio.cancel();$('pause').textContent='▶';$('pause').setAttribute('aria-pressed','true');record('clinic3d_learning_space_open',{act:currentAct(),notClinicalMeasurement:true});},
 onClose(){state.paused=learningPauseBefore;$('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-pressed',String(state.paused));record('clinic3d_learning_space_close',{act:currentAct()});}
});
$('learningOpen').addEventListener('click',()=>learningHub.open());
immersion=installImmersion({state,flow,catalog,getNode:()=>activeNode,record,persist,
 pause(){const previous=state.paused;state.paused=true;taskRunning=false;dialogueAudio.cancel();actors?.setTalking(null);return()=>{state.paused=previous;};}});
usageTracker=createUsageTracker({enabled:()=>hasStarted,getModule:()=>currentAct(),record});
learningBubbles=installLearningBubbles({record,persist,openConcept:act=>immersion.openConcept(act),pause(){const previous={paused:state.paused,running:taskRunning};state.paused=true;taskRunning=false;actors?.setTalking(null);dialogueAudio.cancel();filmSequence.pauseVideo('optional_learning');return()=>{state.paused=previous.paused;taskRunning=previous.running;$('pause').textContent=state.paused?'▶':'Ⅱ';};}});

let projectGuideFocus=null,projectGuidePausedBefore=false;
function renderProjectGuide(){
 const working=hasStarted?state:(saved||state),currentNode=flow[working.node],currentStage=NAVIGATION_STAGES.find(stage=>stage.act===currentNode?.act),visitedActs=new Set((working.visited||[]).map(id=>flow[id]?.act));
 $('guidePosition').textContent=currentStage?'你目前在：'+currentStage.title+'。点这一环节可回到原位置。':'可从问诊开始，也可选择本次想学习的环节。';
 $('guideProgress').textContent=`到访 ${NAVIGATION_STAGES.filter(stage=>visitedActs.has(stage.act)).length} / ${NAVIGATION_STAGES.length} 个环节 · 实际证据 ${(working.evidence||[]).length} 条。到访不等于达标。`;
 const reason=navigationAccess('act1').reason;
 $('guideAccessNote').textContent=({safety_exit:'本轮已因安全或患者意愿结束，原停止原因会保留。若想重新练习，请另开新接诊。',completed:'本轮已提交保存，可查阅接诊记录。继续练习请另开新接诊，保留这次结果。',preparing:'患者正在脱鞋袜。请先返回看完准备动作，再切换环节。',teacher_preview:'当前是教师单项预览。学生跳步请使用普通接诊入口。',not_ready:'诊室仍在准备，准备好后即可选择。'})[reason]||'自由切换环节，按实际完成情况留记录。';
 $('guideStageCards').replaceChildren();
 for(const [index,stage]of NAVIGATION_STAGES.entries()){
  const card=nodeEl('article','guide-stage-card'),isCurrent=currentNode?.act===stage.act;
  card.dataset.stage=stage.act;card.classList.toggle('is-current',isCurrent);
  const heading=nodeEl('div','guide-stage-heading');heading.append(nodeEl('span','guide-stage-number',String(index+1).padStart(2,'0')),nodeEl('span','guide-stage-state',isCurrent?'当前位置':visitedActs.has(stage.act)?'到访过':'尚未到访'));
  const control=button(isCurrent?'回到当前环节 →':working.navigationBookmarks?.[stage.act]?'回到上次位置 →':'进入这一环节 →',()=>jumpToAct(stage.act));
  control.dataset.jumpAct=stage.act;control.disabled=!navigationAccess(stage.act).ok;
  card.append(heading,nodeEl('h3','',stage.title),nodeEl('p','guide-stage-goal',stage.goal),nodeEl('small','',stage.task),control);$('guideStageCards').append(card);
 }
 const fresh=new URL('index.html',location.href);fresh.searchParams.set('demo','1');fresh.searchParams.set('round',uid());$('guideNewSession').href=fresh.href;
}
function openProjectGuide(){
 if(!$('projectGuide').hidden)return;
 projectGuideFocus=document.activeElement;projectGuidePausedBefore=state.paused;state.paused=true;taskRunning=false;actors?.setTalking(null);dialogueAudio.cancel();
 $('settings').hidden=true;renderProjectGuide();$('projectGuide').hidden=false;$('clinic').inert=true;$('projectGuideClose').focus();
}
function closeProjectGuide(){
 if($('projectGuide').hidden)return;
 $('projectGuide').hidden=true;$('clinic').inert=false;state.paused=projectGuidePausedBefore;$('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-pressed',String(state.paused));
 if(projectGuideFocus?.getClientRects().length)projectGuideFocus.focus();else $('projectGuideOpen').focus();
}
$('projectGuideOpen').addEventListener('click',openProjectGuide);$('projectGuideWelcome').addEventListener('click',openProjectGuide);$('projectGuideClose').addEventListener('click',closeProjectGuide);
window.DXXClinicNavigation=Object.freeze({getStages:()=>NAVIGATION_STAGES.map(stage=>({...stage})),access:navigationAccess,jumpToAct,openGuide:openProjectGuide});
function openDrawer(id){if(id==='notes'){immersion.paper();return;}drawerFocus=document.activeElement;$(id).hidden=false;$('clinic').inert=true;$(id).querySelector('button').focus();}
function closeDrawer(id){$(id).hidden=true;$('clinic').inert=false;drawerFocus?.focus();}
function exportData(technical=false){const data=technical?{format:'clinic3d-v14-technical-review',exportedAt:now(),node:state.node,view:state.view,room:room?.details||null,actors:actors?.details||null,limitations:TEACHER_LIMITATIONS,events:state.events,clinicalApproved:false,filmIntegration:'v18-node-bound',filmMediaPolicy:'accepted-only',heygenStatus:'see_teacher_production_record',productionRecord:'docs/heygen-v18-production.json'}:{format:'dongxiaoxue-clinic3d-learning-v14',...state,scope:'虚构教学病例的选择与解释记录，不是临床技能成绩或真实患者测量。'};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=technical?'三维诊室_技术核对_v14.json':'足踝接诊_学习记录_v14.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{manualView=b.dataset.view;followDialogue(false);setView(manualView,true);}));
$('followSpeaker').addEventListener('click',()=>followDialogue($('followSpeaker').getAttribute('aria-pressed')!=='true'));
$('roomOverview').addEventListener('click',()=>{
 $('settings').hidden=true;$('menuOpen').setAttribute('aria-expanded','false');
 manualView='third';followDialogue(false);setView('third',true);
 cameraMove.to.set(7.8,5.8,9.1);cameraMove.target.set(2,.45,.8);
});
$('dockToggle').addEventListener('click',()=>{const collapsed=document.body.dataset.dockCollapsed!=='true';document.body.dataset.dockCollapsed=String(collapsed);$('dockToggle').setAttribute('aria-expanded',String(!collapsed));$('dockToggle').textContent=collapsed?'展开操作':'收起操作';updateComposition();});
$('prepReplay').addEventListener('click',()=>{$('settings').hidden=true;startPreparation(true);});
$('begin').addEventListener('click',intro);$('resume').addEventListener('click',()=>{if(!saved)return;Object.assign(state,saved);hasStarted=true;queue=[...(state.events||[])];state.paused=false;movement=null;visualZone='';state.taskReceipts=state.taskReceipts||{};state.records=state.records||[];if(state.arrivalPending){intro();return;}goto(state.node||START_NODE,{restoring:true});toast(state.appearanceMigration?'已保留接诊进度；新增肌力与足弓学习项不会自动记为完成。':'已恢复本机保存的接诊进度。');});
function ensurePreparation(){
 if(state.barefootPrepared)return true;
 if(state.exitLock)return false;
 // Observation, anatomy and data review can continue after a skipped intake.
 // Patient-contact controls offer an explicit return to intake at their own entry.
 if(!contactReady())return true;
 if(!actors.patient.getState().footwearRemoval?.active)startPreparation(false);
 return false;
}
function continueEncounter(){
 if(activeNode?.withdrawal)return;
 if(['exam_close','synthesis'].includes(activeNode?.id))return;
 if(activeNode?.id==='rom_measure'&&!romComplete(state.taskReceipts?.rom_measure))return;
 if(activeNode?.id==='wall_measure'&&!state.taskReceipts?.wall_measure)return;
 if(activeNode?.id==='arch_view'){showArchObservation();return;}
 if(activeNode?.id==='arch_compare'&&!taskComplete()){enterFootArches();return;}
 if(activeNode?.id==='injury_mechanism'&&!state.taskReceipts?.injury_mechanism){enterMechanism();return;}
 if(activeNode?.id==='ankle_stress'&&!REVIEW_NODE&&!contactReady()){returnToIntake(true);return;}
 if(activeNode?.id==='ankle_stress'&&!state.taskReceipts?.ankle_stress){enterBedside();return;}
 if(selectedNext==='__complete')return complete();
 if(dialoguePlayer.getState().pending||state.communicationRepairs?.[activeNode?.id]?.pending)return;
 if(movement)finishIntro();
 if(activeNode&&activeNode.id!=='arch_intro'&&['act2','act3','act4','act5','act6','act7'].includes(activeNode.act)&&!ensurePreparation())return;
 if(activeNode?.id==='consent_reply'&&selectedNext==='ankle_stress'&&state.preparationReturnNode&&state.evidence.includes('screening')&&state.evidence.includes('consent')&&!state.exitLock){const returnNode=state.preparationReturnNode;state.preparationReturnNode=null;markLearningStep(state,activeNode.id);goto(returnNode);return;}
 if(activeNode && selectedNext && selectedNext!==activeNode.id)markLearningStep(state,activeNode.id);
 if(selectedNext&&selectedNext!==activeNode.id){
  if(state.pendingEntryEvidence===activeNode.id){addEvidence(activeNode.evidence);state.pendingEntryEvidence=null;}
  if(state.skippedSteps)delete state.skippedSteps[activeNode.id];
 }
 if(activeNode?.id==='safety_answer'&&state.bedsideSafetyShortcut&&state.preparationReturnNode==='ankle_stress'&&state.evidence.includes('screening')&&!state.exitLock){
  delete state.bedsideSafetyShortcut;
  selectedNext=state.evidence.includes('consent')?'ankle_stress':'consent';
  if(selectedNext==='ankle_stress')state.preparationReturnNode=null;
 }
 if(selectedNext)goto(selectedNext);
}
// Choice nodes may have several branches. Skipping a question does not choose an answer.
const skipBranches={
 gait_events:'plan_intro',history:'injury_question',safety:'goal',goal:'fear_check',fear_check:'consent',
 consent:'ankle_stress',consent_reply:'ankle_stress',acute_differential:'medical_stop',
 alignment:'rom_measure',rom_measure:'trial',trial:'wall_adjust',wall_adjust:'wall_measure',wall_measure:'muscle_intro',local_explain:'muscle_intro',exam_reasoning:'local_intro',
 plan:'plan_discussion',synthesis:'plan',medical_stop:'safe_finish'
};
function skipCurrentStep(){
 if(state.withdrawal)return;
 const node=activeNode;if(!node||state.completedAt)return;
 if(node.terminal){complete();return;}
 if(node.id==='exam_close'){if(actors.patient.getState().footwearRemoval?.dressing)return;dialoguePlayer.stop();dialogueAudio.cancel();actors.patient.setFootwear('shoes');state.examShoesOn=true;goto('exam_findings');return;}
 if(node.id==='exam_findings')state.examFeedbackDone=true;
 if(REVIEW_NODE==='injury_mechanism'&&node.id==='injury_question'){dialoguePlayer.stop();goto(node.next);return;}
 if(REVIEW_NODE){location.assign(reviewExit);return;}
 // Preserve a safety exit or an already chosen route, without submitting a choice or a result.
 let next=state.exitLock?(selectedNext&&['medical_stop','symptom_stop','decline_stop','safe_finish'].includes(selectedNext)?selectedNext:'safe_finish')
   :selectedNext&&selectedNext!==node.id&&selectedNext!=='__complete'?selectedNext
   :skipBranches[node.id]||node.next||node.options?.find(o=>!o.retry&&o.next!==node.id)?.next;
 if(!state.exitLock&&node.act==='act1'&&next==='ankle_stress'&&state.preparationReturnNode){
  next=state.preparationReturnNode;state.preparationReturnNode=null;
 }
 if(!state.exitLock&&['trial','local_record'].includes(node.id))next='muscle_intro';
 if(!node.terminal&&!flow[next])return;
 const detail={nodeId:node.id,act:node.act,toNode:node.terminal?null:next,assessmentCredit:false};
 state.skippedSteps||={};state.skippedSteps[node.id]=now();
 appendLine('学习导航','跳过此步骤 · '+(node.text||node.id),'skipped');
 state.pendingEntryEvidence=null;if(node.act!=='act1')state.preparationReturnNode=null;state.autoDialogueNext=null;
 if(state.communicationRepairs?.[node.id]?.pending){
  state.communicationRepairs[node.id].pending=false;state.communicationRepairs[node.id].phase='skipped';
 }
 filmSequence.clear();dialoguePlayer.stop();dialogueAudio.cancel();taskRunning=false;
 if(movement)finishIntro();
 if(actors.patient.getState().footwearRemoval?.active){
  actors.patient.setFootwear('barefoot');state.barefootPrepared=true;removalReturn=null;document.body.dataset.footwearPreparation='false';
 }
 state.paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-pressed','false');
 record('clinic3d_step_skipped',detail);
 goto(next,{navigation:true});
}
$('skipStep').addEventListener('click',skipCurrentStep);
$('skipFilm').addEventListener('click',skipCurrentStep);
$('next').addEventListener('click',continueEncounter);
$('pause').addEventListener('click',()=>{filmPauseRevision++;state.paused=!state.paused;filmSequence.pauseVideo('scene_pause');$('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-pressed',String(state.paused));$('pause').setAttribute('aria-label',state.paused?'继续场景':'暂停场景');if(state.paused)dialogueAudio.cancel();record('clinic3d_pause',{paused:state.paused});});
$('stop').addEventListener('click',()=>{filmPauseRevision++;filmSequence.pauseVideo('safety_pause');state.paused=true;actors.setTalking(null);taskRunning=false;actors.patient.setLocomotion(false);$('pause').textContent='▶';$('pause').setAttribute('aria-pressed','true');$('pause').setAttribute('aria-label','继续场景');dialogueAudio.cancel();record('clinic3d_safety_pause',{node:state.node});toast('已暂停。先询问患者感受，再决定继续、调整或结束。');});
$('menuOpen').addEventListener('click',()=>{$('settings').hidden=!$('settings').hidden;$('menuOpen').setAttribute('aria-expanded',String(!$('settings').hidden));});
$('settings').addEventListener('click',e=>{if(e.target.closest('button,a')){$('settings').hidden=true;$('menuOpen').setAttribute('aria-expanded','false');}});
document.addEventListener('pointerdown',e=>{if(!$('settings').hidden&&!$('settings').contains(e.target)&&!$('menuOpen').contains(e.target)){$('settings').hidden=true;$('menuOpen').setAttribute('aria-expanded','false');}});
$('notesOpen').addEventListener('click',()=>openDrawer('notes'));$('teacherOpen').addEventListener('click',()=>{$('settings').hidden=true;openDrawer('teacher');});document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDrawer(b.dataset.close)));
$('save').addEventListener('click',()=>{persist();flush();toast('已保存当前接诊进度。');});$('export').addEventListener('click',()=>exportData());$('exportReview').addEventListener('click',()=>exportData(true));
$('motionIntroReplay').addEventListener('click',()=>motionNarration?.replayIntro());
$('voice').addEventListener('click',()=>{const on=$('voice').getAttribute('aria-pressed')!=='true';$('voice').setAttribute('aria-pressed',String(on));$('voice').textContent=on?'朗读开启':'朗读关闭';if(motionNarration){motionNarration.setVoice(on);return;}if(!on){dialogueAudio.cancel();if(dialoguePlayer.getState().needsReplay)dialoguePlayer.replay();}else dialoguePlayer.replay();});
document.addEventListener('keydown',e=>{const drawer=['projectGuide','teacher'].find(id=>!$(id).hidden);if(drawer){if(e.key==='Escape'){e.preventDefault();if(drawer==='projectGuide')closeProjectGuide();else closeDrawer(drawer);}if(e.key==='Tab'){const nodes=[...$(drawer).querySelectorAll('button,a,textarea')].filter(x=>x.getClientRects().length),first=nodes[0],lastNode=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastNode.focus();}else if(!e.shiftKey&&document.activeElement===lastNode){e.preventDefault();first.focus();}}}else if(e.key==='Escape'&&actors)$('stop').click();});
async function init(){renderer=new THREE.WebGLRenderer({canvas:$('scene'),stencil:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;scene=new THREE.Scene();scene.background=new THREE.Color('#e2e9de');camera=new THREE.PerspectiveCamera(48,1,.04,40);camera.position.set(-1.8,2.0,2.8);controls=new OrbitControls(camera,$('scene'));controls.target.set(.2,1,-1);controls.enablePan=false;controls.minDistance=1;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.48;controls.enableDamping=true;controls.addEventListener('start',()=>{if(state.view==='third'){cameraMove=null;manualView='third';followDialogue(false);updateComposition();}});room=createClinicRoom(scene);pressureStage=createPressureStage(scene,room);scene.add(new THREE.HemisphereLight('#ffffee','#9eac96',2.3));const key=new THREE.DirectionalLight('#fff9e8',2.9);key.position.set(-3,6,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.bias=-.00003;key.shadow.normalBias=.0015;scene.add(key);const fill=new THREE.DirectionalLight('#e5f2f1',1.0);fill.position.set(3,4,-3);scene.add(fill);const resize=()=>{const w=$('scene').clientWidth,h=$('scene').clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;updateComposition();};resize();new ResizeObserver(resize).observe($('scene'));window.addEventListener('resize',resize);requestAnimationFrame(animate);const dressingRoom=new THREE.Group();[actors]=await Promise.all([createActors(dressingRoom,{modelUrl:'assets/patient-motion.glb'}),dialogueAudio.prepare()]);actors.patient.root.visible=false;actors.therapist.root.visible=false;scene.add(dressingRoom);room.objects.door.rotation.y=0;actors.therapist.bindDocumentation({notes:room.objects.clinicalNotes,pen:room.objects.clinicalPen,deskParent:room.objects.documentationDeskParent});actors.therapist.setDocumentation('desk');const a=room.anchors;actorPose(actors.patient,'standing',a.entrance||[-1.65,0,-2.55],0);actorPose(actors.therapist,'standing',a.welcome||[.5,0,-1.2],-Math.PI/2);$('loading').hidden=true;$('welcome').hidden=false;$('resume').hidden=!saved?.node;document.body.dataset.ready='true';showFacts($('teacherFacts'),[['人物','2个独立骨架的蒙皮角色'],['病例','1个主线病例 · 六个评估环节、计划与复盘'],['节点',Object.keys(flow).length],['运动学审核','尚未签审'],['双人短片','5段用户情境视频已剪辑接入；不作临床动作认证'],['足压来源','课程合成示意'],['学习记录','本机保存；同源教学服务可接收事件']]);setView('third',true);drawRail();lessonUI.refreshCoach();}
function startReview(){
 if(!REVIEW_NODE)return;
 state.barefootPrepared=REVIEW_NODE!=='ankle_stress';hasStarted=false;visualZone='';goto(REVIEW_NODE==='injury_mechanism'?'injury_question':REVIEW_NODE);setView(practice==='gait_events'?'first':'third',true);
 const badge=nodeEl('div','teacher-preview-badge',practice?(new URLSearchParams(location.search).get('assessment')==='clinic'?'模块测试　':'自由练习　'):'教师预览 · 不保存学习结果　');
 const back=nodeEl('a','',practice?'返回选项':'返回主线');back.href=reviewExit;badge.append(back);if(splitPractice)badge.append(button('跳过此步骤',skipCurrentStep));$('clinic').append(badge);
 for(const id of ['save','export','prepReplay','notesOpen','learningOpen'])$(id).hidden=true;
 $('saveStatus').textContent='教师预览 · 原接诊记录保持不变';
}
recoverLearningSteps(saved,flow);
const refreshLearningProgress=installTaskDesk(()=>hasStarted?state:saved,studyStep,()=>navigationAccess('act1').ok);
init().then(startReview).catch(error=>{$('loading').querySelector('h2').textContent='诊室未能载入';$('loadMessage').textContent='请刷新重试，或在教师制作记录中核对资源。';$('loader')?.remove();console.error(error);});
