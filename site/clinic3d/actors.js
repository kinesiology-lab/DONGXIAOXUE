import {makeTrainer,trainerRocker} from './trainers.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sampleGait } from './gait-lesson.js';
import { walkingVisualSample, WALKING_DEMO, WALKING_PROFILE } from './walking-principles-v26.js';
import { applyWalkingPose } from './walking-pose-v27.js?v=72';
import { applyActorAppearance } from './appearance.js?v=69';
import {dressFromDrawings} from './illustrated-clothing.js';
import {smoothSurface,clipped} from './reference-wardrobe.js';

// Authored visual transfers and gestures. These poses are not a gait dataset,
// patient registration, diagnostic result, or a clinically reviewed procedure.
const FOOTWEAR_REMOVAL_SECONDS = 8;
const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const clamp = THREE.MathUtils.clamp;
const smooth = t => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const position = (x, y, z) => new THREE.Vector3(x, y, z);

function authoredShoes(root, bones, role) {
  const groups = [];
  for (const side of ['L','R']) {
    const bone = bones.get(`foot.${side}`);
    const ankle = root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
    const group=makeTrainer(role==='patient');group.name='Authored_unbranded_shoe.'+side;
    group.position.x=ankle.x;
    group.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
    root.add(group);root.updateMatrixWorld(true);bone.attach(group);groups.push(group);
  }
  // Groups remain attached to their individual foot bones; visibility alone
  // switches the footwear. No skin/rig data or paid media is generated.
  return groups;
}

function authoredSocks(root, skin) {
  if (!skin) return [];
  const source = skin.geometry, p = source.getAttribute('position'), normals = source.getAttribute('normal');
  const index = source.getIndex(), socks = [];
  const material = new THREE.MeshStandardMaterial({color:0xd6dfdf,roughness:.98,side:THREE.DoubleSide});
  for (const side of ['L','R']) {
    const kept = [], sign = side === 'L' ? 1 : -1;
    for (let i=0;i<(index?index.count:p.count);i+=3) {
      const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
      const y=ids.reduce((s,j)=>s+p.getY(j),0)/3, x=ids.reduce((s,j)=>s+p.getX(j),0)/3;
      if(y<.205 && x*sign>.018)kept.push(...ids);
    }
    const geometry=source.clone();geometry.setIndex(kept);geometry.clearGroups();geometry.deleteAttribute('color');
    const q=geometry.getAttribute('position');
    for(let i=0;i<q.count;i++) {
      // Keep the sole above the floor. The source surface is CC0; this fitted
      // garment retains its skin weights while it is worn.
      const ny=normals?normals.getY(i):0;
      q.setXYZ(i,p.getX(i)+(normals?normals.getX(i)*.002:0),
        p.getY(i)+Math.max(0,ny)*.002,p.getZ(i)+(normals?normals.getZ(i)*.002:0));
    }
    q.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const worn=new THREE.SkinnedMesh(geometry,material);worn.name=`Authored_worn_sock.${side}`;
    worn.position.copy(skin.position);worn.quaternion.copy(skin.quaternion);worn.scale.copy(skin.scale);
    worn.bind(skin.skeleton,skin.bindMatrix.clone());worn.frustumCulled=false;worn.castShadow=true;worn.receiveShadow=true;
    skin.parent.add(worn);
    const empty=new THREE.BufferGeometry();empty.setAttribute('position',new THREE.Float32BufferAttribute([],3));
    const loose=new THREE.Mesh(empty,material);loose.name=`Authored_removed_sock.${side}`;
    loose.visible=false;loose.castShadow=true;loose.receiveShadow=true;root.add(loose);
    socks.push({side,worn,loose,captured:false});
  }
  return socks;
}

function makeTrousers(skin,role='therapist',exam=false) {
  const source = skin.geometry.clone();smoothSurface(source);
  const p = source.getAttribute('position');
  const sourceIndex = source.getIndex();
  const kept = [];
  for (let i = 0, n = sourceIndex ? sourceIndex.count : p.count; i < n; i += 3) {
    const a = sourceIndex ? sourceIndex.getX(i) : i;
    const b = sourceIndex ? sourceIndex.getX(i + 1) : i + 1;
    const c = sourceIndex ? sourceIndex.getX(i + 2) : i + 2;
    const h = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
    // A small offset shell derived from the CC0 skin, with original weights.
    if (h > 0.085 && h < 0.73) kept.push(a, b, c);
  }
  const g = source.clone();
  g.setIndex(kept);
  g.clearGroups();
  const q = g.getAttribute('position'), normal = g.getAttribute('normal');
  if (normal) {
    for (let i = 0; i < q.count; i++) {
      const y=q.getY(i);
      // Drape straight trouser legs over the narrowing shin and the knee.
      // The original vertices and their joint weights still drive the folds.
      const ankleEase=1-THREE.MathUtils.smoothstep(y,.19,.37);
      const kneeEase=Math.exp(-(((y-.49)/.085)**2));
      const allowance=.015+.028*ankleEase+.017*kneeEase;
      q.setXYZ(i, q.getX(i) + normal.getX(i) * allowance,
        y + normal.getY(i) * .0045, q.getZ(i) + normal.getZ(i) * allowance);
    }
  }
  q.needsUpdate = true;
  g.computeBoundingSphere();
  // Plane-clipped hems avoid the source triangle edge at the exposed ankle.
  const clean=clipped(g,[v=>v.y-(exam==='both'?.41:exam&&v.x<0?.292:.13),v=>.73-v.y]);
  const hem=clean.attributes.position.clone();
  for(let i=0;i<hem.count;i++){
    const y=hem.getY(i);
    hem.setY(i,y-.055*(1-THREE.MathUtils.smoothstep(y,.13,.26)));
  }
  clean.morphAttributes.position=[hem];
  const mesh = new THREE.SkinnedMesh(clean, new THREE.MeshStandardMaterial({
    color: role==='patient'?0x2e3038:0x303542, roughness: .9, side: THREE.DoubleSide
  }));
  mesh.name = 'Authored_clinician_trouser_shell';
  mesh.morphTargetInfluences[0]=1;
  mesh.position.copy(skin.position); mesh.quaternion.copy(skin.quaternion); mesh.scale.copy(skin.scale);
  mesh.bind(skin.skeleton, skin.bindMatrix.clone());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  skin.parent.add(mesh);
  return mesh;
}

