// All phases use the same right ankle and tibialis anterior projection.
export function contractionDemo(){
  const stage=document.createElement('figure');
  stage.className='contraction-study';
  const canvas=document.createElement('canvas');
  canvas.width=340;canvas.height=320;
  canvas.setAttribute('role','img');
  const name=document.createElement('figcaption');
  name.textContent='右踝 · 胫骨前肌';
  const controls=document.createElement('div'),note=document.createElement('p');
  const buttons=[],pause=document.createElement('button');
  const phases=[
    ['向上勾脚','脚尖向上，克服朝向足底的阻力。'],
    ['保持位置','脚尖保持在勾起的位置，继续对抗阻力。'],
    ['缓慢放下','阻力仍朝向足底，脚尖缓慢下落。']
  ];
  const g=canvas.getContext('2d'),atlas=new Image();
  let phase=0,elapsed=0,last=0,scheduled=0;
  let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){
    if(!atlas.naturalWidth)return;
    const t=Math.min(1,Math.max(0,(elapsed%3200-350)/2100));
    const eased=t*t*(3-2*t);
    const f=phase===1?19:Math.round(19*(phase===2?1-eased:eased));
    g.clearRect(0,0,340,320);
    g.drawImage(atlas,(f%5)*340,Math.floor(f/5)*320,340,320,0,0,340,320);
  }
  function tick(now){
    scheduled=0;
    if(!stage.isConnected||!playing)return;
    if(last)elapsed+=now-last;
    last=now;draw();
    if(phase!==1)scheduled=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(scheduled);last=0;draw();
    if(playing&&phase!==1)scheduled=requestAnimationFrame(tick);
    pause.hidden=phase===1;pause.textContent=playing?'暂停动作':'播放动作';
  }
  function show(i){
    phase=i;elapsed=playing?0:1500;
    buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
    note.textContent=phases[i][1];canvas.setAttribute('aria-label','右侧胫骨前肌，'+phases[i][1]);sync();
  }
  phases.forEach(([text],i)=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>show(i);buttons.push(b);controls.append(b);
  });
  pause.type='button';pause.onclick=()=>{playing=!playing;sync();};controls.append(pause);
  stage.append(name,canvas,controls,note);show(0);
  atlas.onload=sync;atlas.src=new URL('./assets/tibialis-contractions.webp',import.meta.url).href;
  return stage;
}
