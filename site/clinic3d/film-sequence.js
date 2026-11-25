import {filmFallback,replies} from './clinic-dialogue.js';
const fallback=kind=>filmFallback[kind].map(([speaker,text])=>({speaker,text}));
import { FILM_SEQUENCE } from './film-sequence-data.js?v=79.2';

export const FILM_CLIPS=FILM_SEQUENCE.clips;
const roles={therapist:'林治疗师',patient:'陈女士'};
const has=(state,id)=>(state.evidence||[]).includes(id);
const recorded=(state,key,value)=>(state.records||[]).some(row=>row[key]===value);
const alternative=(clip,condition)=>clip.alternative.find(item=>item.condition===condition);

// Select from actual state, never from a visited tab or an animation's appearance.
export function selectFilmBranch(clip,state){
  let condition=null;
  if(state.exitLock){
    condition=clip.id==='08A'?'declined_or_medical_stop_route':clip.id==='08B'?'medical_stop_or_declined_route':
      state.exitReason==='decline_stop'?'declined':clip.alternative.find(item=>item.handoff?.physicalTasks==='ended')?.condition;
    const item=alternative(clip,condition)||clip.alternative.find(item=>/declined|stopped|refused/.test(item.condition));
    return {condition:item?.condition||'physical_tasks_ended',lines:item?.lines||fallback('stop'),normal:false};
  }
  if(clip.id==='02B'&&recorded(state,'localCheck','not_performed'))condition='local_check_not_performed';
  if(clip.id==='03B'&&recorded(state,'muscleLearning','not_performed'))condition='muscle_learning_incomplete';
  if(clip.id==='07B'&&recorded(state,'balanceCheck','not_performed'))condition='balance_not_performed';
  
  if(clip.id==='08A'&&has(state,'goal')&&['local_record','arch_record','pressure_record','ankle_strength54','balance54','balance_record'].filter(id=>has(state,id)).length<2)condition='several_checks_skipped';
  if(condition){const item=alternative(clip,condition);if(item)return {condition,lines:item.lines,normal:false};}
  if((clip.id!=='04A'||has(state,'screening'))&&(clip.evidenceRequirement?.all||[]).every(id=>has(state,id)))return {condition:'normal',lines:clip.normal,normal:true};
  const missing={
    '01B':'screening_or_goal_missing','02A':'consent_missing','02B':'local_check_not_performed',
    '03B':'muscle_learning_incomplete','04A':'arch_comparison_skipped','04B':'arch_check_not_performed','05B':has(state,'gait_events')?'events_not_marked':'gait_task_not_performed',
    '06A':'pressure_data_missing','06B':has(state,'pressure_conditions')?'pressure_not_performed':'conditions_not_checked',
    '07B':'balance_not_performed','08A':'goal_not_obtained','08B':'plan_not_selected'
  };
  const item=alternative(clip,missing[clip.id]);
  return {condition:item?.condition||'consent_missing',lines:item?.lines||fallback('consent'),normal:false};
}

export function approvedFilmMedia(clipId,condition,manifest,baseUrl){
  const entry=manifest?.clips?.[clipId]?.[condition];
  if(entry?.approved!==true||entry?.reviewStatus!=='accepted'||! /^[a-f0-9]{64}$/i.test(entry.sha256||''))return null;
  try{const base=new URL(baseUrl),url=new URL(entry.src,base);if(url.origin!==base.origin||!url.pathname.toLowerCase().endsWith('.mp4'))return null;return {...entry,src:url.href};}catch{return null;}
}

