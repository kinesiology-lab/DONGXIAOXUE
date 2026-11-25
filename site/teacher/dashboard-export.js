import {dailyTotals} from './trends.js';
import {readStudentMessages} from './student-windows.js';

const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const spreadsheet='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const docRel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRel='http://schemas.openxmlformats.org/package/2006/relationships';
const mime='application/vnd.openxmlformats-officedocument.spreadsheetml';
const localTime=s=>s?new Date(s).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}):'';
function worksheet(rows){
  const columns=rows[0].map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(i===0?22:26)+'" customWidth="1"/>').join('');
  const body=rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>{
    const address=String.fromCharCode(65+j)+(i+1);
    if(typeof v==='number' && Number.isFinite(v))return '<c r="'+address+'"><v>'+v+'</v></c>';
    return '<c r="'+address+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
  }).join('')+'</row>').join('');
  return '<worksheet xmlns="'+spreadsheet+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols>'+columns+'</cols><sheetData>'+body+'</sheetData></worksheet>';
}
async function workbook(sheets){
  const zip=new window.JSZip();
  let overrides='',sheetList='',links='';
  sheets.forEach(([name,rows],i)=>{
    const id=i+1,path='worksheets/sheet'+id+'.xml';
    sheetList+='<sheet name="'+xml(name)+'" sheetId="'+id+'" r:id="rId'+id+'"/>';
    links+='<Relationship Id="rId'+id+'" Type="'+docRel+'/worksheet" Target="'+path+'"/>';
    overrides+='<Override PartName="/xl/'+path+'" ContentType="'+mime+'.worksheet+xml"/>';
    zip.file('xl/'+path,worksheet(rows));
  });
  zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="'+mime+'.sheet.main+xml"/>'+overrides+'</Types>');
  zip.file('_rels/.rels','<Relationships xmlns="'+packageRel+'"><Relationship Id="rId1" Type="'+docRel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<workbook xmlns="'+spreadsheet+'" xmlns:r="'+docRel+'"><sheets>'+sheetList+'</sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="'+packageRel+'">'+links+'</Relationships>');
  return zip.generateAsync({type:'blob',mimeType:mime+'.sheet',compression:'DEFLATE'});
}
export async function exportClassroom(data,read,titles){
  const roster=[['姓名','学号','最近成绩','最高成绩','满分','病例提交状态','学习会话数','首次使用','最近记录']];
  const exams=[['姓名','学号','交卷时间','试卷版本','得分','满分']];
  const steps=[['姓名','学号','病例开始时间','提交状态','环节','完成情况']];
  const labs=[['姓名','学号','实验','观察记录','解释记录','操作次数']];
  for(const p of data.students){
    const own=[p.name,p.studentId], current=p.exams.filter(e=>e.version===data.version);
    roster.push([...own,current.at(-1)?.score??'未交卷',current.length?Math.max(...current.map(e=>e.score)):'',data.total,p.clinic,p.sessions,localTime(p.firstAt),localTime(p.lastAt)]);
    for(const e of p.exams)exams.push([...own,localTime(e.at),e.version,e.score,e.total]);
    const d=await read('?studentId='+encodeURIComponent(p.studentId));
    for(const run of d.runs){
      const rows=run.snapshot||Object.entries(run.steps).map(([id,status])=>({id,status}));
      for(const step of rows)steps.push([...own,localTime(run.start),run.state,titles.get(step.id)||step.id,step.status]);
    }
    for(const [name,l] of Object.entries(d.labs))labs.push([...own,name,l.observations,l.explanations,l.operations]);
  }
  const sheets=[['学生成绩与完成情况',roster],['每日累计人数',[['日期','累计使用人数','累计病例完成人数'],...dailyTotals(data.students)]],
    ['历次测试成绩',exams],['病例环节明细',steps],['课程实验明细',labs]];
  const [dialogs,feedback]=await readStudentMessages();
  const dialogRows=[['学生（姓名 · 学号）','对话类型','对话序号','时间','发言人','内容']];
  dialogs.forEach((record,i)=>{
    for(const l of record.lines)dialogRows.push([record.owner,record.label,i+1,localTime(l.at),l.role,l.text]);
  });
  sheets.push(['学生对话情况',dialogRows],['学生问题反馈',[['学生（姓名 · 学号）','时间','类别','反馈内容','评分'],
    ...feedback.map(f=>[f.owner,localTime(f.at),f.label,f.preview,f.lines[0]?.text||''])]]);
  const blob=await workbook(sheets),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='动小学_虚拟实验室用户使用数据.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
