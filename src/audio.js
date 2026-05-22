export function createAudioController() {
  let context = null;
  let master = null;
  let ambientStarted = false;
  let muted = localStorage.getItem("stereolove_audio_muted") === "true";

  async function start() {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.018;
      master.connect(context.destination);
    }

    if (context.state === "suspended") await context.resume();
    if (!ambientStarted) startAmbient();
  }

  function startAmbient() {
    if (!context || !master) return;

    const frequencies = [84, 126, 189];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      filter.type = "lowpass";
      filter.frequency.value = 420 + index * 80;
      gain.gain.value = 0.0035 / (index + 1);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      oscillator.start();
    });

    ambientStarted = true;
  }

  function playReveal() {
    if (!context || !master) return;

    const now = context.currentTime;
    [1174.66, 1567.98, 2349.32].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const startTime = now + index * 0.055;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.015, startTime + 0.42);

      filter.type = "highpass";
      filter.frequency.value = 680;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.033 / (index + 1), startTime + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      oscillator.start(startTime);
      oscillator.stop(startTime + 1.25);
    });
  }

  function playNext() {
    if (!context || !master) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(392, now);
    oscillator.frequency.exponentialRampToValueAtTime(523.25, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.014, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.34);
  }

  function playGesture() {
    if (!context || !master) return;

    const now = context.currentTime;
    [659.25, 987.77, 1318.51].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.035);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.42, now + 0.42);
      gain.gain.setValueAtTime(0.0001, now + index * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.018 / (index + 1), now + 0.08 + index * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + index * 0.035);
      oscillator.stop(now + 0.62);
    });
  }

  function setMuted(nextMuted) {
    muted = nextMuted;
    localStorage.setItem("stereolove_audio_muted", String(muted));
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.018, context.currentTime, 0.08);
    }
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return { isMuted, playGesture, playNext, playReveal, setMuted, start, toggleMuted };
}
