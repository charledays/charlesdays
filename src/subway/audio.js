/**
 * Ride audio, synthesized with Web Audio (no files). Off until the visitor turns it on.
 * It only listens to timeline state: rumble follows speed, wheels clack at rail joints,
 * doors hiss open and chime before closing.
 */
import { WORLD } from './config.js';

export function createAudio() {
  var ctx = null;
  var enabled = false;
  var master, rumbleGain, rumbleFilter, noiseBuffer, hissGain;
  var lastJoint = null;
  var lastPhase = null;

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Brown noise: the body of the rumble.
    var len = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 120;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.05;
    src.connect(rumbleFilter).connect(rumbleGain).connect(master);
    src.start();

    // White noise, band-passed high: the spray can's hiss. Silent until spray(true).
    var white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var wd = white.getChannelData(0);
    for (var k = 0; k < wd.length; k++) wd[k] = Math.random() * 2 - 1;
    var hiss = ctx.createBufferSource();
    hiss.buffer = white;
    hiss.loop = true;
    var hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 5200;
    hissFilter.Q.value = 0.7;
    hissGain = ctx.createGain();
    hissGain.gain.value = 0;
    hiss.connect(hissFilter).connect(hissGain).connect(master);
    hiss.start();
    return true;
  }

  function burst(opts) {
    var t = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    var f = ctx.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.frequency.value = opts.freq;
    f.Q.value = opts.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.gain, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + opts.decay + 0.05);
  }

  function tone(freq, start, dur, gain) {
    var t = ctx.currentTime + start;
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function setEnabled(on) {
    if (on && !ctx && !init()) return false;
    enabled = on;
    if (!ctx) return enabled;
    if (on && ctx.state === 'suspended') ctx.resume();
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.15);
    return enabled;
  }

  function update(state, distance) {
    var joint = Math.floor(distance / WORLD.railJoint);
    var phase = state.phase;
    if (!enabled || !ctx) { lastJoint = joint; lastPhase = phase; return; }

    var v = state.speed;
    rumbleGain.gain.setTargetAtTime(0.04 + 0.32 * v, ctx.currentTime, 0.1);
    rumbleFilter.frequency.setTargetAtTime(90 + 520 * v, ctx.currentTime, 0.1);

    if (lastJoint !== null && joint !== lastJoint && v > 0.08) {
      burst({ freq: 900, q: 2, gain: 0.25 * v, decay: 0.07 });
      burst({ freq: 760, q: 2, gain: 0.2 * v, decay: 0.07, delay: 0.09 });
    }
    if (lastPhase !== phase) {
      if (phase === 'opening' && lastPhase === 'settle') burst({ type: 'highpass', freq: 2500, gain: 0.18, attack: 0.03, decay: 0.7 });
      // Two-tone chime, then the leaves close.
      if (phase === 'closing' && lastPhase === 'dwell') { tone(659, 0, 0.6, 0.12); tone(523, 0.32, 0.9, 0.12); }
    }
    lastJoint = joint;
    lastPhase = phase;
  }

  function dispose() {
    if (ctx) ctx.close();
    ctx = null;
  }

  function spray(on) {
    if (!ctx) return;
    hissGain.gain.setTargetAtTime(on ? 0.14 : 0, ctx.currentTime, on ? 0.02 : 0.05);
  }

  return { setEnabled: setEnabled, spray: spray, isEnabled: function () { return enabled; }, update: update, dispose: dispose };
}
