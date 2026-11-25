// Authored double-stance trials in millimetres, sampled at 50 Hz. Neither axis encodes the affected limb.
function trial(seed,amplitude){
  let s=seed;const random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  function axis(scale){const waves=[.13,.30,.54,.89,1.28].map((f,i)=>({f:f*(.8+.4*random()),phase:random()*2*Math.PI,a:scale*[.50,.29,.15,.08,.04][i]}));
    return t=>waves.reduce((sum,w)=>sum+w.a*Math.sin(2*Math.PI*w.f*t+w.phase),0);}
  const ml=axis(amplitude),ap=axis(amplitude*1.23);
  const samples=Array.from({length:1501},(_,i)=>[i/50,ml(i/50),ap(i/50)]);
  const means=[1,2].map(k=>samples.reduce((sum,p)=>sum+p[k],0)/samples.length);
  samples.forEach(p=>{p[1]-=means[0];p[2]-=means[1];});return samples;
}
export const balanceTrials={open:trial(71,4.9),closed:trial(127,8.3)};
export const balanceCues={closed:'接下来请闭上眼睛，尽量站稳。我就在旁边保护您，觉得不稳就睁眼，扶住扶手。',result:'这次闭眼以后，您站着的时候晃动更多。我们会结合肌力和走路的情况一起判断。'};
export const balanceReference={open:trial(331,3.6),closed:trial(745,5.1)};
