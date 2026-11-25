const $=id=>document.getElementById(id);
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const base=new URL('./',import.meta.url),url=new URL(location.href),profile=window.DXXHub?.profile()||null;
const recordsKey=window.DXXHub?.gameKey()||'dxx_assembly_clean_v1_guest_records';
function dockScore(){
  const score=document.querySelector('body > .assessment-dock');
  if(!score)return false;
  document.querySelector('.title').append(score);return true;
}
if(url.searchParams.has('assessment')&&!dockScore()){
  const observer=new MutationObserver(()=>{if(dockScore())observer.disconnect();});
  observer.observe(document.body,{childList:true});
}
const draftKey=recordsKey+'_flat_'+(url.searchParams.get('attempt')||'practice');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const draft=read(draftKey,{});draft.groups||={};
function restoreAnkleGroup(g){
  const prior={fibLong:'ankle-38',fibBrevis:'ankle-39',fibTertius:'ankle-38'};
  const items={};
  if(g.id==='ankle-pair'||g.id==='ankle-tertius'){
    for(const {key} of g.items){
      const record=draft.groups[prior[key]]?.items?.[key];
      if(record)items[key]={...record};
    }
  }
  return {id:crypto.randomUUID(),started:new Date().toISOString(),elapsed:0,items};
}
let groups,group,session,selected=null,activeTime=Date.now(),imgMasks=[],points=[],generation=0;
const event=(type,extras)=>window.dispatchEvent(new CustomEvent('dxx:guide',{detail:{area:'assembly',type,chapter:group.region,task:'muscle',round:group.id,explore:false,...extras}}));
function tick(){const now=Date.now();if(session&&activeTime)session.elapsed+=Math.min(now-activeTime,120000);activeTime=document.hidden?0:now;}
function save(){
  if(!session)return;tick();draft.current=group.id;
  try{localStorage.setItem(draftKey,JSON.stringify(draft));
    if(!Object.keys(session.items).length)return;
    const list=read(recordsKey,[]),rows=group.items.map(item=>{const v=session.items[item.key]||{};return {name:item.name,side:'图示侧',locked:!!v.placed,attempts:v.tries||0,assisted:false,functionCorrect:!!v.answered};});
    const done=rows.filter(r=>r.locked&&r.functionCorrect).length;
    const rec={flatId:session.id,app:'动小学 · 肌肉安放工坊',profile,learner:profile?.name||'体验者',chapter:group.regionName+' · '+group.layer,chapterId:group.region,task:'muscle',difficulty:'guide',startedAt:session.started,endedAt:new Date().toISOString(),status:done===rows.length?'已完成所选组':'学习中',firstRound:1,lastRound:1,visitedRounds:[1],totalRounds:1,elapsedMs:session.elapsed,placed:rows.filter(r=>r.locked).length,firstCorrect:rows.filter(r=>r.locked&&r.attempts===1).length,attemptedPieces:rows.filter(r=>r.attempts>0).length,adjustments:rows.reduce((n,r)=>n+Math.max(0,r.attempts-(r.locked?1:0)),0),hints:0,functionCorrect:done,rows,events:[],scope:'二维图谱安放与功能辨认'};
    const at=list.findIndex(r=>r.flatId===session.id);if(at>=0)list[at]=rec;else list.push(rec);
    localStorage.setItem(recordsKey,JSON.stringify(list));
  }catch{ $('status').textContent='当前浏览器无法保存，请检查可用的本机存储空间。';}
}
function choose(item){
  selected=item;for(const b of $('tray').children)b.setAttribute('aria-pressed',String(b.dataset.key===item.key));
  showAttachments();$('status').textContent=session.items[item.key]?.placed?'已安放 '+item.name+'。':'请把'+item.name+'放到图中的对应位置。';quiz();
}
function quiz(){
  const host=$('quiz');host.replaceChildren();if(!selected||!session.items[selected.key]?.placed)return;
  const item=selected,row=session.items[item.key];host.append(el('strong',item.name));
  if(row.answered){
    host.append(el('p',item.fn));
    if(!item.course&&item.origin&&item.insertion)host.append(el('p','起点　'+item.origin),el('p','止点　'+item.insertion));return;
  }
  host.append(el('p','这块肌肉参与哪个动作？'));
  const decoys=['屈肘并使前臂旋后。','伸膝，使小腿向前伸直。','跖屈踝关节，参与蹬地。','闭口时上提下颌骨。'];
  const avoid={shoulder:[0],elbow:[0],knee:[1],ankle:[2],foot:[2],tmj:[3]};
  const options=decoys.filter((_,i)=>!(avoid[group.region]||[]).includes(i)).slice(0,2);
  options.splice((item.key.length+group.items.indexOf(item))%3,0,item.fn);
  for(const value of options){const b=el('button',value);b.onclick=()=>{
    const ok=value===item.fn;event('function_answer',{key:item.key,correct:ok});
    if(!ok){$('status').textContent='再想一想，这块肌肉跨过哪个关节？';return;}
    row.answered=true;save();draw();$('status').textContent=item.name+'的位置与功能已记录。';
  };host.append(b);}
}
function place(key){
  if(!selected){$('status').textContent='先从右侧选择一块肌肉。';return;}
  const item=selected,v=session.items[item.key]||={tries:0};
  if(v.placed){choose(item);return;}
  v.tries++;const ok=item.key===key;event('placement',{key:item.key,correct:ok});if(ok)v.placed=true;
  save();draw();$('status').textContent=ok?item.name+'已归位，接下来辨认它的功能。':'位置还需调整。看一下骨性标志，再选一次。';
}
function nearest(e){
 const box=$('board').getBoundingClientRect(),x=(e.clientX-box.left)/box.width*440,y=(e.clientY-box.top)/box.height*480;
 const hits=imgMasks.filter(a=>{const [l,t,r,b]=a.item.box;if(x<l||x>=r||y<t||y>=b||!a.mask)return false;return a.mask[(Math.floor(y)-t)*(r-l)+Math.floor(x)-l]>12;});
 if(hits.some(h=>h.item.key===selected?.key))return selected.key;
 if(hits[0])return hits[0].item.key;
 const rank=points.map(o=>({key:o.key,d:Math.hypot(x-o.x,y-o.y)})).sort((a,b)=>a.d-b.d);
 return rank[0]?.d<32?rank[0].key:null;
}
function showAttachments(){
 const board=$('board'),notes=$('attachments');
 board.querySelector('.attachment-lines')?.remove();notes.replaceChildren();
 if(!selected?.course)return;
 const item=selected;
 notes.style.setProperty('--muscle-color',item.color);
 notes.append(el('strong',item.name),el('p','起点　'+item.origin),el('p','走向　'+item.course),el('p','止点　'+item.insertion));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('attachment-lines');svg.setAttribute('viewBox','0 0 440 480');svg.setAttribute('aria-hidden','true');
 function shape(tag,attrs){
   const e=document.createElementNS(svg.namespaceURI,tag);
   for(const [key,value] of Object.entries(attrs))e.setAttribute(key,value);
   svg.append(e);return e;
 }
 const mark=(p,end)=>{
  const [x,y]=p,tx=end?389:44;
  shape('path',{d:'M '+x+' '+y+' L '+tx+' '+y,stroke:item.color,'stroke-width':1.6,fill:'none'});
  shape('circle',{cx:x,cy:y,r:3.4,fill:item.color,stroke:'white','stroke-width':1});
 };
 mark(item.originPoint,false);item.ends.forEach(p=>mark(p,true));
 for(const [x,y,name] of [[11,item.originPoint[1]+5,'起点'],[392,item.ends[0][1]+5,'止点']]){
  shape('text',{x,y,fill:item.color,'font-weight':'700','font-size':15}).textContent=name;
 }
 board.append(svg);
 for(const im of board.querySelectorAll('img[data-muscle]')){
  const focus=im.dataset.muscle===item.key;
  im.classList.toggle('focus-muscle',focus);
  im.classList.toggle('other-muscle',!focus);
 }
}
function draw(){
 const board=$('board'),tray=$('tray');board.replaceChildren();tray.replaceChildren();points=[];imgMasks=[];const token=++generation;
 board.style.backgroundImage='url("'+new URL(group.background||group.id+'.webp',base).href+'")';
 group.items.forEach((item,j)=>{
  const [l,t,r,b]=item.box,placed=!!session.items[item.key]?.placed,im=el('img');im.alt='';if(item.course)im.dataset.muscle=item.key;if(!placed)im.className='ghost';
  Object.assign(im.style,{left:l/440*100+'%',top:t/480*100+'%',width:(r-l)/440*100+'%',height:(b-t)/480*100+'%'});board.append(im);
  const entry={item,mask:null};imgMasks.push(entry);
  im.onload=()=>{if(token!==generation)return;const c=el('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;entry.mask=new Uint8Array(a.length/4);for(let i=0;i<entry.mask.length;i++)entry.mask[i]=a[i*4+3];};
  im.src=new URL(item.img,base).href;
  const [ox,oy]=item.point;let x=ox,y=oy;
  for(let k=0;k<24&&points.some(p=>Math.hypot(x-p.x,y-p.y)<48);k++){const a=k*2.4,r=33+3*k;x=Math.min(421,Math.max(19,ox+r*Math.cos(a)));y=Math.min(461,Math.max(19,oy+r*Math.sin(a)));}
  points.push({key:item.key,x,y});
  if(x!==ox||y!==oy){const leader=el('i');leader.className='leader';Object.assign(leader.style,{left:ox/440*100+'%',top:oy/480*100+'%',width:Math.hypot(x-ox,y-oy)/440*100+'%',transform:'rotate('+Math.atan2(y-oy,x-ox)+'rad)'});board.append(leader);}
  const target=el('button',String(j+1));target.className='target'+(placed?' placed':'');target.dataset.site=item.key;
  if(item.color)target.style.setProperty('--muscle-color',item.color);target.style.left=x/440*100+'%';target.style.top=y/480*100+'%';target.setAttribute('aria-label','位置 '+(j+1)+(placed?'，已归位 '+item.name:''));target.onclick=e=>{e.stopPropagation();if(placed&&!selected)choose(item);else place(item.key);};board.append(target);
 });
 for(const item of [...group.items].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'))){
  const button=el('button');button.draggable=true;button.dataset.key=item.key;button.setAttribute('aria-pressed',String(selected?.key===item.key));
  const img=el('img');img.src=new URL(item.img,base).href;img.alt='';img.draggable=false;
  if(item.color){const swatch=el('i');swatch.className='muscle-swatch';swatch.style.backgroundColor=item.color;button.append(swatch);}else button.append(img);
  button.append(el('span',(session.items[item.key]?.placed?'✓ ':'')+item.name));
  button.onclick=()=>choose(item);button.ondragstart=e=>{choose(item);e.dataTransfer.setData('text/plain',item.key);e.dataTransfer.effectAllowed='move';};tray.append(button);
 }
 const n=group.items.filter(x=>session.items[x.key]?.answered).length;$('bar').max=group.items.length;$('bar').value=n;$('count').textContent=n+' / '+group.items.length+' 项';showAttachments();quiz();
}
function reportPair(){
 if(group?.id==='ankle-pair')event('saved_placements',{keys:group.items.filter(i=>session.items[i.key]?.placed&&session.items[i.key]?.answered).map(i=>i.key)});
}
window.addEventListener('dxx:request-placements',reportPair);
function openGroup(g){
 if(!g)return;save();group=g;session=draft.groups[g.id]||=restoreAnkleGroup(g);
 activeTime=Date.now();selected=g.id==='ankle-pair'?g.items.find(i=>i.key==='fibLong'):null;
 $('pairedLayer').hidden=g.region!=='ankle';$('region').value=g.region;
 const same=groups.filter(x=>x.region===g.region&&x.layer===g.layer);$('groups').replaceChildren(...same.map((x,i)=>new Option(x.view+' · '+x.items.map(y=>y.name).join('、'),x.id)));$('groups').value=g.id;
 for(const b of $('layers').querySelectorAll('button')){b.disabled=!groups.some(x=>x.region===g.region&&x.layer===b.dataset.layer);b.setAttribute('aria-pressed',String(g.layer===b.dataset.layer));}
 $('title').textContent=g.regionName+' · '+g.layer;$('view').textContent=g.view+(g.schematic?' · 位置示意图':'图');$('status').textContent='';draw();save();event('prep',{page:'prep'});reportPair();
}
$('board').onclick=e=>place(nearest(e));$('board').ondragover=e=>e.preventDefault();
$('board').ondrop=e=>{e.preventDefault();const item=group.items.find(i=>i.key===e.dataTransfer.getData('text/plain'));if(!item)return;choose(item);place(e.target.closest('[data-site]')?.dataset.site||nearest(e));};
$('region').onchange=()=>openGroup(groups.find(g=>g.region===$('region').value&&g.layer==='浅层')||groups.find(g=>g.region===$('region').value));
$('layers').onclick=e=>{const layer=e.target.dataset.layer;if(layer&&layer!==group.layer)openGroup(groups.find(g=>g.region===group.region&&g.layer===layer));};
$('groups').onchange=()=>openGroup(groups.find(g=>g.id===$('groups').value));
$('search').onchange=()=>{const text=$('search').value.trim();if(!text)return;const g=groups.find(g=>g.items.some(i=>i.name===text))||groups.find(g=>g.items.some(i=>i.name.includes(text)));if(!g){$('status').textContent='没有找到这块肌肉。';return;}openGroup(g);choose(g.items.find(i=>i.name===text)||g.items.find(i=>i.name.includes(text)));};
$('next').onclick=()=>openGroup(groups[(groups.indexOf(group)+1)%groups.length]);$('save').onclick=()=>{save();$('status').textContent='本组学习记录已保存。';};
$('records').onclick=()=>{save();const a=read(recordsKey,[]).filter(r=>r.task==='muscle').reverse().slice(0,25);$('entries').replaceChildren(...(a.length?a.map(r=>el('p',r.chapter+'　归位 '+r.placed+' 项 · 功能答对 '+(r.functionCorrect||0)+' 项')):[el('p','完成一次安放后，这里会显示学习记录。')]));$('history').showModal();};$('close').onclick=()=>$('history').close();
document.addEventListener('visibilitychange',save);window.addEventListener('pagehide',save);
try{
 const resp=await fetch(new URL('layers.json?v=79.2',base));if(!resp.ok)throw Error();const data=await resp.json();groups=data.groups;
 for(const [id,name] of new Map(groups.map(g=>[g.region,g.regionName])))$('region').add(new Option(name,id));
 for(const name of new Set(groups.flatMap(g=>g.items.map(i=>i.name))))$('names').append(new Option(name,name));
 const region=url.searchParams.get('chapter'),key=url.searchParams.get('muscle')||url.searchParams.get('focus');
 const g=(key&&groups.find(x=>x.items.some(i=>i.key===key)))||(region&&groups.find(x=>x.region===region&&x.layer==='浅层'))||groups.find(x=>x.id===(['ankle-38','ankle-39'].includes(draft.current)?'ankle-pair':draft.current))||groups.find(x=>x.layer==='浅层')||groups[0];openGroup(g);
 if(url.searchParams.get('clinicRegion')==='1' && g.id==='ankle-pair'){
   document.body.classList.add('clinic-pair');
 }
 if(key&&g.items.some(i=>i.key===key))choose(g.items.find(i=>i.key===key));
}catch(e){$('title').textContent='图谱未能载入';$('status').textContent='请刷新页面重新载入二维肌肉图谱。';console.error(e);}
