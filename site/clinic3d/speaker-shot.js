import * as THREE from 'three';
// Render with an independent camera so review/orbit and clinical framing survive each cut.
export function speakerShot(){
 const cam=new THREE.PerspectiveCamera(36,1,.025,25),center=new THREE.Vector3(),eye=new THREE.Vector3(),up=new THREE.Vector3(),cache=new WeakMap();
 return function(role,actors,base,render,high=true){
  const actor=actors?.[role];if(!actor)return false;
  let face=cache.get(actor);if(!face){face=actor.root.getObjectByName('Reference_face_'+role);if(!face)return false;cache.set(actor,face);}
  face.updateWorldMatrix(true,false);face.localToWorld(center.set(0,1.64,.055));
  face.localToWorld(eye.set(role==='patient'?.10:-.10,1.69,1.02));face.localToWorld(up.set(0,1.78,.055)).sub(center).normalize();
  cam.aspect=base.aspect;cam.position.copy(eye);cam.up.copy(up);
  if(high)center.addScaledVector(up,-.105);cam.lookAt(center);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
  const other=actors[role==='patient'?'therapist':'patient']?.root;
  const visible=actor.root.visible,otherVisible=other?.visible;
  actor.root.visible=true;
  if(other)other.visible=false;
  try{render(cam);}finally{
   actor.root.visible=visible;
   if(other)other.visible=otherVisible;
  }
  return true;
 };
}
