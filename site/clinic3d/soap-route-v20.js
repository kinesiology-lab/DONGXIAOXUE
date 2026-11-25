// SOAP course adapter. Retains historical node IDs without granting old evidence.
import {firstInjury,laterInjuries} from './inversion-lesson.js';
import {currentCase} from './differential.js';
export const SOAP_STAGES=[
 {act:'act1',entry:'welcome',title:'S · 病史与目标',goal:'听清困扰与活动目标',task:'问受伤、症状、既往处理与意愿'},
 {act:'act4',entry:'ankle_stress',title:'O · 床旁稳定性',goal:'辨认机械性不稳线索',task:'取得同意，完成前抽屉与内翻应力检查'},
 {act:'act2',entry:'local_intro',title:'O · 活动与轴面',goal:'认识运动方向与测量',task:'了解量角器摆法，辨认主要关节与开链复合运动'},
 {act:'act3',entry:'muscle_intro',title:'O · 踝足肌群',goal:'比较踝足四个方向的抗阻表现',task:'先检查肌力，可选做肌肉解剖测试和彩绘'},
 {act:'act6',entry:'arch_intro',title:'O · 足弓与足底压力',goal:'解释承重时的变化',task:'辨认三条足弓，比较坐位和站位，预判高压区后揭示足印'},
 {act:'act7',entry:'balance_intro',title:'O · 静态COP',goal:'解读扭伤后站立时的姿势控制',task:'比较同条件的压力中心路径与平均速度'},
 {act:'act5',entry:'gait_intro',title:'O · 步态周期',goal:'看支撑、摆动与双侧差异',task:'回答步态周期的定义，展示三个时相'},
 {act:'act8',entry:'plan_intro',title:'A / P · 解释与计划',goal:'证据对应功能目标',task:'提出解释、选训练靶点与复评'}
];
export const VOICED_TURNS={
 welcome:[['therapist','陈女士，您好。最近哪里不舒服？'],['patient','右脚这一年崴了三次，走路总怕发软。'],['therapist','我理解。我们先聊清楚，再一起检查。']],
 local_intro:[['therapist','现在看踝关节背伸和跖屈。'],['patient','向上动时，右边有点紧。'],['therapist','我们慢慢来，不舒服就停。']],
 muscle_intro:[['therapist','肌肉既产生动作，也帮助稳定脚踝。'],['patient','往外稳住脚，是哪些肌肉呢？'],['therapist','一起看腓骨长肌和短肌。']],
 arch_intro:[['therapist','请坐稳，先脱鞋袜，再比较坐着和站着的足弓。'],['patient','站久了，我的脚内侧会酸。'],['therapist','我们先观察负重前后的变化。']],
 pressure_intro:[['therapist','先看足印，再比较足底负荷。'],['patient','颜色越红，就是越严重吗？'],['therapist','不是。颜色要结合色标、任务和症状看。']],
 balance_intro:[['therapist','请睁眼、双脚自然站稳。我们看静态压力中心。'],['patient','站着没动，这个点也会移动吗？'],['therapist','会有小幅移动。身体一直在调整平衡。']],
 gait_intro:[['therapist','请按平常方式走，不必刻意踩板。'],['patient','我走快或变向时，总担心又崴。'],['therapist','我们先看双侧支撑和摆动的差别。']],
 plan_intro:[['therapist','把实际取得的资料放在一起，再商量计划。'],['patient','我想先安心走路，再慢慢跑步。'],['therapist','好。先定可做到的目标，再安排复评。']]
};
export function applySOAPRoute(flow,data,evidence){
 data.acts=[...SOAP_STAGES.map(s=>({id:s.act,title:s.title,shortTitle:s.title.split(' · ')[1],zone:s.goal})),{id:'debrief',title:'学习复盘',shortTitle:'复盘',zone:'证据板'}];
 const edge=(id,option,next)=>{const o=flow[id].options.find(o=>o.id===option);if(o)o.next=next;};
 edge('consent_reply','reassure_without_guarantee','ankle_stress');

 for(const o of flow.muscle_match.options){o.next='local_intro';o.label=o.id==='muscle_defer'?'暂记待补，进入关节活动':'完成配对，观察关节活动';o.shortLabel=o.label;}
 flow.local_intro.next='alignment';
 edge('local_explain','limited_inference','muscle_intro');
 edge('gait_interpret','observe_only','plan_intro');
 flow.cop_explain.options.find(o=>o.id==='cop_limit').next='local_intro';
 flow.pressure_intro.text='比较同条件的足印与负荷。';
 flow.balance_intro.speaker='林治疗师';flow.balance_intro.text='双脚自然站稳、睁眼，看静态压力中心的小幅变化。';flow.balance_intro.next='static_cop';flow.balance_intro.visualMode='pressure';
 const node=(id,act,text,type,next)=>({id,act,kind:'task',speaker:'动小助',text,visualMode:'pressure',task:{type,instructions:text},options:[{id:id+'_done',label:'完成记录，继续',next,good:true,safe:true,requiresTask:true,evidence:[id]}]});
 flow.static_cop=node('static_cop','act7','双足站稳，分别观察睁眼与闭眼各 30 秒的轨迹，比较路径长度和平均速度。','staticCOP','gait_intro');
 evidence.arch_index={label:'足弓指数计算练习',status:'synthetic_teaching_data',text:'原创足印面积：后足30、中足40、前足50平方厘米，AI=0.333；不代表该患者实测或扁平足严重程度。'};
 evidence.static_cop={label:'静态COP同条件计算',status:'synthetic_teaching_data',text:'教学模拟，双足站立每次 30 秒、50 Hz。睁眼路径 151.3 mm、平均速度 5.04 mm/s；闭眼路径 230.2 mm、平均速度 7.67 mm/s。'};
 // Remove obsolete clinical challenge nodes, redirect historical bookmarks safely.
 for(const id of ['balance_choice','balance_trial','balance_stop','balance_explain','muscle_method','muscle_explain','tool']){
  const target=id.startsWith('balance')?'static_cop':id==='tool'?'alignment':'muscle_match';
  flow[id]={...flow[target],id,kind:'dialogue',task:undefined,options:[],next:target,text:'这一环节已聚焦到新的运动学任务。',evidence:undefined,record:undefined};
 }
 for(const n of Object.values(flow))for(const o of n.options||[])if(o.next==='tool')o.next='alignment';
 const historyQuestion=flow.history.options.find(o=>o.id==='ask_trigger');
 historyQuestion.label=historyQuestion.shortLabel='您第一次崴脚是在做什么？还记得脚是往哪边翻的吗？';
 flow.trigger_answer.text=firstInjury+laterInjuries+'现在走不平的路，有时右脚会突然一软，我就怕再崴。';
 flow.trigger_answer.next='injury_question';
 flow.injury_question={
  id:'injury_question',act:'act1',kind:'dialogue',speaker:'陈女士',
  text:'我一直有个疑问，为什么我的脚总是右脚崴，又总是朝内崴呢？医生，您可不可以给我解释一下？',
  next:'injury_mechanism'
 };
 flow.injury_question.turns=[
  {speaker:'patient',text:flow.injury_question.text},
  {speaker:'therapist',text:'好的，您这种情况可能是慢性的踝关节不稳，我先和您大概介绍一下这是什么问题。'}
 ];
 flow.injury_mechanism={id:'injury_mechanism',act:'act1',kind:'task',speaker:'模型观察',text:'陈女士下楼时右脚向内崴。观察右踝模型，判断哪些结构与这个动作有关。',next:'safety'};
 evidence.injury_history.text='患者自述约一年前下楼梯时右足内翻、外踝疼，之后又扭伤两次，最近一次跑步变向。初伤角度及韧带损伤程度待核实。';
 flow.safety_answer.text='主要是酸胀、发紧，不是一直像针扎那样疼。站久或走多以后更明显，坐下休息会好一些。 最近没有新伤或麻木，能走路。';
 flow.goal_answer.text='第一次拍片说没骨折，休息大约三周恢复了日常活动。后面自己休息，没有系统康复，也没长期用护踝。 我想先安心走不平的路，再逐渐恢复轻松跑步。';
 flow.local_record.text='右边发紧，再往前脚跟就要抬。';
 flow.plan_patient.text='我愿意从简单的开始。不舒服就停，再告诉您。';
 flow.goal_answer.next='fear_check';
 flow.fear_check={id:'fear_check',act:'act1',kind:'choice',speaker:'动小助',text:'她说想安心走路。先了解她担心什么。',options:[
   {id:'ask_fear',label:'您走不平路时，是担心再崴，还是脚下真的有过突然使不上劲？两种情况都有吗？',next:'fear_reply',good:true,safe:true},
   {id:'continue_consent',label:'先说明检查，稍后再了解顾虑。',next:'consent',good:true,safe:true}
 ]};
 flow.fear_reply={id:'fear_reply',act:'act1',kind:'dialogue',speaker:'陈女士',text:'两种都有。有时转弯，右脚会突然一软。也有时候它还没发软，我一看前面的路不平，就先慢下来了。',next:'consent'};
 flow.arch_concern={id:'arch_concern',act:'act6',kind:'dialogue',speaker:'林治疗师',text:'接下来我们用足底压力测试系统，看看您站立时双脚是怎么受力的。',visualMode:'pressure',next:'pressure_compare'};
 flow.ankle_stress={id:'ankle_stress',act:'act4',kind:'dialogue',speaker:'林治疗师',visualMode:'exam',text:'陈女士，请先坐到床边，再慢慢躺好。我会托住您的脚跟，检查一下右脚踝。您放松就好，如果疼，请告诉我。',next:'muscle_intro'};
 flow.ankle_stress.next='arch_intro';
 flow.exam_reasoning={id:'exam_reasoning',act:'act4',kind:'choice',speaker:'动小助',visualMode:'exam',text:currentCase.prompt,options:currentCase.actions.map((label,i)=>({
   id:'differential_'+i,label,feedback:currentCase.feedback[i],good:i===currentCase.correct,safe:true,retry:i!==currentCase.correct,next:i===currentCase.correct?'arch_intro':'exam_reasoning'
 }))};
 const safetyBranch=flow.safety.options.find(o=>o.id==='alternate_alert');
 safetyBranch.label=safetyBranch.shortLabel='换个情境：如果是刚扭伤，外踝尖骨头一按就疼，先怎么处理？';
 safetyBranch.next='acute_differential';
 safetyBranch.evidence=[];safetyBranch.record={scenario:'hypothetical_acute_ankle_injury'};
 flow.medical_stop.text='假设的新伤有骨性压痛，这一轮先暂停体能任务。怎样安排下一步，并说明哪些项目尚未检查？';
 flow.acute_differential={id:'acute_differential',act:'act1',kind:'choice',speaker:'动小助',text:'假设患者刚扭伤，踝部疼痛，外踝尖有明确骨性压痛。这会怎样改变今天的检查安排？',options:[
   {id:'acute_refer',label:'先暂停应力及负重试验，转医学评估骨折风险及拍片指征。',good:true,safe:true,next:'medical_stop',feedback:'这个急性新伤情境应先核对骨折风险。外踝尖骨性压痛是考虑踝部X线的指征。'},
   {id:'acute_load',label:'先让患者单脚跳，再决定是否需要转诊。',good:false,safe:false,retry:true,next:'acute_differential',feedback:'骨折风险尚待评估，跳跃会增加负荷。请重新选择。'}
 ]};
 for(const n of Object.values(flow)){
  if(n.act==='act6')n.pressureStation=true;
  const stage=SOAP_STAGES.find(s=>s.act===n.act);
  if(stage){n.purpose=stage.goal;n.education={...(n.education||{}),why:stage.goal,steps:[stage.task]};if(n.task)n.task.education=n.education;}
 }
}