export async function createActor(scene, role, url) {
  // Separate loader calls produce independent skins and mixers for both roles.
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group(); root.name = role === 'patient' ? 'Patient' : 'Therapist';
  const model = gltf.scene; root.add(model); scene.add(root);
  const bones = new Map(), skins = [];
  model.traverse(object => {
    if (object.isBone) bones.set(object.userData.name || object.name, object);
    if (object.isSkinnedMesh) skins.push(object);
    if (object.isMesh) {
      object.castShadow = true; object.receiveShadow = true; object.frustumCulled = false;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const materials = originals.map(original => {
        const m = original.clone();
        if (m.name === 'Tshirt_grey') m.color.setHex(role === 'therapist' ? 0x17304c : 0x92959c);
        if (m.name === 'Shorts_charcoal') m.color.setHex(role === 'therapist' ? 0x303542 : 0x2e3038);
        if (m.name === 'Skin_warm_neutral') m.color.setHex(role === 'therapist' ? 0xbb8d71 : 0xb18266);
        if (m.name === 'Hair_dark') m.color.setHex(role === 'therapist' ? 0x302c2b : 0x201b18);
        m.roughness = Math.max(m.roughness || .6, .48);
        return m;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    }
  });
  if (!skins.length || !bones.has('upperleg01.L') || !bones.has('jaw')) {
    root.removeFromParent(); throw new Error(`${role}: expected independent MPFB skin and bone map`);
  }
  skins[0].skeleton.pose();
  root.updateMatrixWorld(true);
  const appearance = await applyActorAppearance({root,model,bones,skins,role});
  const inverseRoot = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const rest = new Map();
  for (const [name, bone] of bones) {
    rest.set(name, {
      position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
      point: root.worldToLocal(bone.getWorldPosition(new THREE.Vector3())),
      world: inverseRoot.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()))
    });
  }
  let trousers=null,examTrousers=null,strengthTrousers=null;
  const relaxedHands=[];
  for(const side of ['L','R']){
    const axis=digit=>rest.get('finger'+digit+'-2.'+side).point.clone()
      .sub(rest.get('finger'+digit+'-1.'+side).point).normalize();
    const middle=axis(3);
    for(const digit of [2,4,5]){
      const key='finger'+digit+'-1.'+side,r=rest.get(key),dir=axis(digit);
      const aim=dir.clone().lerp(middle,.58).normalize();
      const turn=new THREE.Quaternion().setFromUnitVectors(dir,aim);
      const local=r.world.clone().invert().multiply(turn).multiply(r.world);
      relaxedHands.push([bones.get(key),r.quaternion.clone().multiply(local)]);
    }
  }
  if (['therapist','patient'].includes(role)) {
    const body = skins.find(skin => /Patient_Skin/.test(skin.name));
    if (body) trousers=makeTrousers(body,role);
    if(body&&role==='patient'){
      strengthTrousers=makeTrousers(body,role,'both');strengthTrousers.visible=false;
      examTrousers=makeTrousers(body,role,true);
      examTrousers.morphTargetInfluences[0]=0;examTrousers.visible=false;
    }
  }
  const shoes = authoredShoes(root, bones, role);
  const socks = role === 'patient' ? authoredSocks(root,skins.find(skin=>/Patient_Skin/.test(skin.name))) : [];
  const garmentDeposits=role==='patient'?new THREE.Group():null;
  if(garmentDeposits){garmentDeposits.name='Patient_world_stationary_removed_garments';scene.add(garmentDeposits);}
  const shoeHomes=shoes.map((shoe,index)=>({shoe,side:index===0?'L':'R',parent:shoe.parent,position:shoe.position.clone(),quaternion:shoe.quaternion.clone(),scale:shoe.scale.clone(),captured:false}));
  let footwear = 'shoes';
  const removal={active:false,completed:false,elapsed:0,duration:FOOTWEAR_REMOVAL_SECONDS,phase:'idle',side:null,progress:0};
  let documentation=null,documentationMode='desk',documentationCarryWeight=0,documentationWriteWeight=0,documentationTipGap=null;
  const mixer = new THREE.AnimationMixer(model);
  const heelClip = gltf.animations.find(clip => clip.name === 'heel_raise');
  let clinicalPose=null, lungeLoad=0, kneeling=0, railWeight=0;
  let strengthMotion='eversion', eversionSide=null, eversionMode=null, eversionElapsed=0, eversionAngle=0;
  let pose = 'standing', sitting = 0, sitFrom = 0, sitTo = 0, sitElapsed = 0;
  let walking = false, walkWeight = 0, talking = false, halted = false, time = 0;
  let manualGaitPhase = null, walkPhase = 0, distanceDriven = false;
  let gaitSampler = sampleGait;
  let emotion="neutral", emotionWeight=0;
  let heelAction = null, heelElapsed = 0, heelStart = null;
  const face=role==='patient'?root.getObjectByName('Reference_face_patient'):null;
  let scratchTime=null,knockBeat=null;
  let plateX=0,plateY=0;
  const faceWeights=face?.morphTargetInfluences;
  function updateFace(dt){
    if(!faceWeights)return;
    const weights=[emotion==='pain'?1:emotion==='sore'?.44:0,
      emotion==='concerned'?1:emotion==='upset'?.70:0,emotion==='questioning'?1:0];
    for(let i=0;i<weights.length;i++)faceWeights[i+1]=THREE.MathUtils.damp(faceWeights[i+1],weights[i],9,dt);
  }
  const tempQuaternion = new THREE.Quaternion();
  const getPoint = name => root.worldToLocal(bones.get(name).getWorldPosition(new THREE.Vector3()));
  const restore = () => {
    for (const [name, b] of bones) {
      const r = rest.get(name); b.position.copy(r.position); b.quaternion.copy(r.quaternion); b.scale.copy(r.scale);
    }
    root.updateMatrixWorld(true);
  };
  const setWorldQuaternion = (name, actorQuaternion) => {
    const bone = bones.get(name); if (!bone) return;
    const desired = root.getWorldQuaternion(new THREE.Quaternion()).multiply(actorQuaternion);
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(parent.multiply(desired));
    bone.updateMatrixWorld(true);
  };
  const offset = (name, axis, angle) => {
    const r = rest.get(name); if (!r) return;
    setWorldQuaternion(name, tempQuaternion.setFromAxisAngle(axis, angle).clone().multiply(r.world));
  };
  const setRootShift = (amount, lateral = 0, forward = 0) => {
    const bone = bones.get('root');
    const reference = rest.get('root').point.clone().add(position(lateral, amount, forward));
    const world = root.localToWorld(reference); bone.parent.worldToLocal(world); bone.position.copy(world);
    bone.updateMatrixWorld(true);
  };
  function solveTwoLinks(upper, lower, endpoint, target, pole) {
    const start = getPoint(upper), a = rest.get(upper).point, b = rest.get(lower).point, c = rest.get(endpoint).point;
    const l1 = a.distanceTo(b), l2 = b.distanceTo(c), v = target.clone().sub(start);
    const distance = clamp(v.length(), Math.abs(l1 - l2) + .0001, l1 + l2 - .0001);
    const direction = v.normalize();
    const bend = pole.clone().sub(start); bend.addScaledVector(direction, -bend.dot(direction));
    if (bend.lengthSq() < .000001) bend.copy(position(0, 0, 1));
    bend.normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const elbow = start.clone().addScaledVector(direction, along).addScaledVector(bend, height);
    const upperDelta = new THREE.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(), elbow.clone().sub(start).normalize());
    setWorldQuaternion(upper, upperDelta.multiply(rest.get(upper).world));
    const actualJoint = getPoint(lower);
    const lowerDelta = new THREE.Quaternion().setFromUnitVectors(c.clone().sub(b).normalize(), target.clone().sub(actualJoint).normalize());
    setWorldQuaternion(lower, lowerDelta.multiply(rest.get(lower).world));
  }
  // Map the index fingertip to the hair above the right temple. The wrist
  // follows from the actual hand length; the other hand keeps its seated pose.
  function scratchHand(wrist,pole,weight,t){
    const stroke=Math.cos(2*Math.PI*THREE.MathUtils.clamp((t-.67)/.70,0,1));
    const tip=root.worldToLocal(face.localToWorld(position(-.105,1.684+.004*stroke,.078+.003*stroke)));
    const finger=rest.get('finger2-3.R').point.clone().sub(rest.get('wrist.R').point);
    const across=rest.get('finger2-1.R').point.clone().sub(rest.get('finger5-1.R').point);
    function frame(along,side){
      const y=along.clone().normalize(),z=new THREE.Vector3().crossVectors(side,y).normalize();
      return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y,z),y,z));
    }
    // With fingers pointing up, the thumb side points back and the palm faces the hair.
    const aim=frame(position(.46,1,-.26),position(0,0,-1)).multiply(frame(finger,across).invert());
    wrist.lerp(tip.sub(finger.applyQuaternion(aim)),weight);
    pole.lerp(getPoint('upperarm01.R').add(position(-.12,-.28,.17)),weight);
    return aim.multiply(rest.get('wrist.R').world);
  }
  function poseScratchingWrist(rotation,weight,t){
    const localWorld=name=>root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bones.get(name).getWorldQuaternion(new THREE.Quaternion()));
    const wrist='wrist.R',forearm='lowerarm01.R';
    const forearmAxis=getPoint(wrist).sub(getPoint(forearm)).normalize();
    const across=rest.get('finger2-1.R').point.clone().sub(rest.get('finger5-1.R').point).normalize();
    const wristRotation=localWorld(wrist).slerp(rotation,weight);
    const desiredAcross=across.clone().applyQuaternion(rest.get(wrist).world.clone().invert()).applyQuaternion(wristRotation);
    const from=getPoint('finger2-1.R').sub(getPoint('finger5-1.R')).projectOnPlane(forearmAxis).normalize();
    const to=desiredAcross.projectOnPlane(forearmAxis).normalize();
    const roll=Math.atan2(forearmAxis.dot(from.clone().cross(to)),from.dot(to));
    setWorldQuaternion(forearm,new THREE.Quaternion().setFromAxisAngle(forearmAxis,roll).multiply(localWorld(forearm)));
    setWorldQuaternion(wrist,wristRotation);
    // Flex the fingers toward the palm. The index and middle fingertips brush the hair.
    const stroke=.5+.5*Math.cos(2*Math.PI*clamp((t-.67)/.70,0,1));
    for(const [digit,angle] of [[2,.12+.12*stroke],[3,.24+.10*stroke],[4,.52],[5,.65]]){
      for(const joint of [2,3]){
        const name='finger'+digit+'-'+joint+'.R',r=rest.get(name);
        const axis=across.clone().applyQuaternion(r.world.clone().invert());
        bones.get(name).quaternion.copy(r.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle*weight));
      }
    }
  }
  function resetFootwearObjects(value) {
    if(trousers)trousers.morphTargetInfluences[0]=value==='shoes'?1:0;
    for(const home of shoeHomes) {
      home.parent.add(home.shoe);home.shoe.position.copy(home.position);home.shoe.quaternion.copy(home.quaternion);home.shoe.scale.copy(home.scale);
      home.shoe.visible=value==='shoes';home.captured=false;home.base=null;home.floor=null;
    }
    for(const sock of socks) {sock.worn.visible=value!=='barefoot';root.add(sock.loose);sock.loose.visible=false;sock.captured=false;}
  }
  function sockSnapshot(sock) {
    // Freeze the actually posed weighted sock when the hand starts pulling.
    // The following translation is an authored cloth approximation, not a
    // cloth/contact solver. The full sock passes beyond the toe before deposit.
    const source=sock.worn.geometry,indices=source.index,positions=[];
    sock.worn.updateWorldMatrix(true,false);
    for(let i=0;i<indices.count;i++) {
      const id=indices.getX(i),point=sock.worn.getVertexPosition(id,new THREE.Vector3());
      point.applyMatrix4(sock.worn.matrixWorld);root.worldToLocal(point);positions.push(point.x,point.y,point.z);
    }
    sock.loose.geometry.dispose();sock.loose.geometry=new THREE.BufferGeometry();
    sock.loose.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));sock.loose.geometry.computeVertexNormals();
    sock.loose.position.set(0,0,0);sock.loose.rotation.set(0,0,0);sock.loose.scale.set(1,1,1);
    sock.loose.geometry.computeBoundingBox();sock.floorY=.006-sock.loose.geometry.boundingBox.min.y;
    sock.captured=true;sock.worn.visible=false;sock.loose.visible=true;
  }
  function dressingFrame(){
    const progress=clamp(removal.elapsed/removal.duration,0,.99999)*2;
    const side=progress<1?'L':'R',u=progress%1;
    const lift=smooth(u/.30)*(1-smooth((u-.55)/.28));
    return {side,u,lift,lean:lift,stage:u<.30?'lift_foot':u<.55?'insert_toes':u<.83?'seat_heel':'plant_foot'};
  }
  function dressingLeg(frame,side,foot){
    const finished=frame.side==='R'&&side==='L';
    if(finished)return 0;
    if(frame.side!==side)return 0;
    const u=frame.u,lead=smooth((u-.23)/.33);
    // Lift the toes clear of the collar before sliding the forefoot forward.
    // Then lower the heel into the opening while the sole rests on the floor.
    foot.y+=.17*frame.lift;
    const placed=smooth((u-.83)/.17);
    foot.z+=(-.105*smooth(u/.18)*(1-lead)+.102*lead)*(1-placed);
    foot.x+=(side==='L'?1:-1)*.077*lead*(1-placed);
    return .43*smooth((u-.13)/.20)*(1-smooth((u-.52)/.30));
  }
  function dressShoe(frame){
    for(const home of shoeHomes){
      const fitted=home.side==='L'&&frame.side==='R'||home.side===frame.side&&frame.u>=.83;
      if(!fitted||home.shoe.parent===home.parent)continue;
      home.parent.add(home.shoe);home.shoe.position.copy(home.position);
      home.shoe.quaternion.copy(home.quaternion);home.shoe.scale.copy(home.scale);
    }
  }
  function removalFrame() {
    if(removal.dressing)return dressingFrame();
    // Sample every authored shoe and sock movement on the shorter playback clock.
    const t=17.6 * removal.elapsed / removal.duration;
    if(t<1.6) return {side:'L',time:-1.6+t,lift:0,lean:0,stage:'sit'};
    const n=Math.min(1,Math.floor((t-1.6)/8)),local=Math.min(8,t-1.6-n*8),side=n===0?'L':'R';
    const lift=local<.9?smooth(local/.9):local<6.05?1:1-smooth((local-6.05)/1.05);
    const lean=local<.9?smooth(local/.9):local<6.05?1:1-smooth((local-6.05)/1.05);
    const stage=local<.9?'lift':local<1.35?'shoe_reach':local<2.15?'shoe_pull':local<2.9?'shoe_deposit':local<3.45?'sock_reach':local<4.65?'sock_pull':local<5.65?'sock_deposit':local<6.05?'release':local<7.1?'lower':'rest';
    return {side,time:local,lift,lean,stage};
  }
  function removalHand(frame,side,normalTarget,activeFoot) {
    if(removal.dressing){
      if(frame.side!==side)return normalTarget;
      const shin=activeFoot.clone().add(position(side==='L'?.025:-.025,.23,-.02));
      return normalTarget.clone().lerp(shin,.85*frame.lift);
    }
    if(frame.side!==side || frame.time<.35 || frame.time>=7.1)return normalTarget;
    const sign=side==='L'?1:-1,t=frame.time;
    const reach=activeFoot.clone().add(position(sign*.025,.075,.055));
    let target=reach.clone(),amount=smooth((t-.35)/.9);
    if(t>=1.35&&t<2.15)target.add(position(0,.025,.29*smooth((t-1.35)/.8)));
    else if(t>=2.15&&t<2.9)target.add(position(0,.025,.29)).lerp(position(sign*.32,.48,.27),smooth((t-2.15)/.50));
    else if(t>=2.9&&t<3.45)target.lerp(position(sign*.32,.48,.27),1-smooth((t-2.9)/.55));
    else if(t>=3.45&&t<4.65)target.add(position(0,.035,.31*smooth((t-3.45)/1.2)));
    else if(t>=4.65&&t<5.65)target.add(position(0,.035,.31)).lerp(position(sign*.28,.48,.16),smooth((t-4.65)/.8));
    else if(t>=5.65)target=position(sign*.28,.48,.16).lerp(normalTarget,smooth((t-5.65)/1.4));
    return normalTarget.clone().lerp(target,amount);
  }
  function updateRemovalProps(frame) {
    const t=frame.time;if(t<0)return;
    if(trousers)trousers.morphTargetInfluences[0]=frame.side==='L'?1-smooth((t-.35)/.9):0;
    const home=shoeHomes.find(h=>h.side===frame.side),sock=socks.find(s=>s.side===frame.side),sign=frame.side==='L'?1:-1;
    if(t>=1.35&&!home.captured) {root.attach(home.shoe);home.base=home.shoe.position.clone();home.captured=true;}
    if(home.captured) {
      const pulled=home.base.clone().add(position(0,.025,.29));
      home.shoe.position.copy(t<2.15?home.base.clone().lerp(pulled,smooth((t-1.35)/.8)):pulled);
      if(t>=2.15) {
        const destination=home.base.clone();destination.x=sign*.32;destination.z=.27;
        const bound=new THREE.Box3().setFromObject(home.shoe);const localMin=root.worldToLocal(position(0,bound.min.y,0)).y;
        destination.y=home.shoe.position.y-localMin-root.position.y+.005;
        // Recompute against the base, not the previous frame, to avoid drift.
        home.floor=home.floor||destination.clone();
        const carry=home.floor.clone().add(position(0,.38,0));
        home.shoe.position.copy(pulled).lerp(carry,smooth((t-2.15)/.5));
        if(t>=2.65)home.shoe.position.copy(carry).lerp(home.floor,smooth((t-2.65)/.25));
      }
    }
    if(t>=3.45&&!sock.captured)sockSnapshot(sock);
    if(sock.captured) {
      const pulled=position(0,.035,.31);
      sock.loose.position.copy(pulled.clone().multiplyScalar(smooth((t-3.45)/1.2)));
      if(t>=4.65) {
        const foot=rest.get(`foot.${frame.side}`).point;
        const destination=position(sign*.28-foot.x,sock.floorY-root.position.y,.16-(foot.z+.12));
        const carry=destination.clone().add(position(0,.28,0));
        sock.loose.position.copy(pulled).lerp(carry,smooth((t-4.65)/.8));
        if(t>=5.45)sock.loose.position.copy(carry).lerp(destination,smooth((t-5.45)/.2));
      }
    }
  }
  function restoreDocumentation() {
    if(!documentation)return;
    for(const item of documentation.items){item.parent.add(item.object);item.object.position.copy(item.position);item.object.quaternion.copy(item.quaternion);item.object.scale.copy(item.scale);}
    documentationTipGap=null;
  }
  function propInActorFrame(object,actorPoint,actorQuaternion) {
    const point=root.localToWorld(actorPoint.clone());object.parent.worldToLocal(point);object.position.copy(point);
    const quaternion=root.getWorldQuaternion(new THREE.Quaternion()).multiply(actorQuaternion);
    object.quaternion.copy(object.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(quaternion));
    object.updateMatrixWorld(true);
  }
  function updateDocumentationProps() {
    if(!documentation||documentationMode==='desk')return;
    const left=getPoint('wrist.L'),right=getPoint('wrist.R'),w=documentationWriteWeight;
    const noteOffset=position(-.06,-.09,.09).lerp(position(-.09,-.025,.025),w);
    const notePoint=left.clone().add(noteOffset);
    const noteQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));
    noteQuaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(.76,0,0)),w);
    propInActorFrame(documentation.notes,notePoint,noteQuaternion);
    const penPoint=right.clone().add(position(.01,-.08,.035).lerp(position(.01,-.01,.01),w));
    const carryQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(.20,0,-.18));
    const tipTarget=position(.01+Math.sin(time*4.2)*.008,.008,-.015+Math.sin(time*6.3)*.004).applyQuaternion(noteQuaternion).add(notePoint);
    const tipDirection=tipTarget.clone().sub(penPoint).normalize();
    const writeQuaternion=new THREE.Quaternion().setFromUnitVectors(position(0,-1,0),tipDirection);
    penPoint.lerp(tipTarget.clone().addScaledVector(tipDirection,-.0795),w);
    propInActorFrame(documentation.pen,penPoint,carryQuaternion.slerp(writeQuaternion,w));
    documentationTipGap=documentationMode==='write'?Math.abs(penPoint.distanceTo(tipTarget)-.0795):null;
  }
  function procedural(dt) {
    restore();
    if (sitElapsed < 1.6) {
      sitElapsed += dt; sitting = THREE.MathUtils.lerp(sitFrom, sitTo, smooth(sitElapsed / 1.6));
    } else sitting = sitTo;
    walkWeight = manualGaitPhase !== null ? 1 : THREE.MathUtils.damp(walkWeight, walking && sitting < .05 ? 1 : 0, 7, dt);
    if (walking && !distanceDriven && manualGaitPhase === null) {
      walkPhase = (walkPhase + dt / WALKING_DEMO.cycleSeconds) % 1;
    }
    const phase = manualGaitPhase ?? walkPhase;
    let gaitSample = null;
    if (manualGaitPhase !== null) {
      const sample = gaitSampler(phase);
      gaitSample = sample.visualGait === 'heel-toe-v27' ? sample : applyWalkingPose(sample);
    } else if (walkWeight > .0005) {
      gaitSample = walkingVisualSample(phase);
    }
    const twist=gaitSample?Math.cos(phase*Math.PI*2)*walkWeight:0;
    let walkShift=0;
    if(gaitSample){
      offset('root',UP,.036*twist);
      walkShift=-.005+gaitSample.reference.vertical;
      let reachLimit=Infinity;
      // Keep both legs within their actual rig lengths. A fixed large
      // pelvis drop caused a crouch; unconstrained rise caused foot sliding.
      for(const side of ['L','R']){
        const limb=gaitSample[side==='R'?'right':'left'];
        const hip=rest.get('upperleg01.'+side).point,knee=rest.get('lowerleg01.'+side).point,ankle=rest.get('foot.'+side).point;
        if(footwear==='shoes'){
          const shod=trainerRocker(ankle,limb.foot.pitch,limb.rocker.clearance);
          const forward=limb.foot.forward-limb.rocker.forwardOffset+shod.forwardOffset;
          gaitSample={...gaitSample,[side==='R'?'right':'left']:{...limb,foot:{...limb.foot,forward,height:shod.height}}};
        }
        const target=gaitSample[side==='R'?'right':'left'].foot;
        const thigh=hip.distanceTo(knee),shin=knee.distanceTo(ankle);
        const currentHip=getPoint('upperleg01.'+side);
        const dx=-target.lateral-(currentHip.x-gaitSample.reference.lateral),dz=target.forward-currentHip.z;
        const pelvisHeight=spanSquared=>ankle.y+target.height+Math.sqrt(Math.max(.01,spanSquared-dx*dx-dz*dz))-currentHip.y;
        reachLimit=Math.min(reachLimit,pelvisHeight(((thigh+shin)*.998)**2));
        if(manualGaitPhase===null){
          // Extend the leading leg before heel strike, then yield during loading.
          const nearStrike=Math.min(limb.localPhase,1-limb.localPhase);
          const weight=1-THREE.MathUtils.smoothstep(nearStrike,0,.09);
          const heelStrikeSpan=thigh*thigh+shin*shin+2*thigh*shin*Math.cos(8*Math.PI/180);
          walkShift=THREE.MathUtils.lerp(walkShift,pelvisHeight(heelStrikeSpan),weight);
        }
      }
      walkShift=Math.min(walkShift,reachLimit);
    }
    if(eversionSide){
      eversionElapsed+=dt;
      const yieldRight=strengthMotion==='eversion'&&eversionSide==='R'&&eversionMode==='resist'&&eversionElapsed>.3;
      eversionAngle=THREE.MathUtils.damp(eversionAngle,yieldRight?.055:.23,9,dt);
    }
    const wall=clinicalPose?.startsWith('wall-')&&role==='patient';
    const heelRaised=clinicalPose==='wall-heel';
    const lower=wall&&!['wall-ready','wall-position'].includes(clinicalPose);
    kneeling=THREE.MathUtils.damp(kneeling,lower?1:0,4.5,dt);
    const lungeTarget=lower&&clinicalPose!=='wall-kneel'?1:0;
    lungeLoad=THREE.MathUtils.damp(lungeLoad,lungeTarget,4,dt);
    railWeight=THREE.MathUtils.damp(railWeight,clinicalPose==='rail-hold'?1:0,8,dt);
    const support=clinicalPose?.startsWith('plate-single-')?clinicalPose.slice(-1):null;
    const onPlate=!!support||['plate-stand','rail-hold'].includes(clinicalPose);
    const quietStand=onPlate||wall?0:(1-sitting)*(1-walkWeight);
    setRootShift(-.365 * sitting - .462*kneeling + walkShift * walkWeight + (role==='patient'?.013:.007)*quietStand,
      support?(support==='L'?.044:-.044):gaitSample ? -gaitSample.reference.lateral*walkWeight : 0,.03*kneeling+.125*lungeLoad);
    const removing=removal.active?removalFrame():null;
    documentationCarryWeight=THREE.MathUtils.damp(documentationCarryWeight,documentationMode==='desk'?0:1,8,dt);
    documentationWriteWeight=THREE.MathUtils.damp(documentationWriteWeight,documentationMode==='write'?1:0,8,dt);
    const lean=.12*lungeLoad-.012*Math.sin(time*1.4)+(removing?.lean||0)*.46+.025*walkWeight;
    if(gaitSample){
      const torso=new THREE.Quaternion().setFromAxisAngle(UP,-.046*twist)
        .multiply(new THREE.Quaternion().setFromAxisAngle(X,lean));
      setWorldQuaternion('spine03',torso.multiply(rest.get('spine03').world));
    } else {
      offset('spine03',X,lean);
    }
    if(onPlate&&role==='patient'){
      const spine=bones.get('spine03');spine.rotation.z+=plateX*.005;spine.rotation.x+=plateY*.003;
    }
    updateFace(dt);
    emotionWeight=THREE.MathUtils.damp(emotionWeight,emotion==='neutral'?0:1,5,dt);
    offset('head', X, -.016 + (talking ? .018 : .005) * Math.sin(time * (talking ? 2.4 : 1.1)) - .025*emotionWeight);
    if(emotionWeight>.001){const head=bones.get('head');head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP,emotionWeight*(emotion==='upset'?.035:.018)*Math.sin(time*1.6)));}
    root.userData.updateReferenceMouth?.(talking ? .5+.5*Math.sin(time*13.5) : 0);
    offset('jaw', X, talking ? .034 * (.5 + .5 * Math.sin(time * 13.5)) : 0);
    for (const side of ['L', 'R']) {
      const sign = side === 'L' ? 1 : -1;
      const suffix = `.${side}`, restFoot = rest.get(`foot${suffix}`).point;
      const footTarget = restFoot.clone();
      footTarget.x-=sign*(role==='patient'?.105:.073)*(1-sitting);
      if(support)footTarget.x-=(support==='L'?.044:-.044);
      footTarget.z+=.36*sitting;
      const foot=gaitSample?.[side==='R'?'right':'left'].foot;
      if(foot)footTarget.lerp(position(-foot.lateral,restFoot.y+foot.height,foot.forward),walkWeight);
      const lead=clinicalPose==='wall-measure-left'?'L':'R';
      let kneeGuide=position(sign*.17,.46,.65);
      if(wall&&side===lead){
        footTarget.z+=clinicalPose==='wall-ready'?0:.24;
        if(heelRaised)footTarget.y+=.031*lungeLoad;
      }else if(wall&&kneeling>.001){
        // Place the back knee on the floor and the shin behind it using the patient's own segment lengths.
        const hip=getPoint('upperleg01'+suffix),k=rest.get('lowerleg01'+suffix).point;
        const thigh=rest.get('upperleg01'+suffix).point.distanceTo(k),shin=k.distanceTo(restFoot);
        const down=Math.min(thigh-.003,Math.max(0,hip.y-.043));
        const knee=position(hip.x,hip.y-down,hip.z-Math.sqrt(Math.max(0,thigh*thigh-down*down)));
        const rearAnkleY=.07,deltaY=rearAnkleY-knee.y;
        const ankle=position(knee.x,rearAnkleY,knee.z-Math.sqrt(Math.max(.001,shin*shin-deltaY*deltaY)));
        footTarget.lerp(ankle,kneeling);kneeGuide.lerp(knee,kneeling);
      }
      if(support&&support!==side){footTarget.y+=.15;footTarget.z-=.10;}
      if(eversionSide===side)footTarget.y+=.055;
      const dressingPitch=removal.dressing?dressingLeg(removing,side,footTarget):0;
      if(!removal.dressing&&removing?.side===side) {
        footTarget.y+=.38*removing.lift;
        footTarget.z-=.24*removing.lift;
        footTarget.x+=sign*.025*removing.lift;
      }
      solveTwoLinks(`upperleg01${suffix}`, `lowerleg01${suffix}`, `foot${suffix}`,
        footTarget, kneeGuide);
      offset(`foot${suffix}`, X, foot ? -foot.pitch*walkWeight : wall&&side!==lead?2.86*kneeling:heelRaised&&side===lead?.19*lungeLoad:0);
      if(removal.dressing){
        setWorldQuaternion('foot'+suffix,new THREE.Quaternion().setFromAxisAngle(X,dressingPitch).multiply(rest.get('foot'+suffix).world));
      }
      if(eversionSide===side){
        if(strengthMotion==='dorsiflexion')offset('foot'+suffix,X,-eversionAngle);
        else offset('foot'+suffix,position(0,0,1),sign*eversionAngle);
      }
      const standingWrist = position(sign * .231, .869, .035);
      const seatedWrist = position(sign * .18, .635, .285);
      let wristTarget = standingWrist.lerp(seatedWrist, sitting);
      const elbowPole=position(sign*.45,1.0-.27*sitting,-.05);
      if(gaitSample){
        const armAngle=sign*.28*Math.cos(phase*2*Math.PI);
        const bend=.30+.10*Math.cos(phase*2*Math.PI)*sign;
        const upper=rest.get('upperarm01'+suffix).point,elbow=rest.get('lowerarm01'+suffix).point;
        const wrist=rest.get('wrist'+suffix).point,shoulder=getPoint('upperarm01'+suffix);
        const armDirection=a=>position(sign*.075,-Math.cos(a),Math.sin(a)).normalize();
        const walkingElbow=shoulder.addScaledVector(armDirection(armAngle),upper.distanceTo(elbow));
        const walkingWrist=walkingElbow.clone().addScaledVector(armDirection(armAngle+bend),elbow.distanceTo(wrist));
        wristTarget.lerp(walkingWrist,walkWeight);
        elbowPole.lerp(walkingElbow,walkWeight*(1-documentationCarryWeight));
      }
      if(role==='therapist'&&documentation) {
        const carryTarget=side==='L'?position(.24,.96-.365*sitting,.13):wristTarget.clone();
        const writeTarget=side==='L'?position(.105,1.03-.22*sitting,.235):position(-.020+Math.sin(time*4.2)*.008,1.082-.22*sitting,.290+Math.sin(time*6.3)*.004);
        carryTarget.lerp(writeTarget,documentationWriteWeight);
        wristTarget.lerp(carryTarget,documentationCarryWeight);
      }
      let scratchRotation,reach=0;
      if(side==='R'&&scratchTime!==null&&face&&pose==='seated'&&!clinicalPose&&!removing){
        reach=smooth(scratchTime/.70)*(1-smooth((scratchTime-1.42)/.68));
        scratchRotation=scratchHand(wristTarget,elbowPole,reach,scratchTime);
      }
      if(side==='R'&&knockBeat!==null){
        const lift=smooth(Math.min(knockBeat/.34,1))*(1-smooth(Math.max(0,(knockBeat-1.36)/.34)));
        const tap=Math.max(0,1-Math.abs(knockBeat-.62)/.15,1-Math.abs(knockBeat-1.14)/.15);
        wristTarget.lerp(position(-.20,1.39,.28+.10*tap),lift);
        elbowPole.lerp(position(-.38,1.20,.11),lift);
      }
      if(wall)wristTarget=position(sign*.20,1.20-.38*kneeling,.485);
      if(clinicalPose==='guard'&&side==='L')wristTarget=position(.16,1.03,.38);
      if(railWeight>.001)wristTarget.lerp(position(sign*.447,.85,.045),railWeight);
      if(removing)wristTarget=removalHand(removing,side,wristTarget,footTarget);
      solveTwoLinks(`upperarm01${suffix}`, `lowerarm01${suffix}`, `wrist${suffix}`,
        wristTarget, elbowPole);
      if(scratchRotation&&reach>0)poseScratchingWrist(scratchRotation,reach,scratchTime);
      // Keep the rest LOCAL wrist rotation inherited from the forearm. The
      // previous world-rest reset made the hand bend independently of the arm.
      // Talking never adds arm, wrist, or finger tapping motions.
    }
    root.updateMatrixWorld(true);
    if(!removing&&documentationMode==='desk'&&pose==='standing'){
      for(const [bone,rotation] of relaxedHands)bone.quaternion.copy(rotation);
      root.updateMatrixWorld(true);
    }
    updateDocumentationProps();
    if(removing) {
      if(removal.dressing){
        dressShoe(removing);removal.side=removing.side;removal.phase=removing.stage;removal.progress=removal.elapsed/removal.duration;
        if(removal.elapsed>=removal.duration){removal.active=false;removal.dressing=false;removal.completed=false;removal.phase='shod';footwear='shoes';resetFootwearObjects('shoes');}
        return;
      }
      updateRemovalProps(removing);removal.phase=removing.stage;removal.side=removing.side;removal.progress=clamp(removal.elapsed/removal.duration,0,1);
      if(removal.elapsed>=removal.duration) {
        removal.active=false;removal.completed=true;removal.phase='completed';removal.progress=1;footwear='barefoot';
        // Leave removed garments in the room, rather than carrying them under
        // the patient root as she walks to the next examination zone.
        if(garmentDeposits) {
          for(const home of shoeHomes)garmentDeposits.attach(home.shoe);
          for(const sock of socks)garmentDeposits.attach(sock.loose);
        }
      }
    }
  }
  function setPose(next, immediate = false) {
    if (!['standing', 'seated', 'heel_raise', 'examine'].includes(next)) next = 'standing';
    halted = false;
    if (next === pose && !immediate && (next !== 'heel_raise' || heelAction?.isRunning())) return;
    manualGaitPhase = null;
    pose = next; mixer.stopAllAction(); heelAction = null;
    if (next === 'heel_raise' && heelClip) {
      walking = false; heelElapsed = 0;
      heelStart = new Map([...bones].map(([name, b]) => [name, { p: b.position.clone(), q: b.quaternion.clone() }]));
      heelAction = mixer.clipAction(heelClip).reset().setLoop(THREE.LoopOnce, 1);
      heelAction.clampWhenFinished = true; heelAction.play();
    } else {
      sitFrom = sitting; sitTo = next === 'seated' ? 1 : 0; sitElapsed = immediate ? 1.6 : 0;
      if (sitTo) walking = false;
      if (immediate) { sitting = sitTo; if(!walking)walkWeight=0; procedural(0); }
    }
  }
  const actor = {
    root, model, bones, role, ready: true,
    bedsideRig: { rest, reset: restore, offset, orient: setWorldQuaternion, reach: solveTwoLinks },
    updateFace,
    setEmotion(value){emotion=['questioning','concerned','upset','pain','sore'].includes(value)?value:'neutral';return actor;},
    setPlateFrame(vision,sample){plateX=sample?.[1]||0;plateY=sample?.[2]||0;if(face?.userData.lids)face.userData.lids.value=vision==='closed'?1:0;},
    scratchTemple(){if(face&&pose==='seated'&&!clinicalPose&&scratchTime===null)scratchTime=0;},
    endGesture(){scratchTime=null;},
    setKnock(t){knockBeat=t;},
    setPose,
    bindDocumentation(props={}) {
      if(role!=='therapist')return actor;
      if(documentation)restoreDocumentation();
      if(!props.notes||!props.pen){documentation=null;documentationMode='desk';return actor;}
      const items=[props.notes,props.pen].map(object=>({object,parent:props.deskParent||object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()}));
      documentation={notes:props.notes,pen:props.pen,items};documentationMode='desk';restoreDocumentation();return actor;
    },
    setDocumentation(value) {
      if(role!=='therapist'||!documentation)return actor;
      const next=['desk','carry','write'].includes(value)?value:'desk';
      if(next===documentationMode)return actor;
      documentationMode=next;
      if(next==='desk')restoreDocumentation();
      else {bones.get('wrist.L').attach(documentation.notes);bones.get('wrist.R').attach(documentation.pen);updateDocumentationProps();}
      return actor;
    },
    setClinicalPose(value){clinicalPose=value;},
    setStrengthTest(side,mode,motion='eversion'){
      if(side!==eversionSide||motion!==strengthMotion)eversionAngle=0;
      strengthMotion=motion;
      eversionSide=side;eversionMode=mode;eversionElapsed=0;
    },
    setExamCuff(amount,side) {
      if(strengthTrousers)strengthTrousers.visible=side==='both'&&amount>.5;
      if(examTrousers){examTrousers.visible=amount>.5&&side!=='both';trousers.visible=!examTrousers.visible&&!strengthTrousers?.visible;}
    },
    setFootwear(value) {
      const next=role==='therapist'?'shoes':['shoes','socks','barefoot'].includes(value)?value:'shoes';
      if(next===footwear && !removal.active)return actor;
      removal.active=false;removal.dressing=false;removal.completed=next==='barefoot';removal.elapsed=0;removal.progress=next==='barefoot'?1:0;removal.phase=next==='barefoot'?'restored_barefoot':'idle';removal.side=null;
      footwear=next;resetFootwearObjects(next);
      return actor;
    },
    startFootwearDressing(){
      if(role!=='patient'||footwear==='shoes'||removal.dressing)return;
      resetFootwearObjects('barefoot');setPose('seated',true);manualGaitPhase=null;walking=false;walkWeight=0;halted=false;
      for(const home of shoeHomes){
        const restFoot=rest.get('foot.'+home.side).point,sign=home.side==='L'?1:-1;
        root.attach(home.shoe);home.shoe.visible=true;
        home.shoe.position.set(restFoot.x+sign*.077,.004,.462);
        home.shoe.quaternion.identity();
      }
      for(const sock of socks)sock.worn.visible=true;
      Object.assign(removal,{dressing:true,active:true,completed:false,elapsed:0,phase:'dressing',side:'L',progress:0});
      footwear='dressing';
    },
    startFootwearRemoval() {
      if(role!=='patient'||removal.active||removal.completed)return actor;
      resetFootwearObjects('shoes');footwear='removing';manualGaitPhase=null;walking=false;walkWeight=0;talking=false;halted=false;
      setPose('seated');removal.active=true;removal.completed=false;removal.elapsed=0;removal.progress=0;removal.phase='sit';removal.side='L';
      return actor;
    },
    getBodyReferencePosition() { return bones.get('root').getWorldPosition(new THREE.Vector3()); },
    setPosition(value) {
      const from=walking && distanceDriven ? root.position.clone() : null;
      if (Array.isArray(value)) root.position.fromArray(value);
      else root.position.set(value.x || 0, value.y || 0, value.z || 0);
      if(from)walkPhase=(walkPhase+Math.hypot(root.position.x-from.x,root.position.z-from.z)/WALKING_PROFILE.strideLength)%1;
      root.updateMatrixWorld(true); return actor;
    },
    face(angle) { root.rotation.y = Number(angle) || 0; root.updateMatrixWorld(true); return actor; },
    setLocomotion(value, followDistance=false) {
      if(value && !walking)walkPhase=0;
      walking=Boolean(value); distanceDriven=walking && followDistance; halted=false;
      if(walking && pose!=='standing')setPose('standing');
      return actor;
    },
    setGaitSampler(sampler) { gaitSampler=typeof sampler==='function'?sampler:sampleGait; return actor; },
    setGaitPhase(value) {
      if (value === null || value === undefined) { const wasManual=manualGaitPhase!==null;manualGaitPhase=null;if(wasManual){walking=false;walkWeight=0;procedural(0);}return actor; }
      if (pose !== 'standing' || sitting !== 0) setPose('standing', true);
      manualGaitPhase = clamp(Number(value) || 0, 0, 1);
      walking = true; walkWeight = 1; halted = false;
      procedural(0); return actor;
    },
    setHeelTeachingPhase(value) {
      if(pose!=='heel_raise'||!heelAction)setPose('heel_raise',true);
      if(!heelAction||!heelClip)return actor;
      heelAction.paused=false;mixer.setTime(heelClip.duration*.5*clamp(Number(value)||0,0,1));
      heelAction.paused=true;heelElapsed=1;halted=true;root.updateMatrixWorld(true);return actor;
    },
    setTalking(value) { talking = Boolean(value); return actor; },
    stop() { halted = true; walking = false; if (heelAction) heelAction.paused = true; return actor; },
    update(dt,elapsed=dt) {
      if (halted) return;
      dt = clamp(Number(dt) || 0, 0, .1); time += dt;
      if(scratchTime!==null){
        scratchTime+=clamp(elapsed,0,.5);
        if(scratchTime>=2.1||pose!=='seated')scratchTime=null;
      }
      if(removal.active)removal.elapsed=Math.min(removal.duration,removal.elapsed+clamp(elapsed,0,.5));
      if (pose === 'heel_raise' && heelAction) {
        mixer.update(dt); heelElapsed += dt;
        const alpha = smooth(heelElapsed / .7);
        if (alpha < 1 && heelStart) for (const [name, b] of bones) {
          const from = heelStart.get(name); b.position.lerpVectors(from.p, b.position.clone(), alpha); b.quaternion.slerpQuaternions(from.q, b.quaternion.clone(), alpha);
        }
        root.updateMatrixWorld(true);
      } else procedural(dt);
    },
    getState() { return { role, pose, sitting, walking, talking, halted, boneCount: bones.size, heelElapsed, manualGaitPhase, footwear, footwearRemoval:{...removal},documentation:{mode:documentationMode,bound:!!documentation,carryWeight:documentationCarryWeight,writeWeight:documentationWriteWeight,penTipGapMetres:documentationTipGap},appearance }; }
  };
  procedural(0);
  await dressFromDrawings(root,role);
  return actor;
}

