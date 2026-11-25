// Student-owned records and learner-authorized sessions only.
window.DXXFeedback=(()=>{
 const read=(store,key)=>{try{return JSON.parse(store.getItem(key));}catch{return null;}};
 const same=(a,b)=>!!a&&!!b&&['teacher','studentId','name'].every(k=>a[k]===b[k]);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const scoped=p=>'dxx_feedback_v51_'+JSON.stringify([p.teacher,p.studentId,p.name]);
 const labelTime=seconds=>{const s=Math.floor(seconds),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  return h?h+' 小时 '+m+' 分钟':m?m+' 分 '+s%60+' 秒':s+' 秒';};
 function merged(ranges){
  const sorted=ranges.filter(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[1]>v[0]).sort((a,b)=>a[0]-b[0]);
  const spans=[];for(const [a,b] of sorted){const last=spans.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else spans.push([a,b]);}return spans;
 }
 const taskNames={arch_view:'坐站足弓观察',arch_compare:'三种足弓选骨',ankle_stress:'踝关节稳定性检查',injury_mechanism:'踝内翻损伤机制',alignment:'量角器轴线定位',muscle_match:'踝足肌群与运动配对',pressure_conditions:'足压比较条件',pressure_compare:'足底负荷分布',arch_index:'足弓指数计算',static_cop:'静态压力中心比较',gait_events:'步态周期与时相'};
 function local(r){
  const p=r.profile,sessions=new Map(),progress=new Map(),ranges=[],questions=new Map();
  const attempts=read(localStorage,'dxx_case_test_v1_'+JSON.stringify([p.teacher,p.studentId,p.name])+'_history');
  if(Array.isArray(attempts)){
   const passed=attempts.filter(r=>r.version==='ankle30-v1'&&r.passed&&r.correct>=25);
   const current=attempts.filter(r=>r.version==='module100-v1');
   if(current.some(r=>r.passed))progress.set('test:modules','实验综合测试 · 最高 '+Math.max(...current.map(r=>r.score))+' / 100 分 · 及格，已获证');
   if(passed.length)progress.set('test:legacy','旧版人体运动学知识测试 · 已完成学习 · 最高 '+Math.max(...passed.map(r=>r.correct))+' / 30 分 · 已获证');
  }
  const painting='dxx_painting_log.web-paint.'+encodeURIComponent(JSON.stringify([p.teacher,p.studentId,p.name]))+'/';
  for(const key of Object.keys(localStorage).filter(k=>k.startsWith(painting))){
   const row=read(localStorage,key);if(row?.kind==='function'&&row.result?.passed)progress.set('painting:'+row.muscle,'肌肉彩绘 · '+row.label);
  }
  const lab=r.virtualLaboratory;
  if(same(lab.profile,p)){
   const explained=new Set((lab.explanations||[]).filter(e=>String(e.text||'').trim().length>=4).map(e=>String(e.sourceId)));
   for(const o of lab.observations||[])if(explained.has(String(o.sourceId)))progress.set('lab:'+o.sourceId,'人体运动学实验 · '+o.title);
  }
  for(const a of r.assemblyWorkshop)if(same(a.profile,p)&&a.status==='已完成所选剩余组'){
    const group=a.firstRound&&a.lastRound?'（第 '+a.firstRound+'–'+a.lastRound+' 组）':'';
    const name=(a.task==='muscle'?'肌肉安放':'骨骼拼接')+' · '+a.chapter+group;progress.set('assembly:'+name,name);
  }
  for(const attempt of r.clinicalEncounters)if(same(attempt.student,p)&&attempt.completedAt&&!attempt.summary?.skipped?.length)progress.set('clinic:round','足踝虚拟诊室 · 已保存的病例接诊');
  for(const store of [localStorage,sessionStorage])for(let i=0;i<store.length;i++){
   const key=store.key(i);
   if(!key?.startsWith('dxx_')||!/(session|standalone|soap|clinic3d_v21)/.test(key)||/capability|consent|draft|queue/.test(key))continue;
   const raw=read(store,key);const source=raw?.session||raw;
   if(!same(source?.student,p))continue;
   const id=source.id||source.sessionId;
   if(id&&source.startedAt&&source.caseId)sessions.set(id,{id,student:p,caseId:source.caseId,startedAt:source.startedAt});
   if(key.startsWith('dxx_clinic3d_v21_')){
    for(const k of Object.keys(raw.taskReceipts||{}))if(taskNames[k]){
     const scope=raw.taskReceipts[k]?.scope;
     const title=({'simulated-eversion':'双侧踝外翻肌力检查','simulated-ankle-strength':'双侧抗阻外翻与背伸检查','ankle-motion-knowledge':'踝足关节运动辨认','static-balance-interpretation':'踝扭伤后静态平衡判读'})[scope];
     progress.set('clinic:'+(title?scope:k),'足踝虚拟诊室 · '+(title||taskNames[k]));
    }
    for(const e of raw.events||[])if(e.type==='learning_active_interval'){const t=e.payload||{},a=Date.parse(t.from)/1000,b=Date.parse(t.to)/1000;if(t.method==='visible_recent_input_120s_v23'&&b>a&&b-a<=30)ranges.push([a,b]);}
   }
  }
  const scores=(Array.isArray(attempts)?attempts:[]).filter(r=>r.version==='module100-v1').map(({at,score,passed})=>({at,score,passed}));
  return {sessions,progress,ranges,questions,scores};
 }
 function absorb(data,cached){
  if(!cached)return;
  for(const [id,label] of cached.progress||[])if(!data.progress.has(id))data.progress.set(id,label);
  for(const t of cached.questions||[])data.questions.set(t.id,t);
  data.ranges.push(...cached.ranges||[]);
 }
 function report(data){
  const ranges=merged(data.ranges);return {scores:data.scores,projects:[...data.progress.values()],activeSeconds:Math.floor(ranges.reduce((n,r)=>n+r[1]-r[0],0)),hasTime:ranges.length>0,
   questions:[...data.questions.values()].sort((a,b)=>String(b.at).localeCompare(String(a.at)))};
 }
 async function json(url,options){const resp=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(6500)});if(!resp.ok)throw Error(String(resp.status));return resp.json();}
 async function update(r,onData){
  const p=r.profile,data=local(r),saved=read(localStorage,scoped(p));absorb(data,saved);
  onData(report(data),false,0);const credentials=[],remote={progress:new Map(),ranges:[],questions:new Map()};let failures=0;
  const sessions=location.hostname.endsWith('.github.io')?[]:[...data.sessions.values()];
  for(let i=0;i<sessions.length;i+=4)await Promise.all(sessions.slice(i,i+4).map(async s=>{
   try{
    const k='dxx_learning_capability_v15_'+s.id;
    let token=localStorage.getItem(k);
    if(!token){const v=await json('/api/learning/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:s})});token=v.accessToken;if(!token)throw Error('session');localStorage.setItem(k,token);}
    const detail=await json('/api/learning/state?usage=1&sessionId='+encodeURIComponent(s.id),{headers:{'X-Learner-Token':token}});
    if(!same(detail.session?.student,p))throw Error('owner');
    credentials.push({id:s.id,token});
    remote.ranges.push(...detail.activeIntervals||[]);
    for(const c of detail.conversations||[])for(const t of c.turns||[]){
     if(!t.message)continue;const id=s.id+'/'+(t.requestId||t.id);
     remote.questions.set(id,{id,at:t.receivedAt,question:t.message,answer:t.reply||'',status:t.status});
    }
   }catch{failures++;}
  }));
  const labTitles=new Map((r.virtualLaboratory.observations||[]).map(o=>[String(o.sourceId),o.title]));
  // Separate blocks preserve the identifiers shared by different courses.
  for(let i=0;i<credentials.length;i+=80){
   try{
    const batch=credentials.slice(i,i+80);
    const [paint,lab]=await Promise.all(['painting','lab'].map(scope=>json('/api/learning/certificate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessions:batch,scope,action:'status'})})));
    for(const [scope,response] of [['painting',paint],['lab',lab]])for(const item of response.items||[]){if(item.done)remote.progress.set(scope+':'+item.id,scope==='lab'?'人体运动学实验 · '+(labTitles.get(item.id)||item.label):'肌肉彩绘 · '+item.label);}
   }catch{failures++;}
  }
  for(const [k,v] of remote.progress)data.progress.set(k,v);
  for(const [k,v] of remote.questions)data.questions.set(k,v);
  data.ranges.push(...remote.ranges);
  try{localStorage.setItem(scoped(p),JSON.stringify({progress:[...data.progress],questions:[...data.questions.values()],ranges:merged(data.ranges)}));}catch{}
  const result=report(data);onData(result,true,failures);return result;
 }
 function html(x){
  const projects=x.projects.length?'<details open><summary>已完成 '+x.projects.length+' 项</summary><ul>'+x.projects.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></details>':'<p>暂无已完成项目。</p>';
  const time=x.hasTime?'<strong>'+labelTime(x.activeSeconds)+'</strong>':'<p>暂无有效时长记录。</p>';
  const replies=x.questions.length?'<p>共 '+x.questions.length+' 条提问</p>'+x.questions.map(q=>'<details><summary>'+esc(q.question)+'</summary><small>'+esc(q.at?new Date(q.at).toLocaleString('zh-CN'):'')+'</small><p>'+esc(q.answer||'尚无已保存的回答。')+'</p></details>').join(''):'<p>暂无学习答疑记录。</p>';
  const scores=(x.scores||[]).map(r=>'<li>'+esc(new Date(r.at).toLocaleDateString('zh-CN'))+'　'+esc(r.score)+' / 100 分　'+(r.passed?'及格':'未及格')+'</li>').join('');
  return '<section><h2>学习进度</h2>'+projects+(scores?'<details><summary>综合测试成绩</summary><ul>'+scores+'</ul></details>':'')+'</section><section><h2>学习时间</h2>'+time+'<p><small>按页面可见且近期有操作的时段累计，多个页面重叠的时间只计一次。</small></p></section><section><h2>学习答疑记录</h2>'+replies+'</section>';
 }
 return {update,html};
})();