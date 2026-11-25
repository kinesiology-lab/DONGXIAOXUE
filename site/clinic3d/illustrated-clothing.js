import * as THREE from 'three';

const fabrics=new Map();
const clamp=THREE.MathUtils.clamp;
const smooth=THREE.MathUtils.smoothstep;
const directory=new URL('./assets/reference-characters/',import.meta.url);

// Register the three drawings once while the actor is facing forwards in its
// neutral stance. The resulting texture coordinates follow the rig in every pose.
export async function dressFromDrawings(actor,role) {
  if(!fabrics.has(role)){
    fabrics.set(role,new THREE.TextureLoader().loadAsync(new URL(role+'-fabric-v40.webp',directory).href)
      .then(map=>{map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;})
      .catch(()=>{fabrics.delete(role);return null;}));
  }
  const map=await fabrics.get(role);
  if(!map)return;
  const patient=role==='patient';
  actor.updateMatrixWorld(true);
  const point=new THREE.Vector3(),normalTip=new THREE.Vector3(),origin=new THREE.Vector3();
  actor.traverse(mesh=>{
    const top=/^Reference_(gray_sweatshirt|navy_short_sleeve_scrubs)$/.test(mesh.name);
    if(!top&&!['Patient_Shorts','Authored_clinician_trouser_shell'].includes(mesh.name))return;
    const g=mesh.geometry,positions=g.attributes.position,uv=[],sideUV=[],backUV=[],mix=[],sleeves=[];
    const armBones=mesh.skeleton.bones.map(b=>/upperarm|lowerarm|wrist/.test(b.userData.name||b.name));
    const joints=g.attributes.skinIndex,weights=g.attributes.skinWeight;
    const tile=(x,y,col)=>[(col+clamp(x,.012,.988))/3,1-((top?0:1)+clamp(y,.008,.992))/3];
    for(let i=0;i<positions.count;i++){
      mesh.getVertexPosition(i,point);
      mesh.localToWorld(point);
      const {x,y,z}=point,ax=Math.abs(x);
      let u,side,down,sleeve=0,sleeveU=.5,sleeveZ=.5,sleeveV=.5;
      if(top){
        // Separate the sleeve from the flank so the far side of the arm does
        // not inherit the centre back or a projected chest pocket.
        for(let k=0;k<4;k++)if(armBones[joints.getComponent(i,k)])sleeve+=weights.getComponent(i,k);
        sleeve=smooth(sleeve,.18,.82);
        const sleeveX=THREE.MathUtils.lerp(.229,.186,clamp((y-.87)/.50,0,1));
        u=.5+x/(patient?.400:.393);
        side=.5+(patient?-1:1)*(z-.024)/.337;
        down=(1.489-y)/.634;
        sleeveU=.5+(ax-sleeveX)/.119;
        sleeveZ=.5+(patient?-1:1)*(z-.026)/.125;
        sleeveV=(1.448-y)/(patient?.559:.303);
      }else{
        const cx=Math.sign(x)*THREE.MathUtils.lerp(.124,.104,smooth(y,.36,.84));
        const cz=.014+.041*Math.exp(-(((y-.48)/.18)**2));
        u=.5-(ax-Math.abs(cx))/.172;
        side=.5+(patient?-1:1)*(z-cz)/.20;
        down=(.876-y)/.808;
      }
      // Weight each drawing by the actual oriented surface in this stance.
      // This also distinguishes the outside of a sleeve from the side of the
      // torso behind it. Skin transforms include the per-vertex joint weights.
      origin.fromBufferAttribute(positions,i);
      normalTip.fromBufferAttribute(g.attributes.normal,i).multiplyScalar(.01).add(origin);
      mesh.applyBoneTransform(i,origin);mesh.applyBoneTransform(i,normalTip);
      mesh.localToWorld(origin);mesh.localToWorld(normalTip);
      normalTip.sub(origin).normalize();
      const lateral=Math.pow(Math.abs(normalTip.x),2.5),longitudinal=Math.pow(Math.abs(normalTip.z),2.5);
      const frontBack=longitudinal/(lateral+longitudinal+.004);
      uv.push(...tile(u,down,0));sideUV.push(...tile(side,down,1));backUV.push(...tile(top?1-u:u,down,2));
      mix.push(normalTip.z>0?frontBack:0,normalTip.z<0?frontBack:0);
      sleeves.push(clamp(sleeveU,.012,.988),clamp(sleeveZ,.012,.988),clamp(sleeveV,.009,.991),sleeve);
    }
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setAttribute('sideUV',new THREE.Float32BufferAttribute(sideUV,2));
    g.setAttribute('backUV',new THREE.Float32BufferAttribute(backUV,2));
    g.setAttribute('viewWeights',new THREE.Float32BufferAttribute(mix,2));
    g.setAttribute('sleeveCoord',new THREE.Float32BufferAttribute(sleeves,4));
    const material=new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide,toneMapped:false});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec2 sideUV,backUV,viewWeights; attribute vec4 sleeveCoord; varying vec4 sleeveMap; varying vec2 sideCoord,backCoord,viewMix;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsideCoord=sideUV;backCoord=backUV;viewMix=viewWeights;sleeveMap=sleeveCoord;');
      shader.fragmentShader='varying vec2 sideCoord,backCoord,viewMix;varying vec4 sleeveMap;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
        vec3 fabric=texture2D(map,sideCoord).rgb*(1.-viewMix.x-viewMix.y)
                  +texture2D(map,vMapUv).rgb*viewMix.x+texture2D(map,backCoord).rgb*viewMix.y;
        if(sleeveMap.w>.001){
          float v=(1.-sleeveMap.z)/3.;
          vec3 sleeve=texture2D(map,vec2(sleeveMap.x/3.,v)).rgb*viewMix.x
                    +texture2D(map,vec2((1.+sleeveMap.y)/3.,v)).rgb*(1.-viewMix.x-viewMix.y)
                    +texture2D(map,vec2((2.+sleeveMap.x)/3.,v)).rgb*viewMix.y;
          fabric=mix(fabric,sleeve,sleeveMap.w);
        }
        diffuseColor.rgb*=fabric*(.91+.09*viewMix.x);
      `).replace('#include <opaque_fragment>','outgoingLight=mix(diffuseColor.rgb,outgoingLight,.27);\n#include <opaque_fragment>');
    };
    mesh.material=material;
  });
}
