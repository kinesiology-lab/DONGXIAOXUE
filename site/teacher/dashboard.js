import {encounterProgress} from '../clinic3d/encounter-progress.js';
import {FLOW} from '../clinic3d/case-flow.js';
import {renderTrends} from './trends.js';
import {exportClassroom} from './dashboard-export.js';

const $ = id => document.getElementById(id);
const titles = new Map(encounterProgress().rows.map(row => [row.id, row.title]));
let data, selected, requestNumber = 0;
const el = (tag, value, cls) => {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  if (cls) node.className = cls;
  return node;
};
const when = at => new Date(at).toLocaleString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const exams = student => student.exams.filter(e => e.version === data.version);
const recent = student => exams(student).at(-1);
const tag = state => el('span',state,'pill '+(['已完成','完整提交'].includes(state)?'ok':['提前提交','已跳过'].includes(state)?'warn':''));
const button = (label, action) => {
  const node = el('button',label,'link');
  node.onclick = action;
  return node;
};
async function read(query=''){
  const r = await fetch('/api/teacher/classroom-dashboard'+query,{cache:'no-store',headers:{'X-Teacher-Token':sessionStorage.getItem('dxx.teacher.token')||''}});
  if(r.status===401||r.status===403){ location.replace('login.html'); throw Error('请登录教师账户'); }
  if(!r.ok) throw Error('读取失败，请刷新重试');
  return r.json();
}
function draw(){
  if(!data) return;
  const all=data.students, submitted=all.map(recent).filter(Boolean);
  $('users').textContent=all.length;
  $('submitted').textContent=submitted.length;
  $('average').textContent=submitted.length?(submitted.reduce((sum,e)=>sum+e.score,0)/submitted.length).toFixed(1):'—';
  $('complete').textContent=all.filter(p=>p.clinic==='完整提交').length;
  const q=$('search').value.trim().toLowerCase(), filter=$('filter').value;
  const rows=all.filter(p=>{
    if(![p.name,p.studentId].some(v=>v.toLowerCase().includes(q))) return false;
    const last=recent(p);
    switch(filter){
      case 'unsubmitted': return !last;
      case 'below': return last && last.score<data.passScore;
      case 'partial': return p.clinic==='提前提交';
      case 'finished': return p.clinic==='完整提交';
      default: return true;
    }
  }).sort((a,b)=>b.lastAt.localeCompare(a.lastAt)||a.studentId.localeCompare(b.studentId));
  $('count').textContent=rows.length+' 人';
  $('roster').replaceChildren();
  for(const p of rows){
    const row=el('tr'), who=el('td'), state=el('td'), more=el('td'), last=recent(p);
    const open=()=>showPerson(p);
    who.append(button(p.name||p.studentId,open),el('small',p.studentId));
    state.append(tag(p.clinic));more.append(button('查看明细',open));
    row.append(who,el('td',last?last.score+' / '+data.total:'未交卷'),
      el('td',last?Math.max(...exams(p).map(e=>e.score))+' / '+data.total:'—'),state,el('td',when(p.lastAt)),more);
    $('roster').append(row);
  }
  $('status').textContent=rows.length?'':(all.length?'没有匹配的学生':'暂无已同步的登记学生记录');
}
function line(parent,left,right){
  const row=el('div',null,'line');row.append(el('span',left),typeof right==='string'?el('span',right):right);parent.append(row);
}
function section(title){
  const s=el('section');s.append(el('h3',title));$('content').append(s);return s;
}
async function showPerson(p){
  selected=p.studentId;
  const ticket=++requestNumber;
  $('person').textContent=p.name||p.studentId;$('number').textContent='学号 '+p.studentId+'　·　'+p.sessions+' 次学习会话';
  $('content').replaceChildren();
  if(!$('detail').open) $('detail').showModal();
  const scores=section('历次测试成绩');
  if(!p.exams.length) scores.append(el('p','暂无交卷记录','muted'));
  for(const e of p.exams.slice().reverse()){
    line(scores,when(e.at)+' · '+(e.version===data.version?'综合测试':e.version==='ankle30-v1'?'足踝知识测试':'历史测试'),e.score+(e.total?' / '+e.total:'')+' 分');
  }
  const clinics=section('足踝病例');clinics.append(el('p','正在读取…','muted'));
  try{
    const d=await read('?studentId='+encodeURIComponent(p.studentId));
    if(ticket!==requestNumber || selected!==p.studentId) return;
    clinics.lastChild.remove();
    if(!d.runs.length) clinics.append(el('p','暂无病例记录','muted'));
    if(d.runs.length>1){
      const completed=new Set();
      for(const run of d.runs){
        const steps=run.snapshot||Object.entries(run.steps).map(([id,status])=>({id,status}));
        for(const step of steps) if(step.status==='已完成') completed.add(step.id);
      }
      const combined=el('details');
      combined.append(el('summary','历次已完成环节 · '+completed.size+' 项'));
      for(const id of completed) line(combined,titles.get(id)||FLOW[id]?.title||id,tag('已完成'));
      clinics.append(combined);
    }
    d.runs.forEach((run,i)=>{
      const steps=run.snapshot||Object.entries(run.steps).map(([id,status])=>({id,status}));
      const block=el('details');block.open=i===0;
      const done=steps.filter(s=>s.status==='已完成').length;
      block.append(el('summary',when(run.start)+' · '+run.state+(run.snapshot?' · 已完成 '+done+' / '+steps.length+' 项':'')));
      if(!run.snapshot) block.append(el('p','历史记录仅显示当时已保存的环节。','muted'));
      for(const step of steps) line(block,titles.get(step.id)||FLOW[step.id]?.title||step.id,tag(step.status));
      clinics.append(block);
    });
    const labs=section('课程实验');
    if(!Object.keys(d.labs).length) labs.append(el('p','暂无课程实验记录','muted'));
    for(const [name,l] of Object.entries(d.labs)){
      line(labs,/^\d+$/.test(name)?'实验 '+name:name,l.observations+' 条观察 · '+l.explanations+' 条解释 · '+l.operations+' 次操作');
    }
  }catch(e){if(ticket===requestNumber) clinics.lastChild.textContent=e.message;}
}
async function refresh(){
  $('refresh').disabled=true;
  try{data=await read();renderTrends(data.students);draw();}catch(e){$('status').textContent=e.message;}
  finally{$('refresh').disabled=false;}
}
$('search').oninput=draw;$('filter').onchange=draw;$('refresh').onclick=refresh;
$('excel').onclick=async()=>{
  if(!data)return;
  const b=$('excel'); b.disabled=true; b.textContent='导出中…';
  try {await exportClassroom(data,read,titles);}
  catch(e){$('status').textContent='导出失败，请重试。'+e.message;}
  finally{b.disabled=false;b.textContent='导出 Excel';}
};
$('close').onclick=()=>$('detail').close();
$('detail').onclose=()=>{selected=null;requestNumber++;};
$('logout').onclick=async()=>{
  const r=await fetch('/api/teacher/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!r.ok){$('status').textContent='退出失败，请重试';return;}
  sessionStorage.removeItem('dxx.teacher.token');sessionStorage.removeItem('dxx.teacher.name');location.replace('login.html');
};
refresh();
