// Original schematic views for the visual inspection of standing foot posture.
const postures = [
  {name:'偏旋后', shift:-11, upper:19, lower:3, caption:'跟骨下端向内倾，外踝下方的凹曲较浅。'},
  {name:'中立', shift:0, upper:12, lower:12, caption:'跟骨平分线接近垂直，外踝上、下方的凹曲相近。'},
  {name:'偏旋前', shift:11, upper:5, lower:22, caption:'跟骨下端向外倾，外踝下方的凹曲更深。'}
];
function rearDrawing({shift, upper, lower}){
  const upperCurve = 'M133 12 Q'+(126-upper)+' 48 132 67';
  const lowerCurve = 'M134 78 Q'+(134-lower)+' 89 '+(133+shift)+' 111';
  const outline = 'M81 12 Q88 40 88 55 Q87 61 85 65 Q83 72 88 77 Q94 86 '+(83+shift)+' 111 Q'+(77+shift)+' 136 '+(103+shift)+' 136 Q'+(140+shift)+' 139 '+(133+shift)+' 111 Q'+(134-lower)+' 89 134 78 Q141 72 132 67 Q'+(126-upper)+' 48 133 12';
  return `<svg viewBox="0 0 226 148" role="img" aria-label="右足后面观。蓝线为跟骨平分线，橙线为外踝上下轮廓。">
    <path d="M51 138 H167" stroke="#bccac5"/><path d="${outline}" fill="#ead4ba" stroke="#78675c" stroke-width="1.7"/>
    <path d="M106 20 V136" stroke="#687b76" stroke-dasharray="4 3" fill="none"/>
    <path d="M106 81 L${106+shift} 132" stroke="#146d83" stroke-width="3.5" fill="none"/>
    <path d="${upperCurve} ${lowerCurve}" fill="none" stroke="#9e592d" stroke-width="3"/>
    <g fill="#324e4b" font-family="sans-serif" font-size="11"><text x="8" y="96">跟骨平分线</text><text x="153" y="49">外踝上方</text><text x="153" y="95">外踝下方</text></g>
    <g fill="none" stroke-width="1"><path d="M67 93 L${106+shift*.3} 96" stroke="#146d83"/><path d="M148 45 H${130-upper*.5} M148 92 H${133-lower*.5+shift*.25}" stroke="#9e592d"/></g>
  </svg>`;
}
export function rearFootReference(){
  const panel=document.createElement('details');
  panel.className='posture-reference';
  const title=document.createElement('summary');
  title.textContent='从后面看右足 · 足姿对照';
  const controls=document.createElement('div');
  controls.className='posture-switch';
  const diagram=document.createElement('div');
  const caption=document.createElement('p');
  caption.setAttribute('aria-live','polite');
  function select(index){
    diagram.innerHTML=rearDrawing(postures[index]);
    caption.textContent=postures[index].caption;
    Array.from(controls.children).forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  }
  postures.forEach(({name},i)=>{
    const button=document.createElement('button');
    button.type='button'; button.textContent=name; button.onclick=()=>select(i); controls.append(button);
  });
  const note=document.createElement('small');
  note.textContent='三种姿态用于观察对照。完整的足姿指数需评估六项。';
  panel.append(title,controls,diagram,caption,note);select(1);
  return panel;
}

export function wallReference(){
  const figure=document.createElement('figure');
  figure.className='wall-reference';figure.id='wallReference';
  figure.innerHTML=`<svg viewBox="0 0 400 111" role="img" aria-label="膝触墙时足跟贴地。足跟抬起后应缩短与墙的距离重新测量。">
    <defs><g id="wblt-room"><path d="M17 83 H158 V13" fill="none" stroke="#688178" stroke-width="2"/></g></defs>
    <g transform="translate(9,1)"><use href="#wblt-room"/><path d="M103 2 L152 31 Q156 34 151 39 L103 71 Q102 75 107 76 L138 78 Q146 80 143 83 H87 Q81 83 83 76 L88 65 L134 33 L88 13" fill="#ead3b9" stroke="#786b64" stroke-width="1.7"/><path d="M85 82 H103" stroke="#17695d" stroke-width="4"/><text x="85" y="102" text-anchor="middle">足跟贴地</text></g>
    <g transform="translate(204,1)"><use href="#wblt-room"/><path d="M110 2 L153 32 Q157 35 151 41 L102 63 Q97 66 104 70 L139 79 Q146 82 141 83 L119 83 L83 72 Q78 70 83 62 L91 55 L134 34 L95 14" fill="#ead3b9" stroke="#786b64" stroke-width="1.7"/><path d="M84 74 V82 M81 74 H87 M81 82 H87" stroke="#a74a2e" stroke-width="2"/><text x="91" y="102" text-anchor="middle">足跟抬起 · 重新测量</text></g>
  </svg><figcaption>侧面看足跟，正面看膝盖是否朝第二趾移动。</figcaption>`;
  return figure;
}
