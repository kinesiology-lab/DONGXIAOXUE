import {inversionPanel} from '../clinic3d/inversion-lesson.js';
export function ankleExamPanel(openInClinic,actionLabel) {
  const panel = document.createElement('section');
  const title = document.createElement('h3');
  title.textContent = '床旁查体 · 陈女士的右踝';
  const action = document.createElement(openInClinic ? 'button' : 'a');
  action.textContent = openInClinic ? (actionLabel || '继续床旁查体') : '进入三维床旁查体';
  action.dataset.openBedside = '';
  if (openInClinic) { action.type='button'; action.onclick=openInClinic; }
  else action.href='../clinic3d/bedside.html';
  const movie = document.createElement('video');
  movie.controls = true;
  movie.playsInline = true;
  movie.preload = 'metadata';
  movie.src = '../soap/media/ankle-exam.mp4';
  movie.setAttribute('aria-label', '陈女士上床及右踝被动检查录像，含中文旁白和字幕');
  movie.style.cssText = 'display:block;width:100%;max-width:760px;border-radius:12px;background:#edf4f1';
  const replay=document.createElement('details');
  const label=document.createElement('summary');label.textContent='观看 7 秒查体剪辑';
  replay.append(label,movie);
  panel.append(title,action,replay);
  const note = document.createElement('p');
  note.textContent = '前移与内翻松弛是结构线索。下一步比较背伸活动、背伸与外翻抗阻表现，再结合步态和静态压力中心（COP）解释发软。';
  const link = document.createElement('a');
  link.textContent = '进入人体运动学实验室观察踝背伸 ↗';
  link.href = '../lab/index.html?lesson=10';
  link.target = '_blank';
  link.rel = 'noopener';
  const source=document.createElement('a');
  source.href='https://www.wjgnet.com/2218-5836/full/v8/i1/21.htm';
  source.textContent='对照原文图 6、图 7 的双手位置';source.target='_blank';source.rel='noopener';
  const refs=document.createElement('p');refs.append(source);
  panel.append(note, link, inversionPanel(), refs);
  return panel;
}
