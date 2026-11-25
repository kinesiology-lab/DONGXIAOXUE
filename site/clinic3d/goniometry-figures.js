// Diagrams use the same ankle origin, scale and rotation as the registered foot frames.
const patient='#56796e',farLeg='#9bb1a8',therapist='#276486',cuff='#4284a1';
const rad=degrees=>degrees*Math.PI/180;
function stroke(g,points,width,color){
 g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
 g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();
}
function head(g,x,y,color,front){
 g.fillStyle=color;g.beginPath();g.ellipse(x,y,6.4,7.4,0,0,Math.PI*2);g.fill();
 g.beginPath();g.moveTo(x+front*4,y-1);g.lineTo(x+front*8,y+1);g.lineTo(x+front*4,y+3);g.fill();
}
function rotate(x,y,a){return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];}
export function drawPosture(g,trial,angle){
 const seated=trial.move.sagittal,assisted=trial.mode==='被动';
 g.save();g.translate(14,66);
 const bed='#a9c1b9',edge='#7e9e92';
 let ankle,tip;
 if(seated){
  stroke(g,[[5,53],[61,53]],5,bed);stroke(g,[[10,56],[10,90]],3,edge);
  stroke(g,[[56,56],[56,90]],3,edge);
  stroke(g,[[30,47],[57,48],[60,77],[71,78]],6,farLeg);
  ankle=[66,82];const a=rad((trial.move.key==='up'?-1:1)*angle);
  const [dx,dy]=rotate(15,1,a);tip=[ankle[0]+dx,ankle[1]+dy];
  head(g,32,8,patient,1);stroke(g,[[31,19],[28,35],[30,46]],12,patient);
  stroke(g,[[30,46],[64,46],[...ankle]],8,patient);
  stroke(g,[ankle,tip],5,patient);stroke(g,[[34,24],[43,37],[56,42]],4,'#79968a');
 }else{
  stroke(g,[[2,54],[96,54]],6,bed);stroke(g,[[10,58],[10,90]],3,edge);stroke(g,[[90,58],[90,90]],3,edge);
  head(g,10,39,patient,-1);stroke(g,[[23,43],[44,45],[54,45]],12,patient);
  stroke(g,[[22,42],[16,48],[5,46]],4,farLeg);
  stroke(g,[[52,45],[74,44],[98,46],[99,58]],6,farLeg);
  ankle=[103,47];tip=[105,62];stroke(g,[[53,46],[77,46],ankle],7,patient);
  stroke(g,[ankle,tip],5,patient);
 }
 if(assisted){
  const x=seated?105:132,y=seated?46:18;
  head(g,x-3,y,therapist,-1);
  stroke(g,[[x,y+12],[x+5,y+28]],10,therapist);
  if(seated){
   stroke(g,[[x+5,y+28],[x-5,y+29],[x-3,91],[x-10,91]],5,therapist);
   stroke(g,[[x+7,y+28],[x+14,y+31],[x+17,91],[x+11,91]],5,cuff);
   stroke(g,[[x-1,y+12],[x-16,y+18],[ankle[0],ankle[1]-9]],4,cuff);
   stroke(g,[[x+2,y+14],[x-6,y+29],tip],4,therapist);
  }else{
   stroke(g,[[x+4,y+27],[x+1,65],[x-2,86],[x-8,86]],5,cuff);
   stroke(g,[[x+6,y+27],[x+13,68],[x+14,87],[x+7,87]],5,therapist);
   stroke(g,[[x-2,y+13],[x-17,y+21],[95,45]],4,cuff);
   stroke(g,[[x+2,y+15],[x-5,y+29],[104,54]],4,therapist);
  }
 }
 g.font='13px "Microsoft YaHei", sans-serif';g.fillStyle=patient;g.fillText('患者',13,110);
 if(assisted){g.fillStyle=therapist;g.fillText('治疗师',93,110);}
 g.restore();
}
const outline=new Path2D('M 63 7 L 44 6 Q 34 2 26 0 L 9 -2 Q 1 -3 0 0 Q -1 3 6 4 L 17 6 L 5 5 Q -1 5 0 9 Q 0 11 6 12 L 17 13 L 8 13 Q 3 13 4 16 Q 4 19 10 20 L 21 20 L 15 20 Q 11 21 13 24 Q 15 26 21 26 L 32 26 Q 42 28 49 22 L 64 25 Z');
const thumb=new Path2D('M 41 10 Q 35 4 28 0 L 21 -7 Q 18 -10 15 -8 Q 12 -5 15 -1 L 22 9 Q 26 14 31 15');
function glove(g){
 g.lineJoin='round';g.lineWidth=1.05;g.strokeStyle='#397781';
 const shade=g.createLinearGradient(0,-7,3,29);shade.addColorStop(0,'#e4f5f2');shade.addColorStop(1,'#92c5cb');
 g.fillStyle=shade;g.fill(outline);g.stroke(outline);g.fill(thumb);g.stroke(thumb);
 stroke(g,[[53,7],[52,22]],2,'#548f99');
}
const maskCache=new WeakMap();
function edgeAtForefoot(image,tile,angle,plantar){
 const cache=maskCache.get(image)||new Map();maskCache.set(image,cache);
 if(!cache.has(tile)){
  const c=document.createElement('canvas');c.width=328;c.height=329;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,tile%8*328,Math.floor(tile/8)*329,328,329,0,0,328,329);
  cache.set(tile,ctx.getImageData(0,0,328,329).data);
 }
 const pixels=cache.get(tile),a=rad(angle);
 // Cross the metatarsal heads on the current skin outline from sole or dorsum.
 for(let k=0;k<=105;k++){
  const y=plantar?62-k:-43+k;
  const [x0,y0]=rotate(-106,y,a),x=Math.round(x0+188),py=Math.round(y0+162);
  if(pixels[(py*328+x)*4+3]>150)return [x0,y0];
 }
 return rotate(-106,plantar?31:0,a);
}
const heelGrip=new Path2D('M -57 23 L -40 20 Q -32 11 -29 -1 L -26 -13 Q -25 -18 -21 -16 Q -18 -14 -19 -8 L -20 1 Q -20 9 -11 12 Q 2 17 13 10 Q 17 7 18 2 L 18 -9 Q 18 -13 22 -13 Q 25 -13 25 -8 L 26 2 Q 27 14 19 21 Q 11 30 -7 31 L -27 30 L -52 39 Z');
export function drawPassiveHands(g,{image,tile,angle,lateral,up}){
 // Stabilizing hand stays above the malleoli; the distal hand follows the foot.
 g.save();g.translate(10,-48);g.rotate(-.19);g.scale(.87,.87);glove(g);g.restore();
 g.save();
 if(lateral){
  const [x,y]=edgeAtForefoot(image,tile,angle,up);
  g.translate(x,y);g.rotate(rad(angle));g.scale(-.86,up?.86:-.86);glove(g);
 }else{
  g.rotate(-rad(angle));g.translate(2,45);
  g.fillStyle='#a6d1d4';g.strokeStyle='#397781';g.lineWidth=1.3;g.lineJoin='round';
  g.fill(heelGrip);g.stroke(heelGrip);stroke(g,[[-45,23],[-40,34]],2,'#548f99');
 }
 g.restore();
}
