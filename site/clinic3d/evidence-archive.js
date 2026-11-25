import {caseFindings,assessInstability} from './case-evidence.js?v=72';

export function installEvidenceArchive(state){
  const mount=document.createElement('aside');mount.id='clinicalArchive';mount.hidden=true;
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-haspopup','dialog');
  const count=document.createElement('b');button.append('病例证据 ',count);
  const notice=document.createElement('div');notice.className='archive-notice';notice.role='status';notice.setAttribute('aria-live','polite');
  const dialog=document.createElement('dialog');dialog.className='case-files';dialog.setAttribute('aria-labelledby','archiveTitle');
  mount.append(button,notice);document.body.append(mount,dialog);
  const progress=document.getElementById('caseProgress');
  function anchor(){
    if(mount.hidden)return;
    const r=progress.getBoundingClientRect();
    mount.style.left=Math.max(8,r.width?r.left:12)+'px';
    mount.style.top=(r.width?r.bottom+5:65)+'px';
  }
  new ResizeObserver(anchor).observe(progress);window.addEventListener('resize',anchor);
  let session=null,timer=0;
  function sync(){
    const rows=caseFindings(state),first=session!==state.sessionId;
    const previous=state.clinicalArchive||{};
    const fresh=rows.filter(r=>!Object.hasOwn(previous,r.id));
    for(const row of fresh)previous[row.id]=new Date().toISOString();
    state.clinicalArchive=previous;session=state.sessionId;
    if(first){clearTimeout(timer);notice.replaceChildren();mount.classList.remove('filing');}
    mount.hidden=false;count.textContent=String(rows.length);anchor();
    if(!first&&fresh.length){
      clearTimeout(timer);mount.classList.remove('filing');void mount.offsetWidth;
      notice.textContent='已归档 · '+fresh.map(r=>r.title).join('、');
      mount.classList.add('filing');timer=setTimeout(()=>{mount.classList.remove('filing');notice.replaceChildren();},3100);
    }
  }
  function add(parent,tag,content){
    const node=document.createElement(tag);node.textContent=content;parent.append(node);return node;
  }
  button.addEventListener('click',()=>{
    const rows=caseFindings(state);dialog.replaceChildren();
    const header=add(dialog,'header','');add(header,'h2','陈女士的病例证据').id='archiveTitle';
    const close=add(header,'button','关闭');close.type='button';close.autofocus=true;close.onclick=()=>dialog.close();
    if(!rows.length)add(dialog,'p','完成问诊或检查后，关键发现会记录在这里。');
    for(const group of ['病史','机械性线索','功能性线索','伴随发现']){
      const subset=rows.filter(r=>r.group===group);if(!subset.length)continue;
      const section=add(dialog,'section','');add(section,'h3',group);
      for(const row of subset){add(section,'strong',row.title);add(section,'p',row.detail);}
    }
    if(rows.length){
      add(dialog,'h3','本轮证据支持的判断');add(dialog,'p',assessInstability(state,rows).text);
    }
    const more=add(dialog,'details','');add(more,'summary','进一步评估与转诊线索');
    add(more,'p','可用 CAIT 量表核对患者感知的不稳程度。具备安全条件后，可做星形偏移平衡测试，比较两侧动态控制。这些项目列为待评估。');
    add(more,'p','若询问发现反复交锁或持续深部关节痛，应转医学评估以排查关节内损伤；若有新伤伴明显畸形或无法负重，先停止负重测试。');
    const link=add(more,'a','查阅踝关节外侧扭伤临床实践指南（2021）');link.href='https://doi.org/10.2519/jospt.2021.0302';link.target='_blank';link.rel='noopener';
    dialog.showModal();
  });
  return sync;
}
