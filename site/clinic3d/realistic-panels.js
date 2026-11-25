import {createAnatomyViewer} from './anatomy-viewer.js';
import {MUSCLES,ARCHES,JOINTS} from '../soap/explorers-data.js';
import {copSeries,copStats} from '../soap/teaching-data.js';
import {renderPressureDiagram} from './pressure-engine.js';
const el=(t,c='',v)=>{const n=document.createElement(t);n.className=c;if(v!==undefined)n.textContent=v;return n;};
const btn=(t,f)=>{const b=el('button','',t);b.type='button';b.onclick=f;return b;};
function panel(t,p){const c=el('section','card explorer realistic-panel');c.append(el('h3','',t),el('p','note',p));return c;}
function whenVisible(host,init){let stop;const ob=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;ob.disconnect();if(host.isConnected)Promise.resolve(init()).then(fn=>{stop=fn;if(!host.isConnected)stop?.();});});ob.observe(host);const mo=new MutationObserver(()=>{if(!host.isConnected){ob.disconnect();stop?.();mo.disconnect();}});queueMicrotask(()=>mo.observe(document.body,{childList:true,subtree:true}));}
export function anatomicalPanel(kind='arch'){
 const titles={arch:'在真实骨骼上辨认三条足弓',muscle:'认识肌肉，再观察它能产生的动作',joint:'在足踝骨骼上理解关节类型'};
 const c=panel(titles[kind],'拖动旋转、滚轮缩放。选择结构后，在授权解剖模型上观察位置。'),tabs=el('div','explorer-tabs'),description=el('div','knowledge-detail'),host=el('div','atlas-host');c.append(tabs,host,description);
 let viewer=null,selection=0;
 const archKeys=[['calcaneus','talus','navicular','cuneiformM','cuneiformI','cuneiformL','mt1','mt2','mt3'],['calcaneus','cuboid','mt4','mt5'],['cuneiformM','cuneiformI','cuneiformL','cuboid','mt1','mt2','mt3','mt4','mt5']];
 function select(i){selection=i;[...tabs.children].forEach((b,j)=>b.setAttribute('aria-pressed',i===j));description.replaceChildren();
  if(kind==='arch'){const a=ARCHES[i];description.append(el('h4','',a.name),el('p','',a.bones),el('p','',a.text));viewer?.setFocus('foot');viewer?.highlight(archKeys[i]);viewer?.setZoom(1.4);viewer?.setAxesVisible(false);}
  if(kind==='joint'){const a=JOINTS[i];description.append(el('h4','',a[1]),el('p','',a[2]));viewer?.setFocus(i<4?'ankle':'foot');viewer?.highlight([['tibia','fibula','talus'],['talus','calcaneus'],['talus','calcaneus','navicular'],['calcaneus','cuboid'],['cuneiformM','cuneiformI','cuneiformL','mt1','mt2','mt3'],['mt1','mt2','mt3','mt4','mt5'],['mt1'],['tibia','fibula']][i]);}
  if(kind==='muscle'){const a=MUSCLES[i];description.append(el('h4','',a.name));for(const[k,v]of [['起点',a.origin],['止点',a.insertion],['作用',a.action]])description.append(el('p','',k+'：'+v));viewer?.setMusclesVisible(true).then(()=>viewer.highlight(a.id));}
 }
 const items=kind==='arch'?ARCHES:kind==='muscle'?MUSCLES:JOINTS;items.forEach((a,i)=>tabs.append(btn(a.name||a[0],()=>select(i))));select(0);
 whenVisible(host,async()=>{try{viewer=await createAnatomyViewer(host);select(selection);return()=>viewer.dispose();}catch{host.append(el('p','','模型加载未完成，请稍后重新打开。'));}});
 c.selectMuscle=id=>select(Math.max(0,MUSCLES.findIndex(m=>m.id===id)));
 if(kind==='muscle'){const motion=btn('看骨骼运动与轴面',()=>{viewer?.setMusclesVisible(false);viewer?.setMotion(['invert','evert'].includes(MUSCLES[selection].motion)?'frontal':'sagittal');viewer?.setAngle(0);});c.append(motion,el('p','note','肌肉观察保留原始静态网格；运动窗展示有限骨骼运动，不伪造肌肉变形或力矩。'));}
 return c;
}
// Same licensed skinned actor as the clinic, never a line-drawing substitute.
export async function actorPreview(host,{role='patient',closeup=false,balance=false}={}){
 const THREE=await import('three'),{createActor}=await import('./actors.js');
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(closeup?28:32,1,.01,30);
 scene.background=new THREE.Color('#e8efee');scene.add(new THREE.HemisphereLight(0xffffff,0x6b8693,2.6));const light=new THREE.DirectionalLight(0xfff2e2,3);light.position.set(2,4,3);scene.add(light);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.setAttribute('aria-label',closeup?'林治疗师三维助教':'三维人物与测量平台');host.append(renderer.domElement);
 const actor=await createActor(scene,role,new URL('./assets/patient-motion.glb',import.meta.url).href);actor.setPosition([0,0,0]);actor.setPose('standing',true);actor.face(.12);if(role==='patient')actor.setFootwear('barefoot');
 let station=null;
 if(balance){
  const {createBalanceStation}=await import('./balance-station.js');
  station=createBalanceStation(scene);
  actor.setPosition([0,station.plateHeight,station.plateZ]);actor.face(0);actor.setClinicalPose('plate-stand');
 }else{
 const plate=new THREE.Mesh(new THREE.BoxGeometry(.72,.035,.8),new THREE.MeshStandardMaterial({color:0x3a5b68,roughness:.5}));plate.position.set(0,-.023,.04);scene.add(plate);
 }
 camera.position.set(closeup?.08:2,closeup?1.55:1.5,closeup?.95:3);camera.lookAt(0,closeup?1.5:.85,0);if(balance){camera.position.set(3.1,1.7,-1.6);camera.lookAt(0,.95,.20);}
 let phase=null,raf=0,last=performance.now(),live=true,visible=true;const resize=()=>{const w=host.clientWidth,h=host.clientHeight||260;if(!w)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const io=new IntersectionObserver(e=>visible=e.some(x=>x.isIntersecting));io.observe(host);
 function tick(t){if(!live)return;raf=requestAnimationFrame(tick);const dt=Math.min(.04,(t-last)/1000);last=t;if(document.hidden||!visible)return;actor.update(dt);if(phase!==null)actor.setGaitPhase(phase);renderer.render(scene,camera);}raf=requestAnimationFrame(tick);
 return{actor,balanceFrame(p){station?.sample(p);},phase(p){phase=p;},dispose(){live=false;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();station?.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});renderer.dispose();renderer.domElement.remove();}};
}
function clock(c,duration,draw){let t=0,run=false,last=0,raf;const row=el('div','timeline-controls'),range=el('input'),out=el('output');Object.assign(range,{type:'range',min:0,max:duration,step:duration/1500,value:0});range.setAttribute('aria-label','教学采集时间');const paint=()=>{range.value=t;out.textContent=t.toFixed(1)+' / '+duration+' s';draw(t/duration);};const stop=()=>{run=false;cancelAnimationFrame(raf);play.textContent='播放采集';};const loop=n=>{if(!c.isConnected||document.hidden){stop();return;}t=Math.min(duration,t+Math.max(0,Math.min(.08,(n-last)/1000)));last=n;paint();if(t===duration)stop();else raf=requestAnimationFrame(loop);};const play=btn('播放采集',()=>{if(run){stop();return;}if(t===duration)t=0;run=true;play.textContent='暂停';last=performance.now();raf=requestAnimationFrame(loop);});range.oninput=()=>{stop();t=+range.value;paint();};row.append(play,btn('重置',()=>{stop();t=0;paint();}),range,out);c.append(row);paint();const all=()=>{stop();t=duration;paint();};all.reset=()=>{stop();t=0;paint();};return all;}
import {balanceTrials,balanceReference,balanceCues} from './balance-conditions.js?v=72';
export function staticCOPPanel({onObserve=()=>{},caseResults=false,onCue=()=>{}}={}){
 const c=panel('双足站立 · 压力中心轨迹','双脚位置、硬质板面和时长相同。先睁眼平视，再闭眼，各采集 30 秒；治疗师在旁保护。');
 c.classList.add('cop-live-panel');
 const canvas=el('canvas','scientific-chart cop-single-chart');canvas.width=600;canvas.height=390;
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label','双脚合成压力中心，横轴左右、纵轴前后，单位毫米');
 const reference=el('input');reference.type='checkbox';
 const toggle=el('label','cop-reference-option');toggle.append(reference,'叠加另一视觉条件的轨迹');
 const legend=el('p','cop-legend'), metric=el('p','metric-readout');
 let condition='open',trace=balanceTrials.open,baseline=balanceTrials.closed;
 const buttons=el('div','clinical-nav');c.append(buttons);
 const names={open:'睁眼',closed:'闭眼'},colour={open:'#08766a',closed:'#ac542c'};
 for(const key of Object.keys(names)){
  const b=btn(names[key]+'站立',()=>{if(condition===key)return;
   condition=key;trace=balanceTrials[key];baseline=balanceTrials[key==='open'?'closed':'open'];
   for(const child of buttons.children)child.setAttribute('aria-pressed',String(child===b));
   showAll.reset();if(key==='closed')onCue(balanceCues.closed);});
  b.dataset.vision=key;b.setAttribute('aria-pressed',String(key==='open'));buttons.append(b);
 }
 let preview,phase=0;
 if(!caseResults){const host=el('div','real-actor-view');c.append(host);whenVisible(host,async()=>{preview=await actorPreview(host,{balance:true});return()=>preview.dispose();});}
 const normToggle=el('label','cop-reference-option'),normal=el('input');normal.type='checkbox';normal.checked=true;
 normToggle.append(normal,'叠加同条件的健康教学参考');c.append(canvas,normToggle,toggle,legend,metric);
 function draw(){
  const g=canvas.getContext('2d'),count=Math.min(trace.length,1+Math.round((trace.length-1)*phase));
  const x=v=>300+v*14,y=v=>190-v*14;
  g.fillStyle='#f5faf7';g.fillRect(0,0,600,390);g.font='18px sans-serif';g.fillStyle='#35534c';g.textAlign='center';
  for(let i=-15;i<=15;i+=5){
   g.strokeStyle=i===0?'#a6bcb4':'#d5e2dc';g.beginPath();g.moveTo(x(i),y(10));g.lineTo(x(i),y(-10));g.stroke();
   g.fillText(String(i),x(i),y(-10)+25);
  }
  for(let i=-10;i<=10;i+=5){
   g.strokeStyle=i===0?'#a6bcb4':'#d5e2dc';g.beginPath();g.moveTo(x(-15),y(i));g.lineTo(x(15),y(i));g.stroke();
   g.fillText(String(i),x(-15)-28,y(i)+6);
  }
  g.fillText('前',300,29);g.fillText('后',300,382);g.fillText('左',29,196);g.fillText('右',571,196);g.fillText('mm',554,354);
  function plot(series,colour,dashes){
   g.strokeStyle=colour;g.lineWidth=3;g.setLineDash(dashes);g.beginPath();
   for(let i=0;i<count;i++){const [,a,b]=series[i];if(i===0)g.moveTo(x(a),y(b));else g.lineTo(x(a),y(b));}
   g.stroke();g.setLineDash([]);
  }
  if(normal.checked)plot(balanceReference[condition],'#656f79',[2,4]);
  if(reference.checked)plot(baseline,colour[condition==='open'?'closed':'open'],[6,5]);
  plot(trace,colour[condition],[]);
  const [,a,b]=trace[count-1];g.fillStyle='#075f54';g.beginPath();g.arc(x(a),y(b),4,0,2*Math.PI);g.fill();
  legend.textContent=names[condition]+' · 实线'+(reference.checked?'　'+names[condition==='open'?'closed':'open']+' · 虚线':'')+(normal.checked?'　灰色点线：同条件健康模拟参考':'');
  function reading(series){const stats=count>1?copStats(series.slice(0,count)):null;return (stats?.pathMM||0).toFixed(1)+' mm'+(phase===1?' · 平均速度 '+stats.meanVelocityMMs.toFixed(2)+' mm/s':'');}
  metric.textContent=(phase*30).toFixed(1)+' 秒　路径 '+reading(trace)+(reference.checked?' ｜ '+names[condition==='open'?'closed':'open']+' '+reading(baseline):'');
 }
 reference.onchange=normal.onchange=draw;
 const showAll=clock(c,30,p=>{phase=p;draw();preview?.balanceFrame(p);if(caseResults)c.dispatchEvent(new CustomEvent('clinic-balance-frame',{bubbles:true,detail:{fraction:p,condition,point:trace[Math.round(1500*p)]}}));if(p>=1)onObserve(condition);});
 if(caseResults)c.append(btn('查看完整30秒',showAll));c.append(el('p','note','病例模拟 · COP 为双足合成压力中心。健康参考为同条件的教学模拟，不能作为诊断阈值。比较同一时长的路径与速度。单凭轨迹无法定位患侧，也无法单独判定本体感觉损伤。'));
 const sources=document.createElement('details'),summary=document.createElement('summary'),a=document.createElement('a');
 summary.textContent='研究依据与读图边界';a.href='https://doi.org/10.1186/s13102-025-01064-y';a.target='_blank';a.rel='noopener';a.textContent='查看双足测力板原始研究（2025）';
 sources.append(summary,el('p','note','一项双足测力板研究中，慢性踝关节不稳组在硬板睁眼和闭眼时，左右方向摆动及平均速度均高于健康对照组。此处展示双足合成 COP 的模拟对照，右踝受伤没有对应的固定轨迹形状。'),a);c.append(sources);
 return c;
}
export {walkingPanel as gaitExplorer} from './walking-panel-v26.js';
export function archCOPPanel(){const c=panel('足形与足底负荷 · 比较条件再解释','足弓类型不能单独预测COP必然向内或向外。比较同一行走时刻的压力分布，并核对色标。'),s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 300 360');s.classList.add('pressure-real');c.append(s);clock(c,2.4,p=>renderPressureDiagram(s,{mode:'dynamic',phase:p}));c.append(el('p','note','图为诊室共享的合成压力场；它显示时相与接触关系，不是扫描得到的真实病例。足弓形态不能单独决定COP方向。'));return c;}
export const musclePanel=()=>anatomicalPanel('muscle');
export const archPanel=()=>anatomicalPanel('arch');
export const jointPanel=()=>anatomicalPanel('joint');
export function contractionPanel(){
 const c=panel('在提踵中理解收缩方式','观察上升、保持和下降；三维人物动作仅作定性示教。'),host=el('div','real-actor-view'),tabs=el('div','explorer-tabs'),description=el('p','knowledge-detail');let preview,mode='concentric';
 const defs={concentric:['向心 · 上升','提踵上升时，小腿三头肌主动缩短、产生跖屈。'],eccentric:['离心 · 下降','缓慢落踵时，小腿三头肌在出力时被拉长，控制下降；不是放松。'],isometric:['等长 · 保持','保持位置时仍有张力，整体长度近似不变；肌束和肌腱内部仍可能变化。'],isotonic:['等张 · 概念','严格等张指张力近似恒定而长度改变。普通提踵或弹力带训练不等于严格恒张力。'],isokinetic:['等速 · 概念','专用设备控制有效区间的角速度并调整阻力；人物动作匀速不能证明等速测力。']};
 function select(id){mode=id;description.textContent=defs[id][1];[...tabs.children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===id));}
 for(const [id,[name]]of Object.entries(defs)){const b=btn(name,()=>select(id));b.dataset.mode=id;tabs.append(b);}c.append(tabs,host,description);select(mode);
 whenVisible(host,async()=>{preview=await actorPreview(host);preview.actor.setHeelTeachingPhase(0);return()=>preview.dispose();});
 clock(c,4,p=>{if(!preview)return;const v=mode==='eccentric'?1-p:mode==='isometric'?.65:p;preview.actor.setHeelTeachingPhase?.(v);});
 c.append(el('p','note','肌肉网格不按此动画变形，也不计算肌力、肌电或肌腱行程；等张和等速用定义区分，不冒充设备测试。'));return c;
}
