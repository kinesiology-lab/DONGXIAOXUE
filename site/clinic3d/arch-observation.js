import {rearFootReference} from './posture-reference.js';
import {archOutlines} from './arch-bones.js';

// Confirm each observation after the patient reaches the corresponding pose.
export function openArchObservation({host,subject,standingSeenNext,actor,seat,onStanding,onFinish,paused}){
 const person='陈女士';
 let phase=standingSeenNext?'standing':'seated',ready=false;
 const panel=document.createElement('section'),heading=document.createElement('h3'),hint=document.createElement('p');
 panel.className='arch-postures';panel.dataset.subject=subject;hint.setAttribute('aria-live','polite');
 const diagram=document.createElement('div'),action=document.createElement('button');
 action.type='button';action.className='study-primary';
 panel.append(heading,diagram,hint,action);host.replaceChildren(panel);
 function present(){
  ready=false;panel.dataset.phase=phase;action.disabled=true;
  const standing=phase==='standing';
  heading.textContent=person+' · '+(standing?'站位':'坐位');
  const outlines=archOutlines(),fig=outlines.children[standing?1:0];
  fig.querySelector('figcaption').textContent='病例示意 · 右足内侧';
  diagram.replaceChildren(fig);
  if(standing)diagram.append(rearFootReference());
  hint.textContent=standing?'比较同一位置，右脚负重后内侧纵弓比坐位时低。':'先看坐位时右脚内侧的弧度。';
  action.textContent=standing?'完成比较，进入足弓识别':'已看坐位，观察站位';
  actor.setPose(standing?'standing':'seated');
 }
 action.onclick=()=>{
  if(!ready||paused())return;
  if(phase==='standing'){ready=false;action.disabled=true;onFinish();return;}
  phase='standing';onStanding();present();
 };
 present();
 return {tick(){
   if(ready||paused())return;
   const {sitting}=actor.getState();
   actor.root.position.x=seat[0]+.36*(1-sitting);
   if((phase==='seated'&&sitting>=.995)||(phase==='standing'&&sitting<=.005)){
    ready=true;action.disabled=false;
   }
 },close(){panel.remove();}};
}
