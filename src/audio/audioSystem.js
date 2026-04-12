export function createAudioSystem(state) {
  return {
    ensureAudioStarted: () => ensureAudioStarted(state),
    initializeAmbientAudioOnStart: () => initializeAmbientAudioOnStart(state),
    playPickupSound: () => playPickupSound(state),
    playDamPlacementSound: () => playDamPlacementSound(state),
    playHitSound: () => playHitSound(state),
  };
}

function ensureAudioStarted(state) {
  if (state.audioContext === null) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor === undefined) return;
    state.audioContext = new AudioCtor();
    startAmbientWaterAudio(state);
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }
}

function initializeAmbientAudioOnStart(state) {
  ensureAudioStarted(state);

  if (state.ambientRetryIntervalId !== null) return;
  state.ambientRetryIntervalId = setInterval(() => {
    ensureAudioStarted(state);
    const isRunning = state.audioContext !== null && state.audioContext.state === "running";
    const hasGain = state.ambientWaterGain !== null;
    if (isRunning && hasGain) {
      clearInterval(state.ambientRetryIntervalId);
      state.ambientRetryIntervalId = null;
    }
  }, 1000);
}

function startAmbientWaterAudio(state) {
  if (state.audioContext === null) return;
  if (state.ambientWaterGain !== null) return;

  const sampleRate = state.audioContext.sampleRate;
  const buffer = state.audioContext.createBuffer(1, sampleRate * 2, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = (Math.random() * 2 - 1) * 0.06;
    last = last * 0.82 + white;
    data[i] = last;
  }

  const source = state.audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const highPass = state.audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 360;
  highPass.Q.value = 0.6;

  const bandPass = state.audioContext.createBiquadFilter();
  bandPass.type = "bandpass";
  bandPass.frequency.value = 1650;
  bandPass.Q.value = 0.75;

  state.ambientWaterGain = state.audioContext.createGain();
  state.ambientWaterGain.gain.value = 0.07;

  source.connect(highPass);
  highPass.connect(bandPass);
  bandPass.connect(state.ambientWaterGain);
  state.ambientWaterGain.connect(state.audioContext.destination);
  source.start();
  console.log("[audio] ambient water loop started");
}

function playPickupSound(state) {
  if (state.audioContext === null) return;
  playTone(state, {
    type: "triangle",
    startFreq: 720,
    endFreq: 940,
    duration: 0.09,
    volume: 0.055,
  });
}

function playDamPlacementSound(state) {
  if (state.audioContext === null) return;
  playTone(state, {
    type: "square",
    startFreq: 230,
    endFreq: 170,
    duration: 0.08,
    volume: 0.045,
  });
}

function playHitSound(state) {
  if (state.audioContext === null) return;
  playTone(state, {
    type: "sawtooth",
    startFreq: 220,
    endFreq: 90,
    duration: 0.14,
    volume: 0.08,
  });
}

function playTone(state, { type, startFreq, endFreq, duration, volume }) {
  const now = state.audioContext.currentTime;
  const osc = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(state.audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}
