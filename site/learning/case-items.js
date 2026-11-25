export const items = [
  {id:'mortise',title:'踝穴与距骨',prompt:'陈女士下楼时脚尖向下。此时进入踝穴的主要是距骨滑车的哪一部分？',choices:['较宽的前部','较窄的后部','距骨头'],key:1,why:'跖屈时，较窄的滑车后部进入踝穴，骨性嵌合相对减少。结合她描述的内翻动作，再检查外侧稳定性。'},
  {id:'drawer',title:'床旁稳定性检查',prompt:'固定小腿远端并托住足跟向前带动，患侧较健侧前移增多。哪一结构的约束可能减弱？',choices:['距腓前韧带','三角韧带','跟腱'],key:0,why:'距腓前韧带是限制距骨前移的重要结构。还要结合侧间差异、终末感和病史解释检查发现。'},
  {id:'muscle',node:'muscle_match',title:'控制前足落地',prompt:'从足跟接触地面到前足缓缓落下，哪组肌肉在控制这个动作？',choices:['腓肠肌主动加快跖屈','腓骨长肌主动抬起足尖','胫骨前肌等背伸肌制动跖屈'],key:2,why:'这段时间踝在跖屈，背伸肌群提供反向力矩，让前足有控制地落地。注意区分关节运动方向和肌肉用力方向。'},
  {id:'support',node:'gait_events',title:'辨认支撑时相',prompt:'对照两行着地带，竖线所指这一刻属于哪个支撑时相？',choices:['右侧单支撑','双支撑','左侧单支撑'],key:1,why:'右足已经着地，左足尚未离地，两足同时接触地面。连续平地步行时，每个完整周期出现两段双支撑。'},
  {id:'pressure',node:'pressure_compare',title:'解释足底压力',prompt:'陈女士的站立足印中，右侧内侧中足的接触比左侧更宽。怎样记录这项发现？',choices:['红色区域就是韧带损伤部位','中足接触就能确诊扁平足','记录右侧中足接触增宽，结合站立足弓外观和症状判断'],key:2,why:'同一色标显示相对压力，接触范围反映本次站立的足印形态。还需结合查体和症状解释。'}
];
export function el(tag,text,cls){
  const n=document.createElement(tag);
  if(text)n.textContent=text;
  if(cls)n.className=cls;
  return n;
}
export function supportFigure(gait){
  const fig=el('figure',null,'support-figure');
  fig.append(el('figcaption','一个右侧步态周期 · 深色表示着地，竖线为观察时刻'));
  for(const [side,label] of [['right','右足'],['left','左足']]){
    const row=el('div',null,'support-row'),strip=el('div',null,'support-strip');
    strip.setAttribute('role','img');strip.setAttribute('aria-label',label+'在观察时刻'+(gait(.05)[side].contact?'已着地':'未着地'));
    for(let i=0;i<100;i++){const cell=el('i');if(gait((i+.5)/100)[side].contact)cell.className='contact';strip.append(cell);}
    row.append(el('span',label),strip);fig.append(row);
  }
  return fig;
}
export function addPractice(host,nodeId,gait,onAnswer){
  const q=items.find(item=>item.node===nodeId);
  if(!q)return;
  const panel=el('details',null,'case-practice'),result=el('p');
  result.setAttribute('aria-live','polite');panel.append(el('summary','观察练习 · '+q.title),el('p',q.prompt));
  if(q.id==='support')panel.append(supportFigure(gait));
  for(const [i,choice] of q.choices.entries()){
    const btn=el('button',choice);btn.type='button';panel.append(btn);btn.onclick=()=>{
      const correct=i===q.key;
      result.textContent=correct?q.why:({muscle:'再看前足下降时是谁在减速。',support:'看竖线是否同时穿过两条着地带。',pressure:'再区分足印显示的变化和仍需检查的原因。'}[q.id]);
      onAnswer({questionId:q.id,choice:i,correct});
      if(correct)panel.querySelectorAll('button').forEach(b=>b.disabled=true);
    };
  }
  panel.append(result);host.append(panel);
}