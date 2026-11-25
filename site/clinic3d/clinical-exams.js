import {createMotionNarration} from './motion-narration.js';
import {MUSCLE_ITEMS} from './case-muscle-v14.js';

const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function action(label,fn){const b=el('button',label);b.type='button';b.addEventListener('click',fn);return b;}

const movementItems=[
 ['抬起脚尖、再向下压，主要由哪个关节完成？',['距跟关节','距小腿关节','趾间关节'],1,'距小腿关节又称距上关节，主要完成背伸和跖屈。'],
 ['从外侧看脚尖抬起和下压，主要在哪个面、绕哪个方向的轴运动？',['矢状面，近似绕内外方向的轴','额状面，近似绕前后方向的轴','水平面，近似绕垂直轴'],0,'背伸和跖屈以矢状面运动为主。真实踝轴略倾斜，足还可伴随小幅的其他方向运动。'],
 ['把足底转向内侧或外侧，后足主要在哪个关节发生这个动作？',['距跟关节','距小腿关节','第一跖趾关节'],0,'距跟关节属于距下关节，其斜轴运动有明显的内翻、外翻分量。'],
 ['坐位、足相对小腿运动。哪一组是常见的伴随方向？',['背伸伴内收，跖屈伴外展','背伸和跖屈都伴内收','背伸伴外展，跖屈伴内收'],2,'以足相对小腿为参照，抬起时可伴外展，下压时可伴内收。伴随幅度会随个体和任务而变。'],
 ['足整体旋前时，哪三个方向组合在一起？',['跖屈、内收、内翻','背伸、外展、外翻','背伸、内收、外翻'],1,'开链旋前包括背伸、外展和外翻，距下关节参与三平面的联动。'],
 ['把动作反过来，足整体旋后时会看到什么？',['跖屈、内收、内翻','跖屈、外展、内翻','背伸、外展、外翻'],0,'开链旋后包括跖屈、内收和内翻。'],
 ['从正后方观察内外翻，要描述其额状面分量，用哪条参考轴？',['前后轴','内外轴','垂直轴'],0,'额状面与前后轴垂直。距下关节实际绕斜轴活动，不能用这一分量代表全部运动。']
];
const motionLessons=[
 {id:'sagittal',name:'距小腿关节 · 跖屈和背伸',description:'从右踝外侧看。小腿保持不动，距骨在踝穴中随足转动。跖屈时足尖向下，站立提踵也用到跖屈；背伸时足尖向上，做勾脚动作。主要运动面是矢状面，近似绕穿过内外踝的内外轴转动。'},
 {id:'subtalar',name:'距下关节 · 内翻和外翻',description:'从右足后方看橙色的跟骨。跟骨相对距骨转动，内翻时足外侧缘降低、内侧缘抬高。外翻时足外侧缘抬高、内侧缘降低。内外翻的额状面分量可用前后轴描述，真实距下关节绕斜轴转动，还伴有水平面和矢状面分量。'}
];
function hasSeenMotion(book,lesson){return book.get('motionVideo_'+lesson.id)===true;}
export function motionComplete(book){return motionLessons.every(lesson=>hasSeenMotion(book,lesson))&&movementItems.every((_,i)=>book.get('motion54_'+i)===true);}
const strengthActions={
 dorsiflexion:{name:'背伸',muscle:'胫骨前肌',paint:'tibAnt',cue:'把脚尖往上勾，稍微朝里，保持住。',hand:'固定小腿远端，在足背内侧向下、向外施阻。'},
 plantarflexion:{name:'跖屈',muscle:'腓肠肌、比目鱼肌',paint:'gastrocnemius',cue:'脚往下踩，顶住我的手。',hand:'俯卧，足伸出床沿。固定小腿，在前脚掌足底向背伸方向施阻。伸膝观察小腿三头肌，屈膝侧重比目鱼肌。'},
 inversion:{name:'内翻',muscle:'胫骨后肌',paint:'tibPost',cue:'脚尖稍微往下，把脚底朝里转，保持住。',hand:'足稍跖屈，固定小腿，从足背内侧向外翻、略向背伸方向施阻。'},
 eversion:{name:'外翻',muscle:'腓骨长肌、腓骨短肌',paint:'fibLong',cue:'把脚底朝外转，顶住我的手。',hand:'固定小腿，手贴足背外侧缘，在前足向内翻方向施阻，观察能否保持。'}
};
const passes=['dorsiflexion','inversion','eversion','plantarflexion','soleus'];
const recordKey=(side,pass)=>'bedStrength_'+side+'_'+pass;
function sideDone(book,side){return passes.every(pass=>book.get(recordKey(side,pass))===true);}
function strengthObserved(book){return ['L','R'].every(side=>sideDone(book,side));}
export function strengthComplete(book){return strengthObserved(book)&&book.get('bedStrength_interpret')===true;}

