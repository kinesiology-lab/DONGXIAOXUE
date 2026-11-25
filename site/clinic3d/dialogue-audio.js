import {voiceRole} from './clinic-dialogue.js';

export function createDialogueAudio({enabled,onTalking,onStatus}){
 const audio=new Audio();
 if(!document.getElementById('dialogueVoice'))audio.id='dialogueVoice';
 audio.hidden=true;audio.preload='auto';document.body.append(audio);
 const manifestUrl=new URL('./assets/dialogue-v20/manifest.json',import.meta.url);
 let entries=null,catalog=null,revision=0,stopCurrent=null;
 function fetchCatalog(){
  if(!catalog)catalog=fetch(manifestUrl,{cache:'no-cache'}).then(r=>{
   if(!r.ok)throw Error('录音目录加载失败');
   return r.json();
  }).then(table=>{entries=table.clips;return table;}).catch(()=>{catalog=null;return null;});
  return catalog;
 }
 function cancel(){
  revision++;stopCurrent?.();audio.pause();onTalking(null);
 }
 function unlock(){
  if(audio.hasAttribute('src'))return;
  audio.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';
  audio.play().catch(()=>{});
 }
 async function speak(name,text){
  cancel();
  const token=revision,role=voiceRole(name);
  if(!role||!enabled()||!text)return {muted:true};
  const table=await fetchCatalog(),entry=table?.clips?.[role+'|'+text];
  if(token!==revision)return {cancelled:true};
  if(!entry){onStatus(table?'这句录音暂不可用。':'语音目录暂未载入。');return {failed:true};}
  return new Promise(resolve=>{
   let done=false,retried=false,attempt=0;
   const finish=result=>{
    if(done)return;done=true;audio.onended=null;audio.onerror=null;
    document.removeEventListener('click',gesture,true);document.removeEventListener('keydown',gesture,true);
    stopCurrent=null;onTalking(null);resolve(result);
   };
   stopCurrent=()=>finish({cancelled:true});
   const url=new URL(entry.src,import.meta.url);
   if(role==='patient' && entry.sha256)url.searchParams.set('v',entry.sha256.slice(0,12));
   const gesture=()=>{document.removeEventListener('click',gesture,true);document.removeEventListener('keydown',gesture,true);if(!done)play();};
   function fail(){
    if(done)return;
    if(!retried){retried=true;url.searchParams.set('retry','1');play();return;}
    onStatus('这句语音暂未载入，请重试。');finish({failed:true});
   }
   function play(){
    const id=++attempt;
    audio.dataset.role=role;audio.dataset.text=text;
    audio.onerror=()=>{if(id===attempt)fail();};
    audio.onended=()=>{if(id===attempt)finish({played:true});};
    audio.src=url.href;
    audio.play().then(()=>{
     if(done||id!==attempt)return;
     audio.dataset.playStatus='playing';onStatus('');onTalking(role);
    }).catch(error=>{
     if(done||id!==attempt)return;
     audio.dataset.playStatus=error.name;
     if(error.name==='NotAllowedError'){
      onStatus('浏览器正在等待互动，点击页面可继续播放这句。');
      document.addEventListener('click',gesture,true);document.addEventListener('keydown',gesture,true);
     }else fail();
    });
   }
   play();
  });
 }
 document.addEventListener('pointerdown',unlock,{once:true,capture:true});
 return {speak,cancel,unlock,prepare:fetchCatalog,
   recordedSegments(name,text,segments){
     const role=voiceRole(name)||name;
     return entries?.[role+'|'+text]&&segments.some(s=>!entries[role+'|'+s])?[text]:segments;
   },dispose(){cancel();document.removeEventListener('pointerdown',unlock,true);audio.removeAttribute('src');audio.load();audio.remove();}};
}
