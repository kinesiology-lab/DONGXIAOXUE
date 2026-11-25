async function json(path,data,token){
 const r=await fetch(path,data?{method:'POST',headers:{'Content-Type':'application/json','X-Learner-Token':token||''},body:JSON.stringify(data),signal:AbortSignal.timeout(45000)}:{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.headers.get('content-type')?.includes('application/json'))throw Error('当前页面未连接到课堂评阅服务。');
 const v=await r.json();if(!r.ok)throw Error(v.error||'评阅服务暂不可用。');return v;
}
export async function localReview(input){
 const status=await json('/api/learning/status');
 if(!status.ai?.configured||!status.ai.enabled)throw Error('教师尚未启用 模型评阅。草稿已保留。');
 const k='dxx_plan_review_session_'+input.sessionId;
 let entry=JSON.parse(localStorage.getItem(k)||'null');
 if(!entry){const session={id:'plan.'+crypto.randomUUID(),caseId:'cai',startedAt:new Date().toISOString(),student:null};
  const value=await json('/api/learning/start',{session});entry={session,token:value.accessToken};localStorage.setItem(k,JSON.stringify(entry));}
 const {requestId,short,long,evidence}=input;
 const query=()=>json('/api/learning/plan-review',{requestId,short,long,evidence,consent:true,provider:status.ai.provider,session:entry.session},entry.token);
 let v=await query();for(let i=0;v.status==='pending'&&i<18;i++){await new Promise(r=>setTimeout(r,1800));v=await query();}
 if(v.status!=='graded')throw Error('评阅仍在进行，可稍后再试。');return v;
}
const github='https://kinesiology-lab.github.io',local='http://127.0.0.1:8784';
export function review(input){
 if(location.origin!==github)return localReview(input);
 const popup=window.open(local+'/clinic3d/plan-bridge.html','_blank','popup,width=520,height=380');
 if(!popup)return Promise.reject(Error('请允许打开本机评阅窗口，再提交一次。'));
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(null,'未连接到本机课堂服务。请打开本机版后重试。'),65000);
  function finish(result,error){clearTimeout(timer);window.removeEventListener('message',listen);popup.close();if(error)reject(Error(error));else resolve(result);}
  function listen(e){if(e.origin!==local||e.source!==popup)return;const msg=e.data;
   if(msg?.kind==='ready')popup.postMessage({kind:'plan',input},local);
   if(msg?.kind==='result'&&msg.requestId===input.requestId)finish(msg.result,msg.error);}
  window.addEventListener('message',listen);
 });
}
if(location.pathname.endsWith('/plan-bridge.html')&&window.opener){
 const caller=window.opener;window.addEventListener('message',async function receive(e){
  if(e.origin!==github||e.source!==caller||e.data?.kind!=='plan')return;
  window.removeEventListener('message',receive);const input=e.data.input;
  const msg={kind:'result',requestId:input.requestId};
  try{msg.result=await localReview(input);}catch(error){msg.error=error.message;}
  caller.postMessage(msg,github);
 });caller.postMessage({kind:'ready'},github);
}