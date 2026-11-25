import * as THREE from 'three';
import {balanceTrials} from './balance-conditions.js?v=72';

// Inset fixed force plate, side-entry protection rails and a forward-facing console.
export function createBalanceStation(parent){
 const station=new THREE.Group();station.name='StaticBalanceInstrument';parent.add(station);
 const plateHeight=.157,plateRadius=.37,plateZ=-.08;
 const steel=surface(0xaebcbd,.34,.58),plinth=surface(0x242c30),black=surface(0x192024),rim=surface(0x818e90),deck=surface(0xc59764),white=surface(0xdbe0dc);
 function surface(color,roughness=.72,metalness=.04){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
 function part(name,geo,mat,x,y,z,group=station){
  const obj=new THREE.Mesh(geo,mat);obj.name=name;obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;group.add(obj);return obj;
 }
 function slab(name,w,d,h,r,x,y,z,mat){
  const path=new THREE.Shape(),l=-w/2,b=-d/2,R=w/2,t=d/2;
  path.moveTo(l+r,b);path.lineTo(R-r,b);path.quadraticCurveTo(R,b,R,b+r);path.lineTo(R,t-r);path.quadraticCurveTo(R,t,R-r,t);path.lineTo(l+r,t);path.quadraticCurveTo(l,t,l,t-r);path.lineTo(l,b+r);path.quadraticCurveTo(l,b,l+r,b);
  const geo=new THREE.ExtrudeGeometry(path,{depth:h,bevelEnabled:false,curveSegments:8});geo.rotateX(-Math.PI/2);return part(name,geo,mat,x,y,z);
 }
 function rod(name,start,end,r,mat=steel){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),v=b.clone().sub(a);
  const o=part(name,new THREE.CylinderGeometry(r,r,v.length(),24),mat,...a.lerp(b,.5).toArray());
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;
 }
 function disc(name,r,h,x,y,z,mat){return part(name,new THREE.CylinderGeometry(r,r,h,96),mat,x,y,z);}
 function texture(w,h,draw){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
 }
 slab('Recessed black base',1.01,1.42,.112,.09,0,.012,0,plinth);
 const grain=texture(512,512,(g,w,h)=>{g.fillStyle='#caa479';g.fillRect(0,0,w,h);for(let i=0;i<230;i++){const y=(i*137)%h;g.strokeStyle=i%2?'#a37b5233':'#e6c99b55';g.lineWidth=.6+(i%3)*.25;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(140,y+Math.sin(i)*5,360,y-3,w,y+(i%4));g.stroke();}});
 grain.wrapS=grain.wrapT=THREE.RepeatWrapping;deck.map=grain;deck.color.set(0xffffff);
 slab('Wood platform',1.06,1.48,.03,.12,0,.124,0,deck);
 disc('Flush metal ring',plateRadius+.018,.006,0,.154,plateZ,rim);
 const grid=texture(512,512,(g,w,h)=>{g.fillStyle='#343c3e';g.fillRect(0,0,w,h);g.strokeStyle='#919a9b';g.lineWidth=1.25;g.beginPath();for(let k=0;k<w;k+=16){g.moveTo(k,0);g.lineTo(k,h);g.moveTo(0,k);g.lineTo(w,k);}g.stroke();g.strokeStyle='#bfccca';g.lineWidth=2;g.strokeRect(248,248,16,16);});
 const tread=surface(0xffffff);tread.map=grid;
 const top=part('Circular gridded force plate',new THREE.CircleGeometry(plateRadius,96),tread,0,plateHeight+.0003,plateZ);top.rotation.x=-Math.PI/2;
 for(const x of [-.465,.465]){
  for(const z of [-.6,.5]){disc('Rail flange',.036,.011,x,.16,z,steel);}
  const points=[[x,.16,-.6],[x,.40,-.6],[x,.46,-.58],[x,.93,-.17],[x,.965,-.12],[x,.97,-.06],[x,.97,.50]];
  for(let j=1;j<points.length;j++){
   rod('Side rail',points[j-1],points[j],.0195);
   part('Rail bend',new THREE.SphereGeometry(.0195,16,12),steel,...points[j]);
  }
  rod('Front rail support',[x,.16,.50],[x,.97,.50],.017);
 }
 // The operator console sits beyond the deck. The screen faces the person on the plate.
 slab('Console foot',.66,.43,.065,.075,0,0,.91,black);
 const pedestal=part('Console cabinet',new THREE.CylinderGeometry(.31,.245,.77,48),plinth,0,.45,.91);pedestal.scale.z=.74;
 slab('Instrument worktop',.74,.49,.035,.085,0,.835,.88,black);
 slab('White control housing',.53,.29,.135,.035,0,.87,.91,white);
 rod('Mast foot',[-.29,.68,.85],[-.37,.68,.70],.034);
 rod('Mast',[-.37,.68,.70],[-.31,1.52,.97],.034);
 const badge=texture(220,270,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#a3b0b0';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(89,88);g.quadraticCurveTo(117,100,125,129);g.moveTo(125,129);g.quadraticCurveTo(101,151,87,188);g.moveTo(125,129);g.lineTo(159,189);g.moveTo(115,104);g.lineTo(149,76);g.stroke();g.fillStyle='#a3b0b0';g.beginPath();g.arc(111,69,9,0,2*Math.PI);g.fill();});
 const mark=part('Cabinet balance motif',new THREE.PlaneGeometry(.17,.21),new THREE.MeshBasicMaterial({map:badge,transparent:true,depthWrite:false}),0,.52,.698);mark.rotation.y=Math.PI;mark.castShadow=false;
 
 rod('Monitor arm',[-.31,1.52,.97],[-.12,1.57,1.03],.024,black);
 rod('Monitor hinge',[-.12,1.57,1.03],[0,1.57,.98],.021,black);
 const display=new THREE.Group();display.name='Patient display';display.position.set(0,1.55,.93);display.rotation.y=Math.PI;display.rotation.x=-.07;station.add(display);
 part('Black monitor housing',new THREE.BoxGeometry(.51,.33,.043),black,0,0,0,display);
 let ctx,lastCount=-1,lastCondition=null;
 const screen=texture(480,300,g=>ctx=g);
 const face=part('Balance display',new THREE.PlaneGeometry(.474,.291),new THREE.MeshBasicMaterial({map:screen,toneMapped:false}),0,.001,.0225,display);face.castShadow=false;
 const cablePath=new THREE.CatmullRomCurve3([[.13,1.51,.965],[.24,1.41,1.05],[.13,1.29,1.07],[-.22,1.40,.99],[-.31,1.35,.95],[-.32,.95,.81]].map(p=>new THREE.Vector3(...p)));
 part('Monitor cable',new THREE.TubeGeometry(cablePath,40,.005,8,false),black,0,0,0);
 function sample(fraction=null,condition='open'){
  const series=balanceTrials[condition];
  const count=fraction===null?0:1+Math.round(1500*THREE.MathUtils.clamp(fraction,0,1));if(lastCount===count&&lastCondition===condition)return;lastCount=count;lastCondition=condition;
  ctx.fillStyle='#183137';ctx.fillRect(0,0,480,300);ctx.fillStyle='#e2f4ec';ctx.font='bold 24px "Microsoft YaHei", sans-serif';ctx.fillText('静态平衡',22,42);
  ctx.font='18px sans-serif';ctx.fillText(count?((count-1)/50).toFixed(1)+' s':'准备',372,40);
  ctx.strokeStyle='#416568';ctx.lineWidth=1;ctx.beginPath();for(let x=40;x<470;x+=40){ctx.moveTo(x,62);ctx.lineTo(x,280);}for(let y=70;y<285;y+=30){ctx.moveTo(16,y);ctx.lineTo(464,y);}ctx.stroke();
  ctx.strokeStyle=condition==='open'?'#78dcc5':'#ffac79';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<count;i++){const q=series[i],x=240+q[1]*10,y=169-q[2]*10;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  ctx.fillStyle='#fff4c6';const q=count?series[count-1]:[0,0,0];ctx.beginPath();ctx.arc(240+q[1]*10,169-q[2]*10,4,0,2*Math.PI);ctx.fill();screen.needsUpdate=true;
 }
 sample();
 return {root:station,plateHeight,plateZ,plateRadius,sample,dispose(){const geometries=new Set(),materials=new Set(),maps=new Set();station.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){materials.add(o.material);if(o.material.map)maps.add(o.material.map);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of maps)t.dispose();station.removeFromParent();}};
}
