import * as THREE from 'three';
import {createExamProtection,createHandRub,prep,preparationDuration,preparationLabel} from './exam-protection.js';
export {preparationDuration};

const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const X=V(1,0,0), Y=V(0,1,0), Z=V(0,0,1);
const turn=(axis,angle)=>new THREE.Quaternion().setFromAxisAngle(axis,angle);
const mix=THREE.MathUtils.lerp;
const ramp=(time,start,end)=>THREE.MathUtils.smoothstep(time,start,end);
const peak=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
const world=(a,name)=>a.bones.get(name).getWorldPosition(V());
const local=(a,worldPoint)=>a.root.worldToLocal(worldPoint.clone());
export const duration=16;
export const chapters=[
  [-preparationDuration,'检查前防护'],[0,'上床准备'],[6.2,'前抽屉试验'],[10.9,'距骨倾斜试验']
];
export function instruction(t){
  if(t<0)return preparationLabel(t+preparationDuration);
  if(t<6.2)return '陈女士仰卧，右小腿垫起，足跟悬出床缘。';
  if(t<9.8)return '前抽屉试验　左手整掌贴稳胫骨远端，右手从后下方托住足跟，向前带动后足。';
  if(t<11.25)return '陈女士仰卧，右踝回到中立位。右手固定胫骨下缘，左手虎口贴住足外侧缘。';
  if(t<12.8)return '右手稳住胫骨，左手从足外侧带动跟骨内收、内翻。';
  if(t<13.65)return '保持内翻终末位，在外踝外侧轻轻加压。';
  if(t<15)return '松开压力，缓慢将后足带回中立位。';
  return '本例右侧前移、内翻倾斜较健侧略大。接下来比较背伸和外翻抗阻表现。';
}

function basis(along, across){
  const z=along.clone().normalize();
  const x=across.clone().addScaledVector(z,-across.dot(z)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,V().crossVectors(z,x),z));
}

export function handRest(actor,side){
  const restPoint=name=>actor.bedsideRig.rest.get(name+'.'+side).point;
  const wrist=restPoint('wrist');
  const palm=restPoint('finger3-1').clone().sub(wrist);
  const across=restPoint('finger2-1').clone().sub(restPoint('finger5-1'));
  const fingerPad=restPoint('finger2-3').clone().lerp(restPoint('finger3-3'),.5).sub(wrist);
  const anchor=palm.clone().multiplyScalar(.66);
  const thumb=restPoint('finger1-3').clone().sub(restPoint('finger1-2')).multiplyScalar(.65).add(restPoint('finger1-3')).sub(wrist).sub(anchor);
  const web=restPoint('finger1-2').clone().lerp(restPoint('finger2-1'),.5).sub(wrist);
  return {palm:anchor,web,thumb,fingerPad,basis:basis(palm,across),wrist:actor.bedsideRig.rest.get('wrist.'+side).world};
}

function contactRotation(side,rest,along,inward){
  const across=V().crossVectors(inward,along).multiplyScalar(side==='R'?-1:1);
  return basis(along,across).multiply(rest.basis.clone().invert());
}

export function placeHand(actor,side,rest,contact,along,inward,weight,elbow,anchor=rest.palm,orientation){
  const sign=side==='R'?-1:1;
  const rig=actor.bedsideRig;
  const rotation=orientation||contactRotation(side,rest,along,inward);
  const wristWorld=contact.clone().sub(anchor.clone().applyQuaternion(rotation));
  const target=V(sign*.225,.82,.18).lerp(local(actor,wristWorld),weight);
  const pole=V(sign*.55,1.0,-.14);
  if(elbow)pole.lerp(local(actor,elbow),weight);
  rig.reach('upperarm01.'+side,'lowerarm01.'+side,'wrist.'+side,target,pole);
  const bone=actor.bones.get('wrist.'+side);
  const current=actor.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  const desired=actor.root.quaternion.clone().invert().multiply(rotation).multiply(rest.wrist);
  rig.orient('wrist.'+side,current.slerp(desired,weight));
}

