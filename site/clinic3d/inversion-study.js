import {makeAnkleModel} from './inversion-model.js?v=74';

import {muscles,eversionCue} from './fibular-study.js?v=74';

const stations=[
  {title:'距骨怎样进入踝穴？',prompt:'从上方看距骨滑车，再切换两种足位，观察哪一段转入胫腓骨之间。',
   actions:[['dome','俯看距骨'],['dorsi','做背伸'],['plantar','做跖屈']],
   caption:{neutral:'绿色为距骨，半透明部分为胫骨和腓骨。',dome:'俯视右距骨。两条横线示意滑车前、后部的宽度。',dorsi:'背伸时足尖抬起。看距骨滑车怎样转入踝穴。',plantar:'跖屈时足尖下移。与背伸位置来回比较。'},
   question:'如果落脚时右踝处于跖屈，哪一部分进入踝穴？',
   answers:['较宽的滑车前部','较窄的滑车后部','距骨头'],correct:1,
   retry:'回到俯视图辨认滑车前后，再比较足尖抬起和下移时的位置。',
   conclusion:'距骨滑车前宽后窄。跖屈时相对较窄的后部进入踝穴，骨性约束相对减少。'},
  {title:'哪一侧踝尖更低？',prompt:'从正面找到两个踝尖，再显示水平参考线，比一比它们的位置。',
   actions:[['front','看右踝正面'],['tips','标出两个踝尖']],
   caption:{neutral:'从前方观察患者右脚。',front:'找到胫骨和较细的腓骨，沿骨干向下看。',tips:'圆点落在模型的踝尖，横线标出各自高度。'},
   question:'根据两侧踝尖的高度，哪一个判断更合适？',
   answers:['内踝较低，对内翻的骨性限制更多','两踝等高，向两侧翻转的限制相同','外踝较低，对外翻的骨性限制更多'],correct:2,
   retry:'在正面视图中，沿腓骨向下找到外踝，将它的水平线与内踝比较。',
   conclusion:'外踝向下延伸得更远，对外翻的骨性限制较多。内翻损伤的机制还要结合足位和韧带来解释。'},
  {title:'外侧哪条韧带容易受牵拉？',prompt:'辨认外踝周围的三条韧带。可从后方看距腓后韧带，再比较中立位与跖屈伴内翻。',
   actions:[['rest','看中立位'],['strain','做跖屈伴内翻']],
   caption:{neutral:'橙色为距腓前韧带，紫色为跟腓韧带，蓝色为距腓后韧带。',rest:'从外踝辨认连向前方距骨、下方跟骨和后方距骨的三条韧带。',strain:'小腿保持固定，足尖下移，右足底转向身体中线。'},
   question:'在这个足位，哪条外侧韧带更应重点考虑？',
   answers:['距腓前韧带','跟腓韧带','距腓后韧带'],correct:0,
   retry:'找从外踝前缘连向距骨的橙色带，再看跖屈伴内翻的姿势。',
   conclusion:'跖屈伴内翻时，距腓前韧带容易受牵拉。模型说明受力机制，陈女士的韧带情况还需查体。'},
  {title:'哪些肌肉帮助阻止足继续内翻？',prompt:'找到小腿外侧的腓骨长肌和短肌，比较两者的起止点，再观察右足外翻。',
   actions:[['muscles','显示外侧肌群'],['evert','观察右足外翻']],
   caption:{neutral:'从膝到足观察。青色箭头沿肌腱指向肌腹，标记指示选中肌肉的附着区。',muscles:'棕红为长肌，金黄为短肌。青色箭头沿肌腱指向肌腹。',evert:'右足底转向外侧。青色箭头表示肌拉力沿肌腱传递的方向。'},
   question:'陈女士说走不平的路时脚会发软，下一步怎样检验肌力方面的推测？',
   answers:['仅凭扭伤经过判定右侧腓骨肌无力','在相同条件下比较双侧抗阻外翻表现','仅凭内翻动作判定外侧韧带断裂'],correct:1,
   retry:'模型显示了肌群的作用方向。想知道她能否发力，还需要取得她本人的检查结果。',
   conclusion:'腓骨长肌和短肌参与足外翻。比较双侧抗阻外翻有助于评估肌力，日常落脚时的动态控制还需结合功能表现。'}
];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
function button(text,run){const n=el('button','',text);n.type='button';n.addEventListener('click',run);return n;}
export function openInversionStudy({host,draft,onSave,onDone,onContinue,onClose,onSkip,onBack,review,afterDeparture=false,narrate=()=>{},stopNarration=()=>{}}){
  const book=structuredClone(draft?.version===1?draft:{version:1,step:0,observations:{},attempts:{},solved:{}});
  const abort=new AbortController(),dialog=el('dialog','ankle-study'),header=el('header','study-head'),title=el('h2','','下楼踩空，右脚为什么容易向内崴？');
  dialog.setAttribute('aria-label','右踝扭伤机制模型练习');header.append(title,button(afterDeparture?'返回本次记录':'返回接诊',onClose));if(onSkip){const skip=button('跳过此步骤',onSkip);skip.className='skip-step';header.insertBefore(skip,header.lastChild);}
  const body=el('div','study-body'),viewer=el('div','study-view'),stage=el('div','study-canvas'),cap=el('p','study-cap'),nav=el('div','study-view-nav');
  let focus='fibLong',showAll=false;
  let model=null,closed=false,current='neutral',ready=false,busy=false,generation=0;
  nav.setAttribute('aria-label','观察视角');nav.append(button('向左转',()=>model?.rotate(-.28)),button('向右转',()=>model?.rotate(.28)),button('复位视角',()=>{model?.resetView();if(book.step===2)cap.textContent=stations[2].caption[current];}));
  const posterior=button('看后方',()=>{model?.posteriorView();cap.textContent='蓝色为距腓后韧带，从外踝内面的外踝窝连至距骨后外侧。';});
  const sole=button('足底看止点',()=>model?.soleView());sole.hidden=true;nav.append(posterior,sole);posterior.hidden=true;
  const side=el('section','study-side');viewer.append(stage,nav,cap);body.append(viewer,side);
  dialog.append(header,body);
  const prev=button('← 返回上一步',()=>{if(book.step>0){if(!ready)return;book.step--;save();beginStep();}else if(!review&&onBack)onBack();else onClose();});prev.className='model-previous';dialog.append(prev);host.append(dialog);dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();onClose();});
  const credit=()=>{const d=el('details','study-source'),s=el('summary','','模型与依据');d.append(s);
    const p=el('p','','解剖模型取自 BodyParts3D（DBCLS），经 Somakine 整理。此处截取右侧骨肌，添加教学色、韧带走向及简化运动。');d.append(p);
    for(const [name,url] of [['小腿分区与肌腱解剖（Touro 大学）','https://gross.tun.touro.edu/2012%20Dissectors%20in%20MS%20Word/Dissectors%20PDF/2011Dissection10LegAnkleJoint.pdf'],['模型来源','https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html'],['CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'],['距骨形态研究','https://pubmed.ncbi.nlm.nih.gov/32320447/'],['距腓后韧带解剖研究','https://pubmed.ncbi.nlm.nih.gov/39818474/'],['韧带应变实验','https://pubmed.ncbi.nlm.nih.gov/34144675/']]){
      const a=el('a','',name);a.href=url;a.target='_blank';a.rel='noopener';d.append(a,'　');}return d;};
  function save(){onSave(structuredClone(book));}
  function summary(){
    model.select(3,'muscles',()=>{},true);cap.textContent='可拖动模型回看右侧腓骨肌群。';
    const h=el('h3','','回到陈女士的这次扭伤'),para=el('p','','她记得右脚向内崴，落地时的跖屈角度还不清楚。接下来先核对症状，再用床旁稳定性检查和双侧抗阻外翻来检验推测。');
    const results=el('p','study-result','已完成 4 项判断，其中 '+stations.filter((s,i)=>book.attempts[i]?.[0]===s.correct).length+' 项首次判断正确。');
    const audio=el('details','study-source'),player=el('audio');player.src=new URL('../soap/media/inversion-lesson.mp3',import.meta.url);player.controls=true;player.preload='none';
    audio.append(el('summary','','听完整机制解说'),player);audio.ontoggle=()=>{if(!audio.open)player.pause();};
    const next=button(afterDeparture?'返回本次记录':review?'回到诊室入口':'继续问诊',onContinue);next.className='study-primary';
    side.replaceChildren(h,para,results,next,audio,credit());
  }
  function attachmentCard(){
    const info=muscles[focus],panel=el('section','fib-card'),switches=el('div','study-actions');
    switches.setAttribute('aria-label','选择肌肉');
    for(const [key,row] of Object.entries(muscles)){
      const b=button(row.name,()=>{focus=key;model.focusMuscle(key);paint();side.querySelector('[data-muscle="'+key+'"]').focus({preventScroll:true});narrate(row.voice);});
      b.dataset.muscle=key;b.setAttribute('aria-pressed',String(key===focus));switches.append(b);
    }
    const details=el('dl');
    for(const [k,v] of [['起点',info.origin],['止点',info.insertion],['走行',info.route]])details.append(el('dt','',k),el('dd','',v));
    const all=button('显示周围肌肉实色',()=>{showAll=!showAll;model.showContext(showAll);all.setAttribute('aria-pressed',String(showAll));});
    all.setAttribute('aria-pressed',String(showAll));panel.append(switches,details,all);return panel;
  }
  function paint(){
    const i=book.step,s=stations[i];if(!s){summary();return;}
    const seen=book.observations[i]||[],solved=book.solved[i]===true;
    const count=el('span','study-count','模型练习　'+(i+1)+' / '+stations.length);
    const h=el('h3','',s.title),desc=el('p','study-instruction',s.prompt),actions=el('div','study-actions');
    const q=el('fieldset','study-question'),legend=el('legend','',s.question),feedback=el('p','study-response');
    feedback.setAttribute('role','status');q.append(legend);
    const completeObservation=s.actions.every(([id])=>seen.includes(id));
    for(const [id,label] of s.actions){
      const b=button(label,()=>{
        if(!ready||busy)return;busy=true;current=id;cap.textContent=s.caption[id];if(i===3)narrate(id==='evert'?eversionCue:muscles[focus].voice);
        actions.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
        model.select(i,id,()=>{busy=false;const a=book.observations[i]||=[];if(!a.includes(id))a.push(id);save();paint();side.querySelector('[data-observe="'+id+'"]')?.focus({preventScroll:true});});
      });b.dataset.observe=id;b.disabled=!ready;b.setAttribute('aria-pressed',String(current===id));
      if(seen.includes(id))b.dataset.seen='true';actions.append(b);
    }
    s.answers.forEach((answer,k)=>{
      const a=button(answer,()=>{
        if(!completeObservation||solved||busy)return;
        (book.attempts[i]||=[]).push(k);if(k===s.correct)book.solved[i]=true;save();paint();
        side.querySelector(k===s.correct?'.study-primary':'[data-answer="'+k+'"]')?.focus({preventScroll:true});
      });a.dataset.answer=String(k);a.disabled=!ready||!completeObservation||solved;
      if(solved&&k===s.correct)a.className='correct';q.append(a);
    });
    const tries=book.attempts[i]||[];
    feedback.textContent=solved?s.conclusion:tries.length?s.retry:completeObservation?'根据刚才的观察，选择你的判断。':'完成上面的模型操作后作答。';
    if(solved)feedback.classList.add('confirmed');
    side.replaceChildren(count,h,desc,actions);if(i===3)side.append(attachmentCard());side.append(q,feedback);
    if(solved){const next=button(i===3?'整理病例判断':'下一项观察',()=>{
      book.step++;current='neutral';save();
      if(book.step===stations.length)onDone(structuredClone(book));
      beginStep();
    });next.className='study-primary';side.append(next);}
    side.append(credit());
  }
  function beginStep(){stopNarration();posterior.hidden=book.step!==2;sole.hidden=book.step!==3;busy=false;side.scrollTop=0;if(book.step>=stations.length){summary();return;}
    current='neutral';model.select(book.step,current,()=>{},true);cap.textContent=stations[book.step].caption[current];paint();if(book.step===3)narrate(muscles[focus].voice);}
  async function load(){
    const id=++generation;side.replaceChildren(el('p','','正在载入右踝骨肌模型…'));
    try{const m=await makeAnkleModel(stage,abort.signal);if(closed||id!==generation){m.dispose();return;}model=m;ready=true;beginStep();}
    catch(e){if(!closed){side.replaceChildren(el('p','','右踝模型未能显示。请重试，或返回接诊后重新进入。'),button('重新载入模型',load));}}
  }
  load();
  return {close(){stopNarration();closed=true;abort.abort();model?.dispose();dialog.querySelector('audio')?.pause();dialog.close();dialog.remove();}};
}