// Findings are authored for this patient. Only observations collected in this encounter are eligible.
export function caseFindings(state){
  const findings=[], evidence=new Set(state.evidence||[]), r=state.taskReceipts||{};
  function add(id,group,title,detail){findings.push({id,group,title,detail});}
  if(evidence.has('injury_history'))add('sprains','病史','右踝反复内翻扭伤','约一年前首次扭伤，此后又扭伤两次，最近一次在跑步变向时。');
  if(evidence.has('triggers'))add('giving','功能性线索','走不平路时右脚会发软','患者报告反复出现不稳感，并担心再次扭伤。');
  const stress=r.ankle_stress||state.bedsideCheckpoint;
  if(stress?.completed?.includes('anterior_drawer')||state.clinicalArchive?.drawer)add('drawer','机械性线索','右踝前移较左侧大','前抽屉试验中两侧前移有差异，提示外侧韧带的被动约束可能减弱。');
  if(stress?.completed?.includes('inversion_stress')||state.clinicalArchive?.tilt)add('tilt','机械性线索','右踝内翻倾斜较左侧大','内翻加压试验与对侧比较提示右侧被动稳定性下降。');
  if(r.arch_view?.subject==='case')add('arch','伴随发现','负重时右足内侧纵弓降低','坐位和站位的外观有差异，需要结合症状和足印解释。');
  const readings=r.rom_measure?.readings;
  if(Number.isFinite(readings?.L_up_0)&&Number.isFinite(readings?.R_up_0)&&readings.R_up_0<readings.L_up_0)add('rom','伴随发现','右踝主动背伸较小','同一量角方法测得左 '+readings.L_up_0+'°、右 '+readings.R_up_0+'°。');
  const tape=r.wall_measure;
  if(tape?.scope==='wblt-tape'&&Number.isFinite(tape.rightCm)&&Number.isFinite(tape.leftCm)&&tape.rightCm<tape.leftCm)add('lunge','伴随发现','右侧负重膝触墙距离较短','足跟着地时，右 '+tape.rightCm.toFixed(1)+' cm，左 '+tape.leftCm.toFixed(1)+' cm。');
  if(r.muscle_match?.scope==='simulated-ankle-strength'&&r.muscle_match.values?.bedStrength_interpret===true)add('resistance','功能性线索','右足抗阻外翻较早回落','相同模拟阻力下，右侧维持外翻的表现弱于左侧。');
  if(r.pressure_compare?.scope==='case-plantar-scan')add('print','伴随发现','站立时右足内侧中足接触较宽','同次扫描、同一色标下比较双脚。足印用于描述负荷分布。');
  if(r.static_cop?.scope==='static-balance-interpretation')add('balance','功能性线索',r.static_cop.values?.cop71_closed?'闭眼时双足站立摆动增大':'双足站立时压力中心摆动较大',r.static_cop.values?.cop71_closed?'同一患者、相同站姿和时长，闭眼时 COP 路径更长，反映整体姿势控制。':'同条件教学对照显示路径较长。双足测试无法单独定位右侧。');
  if(r.gait_events?.scope==='gait-cycle-phases'||evidence.has('gait_observation'))add('gait','功能性线索','右脚单独支撑时间较短','病例步态中右单支撑占 30%，双支撑占 26%，提示右脚负重时采取保护策略。');
  return findings;
}

export const mixedExplanation='陈女士，您这是右侧慢性踝关节不稳。检查时，右脚踝比左边松一些。您走不平路时还会发软。这说明关节的稳定性和活动时的控制能力都受到了影响。';

export function assessInstability(state,findings=caseFindings(state)){
  const ids=new Set(findings.map(f=>f.id));
  if(state.exitLock)return {mixed:false,text:state.evidence?.includes('referral')?'已暂停检查，先转医学评估。':'本次检查提前结束，分型待评估。'};
  const missing=[];
  if(!ids.has('sprains'))missing.push('首次和再次扭伤的病史');
  if(!ids.has('giving'))missing.push('打软腿的情境与频率');
  if(!ids.has('drawer')||!ids.has('tilt'))missing.push('双侧韧带稳定性对照');
  if(!ids.has('resistance')&&!ids.has('gait'))missing.push('患侧肌力或步态表现');
  if(missing.length)return {mixed:false,text:'骨科已确诊右侧慢性踝关节不稳。本次功能评定还需核对'+missing.join('、')+'。'};
  return {mixed:true,text:'右侧慢性踝关节不稳（CAI），兼有机械性和功能性不稳。前抽屉和内翻加压试验均见右侧较松，支持机械性成分。反复发软，结合'+(ids.has('resistance')?'右足抗阻外翻较早回落':'右脚单独支撑时间缩短')+'，支持功能性成分。'};
}
