import {fitHeadObject} from './head-fit.js';
import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const prep={maskEnd:1.15,doseEnd:2.45,rubEnd:4.2,rightGloveEnd:5.1};
export const preparationDuration=6;
export function preparationLabel(t){
 if(t<prep.maskEnd)return '戴好口罩';
 if(t<prep.doseEnd)return '按压一次，将手消毒液取在掌心';
 if(t<prep.rubEnd)return '揉搓至双手干燥（快放，实际约 20–30 秒）';
 return '戴好检查手套';
}

export function createHandRub(trolley){
 const bottle=new THREE.Group();bottle.name='Hand_rub_dispenser';bottle.position.set(-.02,.772,-.07);trolley.add(bottle);
 const plastic=new THREE.MeshStandardMaterial({color:0xc5e8dc,roughness:.27});
 const white=new THREE.MeshStandardMaterial({color:0xf4f6f1,roughness:.4});
 const teal=new THREE.MeshStandardMaterial({color:0x237c70});
 function part(parent,geometry,material,x,y,z){
   const obj=new THREE.Mesh(geometry,material);obj.position.set(x,y,z);parent.add(obj);return obj;
 }
 const shell=[[.002,0],[.039,0],[.044,.008],[.044,.121],[.041,.140],[.020,.153],[.017,.164]];
 part(bottle,new THREE.LatheGeometry(shell.map(([radius,h])=>new THREE.Vector2(radius,h)),40),plastic,0,0,0);
 part(bottle,new THREE.CylinderGeometry(.022,.023,.021,32),white,0,.164,0);
 part(bottle,new THREE.CylinderGeometry(.017,.017,.006,32),teal,0,.177,0);
 const cv=document.createElement('canvas');cv.width=384;cv.height=224;
 const ctx=cv.getContext('2d');ctx.fillStyle='#f5faf4';ctx.fillRect(0,0,384,224);ctx.fillStyle='#206e60';ctx.fillRect(0,0,384,20);
 ctx.textAlign='center';ctx.font='bold 68px Microsoft YaHei, sans-serif';ctx.fillText('手消毒液',192,119);
 ctx.font='40px Microsoft YaHei, sans-serif';ctx.fillText('含醇 · 免洗',192,182);
 const label=new THREE.CanvasTexture(cv);label.colorSpace=THREE.SRGBColorSpace;
 const labelMat=new THREE.MeshStandardMaterial({map:label,roughness:.8});
 part(bottle,new THREE.CylinderGeometry(.0446,.0446,.071,32,1,true,-1.15,2.3),labelMat,0,.074,0);
 const head=new THREE.Group();head.name='Metering_pump';bottle.add(head);
 part(head,new THREE.CylinderGeometry(.008,.008,.033,18),white,0,-.016,0);
 const pad=part(head,new THREE.SphereGeometry(1,24,12),teal,0,0,0);pad.scale.set(.032,.010,.021);
 const spout=part(head,new THREE.CylinderGeometry(.006,.009,.076,20),white,.040,-.001,0);spout.rotation.z=-Math.PI/2;
 part(head,new THREE.CylinderGeometry(.006,.005,.014,20),white,.078,-.006,0);
 const jet=part(head,new THREE.CylinderGeometry(.0023,.0032,1,10),new THREE.MeshBasicMaterial({color:0x76cfc8,transparent:true,opacity:.88}),.078,-.017,0);
 function set(depth,flow){bottle.scale.y=1/trolley.scale.y;head.position.y=.202-depth*.013;jet.visible=flow>.015;jet.scale.y=.047*flow;jet.position.y=-.013-jet.scale.y/2;}
 set(0,0);
 return {set,pressPoint:()=>head.localToWorld(V(0,.014,0)),receivePoint:()=>bottle.localToWorld(V(.078,.126,0)),
  dispose(){const mats=new Set();bottle.removeFromParent();bottle.traverse(o=>{if(o.isMesh){o.geometry.dispose();mats.add(o.material);}});mats.forEach(m=>m.dispose());label.dispose();}
 };
}
// Accessories use the same hand skeleton. They cannot drift from the fingers.
export function createExamProtection(actor,gloveTint=0xb7dbdf){
 actor.bedsideRig.reset();actor.root.updateMatrixWorld(true);
 const skin=actor.model.getObjectByName('Patient_Skin')||(()=>{let s;actor.model.traverse(o=>{if(o.isSkinnedMesh&&/Patient_Skin/.test(o.name))s=o;});return s;})();
 const originalGeometry=skin.geometry,originalMaterial=skin.material;
 const gloveGeometry=originalGeometry.clone(),tags=[],don=[];
 const frames={};
 for(const side of ['R','L']){
  const wrist=skin.worldToLocal(actor.bones.get('wrist.'+side).getWorldPosition(V()));
  const elbow=skin.worldToLocal(actor.bones.get('lowerarm01.'+side).getWorldPosition(V()));
  frames[side]={wrist,axis:wrist.clone().sub(elbow).normalize()};
 }
 const pos=gloveGeometry.attributes.position;
 for(let i=0;i<pos.count;i++){
  const q=V().fromBufferAttribute(pos,i);let tag=0,phase=1;
  for(const [side,sign]of [['R',1],['L',-1]]){
   const {wrist,axis}=frames[side],delta=q.clone().sub(wrist),axial=delta.dot(axis);
   if(delta.length()<.28&&axial>-.035){tag=sign;phase=THREE.MathUtils.clamp((.20-axial)/.235,0,1);break;}
  }
  tags.push(tag);don.push(phase);
 }
 gloveGeometry.setAttribute('gloveSide',new THREE.Float32BufferAttribute(tags,1));
 gloveGeometry.setAttribute('gloveDon',new THREE.Float32BufferAttribute(don,1));
 const progress={value:new THREE.Vector2(0,0)},gloveColor=new THREE.Color(gloveTint);
 const material=originalMaterial.clone();
 material.onBeforeCompile=(s,renderer)=>{
  originalMaterial.onBeforeCompile.call(material,s,renderer);
  s.uniforms.gloveProgress=progress;s.uniforms.gloveColor={value:gloveColor};
  s.vertexShader='attribute float gloveSide; attribute float gloveDon; varying vec2 vGlove;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlove=vec2(gloveSide,gloveDon);');
  s.fragmentShader='uniform vec2 gloveProgress; uniform vec3 gloveColor; varying vec2 vGlove;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat gp=vGlove.x>0.0?gloveProgress.x:gloveProgress.y; if(abs(vGlove.x)>.5 && gp>0.0 && vGlove.y<=gp) diffuseColor.rgb=gloveColor;');
 };
 material.customProgramCacheKey=()=>originalMaterial.customProgramCacheKey()+'-exam-gloves-v34';
 skin.geometry=gloveGeometry;skin.material=material;
 /* Gloves share the actual skin surface, so articulated fingers cannot expose
    fragments of the skin through a second independently clipped mesh. */
 const mask=new THREE.Group();mask.name='Examination_mask';const positions=[],indices=[],nx=16,ny=10;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx*2-1,v=j/ny*2-1;positions.push(u*.075,1.573+v*.039+(v>0?.008*(1-u*u):0),.136+.057*(1-u*u)+.002*Math.sin(v*3*Math.PI));if(i<nx&&j<ny){const a=j*(nx+1)+i;indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();mask.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xb8d9df,roughness:1,side:THREE.DoubleSide})));
 const loops=new THREE.Group();mask.add(loops);
 for(const sign of [-1,1]){const curve=new THREE.CatmullRomCurve3([V(sign*.073,1.603,.137),V(sign*.095,1.625,.068),V(sign*.099,1.596,.025),V(sign*.089,1.568,.064),V(sign*.073,1.544,.137)]);loops.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.0018,6,false),new THREE.MeshStandardMaterial({color:0xf0f1eb,roughness:1})));}
 fitHeadObject(mask,'therapist');actor.root.add(mask);actor.root.updateMatrixWorld(true);actor.bones.get('head').attach(mask);const home=mask.position.clone(),homeQ=mask.quaternion.clone();mask.visible=false;
 return {
  set({mask:mp=0,right=0,left=0,visible=true}){mask.visible=visible;loops.visible=true;mask.position.copy(home).add(V(0,-.29,.13).multiplyScalar(1-mp).applyQuaternion(homeQ));progress.value.set(right,left);},
  dispose(){skin.geometry=originalGeometry;skin.material=originalMaterial;gloveGeometry.dispose();material.dispose();mask.removeFromParent();mask.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});},
 };
}
