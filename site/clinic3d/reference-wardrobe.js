import * as THREE from 'three';
const V=()=>new THREE.Vector3();
export function smoothSurface(g){
 const p=g.attributes.position,n=g.attributes.normal,groups=new Map();
 for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(!groups.has(k))groups.set(k,{sum:V(),ids:[]});const a=groups.get(k);a.sum.add(V().fromBufferAttribute(n,i));a.ids.push(i);}
 for(const a of groups.values()){a.sum.normalize();for(const i of a.ids)n.setXYZ(i,a.sum.x,a.sum.y,a.sum.z);}n.needsUpdate=true;
}
// Continuous clipped garment edges; all interpolated vertices retain skinning.
export function clipped(source,distances){
 const g=source,p=g.attributes.position,n=g.attributes.normal,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
 const out={p:[],n:[],i:[],w:[]};
 const vertex=i=>({p:V().fromBufferAttribute(p,i),n:V().fromBufferAttribute(n,i),i:Array.from(si.array.slice(i*4,i*4+4)),w:Array.from(sw.array.slice(i*4,i*4+4))});
 const mix=(a,b,t)=>{const sums=new Map();for(const [v,k]of [[a,1-t],[b,t]])v.i.forEach((id,j)=>sums.set(id,(sums.get(id)||0)+v.w[j]*k));const weights=[...sums].sort((a,b)=>b[1]-a[1]).slice(0,4);while(weights.length<4)weights.push([0,0]);const sum=weights.reduce((s,v)=>s+v[1],0);return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),i:weights.map(x=>x[0]),w:weights.map(x=>x[1]/sum)};};
 for(let t=0;t<(g.index?g.index.count:p.count);t+=3){
  let poly=[0,1,2].map(k=>vertex(g.index?g.index.getX(t+k):t+k));
  for(const distance of distances){const next=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],da=distance(a.p),db=distance(b.p);if(da>=0)next.push(a);if((da>=0)!==(db>=0))next.push(mix(a,b,da/(da-db)));}poly=next;}
  for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){out.p.push(...v.p);out.n.push(...v.n);out.i.push(...v.i);out.w.push(...v.w);}
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(out.p,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(out.n,3));result.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(out.i,4));result.setAttribute('skinWeight',new THREE.Float32BufferAttribute(out.w,4));result.computeBoundingSphere();return result;
}
export function referenceWardrobe(top,skin,female){
 if(!top||!skin)return;top.visible=false;
 const frames={};for(const side of ['R','L']){const b=n=>skin.skeleton.bones.find(b=>(b.userData.name||b.name)===n+'.'+side);const elbow=skin.worldToLocal(b('lowerarm01').getWorldPosition(V())),wrist=skin.worldToLocal(b('wrist').getWorldPosition(V())),shoulder=skin.worldToLocal(b('upperarm01').getWorldPosition(V()));frames[side]={elbow,axis:(female?wrist.clone().sub(elbow):elbow.clone().sub(shoulder)).normalize(),cut:female?elbow.distanceTo(wrist)-.016:-.045};}
 const source=skin.geometry.clone();smoothSurface(source);const p=source.attributes.position,n=source.attributes.normal;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x);
  const torso=THREE.MathUtils.clamp((.235-ax)/.055,0,1);
  const ease=THREE.MathUtils.smoothstep(1.49-y,0,.18)*torso;
  x*=1+(female?.16:.10)*ease;
  const envelope=(female?.170:.164)*Math.pow(Math.max(.09,1-(x/.238)**2),.48);
  if(z>.025)z=THREE.MathUtils.lerp(z,Math.max(z+.012,envelope),ease);
  else if(z<.015){
    const waist=.010*Math.exp(-(((y-1.07)/.127)**2));
    const back=((female?.132:.120)-waist)*Math.pow(Math.max(.05,1-(x/.235)**2),.49);
    z=THREE.MathUtils.lerp(z,Math.min(z-.014,-back),ease);
  }
    const f=frames[x>0?'L':'R'];
  const cuffDistance=f.cut-V().set(x,y,z).sub(f.elbow).dot(f.axis);
  const rib=female?1-THREE.MathUtils.smoothstep(cuffDistance,.026,.052):0;
  const sleeveEase=female?.022*(1-rib):.004;
  const puff=.011+sleeveEase*(1-torso);
  p.setXYZ(i,x+n.getX(i)*puff,y+n.getY(i)*puff,z+n.getZ(i)*puff);
 }
 source.computeVertexNormals();
 const neck=v=>{
  // Crewneck or V neck. Back neckline stays higher than the front.
  const front=female?1.448+.045*Math.min(1,(v.x/.075)**2):Math.min(1.49,1.364+Math.abs(v.x)*1.6);
  const h=THREE.MathUtils.lerp(1.484,front,THREE.MathUtils.smoothstep(v.z,.025,.11));
  return h-v.y;
 };
 const g=clipped(source,[v=>v.y-.855,v=>1.505-v.y,neck,v=>{const f=frames[v.x>0?'L':'R'];return Math.max(.205-Math.abs(v.x),f.cut-v.clone().sub(f.elbow).dot(f.axis));}]);
 const material=new THREE.MeshStandardMaterial({color:female?0xc3c2c4:0x343e58,roughness:.96,side:THREE.DoubleSide});
 const mesh=new THREE.SkinnedMesh(g,material);mesh.name=female?'Reference_gray_sweatshirt':'Reference_navy_short_sleeve_scrubs';mesh.position.copy(skin.position);mesh.quaternion.copy(skin.quaternion);mesh.scale.copy(skin.scale);mesh.bind(skin.skeleton,skin.bindMatrix.clone());mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;skin.parent.add(mesh);
 if(!female){
  const inner=clipped(source,[v=>v.y-1.365,v=>1.457-v.y,v=>.071-Math.abs(v.x),v=>v.z-.08]);
  const q=inner.attributes.position;for(let i=0;i<q.count;i++)q.setZ(i,q.getZ(i)-.003);
  const shirt=new THREE.SkinnedMesh(inner,new THREE.MeshStandardMaterial({color:0xf1efeb,roughness:1,side:THREE.DoubleSide}));shirt.name='Reference_white_undershirt';shirt.bind(skin.skeleton,skin.bindMatrix.clone());shirt.frustumCulled=false;skin.parent.add(shirt);
 }
}
