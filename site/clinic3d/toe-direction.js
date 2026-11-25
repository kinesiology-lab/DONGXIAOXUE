export function toeDirection(motion,side,onAnswer){
  const dorsal=motion==='dorsiflexion', medial=side==='L'?-1:1;
  const box=document.createElement('section');box.className='toe-question';
  const title=document.createElement('strong');title.textContent='测试'+(dorsal?'胫骨前肌':'小腿三头肌')+'肌力时，患者的脚尖应向哪里运动？';
  const pad=document.createElement('div');pad.className='toe-pad';pad.tabIndex=0;pad.setAttribute('aria-label','拖动脚尖。也可用方向键选方向，按回车确认');
  const toe=document.createElement('span');toe.className='toe-handle';toe.textContent='●';
  const labels=document.createElement('small');labels.textContent='↑ 勾脚　↓ 绷脚　患者内侧 '+(medial<0?'←':'→');
  const hint=document.createElement('p');hint.setAttribute('role','status');hint.textContent='从圆点拖动，松开后判断方向。';
  const skip=document.createElement('button');skip.type='button';skip.textContent='跳过这道题';skip.onclick=()=>onAnswer('skip');
  pad.style.setProperty('--mirror',side==='L'?'1':'-1');pad.append(toe);box.append(title,pad,labels,hint,skip);
  let origin=null,dx=0,dy=0;
  function move(x,y){dx=x;dy=y;toe.style.transform='translate('+Math.max(-55,Math.min(55,x))+'px,'+Math.max(-38,Math.min(38,y))+'px)';}
  function judge(){const ok=dorsal?dy<=-12&&dx*medial>=3&&Math.abs(dx)<-dy*3:dy>=12&&Math.abs(dx)<dy*1.4;
    onAnswer(ok?'correct':'retry',{dx,dy});if(!ok){hint.textContent=dorsal?'把脚背向小腿勾起，再让足底稍向内侧转。':'试着像踩踏板一样，把前足向下绷。';move(0,0);}}
  pad.onpointerdown=e=>{if(origin||e.button!==0)return;origin={x:e.clientX,y:e.clientY,id:e.pointerId};pad.setPointerCapture(e.pointerId);move(0,0);};
  pad.onpointermove=e=>{if(origin?.id===e.pointerId)move(e.clientX-origin.x,e.clientY-origin.y);};
  pad.onpointerup=e=>{if(origin?.id!==e.pointerId)return;move(e.clientX-origin.x,e.clientY-origin.y);origin=null;judge();};
  pad.onpointercancel=()=>{origin=null;move(0,0);};
  pad.onkeydown=e=>{const dirs={ArrowUp:[0,-16],ArrowDown:[0,16],ArrowLeft:[-12,0],ArrowRight:[12,0]};if(dirs[e.key]){e.preventDefault();move(dx+dirs[e.key][0],dy+dirs[e.key][1]);}else if(e.key==='Enter'){e.preventDefault();judge();}};return box;
}