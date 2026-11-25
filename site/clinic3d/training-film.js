export function trainingFilm({state,record,onReturn}){
 if(document.querySelector('#trainingFilm'))return;
 const d=document.createElement('dialog');d.id='trainingFilm';d.className='clinic-review-dialog training-film';
 const h=document.createElement('h2');h.textContent='康复训练 · 病例视频';
 const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='auto';v.poster='../soap/media/plan.jpg';v.src='../soap/media/plan.mp4';
 const b=document.createElement('button');b.textContent='返回计划对话';b.onclick=()=>d.close();
 const status=document.createElement('p');d.append(h,v,status,b);document.body.append(d);d.showModal();v.focus();
 v.addEventListener('ended',()=>{state.trainingFilmViewed=true;record('clinic3d_training_film_viewed',{source:'plan.mp4'});d.close();},{once:true});
 v.addEventListener('error',()=>{status.textContent='视频未能加载。您可以返回对话后重试。';});
 d.addEventListener('close',()=>{v.pause();d.remove();onReturn?.();},{once:true});v.play().catch(()=>status.textContent='请按播放键观看。');
}