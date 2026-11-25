import {archCaseText,archOutlines} from './arch-bones.js';
import {mountPlantarScan,showSpokenPressureMap} from './plantar-scan.js?v=79';
import {renderSOAPTask} from './soap-tasks-v20.js?v=79';
import { createLessonCoach } from './lesson-coach.js';
import { createArchComparison } from './arch-comparison.js';
import { createAnatomyViewer } from './anatomy-viewer.js';
import {sampleWalking,renderPlantarScan} from "./pressure-engine.js";
import { GAIT_CASE } from './gait-lesson.js';
import {showStrength,showMotion,strengthComplete,motionComplete} from './clinical-exams.js?v=79.2';

import {mountGaitQuestion,paintGaitQuestion} from './gait-phase-task.js?v=72';

// Teaching presentation only. Operation receipts are owned by app.js.
export function createLearningUI(ctx) {
  const {$,state,catalog,stepBook,getCurrent,record,nodeEl,button}=ctx;
  const coach=createLessonCoach(ctx);
  const comparison=createArchComparison({nodeEl,button,record,clinic:$('clinic'),pauseTask(){ctx.pauseTask();paintTask();}});
  $('archExplore').addEventListener('click',()=>{$('settings').hidden=true;comparison.open();});
  let anatomy=null,anatomyLoading=null,lastFocus=null;
  const overlay=nodeEl('aside','anatomy-overlay');
  overlay.id='anatomyOverlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','anatomyTitle');
  const shell=nodeEl('section','anatomy-shell'),head=nodeEl('header','anatomy-heading'),title=nodeEl('h2','','足踝解剖观察窗');title.id='anatomyTitle';
  const close=button('返回接诊',closeAnatomy);head.append(title,close);
  const intro=nodeEl('p','anatomy-intro','转动骨骼，找一找小腿与足部如何相接。这里观察的是解剖结构。');
  const host=nodeEl('div','anatomy-host');host.id='anatomyHost';
  shell.append(head,intro,host);overlay.append(shell);document.body.append(overlay);
  function text(id,value){if($(id))$(id).textContent=value||'';}
  function show(id,on){if($(id))$(id).hidden=!on;}
  function facts(){return getCurrent();}
  function addSource(wrap,textValue){wrap.append(nodeEl('p','task-source',textValue));}
  function anatomyButton(wrap,focus='ankle'){const b=button('踝足运动 · 轴面与肌肉',()=>openAnatomy(focus));b.className='anatomy-open';wrap.append(b);}
  async function openAnatomy(focus='ankle'){
    lastFocus=document.activeElement;ctx.pauseTask();paintTask();overlay.hidden=false;$('clinic').inert=true;close.focus();
    try {
      if(!anatomyLoading)anatomyLoading=createAnatomyViewer(host).then(v=>anatomy=v).catch(error=>{anatomyLoading=null;throw error;});
      const viewer=await anatomyLoading;
      if(overlay.hidden)return;
      viewer.setVisible?.(true);viewer.resize?.();viewer.setFocus?.(focus);
      record('clinic3d_anatomy_open',{focus,source:'BodyParts3D-Somakine-static-anatomy',notPatientMeasurement:true});
    } catch(error){host.replaceChildren(nodeEl('p','task-description','解剖资源暂未载入。请返回接诊，稍后再试；不会把这次载入算作完成检查。'));console.error('Anatomy viewer:',error);}
  }
  function closeAnatomy(){overlay.hidden=true;anatomy?.setVisible?.(false);$('clinic').inert=false;lastFocus?.focus();}
  document.addEventListener('keydown',event=>{
    if(overlay.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeAnatomy();}
    if(event.key==='Tab'){
      const all=[...overlay.querySelectorAll('button,a,input,select,canvas[tabindex]')].filter(e=>!e.disabled&&e.getClientRects().length);
      const first=all[0],last=all.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  },true);
  function presentNode(node){
    const edu=node.education||node.task?.education||{};
    const patient=/^(陈女士|患者)$/.test(node.speaker||'');
    const therapist=/^(林治疗师|治疗师)$/.test(node.speaker||'');
    $('conversation').dataset.speaker=patient?'patient':therapist?'therapist':'student';
    const narrationTurn=node.speaker==='教学旁白';
    text('speakerAvatar',patient?'陈':therapist?'林':narrationTurn?'讲':'你');
    text('dialogueKind',node.id==='arch_compare'?'足骨模型操作':node.kind==='summary'?'共同复盘':patient?'听听患者怎么说':therapist?'治疗师的解释':narrationTurn?'运动学讲解':'轮到你来回应');
    text('careCue',edu.care);show('careCue',false);
    show('taskDock',['ankle_stress','exam_reasoning'].includes(node.id)||!!node.task&&!['history','evidence'].includes(node.task.type));
    const docked=!!node.task&&!['history','evidence','plan'].includes(node.task.type),options=$('options');
    if(docked)$('taskDock').querySelector('.dock-content').append(options);
    else $('conversationBody').append(options);
    $('gaitLoadPrint')?.remove();
    if(node.id==='gait_interpret'&&state.evidence.includes('gait_events')){
      const figure=nodeEl('figure','plantar-scan');figure.id='gaitLoadPrint';
      const feet=['left','right'].map(side=>{
        const initial=side==='left'?GAIT_CASE.leftContactPhase:0;
        const frame=sampleWalking(initial+.14*GAIT_CASE.stance[side],{protectiveGait:true,archBySide:{left:'typical',right:'low'}});
        const foot=frame.feet.find(f=>f.side===side);
        for(const cell of foot.cells)cell.pressure/=foot.load;
        return foot;
      });
      const peak=Math.max(...feet.flatMap(f=>f.cells.map(c=>c.pressure)));
      for(const foot of feet)for(const cell of foot.cells)cell.pressure/=peak;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      renderPlantarScan(svg,{kind:'gait',feet});figure.append(svg,nodeEl('figcaption','','各足承重早期 · 按单足负荷归一化 · 暖色表示较集中'));
      $('spokenGait').before(figure);
    }
    if(node.id==='cop_explain')showSpokenPressureMap($('spokenPressureMap'),state);
    text('dockTitle',({plantarScan:'足底扫描',gait:'步态周期',goniometer:'踝足运动辨认',trial:'负重弓箭步测试（WBLT）',muscle:'踝足肌力检查',arch:'静态足弓',staticCOP:'扭伤后的静态平衡',pressure:'足底负荷',balance:'平衡准备',plan:'共同计划'})[node.task?.type]||'观察与操作');
    text('whyTitle','为什么要做这一步');text('whyText',edu.why||node.purpose);
    text('knowledgeText',[edu.concept,...(edu.knowledge||[]),edu.patientMeaning].filter(Boolean).join(' '));
    let narration=$('lessonTeacherNarration');if(!narration){narration=nodeEl('p','teacher-narration');narration.id='lessonTeacherNarration';$('learningGuide')?.querySelector('.guide-content')?.append(narration);}
    if(narration){const lines=Array.isArray(edu.teacherNarration)?edu.teacherNarration.join(' '):edu.teacherNarration||'';narration.textContent=lines;narration.hidden=!lines;}
    const steps=$('taskSteps');if(steps){steps.replaceChildren();for(const step of edu.steps||[])steps.append(nodeEl('li','',step));steps.hidden=!(edu.steps||[]).length;}
    const guide=$('learningGuide');if(guide){if(steps&&!guide.contains(steps))guide.querySelector('.guide-content')?.append(steps);guide.hidden=!(edu.why||edu.concept||node.purpose);guide.open=false;}
    text('actionPrompt',node.options?.length?(node.kind==='task'?'先观察和核对，再选择你的判断。':'你会怎样回应陈女士？请选择一句。'):'');show('actionPrompt',!!node.options?.length);
    show('taskStatus',!!node.task&&!['evidence','history'].includes(node.task.type));text('taskStatus','');
  }
  function timeline(wrap){
    const tools=nodeEl('div','timeline-controls');
    const play=button('播放采集',()=>{ctx.toggleRun();paintTask();});play.id='taskPlay';play.className='play-observation';
    const previous=button('前一小步',()=>ctx.setPhase(Math.max(0,facts().phase-.01)));
    const next=button('后一小步',()=>ctx.setPhase(Math.min(1,facts().phase+.01)));
    const lab=nodeEl('label','','拖动回看');lab.htmlFor='taskPhase';
    const slider=document.createElement('input');Object.assign(slider,{type:'range',min:'0',max:'1',step:'.001',id:'taskPhase',value:String(facts().phase)});slider.setAttribute('aria-label','观察进度');
    slider.addEventListener('input',()=>ctx.setPhase(Number(slider.value)));
    slider.addEventListener('change',()=>record('clinic3d_task_scrub',{nodeId:facts().node.id,phase:facts().phase}));
    tools.append(play,previous,next,lab,slider);wrap.append(tools);
  }
  function presentTask(task){
    const wrap=$('taskSurface');wrap.replaceChildren();wrap.hidden=false;
    const exam={wrap,book:stepBook,record,anatomyButton,changed:()=>{ctx.saveTask();paintTask();},pose:ctx.strengthPose,projectMuscle:ctx.projectMuscle,coachVoice:ctx.strengthVoice};
    if(task.type==='plantarScan'){mountPlantarScan({...exam,button,scanReady:ctx.scanReady});return;}
    if(renderSOAPTask(task,{wrap,nodeEl,button,stepBook,record,onCue:ctx.balanceVoice,refresh:()=>{ctx.saveTask();coach.update();}}))return;
    if(task.type==='history'){wrap.hidden=true;return;}
    if(task.type==='evidence'){
      wrap.append(nodeEl('p','task-description','本次实际留下的资料与判断'));
      const list=nodeEl('div','evidence-preview');for(const id of state.evidence.slice(-4))list.append(nodeEl('span','',catalog[id]?.label||id));
      wrap.append(list,button('查看 SOAP 病历',()=>ctx.openDrawer('notes')));return;
    }
    if(task.type==='gait'){
      mountGaitQuestion({wrap,button,nodeEl,book:stepBook,seek:ctx.setPhase,onMark(){paintTask();ctx.saveTask();},play:ctx.playGaitPhase,chooseAnswer(id){
        stepBook.set('cycleAnswer',id);
        record('clinic3d_gait_definition',{answer:id,correct:id==='cycle'});
        paintTask();
        if(id==='cycle')$('cyclePhases').querySelector('h3').focus({preventScroll:true});
      }});
    } else if(task.type==='goniometer'){
      const narration=showMotion({...exam,
        voiceEnabled:()=>$('voice').getAttribute('aria-pressed')==='true',
        enableVoice:()=>{if($('voice').getAttribute('aria-pressed')!=='true')$('voice').click();},
        notify:text=>ctx.toast(text)
      });
      paintTask();return narration;
    } else if(task.type==='trial'){
      wrap.append(nodeEl('h3','task-card-title','哪一次触墙可以记数？'));
      const compare=nodeEl('div','trial-comparison');
      for(const [label,textValue]of [['同条件记录','面墙扶稳，被测足在前，先距墙约 10 cm。后膝落地、骨盆摆正，前足跟贴地，膝盖朝第二脚趾方向轻触墙。逐步调节脚与墙的距离，记录仍能完成动作时大脚趾尖到墙的最远距离（厘米）。'],['条件已改变','脚跟抬起或脚向外转，这次不记。左右脚用同一方法；疼痛加重时停止，记下原因。']]){const card=nodeEl('div','task-card');card.append(nodeEl('b','',label),nodeEl('p','',textValue));compare.append(card);}
      wrap.append(compare);anatomyButton(wrap,'ankle');addSource(wrap,'双侧使用同一把软尺、相同站位，各取三次有效测量的均值。');
    } else if(task.type==='muscle'){
      showStrength(exam);
    } else if(task.type==='arch'){
      if(state.evidence.includes('arch_record'))wrap.append(nodeEl('p','task-description',archCaseText),archOutlines());
      const open=button('在足骨模型上选择组成骨',ctx.enterFootArches);open.dataset.openArchBones='true';wrap.append(open);
      const method=nodeEl('details',''),summary=nodeEl('summary','','怎样进一步描述足姿？');
      method.append(summary,nodeEl('p','','舟骨下降测试比较同一舟骨粗隆标记在坐位距下中立与放松站立时的离地高度。两次高度之差可描述负重后的变化。'),nodeEl('p','','FPI-6 在放松站立时从六项观察描述足姿，包括距骨头触诊、外踝上下曲线、跟骨额状面位置、距舟关节区隆起、内侧纵弓轮廓及前足相对后足的位置。'));wrap.append(method);
    } else if(task.type==='pressure'){
      const compare=button('正常与低足弓对照',()=>comparison.open());compare.className='comparison-open';wrap.append(compare);
      const modes=nodeEl('div','task-modes');for(const [id,label]of [['static','静态站立'],['dynamic','行走瞬时'],['maximum','最大压力复合图']]){const b=button(label,()=>{ctx.setPressureMode(id);stepBook.set('mode',true);record('clinic3d_pressure_mode',{mode:id});paintTask();});b.dataset.mode=id;modes.append(b);}wrap.append(modes);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 290');svg.setAttribute('role','img');svg.setAttribute('aria-label','足底压力分布及压力中心，原创合成教学数据');svg.id='taskDiagram';wrap.append(svg);timeline(wrap);
      if(task.stage==='regions'){const regions=nodeEl('div','task-regions');for(const region of ['足跟','中足','前足']){const b=button('观察'+region,()=>{stepBook.set('region',region);record('clinic3d_pressure_region',{region});paintTask();});b.dataset.region=region;regions.append(b);}wrap.append(regions);}
      addSource(wrap,'合成教学数据 · 静态与行走图显示同一时刻双足负荷。COP是压力中心，不是全身重心。');
      wrap.append(button('回看脱鞋袜准备',()=>ctx.replayPreparation()));
      const source=document.createElement('a');source.href='../pressure/index.html';source.target='_blank';source.rel='noopener';source.textContent='另看：已授权公开研究足压样例 ↗';source.className='research-link';wrap.append(source);anatomyButton(wrap,'arch');
    } else if(task.type==='balance'){
      wrap.append(nodeEl('h3','task-card-title','先让患者安心站稳'));
      const checklist=nodeEl('div','balance-checklist');for(const [i,label]of(task.checklist||[]).entries()){
        const row=nodeEl('label','task-check'),input=document.createElement('input');input.type='checkbox';input.dataset.condition=String(i);input.checked=!!stepBook.get('check'+i);input.addEventListener('change',()=>{stepBook.set('check'+i,input.checked);record('clinic3d_balance_condition',{condition:label,confirmed:input.checked});paintTask();});row.append(input,nodeEl('span','',label));checklist.append(row);
      }wrap.append(checklist);addSource(wrap,'从可保护的低难度起点讨论；患者可以暂停、降低难度或不做。');
    } else if(task.type==='plan'){
      const goal=nodeEl('div','task-card');goal.append(nodeEl('small','','陈女士最在意的事'),nodeEl('p','','先安心走不平的路，再逐步讨论恢复轻松跑步。'));wrap.append(goal);

    } else {wrap.hidden=true;}
    paintTask();
  }
  function paintTask(){
    coach.update();
    const {node,phase,running,pressureMode}=facts();const task=node?.task;if(!task)return;
    if($('taskPlay'))$('taskPlay').textContent=running?'暂停采集':'播放采集';
    if($('taskPhase'))$('taskPhase').value=String(phase);
    if(task.type==='gait'){
      paintGaitQuestion({$,book:stepBook,phase,playing:facts().gaitDemo,locked:!!state.choiceLock||!!state.completedAt});
    }
    if(task.type==='plantarScan'){
      const next=$('options').querySelector('[data-option="scan_reading"]');
      if(next)next.disabled=stepBook.get('plantarScan')!==true;
    }
    if(task.type==='goniometer'){
      text('taskStatus',motionComplete(stepBook)?'关节运动已辨认。':'');
    }
    if(task.type==='pressure'){
      for(const b of document.querySelectorAll('[data-mode]')){b.classList.toggle('selected',b.dataset.mode===pressureMode);b.setAttribute('aria-pressed',String(b.dataset.mode===pressureMode));}
      for(const b of document.querySelectorAll('[data-region]')){b.classList.toggle('selected',b.dataset.region===stepBook.get('region'));b.setAttribute('aria-pressed',String(b.dataset.region===stepBook.get('region')));}
      const svg=$('taskDiagram');if(svg){svg.replaceChildren();ctx.drawPressure(svg);}
      const timeline=$('taskPlay')?.closest('.timeline-controls');if(timeline)timeline.hidden=pressureMode==='maximum';
      text('taskStatus',pressureMode==='maximum'?'各格点峰值合成；不代表同一时刻，不显示COP。':task.stage==='conditions'?'静态看承重与小范围COP摆动；行走看接触转换。':`观察区域：${stepBook.get('region')||'待选择'}。切换行走瞬时并播放，观察压力转移。`);
    }
    if(task.type==='muscle'){
      text('taskStatus',strengthComplete(stepBook)?'四个方向均已完成左右侧抗阻比较。':'');
    }
    if(task.type==='arch'){
      const done=state.taskReceipts?.arch_compare?.scope==='foot-arch-bone-selection';
      text('taskStatus',done?'三种足弓的组成骨已选齐。':'依次辨认内侧纵弓、外侧纵弓和横弓。');
    }
    if(task.type==='balance')text('taskStatus','安全条件已核对 '+(task.checklist||[]).filter((_,i)=>stepBook.get('check'+i)).length+' / '+(task.checklist||[]).length);
  }
  return {presentNode,presentTask,paintTask,openAnatomy,closeAnatomy,anatomyIsOpen:()=>!overlay.hidden||comparison.isOpen(),refreshCoach:()=>coach.update()};
}
