import {bank,forModule,credits,current,records,begin,finish,moduleLink,dialog,make,btn} from './module-attempt.js?v=66';
const free=document.getElementById('freeMode'),test=document.getElementById('testMode'),exam=document.getElementById('caseExam'),projects=document.getElementById('freeProjects');
const cards=[...projects.querySelectorAll('[data-module-art]')];
const route={lab:'lab/index.html',myology:'lab/index.html?topic=muscles',bone:'assembly/index.html?task=bone',muscle:'assembly/index.html?task=muscle',clinic:'clinic3d/index.html'};
let p,mode='free',identity='';
const preferred=()=> 'dxx_study_mode_'+identity;
function message(err){let e=exam.querySelector('[role=alert]');if(!e){e=make('p');e.setAttribute('role','alert');exam.append(e);}e.textContent=err.message;}
function cert(legacy=false){const a=make('a',legacy?'查看旧版证书':'查看学习完成证书');a.href='certificate/index.html?scope='+(legacy?'exam-legacy':'exam');return a;}
function result(r){
  const {body}=dialog('测试成绩');const old=r.version!==bank.version;
  body.append(make('h3',(r.score??r.correct)+' / '+r.total+' 分'),make('p',old?'旧版测试记录':r.passed?'已及格，平台已签发学习完成证书。':'本次未达 60 分。'));
  if(r.passed&&(!old||r.version==='ankle30-v1'))body.append(cert(old));if(old)return;
  for(const m of bank.modules){
    const group=make('details'),qs=forModule(m.id);group.append(make('summary',m.name+'　'+credits(r.answers,qs)+' / 20 分'));
    for(const q of qs){const a=r.answers[bank.items.indexOf(q)],ok=a===q.key;
      group.append(make('h4',q.title+'　'+(ok?q.points:0)+' 分'),make('p',q.prompt),make('p',q.type==='operation'?(ok?'已完成操作':a==='skip'?'已跳过操作':'未完成操作'):'你的答案：'+(q.choices[a]??(a==='skip'?'已跳过':'未答'))+'。正确答案：'+q.choices[q.key]+'。'+q.why));}
    body.append(group);
  }
}
function confirmSubmit(attempt){
  const {d,body}=dialog('核对并交卷');const blank=attempt.answers.filter(x=>x===null).length,skipped=attempt.answers.filter(x=>x==='skip').length;
  body.append(make('p','已记录 '+(35-blank-skipped)+' 项，已跳过 '+skipped+' 项，未完成 '+blank+' 项。交卷时跳过和未完成均为 0 分。'));
  for(const m of bank.modules)body.append(make('p',m.name+'　'+credits(attempt.answers,forModule(m.id))+' / 20 分'));
  const submit=btn('确认交卷',async()=>{submit.disabled=true;try{const r=await finish(p,attempt.id);d.close();render();result(r);}catch(e){submit.disabled=false;error.textContent=e.message;render();}},'primary');
  const error=make('p');error.setAttribute('role','alert');body.append(btn('返回实验',()=>d.close()),submit,error);
}
function render(){
  projects.hidden=false;
  const shortcutLabel=mode==='test'?'单项测试入口':'单项自由练习';
  projects.querySelector('.clinic-practice-menu summary').textContent=shortcutLabel;
  projects.querySelector('.free-shortcuts').setAttribute('aria-label',shortcutLabel);exam.hidden=mode!=='test'||!p;document.body.dataset.studyMode=mode;
  free.setAttribute('aria-pressed',String(mode==='free'));test.setAttribute('aria-pressed',String(mode==='test'));
  cards.forEach(card=>card.querySelector('.module-exam-status')?.remove());exam.replaceChildren();
  if(exam.hidden)return;
  const d=current(p),history=records(p),last=history.find(r=>r.version===bank.version);
  const head=make('div',null,'assessment-overview');head.append(make('h3','实验综合测试'),make('strong',d?'当前 '+credits(d.answers)+' / 100 分':last?'上次 '+last.score+' / 100 分':'满分 100 分'));
  exam.append(head,make('p','五个实验各 20 分：操作 8 分，知识题 6 道、每题 2 分。60 分及格，交卷后可领取达标证书。'));
  const controls=make('div',null,'assessment-actions');
  if(d)controls.append(btn(d.sealed?'重试交卷':'核对并交卷',()=>confirmSubmit(d)));
  else if(last)controls.append(btn('重新测试',async()=>{try{await begin(p);render();}catch(e){message(e);}}));
  if(last)controls.append(btn('查看上次成绩',()=>result(last)));
  if(history.length>1||(!last&&history.length))controls.append(btn('历次成绩',()=>{
    const {body,d}=dialog('历次成绩');
    for(const r of history)body.append(btn(new Date(r.at).toLocaleDateString('zh-CN')+'　'+(r.score??r.correct)+' / '+r.total+' 分',()=>{d.close();result(r);}));
  }));
  if(history.some(r=>r.version===bank.version&&r.passed))controls.append(cert());
  if(history.some(r=>r.version==='ankle30-v1'&&r.passed))controls.append(cert(true));
  if(controls.childElementCount)exam.append(controls);
  for(const card of cards){
    const qs=forModule(card.dataset.moduleArt),a=d?.answers||last?.answers;
    const status=make('p',a?'操作 '+(a[bank.items.indexOf(qs[0])]===0?'已完成':'未完成')+' · 知识题已处理 '+qs.slice(1).filter(q=>a[bank.items.indexOf(q)]!=null).length+'/6 · '+credits(a,qs)+'/20 分':'操作 8 分　知识题 12 分','module-exam-status');
    card.querySelector('.primary').before(status);
  }
}
function toggle(value){mode=value;if(p)sessionStorage.setItem(preferred(),mode);render();}
function initialize(){p=window.DXXHub?.profile();identity=p?JSON.stringify([p.teacher,p.studentId,p.name]):'';mode=p&&sessionStorage.getItem(preferred())==='test'?'test':'free';render();}
projects.addEventListener('click',async e=>{
  if(mode!=='test'||!p)return;
  const target=e.target.closest('[data-open],a[href]'),card=target?.closest('[data-module-art]');if(!card)return;
  const href=target.getAttribute('href')||route[target.dataset.open];if(!href)return;
  e.preventDefault();e.stopImmediatePropagation();
  try{const d=await begin(p);if(d.sealed){confirmSubmit(d);return;}location.assign(moduleLink(href,card.dataset.moduleArt,d.id));}
  catch(err){message(err);}
},true);
free.onclick=()=>toggle('free');test.onclick=()=>toggle('test');test.disabled=false;
window.addEventListener('dxx:hubview',initialize);window.addEventListener('pageshow',initialize);
window.addEventListener('storage',event=>{if(p&&mode==='test'&&(!event.key||event.key.startsWith('dxx_module_exam_')||event.key.endsWith('_history')))render();});initialize();
