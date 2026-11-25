import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadFootAtlas,atlasGeometry} from './foot-atlas.js';

const v=(x,y,z)=>new T.Vector3(x,y,z);
const ivory=new T.Color(0xe7d2ac),green=new T.Color(0x168475);
const views={
  medial:{dir:v(1,.47,.16),up:v(0,1,0)},
  lateral:{dir:v(-1,.45,-.11),up:v(0,1,0)},
  dorsal:{dir:v(0,1,.012),up:v(0,0,1)}
};

// Register the proximal end on each individual metatarsal's own long axis.
// The highlighted proximal zone is a teaching landmark, not a radiographic boundary.
function registerBase(geometry){
  const attr=geometry.attributes.position;geometry.computeBoundingBox();
  const bounds=geometry.boundingBox,range=bounds.max.z-bounds.min.z;
  const near=v(0,0,0),far=v(0,0,0),p=v(0,0,0);let n=0,f=0;
  for(let i=0;i<attr.count;i++){
    p.fromBufferAttribute(attr,i);
    if(p.z<=bounds.min.z+range*.13){near.add(p);n++;}
    if(p.z>=bounds.max.z-range*.13){far.add(p);f++;}
  }
  const axis=far.divideScalar(f).sub(near.divideScalar(n)).normalize();
  let low=Infinity,high=-Infinity;
  for(let i=0;i<attr.count;i++){const dist=p.fromBufferAttribute(attr,i).dot(axis);low=Math.min(low,dist);high=Math.max(high,dist);}
  return point=>(point.dot(axis)-low)/(high-low);
}

export async function createArchModel(stage,{pick,signal}){
  const {parts,buffer}=await loadFootAtlas(signal);
  const gl=new T.WebGLRenderer({antialias:true,alpha:false});
  gl.setPixelRatio(Math.min(devicePixelRatio,2));gl.setClearColor(0xeaf2ef);
  const canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','右足骨骼。拖动旋转，点选骨块。键盘可使用骨名定位。');stage.prepend(canvas);
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.001,2);
  const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.minZoom=.64;controls.maxZoom=4;controls.enableDamping=false;
  scene.add(new T.HemisphereLight(0xffffff,0xb8b6a9,1.75));const sun=new T.DirectionalLight(0xfff7de,2.1);sun.position.set(.22,.67,.43);scene.add(sun);
  const group=new T.Group();scene.add(group);const bones=new Map(),names=new Map(),baseFor=new Map();
  const pos=v(0,0,0);
  for(const part of parts){
    if(['tibia','fibula','fibLong','fibBrevis'].includes(part.key))continue;
    const geo=atlasGeometry(part,buffer);
    const material=new T.MeshStandardMaterial({color:ivory,roughness:.82,side:T.DoubleSide});
    const mesh=new T.Mesh(geo,material);
    mesh.name=part.key;group.add(mesh);bones.set(part.key,mesh);names.set(part.key,part.name);
    if(/^mt[1-5]$/.test(part.key)){
      const base=registerBase(geo),along=new Float32Array(part.v);
      for(let i=0;i<part.v;i++)along[i]=base(pos.fromBufferAttribute(geo.attributes.position,i));
      baseFor.set(part.key,base);
      geo.setAttribute('archAlong',new T.BufferAttribute(along,1));
      const enabled={value:0};mesh.userData.baseHighlight=enabled;
      // Interpolate the longitudinal coordinate, then shade the proximal zone per fragment.
      // This avoids projecting broad triangles of colour up the metatarsal shaft.
      material.onBeforeCompile=shader=>{
        shader.uniforms.showArchBase=enabled;shader.uniforms.archGreen={value:green};
        shader.vertexShader='attribute float archAlong; varying float archDepth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\narchDepth=archAlong;');
        shader.fragmentShader='uniform float showArchBase; uniform vec3 archGreen; varying float archDepth;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(showArchBase>0.5) diffuseColor.rgb=mix(archGreen,diffuseColor.rgb,smoothstep(0.27,0.29,archDepth));');
      };
    }
  }
  const box=new T.Box3().setFromObject(group),center=box.getCenter(v(0,0,0));
  const readout=document.createElement('span');readout.className='arch-hover';readout.hidden=true;stage.append(readout);
  let height=.22,activeView='dorsal',dead=false;
  function render(){if(!dead)gl.render(scene,camera);}
  function resize(){
    const width=stage.clientWidth,h=stage.clientHeight;if(!width||!h)return;const ratio=width/h;
    const up=camera.up.clone().normalize(),forward=views[activeView].dir.clone().normalize();
    const across=up.clone().cross(forward).normalize();up.crossVectors(forward,across);
    let maxX=0,maxY=0;
    for(const m of bones.values()){
      const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){pos.fromBufferAttribute(a,i).sub(center);
        maxX=Math.max(maxX,Math.abs(across.dot(pos)));maxY=Math.max(maxY,Math.abs(up.dot(pos)));}
    }
    height=Math.max(.12,maxY*2.28,maxX*2.28/ratio);
    camera.top=height/2;camera.bottom=-height/2;camera.left=-height*ratio/2;camera.right=-camera.left;camera.updateProjectionMatrix();gl.setSize(width,h,false);render();
  }
  function setView(id){
    activeView=id;const {dir,up}=views[id];camera.up.copy(up);controls.target.copy(center);camera.position.copy(center).addScaledVector(dir.clone().normalize(),.52);
    camera.zoom=1;camera.lookAt(center);controls.update();resize();
  }
  function paint(arch,selected){
    for(const [key,mesh] of bones){
      const chosen=selected.includes(key),baseOnly=chosen&&arch==='transverse'&&baseFor.has(key);
      mesh.material.color.copy(chosen&&!baseOnly?green:ivory);
      if(mesh.userData.baseHighlight)mesh.userData.baseHighlight.value=baseOnly?1:0;
    }
    render();
  }
  const ray=new T.Raycaster(),ptr=new T.Vector2();
  function hit(e){
    const r=canvas.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    ray.setFromCamera(ptr,camera);return ray.intersectObjects(group.children,false)[0];
  }
  let down=null;const pointers=new Set();
  function start(e){pointers.add(e.pointerId);down=pointers.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;}
  function move(e){
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down=null;
    if(e.pointerType!=='mouse'||pointers.size){readout.hidden=true;return;}
    const h=hit(e);readout.hidden=!h;
    if(h){readout.textContent=names.get(h.object.name);const r=stage.getBoundingClientRect();
      readout.style.left=Math.max(5,Math.min(r.width-88,e.clientX-r.left+10))+'px';readout.style.top=Math.max(5,e.clientY-r.top-29)+'px';}
  }
  function end(e){
    pointers.delete(e.pointerId);const tap=down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6;down=null;
    if(!tap)return;const h=hit(e);if(!h)return;
    const key=h.object.name,region=baseFor.get(key);pick(key,!region||region(h.point)<=.29);
  }
  function cancel(e){pointers.delete(e.pointerId);down=null;}
  canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',cancel);
  canvas.addEventListener('pointerleave',()=>{readout.hidden=true;});
  controls.addEventListener('change',render);setView('dorsal');const observer=new ResizeObserver(resize);observer.observe(stage);
  function zoom(k){camera.zoom=T.MathUtils.clamp(camera.zoom*k,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();render();}
  return {names,paint,setView,zoom,dispose(){dead=true;observer.disconnect();controls.dispose();
    group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});gl.dispose();gl.forceContextLoss();canvas.remove();readout.remove();}};
}