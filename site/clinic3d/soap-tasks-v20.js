import {balanceReasoning} from './balance-reasoning.js?v=72';
import {balanceCues} from './balance-conditions.js?v=72';
import {staticCOPPanel} from './realistic-panels.js?v=72';
export function renderSOAPTask(task,{wrap,nodeEl,button,stepBook,record,refresh,onCue}){
 if(task.type!=='staticCOP')return false;
 wrap.replaceChildren();wrap.hidden=false;
  const judgment=nodeEl('section','clinical-quiz');
  function ask(){
   judgment.replaceChildren();
   if(!stepBook.get('cop71_open')||!stepBook.get('cop71_closed'))return;
   const interpretation='本例闭眼 30 秒的路径比睁眼时长，平均速度更高，说明去除视觉后维持双足站立更困难。';
   if(stepBook.get('cop71_interpreted')||stepBook.get('copObservation72')){judgment.append(nodeEl('p','',interpretation),balanceReasoning({stepBook,button,refresh,record}));return;}
   judgment.append(nodeEl('h4','','同一位患者闭眼后，哪项变化有数据支持？'));
   const feedback=nodeEl('p','');feedback.setAttribute('role','status');
   for(const [i,label] of ['可以定位到右踝某条韧带受损','本例闭眼时路径变长、平均速度增大','足以判断已经可以安全跑跳'].entries()){
    judgment.append(button(label,()=>{const correct=i===1;if(correct)stepBook.set('copObservation72',true);
     record('clinic3d_static_balance_reading',{choice:i,correct,source:'synthetic',condition:'double-leg-open-and-closed-30s'});refresh();
     if(correct){onCue?.(balanceCues.result);ask();}else feedback.textContent=i===0?'轨迹来自双足合力，无法定位单侧韧带。再比较路径和速度。':'跑跳还涉及动态控制。这里只记录了原地站立。';
    }));
   }
   judgment.append(feedback);
  }
  const cop=staticCOPPanel({caseResults:true,onCue,onObserve(condition){
   if(!stepBook.get('cop71_'+condition)){stepBook.set('cop71_'+condition,true);if(stepBook.get('cop71_open')&&stepBook.get('cop71_closed'))stepBook.set('cop54_full',true);record('clinic3d_static_cop_observed',{condition,seconds:30,synthetic:true});refresh();ask();}
  }});
  const stance=nodeEl('section','single-stance'),summary=nodeEl('p',''),timer=nodeEl('output','');
  const controls=nodeEl('div','single-stance-results');
  const sides=[['L','左脚 · 健侧',28],['R','右脚 · 患侧',12]];
  const outputs=new Map();
  let running=false;
  stance.append(nodeEl('h4','','单足闭眼站立'),nodeEl('p','','睁眼站稳后抬起另一脚，再闭眼计时。扶栏、睁眼或另一脚触地即停止，每侧最多 30 秒。'),controls,timer,summary);
  const display=()=>{
    for(const [side] of sides){
      const seconds=stepBook.get('stance77_'+side),{value,bar}=outputs.get(side);
      value.textContent=Number.isFinite(seconds)?seconds+' 秒':'待观察';
      bar.hidden=!Number.isFinite(seconds);bar.value=Number.isFinite(seconds)?seconds:0;
    }
    const left=stepBook.get('stance77_L'),right=stepBook.get('stance77_R');
    summary.textContent=Number.isFinite(left)&&Number.isFinite(right)?'本例右脚比左脚少坚持 '+(left-right)+' 秒。':'';
  };
  const pose=(side,t=0)=>document.dispatchEvent(new CustomEvent('clinic-single-stance',{detail:{side,t}}));
  for(const [side,label,duration] of sides){
   const name=label[0],card=nodeEl('div','stance-side'),value=nodeEl('strong',''),bar=document.createElement('progress');
   bar.max=30;bar.setAttribute('aria-label',label+'站立时间，满刻度30秒');outputs.set(side,{value,bar});
   card.append(nodeEl('b','',label),value,bar);controls.append(card);
   card.append(button('观察'+name+'脚支撑',()=>{
    if(running)return;running=true;
    for(const b of controls.querySelectorAll('button'))b.disabled=true;
    // Stop a COP replay before changing the stance used by the scene.
    const play=cop.querySelector('.timeline-controls button');
    if(play?.textContent==='暂停')play.click();
    cop.inert=true;
    let elapsed=0,last=performance.now();
    function end(){running=false;cop.inert=false;for(const b of controls.querySelectorAll('button'))b.disabled=false;pose(null);}
    function frame(now){
     if(!stance.isConnected||document.hidden){end();return;}
     elapsed=Math.min(duration,elapsed+Math.min(.1,(now-last)/1000)*4);last=now;
     timer.textContent='病例回放 ×4 · '+name+'脚支撑 '+elapsed.toFixed(1)+' 秒';
     pose(side,elapsed);
     if(elapsed<duration){requestAnimationFrame(frame);return;}
     end();timer.textContent=name+'脚支撑结束，另一脚触地。';
     stepBook.set('stance77_'+side,duration);record('clinic3d_single_stance',{side,seconds:duration,vision:'closed',synthetic:true,end:'touchdown'});refresh();display();
    }
    requestAnimationFrame(frame);
   }));
  }
  const help=button('动小助 · 操作提示',()=>{
    const open=document.body.toggleAttribute('data-balance-help');
    help.setAttribute('aria-expanded',String(open));
  });
  document.body.removeAttribute('data-balance-help');
  help.setAttribute('aria-expanded','false');help.setAttribute('aria-controls','conversation');
  wrap.append(help,cop,stance,judgment);display();ask();return true;
}
