import * as T from 'three';

export const muscles={
  "fibLong": {
    "name": "腓骨长肌",
    "origin": "腓骨头及腓骨外侧面上部，邻近肌间隔。",
    "insertion": "内侧楔骨及第 1 跖骨底的足底面。",
    "route": "肌腱绕过外踝后方，经骰骨沟斜穿足底。",
    "voice": "腓骨长肌起于腓骨头和腓骨外侧面上部。肌腱绕过外踝后方，经骰骨沟斜穿足底，止于内侧楔骨和第一跖骨底。"
  },
  "fibBrevis": {
    "name": "腓骨短肌",
    "origin": "腓骨外侧面下三分之二及邻近肌间隔。",
    "insertion": "第 5 跖骨底粗隆，在足的外侧。",
    "route": "肌腹位于长肌深面。两条肌腱都绕过外踝后方，短肌腱在长肌腱前方。",
    "voice": "腓骨短肌位于长肌深面，起于腓骨外侧面下三分之二。肌腱从外踝后方绕过，止于第五跖骨底粗隆。"
  }
};
export const eversionCue="小腿固定时，肌腱沿箭头方向牵拉足部，使足底朝外侧转动。落脚时，这两块肌肉也能通过离心收缩，减缓足继续内翻。";

// Points on the right BodyParts3D surfaces, in the same Y-up metres as foot-atlas.
const paths={
  fibLong:[[-.089,-.042,.136],[-.093,-.043,.116],[-.101,-.050,.099],[-.100,-.048,.080],[-.089,-.031,.060],[-.086,-.019,.052],[-.089,0,.049],[-.101,.055,.051],[-.107,.130,.049],[-.112,.205,.052],[-.115,.300,.058],[-.113,.342,.064]],
  fibBrevis:[[-.116,-.053,.094],[-.107,-.047,.084],[-.095,-.037,.070],[-.087,-.027,.060],[-.085,-.018,.055],[-.085,0,.051],[-.091,.053,.052],[-.101,.131,.052],[-.104,.179,.062]]
};
const palette={fibLong:0xb9513b,fibBrevis:0xcb901c};
const fixedBones=new Set(['patella','distalFemur']);
export function buildLegLayer(scene,stage){
  const fixed=new T.Bone(),moving=new T.Bone();
  scene.add(fixed,moving);
  const skeleton=new T.Skeleton([fixed,moving]);
  const shift=new T.Matrix4(),footTransform=new T.Matrix4();
  const tissue=new Map();
  function weight(y){return 1-T.MathUtils.smoothstep(y,-.034,.035);}
  function add(part,geometry){
    const isBone=fixedBones.has(part.key),target=part.key in muscles;
    const color=isBone?0xe1cfac:palette[part.key]??(part.key==='achilles'?0xe7d4a8:0xc29785);
    const material=new T.MeshStandardMaterial({color,roughness:.83,side:T.DoubleSide});
    let mesh;
    if(isBone){mesh=new T.Mesh(geometry,material);}
    else{
      const pos=geometry.getAttribute('position'),indices=new Uint16Array(pos.count*4),weights=new Float32Array(pos.count*4);
      for(let i=0;i<pos.count;i++){
        const w=weight(pos.getY(i));indices[i*4+1]=1;weights[i*4]=1-w;weights[i*4+1]=w;
      }
      geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
      geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
      mesh=new T.SkinnedMesh(geometry,material);mesh.bind(skeleton,new T.Matrix4());mesh.frustumCulled=false;
    }
    mesh.name=part.name;mesh.visible=false;mesh.userData={target,isBone};scene.add(mesh);tissue.set(part.key,mesh);
  }
  const ink=0x006d78,group=new T.Group();scene.add(group);group.visible=false;
  const glow=new T.LineBasicMaterial({color:ink,depthTest:false,depthWrite:false});
  const line=new T.Line(new T.BufferGeometry(),glow);line.frustumCulled=false;line.renderOrder=9;group.add(line);
  const arrows=[0,1,2].map(()=>{
    const cone=new T.Mesh(new T.ConeGeometry(.0045,.014,14),new T.MeshBasicMaterial({color:ink,depthTest:false,depthWrite:false}));
    cone.renderOrder=10;group.add(cone);return cone;
  });
  const labels=['起点','止点'].map((text,i)=>{
    const wrap=document.createElement('div');wrap.className='fib-pin';wrap.hidden=true;
    const tag=document.createElement('span');tag.textContent=text;const stem=document.createElement('i');
    wrap.append(stem,tag);stage.append(wrap);
    const dot=new T.Mesh(new T.SphereGeometry(.0036,14,10),new T.MeshBasicMaterial({color:i?0x2467a1:0x8b3d27,depthTest:false,depthWrite:false}));
    dot.renderOrder=11;group.add(dot);return {wrap,dot};
  });
  let key='fibLong',points=[],enabled=false,all=false;
  const position=new T.Vector3(),up=new T.Vector3(0,1,0),dir=new T.Vector3();
  function syncMaterials(){
    for(const [id,mesh] of tissue){
      const target=mesh.userData.target;
      const contextOpacity=all ? .94 : .23;
      const opacity=target ? (id===key ? 1 : .42) : (mesh.userData.isBone ? 1 : contextOpacity);
      mesh.visible=enabled;mesh.material.transparent=opacity<1;mesh.material.opacity=opacity;mesh.material.depthWrite=opacity===1;
      mesh.renderOrder=target?(id===key?3:2):0;
    }
  }
  function update(rear,pivot,camera){
    if(!enabled)return;
    footTransform.copy(rear.matrixWorld).multiply(shift.makeTranslation(-pivot.x,-pivot.y,-pivot.z));
    footTransform.decompose(moving.position,moving.quaternion,moving.scale);moving.updateMatrixWorld();
    for(let i=0;i<points.length;i++){
      const p=points[i],m=p.rest;
      p.draw.copy(m).applyMatrix4(footTransform).lerp(m,1-weight(m.y));
      line.geometry.attributes.position.setXYZ(i,p.draw.x,p.draw.y,p.draw.z);
    }
    line.geometry.attributes.position.needsUpdate=true;
    const indices=key==='fibLong'?[1,4,8]:[1,3,6];
    arrows.forEach((arrow,i)=>{const j=indices[i];dir.subVectors(points[j+1].draw,points[j].draw).normalize();arrow.position.copy(points[j].draw).lerp(points[j+1].draw,.48);arrow.quaternion.setFromUnitVectors(up,dir);});
    labels.forEach(({wrap,dot},i)=>{
      dot.position.copy(points[i?0:points.length-1].draw);position.copy(dot.position).project(camera);
      wrap.hidden=Math.abs(position.x)>.97||Math.abs(position.y)>.96;
      wrap.style.left=(50+50*position.x)+'%';wrap.style.top=(50-50*position.y)+'%';
      wrap.classList.toggle('pin-left',position.x>.40);
    });
  }
  function select(id){
    key=id;points=paths[key].map(x=>({rest:new T.Vector3(...x),draw:new T.Vector3()}));
    line.geometry.dispose();line.geometry=new T.BufferGeometry();line.geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(points.length*3),3));
    syncMaterials();
  }
  function visible(value){enabled=value;group.visible=value;if(!value)labels.forEach(p=>p.wrap.hidden=true);syncMaterials();}
  select(key);
  return {add,select,visible,update,context(value){all=value;syncMaterials();},dispose(){skeleton.dispose();labels.forEach(p=>p.wrap.remove());}};
}
