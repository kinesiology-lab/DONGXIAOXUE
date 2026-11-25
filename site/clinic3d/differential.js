// Alternate vignettes are teaching prompts. Never append their symptoms to the patient's evidence.
export const currentCase={
 id:'current',label:'陈女士的查体资料',
 prompt:'陈女士多次右踝内翻扭伤，查体时右侧前移和内翻倾斜较健侧略大。她说转弯时脚会发软。下一步怎么做？',
 actions:['记录外侧机械性松弛的线索，再观察她坐着和站着时的足弓。','据此判定距腓前韧带完全断裂。','把发软都归因于腓骨肌无力，直接加大抗阻训练。'],
 correct:0,feedback:['两项查体提示外侧机械性松弛。接下来比较负重前后的足形，随后再检查肌肉控制，看看还有哪些线索能解释行走不稳。','侧间差异提供松弛线索，手法查体不能独立判断哪一条韧带完全断裂。','发软是她的感受。疼痛、担忧、力量和动态控制都可能参与，先比较再决定。']
};
const alternatives=[
 {id:'fracture',label:'刚发生的新伤',prompt:'另一位患者刚下楼扭伤，踝区疼，外踝尖有明确骨性压痛。此时先做什么？',
 actions:['继续前抽屉试验，看看脚踝松不松。','暂停应力和负重任务，转医学评估是否需要踝部X线。'],correct:1,
 feedback:['新伤合并明确骨性压痛时，应先评估骨折风险。','在适用渥太华踝规则的急性踝区外伤中，外踝尖骨性压痛是考虑X线的指征。能走几步也不能抵消这个线索。'],source:['ACR 急性踝外伤影像建议','https://acsearch.acr.org/docs/69436/Narrative/']},
 {id:'syndesmosis',label:'疼在踝穴上方',prompt:'如果患者说脚踩住时身体转了过去，伤后疼在踝关节前外侧偏上方，蹬地时尤其明显，哪项值得优先核实？',
 actions:['定位下胫腓联合区域的压痛，评估联合损伤可能，必要时转诊。','只要也能引出内翻痛，就按普通外侧扭伤继续。'],correct:0,
 feedback:['旋转受伤史与踝穴上方疼痛改变了鉴别方向。需结合压痛范围、其他查体和必要的影像，单项试验不足以排除联合损伤。','应先让患者指出最痛的位置；踝穴上方疼痛和旋转机制值得单独评估。'],source:['下胫腓联合损伤临床评估研究','https://pmc.ncbi.nlm.nih.gov/articles/PMC9568458/']},
 {id:'peroneal',label:'外踝后方弹响',prompt:'如果最痛在外踝后方，向外用力时还有弹响，下一步要区分什么？',
 actions:['把有痛的外翻直接记为单纯肌力不足。','沿腓骨肌腱走行定位症状，关注肌腱损伤或不稳，必要时转诊评估。'],correct:1,
 feedback:['疼痛本身可以限制用力，且单纯肌力不足无法解释外踝后方的弹响。','腓骨肌腱绕过外踝后方。这组线索提示针对肌腱检查，必要时可由专科结合动态超声或MRI评价。'],source:['ESSKA–AFAS 腓骨肌腱病变共识','https://doi.org/10.1007/s00167-018-4971-x']},
 {id:'osteochondral',label:'深处痛、反复肿或卡住',prompt:'如果扭伤后持续出现踝关节深处负重痛，反复肿，有时像被卡住，原来的X线也没见骨折，怎么处理？',
 actions:['考虑距骨骨软骨损伤等关节内病变，调整负荷并转医学评估。','既然旧片没见骨折，就把卡住归为害怕活动。'],correct:0,
 feedback:['深处痛、反复肿胀或卡锁值得评估关节内病变。症状不具有特异性，由专科决定是否补充MRI等影像。','既往普通X线不能排除骨软骨损伤。先追问症状的持续时间和部位。'],source:['DGOU 距骨骨软骨损伤诊断建议','https://pmc.ncbi.nlm.nih.gov/articles/PMC10601568/']}
];

export function differentialPanel(onAnswer,{includeCurrent=true}={}){
 const cases=includeCurrent?[currentCase,...alternatives]:alternatives;
 const panel=document.createElement('details'),title=document.createElement('summary');
 title.textContent=includeCurrent?'鉴别推理 · 选择下一步':'如果线索变了，下一步怎么做？';
 const select=document.createElement('select');select.setAttribute('aria-label','选择鉴别情境');
 cases.forEach((v,i)=>select.add(new Option((v.id==='current'?'本例 · ':'假设 · ')+v.label,String(i))));
 const q=document.createElement('p'),actions=document.createElement('div'),feedback=document.createElement('p'),ref=document.createElement('a');
 feedback.setAttribute('role','status');ref.target='_blank';ref.rel='noopener';
 let tries=0;
 function show(){
   const item=cases[+select.value];tries=0;actions.replaceChildren();feedback.textContent='';q.textContent=item.prompt;
   ref.hidden=!item.source;if(item.source){ref.href=item.source[1];ref.textContent=item.source[0];}
   item.actions.forEach((text,i)=>{
     const b=document.createElement('button');b.type='button';b.textContent=text;
     b.style.cssText='display:block;margin:.4rem 0;text-align:left;white-space:normal';
     b.onclick=()=>{const correct=i===item.correct;tries++;
       feedback.textContent=item.feedback[i]+(correct?'':' 请再选一次。');onAnswer?.({scenario:item.id,option:i,correct,attempt:tries,hypothetical:item!==currentCase});
       b.disabled=true;if(correct)for(const child of actions.children)child.disabled=true;
     };actions.append(b);
   });
 }
 select.onchange=show;panel.append(title,select,q,actions,feedback,ref);show();return panel;
}