// Articulate the actual skinned MCP, PIP and DIP bones around the contact surface.
export function wrapFingers(actor,side,weight){
  const rig=actor.bedsideRig;
  const point=name=>rig.rest.get(name+'.'+side).point;
  const along=point('finger3-1').clone().sub(point('wrist')).normalize();
  const across=point('finger2-1').clone().sub(point('finger5-1')).normalize();
  const palmNormal=V().crossVectors(along,across).multiplyScalar(side==='R'?-1:1).normalize();
  for(let digit=1;digit<=5;digit++)for(let joint=1;joint<=3;joint++){
    const name='finger'+digit+'-'+joint+'.'+side, bone=actor.bones.get(name);
    const next='finger'+digit+'-'+Math.min(joint+1,3)+'.'+side;
    const prev='finger'+digit+'-'+Math.max(joint-1,1)+'.'+side;
    const ref=rig.rest.get(name);
    const tangent=joint<3?rig.rest.get(next).point.clone().sub(ref.point):ref.point.clone().sub(rig.rest.get(prev).point);
    // Local flexion preserves the metacarpal spread and the thumb's own plane.
    // Never aim all five digits at one world-space tangent.
    const axis=V().crossVectors(tangent.normalize(),palmNormal).normalize().applyQuaternion(ref.world.clone().invert());
    const angles=digit===1?[.12,.28,.22]:[.38,.62,.34];
    bone.quaternion.copy(ref.quaternion).multiply(turn(axis,angles[joint-1]*weight));
    bone.updateMatrixWorld(true);
  }
}

// Sample cross-sections of this patient's posed skin. Each digit follows the
// measured contour at its own level; the thumb opposes the other four digits.
function shankSurface(patient,ankle){
  const skin=patient.model.getObjectByName('Patient_Skin'),g=skin.geometry,pos=g.attributes.position;
  const vertices=[],rings=Array.from({length:30},()=>[]),z0=-.257,step=.009;
  for(let i=0;i<pos.count;i++){
    if(pos.getX(i)>=0||pos.getY(i)>.48)continue;
    vertices[i]=skin.localToWorld(skin.getVertexPosition(i,V())).sub(ankle);
  }
  const index=g.index;
  for(let i=0;i<(index?index.count:pos.count);i+=3){
    const triangle=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);if(triangle.some(v=>!v))continue;
    for(let k=0;k<3;k++){
      const a=triangle[k],b=triangle[(k+1)%3],lo=Math.min(a.z,b.z),hi=Math.max(a.z,b.z);
      for(let j=Math.max(0,Math.ceil((lo-z0)/step));j<rings.length&&z0+j*step<hi;j++){
        rings[j].push(a.clone().lerp(b,(z0+j*step-a.z)/(b.z-a.z)));
      }
    }
  }
  const sections=rings.map(points=>{
    const box=new THREE.Box3().setFromPoints(points),center=box.getCenter(V());
    const outline=points.map(p=>({a:Math.atan2(p.x-center.x,p.y-center.y),r:Math.hypot(p.x-center.x,p.y-center.y)})).sort((a,b)=>a.a-b.a);
    return {center,outline};
  });
  function contour(section,a,z,pad){
    const {center,outline}=section,angle=Math.atan2(Math.sin(a),Math.cos(a));
    const i=outline.findIndex(p=>p.a>angle),hi=i<0?0:i,lo=(hi+outline.length-1)%outline.length;
    const prev=outline[lo],next=outline[hi],span=(next.a-prev.a+2*Math.PI)%(2*Math.PI);
    const f=span?((angle-prev.a+2*Math.PI)%(2*Math.PI))/span:0;
    const radius=mix(prev.r,next.r,f)+pad;
    return V(center.x+Math.sin(a)*radius,center.y+Math.cos(a)*radius,z);
  }
  return (z,angle,pad)=>{
    const u=THREE.MathUtils.clamp((z-z0)/step,0,rings.length-1),i=Math.min(rings.length-2,Math.floor(u));
    return contour(sections[i],angle,z,pad).lerp(contour(sections[i+1],angle,z,pad),u-i);
  };
}

// Intersect the lateral rearfoot itself at the chosen level in the neutral pose.
function lateralBorder(patient,seed){
  const skin=patient.model.getObjectByName('Patient_Skin'),g=skin.geometry,attr=g.attributes.position;
  const verts=[],ray=new THREE.Ray(seed.clone().addScaledVector(X,-.22),X);
  for(let i=0;i<attr.count;i++){
    if(attr.getX(i)<0&&attr.getY(i)<.32)verts[i]=skin.localToWorld(skin.getVertexPosition(i,V()));
  }
  let hit=null;
  for(let j=0;j<(g.index?g.index.count:attr.count);j+=3){
    const triangle=[0,1,2].map(k=>verts[g.index?g.index.getX(j+k):j+k]);
    if(triangle.some(point=>!point))continue;
    const p=ray.intersectTriangle(...triangle,false,V());
    if(p&&(!hit||p.x<hit.x))hit=p;
  }
  return hit||seed;
}

