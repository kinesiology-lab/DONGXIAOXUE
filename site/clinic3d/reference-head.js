import {patientFaceMorphs} from './patient-expression.js';
import {fitHeadObject} from './head-fit.js';
import * as THREE from 'three';
const N=144,H=96;
const library=new Map();
function resources(role){
 if(!library.has(role))library.set(role,(async()=>{
  const base=new URL('./assets/reference-heads/'+role,import.meta.url);
  const patient=role==='patient';
  const shape=base.href+(patient?'-shape-v42.bin':'.bin');
  const surface=base.href+(patient?'-surface-v42.webp':'.png');
  const loadMap=url=>new THREE.TextureLoader().loadAsync(url);
  const [buffer,map,profile]=await Promise.all([
    fetch(shape).then(r=>{if(!r.ok)throw Error('head geometry '+r.status);return r.arrayBuffer()}),
    loadMap(surface),patient?null:loadMap(base.href+'-profile.png')
  ]);
  const pos=new Float32Array(buffer);if(pos.length!==(H+1)*(N+1)*3)throw Error('invalid head geometry');
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.anisotropy=4;
  const uv=[],index=[];const g=new THREE.BufferGeometry();
  for(let j=0;j<=H;j++){for(let i=0;i<=N;i++){uv.push(i/N,1-j/H);if(i<N&&j<H){const a=j*(N+1)+i;index.push(a,a+N+1,a+1,a+1,a+N+1,a+N+2);}}}
  if(patient){
    const chin=H*(N+1);
    for(let i=1;i<N-1;i++)index.push(0,i,i+1,chin,chin+i+1,chin+i);
  }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  const morph=pos.slice();for(let i=0;i<pos.length/3;i++){const v=Math.floor(i/(N+1))/H,t=Math.abs((i%(N+1)/N-.5)*2*Math.PI);const weight=Math.exp(-(((v-.815)/.093)**2)-((t/.50)**2));morph[i*3+1]-=.0028*weight;morph[i*3+2]+=.001*weight;}
  g.morphAttributes.position=[new THREE.BufferAttribute(morph,3)];
  if(patient)g.morphAttributes.position.push(...patientFaceMorphs(pos,N,H));
  g.computeBoundingSphere();
  if(profile){profile.colorSpace=THREE.SRGBColorSpace;profile.wrapS=THREE.RepeatWrapping;profile.anisotropy=4;}
  const drawing=new URL('./assets/reference-characters/',import.meta.url);
  const tex=async name=>{const t=await new THREE.TextureLoader().loadAsync(new URL(name,drawing).href);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;};
  const [nape,tail]=await Promise.all([patient?null:tex(role+'-nape-v40.webp'),patient?tex('patient-ponytail-v40.webp'):null]);
  return {g,map,profile,nape,tail};
 })().catch(err=>{library.delete(role);throw err;}));return library.get(role);
}
function pony(parent,texture){
 const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1.638,-.050),new THREE.Vector3(-.002,1.609,-.074),new THREE.Vector3(-.005,1.544,-.111),new THREE.Vector3(.002,1.465,-.130),new THREE.Vector3(.021,1.417,-.108)]);
 const p=[],uv=[],ind=[];
 for(let j=0;j<=48;j++){
   const t=j/48,q=c.getPointAt(t);
   const w=(.012+.025*Math.sin(Math.PI*t)**.7)*(1-.92*t**3);
   for(let i=0;i<=40;i++){
     const a=i/40*Math.PI*2,r=w*(1+.045*Math.sin(7*a+2*t));
     p.push(q.x+r*Math.cos(a),q.y,q.z+.75*r*Math.sin(a));
     uv.push(.5-.485*Math.cos(a),1-t);
     if(j<48&&i<40){const n=j*41+i;ind.push(n,n+41,n+1,n+1,n+41,n+42);}
   }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));m.name='Reference_ponytail';parent.add(m);
 for(const [offset,drop] of [[-.011,.010],[.007,.014],[.015,.001]]){
   const verts=[],tri=[];
   for(let j=0;j<=16;j++){
     const t=j/16,q=c.getPointAt(.66+.34*t),r=.010*(1-t)+.0004;
     q.x+=offset*(.6+t)+.006*Math.sin(3*t);q.y-=drop*t;q.z-=.006;
     for(let i=0;i<=10;i++){
       const a=i*Math.PI/5;verts.push(q.x+r*Math.cos(a),q.y,q.z+r*.6*Math.sin(a));
       if(j<16&&i<10){const n=j*11+i;tri.push(n,n+11,n+1,n+1,n+11,n+12);}
     }
   }
   const lock=new THREE.BufferGeometry();lock.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));lock.setIndex(tri);
   parent.add(new THREE.Mesh(lock,new THREE.MeshBasicMaterial({color:0x4c332c,side:THREE.DoubleSide,toneMapped:false})));
 }
 const band=new THREE.Mesh(new THREE.TorusGeometry(.015,.0038,8,32),new THREE.MeshStandardMaterial({color:0x292a30,roughness:.93}));
 band.position.copy(c.getPointAt(.056));band.rotation.x=1.01;parent.add(band);
}
// The illustrated jaw has baked colour. Match it on the exposed neck after
// scene tone mapping, then fade back into the lit body below the collar.
function matchNeckToJaw(material,role){
 const patient=role==='patient';
 const front=new THREE.Color(patient?0xfadbc8:0xf3cbb2);
 const side=new THREE.Color(patient?0xf6cfbb:0xf9d0b7);
 const previous=material.onBeforeCompile,baseKey=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);
   shader.uniforms.neckFront={value:front};
   shader.uniforms.neckSide={value:side};
   shader.vertexShader='varying vec3 vNeckBlend;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     float collarY=mix(1.424,1.445,smoothstep(.048,.060,abs(position.x)));
     float neckMask=smoothstep(collarY,1.462,position.y)*(1.-smoothstep(.068,.108,abs(position.x)));
     vNeckBlend=vec3(neckMask,smoothstep(.22,.94,normal.z),smoothstep(1.445,1.565,position.y));`);
   shader.fragmentShader='varying vec3 vNeckBlend; uniform vec3 neckFront,neckSide;\n'+shader.fragmentShader.replace('#include <tonemapping_fragment>',`#include <tonemapping_fragment>
     vec3 neckColour=mix(neckSide,neckFront,vNeckBlend.y)*mix(.986,.963,vNeckBlend.z);
     gl_FragColor.rgb=mix(gl_FragColor.rgb,neckColour,vNeckBlend.x);`);
 };
 material.customProgramCacheKey=()=>baseKey+'-reference-neck';
 material.needsUpdate=true;
}
export async function replaceHead(root,bone,skin,role){
 const {g,map,profile,nape,tail}=await resources(role),geom=skin.geometry,p=geom.attributes.position,old=geom.index,keep=[];
 for(let i=0;i<(old?.count??p.count);i+=3){const ids=[0,1,2].map(k=>old?old.getX(i+k):i+k);
 const y=ids.reduce((s,n)=>s+p.getY(n),0)/3,z=ids.reduce((s,n)=>s+p.getZ(n),0)/3;
 if(y<1.4985)keep.push(...ids);}
 // Retain the continuous, skinned neck and taper the former jaw inside the head.
 for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<1.478||y>1.514)continue;const h=Math.max(0,(y-1.478)/.0205),w=THREE.MathUtils.smoothstep(h,0,1);
 const x=p.getX(i),z=p.getZ(i),theta=Math.atan2(x,z-.032),rad=.047;
 p.setXYZ(i,THREE.MathUtils.lerp(x,Math.sin(theta)*rad,w),y+.103*h**1.5,THREE.MathUtils.lerp(z,.047+Math.cos(theta)*rad,w));}
 p.needsUpdate=true;geom.setIndex(keep);geom.clearGroups();geom.computeVertexNormals();
 matchNeckToJaw(skin.material,role);
 const group=new THREE.Group();group.name='Reference_head_'+role;const m=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,toneMapped:false});
 const angle={value:0},rearView={value:0};if(profile)m.onBeforeCompile=shader=>{shader.uniforms.sideMix=angle;shader.uniforms.rearView=rearView;shader.uniforms.sideAtlas={value:profile};shader.uniforms.napeAtlas={value:nape};shader.fragmentShader='uniform float sideMix,rearView; uniform sampler2D sideAtlas,napeAtlas;\n'+shader.fragmentShader.replace('#include <map_fragment>',`float pi=3.14159265;
 float a=(vMapUv.x-.5)*2.*pi, aa=abs(a), v=1.-vMapUv.y;
 // Slide corresponding eyes, brows and ears to a common position before mixing the two drawn views.
 float feature=0.40*exp(-pow((v-.52)/.28,2.))+0.23*exp(-pow((v-.80)/.12,2.));
 float offs=feature*smoothstep(.03,.48,aa)*(1.-smoothstep(1.45,2.05,aa));
 vec2 uvF=vec2(.5+sign(a)*max(0.,aa-offs*sideMix)/(2.*pi),vMapUv.y);
 vec2 uvS=vec2(.5+sign(a)*(aa+offs*(1.-sideMix))/(2.*pi),vMapUv.y);
 // Transition across the temple, not by overlaying two complete faces.
 float weight=clamp((sideMix-.5)*6.+(aa-.96)*1.5+.5,0.,1.);
 vec4 hair=texture2D(napeAtlas,vec2(.5-.5*sin(a),vMapUv.y));
 float back=max(smoothstep(2.12,2.65,aa),rearView*smoothstep(1.02,1.63,aa));
 diffuseColor*=mix(mix(texture2D(map,uvF),texture2D(sideAtlas,uvS),weight),hair,back);`);};
 const lids={value:0};
 if(role==='patient')m.onBeforeCompile=shader=>{
  shader.uniforms.lidClosure=lids;
  shader.fragmentShader='uniform float lidClosure;\n'+shader.fragmentShader.replace('#include <map_fragment>',`vec2 uv=vMapUv;
  float centre=uv.x<.5?.433:.565;
  vec2 eye=(uv-vec2(centre,.442))/vec2(.040,.070);
  float region=(1.-smoothstep(.88,1.14,length(eye)))*lidClosure;
  vec4 orig=texture2D(map,uv);
  vec4 skin=texture2D(map,vec2(uv.x,.355+.007*eye.y));
  float arc=.08+.28*eye.x*eye.x;
  float lash=(1.-smoothstep(.018,.085,abs(eye.y-arc)))*(1.-smoothstep(.72,1.,abs(eye.x)));
  diffuseColor*=mix(orig,vec4(mix(skin.rgb,vec3(.12,.073,.061),lash),orig.a),region);`);
 };
 const face=new THREE.Mesh(g,m);face.userData.lids=lids;const eye=new THREE.Vector3(),center=new THREE.Vector3(0,1.64,.055);
 if(profile)face.onBeforeRender=(renderer,scene,camera)=>{camera.getWorldPosition(eye);face.worldToLocal(eye).sub(center);
 const a=Math.abs(Math.atan2(eye.x,eye.z));rearView.value=THREE.MathUtils.smoothstep(a,1.71,2.73);angle.value=THREE.MathUtils.smoothstep(a,.76,1.46)*(1-THREE.MathUtils.smoothstep(a,1.96,2.88));};face.name='Reference_face_'+role;face.castShadow=true;group.add(face);if(role==='patient')pony(group,tail);
 fitHeadObject(group,role);root.add(group);root.updateMatrixWorld(true);bone.attach(group);
 return {face};
}

