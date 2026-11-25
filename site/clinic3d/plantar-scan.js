import {samplePlantarScan, renderPlantarScan, regionOf} from './pressure-engine.js?v=79';

const example = samplePlantarScan();
export function pressureLegend(){
  const legend=document.createElement('div');
  legend.className='scan-legend';
  legend.setAttribute('aria-label','相对压力从低到高依次为蓝、绿、黄、橙、红');
  for(const [label,color] of [['蓝 · 低','#193ea6'],['绿','#00ba91'],['黄','#ffdc1a'],['橙','#f77514'],['红 · 高','#d32727']]){
    const key=document.createElement('span'),swatch=document.createElement('i');
    swatch.style.backgroundColor=color;key.append(swatch,label);legend.append(key);
  }
  return legend;
}

export function plantarFigure({highlightRight=false,comparison=null,reference=false}={}){
  const figure=document.createElement('figure');
  figure.className='plantar-scan';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  renderPlantarScan(svg,example,{highlightRight,comparison,reference});
  const caption=document.createElement('figcaption');
  caption.textContent=reference?'教学示例 · 圆圈标出右足高压区':comparison?'双足站立教学模拟 · 圈出'+comparison.label+'分区的峰值位置':highlightRight?'双足站立压力示例 · 圆圈标出右足高压区':'双足站立 · 同一相对压力色标 · 教学模拟';
  figure.append(svg,pressureLegend(),caption);
  return figure;
}

export function showSpokenPressureMap(holder,state){
  const source=state.taskReceipts?.pressure_compare?.scope==='case-plantar-scan'?'case':'reference';
  if(holder.dataset.source!==source){
    holder.replaceChildren(plantarFigure({highlightRight:true,reference:source==='reference'}));
    holder.dataset.source=source;
  }
  holder.hidden=false;
}

const regions = new Map([
  ['heelM','足跟内侧'], ['heelL','足跟外侧'], ['midM','中足内侧'],
  ['midL','中足外侧'], ['foreM','前足内侧（含趾）'], ['foreL','前足外侧（含趾）']
]);

function compareRegions(frame) {
  const rows = new Map(Array.from(regions, ([key,label])=>[key,{key,label}]));
  for (const foot of frame.feet) {
    for (const cell of foot.cells) {
      const section = regionOf(cell);
      const band = section==='heel'?'heel':section==='midfoot'?'mid':'fore';
      const row = rows.get(band+(cell.medial>0?'M':'L'));
      if (!row[foot.side] || row[foot.side].pressure < cell.pressure) row[foot.side]=cell;
    }
  }
  for (const row of rows.values()) row.difference=row.right.pressure-row.left.pressure;
  return rows;
}

export function mountPlantarScan({wrap,book,button,record,changed,scanReady}) {
  const status=document.createElement('p'), content=document.createElement('section');
  content.className='scan-prediction';
  status.setAttribute('role','status');
  const start=button('开始足底扫描',()=>{
    if (!scanReady() || start.disabled) return;
    start.disabled=true;
    status.textContent='正在采集双足站立数据…';
    const progress=document.createElement('progress');
    progress.setAttribute('aria-label','采集双足压力');
    content.replaceChildren(progress);
    const finish=()=>{
      if (!content.isConnected || !wrap.contains(content) || !scanReady()) return;
      book.set('scanAcquired',true);
      record('clinic3d_plantar_scan',{left:'typical',right:'low',condition:'bilateral-standing',source:'synthetic'});
      render();changed();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish,1400);
  });
  start.dataset.startScan='true';
  function render() {
    content.replaceChildren();
    const complete=book.get('plantarScan')===true;
    start.hidden=complete || book.get('scanAcquired')===true;
    start.disabled=!scanReady();
    if (!start.hidden) {
      status.textContent=scanReady()?'请患者双脚赤足，自然站在扫描板上。':'请先坐稳，脱掉双脚的鞋袜。';
      return;
    }
    const rows=compareRegions(example);
    const observed=Array.from(rows.values()).sort((a,b)=>b.difference-a.difference)[0];
    if (complete) {
      const prediction=rows.get(book.get('scanPrediction'));
      if (!prediction) {
        status.textContent='已完成的扫描记录';
        content.append(plantarFigure());return;
      }
      status.textContent='你的预判：右脚的'+prediction.label+'。本次站立扫描中，右足相对左足增幅最大的区域是'+observed.label+'。';
      const table=document.createElement('table');
      table.innerHTML='<caption>分区峰值 · 同一相对色标（0–100）</caption><thead><tr><th>区域</th><th>左足</th><th>右足</th><th>右减左</th></tr></thead>';
      for (const row of new Set([prediction,observed])) {
        const tr=table.insertRow();
        for(const val of [row.label,(100*row.left.pressure).toFixed(1),(100*row.right.pressure).toFixed(1),(row.difference>0?'+':'')+(100*row.difference).toFixed(1)]) tr.insertCell().textContent=val;
      }
      content.append(plantarFigure({comparison:observed}),table);
      return;
    }
    status.textContent='采集完成。先做预判，再看颜色。';
    const field=document.createElement('fieldset'),legend=document.createElement('legend');
    legend.textContent='结合陈女士右脚反复向内崴的经历，你预判站立时右脚哪个区域的压力比左脚同一区域升高最明显？';
    field.append(legend);
    const reveal=button('提交预判，查看热力图',()=>{
      const id=field.querySelector('input:checked')?.value;
      if (!rows.has(id) || !scanReady() || book.get('plantarScan')) return;
      book.set('scanPrediction',id);book.set('plantarScan',true);
      record('clinic3d_pressure_prediction',{prediction:id,observed:observed.key,condition:'bilateral-standing',measure:'regional-peak-difference',source:'synthetic'});
      render();changed();
    });
    reveal.disabled=true;
    for(const [key,label] of regions) {
      const option=document.createElement('label'),input=document.createElement('input');
      input.type='radio';input.name='scan-region';input.value=key;
      input.addEventListener('change',()=>{reveal.disabled=false;});
      option.append(input,label);field.append(option);
    }
    content.append(field,reveal);
  }
  wrap.append(status,content,start);render();
}
