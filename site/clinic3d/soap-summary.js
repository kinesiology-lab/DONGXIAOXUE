import {caseFindings,assessInstability,mixedExplanation} from './case-evidence.js?v=72';
import {romRows,previousROM} from './goniometry.js?v=71';
// Summarise this encounter from observations, receipts and accepted decisions only.
export function soapSummary(state,handouts=[]){
  const evidence=new Set(state.evidence||[]), receipts=state.taskReceipts||{};
  const sections={S:[],O:[],A:[],P:[]};
  const {S,O,A,P}=sections;
  S.push('骨科转诊诊断：慢性右踝关节不稳。');
  if(evidence.has('injury_history'))S.push('约一年前下楼时右踝向内扭伤，外踝疼痛。此后又崴两次，最近一次在跑步转弯时。');
  if(evidence.has('triggers'))S.push('走不平路时右脚会发软，担心再崴。');
  if(evidence.has('screening'))S.push('久站或走多后酸胀、发紧，坐下休息后减轻。近期无新伤或麻木，能步行。');
  if(state.visited?.includes('case_cardio'))S.push('陈女士 28 岁，喜欢爬山，希望能安心走山路。');
  if(evidence.has('goal'))S.push('希望先走稳不平路，再逐步恢复慢跑。');
  if(evidence.has('declined'))S.push('患者选择暂停进一步检查。');
  const stress=receipts.ankle_stress?.completed||[];
  if(stress.includes('anterior_drawer'))O.push('前抽屉试验：右侧前移较对侧略大。');
  if(stress.includes('inversion_stress'))O.push('内翻加压试验：右侧内翻倾斜较对侧略大。');
  if(receipts.arch_view?.subject==='case'||evidence.has('arch_record'))O.push('右足内侧纵弓在站立负重时较坐位降低。');
  for(const {move,values} of romRows(receipts.rom_measure)){
    if(values.some(v=>v!=='—'))O.push((move.sagittal?'':'后足')+move.name+'（主动 / 被动）：左 '+values.slice(0,2).join(' / ')+'，右 '+values.slice(2).join(' / ')+'。');
  }
  for(const {name,values} of previousROM(receipts.rom_measure))O.push('旧记录 · 坐位前方'+name+'（主动 / 被动）：左 '+values.slice(0,2).join(' / ')+'，右 '+values.slice(2).join(' / ')+'。');
  const wall=receipts.wall_measure;
  if(wall?.scope==='wblt-tape'&&Number.isFinite(wall.rightCm)&&Number.isFinite(wall.leftCm)){
    O.push('负重弓步膝触墙距离：右 '+wall.rightCm.toFixed(1)+' cm，左 '+wall.leftCm.toFixed(1)+' cm。');
  }
  if(receipts.muscle_match?.scope==='simulated-ankle-strength'&&receipts.muscle_match.values?.bedStrength_interpret===true)O.push('同等模拟阻力下，右足外翻较左足更早回落。背伸、跖屈和内翻未见明显侧差。');
  if(receipts.pressure_compare?.scope==='case-plantar-scan')O.push('双足站立扫描：与左足相比，右足内侧中足接触区域较宽。');
  if(receipts.static_cop?.scope==='static-balance-interpretation')if(receipts.static_cop.values?.cop71_closed)O.push('双足站立各 30 秒，模拟病例闭眼时 COP 路径更长、平均速度更高。');else O.push('双足睁眼站立 30 秒：病例示例的压力中心路径比参考轨迹长，平均移动速度较高。');
  const balance=receipts.static_cop?.values||{};
  const stance=['L','R'].filter(side=>Number.isFinite(balance['stance77_'+side])).map(side=>(side==='L'?'左':'右')+' '+balance['stance77_'+side]+' 秒');
  if(stance.length)O.push('闭眼单腿站立（病例模拟）：'+stance.join('、')+'。');
  if(receipts.gait_events?.scope==='gait-cycle-phases'||evidence.has('gait_observation'))O.push('病例步态中右足单独支撑占周期 30%，双足同时着地占 26%。');
  if(Number.isFinite(receipts.gait_events?.values?.heelRiseMark))O.push('逐帧标记：右足跟开始抬起，早于同一周期的教学参考，前足仍接触地面。');
  if(evidence.has('gait_observation'))O.push('右足承重早期负荷偏外侧，蹬地减弱，迈右腿时髋部代偿。');
  for(const row of handouts)if(state.reviewedEvidence?.includes(row.id)&&row.result)O.push('已查阅的病例资料 · '+row.title+'：'+row.result);
  if(evidence.has('gait_observation'))A.push('步态表现提示右侧保护性负重。');
  const findings=caseFindings(state);
  if(findings.length||state.exitLock)A.unshift(assessInstability(state,findings).text);
  if(receipts.synthesis?.scope==='written-assessment')A.push('学生功能评定：'+receipts.synthesis.diagnosis,'待验证的机制与复评办法：'+receipts.synthesis.reasoning);
  const plans={control:'从踝足力量与稳定控制练习开始，依据反应逐步进阶。',mobility:'练习踝背伸，下次用相同方法复测膝触墙距离。',load:'调整久站负荷，观察休息后的症状，再讨论辅助支撑。',assessment:'先补齐相关检查，再共同确定练习方案。'};
  for(const domain of new Set((state.records||[]).map(r=>r.planDomain)))if(plans[domain])P.push(plans[domain]);
  if(state.writtenPlan?.submitted){P.push('学生近期计划：'+state.writtenPlan.short,'学生远期计划：'+state.writtenPlan.long);}
  if(evidence.has('referral'))P.push('结束本次体能检查，转进一步医学评估。');
  return sections;
}
export function spokenFindings(state){
  const receipts=state.taskReceipts||{}, evidence=new Set(state.evidence||[]),lines=[];
  const stress=receipts.ankle_stress?.completed||[];
  if(stress.includes('anterior_drawer')&&stress.includes('inversion_stress'))lines.push('刚才比较两边，您的右脚踝比左边稍微松一些。');
  if(receipts.arch_view?.subject==='case'||evidence.has('arch_record'))lines.push('您站起来以后，右脚内侧的足弓比坐着时低一些。');
  else if(receipts.pressure_compare?.scope==='case-plantar-scan')lines.push('从这次足印看，右脚中间偏内侧接触地面的范围比左脚大。');
  const tape=receipts.wall_measure;
  if(tape?.scope==='wblt-tape'&&Number.isFinite(tape.rightCm)&&Number.isFinite(tape.leftCm)&&tape.rightCm<tape.leftCm)lines.push('刚才量了膝盖碰墙的距离，右边比左边短，右脚踝往上活动的幅度小一些。');
  if(receipts.muscle_match?.values?.bedStrength_interpret===true)lines.push('脚往外用力时，右边比左边更早顶不住我的手。');
  if(receipts.static_cop?.scope==='static-balance-interpretation')lines.push(receipts.static_cop.values?.cop71_closed?'这次闭眼以后，您站着的时候晃动更多。我们会结合肌力和走路的情况一起判断。':'刚才站在测力板上时，您脚下的压力中心移动得比参考轨迹多。');
  if(evidence.has('gait_observation'))lines.push('走路时，您右脚单独撑地的时间较短，往前蹬的力也小一些。');
  if(assessInstability(state).mixed)lines.push(mixedExplanation);
  return (lines.length?lines:['今天做过的检查我都记下了，还缺的部分下次再补。']).map(text=>({speaker:'therapist',text}));
}
