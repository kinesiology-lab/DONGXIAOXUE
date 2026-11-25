import {replaceHead} from './reference-head.js?v=69';
import {referenceWardrobe} from './reference-wardrobe.js';
import * as THREE from 'three';

// Project-authored display refinements to the CC0 source surface. These are
// fictional adult characters, not scanned people or anatomical calibration.
const clamp = THREE.MathUtils.clamp;
const blend = (a, b, v) => a + (b - a) * v;
const band = (v, a, b, fade) => clamp((v-a)/fade,0,1)*clamp((b-v)/fade,0,1);
const gaussian = (v, middle, width) => Math.exp(-(((v-middle)/width)**2));
const point = (x,y,z) => new THREE.Vector3(x,y,z);

function surfaceRefinement(mesh, female) {
  const geometry = mesh.geometry = mesh.geometry.clone();
  const p = geometry.attributes.position;
  for(let i=0;i<p.count;i++) {
    let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    // Shape the chest and shoulder envelope in the bind pose so the clothing
    // cut from this surface follows it. Fade out before the neck and forearms.
    const taper=band(y,1.08,1.505,.095)*band(Math.abs(x),.05,.38,.09);
        x*=1-(female?.08:.12)*taper;
    // A relaxed shoulder slopes away from the neckline. Keep the correction
    // local to the deltoid so hand and wrist placement still follow the rig.
    const cap=gaussian(Math.abs(x),.212,.073)*gaussian(y,1.403,.072);
    y-=(female?.024:.018)*cap;
    if(female) {
      // Preserve the feet, leg length, bones and weights. Small clothing/body
      // surface edits distinguish the adult female role without a sexual pose.
      const shoulder=band(y,1.16,1.51,.08)*clamp((Math.abs(x)-.08)/.16,0,1);
      x*=1-.065*shoulder;
      const waist=gaussian(y,1.035,.115)*clamp((.27-Math.abs(x))/.10,0,1);
      x*=1-.055*waist;
      if(z>.04) z+=.005*gaussian(y,1.26,.095)*gaussian(Math.abs(x),.075,.075);
    }
    if(y>1.515 && z>.015) {
      if(!female){x*=1+.045*gaussian(y,1.60,.065);z-=.004*gaussian(x,0,.025)*gaussian(y,1.60,.025);}
      const lowerFace=band(y,1.516,1.622,.025)*clamp((.095-Math.abs(x))/.035,0,1);
      x*=1-(female?.17:.027)*lowerFace;
      if(female) {
        x*=1-.045*gaussian(y,1.612,.035)*clamp((.09-Math.abs(x))/.03,0,1);
        // A modest reduction of the source nose and supraorbital projection.
        const nose=gaussian(y,1.594,.026)*gaussian(x,0,.025)*clamp((z-.14)/.035,0,1);
        x*=1-.085*nose;z-=.011*nose;
        z-=.0035*gaussian(y,1.65,.014)*gaussian(x,0,.065);
        z-=.0025*gaussian(y,1.542,.015)*gaussian(x,0,.04);
      }
    }
    p.setXYZ(i,x,y,z);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  if(!/Patient_Skin/.test(mesh.name)) return;
  const color=new THREE.Color(), skin=new THREE.Color(female?0xeebca9:0xe4b295);
  const cheek=new THREE.Color(female?0xc78579:0xb88776), lip=new THREE.Color(female?0xad7070:0xa3736a);
  const colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=clamp((z-.10)/.055,0,1);
    color.copy(skin);
    const blush=gaussian(Math.abs(x),.045,.022)*gaussian(y,1.598,.024)*front*(female?.20:.075);
    color.lerp(cheek,blush);
    const lipAmount=gaussian(x,0,.026)*gaussian(y,1.562,.0055)*clamp((z-.151)/.017,0,1);
    color.lerp(lip,lipAmount*(female?.79:.60));
    colors.set([color.r,color.g,color.b],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const material of materials) { material.color.setHex(0xffffff);material.vertexColors=true;material.roughness=.81; }
}

export async function applyActorAppearance({root,model,bones,skins,role}) {
  const female=role==='patient';
  model.traverse(o=>{
    if(/^Patient_eye\./.test(o.userData.name||o.name)||/Patient_ShortHair/.test(o.name))o.visible=false;
  });
  const sourceSkins=skins.filter(s=>/Patient_Skin|Patient_Tshirt|Patient_Shorts/.test(s.name));
  sourceSkins.forEach(s=>surfaceRefinement(s,female));
  if(female){const top=sourceSkins.find(s=>/Patient_Tshirt/.test(s.name));if(top){const p=top.geometry.attributes.position,c=new THREE.Color(),colors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);c.setHex(0x92959c);const panel=clamp((.055-Math.abs(x))/.020,0,1)*clamp((z-.07)/.05,0,1)*clamp((y-1.05)/.06,0,1);colors.set([c.r,c.g,c.b],i*3);}top.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));for(const m of Array.isArray(top.material)?top.material:[top.material]){m.color.setHex(0xffffff);m.vertexColors=true;}}}
  const body=sourceSkins.find(s=>/Patient_Skin/.test(s.name));
  referenceWardrobe(sourceSkins.find(s=>/Patient_Tshirt/.test(s.name)),body,female);
  const head=body?await replaceHead(root,bones.get('head'),body,role):null;
  root.userData.updateReferenceMouth=amount=>{if(head)head.face.morphTargetInfluences[0]=amount;};
  const contract={schema:'dxx-reference-head-v37',role,source:'Three supplied illustration views, reconstructed head attached to original rig',rigUnchanged:true,weightsUnchanged:true,boneCount:bones.size,character: female?'陈女士':'林治疗师',hair:female?'棕色低马尾':'黑色短发'};
  root.userData.appearance=contract;return contract;
}
