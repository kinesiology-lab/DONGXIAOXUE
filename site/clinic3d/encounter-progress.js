import {caseWorkshops} from './case-workshops.js?v=79';
import {romTrials,validReading,sideLabel} from './goniometry.js?v=74';
// The regular patient encounter has one fixed denominator. Optional conversations and
// the alternative safety exit do not add extra steps to the main case.
const lessons = [
  ['welcome','接诊陈女士'], ['history','询问受伤经过'], ['trigger_answer','听取病史'],
  ['injury_question','了解患者对反复崴脚的疑问'], ['injury_mechanism','辨认内翻损伤机制','anatomical-model-reasoning'],
  ['safety','询问检查安全事项'], ['safety_answer','听取症状与安全信息'], ['goal','询问患者目标'],
  ['goal_answer','了解患者的活动目标'], ['fear_check','回应行走顾虑'], ['consent','说明检查目的'], ['consent_reply','取得检查同意'],
  ['ankle_stress','完成床旁稳定性检查','receipt'],
  ['local_intro','说明活动度检查'], ['alignment','学习并辨认踝足运动','ankle-motion-knowledge'],
  ...romTrials.map(t=>['rom:'+t.key,sideLabel(t.side)+'踝'+t.mode+t.move.name+'读数',t]),
  ['rom_report','听取双侧活动度报告'],['trial','进行负重弓步测试'], ['local_record','听取弓步测试感受'], ['wall_adjust','调整膝触墙姿势'],
  ['wall_measure','用软尺测量双侧距离','wblt-tape'], ['local_explain','解释双侧测量结果'],
  ['muscle_intro','说明肌力检查'], ['muscle_match','比较双侧踝足肌力','simulated-ankle-strength'],
  ['arch_intro','说明足弓检查'], ['arch_compare','辨认三条足弓的骨骼','foot-arch-bone-selection'], ['arch_view','比较坐位与站位足弓','arch-posture-comparison'],
  ['arch_concern','说明足底扫描'], ['pressure_compare','采集双足足印','case-plantar-scan'],
  ['pressure_intro','查看扫描结果'], ['cop_explain','解释足印颜色'],
  ['balance_intro','说明静态平衡检查'], ['static_cop','判读静态平衡轨迹','static-balance-interpretation'],
  ['gait_intro','观察患者步行'], ['gait_instruction','指导自然步行'], ['gait_events','展示步态周期各时相','gait-cycle-phases'],
  ['gait_interpret','解读保护性步态'], ['exam_close','结束检查并请患者穿鞋'], ['exam_findings','向患者说明检查发现'],
  ['soap_review','核对 SOAP 病历'], ['plan_intro','讨论评定与计划'], ['synthesis','根据证据形成评定'],
  ['plan','书写近期与远期计划','written-plan'], ['plan_discussion','听取医患商定的计划与复评安排'], ['debrief','复盘病例证据'], ['uncertainty','辨别尚待验证的判断'],
  ['transfer','选择复评方法'], ['finish','保存本次学习']
];
for(const [after,id] of [['goal_answer','case_cardio'],['local_intro','case_bones'],['rom_report','case_chain'],['muscle_intro','case_paint'],['case_paint','case_place'],['muscle_match','case_contractions'],['static_cop','case_posture'],['gait_events','case_transfer']]){
  lessons.splice(lessons.findIndex(row=>row[0]===after)+1,0,[id,caseWorkshops[id].title,'case-workshop']);
}
const tracked = new Set(lessons.map(([id])=>id));

export function markLearningStep(state,id){
  if(tracked.has(id)) (state.learningSteps ||= {})[id]=true;
}

// Older saves recorded actual transitions. An entry reached through the project
// guide, a skip, or a retry cannot establish completion of the previous step.
export function recoverLearningSteps(state,flow){
  if(!state || state.learningSteps) return;
  state.learningSteps={};
  let previous;
  for(const event of state.events || []){
    const {nodeId,navigationEntry}=event.payload || {};
    if(event.type==='clinic3d_step_skipped' || event.type==='student_navigation_jump') previous=null;
    if(event.type!=='clinic3d_node') continue;
    if(previous && !navigationEntry && nodeId!==previous.id &&
       (previous.next===nodeId || previous.options?.some(o=>o.next===nodeId && !o.retry && o.good!==false))){
      markLearningStep(state,previous.id);
    }
    previous=flow[nodeId];
  }
}

export function encounterProgress(state={}){
  const rows=lessons.map(([id,title,scope])=>{
    const receipt=state.taskReceipts?.[id];
    let done=!!state.learningSteps?.[id];
    if(scope) done=!!receipt && (scope==='receipt' || receipt.scope===scope);
    if(typeof scope==='object'){
      const measurements=state.taskReceipts?.rom_measure;
      const previousKey=scope.key.replace('_rear_','_');
      done=validReading(measurements,scope)||!!(state.completedAt&&state.routeVersion<71&&!scope.move.sagittal&&Number.isFinite(measurements?.readings?.[previousKey]));
    }
    if(id==='arch_view' && receipt?.subject!=='case') done=false;
    if(id==='synthesis' && state.routeVersion>=72 && !state.completedAt)done=receipt?.scope==='written-assessment';
    if(id==='soap_review') done=!!state.soapReviewPassed;
    if(id==='exam_close') done=done || !!state.examShoesOn && !state.skippedSteps?.exam_close && state.visited?.includes('exam_close');
    if(id==='exam_findings') done=done || !!state.examFeedbackDone;
    if(id==='finish') done=!!state.completedAt && !state.exitLock;
    const status=done?'已完成':(state.skippedSteps?.[id] || typeof scope==='object'&&state.skippedSteps?.rom_measure)?'已跳过':(state.node===id || state.node==='rom_measure' && id==='rom:'+state.currentRomKey)?'进行中':'待学习';
    return {id,title,status};
  });
  const total=rows.length, completed=rows.filter(row=>row.status==='已完成').length;
  return {rows,total,completed,skipped:rows.filter(row=>row.status==='已跳过').length,
    percent:completed===total?100:Math.floor(completed*100/total)};
}
