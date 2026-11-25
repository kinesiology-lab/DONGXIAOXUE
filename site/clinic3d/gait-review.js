// Each excerpt uses the case patient's rig and the same gait timing as the phase exercise.
const views = {
  overview: '陈女士的步行周期',
  landing: '右脚着地与承重早期',
  support: '右脚单独支撑，随后左脚着地',
  push: '右脚蹬地，身体向前移动',
  swing: '右腿由髋部带动向前摆动'
};
export function createGaitReview(figure,isPaused){
  const video=figure.querySelector('video'),label=figure.querySelector('figcaption');
  let current='';
  function sync(){
    if(!current)return;
    if(isPaused()||document.hidden){if(!video.paused)video.pause();}
    else if(video.paused)video.play().catch(()=>{});
  }
  function show(key){
    if(key!==current){
      current=key;
      figure.hidden=!key;
      if(!key){video.pause();video.removeAttribute('src');video.load();return;}
      label.textContent=views[key]+' · 病例步态模拟';
      video.setAttribute('aria-label',views[key]);
      video.src='assets/gait-review-'+key+'.mp4';
    }
    sync();
  }
  document.addEventListener('visibilitychange',sync);
  return {clear:()=>show(''),sync,turn(info,branch){
    const inReview=info.pending&&info.nodeId?.endsWith(':film:05B');
    let key='';
    if(inReview&&branch?.normal)key=['overview','overview','landing','support','push','swing'][info.index]||'';
    else if(inReview&&branch?.condition==='events_not_marked')key='overview';
    show(key);
  }};
}