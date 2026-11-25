// Authored visual gait, not measured joint trajectories or a clinical norm.
// The pose uses ordinary body proportions. COM exaggeration belongs to an inset.
const clamp=x=>Math.max(0,Math.min(1,x));
function curve(keys,p){
 for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){
  const [a,va]=keys[i-1],[b,vb]=keys[i],t=clamp((p-a)/(b-a));
  return va+(vb-va)*t*t*(3-2*t);
 }
 return keys.at(-1)[1];
}
export const heelRisePhase = protective => protective ? .24 : .35;
export function footRocker(localPhase,ankleHeight=.0678,protective=false){
 const p=((localPhase%1)+1)%1;
 // Positive pitch means toes above the heel. Terminal stance rolls over forefoot.
 let pitch=curve([[0,15],[.08,0],[heelRisePhase(protective),0],[.45,protective?-9:-3],[.5,-10],[.6,-22],[.68,-14],[.77,0],[.88,0],[1,15]],p)*Math.PI/180;
 if(protective&&pitch<0)pitch*=.55;
 const contact=p<.6;
 const clearance=contact?0:curve([[.6,0],[.65,.034],[.71,.079],[.79,.052],[.87,.034],[.94,.022],[1,0]],p);
 const pivot=pitch>=0?-.065:.180;
 const y=ankleHeight*Math.cos(pitch)-pivot*Math.sin(pitch)+clearance;
 const z=pivot-(ankleHeight*Math.sin(pitch)+pivot*Math.cos(pitch));
 const label=p<.08?'脚跟接触，脚掌逐渐落下':p<heelRisePhase(protective)?'全脚掌承重，身体向前经过':p<.5?'脚跟抬起，前脚掌支撑':p<.6?'准备离地':p<.77?'屈膝提脚，向前摆动':p<.88?'脚尖抬起，避免拖地':'膝逐渐伸展，准备再次落脚';
 return {pitch,ankleHeight:y,forwardOffset:z,clearance,contact,label};
}
export function applyWalkingPose(sample){
 const pose={...sample,visualGait:'heel-toe-v27',reference:{...sample.reference}};
 for(const side of ['right','left']){
  const limb=sample[side];
  // Fit heel loading and toe-off to this limb's actual support interval.
  const rockerPhase = limb.contact ? .6*limb.stageProgress : .6+.4*limb.stageProgress;
  const protective=side===sample.protectiveSide;
  const rocker=footRocker(rockerPhase,.0678,protective);
  // Bring the swinging leg forward earlier from the hip, preserving both contact positions.
  const hipLead=protective&&!limb.contact?.055*Math.sin(Math.PI*limb.stageProgress)**2:0;
  pose[side]={...limb,rocker,foot:{...limb.foot,forward:limb.foot.forward+rocker.forwardOffset+hipLead,height:rocker.ankleHeight-.0678,pitch:rocker.pitch}};
 }
 return pose;
}
