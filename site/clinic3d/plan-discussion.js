const explanations={
  "control": "先坐着练右脚向外用力，再扶着桌子练站稳。等右脚踩得踏实了，我们再练走不平的路。下次来，我看看您右脚用力和走路的变化。",
  "mobility": "先在坐着的时候练勾脚，在舒服的范围里慢慢做。下次用同样的姿势量两边脚踝，也看看您下楼有没有轻松些。",
  "load": "站久了脚踝酸，您就中间坐下歇一会儿。下次告诉我能站多久、哪段路还会发软，我们再商量要不要试鞋垫。",
  "assessment": "下次先把缺的检查补上。您可以留意一下，在哪种路面右脚最容易发软，到时候告诉我，我们再一起定练习。"
};
export function selectedPlan(state){
  return (state.records||[]).filter(r=>Object.hasOwn(explanations,r.planDomain)).at(-1)?.planDomain;
}
export function planTurns(state){
  const domain=selectedPlan(state)||(state.taskReceipts?.muscle_match||state.taskReceipts?.gait_events?'control':state.taskReceipts?.rom_measure?'mobility':'assessment');
  const reply=domain==='assessment'?'好，那就先查清楚，再决定怎么练。':domain==='load'?'明白了。':'明白了，我先从简单的练起。';
  return [{speaker:'patient',text:'那我回去先练什么？'},
          {speaker:'therapist',text:explanations[domain]},
          {speaker:'patient',text:reply}];
}