export function seatOnExamBed(patient,bed){
  patient.root.rotation.set(0,Math.PI/2,0);
  patient.setLocomotion(false);
  patient.setPose('seated',true);
  const seat=bed.localToWorld(new THREE.Vector3(.27,.806,.13));
  patient.root.position.add(seat.sub(patient.getBodyReferencePosition()));
  patient.root.updateMatrixWorld(true);
}

export async function createActors(scene, options = {}) {
  const url = options.modelUrl || './assets/patient-motion.glb';
  const [patient, therapist] = await Promise.all([
    createActor(scene, 'patient', url), createActor(scene, 'therapist', url)
  ]);
  patient.setPosition(options.patientPosition || [0, 0, -.85]).face(Math.PI);
  therapist.setPosition(options.therapistPosition || [0, 0, -2.72]);
  const details = {
    schema: 'dxx-clinic-actors-v13', independentSkeletons: patient.bones.get('root') !== therapist.bones.get('root'),
    source: 'MPFB CC0 adult skin/rig and project-authored clothing and motion',
    bonesPerActor: [patient.bones.size, therapist.bones.size],
    clinicalReview: 'pending', paidGenerationJobs: 0,
    appearance: {therapist:therapist.getState().appearance,patient:patient.getState().appearance},
    manualGaitSchedule: {
      api: 'actor.setGaitPhase(p in [0,1]); null restores ordinary time-driven locomotion',
      interpretation: 'Hypothetical asymmetric teaching case shared with gait-lesson.js; not a measured patient cycle or typical CAI pattern',
      sharedSampler:'sampleGait from gait-lesson.js',
      rightInitialContact: 0, rightToeOff: .56, leftInitialContact: .46, leftStanceFraction:.70,
      strideMetres:.88, rightStepLengthMetres:.48, leftStepLengthMetres:.40, stepWidthMetres:.14,
      swingLiftMetres: .055,pelvisDesignLoweringMetres:.060,
      directorTravel:'Root translates 0.88*p metres along local +Z; stance ankle anchors then remain fixed in world space.',
      reference:'getBodyReferencePosition returns actual source rig root/pelvis reference; it is not whole-body centre of mass.'
    },
    footwear:{default:'shoes for both roles; patient fitted light-grey ankle socks under shoes',api:'patient.startFootwearRemoval(); setFootwear(shoes|socks|barefoot) for stage restoration; getState().footwearRemoval tracks action; therapist remains shod',source:'Original unbranded procedural shoe meshes; fitted sock shells derived from CC0 skin with original weights, then captured as posed meshes for visible off-foot pull',sequenceSeconds:FOOTWEAR_REMOVAL_SECONDS},
    documentation:{api:'therapist.bindDocumentation({notes,pen,deskParent}); setDocumentation(desk|carry|write)',source:'Original scene note board and pen; no separate tray. Wrist-bone attached while carried; original desk transform restored when unused.',scope:'Finite visual carry and small writing strokes; no validated grip or handwriting assessment. Use desk mode before balance protection or hands-on assessment.'},
    limitations: ['Simplified visual sit transfer and walking; no validated gait kinematics.',
      'Jaw cycle is a speaking gesture draft without phoneme synchronization.',
      'The two roles share a CC0 male source topology, with original male/female display refinements; they are not separate scans or photorealistic people.',
      'Seated shoe and sock removal is an authored finite animation with simplified cloth and hand contact; no validated dressing assessment or collision simulation.',
      'Heel-raise clip is an authored teacher-review action; no pressure or clinical result is computed.']
  };
  return {
    patient, therapist, ready: true, details,
    update(dt,elapsed=dt) { patient.update(dt,elapsed); therapist.update(dt); },
    setTalking(role) { patient.setTalking(role === 'patient'); therapist.setTalking(role === 'therapist'); },
    setMode(mode) {
      if (mode === 'consult' || mode === 'seated') { patient.setPose('seated'); therapist.setPose('seated'); }
      else if (mode === 'heel_raise') { patient.setPose('heel_raise'); therapist.setPose('standing'); }
      else if (mode === 'examine') { patient.setPose('standing'); therapist.setPose('examine'); }
      else { patient.setPose('standing'); therapist.setPose('standing'); }
    }
  };
}
