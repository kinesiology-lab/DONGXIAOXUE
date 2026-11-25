import * as THREE from 'three';
import {createClinicRoom} from './scene-room.js?v=75';
import {createActors} from './actors.js';
import {startBedside} from './bedside-player.js';

async function open(){
  const host=document.querySelector('main'),canvas=document.querySelector('canvas');
  const film=new URLSearchParams(location.search).has('film');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:film});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e4ebe6');
  const camera=new THREE.PerspectiveCamera(45,1,.035,35);
  const room=createClinicRoom(scene);
  scene.add(new THREE.HemisphereLight('#fff9eb','#a0b5ae',2));
  const key=new THREE.DirectionalLight('#fff4db',2.2);key.position.set(1.5,5,2);scene.add(key);
  const fill=new THREE.DirectionalLight('#e4f1fa',.85);fill.position.set(-2,3,-1);scene.add(fill);
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  resize();addEventListener('resize',resize);
  const actors=await createActors(scene);
  room.setOccupied(true);
  const player=startBedside({host,actors,room,camera,renderer,film,onClose:()=>{const ref=document.referrer?new URL(document.referrer):null;if(ref?.origin===location.origin&&ref.pathname!==location.pathname&&history.length>1)history.back();else location.assign('../index.html#home');}});
  document.querySelector('#status').remove();
  const draw=()=>renderer.render(scene,camera);
  if(film){
    window.renderBedsideFrame=time=>{const pose=player.seek(time);draw();return Object.fromEntries(Object.entries(pose).map(([k,v])=>[k,v.toArray()]));};
    draw();return;
  }
  let last=performance.now();
  function animate(now){player.tick(Math.min((now-last)/1000,.15));last=now;draw();requestAnimationFrame(animate);}
  requestAnimationFrame(animate);
}
open().catch(error=>{console.error(error);const p=document.querySelector('#status');p.textContent='三维场景未能打开。';const a=document.createElement('a');a.href='../soap/media/ankle-exam.mp4';a.textContent='播放本次查体录像';p.append(' ',a);});
