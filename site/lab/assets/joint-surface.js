/* The skin is the registered BodyParts3D FJ2810 surface in the same coordinates as the bones. */
(function(g){
 'use strict';
 const zones={foot:['shank'],ankle:['shank'],knee:['shank','thigh'],lower:['shank','thigh','pelvis'],hand:['forearm'],upper:['arm','forearm'],elbow:['arm','forearm'],shoulder:['arm','forearm'],trunk:['trunk','pelvis']};
 class JointSurface{
  constructor(stage){
   this.stage=stage;this.enabled=false;this.opacity=1;this.bindings=[];
  }
  supports(action){return ['native','contraction'].includes(action.kind)&&!!zones[this.stage.region(action)];}
  visible(part){
   const st=this.stage,a=st.action;
   if(!this.enabled||st.mode!=='native'||!this.supports(a))return false;
   const region=st.region(a);
   return zones[region].includes(part.skinRegion)&&(region==='trunk'||part.side===(a.side||'right'));
  }
  async toggle(){
   if(this.enabled){this.enabled=false;return;}
   this.enabled=true;
   if(this.bindings.length)return;
   try{await (this.pending??=this.load());}
   catch(error){this.enabled=false;throw error;}
   finally{this.pending=null;}
  }
  async load(){
   const fetchFile=async file=>{
    const response=await fetch(new URL('assets/joint-skin.'+file,document.baseURI));
    if(!response.ok)throw Error('皮肤模型未载入');
    return file==='json'?response.json():response.arrayBuffer();
   };
   const [meta,raw]=await Promise.all([fetchFile('json'),fetchFile('bin')]);
   if(raw.byteLength!==meta.bytes)throw Error('皮肤模型未完整载入');
   const st=this.stage,v=st.viewer,first=st.anatomy.parts.length;
   const bindings=meta.parts.map((p,i)=>({index:first+i,points:new Float32Array(raw,p.positions,3*p.vertexCount),normals:new Float32Array(raw,p.normals,3*p.vertexCount),
    joints:new Uint16Array(raw,p.joints,4*p.vertexCount),weights:new Float32Array(raw,p.weights,4*p.vertexCount),
    posed:new Float32Array(3*p.vertexCount),directions:new Float32Array(3*p.vertexCount)}));
   v.addDataset('surface',{parts:meta.parts},raw);
   v.datasets.clean.meshes.push(...v.datasets.surface.meshes);
   st.anatomy.parts.push(...meta.parts);
   this.bindings=bindings;
  }
  pose(matrices){
   if(!this.enabled)return;
   const v=this.stage.viewer;
   for(const binding of this.bindings){
    const {index,points,normals,joints,weights,posed,directions}=binding;
    if(!v.visible[index])continue;
    for(let p=0,j=0;p<points.length;p+=3,j+=4){
     const x=points[p],y=points[p+1],z=points[p+2],nx=normals[p],ny=normals[p+1],nz=normals[p+2];
     let px=0,py=0,pz=0,dx=0,dy=0,dz=0;
     for(let k=0;k<4;k++){
      const w=weights[j+k];if(!w)continue;
      const m=matrices[joints[j+k]];
      px+=w*(m[0]*x+m[4]*y+m[8]*z+m[12]);py+=w*(m[1]*x+m[5]*y+m[9]*z+m[13]);pz+=w*(m[2]*x+m[6]*y+m[10]*z+m[14]);
      dx+=w*(m[0]*nx+m[4]*ny+m[8]*nz);dy+=w*(m[1]*nx+m[5]*ny+m[9]*nz);dz+=w*(m[2]*nx+m[6]*ny+m[10]*nz);
     }
     posed[p]=px;posed[p+1]=py;posed[p+2]=pz;directions[p]=dx;directions[p+1]=dy;directions[p+2]=dz;
    }
    const mesh=v.meshes[index];
    if(v.software){mesh.p=posed;mesh.n=directions;}
    else{
     const gl=v.gl;
     gl.bindBuffer(gl.ARRAY_BUFFER,mesh.p);gl.bufferSubData(gl.ARRAY_BUFFER,0,posed);
     gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.bufferSubData(gl.ARRAY_BUFFER,0,directions);
    }
   }
  }
 }
 g.JointSurface=JointSurface;
})(window);
