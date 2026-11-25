// Local rest-space fit shared by the reference head, hair and worn exam mask.
// Scale about the base of the jaw, not the global origin or animated bone pivot.
export function fitHeadObject(object,role){
 const patient=role==='patient';
 const amount=patient?1.19:1.235;
 const pivotY=patient?1.523:1.520,pivotZ=.055;
 object.scale.setScalar(amount);
 object.position.set(0,pivotY*(1-amount)-(patient?.018:.014),pivotZ*(1-amount)-(patient?.004:.003));
}
