export function splitDialogue(text){return (String(text||'').match(/[^。！？\n]+[。！？]?/gu)||[]).map(x=>x.trim()).filter(Boolean);}
export function createDialoguePlayer({$,speak,cancelSpeech=()=>{},record,recordedSegments=(name,text,segments)=>segments,onChange,onUtterance,onComplete,isPaused=()=>false}){
 let lines=[],index=0,speaker='',nodeId=null,sequence=false,busy=false,run=0,timer=null,interrupted=false,needsReplay=false;
 let afterVideoIntro=null;
 const previous=$('linePrevious'),next=$('lineNext');
 const delay=ms=>new Promise(resolve=>{timer=setTimeout(resolve,ms);});
 const item=()=>sequence?lines[index]:{speaker,text:lines[index]||''};
 const name=()=>sequence?(item()?.speaker==='patient'?'陈女士':'林治疗师'):speaker;
 function state(){return{index,total:lines.length,needsReplay,pending:busy||needsReplay||index<lines.length-1,text:item()?.text||'',sequence};}
 function emit(){document.body.dataset.dialoguePending=String(state().pending);onChange?.();onUtterance?.({...state(),nodeId,speaker:name()});}
 function invalidate(){run++;clearTimeout(timer);timer=null;cancelSpeech();}
 async function paint(announce=true){
  invalidate();const token=run;needsReplay=false;busy=announce;const text=item()?.text||'',person=name();$('line').textContent=text;
  if(sequence){const patient=item()?.speaker==='patient';$('speaker').textContent=person;$('speakerAvatar').textContent=patient?'陈':'林';$('conversation').dataset.speaker=patient?'patient':'therapist';$('dialogueKind').textContent=patient?'患者':'治疗师';}
  $('lineCount').textContent=lines.length>1?`${index+1} / ${lines.length} · 自动对话`:'';previous.hidden=index===0;next.hidden=true;emit();
  if(!announce)return;
  if(isPaused()||document.hidden){interrupted=true;return;}
  record('clinic3d_dialogue_segment',{nodeId,index,text,speaker:person,automatic:true});
  const start=performance.now();const result=await speak(person,text);if(token!==run)return;
  if(result?.failed||result?.missing||result?.blocked){
   busy=false;needsReplay=true;next.hidden=false;next.textContent='重播这句';emit();return;
  }
  if(result?.cancelled){busy=true;interrupted=true;return;}
  await delay(Math.max(0,1500-(performance.now()-start)));if(token!==run)return;
  if(isPaused()||document.hidden){interrupted=true;return;}
  if(index<lines.length-1){index++;paint();return;}
  busy=false;
  if(afterVideoIntro){
   const finish=afterVideoIntro;afterVideoIntro=null;finish();return;
  }
  emit();onComplete?.({nodeId,sequence});
 }
 const pauseWatcher=setInterval(()=>{const paused=isPaused()||document.hidden;if(paused&&busy&&!interrupted){interrupted=true;invalidate();}else if(!paused&&interrupted){interrupted=false;paint();}},100);
 previous.addEventListener('click',()=>{index=Math.max(0,index-1);interrupted=false;paint();});
 next.addEventListener('click',()=>{if(needsReplay){paint();return;}if(index<lines.length-1){index++;paint();}});
 return{
  showPrompt(text,id){afterVideoIntro=null;invalidate();sequence=false;lines=[text];index=0;speaker='';nodeId=id;busy=false;interrupted=false;paint(false);},
  load(text,name,id){afterVideoIntro=null;sequence=false;lines=recordedSegments(name,text,splitDialogue(text));index=0;speaker=name;nodeId=id;interrupted=false;paint();},
  loadSequence(turns,id,{startIndex=0,announce=true,wholeTurns=false}={}){afterVideoIntro=null;sequence=true;lines=wholeTurns?turns:turns.flatMap(t=>recordedSegments(t.speaker,t.text,splitDialogue(t.text)).map(text=>({speaker:t.speaker,text})));index=Math.max(0,Math.min(startIndex,lines.length-1));nodeId=id;interrupted=false;paint(announce);},
  finishSequence(){afterVideoIntro=null;invalidate();busy=false;interrupted=false;index=Math.max(0,lines.length-1);emit();onComplete?.({nodeId,sequence});},
  advance(){if(index<lines.length-1){index++;paint();return true;}return false;},replay(){interrupted=false;paint(sequence||!!speaker);},getState:state,
  beforeVideo(turn,id,open){
   const saved={lines,index,speaker,nodeId,sequence};
   const heading=[$('speaker'),$('speakerAvatar'),$('dialogueKind')].map(el=>el.textContent);
   const role=$('conversation').dataset.speaker;
   afterVideoIntro=()=>{
    ({lines,index,speaker,nodeId,sequence}=saved);
    if(!sequence){
     [$('speaker'),$('speakerAvatar'),$('dialogueKind')].forEach((el,i)=>el.textContent=heading[i]);
     if(role===undefined)delete $('conversation').dataset.speaker;else $('conversation').dataset.speaker=role;
    }
    interrupted=false;paint(false);open();
   };
   lines=[turn];index=0;speaker='';nodeId=id;sequence=true;interrupted=false;paint();
  },
  stop(){afterVideoIntro=null;invalidate();busy=false;interrupted=false;needsReplay=false;},dispose(){invalidate();clearInterval(pauseWatcher);}
 };
}