export function createFilmSequence({$,state,player,record,persist,appendLine,pauseScene,resumeScene,refreshCoach}){
  let active=null,manifest={clips:{}},videoPause=null,manifestReady=false,waiting=null,playback=null;
  let introducing=false;
  const originalScenes=new Set(['01A','04A','05A','06A']);
  const cue=$('filmCue'),name=$('filmSegmentName'),handoff=$('filmHandoff'),replay=$('filmReplay'),watch=$('filmWatch'),overlay=$('filmOverlay'),video=$('filmVideo');
  const media=()=>active&&approvedFilmMedia(active.clip.id,active.example?'normal':active.branch.condition,manifest,location.href);
  fetch('film-media-v18.json?v=68',{cache:'no-cache'}).then(response=>response.ok?response.json():{clips:{}}).catch(()=>({clips:{}})).then(value=>{
    manifest=value;manifestReady=true;watch.hidden=!media();if(waiting&&waiting===active)playPrimary();
  });
  function playPrimary(){
    waiting=null;
    if(media())openVideo(true);
    else if(!active?.taskPreview)player.replay();
  }
  function clear(){if(introducing){player.stop();introducing=false;watch.disabled=false;}waiting=null;if(!overlay.hidden)closeVideo('node_changed');active=null;cue.hidden=true;handoff.hidden=true;watch.hidden=true;document.body.dataset.filmSegment='';}
  function present(node,{trigger='entry',restoring=false,force=false}={}){
    if(trigger==='entry'||active?.clip.anchorNode!==node.id)clear();
    const clip=FILM_CLIPS.find(item=>item.anchorNode===node.id&&item.trigger===trigger);
    if(!clip)return false;
    const branch=selectFilmBranch(clip,state);
    if(branch.condition==='arch_comparison_skipped'&&state.exitLock)return false;
    const key=clip.id+':'+branch.condition+(clip.id==='05B'?':protective-gait':'');
    const chosen=state.choiceLock;
    const spoken=trigger==='choice'&&branch.normal&&chosen?.nodeId===node.id&&replies[chosen.optionId];
    if(spoken&&branch.lines.at(-1)?.speaker==='therapist')branch.lines=[...branch.lines.slice(0,-1),{speaker:'therapist',text:spoken}];
    state.filmProgress=state.filmProgress||{};
    const prior=state.filmProgress[key];
    const actionLabel=branch.condition==='consent_missing'?'观察踝关节运动':state.exitLock?'结束体能任务，讨论下一步':clip.actionLabel;
    const introTurn=clip.id==='04A'?{speaker:'therapist',text:node.text}:clip.videoIntro;
    active={clip,branch,key,introTurn,actionLabel,example:originalScenes.has(clip.id)&&!state.exitLock&&!branch.normal};cue.hidden=false;name.textContent=clip.title;
    replay.hidden=false;watch.hidden=!media();watch.textContent='播放病例视频';document.body.dataset.filmSegment=clip.id;
    handoff.textContent='接下来 · '+actionLabel;
    handoff.hidden=false;
    const archEntry=clip.id==='04A'&&!state.exitLock&&(!restoring||!state.caseVideoSeen?.[clip.id]);
    if(prior?.completed&&!force&&!archEntry){refreshCoach?.();return false;}
    const startIndex=restoring&&!force?prior?.index||0:0;
    const firstFilm=!force&&!state.exitLock&&originalScenes.has(clip.id)&&(archEntry||!state.caseVideoSeen?.[clip.id]);
    record(force?'clinic3d_film_segment_replay':'clinic3d_film_segment_open',{clipId:clip.id,nodeId:node.id,condition:branch.condition,mode:firstFilm?'case_video':'live_scene_dialogue',assessmentCredit:false});
    if(firstFilm&&introTurn&&!restoring&&clip.id!=='04A')appendLine(roles[introTurn.speaker],introTurn.text,'film-introduction');
    if(!restoring||force)for(const turn of branch.lines)appendLine(roles[turn.speaker],turn.text,'film-dialogue');
    waiting=firstFilm?active:null;
    player.loadSequence(branch.lines,node.id+':film:'+clip.id,{startIndex,announce:!firstFilm});
    if(firstFilm&&manifestReady)playPrimary();
    return true;
  }
  function offerGaitTask(node,host){
    clear();
    const clip=FILM_CLIPS.find(item=>item.id==='05A');
    active={clip,branch:{condition:'normal',normal:true},taskPreview:true};
    player.showPrompt(node.text,node.id);
    const b=document.createElement('button');b.type='button';b.textContent='观看步行病例视频';
    b.onclick=()=>{if(manifestReady)openVideo();else waiting=active;};
    host.prepend(b);
    if(!state.caseVideoSeen?.[clip.id]){
      if(manifestReady)openVideo(true);else waiting=active;
    }
  }
  function onUtterance(info){
    if(introducing||waiting||playback||!active||!info.sequence||!info.nodeId.endsWith(':film:'+active.clip.id))return;
    const previous=state.filmProgress[active.key];
    state.filmProgress[active.key]={index:info.index,completed:!info.pending,condition:active.branch.condition};
    if(!info.pending&&!previous?.completed)record('clinic3d_film_dialogue_read',{clipId:active.clip.id,condition:active.branch.condition,nodeId:active.clip.anchorNode,assessmentCredit:false});
    handoff.hidden=info.pending;
    persist();refreshCoach?.();
  }
  function needsBriefing(node){
    const clip=FILM_CLIPS.find(item=>item.anchorNode===node.id&&item.trigger==='entry');
    if(!clip)return false;
    const branch=selectFilmBranch(clip,state);
    return !state.filmProgress?.[clip.id+':'+branch.condition]?.completed;
  }
  function closeVideo(reason='return_to_scene'){
    if(overlay.hidden)return;
    const previous=playback;playback=null;overlay.hidden=true;video.pause();video.removeAttribute('src');video.load();
    document.body.dataset.filmPlaying='false';
    record('clinic3d_film_return',{clipId:active?.clip.id,reason,assessmentCredit:false});
    resumeScene(videoPause);videoPause=null;
    if(reason==='node_changed')return;
    if(active?.taskPreview){if(reason==='media_load_error')$('filmVideoStatus').textContent='请重新播放步行病例视频。';return;}
    if(!watch.hidden)watch.focus();
    if(active?.introTurn||active?.clip.videoIntro)handoff.hidden=!!previous?.resumeDialogue;
    if(previous?.isPrimary&&reason==='ended'){
      if(active?.clip.id==='06A'||active?.example)player.replay();
      else player.finishSequence();
    }
    else if(previous?.resumeDialogue)player.replay();
  }
  function pauseVideo(reason='pause'){
    if(overlay.hidden)return;
    video.pause();$('filmVideoStatus').textContent='影片已暂停。';
    record('clinic3d_film_video_pause',{clipId:active?.clip.id,reason,assessmentCredit:false});
  }
  replay.addEventListener('click',()=>{if(active)present({id:active.clip.anchorNode,text:active.introTurn?.text},{trigger:active.clip.trigger,force:true});});
  function openVideo(isPrimary=false){
    const entry=media();if(!entry||introducing||!overlay.hidden)return;
    const session={isPrimary,resumeDialogue:isPrimary||!!player.getState?.().pending};
    const intro=active.introTurn||active.clip.videoIntro;
    if(intro){
      introducing=true;watch.disabled=true;handoff.hidden=true;
      player.beforeVideo(intro,active.clip.anchorNode+':video-intro',()=>{
        introducing=false;watch.disabled=false;showVideo(entry,session);
      });
    }else showVideo(entry,session);
  }
  function showVideo(entry,session){
    const {isPrimary}=session;
    playback=session;player.stop();
    videoPause=pauseScene();overlay.hidden=false;document.body.dataset.filmPlaying='true';
    $('filmVideoTitle').textContent=(active.example?'教学示例 · ':'')+active.clip.title;$('filmVideoContinue').textContent=isPrimary?'切换到诊室对白':'返回接诊';
    $('filmVideoStatus').textContent=isPrimary?'播完返回本步操作。':'病例视频回看';
    video.src=entry.src;video.controls=true;video.focus();
    if(active.taskPreview)$('filmVideoContinue').textContent='返回步态观察';
    record('clinic3d_film_video_open',{clipId:active.clip.id,condition:active.branch.condition,sha256:entry.sha256,assessmentCredit:false});
    video.play().catch(()=>{if(playback===session)$('filmVideoStatus').textContent='点击画面中的播放键观看。';});
  }
  watch.addEventListener('click',()=>openVideo(false));
  video.addEventListener('playing',()=>{if(active&&playback){(state.caseVideoSeen||={})[active.clip.id]=true;persist();}});
  video.addEventListener('ended',()=>{if(!playback||!active)return;record('clinic3d_film_video_ended',{clipId:active.clip.id,assessmentCredit:false});closeVideo('ended');});
  video.addEventListener('error',()=>{if(playback&&video.error)closeVideo('media_load_error');});
  $('filmVideoContinue').addEventListener('click',()=>closeVideo());
  $('filmVideoClose').addEventListener('click',()=>closeVideo('closed_early'));
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();closeVideo('closed_early');}else if(event.key==='Tab'){const stops=[$('filmVideoClose'),video,$('filmVideoContinue')],first=stops[0],last=stops.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  return {present,offerGaitTask,onUtterance,needsBriefing,clear,closeVideo,pauseVideo,getActive:()=>active};
}
