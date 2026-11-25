const categories={usability:'操作反馈',content:'课程内容',ai:'助教反馈',other:'其他反馈'};
const outcomes={resolved:'已理解',partial:'还需深入',unresolved:'仍有疑问'};
const dateFormat=new Intl.DateTimeFormat('zh-CN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Shanghai'});
const time=at=>Number.isFinite(Date.parse(at))?dateFormat.format(new Date(at)):'';
function node(tag,text,cls){
  const n=document.createElement(tag);
  if(text!=null)n.textContent=text;
  if(cls)n.className=cls;
  return n;
}
export function collect(rows){
  const dialogs=[],feedback=[];
  for(const row of rows){
    const student=row.session?.student;
    if(row.dataKind!=='classroom'||!String(student?.studentId||'').trim())continue;
    const owner=[student.name,student.studentId].filter(Boolean).join(' · ');
    function conversation(label,lines){
      if(!lines.length)return;
      dialogs.push({owner,label,lines,at:lines.at(-1).at,preview:(lines.find(l=>l.role==='学生')||lines[0]).text});
    }
    const questions=new Map();
    for(const c of row.discussions||[]){
      const lines=[];
      for(const t of c.turns||[]){
        questions.set(c.id+'/'+t.requestId,t.message);
        lines.push({role:'学生',text:t.message,at:t.receivedAt});
        lines.push({role:'助教',text:t.reply||(t.status==='failed'?'本次回答失败':t.status==='pending'?'等待回答':'尚无已保存的回答'),at:t.completedAt||t.receivedAt});
      }
      conversation('助教问答',lines);
    }
    const interviews=row.soap?.interviews||[];
    conversation('病例问诊',interviews.flatMap(i=>[{role:'学生',text:i.question,at:i.at},{role:'患者',text:i.reply,at:i.at}]));
    const messages=(row.events||[]).filter(e=>e.type==='student_message'||e.type==='patient_message');
    conversation('模拟接诊',messages.filter(e=>e.payload?.text).map(e=>({role:e.type==='student_message'?'学生':'患者',text:e.payload.text,at:e.at})));
    const reported=(row.events||[]).filter(e=>e.type==='learning_problem_outcome');
    for(const e of reported){
      const p=e.payload||{}, label=outcomes[p.outcome]||'问题自评';
      feedback.push({owner,label,at:e.at,preview:p.question||questions.get(p.conversationId+'/'+p.requestId)||label,lines:[]});
    }
    for(const f of row.feedback||[]){
      const match=f.category==='ai' && /^讨论 (\S+) \/ (\S+)：(.+)$/.exec(f.text||'');
      const paired=match && reported.some(e=>e.payload?.conversationId===match[1] && e.payload?.requestId===match[2] &&
        ({resolved:'有帮助',partial:'还想深入',unresolved:'需改进'})[e.payload.outcome]===match[3]);
      if(paired)continue;
      const rating=f.rating==null?'':f.rating+' / 5';
      feedback.push({owner,label:match?match[3]:(categories[f.category]||'学习反馈'),at:f.receivedAt,
        preview:match?(questions.get(match[1]+'/'+match[2])||match[3]):(f.text||rating||'未填写文字'),
        lines:rating?[{role:'学生评分',text:rating}]:[]});
    }
    for(const t of row.soap?.tasks||[]){
      if(t.task==='reflection' && t.answer?.questions?.trim())feedback.push({owner,label:'病例复盘提问',at:t.at,preview:t.answer.questions,lines:[]});
    }
  }
  const newest=(a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0);
  return [dialogs.sort(newest),feedback.sort(newest)];
}
function panel(id,title,unit){
  const section=node('section',null,'sw-panel');section.id=id;
  const heading=node('h2',title),count=node('small',''),search=node('input');
  heading.append(count);search.type='search';search.placeholder='搜索姓名、学号或内容';search.setAttribute('aria-label',title+'搜索');
  const list=node('div',null,'sw-list'),more=node('button','显示更多'),status=node('p','正在读取…','sw-status');
  status.setAttribute('role','status');more.type='button';more.hidden=true;
  section.append(heading,search,list,more,status);
  let records=[],limit=4;
  function draw(){
    list.replaceChildren();
    const query=search.value.trim().toLowerCase();
    const found=records.filter(r=>[r.owner,r.label,r.preview,...r.lines.map(l=>l.text)].some(s=>String(s||'').toLowerCase().includes(query)));
    count.textContent=' '+found.length+unit;
    status.textContent=found.length?'':query?'没有匹配记录':'暂无记录';
    more.hidden=found.length<=limit;
    for(const r of found.slice(0,limit)){
      const item=node('details'),summary=node('summary');
      summary.append(node('strong',r.owner),node('small',r.label+' · '+time(r.at)),node('span',r.preview,'sw-preview'));
      item.append(summary);
      item.addEventListener('toggle',()=>{
        if(!item.open||item.children.length>1)return;
        if(id==='student-feedback')item.append(node('p',r.preview));
        for(const l of r.lines){
          const p=node('p');p.append(node('b',l.role+'　'),document.createTextNode(l.text||''));item.append(p);
        }
      });
      list.append(item);
    }
  }
  more.onclick=()=>{limit+=10;draw();};
  search.oninput=()=>{limit=4;draw();};
  return {section,set(value){records=value;draw();},fail(message){list.replaceChildren();records=[];count.textContent='';more.hidden=true;status.textContent=message;}};
}
export async function readStudentMessages(){
  const response=await fetch('/api/teacher/usage?view=student-messages&full=1',{headers:{'X-Teacher-Token':sessionStorage.getItem('dxx.teacher.token')||''},cache:'no-store'});
  if(!response.ok)throw Error(response.status===401||response.status===403?'请先登录教师账户':'读取失败，请刷新重试');
  const {rows}=await response.json();
  return collect(rows);
}
const host=document.getElementById('student-windows');
if(host){
  const panes=[panel('student-dialogues','学生对话情况',' 段'),panel('student-feedback','学生问题反馈',' 条')];
  host.append(...panes.map(p=>p.section));
  let version=0;
  async function load(){
    const current=++version;
    try{
      const values=await readStudentMessages();
      if(current!==version)return;
      panes.forEach((pane,i)=>pane.set(values[i]));
    }catch(err){if(current===version)panes.forEach(p=>p.fail(err.message));}
  }
  const refresh=document.getElementById('refresh')||document.getElementById('refreshButton');
  refresh?.addEventListener('click',load);
  document.getElementById('tokenForm')?.addEventListener('submit',()=>queueMicrotask(load));
  load();
}