function fitShinGrip(actor,ankle,surface,side){
  for(let digit=1;digit<=5;digit++){
    const thumb=digit===1,sign=thumb?1:-1;
    for(let j=1;j<=3;j++){
      const bone=actor.bones.get('finger'+digit+'-'+j+'.'+side),start=bone.getWorldPosition(V());
      const next=actor.bones.get('finger'+digit+'-'+(j+1)+'.'+side);
      const previous=actor.bones.get('finger'+digit+'-'+(j-1)+'.'+side);
      const tangent=next?next.getWorldPosition(V()).sub(start):start.clone().sub(previous.getWorldPosition(V())).multiplyScalar(.70);
      const length=tangent.length(),p=start.clone().sub(ankle),z=p.z+length*(thumb?.54:-.36);
      const center=surface(p.z,0,0).add(surface(p.z,Math.PI,0)).multiplyScalar(.5);
      const angle=Math.atan2(p.x-center.x,p.y-center.y),pad=thumb?.009:.0075;
      let lo=0,hi=1.65;
      for(let k=0;k<8;k++){const mid=(lo+hi)/2;if(surface(z,angle+sign*mid,pad).distanceTo(p)<length)lo=mid;else hi=mid;}
      const aim=surface(z,angle+sign*(lo+hi)/2,pad).sub(p).normalize();
      const rotation=new THREE.Quaternion().setFromUnitVectors(tangent.normalize(),aim).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));bone.updateMatrixWorld(true);
    }
  }
}

// Fit the cupping fingers to the posed heel. The heel is asymmetric, so a
// fixed flexion angle leaves some fingertips inside it and others in the air.
function fitHeelGrip(actor,patient,heel,side){
  const skin=patient.model.getObjectByName('Patient_Skin'),g=skin.geometry,vertices=[];
  for(let i=0;i<g.attributes.position.count;i++){
    const pos=g.attributes.position;
    if(pos.getX(i)>=0||pos.getY(i)>.32)continue;
    const p=skin.localToWorld(skin.getVertexPosition(i,V()));
    if(p.distanceToSquared(heel)<.19*.19)vertices[i]=p;
  }
  const triangles=[],index=g.index;
  for(let i=0;i<(index?index.count:vertices.length);i+=3){
    const points=[0,1,2].map(j=>vertices[index?index.getX(i+j):i+j]);
    if(points.some(p=>!p))continue;
    const tri=new THREE.Triangle(...points),normal=tri.getNormal(V());
    if(normal.lengthSq()>.99)triangles.push({tri,normal});
  }
  function nearestPad(p,pad){
    let distance=Infinity,closest=null;const trial=V();
    for(const {tri,normal} of triangles){
      tri.closestPointToPoint(p,trial).addScaledVector(normal,pad);
      const d=trial.distanceToSquared(p);
      if(d<distance){distance=d;closest=trial.clone();}
    }
    return closest;
  }
  for(let digit=1;digit<=5;digit++)for(let j=1;j<=3;j++){
    const joint=k=>actor.bones.get('finger'+digit+'-'+k+'.'+side);
    const bone=joint(j),start=bone.getWorldPosition(V());
    const delta=j<3?joint(j+1).getWorldPosition(V()).sub(start):start.clone().sub(joint(j-1).getWorldPosition(V())).multiplyScalar(.7);
    const length=delta.length(),direction=delta.clone().normalize(),end=start.clone().add(delta);
    for(let i=0;i<6;i++){
      const contact=nearestPad(end,digit===1?.009:.007);
      if(!contact)break;
      end.copy(contact).sub(start).setLength(length).add(start);
    }
    const target=end.sub(start).normalize(),angle=direction.angleTo(target);
    const adjustment=new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(direction,target),Math.min(1,.62/Math.max(.001,angle)));
    const rotation=adjustment.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
    bone.updateMatrixWorld(true);
  }
}

function aimThumbPad(actor,target,side){
  const joints=[1,2,3].map(i=>actor.bones.get('finger1-'+i+'.'+side));
  const rest=actor.bedsideRig.rest,distal=rest.get('finger1-3.'+side);
  const tipOffset=distal.point.clone().sub(rest.get('finger1-2.'+side).point).multiplyScalar(.65).applyQuaternion(distal.world.clone().invert());
  const tip=()=>joints[2].localToWorld(tipOffset.clone());
  for(let pass=0;pass<6;pass++){
    if(tip().distanceToSquared(target)<.000002)break;
    for(let i=2;i>=0;i--){
      const bone=joints[i],base=bone.getWorldPosition(V());
      const toward=tip().sub(base).normalize(),wanted=target.clone().sub(base).normalize();
      const q=new THREE.Quaternion().setFromUnitVectors(toward,wanted);
      const step=new THREE.Quaternion().slerp(q,Math.min(1,.33/Math.max(.001,toward.angleTo(wanted))));
      const rotation=step.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
      bone.updateMatrixWorld(true);
    }
  }
}

