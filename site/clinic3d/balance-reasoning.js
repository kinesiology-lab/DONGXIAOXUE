import {balanceTrials} from './balance-conditions.js?v=72';

// Area of the 95% bivariate covariance ellipse, with axes in millimetres.
function dispersion(points) {
  const xs=points.map(p=>p[1]), ys=points.map(p=>p[2]), n=points.length;
  const mean=a=>a.reduce((sum,v)=>sum+v,0)/n;
  const mx=mean(xs),my=mean(ys);
  let xx=0, yy=0, xy=0;
  for (const [,x,y] of points) {
    xx+=(x-mx)**2; yy+=(y-my)**2; xy+=(x-mx)*(y-my);
  }
  const range=a=>Math.max(...a)-Math.min(...a);
  return {ml:range(xs),ap:range(ys),area:Math.PI*5.991*Math.sqrt(Math.max(0,xx*yy-xy*xy))/(n-1)};
}
const scores={open:dispersion(balanceTrials.open),closed:dispersion(balanceTrials.closed)};
const axes={ap:'前后摆动',ml:'左右摆动',both:'两个方向都要考虑'};
export function balanceReasoning({stepBook,button,record,refresh}) {
  const panel=document.createElement('section');panel.className='balance-reason';
  const field=document.createElement('fieldset'), title=document.createElement('legend');
  title.textContent='闭眼后轨迹面积增大是结果。结合右踝背伸受限和外翻抗阻较弱，你认为哪个方向的晃动最能从运动学上解释？为什么？';
  const table=document.createElement('table');
  table.innerHTML='<caption>本例双足站立 30 秒 · 教学模拟</caption><thead><tr><th>条件</th><th>左右幅度<br>mm</th><th>前后幅度<br>mm</th><th>95% 椭圆面积<br>mm²</th></tr></thead>';
  for (const [key,label] of [['open','睁眼'],['closed','闭眼']]) {
    const tr=table.insertRow();tr.insertCell().textContent=label;
    for(const metric of ['ml','ap','area'])tr.insertCell().textContent=scores[key][metric].toFixed(1);
  }
  panel.append(table,field);field.append(title);
  const saved=stepBook.get('copReason72'),draft=stepBook.get('copReasonDraft72')||{};
  const reason=document.createElement('textarea');reason.rows=2;reason.maxLength=600;
  const why=document.createElement('label');why.textContent='写下理由，引用一项查体发现和一项轨迹数据。';why.append(reason);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  let axis=saved?.axis||draft.axis||'';
  const submit=button('提交方向与理由',()=>{
    if (!axes[axis] || !reason.value.trim() || stepBook.get('copReason72')) return;
    const answer={axis,reason:reason.value.trim()};
    stepBook.set('copReason72',answer);stepBook.delete('copReasonDraft72');stepBook.set('cop71_interpreted',true);
    record('clinic3d_static_balance_reasoning',{...answer,source:'bilateral-simulated-COP'});
    refresh();review();
  });
  function saveDraft(){
    stepBook.set('copReasonDraft72',{axis,reason:reason.value});
    submit.disabled=!axis||!reason.value.trim();refresh();
  }
  function review(){
    field.disabled=true;reason.readOnly=true;submit.hidden=true;
    const link={ap:'背伸受限可作为前后调节受限的假设。',ml:'外翻抗阻较弱可作为内外翻控制不足、左右调节受影响的假设。',both:'背伸和外翻分别提供了前后调节、左右调节两条可检验的线索。'}[axis];
    feedback.textContent=link+'本例前后摆幅由 '+scores.open.ap.toFixed(1)+' 增至 '+scores.closed.ap.toFixed(1)+' mm，左右摆幅由 '+scores.open.ml.toFixed(1)+' 增至 '+scores.closed.ml.toFixed(1)+' mm。面积本身没有方向，双足合成轨迹也无法判断身体一定向右倒，或确定由哪一块肌肉引起。';
  }
  for(const [key,name] of Object.entries(axes)){
    const option=document.createElement('label'),radio=document.createElement('input');
    radio.type='radio';radio.name='balance-direction';radio.value=key;radio.checked=axis===key;
    radio.onchange=()=>{axis=key;saveDraft();};option.append(radio,name);field.append(option);
  }
  reason.value=saved?.reason||draft.reason||'';reason.oninput=saveDraft;
  panel.append(why,submit,feedback);submit.disabled=!axis||!reason.value.trim();
  if(saved)review();
  return panel;
}
