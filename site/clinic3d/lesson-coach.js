import {gaitPhasesComplete} from './gait-phase-task.js?v=72';
import {motionComplete,strengthComplete} from './clinical-exams.js';

// Contextual instructions point to genuine controls; they never answer a task.
export function createLessonCoach(ctx){
 const {$,getCurrent,stepBook,record}=ctx;
 let destination=null,activation=null,lastSignature='';
 const box=$('coach'),text=$('coachText'),button=$('coachAction');
 $('prepPause').addEventListener('click',()=>{$('pause').click();update();});
 function visible(el){return !!el&&!el.hidden&&!!el.getClientRects().length;}
 function locate(selector){
  let target=document.querySelector(selector);if(!target)return;
  if(target.closest('#taskDock')&&document.body.dataset.dockCollapsed==='true')$('dockToggle').click();
  document.querySelectorAll('.coach-focus').forEach(el=>el.classList.remove('coach-focus'));
  target.scrollIntoView({block:'nearest',behavior:'smooth'});target.focus?.();target.classList.add('coach-focus');
  setTimeout(()=>target.classList.remove('coach-focus'),3500);
 }
 button.addEventListener('click',()=>{
  if(activation)activation();else if(destination)locate(destination);
  record('clinic3d_coach_used',{nodeId:getCurrent().node?.id||'arrival',target:destination});
 });
 $('coachToggle').addEventListener('click',()=>{
  const closed=box.dataset.collapsed!=='true';box.dataset.collapsed=String(closed);
  $('coachToggle').setAttribute('aria-expanded',String(!closed));$('coachToggle').textContent=closed?'展开':'收起';
 });
 function update(){
  const {node,phase,pressureMode}=getCurrent(),removal=ctx.getRemovalState?.();
  $('prepPause').hidden=!removal?.active;$('prepPause').textContent=ctx.state.paused?'继续动作':'暂停动作';
  let message='',label='定位操作',selector=null,action=null;
  if(removal?.active){message='她正在坐稳脱鞋袜。等双脚准备好，再开始检查。';label='观看准备动作';action=()=>ctx.focusPreparation?.();}
  else if(document.body.dataset.dialoguePending==='true'){
   message='双方正在自动交流。听完后，动小助会指向本步操作。';label='暂停交流';selector='#pause';action=()=>$('pause').click();
  }else if(!node&&visible($('next'))){message='她已准备好入座。点“进入问诊”，开始了解困扰。';label='进入问诊';selector='#next';action=()=>$('next').click();}
  else if(!node){message='你好，我是动小助。点“接待患者”开始；查看器材后，可切回接诊。';label='接待患者';selector='#begin';action=()=>$('begin').click();}
  else if(visible($('next'))&&!$('next').disabled){const handoff=$('filmHandoff');message=node.terminal?'接诊已结束。保存本轮记录，再做复盘。':visible(handoff)?handoff.textContent+'。点左侧“继续”衔接这一步。':'这一步已准备好，点“继续”进入下一环节。';label=node.terminal?'保存学习':'继续接诊';selector='#next';action=()=>$('next').click();}
  else if(node.task?.type==='staticCOP'){
   message=stepBook.get('cop54_full')?'比较两组轨迹，记录静态平衡表现。':'回放采集或查看完整30秒，再比较两组。';selector='#taskSurface';
  }else if(node.task?.type==='goniometer'){
   message=motionComplete(stepBook)?'保存运动辨认结果。':'先看动作和关节，再选择相应的运动方向。';selector='#taskSurface';
  }else if(node.task?.type==='muscle'){
   message=strengthComplete(stepBook)?'保存本次肌力检查结果。':'依次选左足和右足，施加相同阻力并观察。';selector='#taskSurface';
  }else if(node.task?.type==='arch'){
   message='打开右足骨骼模型，切换足弓，在骨面上点选。';selector='[data-open-arch-bones]';
  }else if(node.task?.type==='plantarScan'){
   message=stepBook.get('plantarScan')?'比较两脚的中足接触，再听色标说明。':'让患者站稳，选择“开始足底扫描”。';selector=stepBook.get('plantarScan')?'#options button':'[data-start-scan]';
  }else if(node.task?.type==='gait'){
   const complete=gaitPhasesComplete(stepBook);
   message=complete?'三个时相都看过了，可以听治疗师解释步态。':stepBook.get('cycleAnswer')==='cycle'?'点选三个时相，看哪只脚着地，哪只脚摆动。':'以右脚为参照，选择一个完整的步态周期。';
   selector=complete?'[data-option="events_done"]':'#taskSurface';
  }else if(node.task?.type==='pressure'){
   if(node.task.stage==='conditions'){
    message=stepBook.has('mode')?'已切换图形。核对任务和图形类型，再点右边下方的判断。':'先看“静态站立”；再切换“行走瞬时”或“最大压力复合图”，留意三者含义不同。';selector=stepBook.has('mode')?'#options button':'[data-mode="dynamic"]';
   }else if(!stepBook.has('region')){message='先在右边选足跟、中足或前足。然后播放行走，看这个区域何时承重。';selector='[data-region="中足"]';}
   else if(Number(stepBook.get('dynamicMax')||0)-Number(stepBook.get('dynamicMin')||0)>=.15){message='已有一段动态观察。点右边下方的判断，继续解释足底负荷。';selector='#options button';}
   else if(pressureMode!=='dynamic'){message='现在切到“行走瞬时”，才能观察踩板时的压力和COP变化。';selector='[data-mode="dynamic"]';}
   else if(Number(stepBook.get('dynamicMax')||0)-Number(stepBook.get('dynamicMin')||0)<.15){message='点“播放采集”，让患者走过压力板。也可以拖动，比较不同时刻。';selector='#taskPlay';}
   else{message='已有一段动态观察。点右边下方的判断，继续解释足底负荷。';selector='#options button';}
  }else if(node.task?.type==='balance'){
   const list=node.task.checklist||[],i=list.findIndex((_,n)=>!stepBook.get('check'+n));
   message=i>=0?`先确认“${list[i]}”，再勾选；安全条件齐备后选择下一步。`:'条件已核对。与患者商量下一步；她可以选择不做。';selector=i>=0?`#taskSurface input[data-condition="${i}"]`:'#options button';
  }else if(node.options?.length){message=node.task&&!['history','evidence'].includes(node.task.type)?'在右边面板下方选择判断，随后自动衔接。':'从左边选择你的回应，随后自动衔接。';selector='#options button';}
  else{message='回到左侧，查看当前说明或接诊记录。';selector='#conversation';}
  const signature=message+'|'+label+'|'+selector;
  if(signature!==lastSignature){text.textContent=message;button.textContent=label;lastSignature=signature;}
  destination=selector;activation=action;button.disabled=!selector&&!action;
  $('coachStage').textContent=removal?.active?'赤足准备':({goniometer:'踝足运动辨认',trial:'哪次触墙有效',muscle:'踝足肌力检查',arch:'静态足弓',gait:'步态周期',pressure:'足压观察',balance:'平衡准备',plan:'综合判断'})[node?.task?.type]||'下一步怎么做';
  box.hidden=false;
 }
 return {update,locate};
}
