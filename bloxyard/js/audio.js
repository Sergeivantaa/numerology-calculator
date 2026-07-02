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

// A soft low thump plus a short burst of filtered noise reads as an actual
// footstep tap instead of a flat chiptune beep.
function sfxFootstep(){
  try{
    const ac = ctx();
    const now = ac.currentTime;

    const thumpFreq = 85 + Math.random()*18;
    const osc = ac.createOscillator();
    const oscGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(thumpFreq, now);
    osc.frequency.exponentialRampToValueAtTime(thumpFreq*0.55, now + 0.09);
    oscGain.gain.setValueAtTime(0.16, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain); oscGain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.1);

    const noiseDur = 0.045;
    const bufferSize = Math.max(1, Math.floor(ac.sampleRate * noiseDur));
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++){ data[i] = (Math.random()*2-1) * (1 - i/bufferSize); }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 900 + Math.random()*300;
    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.07, now);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ac.destination);
    noise.start(now);
  }catch(e){}
}
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
