// Course orientation only. These entries never grant completion or assessment credit.
export const ACT_GUIDE = [
  {id:'act1',objectiveId:'O1',title:'问诊与共同目标',question:'她什么时候不稳，最想恢复什么？',why:'先听陈女士的经历和担心，核对近期变化，再商量是否继续。',observe:'受伤经过、不稳情境、近期症状和她在意的活动。',task:'选择合适的追问，说明检查目的与随时暂停的方式。',concept:'患者问题 · 安全询问 · 共同目标'},
  {id:'act4',objectiveId:'O4',title:'床旁查体与坐站足弓比较',question:'稳定性查体和负重前后足形各提供了什么线索？',why:'把足形作为一条待解释的线索，继续核对功能与症状。',observe:'同一足从坐位到站立的教学病例资料，以及负重条件。',task:'先完成前抽屉与内翻加压试验，再比较坐站足弓，辨认三条足弓的组成骨。',concept:'负重 · 足弓形态 · 多因素解释'},
  {id:'act2',objectiveId:'O2',title:'踝足活动与方法',question:'活动看起来不同，怎样比较才有意义？',why:'了解脚踝活动表现，先把体位、参考段和方法说清。',observe:'背伸、跖屈；非负重与负重条件；左右比较是否采用同一方法。',task:'认识量角器的摆法，辨认背伸、跖屈、内外翻和开链旋前、旋后。',concept:'运动轴面 · 开闭链 · 测量条件'},
  {id:'act3',objectiveId:'O3',title:'踝足肌群与肌力',question:'两侧脚踝抵抗相同阻力时，表现一样吗？',why:'把解剖与动作联系起来，知道肌力检查需要统一哪些条件。',observe:'动作方向、主要参与肌群、体位、固定和施阻方向。',task:'比较双侧抗阻外翻和背伸，记录模拟表现，可选做肌肉解剖测试和彩绘。',concept:'肌肉作用 · MMT方法 · 等级与力矩的区别'},
  {id:'act6',objectiveId:'O6',title:'足底压力扫描',question:'双脚站立时，足底各区域怎样受力？',why:'用同一色标比较双足接触和负荷分布。',observe:'左右足的中足接触范围与颜色。',task:'采集足印，再向患者解释图中颜色。',concept:'足底接触 · 相对压力'},
  {id:'act7',objectiveId:'O7',title:'静态COP与姿势控制',question:'扭伤后的站立示例里，压力中心轨迹有什么变化？',why:'在能保护的条件下理解视觉、躯体感觉与前庭信息如何共同参与。',observe:'支持面、睁闭眼条件、保护位置，以及患者要求停止的信号。',task:'查看两段双足睁眼站立记录，比较路径和平均速度，解释摆动差异。',concept:'感觉整合 · 任务难度 · 停止与保护'},
  {id:'act5',objectiveId:'O5',title:'步态周期与双侧',question:'右脚与左脚的支撑、摆动有什么不同？',why:'用可见事件描述行走，把日常“不稳”的感受连接到运动任务。',observe:'初始接触与离地；双侧支撑和摆动；步长、步宽、步速的教学设定。',task:'暂停或拖动同一片段，标记事件，再与对称教学参考比较。',concept:'步态事件 · 时间与空间参数 · 骨盆参考点'},
  {id:'act8',objectiveId:'O8',title:'解释与共同计划',question:'哪些证据支持计划，还有什么没弄清？',why:'围绕陈女士的生活目标，给出有依据、能复评的教学计划。',observe:'已取得的证据、患者优先目标和仍未验证的解释。',task:'选择合理计划，邀请患者复述暂停与复评要点，再进行证据复盘。',concept:'证据推理 · 共同决策 · 复评'}
];

export const COURSE_GROUPS = [
  {id:'static',title:'静态观察',tag:'辨认结构与空间关系',description:'旋转授权解剖图谱，定位骨与可用肌肉，再用课程问题解释功能。'},
  {id:'limited',title:'有限机制示意',tag:'操作几何，解释概念',description:'滑动理想杆件或查看有限示意，先说明参考段、方向与假设。'},
  {id:'discussion',title:'课程研讨',tag:'围绕问题找证据',description:'结合静态图谱、课程资料或公开足压案例，形成观察与解释。'}
];

export function groupCourses(courses){
  if(!Array.isArray(courses)||courses.length!==13||new Set(courses.map(c=>c.sourceId)).size!==13)throw Error('课程目录不是13个独立实验。');
  if(courses.some(c=>!COURSE_GROUPS.some(g=>g.id===c.availability)||typeof c.title!=='string'))throw Error('课程目录含未知分区。');
  return COURSE_GROUPS.map(group=>({...group,courses:courses.filter(c=>c.availability===group.id).map(c=>({sourceId:c.sourceId,title:c.title.replaceAll('背伸','背伸'),summary:String(c.summary||'').replaceAll('背伸','背伸'),href:'../lab/index.html#course-'+c.sourceId}))}));
}