// Present one question at a time. Revisiting a completed item retains its explanation.
function quiz(host,items,book,prefix,onAnswer){
 let i=items.findIndex((_,n)=>!book.get(prefix+n));if(i<0)i=0;
 function draw(){
  host.replaceChildren();const [question,choices,key,why]=items[i],done=book.get(prefix+i)===true;
  const heading=el('h4',question),status=el('p');status.setAttribute('role','status');
  host.append(el('small',(i+1)+' / '+items.length),heading);
  choices.forEach((text,j)=>{const b=action(text,()=>{
   if(j!==key){onAnswer(i,j,false);status.textContent='再看一次动作方向。';return;}
   book.set(prefix+i,true);onAnswer(i,j,true);draw();
  });b.disabled=done;if(done&&j===key)b.textContent='✓ '+text;host.append(b);});
  if(done)status.textContent=why;host.append(status);
  const nav=el('div');nav.className='clinical-nav';
  if(i>0)nav.append(action('上一题',()=>{i--;draw();}));
  if(done&&i<items.length-1)nav.append(action('下一题',()=>{i++;draw();}));
  host.append(nav);
 }
 draw();
}

export function showMotion(ctx){
 const {wrap,book,record,changed}=ctx;
 const content=el('section');content.className='motion-lesson';wrap.append(content);
 const narration=createMotionNarration(ctx);
 function questions(){
  narration.setVideo(null);content.replaceChildren();
  content.append(el('p','用通用量角器测背伸和跖屈。轴心对准外踝中心，固定臂沿腓骨外侧指向腓骨头，移动臂沿第五跖骨外侧，随足转动。'));
  const nav=el('div');nav.className='clinical-nav';
  nav.append(action('重看关节动画',()=>watch(0)));ctx.anatomyButton(nav,'ankle');content.append(nav);
  const panel=el('section');panel.className='clinical-quiz';content.append(panel);
  quiz(panel,movementItems,book,'motion54_',(i,j,correct)=>{record('clinic3d_motion_answer',{item:i,answer:j,correct});changed();});
 }
 function watch(index){
  const lesson=motionLessons[index],last=index===motionLessons.length-1;
  const video=el('video');
  video.src=new URL('./assets/ankle-motion-'+lesson.id+'.mp4?v=79.2',import.meta.url).href;
  video.controls=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('aria-label',lesson.name);video.dataset.motion=lesson.id;
  const next=action(last?'进入运动辨认':'看内翻和外翻',()=>{video.pause();if(last)questions();else watch(index+1);});
  next.disabled=!hasSeenMotion(book,lesson);
  const nav=el('div');nav.className='clinical-nav';
  if(index>0)nav.append(action('重看跖屈和背伸',()=>{video.pause();watch(0);}));
  nav.append(action('重播本段讲解',()=>narration.replayVideo()),next);
  const planes=el('dl');planes.className='motion-landmarks';
  const sagittal=lesson.id==='sagittal';
  for(const [label,value] of [
   ['观察面',sagittal?'矢状面 · 从外侧看':'额状面分量 · 从后方看'],
   ['运动轴',sagittal?'近似内外轴 · 经过内外踝附近':'实际为斜轴 · 从跟骨后外下方指向前内上方'],
   ['运动骨段',sagittal?'足与距骨相对小腿上勾、下压':'开链时，跟骨相对距骨内翻、外翻']
  ])planes.append(el('dt',label),el('dd',value));
  const explore=el('a','在三维模型上拖动观察轴和面 ↗');
  explore.href='../lab/index.html?lesson=1&action='+(sagittal?'01-13':'01-14');explore.target='_blank';explore.rel='noopener';
  content.replaceChildren(el('h3',lesson.name),video,planes,el('p',lesson.description),explore,nav);
  video.addEventListener('ended',()=>{
   if(!video.isConnected||!content.contains(video))return;
   if(!hasSeenMotion(book,lesson)){
    book.set('motionVideo_'+lesson.id,true);
    record('clinic3d_joint_motion_viewed',{joint:lesson.id,assessmentCredit:false});changed();
   }
   next.disabled=false;
  });
  narration.setVideo(video);
 }
 const pending=motionLessons.findIndex(lesson=>!hasSeenMotion(book,lesson));
 if(pending===-1)questions();else watch(pending);
 return narration;
}

