import * as T from 'three';
import {handRest,placeHand} from './bedside-motion.js';

const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const at=(actor,name)=>actor.bones.get(name).getWorldPosition(v());
// Three valid teaching trials for each side, in centimetres.
const trials=[5.8,6.2,6,7.8,8.2,8];
function tapeMaterial(){
 const c=document.createElement('canvas');c.width=720;c.height=96;const g=c.getContext('2d');
 g.fillStyle='#ffe087';g.fillRect(0,0,c.width,c.height);g.fillStyle='#342b20';g.font='bold 32px sans-serif';
 for(let mm=0;mm<120;mm++){const x=mm*6;g.fillRect(x,0,mm%10===0?3:2,mm%10===0?42:mm%5===0?31:18);if(mm%10===0)g.fillText(String(mm/10),x+3,78);}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map,side:T.DoubleSide});
}
export function wallTapeStudy({scene,room,actors,camera,controls,followTape=()=>true,onPhase,onDone}){
 const p=actors.patient,d=actors.therapist,wallZ=room.objects.wallLungeMarker.position.z;
 const group=new T.Group(),strip=new T.Mesh(new T.PlaneGeometry(.12,.024),tapeMaterial());
 strip.rotation.order='YXZ';strip.rotation.y=-Math.PI/2;strip.rotation.x=-Math.PI/2;
 group.add(strip);scene.add(group);
 const roll=new T.Mesh(new T.CylinderGeometry(.019,.019,.024,24),new T.MeshStandardMaterial({color:0xc88927}));
 roll.rotation.z=Math.PI/2;group.add(roll);
 const markerGeometry=new T.BufferGeometry().setFromPoints([v(),v(1,0,0)]);
 const marker=new T.Line(markerGeometry,new T.LineDashedMaterial({color:0x145b58,dashSize:.006,gapSize:.004}));
 group.add(marker);
 const palm=handRest(d,'R'),leftPalm=handRest(d,'L');let elapsed=0,previous=-1,lastRead=-1,ended=false;
 const readings={R:[],L:[]};
 const rowTime=2.55,ease=x=>T.MathUtils.smoothstep(x,0,1);
 function tick(dt){
  if(ended)return;
  elapsed=Math.min(rowTime*6,elapsed+dt);const index=Math.min(5,Math.floor(elapsed/rowTime)),t=elapsed-index*rowTime;
  const side=index<3?'R':'L',cm=trials[index];
  if(index!==previous){onPhase(side,index%3+1);previous=index;}
  p.setClinicalPose(side==='R'?'wall-measure-right':'wall-measure-left');
  const toe=at(p,'toe1-2.'+side);
  // The terminal joint lies just proximal to the distal soft-tissue tip.
  const distal=toe.clone().sub(at(p,'toe1-1.'+side)).normalize();
  toe.addScaledVector(distal,.011);
  const dz=wallZ+cm/100-toe.z;
  p.root.position.z+=dz;p.root.updateMatrixWorld(true);
  const x=toe.x-.095,extension=.12*ease((t-.12)/.94);
  strip.scale.x=Math.max(.001,extension/.12);strip.material.map.repeat.x=extension/.12;
  strip.position.set(x,.006,wallZ+extension/2);
  roll.position.set(x,.023,wallZ+extension);
  marker.visible=t>=1.14;
  if(marker.visible&&lastRead!==index){
   const distance=Number(((toe.z+dz-wallZ)*100).toFixed(1));
   readings[side].push(distance);lastRead=index;onPhase(side,index%3+1,distance);
  }
  marker.position.set(x-.012,.010,wallZ+cm/100);
  marker.geometry.attributes.position.setXYZ(1,toe.x-(x-.012),0,0);
  marker.geometry.attributes.position.needsUpdate=true;marker.computeLineDistances();
  const rig=d.bedsideRig;rig.reset();d.root.rotation.set(0,-Math.PI*.65,0);
  const hipHeight=.30;
  const pelvis=v(x+.49,hipHeight,wallZ+.40);
  d.root.position.copy(pelvis).sub(rig.rest.get('root').point.clone().applyQuaternion(d.root.quaternion));d.root.updateMatrixWorld(true);
  for(const h of ['L','R']){
   const lateral=h==='L'?1:-1;
   const foot=v(lateral*.13,rig.rest.get('root').point.y-hipHeight+.075,h==='R'?-.18:.19);
   rig.reach('upperleg01.'+h,'lowerleg01.'+h,'foot.'+h,foot,v(lateral*.27,rig.rest.get('root').point.y+.12,.55));
  }
  rig.offset('spine03',v(1,0,0),1.35);rig.offset('head',v(1,0,0),.28);
  const towards=v(-1,0,0),down=v(0,-1,0);
  const tip=v(x+.015,.028,wallZ+extension);
  placeHand(d,'R',palm,tip,v(-.55,0,-.84).normalize(),down,1,tip.clone().add(v(.23,.22,.28)),palm.fingerPad);
  const zero=v(x+.012,.020,wallZ+.005);
  zero.addScaledVector(v(.09,.12,.015),ease((t-.70)/.42));
  placeHand(d,'L',leftPalm,zero,towards,down,1,zero.clone().add(v(.22,.20,.08)),leftPalm.fingerPad);
  if(followTape()){
   const eye=v(x-.25,.36,wallZ+.25),target=v(x+.016,.031,wallZ+.072);
   camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);camera.updateMatrixWorld();controls.enabled=false;
  }
  if(elapsed>=rowTime*6){
   ended=true;
   const mean=values=>Number((values.reduce((sum,n)=>sum+n,0)/values.length).toFixed(1));
   onDone({rightCm:mean(readings.R),leftCm:mean(readings.L),trialsPerSide:readings.R.length,readings});
  }
 }
 return {tick,get tracking(){return followTape();},close(){scene.remove(group);strip.material.map.dispose();for(const mesh of [strip,roll,marker]){mesh.geometry.dispose();mesh.material.dispose();}d.bedsideRig.reset();}};
}
