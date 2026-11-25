const NS='http://www.w3.org/2000/svg', DAY=86400000;
const calendar=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
function day(value){
  if(!value) return null;
  const date=new Date(value);
  return Number.isFinite(+date)?Date.parse(calendar.format(date)+'T00:00:00Z')/DAY:null;
}
const dateLabel=d=>new Date(d*DAY).toISOString().slice(0,10);
function svgEl(tag,attrs,content){
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  if(content!=null) node.textContent=content;
  return node;
}
function chart(host,dates,start,end,color,title){
  host.replaceChildren();
  if(start==null){host.textContent='暂无登记学生记录';return;}
  const days=dates.slice().sort((a,b)=>a-b);
  const values=new Map();
  days.forEach(d=>values.set(d,(values.get(d)||0)+1));
  const width=440,height=148,left=34,right=419,top=14,bottom=117;
  const max=Math.max(1,days.length), span=Math.max(1,end-start);
  const x=d=>start===end?right:left+(right-left)*(d-start)/span;
  const y=n=>bottom-(bottom-top)*n/max;
  const svg=svgEl('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':title+'，'+dateLabel(start)+' 至 '+dateLabel(end)+'，累计 '+days.length+' 人',tabindex:0});
  for(const v of new Set([0,Math.round(max/2),max])){
    svg.append(svgEl('path',{d:'M'+left+' '+y(v)+'H'+right,stroke:'#dce6e2','stroke-dasharray':'3 4'}),
      svgEl('text',{x:left-7,y:y(v)+4,'text-anchor':'end'},v));
  }
  let total=0,path='M'+x(start)+' '+y(values.get(start)||0);
  for(const [d,count] of values){total+=count;path+='H'+x(d)+'V'+y(total);}
  path+='H'+x(end);
  svg.append(svgEl('path',{d:path,stroke:color,fill:'none','stroke-width':2.7}),
    svgEl('circle',{cx:x(end),cy:y(total),r:3.6,fill:color}));
  if(start!==end)svg.append(svgEl('text',{x:left,y:139},dateLabel(start)));
  svg.append(svgEl('text',{x:right,y:139,'text-anchor':'end'},dateLabel(end)));
  const hint=document.createElement('output');hint.className='chart-value';
  const marker=svgEl('line',{x1:right,x2:right,y1:top,y2:bottom,stroke:color,'stroke-dasharray':'2 4',visibility:'hidden'});
  svg.append(marker);
  let current=end;
  function inspect(d){
    current=Math.max(start,Math.min(end,d));
    let low=0,high=days.length;
    while(low<high){const mid=(low+high)>>1;if(days[mid]<=current)low=mid+1;else high=mid;}
    marker.setAttribute('x1',x(current));marker.setAttribute('x2',x(current));marker.setAttribute('visibility','visible');
    hint.textContent=dateLabel(current)+' · '+low+' 人';
  }
  function reset(){marker.setAttribute('visibility','hidden');hint.textContent=days.length+' 人';current=end;}
  svg.onpointermove=e=>{
    const m=svg.getScreenCTM();if(!m)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());
    inspect(start+Math.round((p.x-left)*span/(right-left)));
  };
  svg.onpointerleave=reset;svg.onblur=reset;
  svg.onfocus=()=>inspect(current);
  svg.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();inspect(current+(e.key==='ArrowLeft'?-1:1));}};
  reset();host.append(hint,svg);
}
export function trendCounts(students){
  const used=students.map(s=>day(s.firstAt)).filter(d=>d!==null);
  const completed=students.map(s=>day(s.completedAt)).filter(d=>d!==null);
  const all=used.concat(completed);
  const start=all.length?all.reduce((a,b)=>Math.min(a,b)):null;
  const end=all.reduce((a,b)=>Math.max(a,b),day(new Date()));
  return {used,completed,start,end};
}
export function dailyTotals(students){
  const {used,completed,start,end}=trendCounts(students);
  if(start==null)return [];
  const increments=days=>{const map=new Map();for(const d of days)map.set(d,(map.get(d)||0)+1);return map;};
  const starts=increments(used),finishes=increments(completed),rows=[];
  let users=0,done=0;
  for(let d=start;d<=end;d++){users+=starts.get(d)||0;done+=finishes.get(d)||0;rows.push([dateLabel(d),users,done]);}
  return rows;
}
export function renderTrends(students){
  const {used,completed,start,end}=trendCounts(students);
  chart(document.getElementById('usageTrend'),used,start,end,'#16715b','累计使用人数');
  chart(document.getElementById('completionTrend'),completed,start,end,'#386a96','累计完整提交病例人数');
}
