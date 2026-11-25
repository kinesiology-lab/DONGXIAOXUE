// Copy a prior session; never overwrite the old localStorage entry or invent new evidence.
export function migrateProgress(prior,version,flow,at) {
  const result=structuredClone(prior);
  if(!['v13','v12'].includes(version)&&result.taskState)result.taskState={...result.taskState,values:{},phase:0,pressureMode:'static'};
  if(!['v13','v12'].includes(version))result.barefootPrepared=!['act1','act2'].includes(flow[prior.node].act);
  const stage=flow[prior.node]?.act;
  const current=Number(stage?.replace('act',''))||9;
  const missing=[];
  if(current>3&&!result.taskReceipts?.muscle_match)missing.push('muscle_match');
  if(current>4&&!result.taskReceipts?.arch_compare)missing.push('arch_compare');
  result.records=[...(result.records||[])];
  if(missing.length)result.records.push({nodeId:prior.node,migration:'v14',newLearningNotPerformed:missing});
  result.appearanceMigration={from:version,to:'v14',at,historyRetained:true,taskValuesRetained:['v13','v12'].includes(version),displayAlias:{'陈先生':'陈女士'}};
  result.scriptVersion='v14';
  return result;
}

// Preserve a learner's position in the former arch-first route.
export function updateBedsideOrder(saved){
  if(!saved||saved.routeVersion>=53||saved.completedAt||saved.exitLock)return saved;
  const arch=['arch_intro','arch_compare','arch_concern'];
  if(arch.includes(saved.node)&&!saved.taskReceipts?.ankle_stress&&!saved.skippedSteps?.ankle_stress){
    saved.afterBedside=saved.node;
    saved.node='ankle_stress';
    saved.choiceLock=null;
  }else if(['ankle_stress','exam_reasoning'].includes(saved.node)&&
      (saved.taskReceipts?.arch_compare||saved.skippedSteps?.arch_compare)){
    saved.afterBedside='muscle_intro';
  }
  for(const lock of [saved.choiceLock,...Object.values(saved.navigationBookmarks||{}).map(b=>b.choiceLock)]){
    if(lock?.nodeId==='consent_reply'&&lock.nextId==='arch_intro')lock.nextId='ankle_stress';
    if(lock?.nodeId==='exam_reasoning'&&lock.nextId==='muscle_intro')lock.nextId='arch_intro';
  }
  saved.routeVersion=53;
  return saved;
}

export function legacyBedsideCheckpoint(events=[]){
 const completed=[],omitted=new Set();
 let stage=null,test=0,attempts=0,errors=0,retryNeedsConsent=false;
 for(const e of events){
  if(!e.type?.startsWith('clinic3d_bedside_'))continue;
  const p=e.payload||{},second=p.test==='内翻加压试验';
  if(!second&&completed.includes('anterior_drawer'))continue;
  if(second){test=1;if(stage==='next')stage='neutral';}
  if(e.type==='clinic3d_bedside_step_skipped')omitted.add(second?1:0);
  if(e.type==='clinic3d_bedside_consent'&&p.agreed){stage=p.retry?'fixed':'protection';retryNeedsConsent=false;}
  if(e.type==='clinic3d_bedside_protection_completed')stage='transfer';
  if(e.type==='clinic3d_bedside_position'||e.type==='clinic3d_bedside_placement')stage='fixed';
  if(e.type==='clinic3d_bedside_motion_start')attempts++;
  if(e.type==='clinic3d_bedside_motion_feedback'&&['student_stop','too_fast'].includes(p.kind)){stage='retry';retryNeedsConsent=true;errors++;}
  if(e.type==='clinic3d_bedside_motion_complete'){
   const key=second?'inversion_stress':'anterior_drawer';
   if(!omitted.has(second?1:0)&&!completed.includes(key))completed.push(key);
   stage=second?'interpret':'next';
  }
 }
 return stage?{stage,test,completed,omitted:[...omitted],attempts,errors,retryNeedsConsent}:null;
}

export const bothBedsideTests=r=>['anterior_drawer','inversion_stress'].every(test=>Array.isArray(r?.completed)&&r.completed.includes(test));

