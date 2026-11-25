export const firstInjury='快一年前，我下楼梯，右脚踩到下一级台阶时没踩稳，脚底一下翻向左脚那边，右脚踝外侧当时就疼了。';
export const laterInjuries='后来走不平的路又崴过一次，最近一次是一个月前跑步转弯的时候。';
export const lessonLines=[
  '陈女士说，右脚底突然翻向左脚。这就是足内翻，后足也参与了这个动作。',
  '先看距骨。它上面的滑车前宽后窄。脚尖抬起时，较宽的前部进入胫骨和腓骨形成的踝穴，两侧贴合得更紧。',
  '如果迈下台阶时脚尖向下，也就是踝跖屈，进入踝穴的部分相对较窄，骨性的约束就少一些。她记得内翻，具体脚尖有多低，还不能从回忆里确定。',
  '再看内外踝。外踝比内踝伸得更低，对向外翻的骨性限制较多。足突然向内翻时，外侧韧带需要绷紧，帮助拉住关节。',
  '跖屈伴内翻时，距腓前韧带容易受牵拉。跟腓韧带也帮助限制后足过度内翻，它与距腓前韧带在不同脚位分担负荷。',
  '还有一道主动保护。小腿外侧的腓骨长肌和短肌能让足向外翻。如果力量不足，或在落脚时没能及时用上力，就可能来不及稳住脚。',
  '她现在说脚会发软，究竟是韧带松、肌肉控制跟不上，还是两者都有？先核对近期症状，再做床旁查体，比较两侧抗阻外翻，最后看她走路和站立时的表现。'
];
export function inversionPanel(){
  const panel=document.createElement('details'),title=document.createElement('summary');
  title.textContent='听运动学旁白 · 为什么脚会向内崴？';panel.append(title);
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';
  audio.src=new URL('../soap/media/inversion-lesson.mp3',import.meta.url);panel.append(audio);
  for(const text of lessonLines){const para=document.createElement('p');para.textContent=text;panel.append(para);}
  const refs=document.createElement('p');
  for(const [title,url] of [
    ['踝足结构与扭伤机制','https://pmc.ncbi.nlm.nih.gov/articles/PMC6602390/'],
    ['不同脚位的韧带应变实验','https://pubmed.ncbi.nlm.nih.gov/34144675/'],
    ['突然内翻时的腓骨肌反应','https://doi.org/10.3109/17453679008993546']
  ]){const a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener';refs.append(a,'　');}
  panel.append(refs);panel.addEventListener('toggle',()=>{if(!panel.open)audio.pause();});return panel;
}
