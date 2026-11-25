export function createMotionNarration({voiceEnabled,enableVoice,notify}){
 const intro=new Audio(new URL('./assets/ankle-motion-intro.mp3',import.meta.url));
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let video=null,started=false,disposed=false,paused=false,resume=null;
 let continueVideo=false;
 const listeners=new AbortController();
 function play(media){
  if(!media||disposed)return;
  if(paused||document.hidden){resume=media;return;}
  media.play().catch(error=>{
   if(disposed||error.name==='AbortError'||(media!==intro&&media!==video))return;
   if(error.name==='NotAllowedError'){
    notify(media===intro?'点击“重听开场提示”开始播放。':'点击视频播放键，听本段讲解。');
   }else if(media===intro){
    notify('开场语音加载失败，可点“重听开场提示”重试。');
    afterIntro();
   }else notify('动画加载失败，请重播本段讲解。');
  });
 }
 function afterIntro(){
  if(continueVideo&&video)play(video);
  continueVideo=false;
 }
 intro.addEventListener('ended',afterIntro);
 function stopIntro(){
  continueVideo=false;intro.pause();intro.currentTime=0;
  if(resume===intro)resume=null;
 }
 function startIntro(thenPlay){
  if(video)video.pause();
  stopIntro();continueVideo=thenPlay;play(intro);
 }
 function videoStarted(event){
  if(event.currentTarget!==video)return;
  stopIntro();
  if(paused||document.hidden){resume=video;video.pause();}
 }
 // A detached media element can keep playing after a lesson change.
 function setVideo(next){
  if(video){video.removeEventListener('play',videoStarted);video.pause();}
  resume=null;stopIntro();video=next;
  if(!video)return;
  video.muted=!voiceEnabled();video.addEventListener('play',videoStarted);
  if(started&&!reducedMotion.matches)play(video);
 }
 function dispose(){
  disposed=true;setVideo(null);intro.removeEventListener('ended',afterIntro);
  listeners.abort();
 }
 window.addEventListener('pagehide',()=>{intro.pause();video?.pause();},{signal:listeners.signal});
 return {
  start(announce=true){
   started=true;
   if(announce&&voiceEnabled())startIntro(!reducedMotion.matches);
   else if(!reducedMotion.matches)play(video);
  },
  setVideo,
  replayIntro(){
   const follow=!!video&&!video.ended&&(!video.paused||video.currentTime===0||continueVideo);
   enableVoice();startIntro(follow&&!reducedMotion.matches);
  },
  replayVideo(){
   if(!video)return;
   enableVoice();stopIntro();video.muted=false;video.currentTime=0;play(video);
  },
  setVoice(enabled){
   if(video)video.muted=!enabled;
   if(!enabled){
    const follow=continueVideo;stopIntro();
    if(follow)play(video);
   }
  },
  setPaused(value){
   if(paused===value)return;
   paused=value;
   if(paused){
    if(!intro.paused){resume=intro;intro.pause();}
    else if(video&&!video.paused){resume=video;video.pause();}
   }else if(resume){
    const media=resume;resume=null;play(media);
   }
  },
  dispose
 };
}
