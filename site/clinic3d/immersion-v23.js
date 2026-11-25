import {anatomicalPanel,staticCOPPanel,gaitExplorer,archCOPPanel} from './realistic-panels.js?v=72';
import {evidencePanel,contractionPanel,ligamentPanel} from '../soap/explorers.js';
import {CASE_EVIDENCE} from '../soap/explorers-data.js';
import {soapSummary} from './soap-summary.js?v=72';
const el=(t,c='',v)=>{const n=document.createElement(t);n.className=c;if(v!==undefined)n.textContent=v;return n;};
const btn=(t,f)=>{const b=el('button','',t);b.type='button';b.onclick=f;return b;};
const concepts={act1:['倾听与SOAP','把患者感受与客观观察分开记录。'],act2:['关节与轴面','背伸、跖屈和内外翻分别涉及哪些关节？'],act3:['肌肉与收缩','起止点怎样决定动作？向心与离心怎样配合？'],act4:['三条足弓','先认识内侧纵弓、外侧纵弓和横弓。'],act5:['步态周期','接地、离地、支撑与摆动怎样衔接？'],act6:['足底负荷','足印、压力图与COP分别回答什么问题？'],act7:['静态COP','站着不动时，轨迹为什么仍在变化？'],act8:['从证据到计划','先核对已知和未知，再选择下一步。']};
export function installImmersion(ctx){
 const dialog=el('dialog','clinic-study'),head=el('header'),title=el('h2'),body=el('div','study-content'),close=btn('回到诊室',()=>dialog.close());head.append(title,close);dialog.append(head,body);document.body.append(dialog);
 let resume=null,afterPaper=null;dialog.addEventListener('close',()=>{body.replaceChildren();resume?.();resume=null;const fn=afterPaper;afterPaper=null;fn?.();});
 function show(name,content){title.textContent=name;body.replaceChildren(content);resume=ctx.pause();dialog.showModal();close.focus();}
 const prompt=el('div','concept-prompt'),label=el('span'),open=btn('了解这个概念',()=>openConcept());prompt.hidden=true;prompt.append(label,open);document.getElementById('coach').append(prompt);
 const face=document.querySelector('.coach-face');face.textContent='';face.classList.add('therapist-avatar');const i=el('img');i.src='../soap/media/dialogue-therapist-film.jpg';i.alt='林治疗师 · 视频截图';face.append(i);
 function openConcept(requestedAct){const act=typeof requestedAct==='string'?requestedAct:(ctx.getNode()?.pressureStation?'act6':ctx.getNode()?.act||'act1'),d=el('div');const [name,desc]=concepts[act]||concepts.act1;d.append(el('p','study-intro',desc));
  if(['act2','act3','act4'].includes(act))d.append(anatomicalPanel({act2:'joint',act3:'muscle',act4:'arch'}[act]));
  if(act==='act3'){const detail=el('details'),sum=el('summary','','训练时怎样收缩？');detail.append(sum);detail.ontoggle=()=>{if(detail.open&&!detail.dataset.loaded){detail.dataset.loaded='true';detail.append(contractionPanel());}};d.append(detail);}
  if(act==='act2'){const detail=el('details'),sum=el('summary','','韧带与跟腱');detail.append(sum);detail.ontoggle=()=>{if(detail.open&&!detail.dataset.loaded){detail.dataset.loaded='true';detail.append(ligamentPanel());}};d.append(detail);}
  if(act==='act5')d.append(gaitExplorer());if(act==='act6')d.append(archCOPPanel());if(act==='act7')d.append(staticCOPPanel());
  if(['act2','act3','act4'].includes(act)){const stage={act2:'joint',act3:'muscle',act4:'arch'}[act];d.append(evidencePanel(stage,{reviewed:ctx.state.reviewedEvidence||[],onReview:id=>{ctx.state.reviewedEvidence||=[];if(!ctx.state.reviewedEvidence.includes(id))ctx.state.reviewedEvidence.push(id);ctx.record('clinic3d_case_evidence_read',{id,title:CASE_EVIDENCE.find(e=>e.id===id)?.title,sourceKind:'fictional_case_handout',notExaminationPerformed:true});ctx.persist();}}));}
  if(act==='act1')d.append(el('p','','S：患者的经历、症状、目标。O：观察与测量。A：综合解释。P：共同商量的方案与复评。'));
  if(act==='act8')d.append(btn('打开本次证据病历',()=>{dialog.close();paper();}));
  show(name,d);ctx.record('clinic3d_concept_open',{act,concept:name,notAssessmentCredit:true});
 }
 const menu=document.getElementById('settings');const evidenceButton=btn('本次病历与记录',()=>{menu.hidden=true;paper();});evidenceButton.id='evidenceMenu';menu.insertBefore(evidenceButton,document.getElementById('voice'));
 function paper(next){
  const s=ctx.state,doc=el('article','evidence-paper');
  const reviewed=s.reviewedEvidence||[],sections=soapSummary(s,CASE_EVIDENCE);
  doc.append(el('p','paper-meta','患者：陈女士　　学生：'+(s.student?.name||'未登记')));
  const names={S:'主观资料',O:'客观检查',A:'评估',P:'计划'};
  for(const [key,rows] of Object.entries(sections)){
   if(rows.length){const section=el('section'),list=el('ul');section.append(el('h3','',key+' · '+names[key]),list);for(const line of rows)list.append(el('li','',line));doc.append(section);}
  }
  if(!Object.values(sections).some(rows=>rows.length))doc.append(el('p','','本次尚无可填写的病例资料。'));
  function proceed(confirmed){if(next){if(confirmed)s.soapReviewPassed=true;afterPaper=next.go;}ctx.persist();dialog.close();}
  const ack=btn(next?'已核对，进行分析与计划':'已核对，返回诊室',()=>{ctx.record('clinic3d_evidence_review',{evidenceIds:[...s.evidence],reviewedHandouts:[...reviewed],completedTasks:Object.keys(s.taskReceipts||{}),destination:next?.id||'review',notClinicalDiagnosis:true});proceed(true);});ack.className='paper-continue';doc.append(ack);if(next){const skip=btn('跳过此步骤',()=>{ctx.record('clinic3d_evidence_review_skipped',{destination:next.id,assessmentCredit:false});proceed(false);});skip.className='skip-step';doc.append(skip);}show('SOAP 病历核对',doc);
 }
 let bypass=null;return{enterNode(node){const concept=concepts[node.pressureStation?'act6':node.act];prompt.hidden=!concept;label.textContent=concept?'动小助 · '+concept[0]:'';},beforeNode(id,go){if(!['plan_intro','plan'].includes(id)||ctx.state.soapReviewPassed||bypass===id){bypass=null;return false;}paper({id,go:()=>{bypass=id;go();}});return true;},openConcept,paper};
}
