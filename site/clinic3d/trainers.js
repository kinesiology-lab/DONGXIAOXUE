import * as THREE from 'three';

// z, half width, upper height. The collar sits behind the instep, and the
// rubber sole turns up at the toe. Each shoe remains a removable ankle prop.
const sections=[
  [-.084,.019,.084],[-.074,.042,.100],[-.052,.057,.113],[-.024,.058,.110],
  [.006,.055,.112],[.034,.054,.105],[.067,.058,.088],[.100,.063,.067],
  [.135,.066,.048],[.171,.064,.039],[.202,.055,.032],[.223,.036,.025],[.231,.005,.014]
];
const point=(x,y,z)=>new THREE.Vector3(x,y,z);
function contour(z){
  let i=1;while(i<sections.length-1&&z>sections[i][0])i++;
  const a=sections[i-1],b=sections[i],t=THREE.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1);
  return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t)];
}
const floor=z=>-.003+.005*THREE.MathUtils.smoothstep(z,.17,.232);
// Pivot about the lowest point on the actual tilted outsole. Positions use
// the trainer's bind frame, the same ground frame as the actor's rest ankle.
export function trainerRocker(ankle,pitch,clearance){
  const c=Math.cos(pitch),s=Math.sin(pitch);
  let lowest=Infinity,forwardOffset=0;
  for(const [z] of sections){
    const dy=floor(z)-.0004-ankle.y,dz=z-ankle.z;
    const height=dy*c+dz*s;
    if(height<lowest){
      lowest=height;
      forwardOffset=dz-(-dy*s+dz*c);
    }
  }
  return {height:-lowest+clearance-ankle.y,forwardOffset};
}
function surface(z,u){
  const [w,h]=contour(z);
  return point(w*u,floor(z)+.016+h*Math.pow(Math.max(0,1-u*u),.62),z);
}
function strip(points,indices,material){
  const g=new THREE.BufferGeometry().setFromPoints(points);g.setIndex(indices);g.computeVertexNormals();
  return new THREE.Mesh(g,material);
}
function piping(group,pts,r,mat){
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),18,r,5,false),mat));
}
export function makeTrainer(patient){
  const group=new THREE.Group();
  const upper=new THREE.MeshStandardMaterial({color:patient?0xe9e8e5:0x30343d,roughness:.93,side:THREE.DoubleSide});
  const rubber=new THREE.MeshStandardMaterial({color:0xe6e5e2,roughness:.97,side:THREE.DoubleSide});
  const seam=new THREE.MeshStandardMaterial({color:patient?0xaaa9a8:0x53565d,roughness:.93});
  const lace=new THREE.MeshStandardMaterial({color:patient?0xe5e2df:0x242832,roughness:1});
  const p=[],indices=[],n=24;
  for(let i=0;i<sections.length;i++)for(let j=0;j<=n;j++){
    p.push(surface(sections[i][0],Math.sin((j/n-.5)*Math.PI)));
    if(i&&j){const k=i*(n+1)+j;indices.push(k-n-2,k-1,k,k-n-2,k,k-n-1);}
  }
  for(const i of [0,sections.length-1]){
    const base=p.length,z=sections[i][0];p.push(point(0,floor(z)+.016,z));
    for(let j=0;j<n;j++)indices.push(base,i*(n+1)+j,i*(n+1)+j+1);
  }
  const shell=strip(p,indices,upper);shell.name='Shoe_upper';group.add(shell);
  const edge=[...sections.map(([z,w])=>[w,z]),...sections.slice().reverse().map(([z,w])=>[-w,z])];
  const rim=[],idx=[];
  for(const [x,z] of edge)rim.push(point(x*.97,floor(z),z),point(x*1.015,floor(z)+.017,z));
  for(let j=0;j<edge.length;j++){const i=j*2,k=(i+2)%rim.length;idx.push(i,i+1,k,k,i+1,k+1);}
  for(let j=1;j<edge.length-1;j++)idx.push(0,j*2,(j+1)*2,1,(j+1)*2+1,j*2+1);
  const sole=strip(rim,idx,rubber);
  sole.geometry=sole.geometry.toNonIndexed();sole.geometry.computeVertexNormals();group.add(sole);
  const tread=new THREE.MeshStandardMaterial({color:patient?0x56565a:0x292c32,roughness:1,side:THREE.DoubleSide});
  const sidewall=rim.map((p,i)=>point(p.x*1.003,i%2?floor(p.z)+.004:floor(p.z)-.0004,p.z));
  group.add(strip(sidewall,idx,tread));
  for(const side of [-1,1]){
    const line=[[-.067,.72],[-.037,.84],[.015,.78],[.068,.63],[.112,.62],[.143,.79]];
    piping(group,line.map(([z,u])=>surface(z,u*side)),.0015,seam);
    const overlay=[[-.068,.91],[-.042,.74],[.004,.72],[.044,.65],[.082,.75],[.049,.87],[-.013,.94],[-.068,.91]];
    piping(group,overlay.map(([z,u])=>surface(z,u*side)),.0019,seam);
  }
  for(const z of [.053,.073,.093,.113]){
    for(const dir of [-1,1]){
      const points=[surface(z,dir*.51),surface(z+.006,0),surface(z+.013,-dir*.47)];
      for(const p of points)p.y+=.0018;
      piping(group,points,.0024,lace);
    }
  }
  piping(group,[-.85,-.50,0,.50,.85].map(u=>surface(.149-.015*u*u,u)),.0014,seam);
  return group;
}
