import {caseFindings} from './case-evidence.js?v=72';
import {review} from './plan-client.js';
export function presentPlan({state,host,save,record,next}){
 const d=state.writtenPlan||=( {short:'',long:''} );
 const form=document.createElement('form');form.className='plan-writing';form.setAttribute('aria-label','学生康复计划');
 const e=(tag,txt)=>{const n=document.createElement(tag);n.textContent=txt||'';return n;};
 const fields={};let pending=false;
 for(const [key,label,question] of [['short','近期计划','当前先改善什么？写出练习、起始条件和近期复评指标。'],['long','远期计划','陈女士希望恢复什么活动？写出进阶条件、功能目标和复评安排。']]){
  const l=e('label');l.append(e('b',label),e('small',question));const t=e('textarea');t.required=true;t.maxLength=1500;t.rows=2;t.value=d[key];fields[key]=t;l.append(t);form.append(l);
  t.oninput=()=>{d[key]=t.value;delete d.result;delete d.requestId;delete d.submitted;delete state.taskReceipts.plan;save();display();};
 }
 const info=e('small','选择智能评阅后，两段计划和本轮病例证据将发送至教师配置的课程模型服务。计划单项满分 100 分。');
 const submit=e('button','提交并请求智能评阅');submit.type='submit';const status=e('p');status.setAttribute('role','status');
 const output=e('section'),cont=e('button','查看训练视频与计划对话');cont.type='button';cont.onclick=next;
 const saveOnly=e('button','只提交计划，继续实验');saveOnly.type='button';
 saveOnly.onclick=()=>{
  if(!form.reportValidity()||!submitPlan())return;
  next();
 };
 form.append(info,submit,saveOnly,status,output,cont);host.replaceChildren(form);
 function display(){
  output.replaceChildren();cont.hidden=!d.submitted;submit.disabled=pending||!!d.result;saveOnly.hidden=!!d.submitted;
  for(const t of Object.values(fields))t.readOnly=pending;cont.disabled=pending;
  status.textContent=pending?'课程模型正在评阅…':d.result?'评阅完成':d.submitted?'计划已提交，评阅待完成。':'';
  if(d.result){
   output.append(e('strong','计划得分　'+d.result.score+' / 100'));
   for(const r of d.result.items)output.append(e('p',r.title+'　'+r.score+' / 25　'+r.comment));
   output.append(e('p','修改建议　'+d.result.advice));
  }
 }
 function submitPlan(){
  if(!d.short.trim()||!d.long.trim()){status.textContent='请填写近期计划和远期计划。';return false;}
  d.submitted=true;d.requestId||=crypto.randomUUID();
  state.taskReceipts.plan={at:new Date().toISOString(),scope:'written-plan',requestId:d.requestId};
  save();display();return true;
 }
 form.onsubmit=async ev=>{ev.preventDefault();if(pending||d.result||!submitPlan())return;
  const id=d.requestId;pending=true;display();
  try{const result=await review({sessionId:state.sessionId,requestId:id,short:d.short,long:d.long,evidence:caseFindings(state).map(f=>f.title+'。'+f.detail)});
   if(d.requestId!==id)return;d.result=result;record('clinic3d_plan_review',{requestId:id,score:result.score,model:result.model});}
  catch(err){if(d.requestId===id){if(!/仍在进行|超时|timed out|fetch/i.test(err.message))delete d.requestId;d.pendingMessage=err.message;}}
  finally{pending=false;save();display();if(!d.result&&d.pendingMessage)status.textContent='计划已保存。'+d.pendingMessage;}
 };display();return form;
}