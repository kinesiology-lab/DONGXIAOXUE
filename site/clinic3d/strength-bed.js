import {examSightline} from './exam-sightline.js?v=72';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {handRest,placeHand,wrapFingers} from './bedside-motion.js';
import {createExamProtection} from './exam-protection.js?v=72';

const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const X=v(1,0,0),Y=v(0,1,0),Z=v(0,0,1);
const turn=(axis,angle)=>new THREE.Quaternion().setFromAxisAngle(axis,angle);
const smooth=THREE.MathUtils.smoothstep;
const at=(actor,bone)=>actor.bones.get(bone).getWorldPosition(v());
const focus={dorsiflexion:['tibAnt'],plantarflexion:['gastrocnemius','soleus'],inversion:['tibPost'],eversion:['fibLong','fibBrevis']};
let atlasPromise;
function atlas(){
 return atlasPromise||=new GLTFLoader().loadAsync(new URL('./assets/mmt-muscles.glb',import.meta.url).href).catch(e=>{atlasPromise=null;throw e;});
}

// Register the atlas at the anatomical ankle and knee, then bind distal tendons
// to the foot. The source coordinates (metres) use the atlas right lower limb.
function projectAtlas(template,patient,scene){
 const result=[],rest=patient.bedsideRig.rest,identity=new THREE.Matrix4();
 for(const side of ['L','R']){
  const leg=patient.bones.get('lowerleg01.'+side),foot=patient.bones.get('foot.'+side);
  const points=[leg,foot].map(b=>rest.get(b.userData.name||b.name));
  const scale=points[0].point.distanceTo(points[1].point)/.374;
  const skeleton=new THREE.Skeleton([leg,foot],points.map((r,i)=>{
   const b=[leg,foot][i];return new THREE.Matrix4().compose(r.point,r.world,b.getWorldScale(v())).invert();
  }));
  template.scene.traverse(part=>{
   if(!part.isMesh)return;
   const g=part.geometry.clone(),pos=g.attributes.position,weights=[],ids=[],mirror=side==='L'?-1:1;
   const neutral=points[1].point;
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),t=THREE.MathUtils.clamp(y/.374,0,1);
    const axis=neutral.clone().lerp(points[0].point,t);
    pos.setXYZ(i,axis.x+mirror*scale*(x+.072),axis.y+scale*(y-.374*t),axis.z+scale*(z-.074));
    const distal=1-smooth(y,-.015,.027);weights.push(1-distal,distal,0,0);ids.push(0,1,0,0);
   }
   if(mirror<0&&g.index){const a=g.index.array;for(let j=0;j<a.length;j+=3)[a[j+1],a[j+2]]=[a[j+2],a[j+1]];}
   g.computeVertexNormals();g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
   const key=part.name.split('_')[0],mat=new THREE.MeshBasicMaterial({color:['soleus','fibBrevis'].includes(key)?0xffba54:0xcf5145,transparent:true,opacity:.86,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
   mat.stencilWrite=true;mat.stencilWriteMask=0;mat.stencilFunc=THREE.EqualStencilFunc;mat.stencilRef=1;
   const mesh=new THREE.SkinnedMesh(g,mat);mesh.name='病例肌肉投影_'+side+'_'+key;mesh.frustumCulled=false;mesh.renderOrder=3;mesh.bindMode='detached';mesh.bind(skeleton,identity);mesh.visible=false;scene.add(mesh);result.push({mesh,key,side});
  });
 }
 return result;
}

