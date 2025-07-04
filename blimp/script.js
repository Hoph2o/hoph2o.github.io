// Global audio-related variables
let audioContext, sourceNode, gainNode, eqFilters = [];
let startTime = 0, pausedAt = 0, duration = 0, buffer = null;
let seekInterval;

// UI elements
const seekBar = document.getElementById('seekBar');
const timeDisplay = document.getElementById('timeDisplay');
const speedSlider = document.getElementById('speed');
const speedDisplay = document.getElementById('speedDisplay');

// Display initial playback speed
const initSpeed = parseFloat(speedSlider.value).toFixed(2);
speedDisplay.textContent = `${initSpeed}x`;
speedSlider.title = `${initSpeed}x`;

// Populate dropdown with audio files from JSON
fetch('audio_list.json')
  .then(res => res.json())
  .then(files => {
    const select = document.getElementById('presetSelect');
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = `audio/${file}`;
      option.textContent = file;
      select.appendChild(option);
    });
  });

// Handle slider changes (EQ and gain)
document.querySelectorAll('#bass, #mid, #treble, #gain').forEach(input => {
  input.addEventListener('input', () => {
    input.title = input.id === 'gain'
      ? `${input.value}x gain`
      : `${input.value} dB`;
    updateAudioSettings();
  });
});

// Handle playback speed slider changes
speedSlider.addEventListener('input', () => {
  const speed = parseFloat(speedSlider.value);
  speedSlider.title = `${speed.toFixed(2)}x`;
  speedDisplay.textContent = `${speed.toFixed(2)}x`;
});

// Show live time display while dragging seek bar
seekBar.addEventListener('input', () => {
  if (!duration) return;
  const val = parseFloat(seekBar.value);
  timeDisplay.textContent = `${formatTime(val)} / ${formatTime(duration)}`;
});

// Seek and restart playback if audio is playing
seekBar.addEventListener('change', () => {
  if (!buffer || !audioContext) return;

  const seekPosition = parseFloat(seekBar.value);
  timeDisplay.textContent = `${formatTime(seekPosition)} / ${formatTime(duration)}`;

  if (sourceNode) {
    sourceNode.stop();
    clearInterval(seekInterval);
    createAudioGraph();
    sourceNode.start(0, seekPosition);
    startTime = audioContext.currentTime - seekPosition / sourceNode.playbackRate.value;
    updateSeekBar();
    pausedAt = 0;
  } else {
    pausedAt = seekPosition;
  }
});

// Start or resume audio playback
function playAudio() {
  const file = document.getElementById('audioFile').files[0];
  const preset = document.getElementById('presetSelect').value;

  if (!file && !preset && !buffer) {
    alert("Please upload or select an audio file.");
    return;
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (buffer && !file && !preset) {
    const seekPosition = pausedAt || parseFloat(seekBar.value) || 0;
    pausedAt = 0;
    if (sourceNode) {
      sourceNode.stop();
      sourceNode.disconnect();
    }
    createAudioGraph();
    sourceNode.start(0, seekPosition);
    startTime = audioContext.currentTime - seekPosition / sourceNode.playbackRate.value;
    updateSeekBar();
    return;
  }

  stopAudio();
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const loadBuffer = arrayBuffer => {
    audioContext.decodeAudioData(arrayBuffer, decoded => {
      buffer = decoded;
      duration = buffer.duration;
      const seekPosition = parseFloat(seekBar.value) || 0;
      pausedAt = 0;
      createAudioGraph();
      sourceNode.start(0, seekPosition);
      startTime = audioContext.currentTime - seekPosition / sourceNode.playbackRate.value;
      updateSeekBar();
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => loadBuffer(e.target.result);
    reader.readAsArrayBuffer(file);
  } else {
    fetch(preset)
      .then(res => res.arrayBuffer())
      .then(loadBuffer)
      .catch(err => alert("Error loading audio: " + err));
  }
}

// Pause audio and save current position
function pauseAudio() {
  if (audioContext && sourceNode) {
    sourceNode.stop();
    pausedAt = (audioContext.currentTime - startTime) * sourceNode.playbackRate.value;
    clearInterval(seekInterval);
  }
}

// Stop playback, optionally clear buffer
function stopAudio(clearBuffer = true) {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    clearInterval(seekInterval);
  }

  if (clearBuffer) {
    buffer = null;
    seekBar.value = 0;
    timeDisplay.textContent = "0:00 / 0:00";
    pausedAt = 0;
  }
}

// Build audio processing graph: source → EQ → gain → speakers
function createAudioGraph() {
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.playbackRate.value = parseFloat(speedSlider.value);

  gainNode = audioContext.createGain();

  eqFilters = [
    createFilter(60),    // Bass
    createFilter(1000),  // Mid
    createFilter(5000)   // Treble
  ];

  updateAudioSettings();

  sourceNode.connect(eqFilters[0]);
  eqFilters[0].connect(eqFilters[1]);
  eqFilters[1].connect(eqFilters[2]);
  eqFilters[2].connect(gainNode);
  gainNode.connect(audioContext.destination);

  sourceNode.onended = () => clearInterval(seekInterval);
}

// Create a single EQ filter for a given frequency
function createFilter(freq) {
  const filter = audioContext.createBiquadFilter();
  filter.type = 'peaking';
  filter.frequency.value = freq;
  filter.Q.value = 1;
  filter.gain.value = 0;
  return filter;
}

// Apply current slider values to EQ and gain
function updateAudioSettings() {
  if (eqFilters.length === 3) {
    eqFilters[0].gain.value = parseFloat(document.getElementById('bass').value);
    eqFilters[1].gain.value = parseFloat(document.getElementById('mid').value);
    eqFilters[2].gain.value = parseFloat(document.getElementById('treble').value);
  }
  if (gainNode) {
    gainNode.gain.value = parseFloat(document.getElementById('gain').value);
  }
}

// Update seek bar and time display continuously during playback
function updateSeekBar() {
  clearInterval(seekInterval);
  seekInterval = setInterval(() => {
    const speed = parseFloat(speedSlider.value);
    const currentTime = (audioContext.currentTime - startTime) * speed;
    seekBar.max = duration;
    seekBar.value = currentTime;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }, 200);
}

// Format seconds as MM:SS
function formatTime(time) {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Maximize bass and gain for dramatic effect
function activateJameosMode() {
  const bassSlider = document.getElementById('bass');
  const gainSlider = document.getElementById('gain');

  bassSlider.value = 10;
  gainSlider.value = 4;

  bassSlider.title = "10 dB";
  gainSlider.title = "4x gain";

  updateAudioSettings();
}

const toggle = document.getElementById('darkModeToggle');

// Apply saved mode on load
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
}

toggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');

  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('darkMode', 'enabled');
  } else {
    localStorage.setItem('darkMode', 'disabled');
  }
});

