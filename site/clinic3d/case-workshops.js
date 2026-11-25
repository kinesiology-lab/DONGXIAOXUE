import {contractionDemo} from './contraction-demo.js';

const boneTargets=['tibia','fibula','talus','calcaneus'];
const footTargets=['talus','calcaneus','navicular','cuboid','cuneiformM','cuneiformI','cuneiformL',
 ...Array.from({length:5},(_,i)=>'mt'+(i+1)),
 ...[1,2,3,4,5].flatMap(n=>(n===1?['proximal','distal']:['proximal','middle','distal']).map(segment=>'toe'+n+'_'+segment))];
export const caseWorkshops={
 case_cardio:{act:'act1',title:'登山目标与运动心率',intro:'陈女士在接诊资料里写道：“我今年28岁，喜欢爬山。现在碰到石子路，就怕右脚又崴。”',questions:[
 ['按 208 − 0.7 × 年龄估算，陈女士的最大心率约为多少？',['188 次/分','208 次/分'],0,'按本题公式，208 − 0.7 × 28 = 188.4，取整约 188 次/分。这个数是年龄预测值，个人实际最大心率可以不同。'],
 ['喜欢爬山能说明什么？',['她已达到恢复登山的心肺标准','登山是她在意的活动，耐力要另行评估'],1,'估算最大心率不能代替运动耐量测量。'],
 ['以后逐步恢复登山，了解同一负荷下的耐受情况，可以一起记录什么？',['只记录年龄','心率、主观用力感和症状'],1,'把反应与当时的坡度、速度和持续时间一起记录，复评时才能比较。']]},
 case_bones:{act:'act2',title:'小腿与足骨拼接',intro:'先用右侧骨架拼出踝穴、距骨和跟骨，再到整足图谱中辨认足弓向前足的延续。',activities:[
 ['ankle','踝穴与后足','把胫骨、腓骨、距骨和跟骨分别拖到对应骨位，松手自动归位。',boneTargets],
 ['foot','整足骨架','分组拼接右足的7块跗骨、5块跖骨和14块趾骨。可以分次完成。',footTargets]],questions:[
 ['胫腓骨围成的踝穴与哪块骨相接，构成距小腿关节？',['距骨','跟骨'],0,'距骨滑车与踝穴相接。'],
 ['距下关节位于哪两块骨之间？',['胫骨与腓骨','距骨与跟骨'],1,'在距骨下方找到跟骨，观察两者相接的位置。']]},
 case_paint:{act:'act3',title:'右小腿肌肉彩绘',intro:'触诊前，在右小腿前外侧画出胫骨前肌的大致范围。',activities:[['paint','彩绘胫骨前肌','在右小腿上涂画，再提交彩绘。',['tibAnt']]]},
 case_place:{act:'act3',title:'小腿外侧肌肉安放',intro:'为接下来的抗阻外翻检查定位腓骨长肌和腓骨短肌。',activities:[['fibLong','安放腓骨长肌和腓骨短肌','在右小腿外侧定位两块肌肉，再从足底面比较肌腱止点。',['fibLong','fibBrevis']]]},
 case_contractions:{act:'act3',title:'抗阻动作中的肌肉收缩',intro:'都在用力，但脚的运动方向不同。以坐位勾脚时工作的胫骨前肌为例。',questions:[
 ['顶着手的阻力主动勾脚，脚尖向上，属于哪种收缩？',['向心收缩','等长收缩','离心收缩'],0,'肌肉在发力中缩短，脚尖上抬。'],
 ['治疗师施加阻力，患者保持脚的位置，关节角度稳定呢？',['离心收缩','向心收缩','等长收缩'],2,'这是徒手抗阻检查中的保持阶段。'],
 ['从勾脚位缓慢放下，胫骨前肌仍在控制速度呢？',['等长收缩','离心收缩','向心收缩'],1,'脚尖下落时，背伸肌群在负荷下逐渐拉长。']]},
 case_chain:{act:'act2',title:'从勾脚到负重弓步',intro:'先看足部是否固定。坐位勾脚时足部自由，靠墙弓步时被测足全掌着地、小腿向前。',questions:[
 ['哪组对应正确？',['坐位勾脚是开链，负重弓步是闭链','两者都是开链'],0,'同样可以出现踝背伸，移动的骨段不同。弓步记录可重复的距离和侧差。'],
 ['双脚站立提踵，以足为杠杆、前足着地处为支点，是哪一类杠杆？',['第三类','第二类'],1,'小腿传到足部的负荷位于前足支点与跟腱作用在跟骨的动力之间。']]},
 case_posture:{act:'act7',title:'静态站立时怎样保持平衡',intro:'回想测力板上的双足站立和单足站立。',questions:[
 ['从双足站立变为单足站立，支撑面怎样变化？',['变小','变大'],0,'支撑面变小，维持姿势的要求更高。'],
 ['测力板画出的轨迹表示什么？',['身体质心的直接运动轨迹','地面合反力作用点（COP）的位置变化'],1,'压力中心与身体质心相关，测力板这里显示的是压力中心。']]},
 case_transfer:{act:'act5',title:'步行中的重心转移',intro:'观察双脚同时着地到单脚支撑时，身体怎样从一条腿移到另一条腿。',questions:[
 ['左脚刚着地、右脚还在后方蹬地时，负荷逐渐移向哪里？',['移向新着地的左脚','始终留在右脚'],0,'双支撑期内完成换腿承重。随后由左腿单独支撑身体，右腿进入摆动。'],
 ['足印里的压力热点能直接给出全身重心位置吗？',['可以','还需结合全身运动数据'],1,'全身质心取决于各身体节段的位置和质量分布。']]}
};

