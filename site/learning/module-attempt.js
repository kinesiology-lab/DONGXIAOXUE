import {bank, grade, ownerKey} from './exam-records.js?v=66';

export {bank};
export const credits = (answers, items=bank.items) => items.reduce((total,q) =>
  total + (answers[bank.items.indexOf(q)]===q.key ? q.points : 0),0);
export const forModule = id => bank.items.filter(q=>q.module===id);
const key=p=>'dxx_module_exam_'+ownerKey(p);
const historyKey=p=>'dxx_case_test_v1_'+ownerKey(p)+'_history';
function read(key,fallback){const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}
export function records(p){return read(historyKey(p),[]);}
export function current(p){
  const d=read(key(p),null);
  if(!d || d.version!==bank.version || records(p).some(r=>r.id===d.id))return null;
  return d;
}
function lock(p,fn){return navigator.locks?navigator.locks.request(key(p),fn):Promise.resolve().then(fn);}
function changed(){window.dispatchEvent(new Event('dxx:exam-change'));}
export function begin(p){return lock(p,()=>{
  const old=current(p);if(old)return old;
  const d={id:crypto.randomUUID(),version:bank.version,answers:bank.items.map(()=>null)};
  localStorage.setItem(key(p),JSON.stringify(d));changed();return d;
});}
function expected(p,id){
  if(ownerKey(window.DXXHub.profile()||{})!==ownerKey(p))throw Error('登记信息已变更，请返回学习首页。');
  const d=current(p);if(!d||d.id!==id)throw Error('本次测试已结束。请返回学习首页查看成绩。');
  return d;
}
export function mark(p,id,q,value){return lock(p,()=>{
  const d=expected(p,id),index=bank.items.indexOf(q);
  if(d.sealed)throw Error('本次作答已提交，请到首页查看交卷状态。');
  if(index<0||d.answers[index]!=null)return;
  d.answers[index]=value;localStorage.setItem(key(p),JSON.stringify(d));changed();
});}
export function finish(p,id){return lock(p,async()=>{
  const d=expected(p,id);d.sealed=true;localStorage.setItem(key(p),JSON.stringify(d));
  const result=await grade(p,d);
  localStorage.setItem(historyKey(p),JSON.stringify([result,...records(p).filter(r=>r.id!==result.id)]));
  localStorage.removeItem(key(p));changed();return result;
});}
export const make=(tag,label,cls)=>{const e=document.createElement(tag);if(label!=null)e.textContent=label;if(cls)e.className=cls;return e;};
export function btn(label,fn,cls){const b=make('button',label,cls);b.type='button';b.onclick=fn;return b;}
export function moduleLink(href,module,id){const url=new URL(href,location.href);url.searchParams.set('assessment',module);url.searchParams.set('attempt',id);return url.href;}
export function dialog(title){
  const d=make('dialog',null,'assessment-sheet');d.setAttribute('aria-label',title);
  const head=make('header');head.append(make('h2',title),btn('关闭',()=>d.close()));const body=make('div',null,'assessment-body');
  d.append(head,body);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return {d,body};
}