function restorePartialBedside(saved){
 const partial=saved?.taskReceipts?.ankle_stress;
 if(!partial||bothBedsideTests(partial)||saved.completedAt||saved.exitLock)return;
 const recorded=saved.events?.findLast(e=>e.type==='clinic3d_bedside_completed'&&bothBedsideTests(e.payload));
 if(recorded){saved.taskReceipts.ankle_stress={...partial,...recorded.payload};return;}
 const checkpoint=saved.bedsideCheckpoint;
 if(!checkpoint||checkpoint.stage==='complete'){
  const completed=Array.isArray(partial.completed)?partial.completed:[];
  const second=completed.includes('anterior_drawer');
  saved.bedsideCheckpoint={...partial,completed,test:second?1:0,stage:second?'neutral':null};
 }
 saved.records||=[];saved.records.push({nodeId:'ankle_stress',partialBedside:partial});
 delete saved.taskReceipts.ankle_stress;
}

// Older versions could send a skipped bedside examination back through intake.
export function recoverSkippedBedside(prior){
 const saved=updateClinicalOrder(prior);
 if(saved){
  for(const entry of [saved,...Object.values(saved.navigationBookmarks||{})]){
   if(entry.node==='arch_index')entry.node='local_intro';
   if(entry.nodeId==='arch_index')entry.nodeId='local_intro';
   if(['arch_index','trial','local_explain'].includes(entry.choiceLock?.nodeId))entry.choiceLock=null;
   if(entry.choiceLock?.nextId==='arch_index')entry.choiceLock.nextId='local_intro';
   if(['arch_index','trial'].includes(entry.taskState?.nodeId))entry.taskState=null;
  }
  for(const key of ['afterBedside','preparationReturnNode','clinicalResume','autoDialogueNext'])
   if(saved[key]==='arch_index')saved[key]='local_intro';
  if(saved.clinicalResumeBookmark?.nodeId==='arch_index')saved.clinicalResumeBookmark=null;
  for(const id of ['local_explain','trial'])if(saved.communicationRepairs?.[id])saved.communicationRepairs[id].pending=false;
 }

 restorePartialBedside(saved);
 if(!saved||saved.routeVersion>=56||saved.completedAt||saved.exitLock)return saved;
 const inIntake=['safety','safety_answer','goal','goal_answer','fear_check','fear_reply','consent','consent_reply'].includes(saved.node);
 const lastRoute=(saved.events||[]).findLast(e=>['clinic3d_film_handoff_needs_consent','student_navigation_jump','clinic3d_bedside_completed'].includes(e.type));
 const detour=inIntake&&lastRoute?.type==='clinic3d_film_handoff_needs_consent';
 const target=detour?(saved.preparationReturnNode||lastRoute.payload?.fromNode):saved.node;
 const finished=!!(saved.taskReceipts?.ankle_stress||saved.skippedSteps?.ankle_stress);
 if((detour||target==='ankle_stress'||target==='exam_reasoning')&&finished){
  saved.node=['ankle_stress','exam_reasoning'].includes(target)?(saved.afterBedside||'arch_intro'):target;
  saved.choiceLock=null;saved.preparationReturnNode=null;saved.taskState=null;
  if(saved.node===saved.afterBedside)delete saved.afterBedside;
 }
 saved.routeVersion=56;
 return saved;
}

export function updateClinicalOrder(prior){
 const saved=updateBedsideOrder(prior);
 if(!saved||saved.routeVersion>=54||saved.completedAt||saved.exitLock)return saved;
 const seen=id=>!!(saved.taskReceipts?.[id]||saved.skippedSteps?.[id]);
 const next={arch_concern:'pressure_intro',arch_index:'local_intro',local_explain:'muscle_intro',muscle_match:'balance_intro'};
 if(saved.afterBedside==='muscle_intro')saved.afterBedside='pressure_intro';
 const bookmarks=saved.navigationBookmarks||{};
 if(bookmarks.act6&&!bookmarks.act4)bookmarks.act4=bookmarks.act6;
 delete bookmarks.act6;
 for(const entry of [saved,...Object.values(bookmarks)]){
  const lock=entry.choiceLock;
  if(!lock)continue;
  if(['alignment','muscle_match','static_cop'].includes(lock.nodeId))entry.choiceLock=null;
  else if(next[lock.nodeId]&&lock.nextId!==lock.nodeId)lock.nextId=next[lock.nodeId];
 }
 const motion=['local_intro','alignment','trial','local_record','local_explain'].includes(saved.node);
 const strength=['muscle_intro','muscle_match','muscle_method','muscle_explain'].includes(saved.node);
 const enter=(!seen('arch_index')&&!seen('pressure_compare')&&(motion||strength))?'pressure_intro':strength&&!seen('alignment')?'local_intro':null;
 if(enter){
  saved.clinicalResume= saved.node==='muscle_method'||saved.node==='muscle_explain'?'muscle_match':saved.node;
  saved.clinicalResumeBookmark=saved.taskState?.nodeId===saved.node?saved.taskState:null;
  saved.node=enter;saved.choiceLock=null;
 }
 saved.routeVersion=54;
 return saved;
}

