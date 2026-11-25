import {Vector3} from 'three';

// Open a sightline only through examiner geometry closer than both hands.
// The rest of the examiner, the patient's skin, and the working hands stay solid.
export function examSightline(examiner) {
  const originals=[], clones=new Map();
  const from={value:new Vector3()},to={value:new Vector3()},near={value:-100};
  examiner.root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    originals.push([mesh,mesh.material]);
    const copy=original=>{
      if(clones.has(original))return clones.get(original);
      const material=original.clone();
      material.onBeforeCompile=function(shader,renderer) {
        original.onBeforeCompile.call(this,shader,renderer);
        Object.assign(shader.uniforms,{examFrom:from,examTo:to,examNear:near});
        shader.vertexShader='varying vec3 examView;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nexamView=mvPosition.xyz;');
        shader.fragmentShader='varying vec3 examView; uniform vec3 examFrom, examTo; uniform float examNear;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if (-examView.z < examNear) {
            vec2 uv=examView.xy/max(.02,-examView.z);
            vec2 a=examFrom.xy/max(.02,-examFrom.z);
            vec2 b=examTo.xy/max(.02,-examTo.z);
            vec2 ab=b-a;
            float t=clamp(dot(uv-a,ab)/max(dot(ab,ab),.000001),0.,1.);
            float distanceToLimb=length(uv-mix(a,b,t))*mix(-examFrom.z,-examTo.z,t);
            float mask=1.-smoothstep(.12,.17,distanceToLimb);
            // Retain a faint screen-door silhouette at the edge of the aperture.
            if(fract(dot(floor(gl_FragCoord.xy),vec2(.7548777,.5698403)))<mask) discard;
          }`);
      };
      material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-exam-sightline';
      clones.set(original,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
  });
  const wrist=new Vector3();
  return {
    update(camera,shin,forefoot) {
      camera.updateMatrixWorld();
      from.value.copy(shin).applyMatrix4(camera.matrixWorldInverse);
      to.value.copy(forefoot).applyMatrix4(camera.matrixWorldInverse);
      let nearest=Math.min(-from.value.z,-to.value.z);
      for(const side of ['L','R']){
        examiner.bones.get('wrist.'+side).getWorldPosition(wrist).applyMatrix4(camera.matrixWorldInverse);
        nearest=Math.min(nearest,-wrist.z);
      }
      near.value=nearest-.065;
    },
    close(){
      for(const [mesh,material] of originals)mesh.material=material;
      for(const m of clones.values())m.dispose();
    }
  };
}
