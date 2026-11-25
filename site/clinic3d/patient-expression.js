import * as THREE from 'three';

// The atlas landmarks use top-down coordinates on the existing patient surface.
// Geometry morphs carry the original brows, lids and lips with the skin.
export function patientFaceMorphs(positions,columns,rows){
  const pain=positions.slice(), worry=positions.slice(), question=positions.slice();
  const spot=(x,y,cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2));
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=i/columns-.5, x=Math.abs(u), y=j/rows, sign=Math.sign(u);
    const k=3*(j*(columns+1)+i);
    const brow=spot(x,y,.050,.462,.040,.031);
    const outer=spot(x,y,.094,.465,.034,.032);
    const upperLid=spot(x,y,.065,.531,.048,.027);
    const lowerLid=spot(x,y,.065,.604,.044,.033);
    const corner=spot(x,y,.047,.802,.026,.031);
    pain[k]-=sign*.0035*brow;
    pain[k+1]+=-.0065*brow-.0048*upperLid+.0034*lowerLid-.0025*corner;
    worry[k]-=sign*.002*brow;
    worry[k+1]+=.0068*brow-.0023*outer+.0018*upperLid-.0041*corner;
    question[k+1]+=(u<0?.0060:-.0018)*(brow+.50*outer);
  }
  return [pain,worry,question].map(positions=>new THREE.BufferAttribute(positions,3));
}

export function expressionForPatientLine(text,context=''){
  if(context==='fear_reply'||/会不会疼|怕|担心|不放心|有点慌|心里发慌|害怕/.test(text))return 'concerned';
  if(/有点疼|疼得不敢|比刚才疼|越来越疼|好疼|更疼了/.test(text))return 'pain';
  if(/会酸胀|一下就疼了|有点紧/.test(text))return 'sore';
  if(context==='injury_question'||/是不是骨头错位|是伤得厉害吗|这个严重吗/.test(text))return 'questioning';
  return 'neutral';
}