export function updateFilmDialogue(sequence){
 const after={
 '01B':[['therapist','我们先轻轻活动一下。您要是觉得疼，或者不想继续，随时告诉我。'],['patient','好的，不舒服我就跟您说。']],
 '02B':[['patient','发紧就代表骨头错位了吗？'],['therapist','不一定。先记录活动表现，再综合判断。']],
 '04B':[['patient','脚弓低，就是反复崴脚的原因吗？'],['therapist','不能只看足形。还要结合活动、负荷和控制。']],
 '05B':[['patient','左右走得不一样，就说明肌肉坏了吗？'],['therapist','还不能。先描述支撑、摆动和步长，再查原因。']],
 '06B':[['patient','这条轨迹就是身体重心吗？'],['therapist','这是足底压力中心。重心是另一个概念。']],
 '08B':[['therapist','先从您能完成的动作练起。如果疼痛加重或站不稳，就先停下来。下次我们再看看恢复得怎么样。'],['patient','明白了，我先从简单的练起。谢谢您。']]
 };

 for(const clip of sequence.clips){
  if(after[clip.id])clip.normal=after[clip.id].map(([speaker,text])=>({speaker,text}));
  if(VOICED_TURNS[clip.anchorNode])clip.normal=VOICED_TURNS[clip.anchorNode].map(([speaker,text])=>({speaker,text}));
  // Obsolete post-MMT and single-leg challenge scenes are no longer part of this course.
  if(['03B','07B'].includes(clip.id))clip.anchorNode='__archived_'+clip.anchorNode;
  if(clip.id==='06A'){clip.evidenceRequirement={all:[]};clip.alternative=clip.alternative.filter(a=>a.condition!=='gait_skipped');}
  if(clip.id==='07A')clip.actionLabel='比较双足睁眼与闭眼的静态 COP';
  for(const branch of [clip.normal,...clip.alternative.map(a=>a.lines)])for(const turn of branch){
   turn.text=turn.text.replaceAll('背伸','背伸');
  }
 }
}