import {toeDirection} from './toe-direction.js';
export function showStrength(ctx){
 const {wrap,book,record,changed,pose,coachVoice}=ctx;
 const tabs=el('div'),help=el('p'),trials=el('section'),finding=el('p'),question=el('section'),links=el('div');
 tabs.className=trials.className=links.className='clinical-nav';question.className='clinical-quiz';finding.setAttribute('role','status');
 const heading=el('h4'),project=el('input');project.type='checkbox';project.checked=true;
 const projection=el('label');projection.className='cop-reference-option';projection.append(project,'投影到患者小腿');
 let side=sideDone(book,'L')?'R':'L',pass=passes.find(k=>!book.get(recordKey(side,k)))||'eversion';
 let mode='rest',token=0;
 const motion=()=>pass==='soleus'?'plantarflexion':pass;
 const title=()=>strengthActions[motion()];
 const sideName=()=>side==='L'?'左':'右';
 const poseNow=()=>pose(side,mode,motion(),pass==='soleus',project.checked);
 const paint=el('a');paint.target='_blank';paint.rel='noopener';
 function select(k,next){
  const enteringProne=motion()!=='plantarflexion'&&['plantarflexion','soleus'].includes(next);
  token++;side=k;pass=next;mode='rest';if(enteringProne)coachVoice('请翻身趴好，脚伸出床沿。');finding.textContent='';poseNow();controls();
 }
 project.addEventListener('change',()=>ctx.projectMuscle(project.checked));
 function controls(){
  const trial=title(),loading=mode==='resist'||mode==='relax';
  heading.textContent=sideName()+'侧 · '+(pass==='soleus'?'屈膝跖屈':pass==='plantarflexion'?'伸膝跖屈':trial.name)+' · '+(pass==='soleus'?'比目鱼肌':trial.muscle);
  tabs.replaceChildren();
  for(const [k,label] of [['L','左侧 · 健侧'],['R','右侧 · 患侧']]){
   const b=action(label,()=>select(k,passes.find(x=>!book.get(recordKey(k,x)))||'eversion'));b.disabled=loading||(k==='R'&&!sideDone(book,'L'));b.setAttribute('aria-pressed',String(side===k));tabs.append(b);
  }
  help.textContent=motion()==='eversion'?(side==='R'?'治疗师右手固定右小腿，左手贴右前足外侧，向内施阻。':'治疗师左手固定左小腿，右手贴左前足外侧，向内施阻。'):trial.hand;
  paint.textContent='肌肉彩绘 ↗';paint.href='../painting/index.html?muscle='+(pass==='soleus'?'soleus':trial.paint);
  trials.replaceChildren();
  const menu=el('select');menu.setAttribute('aria-label','选择检查动作');menu.disabled=loading;
  for(const id of passes){const o=el('option',(book.get(recordKey(side,id))?'✓ ':'')+(id==='soleus'?'跖屈 · 屈膝':id==='plantarflexion'?'跖屈 · 伸膝':strengthActions[id].name));o.value=id;menu.append(o);}menu.value=pass;menu.onchange=()=>select(side,menu.value);
  trials.append(menu);
  const key='toeDirection_'+motion();
  if(mode==='rest'&&['dorsiflexion','plantarflexion'].includes(motion())&&!book.has(key)){
   trials.append(toeDirection(motion(),side,(outcome,drag={})=>{
    if(outcome!=='retry')book.set(key,outcome);
    record('clinic3d_strength_direction',{side,motion:motion(),outcome,...drag});changed();
    if(outcome!=='retry'){finding.textContent=outcome==='correct'?'方向正确，可以开始抗阻检查。':'方向题已跳过。';controls();}
   }));
  }else if(mode==='rest'||mode==='result'){
   const start=action(book.get(recordKey(side,pass))?'再查一次':'固定小腿，患者用力',()=>{mode='active';poseNow();coachVoice(pass==='soleus'?'现在把膝盖弯起来，再往下踩一次。':trial.cue);finding.textContent='观察治疗师双手接触的位置。';controls();});start.dataset.mmt='contact';trials.append(start);
  }
  if(mode==='active')trials.append(action('施加反向阻力',()=>{
   const attempt=++token;mode='resist';
   const effort='您用力对抗我的手，来，慢慢用力。';
   finding.textContent='林治疗师：'+effort;controls();
   Promise.all([poseNow(),coachVoice(effort)]).then(async ([ok])=>{
    if(!ok||token!==attempt||!trials.isConnected)return;
    mode='relax';poseNow();
    const release='很好，您慢慢放松。';
    finding.textContent='林治疗师：'+release;controls();
    await coachVoice(release);
    if(token!==attempt||!trials.isConnected)return;
    const yields=pass==='eversion'&&side==='R';
    mode='result';book.set(recordKey(side,pass),true);
    record('clinic3d_resisted_motion',{side,action:motion(),knee:pass==='soleus'?'flexed':pass==='plantarflexion'?'extended':null,observation:yields?'yields':'holds',source:'simulated-bedside-case'});
    finding.textContent=sideName()+'足'+(yields?'起初能保持外翻，随后在阻力下往回落。':'能保持这个位置。');changed();controls();
   });
  }));
  if(mode==='result'&&!strengthObserved(book)){
   const next=passes.find(k=>!book.get(recordKey(side,k)));
   trials.append(action(next?'下一项':'开始右侧检查',()=>select(next?side:'R',next||passes.find(k=>!book.get(recordKey('R',k)))||passes[0])));
  }
  question.replaceChildren();if(!strengthObserved(book))return;
  if(book.get('bedStrength_interpret')){question.append(el('strong','已记录四个方向的双侧比较。'));return;}
  question.append(el('h4','哪一项出现明显侧差？'));
  for(const [i,label] of ['四个方向都无力','右侧维持抗阻外翻较困难'].entries())question.append(action(label,()=>{
   record('clinic3d_strength_interpretation',{correct:i===1,answer:i});
   if(i===0){finding.textContent='回看两侧的外翻表现。其他三个方向均能保持。';return;}
   book.set('bedStrength_interpret',true);finding.textContent='右足外翻在阻力下较早回落，其余三个方向未见明显侧差。';changed();controls();
  }));
 }
 links.append(action('肌肉解剖知识测试',()=>{
  const dialog=el('dialog');dialog.className='clinical-modal';const body=el('section'),close=action('返回肌力检查',()=>dialog.close());
  dialog.setAttribute('aria-label','肌肉解剖知识测试');dialog.append(el('h3','肌肉解剖知识测试'),body,close);body.className='clinical-quiz';wrap.append(dialog);
  const order=[3,0,2,1],answers=order.map(j=>MUSCLE_ITEMS[j].muscles.join('、'));
  quiz(body,order.map((j,i)=>[MUSCLE_ITEMS[j].label+'时，主要有哪些肌肉参与？',answers,i,MUSCLE_ITEMS[j].groupLabel]),book,'anatomy54_',(i,j,correct)=>{record('clinic3d_optional_muscle_quiz',{item:order[i],answer:order[j],correct});changed();});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 }));
 links.append(paint);wrap.append(tabs,heading,help,projection,trials,finding,question,links);poseNow();controls();
}