// Intersect rays with the posed lower-limb skin so that the palm rests outside the mesh.
function skinContacts(patient){
 const skin=patient.model.getObjectByName('Patient_Skin'),geometry=skin.geometry;
 const pos=geometry.attributes.position,index=geometry.index;
 const faces={L:[],R:[]},vertex=v(),ray=new THREE.Ray(),hit=v(),world=[];
 for(let i=0;i<(index?.count||pos.count);i+=3){
  const tri=[0,1,2].map(k=>index?index.getX(i+k):i+k);
  if(tri.some(k=>pos.getY(k)>.38))continue;
  faces[pos.getX(tri[0])<0?'R':'L'].push(tri);
 }
 return (side,point,normal)=>{
  const origin=point.clone().addScaledVector(normal,.17);
  ray.set(origin,normal.clone().negate());world.length=0;
  const localPoint=k=>world[k]|| (world[k]=skin.localToWorld(skin.getVertexPosition(k,vertex)).clone());
  let nearest=.29,distance=null;
  for(const [a,b,c] of faces[side]){
    if(ray.intersectTriangle(localPoint(a),localPoint(b),localPoint(c),false,hit)){
      const d=hit.distanceTo(origin);if(d<nearest){nearest=d;distance=.17-d;}
    }
  }
  return distance===null?0:distance+.014;
 };
}
export function createStrengthBed(actors,room,scene){
 const p=actors.patient,d=actors.therapist,pr=p.bedsideRig,dr=d.bedsideRig;
 const stencils=new Map();
 scene.traverse(obj=>{
  if(!obj.isMesh)return;
  for(const m of [obj.material].flat()){
   if(!m||m.transparent||stencils.has(m))continue;
   stencils.set(m,[m.stencilWrite,m.stencilRef,m.stencilZPass]);
   m.stencilWrite=true;m.stencilRef=obj===p.model.getObjectByName('Patient_Skin')?1:0;m.stencilZPass=THREE.ReplaceStencilOp;
  }
 });
 const hands={L:handRest(d,'L'),R:handRest(d,'R')},protection=createExamProtection(d,0x3186a4);
 protection.set({mask:1,left:1,right:1});
 const sightline=examSightline(d);
 const cart=room.objects.trolley,cartHome=cart.position.clone();cart.position.set(-.7,0,2.45);
 const stool=room.objects.examStool,previous=stool.position.clone(),scale=stool.scale.y;
 const arrow=new THREE.ArrowHelper(Y,v(),.12,0xc35e19,.032,.019);arrow.visible=false;scene.add(arrow);
 let meshes=[],closed=false,t=0,motion='dorsiflexion',side='L',stage='prepare',knee=false,visible=true,prone=0,bend=0,angle=0,blend=0,clock=0;
 let fixed=v(),contact=v(),direction=v(),expose=0;
 const surface=skinContacts(p);let sampleIndex=0,shinGap=0,foreGap=0;
 document.body.dataset.strengthAtlas='loading';
 atlas().then(model=>{if(!closed){meshes=projectAtlas(model,p,scene);document.body.dataset.strengthAtlas='ready';}}).catch(()=>{if(!closed)document.body.dataset.strengthAtlas='unavailable';});
 const poseAt=(actor,pelvis,rotation)=>{
  const rig=actor.bedsideRig;actor.root.quaternion.copy(rotation);
  actor.root.position.copy(pelvis).sub(rig.rest.get('root').point.clone().applyQuaternion(rotation));actor.root.updateMatrixWorld(true);
 };
 let finished=null;
 const palms={L:v(),R:v()};
 function update(dt){
  t+=dt;clock+=dt;
  const entry=smooth(t,0,1.25),roll=smooth(t,1.2,1.85)*(1-smooth(t,2.05,2.45));
  const rate=Math.min(1,dt*7);
  prone=THREE.MathUtils.damp(prone,motion==='plantarflexion'?1:0,8,dt);
  bend=THREE.MathUtils.damp(bend,knee&&motion==='plantarflexion'?1:0,9,dt);
  blend=THREE.MathUtils.lerp(blend,['active','resist'].includes(stage)?1:0,rate);
  const yielding=motion==='eversion'&&side==='R'&&stage==='resist'&&clock>.4;
  angle=THREE.MathUtils.damp(angle,blend*(yielding?.075:.27),9,dt);
  pr.reset();dr.reset();
  const seatedPelvis=v(-1.45,.91,.83).lerp(v(-1.75,.815,.18),entry);
  const rotation=turn(X,-Math.PI*.5*prone).multiply(turn(Y,Math.PI*prone));
  poseAt(p,seatedPelvis.lerp(v(-1.75,.811,.21),prone),rotation);
  const sitting=entry*(1-prone);
  pr.offset('spine03',X,.18*roll);
  pr.offset('head',Y,.96*prone);
  for(const k of ['L','R']){
   const sign=k==='L'?1:-1,s='.'+k;
   pr.offset('upperleg01'+s,X,-1.5*sitting);
   pr.offset('lowerleg01'+s,X,(-1.43*sitting+(k===side?1.25*bend:0)));
   const a=k===side?angle:0;
   const sagittal=motion==='dorsiflexion'?-a:motion==='plantarflexion'?a*.96:['inversion','eversion'].includes(motion)?a*.30:0;
   const frontal=(motion==='inversion'?1:motion==='eversion'?-1:motion==='dorsiflexion'?.20:0)*(-sign)*a;
   const lower=pr.rest.get('lowerleg01'+s);
   const relative=p.root.quaternion.clone().invert().multiply(p.bones.get('lowerleg01'+s).getWorldQuaternion(new THREE.Quaternion())).multiply(lower.world.clone().invert());
   pr.orient('foot'+s,relative.multiply(turn(X,sagittal)).multiply(turn(Z,frontal)).multiply(pr.rest.get('foot'+s).world));
   const hand=v(sign*.24,.8,.08).lerp(v(sign*.20,.85,.40),sitting);
   if(roll)hand.lerp(v(sign*.15,.81,.60),roll);
   if(prone)hand.lerp(v(sign*.25,1.34,.08),prone);
   pr.reach('upperarm01'+s,'lowerarm01'+s,'wrist'+s,hand,v(sign*.44,1,.16));
  }
  expose=smooth(t,1.38,2.1);p.setExamCuff(expose,'both');
  const k=side,s='.'+k,ankle=at(p,'foot'+s),shin=at(p,'lowerleg01'+s);
  const big=at(p,'toe1-1'+s),little=at(p,'toe5-1'+s),toes=big.clone().lerp(little,.5);
  const med=big.clone().sub(little).normalize(),long=toes.clone().sub(ankle).normalize();
  const dorsal=Y.clone().applyQuaternion(pr.rest.get('foot'+s).world.clone().invert()).applyQuaternion(p.bones.get('foot'+s).getWorldQuaternion(new THREE.Quaternion())).normalize();
  const shankUp=shin.clone().sub(ankle).normalize();
  // At the front of the couch, the proximal hand stays just above the malleoli.
  const anterior=Z.clone().applyQuaternion(pr.rest.get('lowerleg01'+s).world.clone().invert()).applyQuaternion(p.bones.get('lowerleg01'+s).getWorldQuaternion(new THREE.Quaternion()));
  // Seat the stabilizing palm on the exposed side of the distal shank.
  const outside=(side==='R'?-1:1)*(1-2*prone);
  const exposedDirection=v(outside*.70,.60,.24).projectOnPlane(shankUp).normalize();
  if(exposedDirection.lengthSq()<.1)exposedDirection.copy(anterior);
  fixed.copy(ankle).addScaledVector(shankUp,.10).addScaledVector(exposedDirection,.04);
  const fore=ankle.clone().lerp(toes,.81);
  switch(motion){
   case 'dorsiflexion':contact.copy(fore).addScaledVector(dorsal,.016).addScaledVector(med,.022);direction.copy(dorsal).negate().addScaledVector(med,-.50);break;
   case 'plantarflexion':contact.copy(fore).addScaledVector(dorsal,-.028);direction.copy(dorsal);break;
   case 'inversion':contact.copy(big).lerp(ankle,.23).addScaledVector(med,.014).addScaledVector(dorsal,.014);direction.copy(med).negate().addScaledVector(dorsal,.20);break;
   default:contact.copy(little).lerp(ankle,.19).addScaledVector(med,-.012).addScaledVector(dorsal,.010);direction.copy(med).addScaledVector(dorsal,.15);
  }
  direction.normalize();
  const foreNormal=direction.clone().negate();
  if(sampleIndex++%6===0){
   shinGap=surface(k,fixed,exposedDirection);foreGap=surface(k,contact,foreNormal);
  }
  fixed.addScaledVector(exposedDirection,shinGap);contact.addScaledVector(foreNormal,foreGap+.005);
  const height=THREE.MathUtils.clamp((contact.y+fixed.y)/2-.19,.39,.91);
  // Adjust examiner position to both contact landmarks and the flexed-knee height.
  const mid=contact.clone().lerp(fixed,.5);
  const examiner=v(mid.x+.035,height,mid.z+.38).lerp(v(-1.30,.86,1.55),1-entry);
  const yaw=turn(Y,Math.PI+.10);
  poseAt(d,examiner,yaw);d.root.visible=true;d.setDocumentation('desk');
  stool.position.set(examiner.x,0,examiner.z);stool.scale.y=scale*Math.max(.60,(height-.10)/.45);
  for(const [h,hs] of [['L',1],['R',-1]]){
   const f='.'+h;const footY=dr.rest.get('root').point.y-height+.072;
   dr.reach('upperleg01'+f,'lowerleg01'+f,'foot'+f,v(hs*.17,footY,.21),v(hs*.22,.56,.65));
  }
  dr.offset('spine03',X,.35);dr.offset('head',X,.25);
  const fixedHand=motion==='eversion'?k:(k==='R'?'L':'R');
  const resistHand=fixedHand==='L'?'R':'L';
  for(const [h,pt,inward,fingers] of [
    [fixedHand,fixed,exposedDirection.clone().negate(),shankUp.clone()],
    [resistHand,contact,direction,long.clone().negate()]
  ]){
   let along=fingers.projectOnPlane(inward).normalize();
   if(along.lengthSq()<.1)along=shankUp.clone().projectOnPlane(inward).normalize();
   const pole=pt.clone().add(v(h==='L'?-.22:.22,.02,.28));
   if(h===fixedHand){
    // Approach from the examiner's forearm. Let the fingers wrap along the shank
    // without folding the wrist back towards the elbow on the bent-knee view.
    const approach=pt.clone().sub(pole).projectOnPlane(inward);
    if(approach.lengthSq()>.001){
      approach.normalize();
      if(along.dot(approach)<0)along.negate();
      along.add(approach).normalize();
    }
   }
   placeHand(d,h,hands[h],pt,along,inward,blend,pole);wrapFingers(d,h,blend*(h===fixedHand?.44:.17));
   palms[h].copy(hands[h].palm).applyQuaternion(hands[h].wrist.clone().invert()).applyQuaternion(d.bones.get('wrist.'+h).getWorldQuaternion(new THREE.Quaternion())).add(at(d,'wrist.'+h));
  }
  arrow.visible=stage==='resist';arrow.position.copy(contact).addScaledVector(direction,-.13);arrow.setDirection(direction);
  for(const part of meshes)part.mesh.visible=visible&&expose>.5&&part.side===side&&focus[motion].includes(part.key);
  if(finished&&clock>=1.35&&t>2.5&&blend>.97&&((motion==='plantarflexion')=== (prone>.98))){
   finished(true);finished=null;
  }
  return {fixedHand,resistHand,contact:contact.clone(),fixed:fixed.clone(),fixedGap:fixed.distanceTo(palms[fixedHand]),contactGap:contact.distanceTo(palms[resistHand]),posture:prone>.98?'prone':prone<.02?'sitting':'turning',knee:bend,projection:meshes.filter(x=>x.mesh.visible).map(x=>x.key)};
 }
 function aim(view){
  protection.set({mask:1,right:1,left:1,visible:view!=='first'});
  const ankle=at(p,'foot.'+side), kneePoint=at(p,'lowerleg01.'+side);
  const centre=fixed.clone().lerp(contact,.56);
  const outside=(side==='R'?-1:1)*(1-2*prone);
  let off;
  if(view==='first'){
   // Eye line ahead of the examiner's torso, looking over the wrists.
   off=v(outside*.075,.56,-.07);
  }else if(view==='feet'){
   off=v((motion==='inversion'?-1:1)*outside*.49,.40,-.27);
  }else{
   // Include the ankle-to-knee segment, especially when the knee is flexed.
   centre.lerp(ankle.clone().lerp(kneePoint,.48),.39);
   const sign=motion==='inversion'?-1:1;
   off=v(sign*outside*.72,.50,-.50);
  }
  return {target:centre,eye:centre.clone().add(off)};
 }
 return {update,aim,showHands(camera){sightline.update(camera,at(p,'lowerleg01.'+side),contact);},project(value){visible=value;},set(k,mode,action,flex,project){if(finished){finished(false);finished=null;}sampleIndex=0;side=k||'L';motion=action||'dorsiflexion';stage=mode||'rest';knee=!!flex;visible=project!==false;clock=0;return stage==='resist'?new Promise(resolve=>{finished=resolve;}):Promise.resolve(false);},
  close(){sightline.close();if(finished)finished(false);closed=true;for(const [m,data] of stencils){[m.stencilWrite,m.stencilRef,m.stencilZPass]=data;}arrow.removeFromParent();arrow.dispose();for(const {mesh} of meshes){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}for(const skeleton of new Set(meshes.map(x=>x.mesh.skeleton)))skeleton.dispose();protection.dispose();p.setExamCuff(0);for(const a of [p,d]){a.root.quaternion.identity();a.root.position.set(0,0,0);a.bedsideRig.reset();}cart.position.copy(cartHome);stool.position.copy(previous);stool.scale.y=scale;delete document.body.dataset.strengthAtlas;}
 };
}
