// Descriptive evidence only. No inferred clinical competence or invented grades.
import {arches} from './arch-bones.js';
export function renderPracticeEvidence(host,state){
 const e=(tag,text)=>{const x=document.createElement(tag);x.textContent=text;return x;};
 const foot=state.archBoneDraft||state.taskReceipts?.arch_compare;
 if(foot?.version===1&&foot.selected){
  const section=e('section','');section.className='note-evidence';section.append(e('h3','足弓组成骨辨认'));
  const labels=arches.map(a=>a.title+' '+a.bones.filter(key=>foot.selected[a.id]?.includes(key)).length+' / '+a.bones.length);
  section.append(e('p',labels.join('　')));host.append(section);
 }
 const mechanism=state.taskReceipts?.injury_mechanism||state.mechanismDraft;
 if(mechanism?.version===1){
  const section=e('section','');section.className='note-evidence';section.append(e('h3','踝扭伤机制 · 模型练习'));
  const titles=['距骨与踝穴','内外踝高度','外侧韧带','外翻肌群'],answers=[1,2,0,1];
  const count=titles.filter((_,i)=>mechanism.solved?.[i]).length;
  const details=e('details','');details.append(e('summary','查看四项判断'));const list=e('ul','');
  titles.forEach((title,i)=>{const attempts=mechanism.attempts?.[i]||[];
    list.append(e('li',title+' · '+(mechanism.solved?.[i]?(attempts[0]===answers[i]?'首次判断正确':'反馈后修正'):attempts.length?'待修正':'待完成')));});
  details.append(list);section.append(e('p','已完成 '+count+' / 4 项模型观察与判断。'),details);host.append(section);
 }
 const box=document.createElement('section');box.className='note-evidence';box.append(e('h3','床旁操作复盘'));
 const events=(state.events||[]).filter(x=>x.type?.startsWith('clinic3d_bedside_'));
 const receipt=state.taskReceipts?.ankle_stress;
 const count=type=>events.filter(x=>x.type==='clinic3d_bedside_'+type).length;
 box.append(e('p',receipt?'已完成前抽屉、内翻应力两项模拟操作与结果判断。':events.length?'已经开始，尚未完成两项模拟操作与结果判断。':'本轮尚未操作，不计为完成。'));
 if(events.length){const wrong=events.filter(x=>x.type==='clinic3d_bedside_placement'&&x.payload?.correct===false).length;box.append(e('p',`选错手位 ${wrong} 次；操作反馈 ${count('motion_feedback')} 次；查看示范 ${count('demo')} 次。`));
  const details=document.createElement('details');details.append(e('summary','回看关键操作'));const list=document.createElement('ol');
  for(const item of events){const p=item.payload||{},type=item.type.replace('clinic3d_bedside_','');let text='';
   if(type==='consent'&&p.agreed)text=p.retry?'休息后再次确认患者愿意继续':'说明检查并取得同意';
   if(type==='position'&&p.ankle==='neutral')text='患者仰卧，已将右踝摆至中立位';
   if(type==='placement')text=(p.correct?'手位选择正确 · ':'重新选择手位 · ')+(p.location||{shin:'小腿',heel:'足跟',toes:'前足或脚趾'}[p.target]||'当前位置');
   if(type==='lateral_pressure'&&p.atEndRange)text='保持跟骨内收内翻，在终末位对外踝外侧轻压';
   if(type==='motion_feedback')text={direction:'运动方向需纠正',too_fast:'操作过快或超出界面范围，停止并重试',student_stop:'主动停止检查（不计作错误）',interrupted:'离开页面，操作暂停'}[p.kind]||'收到操作反馈';
   if(type==='demo')text='查看示范（不计完成）';
   if(type==='motion_complete')text='完成缓慢带动、保持与回位';
   if(type==='interpretation')text=p.correct?'解释与证据相符':'结论过度，需要重新判断';
   if(text)list.append(e('li',(p.test?p.test+'：':'')+text));
  }
  details.append(list);box.append(details);
 }
 box.append(e('small','上述记录反映学习过程。患者体征来自课程病例资料；鼠标移动不代表临床施力、松弛度或操作技能考核成绩。'));
 host.append(box);
}