// Preserve scan data collected under the earlier, pressure-first curriculum.
export function updatePressureOrder(prior){
 const saved=recoverSkippedBedside(prior);
 if(!saved||saved.routeVersion>=71||saved.completedAt||saved.exitLock)return saved;
 const scanNodes=['arch_concern','pressure_compare','pressure_intro','cop_explain'];
 const marks=saved.navigationBookmarks||{};
 if(scanNodes.includes(marks.act4?.nodeId)){
  marks.act6=marks.act4;delete marks.act4;
 }
 const next={arch_compare:'local_intro',muscle_match:'arch_concern',pressure_compare:'pressure_intro',cop_explain:'balance_intro'};
 for(const entry of [saved,...Object.values(marks)]){
  const lock=entry.choiceLock;
  if(lock&&next[lock.nodeId]&&lock.nextId!==lock.nodeId)lock.nextId=next[lock.nodeId];
 }
 const scanDone=saved.taskReceipts?.pressure_compare?.scope==='case-plantar-scan'||saved.skippedSteps?.pressure_compare;
 const explained=saved.learningSteps?.cop_explain||saved.skippedSteps?.cop_explain;
 const motionNodes=['local_intro','alignment','rom_measure','rom_report','trial','local_record','wall_adjust','wall_measure','local_explain','muscle_intro','muscle_match'];
 if(scanNodes.includes(saved.node)&&!saved.taskReceipts?.muscle_match&&!saved.skippedSteps?.muscle_match){
  const resume=saved.node==='pressure_intro'&&!scanDone?'pressure_compare':saved.node;
  saved.pressureResume={nodeId:resume,taskState:saved.taskState?.nodeId===resume?saved.taskState:null};
  saved.node=saved.clinicalResume||'local_intro';
  saved.taskState=saved.clinicalResumeBookmark?.nodeId===saved.node?saved.clinicalResumeBookmark:null;
  delete saved.clinicalResume;delete saved.clinicalResumeBookmark;
  saved.choiceLock=null;saved.autoDialogueNext=null;
 }else if(motionNodes.includes(saved.node)&&(explained||scanDone)){
  saved.pressureResume={nodeId:explained?'balance_intro':'cop_explain'};
 }
 if(['arch_concern','pressure_intro'].includes(saved.afterBedside))saved.afterBedside='local_intro';
 saved.routeVersion=71;return saved;
}

export function updateAssessmentOrder(prior){
 const saved=updatePressureOrder(prior);
 if(!saved||saved.routeVersion>=72||saved.completedAt||saved.exitLock)return saved;
 const next={ankle_stress:'local_intro',arch_intro:'arch_compare',arch_compare:'arch_view',arch_view:'arch_concern',muscle_match:'arch_intro'};
 for(const entry of [saved,...Object.values(saved.navigationBookmarks||{})]){
  const lock=entry.choiceLock;
  if(lock&&next[lock.nodeId]&&lock.nextId!==lock.nodeId)lock.nextId=next[lock.nodeId];
  if(lock?.nodeId==='synthesis')entry.choiceLock=null;
 }
 if(saved.afterBedside==='arch_intro')delete saved.afterBedside;
 const marks=saved.navigationBookmarks||{};
 if(['arch_intro','arch_compare','arch_view'].includes(marks.act4?.nodeId)){
  marks.act6??=marks.act4;delete marks.act4;
 }
 saved.routeVersion=72;return saved;
}
