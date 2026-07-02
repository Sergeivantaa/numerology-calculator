window.Bloxyard = window.Bloxyard || {};

let audioCtx = null;
function ctx(){ if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }

function beep(freq, dur, type, vol, sweepTo){
  try{
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (sweepTo) osc.frequency.linearRampToValueAtTime(sweepTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol||0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + dur);
  }catch(e){}
}

function sfxFootstep(){ beep(110 + Math.random()*20, 0.07, 'square', 0.10); }
function sfxJump(){ beep(220, 0.16, 'square', 0.18, 440); }
function sfxLand(){ beep(140, 0.10, 'square', 0.16, 90); }
function sfxPickup(){ beep(660, 0.06, 'square', 0.16, 990); }
function sfxCheckpoint(){ beep(500, 0.09, 'square', 0.17, 760); }
function sfxFinish(){
  beep(520, 0.12, 'square', 0.18, 780);
  setTimeout(()=>beep(780, 0.16, 'square', 0.18, 1040), 110);
}
function sfxFall(){ beep(180, 0.14, 'square', 0.16, 60); }
function sfxClick(){ beep(340, 0.05, 'square', 0.12); }

window.Bloxyard.Audio = { sfxFootstep, sfxJump, sfxLand, sfxPickup, sfxCheckpoint, sfxFinish, sfxFall, sfxClick };