const courseActions={
 case_cardio:[[4,'04-2','观察跑步机运动中的心率']],
 case_chain:[[1,'01-15','观察开链与闭链'],[2,'02-2','观察站立提踵的支点、阻力和动力']],
 case_posture:[[12,'dynamic','比较双足与单足支撑']],
 case_transfer:[[13,'13-1','从侧面与后面看步态与质心'],[13,'13-5','观察右侧支撑缩短']]
};
function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
function control(text,click){const b=element('button',text);b.type='button';b.onclick=click;return b;}
function openActivity(item,completed,onHit,opener,attempt){
 const [kind,title,guide,keys]=item;
 const dialog=element('dialog');dialog.className='clinic-workshop-window';
 const head=element('header'),counter=element('span'),frame=element('iframe');
 const back=control('返回诊室',()=>dialog.close());
 head.append(element('strong',title),counter,back);dialog.append(head,element('p',guide),frame);
 const update=()=>counter.textContent=keys.filter(k=>completed[k]).length+' / '+keys.length;
 const hit=key=>{if(!keys.includes(key)||completed[key])return;onHit(key);update();};
 update();frame.title=title;
 frame.addEventListener('load',()=>{
  const win=frame.contentWindow;
  if(win.location.origin!==location.origin)return;
  if(kind==='ankle'||kind==='foot'){
   const game=win.AssemblyGame;if(!game)return;
   game.openPrep(kind,'bone');win.document.getElementById('sideSelect').value='R';
   win.addEventListener('dxx:guide',({detail:d})=>{
    if(d.type!=='placement'||!d.correct||d.explore||d.chapter!==kind||d.task!=='bone')return;
    const state=game.getState(),p=state.pieces.find(p=>p.id===state.selected);
    if(p?.side==='R')hit(p.key);
   });
   const locate=()=>{
    const key=keys.find(k=>!completed[k]);if(!key)return;
    const i=game.getState().rounds.findIndex(group=>group.includes(key));
    if(i>=0)game.jumpGroup(i,key);
   };
   const locateButton=control('定位下一块待拼骨',locate);locateButton.disabled=true;
   head.insertBefore(locateButton,back);
   game.start(false).then(()=>{locateButton.disabled=false;if(dialog.open)locate();});
  }else if(kind==='paint'){
   win.addEventListener('dxx:paint-passed',({detail:d})=>{if(d?.side==='R')hit(d.key);});
  }else{
   win.addEventListener('dxx:guide',({detail:d})=>{
     if(d.chapter!=='ankle'||d.round!=='ankle-pair')return;
     if(d.type==='function_answer'&&d.correct)hit(d.key);
     if(d.type==='saved_placements')d.keys.forEach(hit);
   });
   win.dispatchEvent(new Event('dxx:request-placements'));
  }
 });
 const bone=kind==='ankle'||kind==='foot';
 frame.src=bone?'../assembly/index.html?task=bone':kind==='paint'?'../painting/index.html?muscle=tibAnt&clinicRegion=1':'../assembly/muscles.html?chapter=ankle&muscle='+kind+'&clinicRegion=1&attempt='+encodeURIComponent(attempt);
 document.body.append(dialog);dialog.showModal();back.focus();
 dialog.addEventListener('close',()=>{dialog.remove();if(opener.isConnected)opener.focus();},{once:true});
}
export function mountWorkshop({host,id,state,save,record,finish}){
 const lesson=caseWorkshops[id],draft=(state.workshopDrafts||={})[id]||={};
 const wrap=element('section');wrap.className='clinic-workshop';host.append(wrap);
 const demo=id==='case_contractions'?contractionDemo():null;
 function render(){
  wrap.replaceChildren(element('p',lesson.intro));
  if(demo)wrap.append(demo);
  const checks=[];
  for(const activity of lesson.activities||[]){
   const keys=activity[3],done=keys.every(k=>draft[k]);checks.push(done);
   const b=control((done?'✓ ':'')+activity[1],()=>openActivity(activity,draft,key=>{draft[key]=true;save();render();},b,state.sessionId));wrap.append(b);
  }
  for(const [number,action,title] of courseActions[id]||[]){
   const link=element('a','实验 '+number+' · '+title+' ↗');
   link.href='../lab/index.html?lesson='+number+'&action='+action;
   link.target='_blank';link.rel='noopener';wrap.append(link);
  }
  for(const [i,[prompt,choices,correct,why]] of (lesson.questions||[]).entries()){
   const key='answer'+i,section=element('fieldset'),feedback=element('p');feedback.setAttribute('role','status');
   section.append(element('legend',prompt));checks.push(draft[key]===true);
   for(const [j,label] of choices.entries()){
    const b=control((draft[key]&&j===correct?'✓ ':'')+label,()=>{
     record('clinic3d_workshop_answer',{nodeId:id,item:i,choice:j,correct:j===correct});
     if(j!==correct){feedback.textContent='再看看动作和提示，换一个试试。';return;}
     draft[key]=true;save();render();
    });b.disabled=!!draft[key];section.append(b);
   }
   if(draft[key])feedback.textContent=why;section.append(feedback);wrap.append(section);
  }
  const next=control('完成本环节，继续',finish);next.disabled=!checks.every(Boolean);wrap.append(next);
 }
 render();
}
