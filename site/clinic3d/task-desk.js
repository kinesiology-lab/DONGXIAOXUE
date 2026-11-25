import {encounterProgress} from './encounter-progress.js?v=74';
export function installTaskDesk(snapshot,studyStep,canStudy){
  const desk=document.getElementById('taskDesk'), content=desk.querySelector('[data-content]');
  const buttons=[...desk.querySelectorAll('[data-section]')];
  const hud=document.getElementById('caseProgress'), meter=hud.querySelector('progress'), number=hud.querySelector('output');
  let section='steps',last='';
  function show(tab){
    section=tab;
    const state=snapshot()||{}, p=encounterProgress(state);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===tab)));
    const scroll=desk.scrollTop;content.replaceChildren();
    const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;content.append(el);return el;};
    if(tab==='info'){
      add('h2','反复崴脚的原因是什么？');
      add('p','跟随陈女士完成问诊、查体与步态观察，根据收集到的证据讨论康复计划。');
      const a=add('a','回看五段病例视频');a.href='../project-guide/film.html';a.target='_blank';a.rel='noopener';return;
    }
    add('h2','学习进度　'+p.percent+'%');
    const bar=add('progress','');bar.max=p.total;bar.value=p.completed;bar.setAttribute('aria-label','病例学习完成进度');
    add('p','已完成 '+p.completed+' / '+p.total+' 步'+(p.skipped?'，已跳过 '+p.skipped+' 步。':'。'));
    if(tab==='steps'){
      const list=add('ol','');
      for(const [i,row] of p.rows.entries()){
        const li=document.createElement('li'),title=document.createElement('strong'),status=document.createElement('span'),action=document.createElement('button');
        title.textContent=(i+1)+'. '+row.title;status.textContent=row.status;li.dataset.status=row.status;
        action.type='button';action.textContent='进行此环节学习';action.dataset.studyStep=row.id;
        action.setAttribute('aria-label','进行此环节学习：'+row.title);
        action.disabled=!canStudy();action.onclick=()=>{desk.close();studyStep(row.id);};
        li.append(title,status,action);list.append(li);
      }
    }else{
      const a=add('a','查看个人学习反馈');a.href='../index.html#finish';
    }
    desk.scrollTop=scroll;
  }
  function refresh(){
    const state=snapshot(),p=encounterProgress(state||{});
    const signature=canStudy()+'|'+p.rows.map(row=>row.status).join('|');
    if(last===signature)return;
    last=signature;meter.max=p.total;meter.value=p.completed;
    number.textContent=p.completed+' / '+p.total+' · '+p.percent+'%';
    hud.setAttribute('aria-label','查看学习进度，已完成 '+p.completed+' 步，共 '+p.total+' 步');
    if(desk.open)show(section);
  }
  for(const b of buttons)b.addEventListener('click',()=>show(b.dataset.section));
  for(const b of document.querySelectorAll('[data-open-desk]'))b.addEventListener('click',()=>{show(b.dataset.openDesk);desk.showModal();});
  desk.querySelector('[data-close]').addEventListener('click',()=>desk.close());
  refresh();return refresh;
}
