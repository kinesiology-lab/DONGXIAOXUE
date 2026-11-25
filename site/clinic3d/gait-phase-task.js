import {footRocker,heelRisePhase} from './walking-pose-v27.js?v=72';
import {GAIT_CASE} from './gait-lesson.js';

const leftLands = GAIT_CASE.leftContactPhase;
const leftLifts = leftLands + GAIT_CASE.stance.left - 1;
const rightLifts = GAIT_CASE.stance.right;
const clips = {
  double: {label:'双支撑相', intervals:[[0,leftLifts],[leftLands,rightLifts]],
    captions:['第一次双支撑：右脚刚着地，左脚仍接触地面。','第二次双支撑：左脚刚着地，右脚仍接触地面。']},
  rightStance: {label:'右侧单支撑相', intervals:[[leftLifts,leftLands]],
    captions:['只有右脚着地支撑，左脚向前摆动。']},
  rightSwing: {label:'右侧摆动相', intervals:[[rightLifts,1]],
    captions:['右脚离地向前摆动，由左脚单独支撑。']}
};
const answers = {
  step:'从右脚着地，到左脚下一次着地。',
  cycle:'从右脚初次着地，到右脚下一次初次着地。',
  stance:'从右脚着地，到右脚离地。'
};

export function gaitPhasesComplete(book) {
  return book.get('cycleAnswer') === 'cycle' && Object.keys(clips).every(id => book.get('seen_'+id) === true) && Number.isFinite(book.get('heelRiseMark'));
}

// Excerpts end inside each interval, where contact and swing remain visible in the held pose.
export function gaitExcerpt(id, seconds) {
  const clip = clips[id], duration = 1.15;
  const segment = Math.min(Math.floor(seconds/duration), clip.intervals.length-1);
  const [start,end] = clip.intervals[segment];
  const progress = Math.min(1,seconds/duration-segment);
  return {segment, phase:start+(end-start)*(.08+.59*progress), finished:seconds>=duration*clip.intervals.length};
}

