/* Shared classroom identity; NOT authentication. Clinic encounter events are sent only to the same-origin local teaching service when available. */
(function(g){'use strict';
 const script=document.currentScript,root=new URL('../',script.src),SESSION='dxx_hub_profile_v1';const shared='dxx_active_learner_v2:'+root.pathname;
 function validate(name,id,teacher){
  const n=x=>String(x??'').normalize('NFKC').trim();name=n(name);id=n(id);teacher=n(teacher);
  if(!name||name.length>60||/[<>\u0000-\u001f]/.test(name))return '请填写有效姓名（1—60个字符）。';
  if(!/^[A-Za-z0-9_-]{1,32}$/.test(id))return '请填写学号（最多32位字母、数字、下划线或短横线，保留前导零）。';
  if(teacher.length>60||/[<>\u0000-\u001f]/.test(teacher))return '教师姓名最多60个字符，请使用普通文字。';
  return {name,studentId:id,teacher};
 }
 function decode(raw){
  try{const p=JSON.parse(raw);if(!p)return null;const valid=validate(p.name,p.studentId,p.teacher);return typeof valid==='string'?null:valid;}catch{return null;}
 }
 function initial(){
  try{const raw=localStorage.getItem(shared);if(raw!==null)return decode(raw);}catch{}
  try{const old=decode(sessionStorage.getItem(SESSION));if(old)localStorage.setItem(shared,JSON.stringify(old));return old;}catch{return null;}
 }
 let current=initial();
 function profile(){return current;}
 function persist(p){
  current=p;
  try{if(p)sessionStorage.setItem(SESSION,JSON.stringify(p));else sessionStorage.removeItem(SESSION);}catch{}
  try{localStorage.setItem(shared,JSON.stringify(p));return true;}catch{return false;}
 }
 function set(p){const v=validate(p.name,p.studentId,p.teacher);if(typeof v==='string')throw Error(v);return persist(v);}
 function clear(){persist(null);}
 // Reload with the new owner so open experiments cannot transfer their in-memory scores.
 function reconcile(){try{if(JSON.stringify(decode(localStorage.getItem(shared)))!==JSON.stringify(current))location.reload();}catch{}}
 g.addEventListener('storage',e=>{if(e.storageArea===localStorage&&(e.key===shared||e.key===null))reconcile();});
 g.addEventListener('pageshow',e=>{if(e.persisted)reconcile();});
 function key(prefix,p=profile()){return p?prefix+encodeURIComponent(p.teacher+'|'+p.studentId):null;}
 function read(k,fallback){if(!k)return fallback;try{return JSON.parse(localStorage.getItem(k)||'null')??fallback;}catch{return fallback;}}
 function go(tab='home'){location.href=new URL('index.html#'+(['home','finish','login'].includes(tab)?tab:'home'),root).href;}
 g.DXXHub={root:root.href,validate,profile,set,clear,go,read,labKey:(p)=>key('kine_clean_v1_student_',p),gameKey:(p)=>key('dxx_assembly_clean_v1_student_',p),pressureKey:(p)=>key('dxx_pressure_clean_v1_student_',p)};
})(window);

// Shared assistant is additive to the scene; do not load it inside embedded experiments.
if(window.top===window && !location.pathname.includes('/teacher/')){
 const assistant=document.createElement('script');assistant.src=new URL('assistant-v24.js',document.currentScript.src).href;assistant.defer=true;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>document.body.append(assistant),{once:true});else document.body.append(assistant);
 const tracking=document.createElement('script');tracking.type='module';tracking.src=new URL('module-records-v24.js',document.currentScript.src).href;document.head.append(tracking);
}
