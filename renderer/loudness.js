/* NixPlayer loudness boost (Web Audio).
   Chain: input gain (volume above 100%) -> compressor (quiet parts and speech come up) -> make-up gain -> peak limiter
   (nothing can clip). "Off" is almost transparent; the limiter only works when something is being boosted. */
(()=>{
const PRESETS={ // thr: compressor threshold (dB), ratio, gain: how much quiet sound (dialogue) is lifted (dB)
  off:{thr:0,ratio:1,gain:0},
  light:{thr:-10,ratio:2,gain:4},
  medium:{thr:-14,ratio:3,gain:7},
  strong:{thr:-18,ratio:4,gain:10}
};
const db=x=>Math.pow(10,x/20);
/* the Web Audio compressor adds an automatic make-up gain of 0.6 x (level drop of a full-scale signal); it is measured out here
   so that "gain" above is what you really get for quiet sound */
const autoMk=(thr,ratio)=>0.6*Math.abs(Math.min(0,thr))*(1-1/ratio);
function build(ctx){
  const input=ctx.createGain(),comp=ctx.createDynamicsCompressor(),makeup=ctx.createGain(),lim=ctx.createDynamicsCompressor();
  input.connect(comp);comp.connect(makeup);makeup.connect(lim);
  comp.knee.value=6;comp.attack.value=.01;comp.release.value=.3;
  lim.threshold.value=-1.5;lim.knee.value=0;lim.attack.value=.001;lim.release.value=.08;
  /* name: off | light | medium | strong;  userGain: 1 = normal, above 1 = "Maximum volume" boost */
  function set(name,userGain){
    const p=PRESETS[name]||PRESETS.off,g=Math.max(1,+userGain||1);
    input.gain.value=g;
    const limOn=p.ratio>1||g>1; // limiter only when something is boosted
    comp.threshold.value=p.thr;comp.ratio.value=p.ratio;
    lim.ratio.value=limOn?20:1;
    makeup.gain.value=db(p.gain-autoMk(p.thr,p.ratio)-(limOn?autoMk(lim.threshold.value,20):0));
  }
  set('off',1);
  return{input,output:lim,set};
}
window.NPLoud={PRESETS,build};
})();