export function mountGaitQuestion({wrap,button,nodeEl,chooseAnswer,play,book,seek,onMark}) {
  const title = nodeEl('h3','task-card-title','什么是步态周期？');
  const choices = nodeEl('div','cycle-choices');
  for (const [id,label] of Object.entries(answers)) {
    const option = button(label,()=>chooseAnswer(id));
    option.dataset.cycleAnswer=id;
    choices.append(option);
  }
  const feedback=nodeEl('p','cycle-feedback');
  feedback.id='cycleFeedback';feedback.setAttribute('role','status');
  const phases=nodeEl('section','cycle-phases');
  phases.id='cyclePhases';
  const heading=nodeEl('h3','task-card-title','点选时相，观察患者的双脚');heading.tabIndex=-1;
  const controls=nodeEl('div','cycle-controls');
  for (const [id,{label}] of Object.entries(clips)) {
    const b=button(label,()=>play(id));b.dataset.gaitPhase=id;
    controls.append(b);
  }
  const caption=nodeEl('p','cycle-caption');
  caption.id='cycleCaption';caption.setAttribute('role','status');
  const film=nodeEl('fieldset','heel-film'),legend=nodeEl('legend','','逐帧定位右足跟开始抬起的时刻');
  const frame=document.createElement('input');frame.type='range';frame.min='12';frame.max='51';frame.step='1';frame.value=String(book.get('heelFrame')??12);frame.setAttribute('aria-label','步态周期百分比');
  const images=nodeEl('div','heel-closeups'),output=nodeEl('output'),feedbackHeel=nodeEl('p');feedbackHeel.setAttribute('role','status');
  const onset=heelRisePhase(true)*GAIT_CASE.stance.right/.6;
  function draw(move){
    const percent=Number(frame.value),phase=percent/100;output.textContent='周期 '+percent+'%';
    if(move){book.set('heelFrame',percent);seek(phase);}
    images.replaceChildren();
    for(const [affected,label,stance] of [[true,'陈女士右足',GAIT_CASE.stance.right],[false,'同侧教学参考',.60]]){
      const {pitch}=footRocker(.6*phase/stance,.0678,affected);
      const fig=nodeEl('figure'),canvas=document.createElement('canvas');canvas.width=245;canvas.height=86;
      const g=canvas.getContext('2d');g.fillStyle='#eef5f3';g.fillRect(0,0,245,86);g.strokeStyle='#58746a';g.beginPath();g.moveTo(10,72);g.lineTo(235,72);g.stroke();g.translate(206,71);g.rotate(-pitch);
      g.fillStyle=affected?'#386f75':'#829291';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(19,-3,4,-11);g.quadraticCurveTo(-47,-14,-90,-35);g.lineTo(-112,-62);g.lineTo(-143,-58);g.lineTo(-143,-26);g.quadraticCurveTo(-163,1,-140,0);g.quadraticCurveTo(-109,1,-83,-8);g.quadraticCurveTo(-59,-4,-36,0);g.closePath();g.fill();g.fillStyle='#d46728';g.beginPath();g.arc(-140,-3,4,0,Math.PI*2);g.fill();
      fig.append(canvas,nodeEl('figcaption','',label));images.append(fig);
    }
  }
  frame.oninput=()=>draw(true);
  const mark=button('标记右足跟刚离地的一帧',()=>{
   const p=Number(frame.value)/100;draw(true);
   if(p>=onset-.012 && p<=onset+.071){book.set('heelRiseMark',p);feedbackHeel.textContent='已记录。此时右前足仍接触地面，参考足跟尚未抬起。背伸受限是需要复核的一种解释。';}
   else feedbackHeel.textContent=p<onset?'再向后看几帧，留意橙色跟部标记与地面的间隙。':'再向前找，观察足跟刚离地、前足仍着地的时刻。';
   onMark();
  });
  if(Number.isFinite(book.get('heelRiseMark')))feedbackHeel.textContent='已记录右足跟离地帧。';
  draw(false);film.append(legend,images,output,frame,mark,feedbackHeel);film.hidden=true;
  phases.append(heading,controls,caption,film);wrap.append(title,choices,feedback,phases);
}

export function paintGaitQuestion({$,book,phase,playing,locked}) {
  const answer=book.get('cycleAnswer'), correct=answer==='cycle';
  for (const b of document.querySelectorAll('[data-cycle-answer]')) {
    b.hidden=correct;
    b.setAttribute('aria-pressed',String(b.dataset.cycleAnswer===answer));
  }
  const feedback=$('cycleFeedback');
  if(!feedback)return;
  feedback.hidden=!answer;
  feedback.textContent=correct?'对。从同一只脚初次着地，到这只脚下一次初次着地，就是一个步态周期。':
    answer==='step'?'这描述的是一步。再看看一个完整周期在哪里结束。':'这是右脚的支撑相。完整周期还包括右脚摆动。';
  $('cyclePhases').hidden=!correct;
  const film=$('cyclePhases').querySelector('.heel-film');film.hidden=!Object.keys(clips).every(id=>book.get('seen_'+id));
  const selected=playing?.id || book.get('lastGaitPhase');
  for(const b of document.querySelectorAll('[data-gait-phase]')) {
    const id=b.dataset.gaitPhase,seen=book.get('seen_'+id)===true;
    b.setAttribute('aria-pressed',String(id===selected));
    b.textContent=(seen?'✓ ':'')+clips[id].label;
  }
  const caption=$('cycleCaption');
  caption.hidden=!clips[selected];
  if(clips[selected])caption.textContent=clips[selected].captions[selected==='double'&&phase>=leftLands?1:0];
  const next=$('options').querySelector('[data-option="events_done"]');
  if(next)next.disabled=locked || !gaitPhasesComplete(book);
}