function examUndershirt(actor,patient){
  let skin;
  actor.root.traverse(o=>{if(o.isSkinnedMesh&&o.name==='Patient_Skin')skin=o;});
  const material=skin.material,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
  const baseKey=previousKey.call(material),color=new THREE.Color(patient?0xd7d6d2:0x303d5b);
  const region=patient?'abs(vExamPoint.x)<0.202 && vExamPoint.y>0.72 && vExamPoint.y<1.37':
    'abs(vExamPoint.x)>0.06 && vExamPoint.y>1.24 && vExamPoint.y<1.445';
  material.customProgramCacheKey=()=>baseKey+'-exam-undershirt-'+Number(patient);
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    shader.uniforms.examFabric={value:color};
    shader.vertexShader='varying vec3 vExamPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvExamPoint=position;');
    shader.fragmentShader='varying vec3 vExamPoint; uniform vec3 examFabric;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif('+region+')diffuseColor.rgb=examFabric;');
  };
  material.needsUpdate=true;
  return ()=>{material.onBeforeCompile=previous;material.customProgramCacheKey=previousKey;material.needsUpdate=true;};
}

// Snapshots are absolute, so replay and scrubbing cannot accumulate joint rotations.
export function createBedsideMotion(actors,room,{seatedStart=false,barefoot=true}={}){
  const p=actors.patient, d=actors.therapist, pr=p.bedsideRig, dr=d.bedsideRig;
  const protection=createExamProtection(d);
  const removeLayers=[examUndershirt(p,true),examUndershirt(d,false)];
  const hands={R:handRest(d,'R'),L:handRest(d,'L')};
  const pivot=pr.rest.get('root').point;
  const stool=room.objects.examStool, cart=room.objects.trolley;
  const sanitizer=createHandRub(cart);
  const arrows=new THREE.Group(),red=new THREE.MeshBasicMaterial({color:0xcd352e,depthTest:false,depthWrite:false,toneMapped:false});
  const shaft=new THREE.CylinderGeometry(.0025,.0025,.051,14),tip=new THREE.ConeGeometry(.008,.018,18);
  function forceArrow(){
    const group=new THREE.Group(),body=new THREE.Mesh(shaft,red),head=new THREE.Mesh(tip,red);
    body.position.y=-.0435;head.position.y=-.009;body.renderOrder=head.renderOrder=4;
    group.add(body,head);arrows.add(group);return group;
  }
  const counterforce=forceArrow(),translation=forceArrow();
  room.objects.examBed.parent.add(arrows);
  const stoolBase=stool.position.clone(),stoolHeight=stool.scale.y,cartBase=cart.position.clone(),cartHeight=cart.scale.y;
  const previousShoes=p.getState().footwear;
  const support=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.54,36),new THREE.MeshStandardMaterial({color:0xa9c6c5,roughness:.95}));
  support.scale.x=.79;support.rotation.z=Math.PI/2;
  support.position.set(0,.776,.52);room.objects.examBed.add(support);
  // Clear the side used for the transfer; bring the examiner's stool to the foot end.
  stool.position.set(-1.943,0,1.406);
  stool.scale.y=stoolHeight*(.45+.126)/.45;
  p.setFootwear(barefoot?'barefoot':'shoes'); d.setDocumentation('desk');d.root.visible=true;
  const reference=name=>pr.rest.get(name).point.clone();
  const medial=reference('foot.L').sub(reference('foot.R')).normalize();
  const acrossFoot=reference('toe1-1.R').sub(reference('toe5-1.R')).normalize();
  const heelOrigin=reference('foot.R').add(V(0,-.048,-.038));
  const longitudinal=reference('toe1-1.R').lerp(reference('toe5-1.R'),.5).sub(heelOrigin).normalize();
  const plantar=V().crossVectors(acrossFoot,longitudinal).normalize();
  if(plantar.y>0)plantar.negate();
  // Rotate the plantar normal toward the opposite foot, independently of camera view or handedness.
  let surface=null;
  let tiltGripPrepared=false, localBorder=null;
  const savedFingers=new Map();
  function fitOnce(side,pose,fit){
    if(!savedFingers.has(pose)){
      fit();
      const bones=[];
      for(let digit=1;digit<=5;digit++)for(let j=1;j<=3;j++){
        const b=d.bones.get('finger'+digit+'-'+j+'.'+side);bones.push([b,b.quaternion.clone()]);
      }
      savedFingers.set(pose,bones);
    }else{
      for(const [b,q] of savedFingers.get(pose))b.quaternion.copy(q);
      d.bones.get('wrist.'+side).updateMatrixWorld(true);
    }
  }
  function sample(t,grips={}){
    if(t>=10.9&&!tiltGripPrepared){
      tiltGripPrepared=true;
      sample(10.97);
    }
    const prepTime=t<0?t+preparationDuration:null;t=Math.max(0,t);
    if(prepTime===null){cart.position.set(-.7,0,2.42);cart.scale.y=cartHeight;sanitizer.set(0,0);}
    protection.set({mask:1,right:1,left:1});
    const sit=seatedStart?1:ramp(t,.45,1.95), swing=ramp(t,2,4.15), recline=ramp(t,2.2,4.65);
    const reach=ramp(t,4.35,6.2);
    p.setExamCuff(recline);
    const drawer=peak(t,6.6,8.05,8.95,10.2);
    const tilt=peak(t,11.25,12.8,13.65,15.0);
    pr.reset();dr.reset();
    const pelvis=V(mix(-1.21,-1.48,sit)-.27*swing,mix(.906,.806,sit)+.015*recline,.18+.03*swing);
    p.root.quaternion.copy(turn(Y,(1-swing)*Math.PI/2)).multiply(turn(X,-Math.PI*.5*recline));
    p.root.position.copy(pelvis).sub(pivot.clone().applyQuaternion(p.root.quaternion));
    p.root.updateMatrixWorld(true);
    const bend=sit*(1-recline);
    for(const [s,sign] of [['R',-1],['L',1]]){
      const suffix='.'+s;
      const raised=peak(t,1.75,2.45,3.3,4.6);
      pr.offset('upperleg01'+suffix,X,-1.40*bend-.70*raised-.14*recline);
      pr.offset('lowerleg01'+suffix,X,.03*bend-.56*raised+.14*recline);
      pr.offset('foot'+suffix,X,-.12*raised+.10*recline);
      const plant=seatedStart?0:1-ramp(t,1.4,2.15);
      if(plant>0){
        const initialAnkle=pr.rest.get('foot'+suffix).point.clone().sub(pivot).applyQuaternion(turn(Y,Math.PI/2)).add(V(-1.21,.906,.18));
        const target=local(p,world(p,'foot'+suffix)).lerp(local(p,initialAnkle),plant);
        pr.reach('upperleg01'+suffix,'lowerleg01'+suffix,'foot'+suffix,target,V(sign*.15,.55,.75));
        pr.offset('foot'+suffix,X,0);
      }
      const hand=V(sign*(.23+.04*bend),.81+.07*bend,.115-.17*bend);
      pr.reach('upperarm01'+suffix,'lowerarm01'+suffix,'wrist'+suffix,hand,V(sign*.42,1.08,-.12));
    }
    // Capture the stationary lower leg before applying the independent foot movement.
    const neutral=world(p,'foot.R');
    const foot=p.bones.get('foot.R');
    const tibia=neutral.clone().sub(world(p,'lowerleg01.R')).normalize();
    const shankLocal=tibia.clone().applyQuaternion(p.root.quaternion.clone().invert());
    const neutralPitch=Math.atan2(plantar.y*shankLocal.z-plantar.z*shankLocal.y,plantar.y*shankLocal.y+plantar.z*shankLocal.z);
    const change=ramp(t,9.8,10.9);
    const pitch=mix(.31,neutralPitch,change)*recline;
    const sagittal=turn(X,pitch);
    const frontAlignment=new THREE.Quaternion().setFromUnitVectors(plantar.clone().applyQuaternion(sagittal),shankLocal);
    const aligned=new THREE.Quaternion().slerp(frontAlignment,change).multiply(sagittal);
    const inversion=turn(V().crossVectors(plantar.clone().applyQuaternion(aligned),medial).normalize(),.23*tilt);
    const adduction=turn(shankLocal.clone().negate(),.12*tilt);
    const footTurn=adduction.clone().multiply(inversion).multiply(aligned);
    pr.orient('foot.R',footTurn.clone().multiply(pr.rest.get('foot.R').world));
    const anterior=Z.clone().applyQuaternion(p.root.quaternion);
    anterior.addScaledVector(tibia,-tibia.dot(anterior)).normalize();
    foot.position.copy(foot.parent.worldToLocal(neutral.clone().addScaledVector(anterior,.012*drawer)));
    foot.updateMatrixWorld(true);
    // The two tests use different grips in this course.
    const moving=world(p,'foot.R');
    const fromFoot=p.root.quaternion.clone().multiply(footTurn).multiply(p.root.quaternion.clone().invert());
    if(recline===1&&!surface)surface=shankSurface(p,neutral);
    // On the supine right leg +X faces the opposite ankle (medial), -X is lateral.
    const fixed=neutral.clone().add(surface&&recline===1?surface(mix(-.115,-.055,change),mix(.06,.32,change),mix(.012,.019,change)):V(0,.068,-.115));
    const malleolus=neutral.clone().add(surface&&recline===1?surface(-.005,-Math.PI/2,0):V(-.038,0,-.005));
    const drawerHeel=moving.clone().add(V(-.002,-.068,.054).applyQuaternion(fromFoot));
    if(change===1&&!localBorder){
      const toes=world(p,'toe1-1.R').lerp(world(p,'toe5-1.R'),.5);
      const border=lateralBorder(p,drawerHeel.clone().lerp(toes,.46));
      localBorder=foot.worldToLocal(border.addScaledVector(X,-.004));
    }
    const border=localBorder?foot.localToWorld(localBorder.clone()):drawerHeel.clone().add(V(-.043,.025,.014));
    const heel=drawerHeel.clone().lerp(border,change);
    // Examiner seated at the end of the couch, both feet planted and trunk inclined toward the ankle.
    d.root.position.set(-1.943,-.26,1.406-.030*change);d.root.quaternion.copy(turn(Y,-3.30));
    d.root.updateMatrixWorld(true);
    for(const [s,sign] of [['R',-1],['L',1]]){
      dr.reach('upperleg01.'+s,'lowerleg01.'+s,'foot.'+s,V(sign*.24,.279,.29),V(sign*.24,.51,.76));
      dr.offset('foot.'+s,X,0);
    }
    dr.offset('spine03',X,.10+.11*reach+.08*change);
    dr.offset('head',X,.16+.12*reach);
    const drawerFixed=neutral.clone().add(surface&&recline===1?surface(-.115,.06,.012):V(0,.068,-.115));
    const drawerAlong=V(-.92,.09,-.38).applyQuaternion(fromFoot),drawerIn=V(-.17,.99,.08).applyQuaternion(fromFoot);
    const borderIn=V(.98,.13,-.11).applyQuaternion(fromFoot).normalize();
    const borderAlong=V(.1,-.73,-.64).applyQuaternion(fromFoot).projectOnPlane(borderIn).normalize();
    if(change>0){
      const rotation=contactRotation('L',hands.L,borderAlong,borderIn);
      const thumb=hands.L.thumb.clone().add(hands.L.palm).sub(hands.L.web).applyQuaternion(rotation).projectOnPlane(borderIn).normalize();
      const toward=malleolus.clone().sub(border).projectOnPlane(borderIn).normalize();
      borderAlong.applyAxisAngle(borderIn,.72*Math.atan2(borderIn.dot(V().crossVectors(thumb,toward)),thumb.dot(toward)));
    }
    const fixedWeight=grips.fixedWeight??1,heelWeight=grips.heelWeight??1;
    for(const side of ['L','R']){
      const leftHand=side==='L',rest=hands[side];
      const drawerPoint=leftHand?drawerFixed:drawerHeel,tiltPoint=leftHand?border:fixed;
      const selected=mix(leftHand?fixedWeight:heelWeight,leftHand?heelWeight:fixedWeight,change);
      const contact=drawerPoint.clone().lerp(tiltPoint,change);
      const drawerApproach=leftHand?V(-.015,.065,.042):V(-.035,-.052,.055);
      const tiltApproach=leftHand?V(-.095,-.075,.06):V(.08,.10,.045);
      contact.addScaledVector(drawerApproach.lerp(tiltApproach,change),1-selected);
      contact.addScaledVector(leftHand?V(-.075,.085,0):V(.075,.11,.04),4*change*(1-change));
      const drawerRot=contactRotation(side,rest,leftHand?V(-.76,-.08,-.64):drawerAlong,leftHand?V(-.06,-1,-.15):drawerIn);
      const tiltRot=contactRotation(side,rest,leftHand?borderAlong:V(-.85,.32,-.38),leftHand?borderIn:V(-.34,-.94,0));
      const elbow=contact.clone().add((leftHand?V(-.08,.32,.24):V(-.12,-.10,.30)).lerp(leftHand?V(-.22,-.04,.25):V(.21,.25,.15),change));
      const anchor=rest.palm.clone().lerp(leftHand?rest.web:rest.palm,change);
      placeHand(d,side,rest,contact,null,null,reach,elbow,anchor,drawerRot.slerp(tiltRot,change));
      wrapFingers(d,side,reach*mix(selected*(leftHand?.65:.90),.36+.40*selected,change));
    }
    if(reach===1&&fixedWeight===1&&(change===0||change===1)){
      const side=change===1?'R':'L';
      fitOnce(side,change===1?'tilt-shin':'drawer-shin',()=>fitShinGrip(d,neutral,surface,side));
    }
    if(reach===1&&heelWeight===1&&change===0)fitOnce('R','drawer-heel',()=>fitHeelGrip(d,p,drawerHeel,'R'));
    const pressure=peak(t,12.8,13.12,13.37,13.65);
    if(change===1&&heelWeight===1){
      fitOnce('L','tilt-border',()=>fitHeelGrip(d,p,border,'L'));
      const pad=malleolus.clone().add(V(-mix(.013,.003,pressure),0,0));
      aimThumbPad(d,pad,'L');
    }
    arrows.visible=(drawer>.06||pressure>.04)&&grips.showForces!==false&&(grips.heelWeight??1)===1&&(grips.fixedWeight??1)===1;
    counterforce.visible=drawer>.06;
    if(arrows.visible){
      counterforce.position.copy(fixed).add(V(-.050,.020,.005));counterforce.quaternion.setFromUnitVectors(Y,anterior.clone().negate());
      if(pressure>.04){
        translation.position.copy(malleolus);translation.quaternion.setFromUnitVectors(Y,X);
        translation.scale.setScalar(.65);
      }else{
        translation.position.copy(heel).add(V(-.050,-.004,.026));translation.quaternion.setFromUnitVectors(Y,anterior);
        translation.scale.setScalar(1);
      }
    }
    if(grips.conversation==='retry'){
      // Unload both hands at the ankle while retaining the examiner’s seated base.
      dr.offset('head',Y,-.14);
    }else if(grips.conversation==='initial'){
      const head=world(p,'head'),standing=V(-.24,0,.18);
      dr.reset();
      d.root.position.set(standing.x,0,standing.z);
      d.root.rotation.set(0,Math.atan2(head.x-standing.x,head.z-standing.z),0);
      d.root.updateMatrixWorld(true);
      for(const [side,sign] of [['R',-1],['L',1]]){
        dr.reach('upperarm01.'+side,'lowerarm01.'+side,'wrist.'+side,V(sign*.24,.83,.095),V(sign*.39,1.09,-.10));
      }
      protection.set({mask:0,right:0,left:0,visible:false});
    }else if(prepTime!==null)prepare(prepTime);
    const left=world(p,'foot.L');
    const sole=plantar.clone().applyQuaternion(footTurn).applyQuaternion(p.root.quaternion);
    const axisWorld=V().crossVectors(plantar.clone().applyQuaternion(aligned),medial).normalize().applyQuaternion(adduction).applyQuaternion(p.root.quaternion);
    const tiltDirection=V().crossVectors(axisWorld,sole).normalize();
    return {neutral,fixed,heel,malleolus,moving,sole,left,anterior,tiltDirection,bigToe:world(p,'toe1-2.R'),littleToe:world(p,'toe5-3.R'),shin:world(p,'lowerleg01.R')};
  }
  function prepare(t){
    dr.reset();d.root.position.set(-1.8,0,1.25);d.root.quaternion.identity();d.root.updateMatrixWorld(true);
    cart.position.set(-1.92,0,1.59);cart.scale.y=cartHeight*1.16;cart.updateMatrixWorld(true);
    const press=peak(t,1.68,1.94,2.02,2.24);
    sanitizer.set(press,peak(t,1.69,1.81,1.93,2.03));
    protection.set({mask:ramp(t,.08,.67),right:ramp(t,4.33,4.97),left:ramp(t,5.24,5.88)});
    dr.offset('head',X,.045+.09*ramp(t,.85,1.5));
    dr.offset('spine03',X,.13*peak(t,1.05,1.56,2.20,2.68));
    for(const [side,sign]of [['R',-1],['L',1]]){
      const right=side==='R',rest=hands[side];
      const rise=ramp(t,.08,.67),fit=ramp(t,.67,.93);
      let contact=V(sign*.092,1.30,.36).lerp(V(sign*.098,1.61,.09),rise).lerp(V(sign*.035,1.62,.19),fit);
      let along=V(0,.35,-.94),normal=V(-sign,0,0),anchor=rest.palm.clone(),curl=.35;
      function blend(to,axis,inward,bend,f,point=rest.palm){
        contact.lerp(to,f);along.lerp(axis,f);normal.lerp(inward,f);anchor.lerp(point,f);curl=mix(curl,bend,f);
      }
      const atPump=local(d,right?sanitizer.pressPoint():sanitizer.receivePoint());
      blend(atPump,right?V(.1,0,1):V(-.8,.08,.56),right?V(0,-1,0):V(0,1,0),right?0:.22,ramp(t,.95,1.65),right?rest.fingerPad:rest.palm);
      const phase=Math.max(0,t-prep.doseEnd),slide=Math.sin(phase*15)*sign;
      const backRub=peak(t,2.95,3.2,3.65,3.93);
      const rub=V(sign*.010,1.15+slide*.010*(1-backRub),.32+slide*.026);
      const handNormal=V(-sign,0,0).lerp(V(0,-1,0),backRub);
      rub.x*=1-backRub;rub.y+=sign*.010*backRub;
      blend(rub,V(.08,.53,.84),handNormal,.18,ramp(t,2.17,2.63));
      for(const [start,end,receiving] of [[prep.rubEnd,prep.rightGloveEnd,right],[prep.rightGloveEnd,preparationDuration,!right]]){
        const pull=ramp(t,start+.16,end-.12);
        const glove=receiving?V(sign*.073,1.16,.32):V(-sign*.073,1.17,.42-.14*pull);
        blend(glove,receiving?V(0,.12,1):V(-sign*.62,-.52,.60),receiving?V(0,-1,.15):V(sign,0,0),receiving?.14:.62,ramp(t,start-.10,start+.14));
      }
      placeHand(d,side,rest,d.root.localToWorld(contact),along.normalize(),normal.normalize(),1,null,anchor);wrapFingers(d,side,curl);
    }
  }
  function cameraAt(camera,t,pose,view='auto',conversation){
    let look,eye;
    if(conversation){
      const patientHead=world(p,'head'),therapistHead=world(d,'head');
      look=patientHead.lerp(therapistHead,.5).add(V(0,-.14,0));
      eye=look.clone().add(conversation==='retry'?V(2.65,.75,.72):V(.04,.06,1.88));
    }else if(t<0){
      const elapsed=t+preparationDuration;
      if(elapsed<prep.maskEnd){look=V(-1.8,1.49,1.43);eye=look.clone().add(V(.27,.09,.83));}
      else {const lift=ramp(elapsed,2.17,2.63);look=V(-1.89+.09*lift,1.08+.08*lift,1.55);eye=look.clone().add(V(.21,.14,.63));}
    }
    else if(t<6.2){
      const settle=ramp(t,2.7,5);
      look=V(-1.58,1.0-.17*settle,.30);
      eye=V(2.05,1.35,1.35).add(look);
    }else{
      const angle=view==='auto'?'both':view;
      look=pose.neutral.clone().add(V(0,.030,angle==='side'?-.084:-.023));
      if(angle==='both')look=pose.neutral.clone().lerp(pose.left,.32).add(V(0,.045,-.07));
      const offsets={both:V(-.39,.72,-.33),side:V(-.55,.104,-.122),tilt:V(-.52,.34,.07),end:V(-.54,.17,.46),above:V(-.20,.82,-.22),wide:V(-1.68,.83,.92)};
      if(angle==='wide')look.add(V(0,.045,-.43));
      eye=look.clone().add(offsets[angle]);
    }
    camera.position.copy(eye);camera.up.set(0,1,0);camera.lookAt(look);
  }
  function release(){
    for(const remove of removeLayers)remove();
    protection.dispose();
    sanitizer.dispose();
    arrows.removeFromParent();shaft.dispose();tip.dispose();red.dispose();
    support.removeFromParent();support.geometry.dispose();support.material.dispose();
    for(const actor of [p,d]){actor.root.quaternion.identity();actor.root.position.set(0,0,0);actor.bedsideRig.reset();}
    p.setExamCuff(0);p.setFootwear(previousShoes);stool.position.copy(stoolBase);stool.scale.y=stoolHeight;cart.position.copy(cartBase);cart.scale.y=cartHeight;
  }
  return {sample,cameraAt,release};
}
