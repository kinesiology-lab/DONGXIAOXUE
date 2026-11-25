import {createArchModel} from './arch-bone-model.js';

export const archCaseText='陈女士坐位时右足内侧的弧度较高，站立承重后弧度降低。这个变化需要结合她的症状和功能来解释。';
const cuneiforms=['cuneiformM','cuneiformI','cuneiformL'];
export const arches=[
  {id:'medial',title:'内侧纵弓',view:'medial',text:'沿大脚趾一侧从足跟向前找。内侧纵弓由跟骨、距骨、足舟骨、三块楔骨和第 1～3 跖骨组成。',bones:['calcaneus','talus','navicular',...cuneiforms,'mt1','mt2','mt3']},
  {id:'lateral',title:'外侧纵弓',view:'lateral',text:'沿小脚趾一侧从足跟向前找。外侧纵弓由跟骨、骰骨和第 4、5 跖骨组成，弧度较内侧纵弓低。',bones:['calcaneus','cuboid','mt4','mt5']},
  {id:'transverse',title:'横弓',view:'dorsal',text:'从足背横向辨认跗跖部的横弓。先找三块楔骨和骰骨，再点第 1～5 跖骨靠近它们的基底部。',bones:[...cuneiforms,'cuboid','mt1','mt2','mt3','mt4','mt5']}
];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function button(text,fn){const b=el('button','',text);b.type='button';b.addEventListener('click',fn);return b;}
export function archOutlines(){
  const pair=el('div','arch-outlines');
  for(const [title,line,curve] of [
    ['坐位 · 非负重','C 104 82 95 81 90 75 C 81 62 66 62 54 73 C 47 80 39 83 27 82','M 49 77 Q 72 52 94 77'],
    ['站立 · 负重','C 104 82 94 83 86 81 C 75 77 64 77 54 81 C 46 84 37 84 27 82','M 49 82 Q 72 72 94 82']
  ]){
    const fig=el('figure'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','8 7 153 84');svg.setAttribute('aria-hidden','true');
    for(const [d,fill,stroke] of [['M 13 87 H 157','none','#a8bdb5'],['M 44 13 L 68 13 L 69 40 C 78 52 91 57 110 61 C 124 64 137 66 146 73 C 152 78 146 82 137 82 L 116 82 '+line+' C 17 81 17 69 24 59 C 31 49 39 41 41 32 Z','#dcebe4','#50796e'],[curve,'none','#ab7138']]){
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);path.setAttribute('fill',fill);path.setAttribute('stroke',stroke);path.setAttribute('stroke-width','1.7');svg.append(path);
    }
    fig.append(svg,el('figcaption','',title));pair.append(fig);
  }
  return pair;
}
export function openArchBones({host,draft,onSave,onComplete,onContinue,onClose,onSkip,onBack,review,showCase=true}){
  const saved=draft?.version===1?draft:{};
  const selected=Object.fromEntries(arches.map(a=>[a.id,a.bones.filter(k=>saved.selected?.[a.id]?.includes(k))]));
  let arch=arches.find(a=>a.id===saved.active)||arches[0],model=null,closed=false,view=arch.view,busy=false;
  const abort=new AbortController(),complete=a=>selected[a.id].length===a.bones.length,all=()=>arches.every(complete);
  const snapshot=()=>({version:1,active:arch.id,selected:structuredClone(selected)});
  const dlg=el('dialog','ankle-study arch-lab');dlg.setAttribute('aria-label','在足骨模型上辨认三种足弓');
  const header=el('header','study-head');header.append(el('h2','','右足骨骼与三种足弓'),button('返回接诊',onClose));if(onSkip){const skip=button('跳过此步骤',onSkip);skip.className='skip-step';header.insertBefore(skip,header.lastChild);}
  const layout=el('div','study-body'),viewer=el('div','study-view'),stage=el('div','study-canvas'),nav=el('div','study-view-nav');
  const side=el('section','study-side'),intro=el('details','arch-case-note');intro.append(el('summary','','查看坐、站位病例示意图'),archOutlines());
  const viewBtns=new Map();for(const [id,title] of [['medial','内侧面'],['lateral','外侧面'],['dorsal','足背面']]){
    const b=button(title,()=>orient(id));nav.append(b);viewBtns.set(id,b);
  }
  for(const [name,factor] of [['放大',1.23],['缩小',1/1.23]])nav.append(button(name,()=>model?.zoom(factor)));
  function orient(id){view=id;model?.setView(id);viewBtns.forEach((b,k)=>b.setAttribute('aria-pressed',String(k===id)));}
  const caption=el('p','study-cap','拖动旋转，点选骨块。绿色表示已经选中。');viewer.append(stage,nav,caption);
  const tabs=el('nav','arch-tabs');tabs.setAttribute('aria-label','选择足弓');
  const tabButtons=new Map();for(const a of arches){
    const b=button(a.title,()=>{arch=a;onSave(snapshot());orient(a.view);update();feedback.textContent='';});b.dataset.arch=a.id;tabs.append(b);tabButtons.set(a.id,b);
  }
  const title=el('h3'),desc=el('p','study-instruction'),progress=el('p','arch-progress'),missing=el('p','arch-remaining'),feedback=el('p','arch-feedback');
  feedback.setAttribute('role','status');
  const next=button('',()=>{
    if(all()){onContinue();return;}
    const other=arches.find(a=>!complete(a));if(other)tabButtons.get(other.id).click();
  });next.className='study-primary';
  const keyboard=el('details','study-source'),select=el('select'),locate=button('选中此骨',()=>{if(select.value)pick(select.value,true);});
  select.setAttribute('aria-label','选择足骨或跖骨基底');keyboard.append(el('summary','','按骨名选择'),select,locate);
  const source=el('details','study-source');source.append(el('summary','','模型与解剖依据'),el('p','','右足骨骼取自 BodyParts3D（DBCLS），经 Somakine 整理，依 CC BY 4.0 使用。着色用于辨认骨块，横弓的跖骨着色示意基底范围。'));
  for(const [label,url] of [['模型来源','https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'],['许可','https://creativecommons.org/licenses/by/4.0/'],['足弓解剖讲义','https://anatomy.med.utah.edu/diganat/PT/2014_lecture/L12_foot_ankle.pdf']]){
    const link=el('a','',label);link.href=url;link.target='_blank';link.rel='noopener';source.append(link,'　');
  }
  const caseLine=el('p','arch-case-line',archCaseText);if(showCase)side.append(caseLine);side.append(tabs,title,desc,progress,missing,feedback,next,keyboard);if(showCase)side.append(intro);side.append(source);
  layout.append(viewer,side);dlg.append(header,layout);
  const prev=button('← 返回上一步',()=>{const index=arches.indexOf(arch);if(index>0)tabButtons.get(arches[index-1].id).click();else if(!review&&onBack)onBack();else onClose();});prev.className='model-previous';dlg.append(prev);host.append(dlg);dlg.showModal();dlg.addEventListener('cancel',e=>{e.preventDefault();onClose();});
  const name=k=>model.names.get(k)+(arch.id==='transverse'&&/^mt[1-5]$/.test(k)?'基底':'');
  function update(){
    const ready=!!model;
    tabs.querySelectorAll('button').forEach(b=>{const a=arches.find(x=>x.id===b.dataset.arch);b.disabled=!ready;b.setAttribute('aria-pressed',String(arch===a));b.textContent=(complete(a)?'✓ ':'')+a.title;});
    [...nav.children].forEach(b=>b.disabled=!ready);select.disabled=locate.disabled=!ready;
    title.textContent=arch.title;desc.textContent=arch.text;
    progress.textContent=ready?'已选 '+selected[arch.id].length+' / '+arch.bones.length+' 块':'正在载入右足模型…';
    missing.textContent='';next.hidden=!ready||!complete(arch);
    if(!ready)return;
    const pending=arch.bones.filter(k=>!selected[arch.id].includes(k));
    missing.textContent=complete(arch)?'这组骨块已在右足上标出。':selected[arch.id].length?'还需选出 '+pending.map(name).join('、')+'。':'';
    next.textContent=all()?(review?'完成，返回诊室入口':'完成，继续接诊'):'继续选'+arches.find(a=>!complete(a)).title;
    model.paint(arch.id,selected[arch.id]);
    const prior=select.value;select.replaceChildren(new Option('选择骨名',''));
    for(const [id] of model.names)select.append(new Option(name(id),id));
    select.value=prior;
  }
  function pick(k,atBase){
    if(!model)return;
    const label=model.names.get(k);if(!arch.bones.includes(k)){feedback.textContent='你点的是'+label+'。请沿'+arch.title+'的走向继续找。';return;}
    if(arch.id==='transverse'&&!atBase){feedback.textContent='这是'+label+'。沿骨向足跟方向移动，点它与跗骨相接的基底。';return;}
    if(selected[arch.id].includes(k)){feedback.textContent=name(k)+'已选中。';return;}
    selected[arch.id].push(k);onSave(snapshot());if(all())onComplete(snapshot());update();feedback.textContent='已选中'+name(k)+'。';
  }
  async function load(){
    if(busy)return;busy=true;update();
    try{const m=await createArchModel(stage,{pick,signal:abort.signal});if(closed){m.dispose();return;}model=m;orient(view);update();if(all())onComplete(snapshot());}
    catch{if(!closed){progress.textContent='未能载入足骨模型。';feedback.replaceChildren(button('重新载入',()=>{feedback.replaceChildren();load();}));}}
    finally{busy=false;}
  }
  load();return {close(){closed=true;abort.abort();model?.dispose();dlg.close();dlg.remove();}};
}