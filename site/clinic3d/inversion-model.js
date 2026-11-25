import * as T from 'three';
import {loadFootAtlas,atlasGeometry} from './foot-atlas.js?v=74';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

import {buildLegLayer} from './fibular-study.js?v=74';

const v=(x,y,z)=>new T.Vector3(x,y,z);
const hinge=v(-.072,-.009,.071);
const views={
  ankle:[[-.075,.017,.094],[-.87,.32,.64],.174],
  dome:[[-.07,-.009,.075],[.025,1,.035],.081],
  front:[[-.077,.005,.085],[0,.015,1],.129],
  ligament:[[-.085,-.011,.078],[-1,.11,.32],.128],
  posterior:[[-.082,-.019,.059],[-.28,.12,-1],.095],
  muscles:[[-.089,.188,.090],[-1,.06,.52],.620],
  sole:[[-.090,-.035,.124],[-.45,-1,.32],.235],
  eversion:[[-.089,.188,.092],[-.88,.02,.75],.620]
};
export async function makeAnkleModel(stage,signal){
  const {parts,buffer,leg,legBuffer}=await loadFootAtlas(signal,true);
  const gl=new T.WebGLRenderer({antialias:true,alpha:false});
  gl.setPixelRatio(Math.min(devicePixelRatio,2));gl.setClearColor(0xeaf2ef);gl.localClippingEnabled=true;
  const canvas=gl.domElement;canvas.setAttribute('aria-label','可旋转的右踝解剖模型');stage.prepend(canvas);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.001,2);
  const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableZoom=true;
  controls.minZoom=.62;controls.maxZoom=3;controls.enableDamping=false;
  const hemi=new T.HemisphereLight(0xffffff,0xa8b4ac,2.0),sun=new T.DirectionalLight(0xfff6df,2.4);
  sun.position.set(-.3,.8,.65);scene.add(hemi,sun);
  const foot=new T.Group(),bones=new Map(),tips={};foot.position.copy(hinge);scene.add(foot);
  // Sagittal motion is assigned to the ankle. The bulk of inversion/eversion
  // is shown below the talus; the subtalar axis and amplitudes are schematic.
  const hindPivot=v(-.073,-.026,.069);
  const rear=new T.Group();rear.position.copy(hindPivot).sub(hinge);foot.add(rear);
  const clip=new T.Plane(v(0,-1,0),.103);
  const legLayer=buildLegLayer(scene,stage);
  for(const p of leg)legLayer.add(p,atlasGeometry(p,legBuffer));
  for(const p of parts){
    const geo=atlasGeometry(p,buffer);
    if(['fibLong','fibBrevis'].includes(p.key)){legLayer.add(p,geo);continue;}
    const onLeg=['tibia','fibula','fibLong','fibBrevis'].includes(p.key);
    const mat=new T.MeshStandardMaterial({color:0xe5d6b8,roughness:.82,side:T.DoubleSide,clippingPlanes:onLeg?[clip]:[]});
    const mesh=new T.Mesh(geo,mat);mesh.name=p.key;
    if(onLeg){scene.add(mesh);}else if(p.key==='talus'){foot.add(mesh);mesh.position.copy(hinge).negate();}
    else{rear.add(mesh);mesh.position.copy(hindPivot).negate();}
    bones.set(p.key,mesh);tips[p.key]=v(...p.tip);
  }
  const marks=new T.Group();scene.add(marks);
  const pins=[];
  function ball(parent,where,r,color){
    const m=new T.Mesh(new T.SphereGeometry(r,14,10),new T.MeshBasicMaterial({color}));
    m.position.copy(where);parent.add(m);return m;
  }
  function rod(parent,a,b,r,color){
    const m=new T.Mesh(new T.CylinderGeometry(r,r,1,12),new T.MeshStandardMaterial({color,roughness:.7}));
    parent.add(m);setEnds(m,a,b);return m;
  }
  function setEnds(m,a,b){
    const delta=b.clone().sub(a);m.position.copy(a).lerp(b,.5);m.scale.y=delta.length();
    m.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());
  }
  function pin(group,point,label){
    const n=document.createElement('span');n.className='ankle-pin';n.textContent=label;stage.append(n);pins.push({group,point,n});
  }
  const malleoli=new T.Group(),widths=new T.Group(),ligaments=new T.Group();
  marks.add(malleoli,widths,ligaments);
  for(const [k,d,label] of [['tibia',1,'内踝'],['fibula',-1,'外踝']]){
    const start=tips[k],end=start.clone().add(v(d*.027,0,0));
    ball(malleoli,start,.0018,0x963e23);
    rod(malleoli,start,end,.00046,0x963e23);pin(malleoli,end,label);
    // A common horizontal span makes the different tip heights visible in front view.
    rod(malleoli,v(-.097,start.y,.102),v(-.055,start.y,.102),.00028,0x55837c);
  }
  // Transverse guides identify parts of the trochlear dome, not joint-space measurements.
  for(const [z,x1,x2,label] of [[.078,-.087,-.058,'前部'],[.061,-.079,-.057,'后部']]){
    const a=v(x1,.0037,z),b=v(x2,.0037,z);rod(widths,a,b,.00048,0x78472d);
    ball(widths,a,.00095,0x78472d);ball(widths,b,.00095,0x78472d);pin(widths,b.clone().add(v(.009,0,0)),label);
  }
  // Teaching bands attach to the fibula, talus and calcaneus respectively.
  const anchor=v(-.096,-.012,.069), attachment=v(-.088,-.014,.084);
  const cflStart=v(-.097,-.019,.061),cflEnd=v(-.095,-.044,.055);
  const atfl=rod(ligaments,anchor,attachment,.0022,0xc65c35),cfl=rod(ligaments,cflStart,cflEnd,.0018,0x775775);
  // Approximate insertion centres on the medial fibular fossa and posterolateral talus (atlas metres).
  const ptOrigin=v(-.0921,-.0191,.0524),ptInsertion=v(-.0706,-.0189,.0504);
  const ptfl=rod(ligaments,ptOrigin,ptInsertion,.0023,0x2663b7);
  const lp=v(0,0,0);pin(ligaments,lp,'距腓后韧带');
  for(const m of [atfl,cfl,ptfl]){m.material.depthTest=false;m.renderOrder=5;}
  const lt=v(0,0,0);pin(ligaments,lt,'距腓前韧带');const lc=v(0,0,0);pin(ligaments,lc,'跟腓韧带');
  let span=.17,currentView='ankle',anim=0,dead=false;
  const size=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;const ratio=w/h;
    const height=span*Math.max(1,1/ratio);camera.top=height/2;camera.bottom=-height/2;camera.right=height*ratio/2;camera.left=-camera.right;
    camera.updateProjectionMatrix();gl.setSize(w,h,false);draw();};
  function draw(){
    if(dead)return;
    scene.updateMatrixWorld(true);camera.updateMatrixWorld();
    const moved=p=>p.clone().sub(hinge).applyQuaternion(foot.quaternion).add(hinge);
    const a=moved(attachment),b=rear.localToWorld(cflEnd.clone().sub(hindPivot));
    setEnds(atfl,anchor,a);setEnds(cfl,cflStart,b);
    const post=moved(ptInsertion);setEnds(ptfl,ptOrigin,post);
    lp.copy(ptOrigin).lerp(post,.5).add(v(.001,.010,-.014));
    lt.copy(a).add(v(-.005,.009,.017));lc.copy(b).add(v(-.005,-.004,-.016));
    legLayer.update(rear,hindPivot,camera);gl.render(scene,camera);
    for(const {group,point,n} of pins){
      const proj=point.clone().project(camera);
      n.hidden=!group.visible||Math.abs(proj.x)>.91||Math.abs(proj.y)>.88;
      if(!n.hidden){n.style.left=(50+50*proj.x)+'%';n.style.top=(50-50*proj.y)+'%';}
    }
  }
  function frame(view){
    const [target,dir,range]=views[view];span=range;
    camera.up.set(0,1,0);if(view==='dome')camera.up.set(0,0,-1);
    controls.target.set(...target);camera.position.copy(controls.target).addScaledVector(v(...dir).normalize(),.56);
    camera.zoom=1;camera.lookAt(controls.target);controls.update();size();
  }
  function select(step,action,done=()=>{},instant=false){
    cancelAnimationFrame(anim);
    const top=action==='dome',tipsOn=action==='tips',muscle=action==='muscles',stress=action==='strain',ev=action==='evert';
    const view=top?'dome':step===1?'front':step===2?(action==='posterior'?'posterior':'ligament'):step===3?(ev?'eversion':'muscles'):'ankle';
    malleoli.visible=tipsOn;widths.visible=top;ligaments.visible=step===2;
    legLayer.visible(step===3);clip.constant=step===3?.51:.105;
    for(const [key,m] of bones){
      const isMuscle=key==='fibLong'||key==='fibBrevis';
      m.visible=top?key==='talus':isMuscle?muscle:true;
      const fade=step===0&&!top&&(key==='tibia'||key==='fibula');
      m.material.transparent=fade;m.material.opacity=fade ? .38 : 1;m.material.depthWrite=!fade;
      m.material.color.set(key==='talus'?0x37857e:key==='fibLong'?0xb35338:key==='fibBrevis'?0xd89745:0xe1cfac);
    }
    currentView=view;frame(view);
    const rad=T.MathUtils.degToRad;
    const end=new T.Quaternion().setFromEuler(new T.Euler(rad(stress?22:action==='plantar'?24:action==='dorsi'?-13:0),rad(stress?1:0),rad(stress?3:ev?-2:0),'ZXY'));
    const rearEnd=new T.Quaternion().setFromEuler(new T.Euler(0,rad(stress?6:0),rad(stress?14:ev?-12:0),'ZXY'));
    const rearFrom=rear.quaternion.clone();
    const from=foot.quaternion.clone();const start=performance.now();const ms=instant||matchMedia('(prefers-reduced-motion: reduce)').matches?0:360;
    function tick(t){const f=ms?Math.min(1,(t-start)/ms):1;const ease=f*f*(3-2*f);foot.quaternion.slerpQuaternions(from,end,ease);rear.quaternion.slerpQuaternions(rearFrom,rearEnd,ease);draw();
      if(f<1)anim=requestAnimationFrame(tick);else done();}
    tick(start);
  }
  malleoli.traverse(n=>{if(n.material){n.material.depthTest=false;n.renderOrder=6;}});
  const ro=new ResizeObserver(size);ro.observe(stage);controls.addEventListener('change',draw);
  return {select,focusMuscle(key){legLayer.select(key);draw();},showContext(value){legLayer.context(value);draw();},soleView:()=>frame('sole'),posteriorView:()=>frame('posterior'),resetView:()=>frame(currentView), rotate:angle=>{const pos=camera.position.clone().sub(controls.target);
    pos.applyAxisAngle(v(0,1,0),angle);camera.position.copy(controls.target).add(pos);controls.update();draw();},
    dispose(){dead=true;cancelAnimationFrame(anim);ro.disconnect();controls.dispose();legLayer.dispose();
      scene.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose();});gl.dispose();gl.forceContextLoss();canvas.remove();pins.forEach(p=>p.n.remove());}};
}