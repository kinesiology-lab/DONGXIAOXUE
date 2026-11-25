import {encounterProgress} from './encounter-progress.js?v=72';
const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text||'';return el;};
export async function submitEncounter({state,profile,save}){
 if(document.querySelector('#encounterSubmission'))return;
 const d=make('dialog');d.id='encounterSubmission';d.className='clinic-review-dialog';d.setAttribute('aria-label','提交与完成情况');document.body.append(d);
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
 const btn=(label,fn)=>{const b=make('button',label);b.type='button';b.onclick=fn;return b;};
 const attemptId=new URLSearchParams(location.search).get('attempt');
 let exam=null,attempt=null,err=null;
 try{if(attemptId&&profile){exam=await import('../learning/module-attempt.js?v=66');attempt=exam.current(profile);if(attempt?.id!==attemptId)attempt=null;}}catch(e){err=e.message;}
 function report(){const p=encounterProgress(state);d.replaceChildren(make('h2','本次学习完成情况'),make('p','已完成 '+p.completed+' / '+p.total+' 步　·　'+p.percent+'%'));
  if(state.withdrawal)d.append(make('p','问诊提前结束。陈女士离开的原因：'+state.withdrawal.reason+'。'));
  if(state.submittedExam)d.append(make('p','综合测试 '+state.submittedExam.score+' / 100 分　'+(state.submittedExam.passed?'已及格':'未达 60 分')));
  if(state.writtenPlan?.result)d.append(make('p','计划书评阅 '+state.writtenPlan.result.score+' / 100 分'));
  const details=make('details');details.append(make('summary','查看逐项完成情况'));const list=make('ul');for(const r of p.rows)list.append(make('li',r.title+'　'+r.status));details.append(list);d.append(details,btn('关闭',()=>d.close()));}
 if(state.completedAt){report();return;}
 const p=encounterProgress(state);const todo=p.rows.filter(r=>r.id!=='finish'&&r.status!=='已完成').length;
 const missing=attempt?.answers.filter(a=>a==null).length||0;
 d.append(make('h2',todo||missing?'确认提前提交？':'提交本次学习？'),make('p','已完成 '+p.completed+' / '+p.total+' 步，尚有 '+todo+' 个学习步骤待完成。'));
 if(attemptId)d.append(make('p',missing+' 个测试项目尚未作答。提交后，漏答和跳过的项目得 0 分，已得分保留。'));
 else if(todo)d.append(make('p','提前提交将保留当前完成情况。未完成项目按实际状态记录。'));
 const cancel=btn(state.withdrawal?'返回接诊记录':'返回补做',()=>d.close()),send=btn('确认提交，查看完成情况',async()=>{
  send.disabled=true;cancel.disabled=true;
  try{if(err)throw Error(err);if(attemptId&&profile){const res=exam.records(profile).find(r=>r.id===attemptId)||await exam.finish(profile,attemptId);state.submittedExam={id:res.id,score:res.score,total:res.total,passed:res.passed};}
   save(todo>0);report();
  }catch(e){send.disabled=false;cancel.disabled=false;message.textContent=e.message||'提交失败，请重试。';}
 });
 const message=make('p');message.setAttribute('role','alert');d.append(cancel,send,message);cancel.focus();
}