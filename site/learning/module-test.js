const params=new URLSearchParams(location.search);
let moduleId=params.get('assessment');
const attemptId=params.get('attempt');
if(moduleId&&attemptId)await attach();

async function attach(){
  const {bank,current,credits,forModule,mark,dialog,btn,make,moduleLink}=await import('./module-attempt.js?v=66');
  let module=bank.modules.find(m=>m.id===moduleId);
  const p=window.DXXHub?.profile();if(!module||!p)return;
  const stylesheet=make('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('module-test.css?v=66',import.meta.url);document.head.append(stylesheet);
  let questions=forModule(moduleId),[op,...quiz]=questions;
  const slot=q=>bank.items.indexOf(q);
  let body=null,sheet=null;
  const back=new URL('../index.html#home',import.meta.url);
  const dock=btn('',open,'assessment-dock');dock.setAttribute('aria-haspopup','dialog');document.body.append(dock);
  const state=()=>{const d=current(p);return d?.id===attemptId?d:null;};
  function sync(){
    const d=state();dock.textContent=d?'测试与计分　'+credits(d.answers,questions)+' / 20':'返回测试首页';
    if(sheet?.open)render();
  }
  function open(){
    if(!state()){location.assign(back);return;}
    ({body,d:sheet}=dialog(module.name+' · 测试'));
    sheet.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
    sheet.addEventListener('close',()=>{sheet=null;body=null;},{once:true});render();
  }
  async function save(q,value){try{await mark(p,attemptId,q,value);}catch(e){dock.textContent=e.message;if(body)body.prepend(make('p',e.message));}}
  function render(){
    const d=state();body.replaceChildren();
    const home=make('a','返回五个实验');home.href=back;body.append(home);
    if(!d||d.sealed){body.append(make('p','本次作答已结束，请回首页核对成绩。'));return;}
    const a=d.answers,score=credits(a,questions),done=quiz.filter(q=>a[slot(q)]!=null).length;
    body.append(make('p','本模块 '+score+' / 20 分　·　总分 '+credits(a)+' / 100 分','assessment-score'));
    const opState=a[slot(op)];body.append(make('h3','实验操作　'+(opState===0?'8 / 8 分':opState==='skip'?'已跳过 · 0 分':'8 分')),make('p',module.instruction));
    if(opState==null)body.append(btn('回到实验操作',()=>sheet.close()),btn('跳过操作（0 分）',()=>save(op,'skip')));
    const next=quiz.find(q=>a[slot(q)]==null);
    if(!next){body.append(make('h3','知识题已完成　'+done+' / 6'),make('p',opState==null?'还可以返回场景完成操作。':'可以回到首页选择其他模块或交卷。'));return;}
    body.append(make('h3','知识题 '+(quiz.indexOf(next)+1)+' / 6　·　2 分'),make('p',next.prompt));
    if(next.id==='support'){
      const plot=make('div');body.append(plot);
      Promise.all([import('./case-items.js'),import('../clinic3d/gait-lesson.js')]).then(([f,g])=>{if(plot.isConnected)plot.append(f.supportFigure(g.sampleGait));});
    }
    const choices=make('fieldset');choices.setAttribute('aria-label',next.prompt);let choice=null;
    const submit=btn('提交答案',()=>save(next,choice),'assessment-primary');submit.disabled=true;
    next.choices.forEach((v,i)=>{const label=make('label'),input=make('input');input.type='radio';input.name='module-answer';
      input.onchange=()=>{choice=i;submit.disabled=false;};label.append(input,document.createTextNode(v));choices.append(label);});
    body.append(choices,submit,btn('跳过本题（0 分）',()=>save(next,'skip')));
  }
  function workshopTask(task){
    if(!['bones','muscles'].includes(moduleId)||!['bone','muscle'].includes(task))return;
    const id=task==='bone'?'bones':'muscles';if(id===moduleId)return;
    moduleId=id;module=bank.modules.find(m=>m.id===id);questions=forModule(id);[op,...quiz]=questions;
    const url=new URL(location.href);url.searchParams.set('task',task);url.searchParams.set('assessment',id);history.replaceState(history.state,'',url);
    sync();
  }
  document.getElementById('taskTabs')?.addEventListener('click',e=>workshopTask(e.target.closest('[data-task]')?.dataset.task));
  function credit(){const d=state();if(d&&!d.sealed&&d.answers[slot(op)]==null)void save(op,0);}
  window.addEventListener('dxx:guide',({detail:e})=>{
    if(moduleId==='joint'&&e?.area==='lab'&&e.type==='observation_saved')credit();
    if(e?.area==='assembly')workshopTask(e.task);
    if(e?.area==='assembly'&&e.correct&&!e.explore){
      if(moduleId==='bones'&&e.task==='bone'&&e.type==='placement')credit();
      if(moduleId==='muscles'&&e.task==='muscle'&&e.type==='function_answer')credit();
    }
  });
  if(moduleId==='painting')window.addEventListener('dxx:paint-passed',credit);
  if(moduleId==='clinic')window.addEventListener('dxx:clinic-task-completed',({detail})=>{if(detail?.nodeId)credit();});
  // Keep the active attempt on normal internal links to another module.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||!state())return;
    const dest=new URL(a.href);if(dest.origin!==location.origin)return;
    const dir=dest.pathname.split('/').at(-2),id={lab:'joint',painting:'painting',clinic3d:'clinic',assembly:dest.searchParams.get('task')==='muscle'?'muscles':'bones'}[dir];
    if(id&&dest.pathname.endsWith('/index.html'))a.href=moduleLink(dest,id,attemptId);
  },true);
  window.addEventListener('dxx:exam-change',sync);
  window.addEventListener('storage',e=>{if(e.key?.startsWith('dxx_module_exam_')||e.key?.endsWith('_history'))sync();});
  window.addEventListener('pageshow',sync);sync();
}
