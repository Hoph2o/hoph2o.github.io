let audioContext, sourceNode, gainNode, eqFilters = [];
let startTime = 0, pausedAt = 0, duration = 0, buffer = null;
const seekBar = document.getElementById('seekBar');
const timeDisplay = document.getElementById('timeDisplay');

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

document.querySelectorAll('#bass, #mid, #treble, #gain').forEach(input => {
  input.addEventListener('input', () => {
    input.title = input.id === 'gain'
      ? `${input.value}x gain`
      : `${input.value} dB`;
    updateAudioSettings();
  });
});

function playAudio() {
  const file = document.getElementById('audioFile').files[0];
  const preset = document.getElementById('presetSelect').value;

  if (!file && !preset && !buffer) {
    alert("Please upload or select an audio file.");
    return;
  }

  stopAudio();
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // If buffer is already loaded (from previous playback), just resume from seek position
  if (buffer) {
    const seekPosition = parseFloat(seekBar.value) || 0;
    duration = buffer.duration;
    createAudioGraph();
    sourceNode.start(0, seekPosition);
    startTime = audioContext.currentTime - seekPosition;
    updateSeekBar();
    return;
  }

  const loadBuffer = arrayBuffer => {
    audioContext.decodeAudioData(arrayBuffer, decoded => {
      buffer = decoded;
      duration = buffer.duration;
      const seekPosition = parseFloat(seekBar.value) || 0;
      createAudioGraph();
      sourceNode.start(0, seekPosition);
      startTime = audioContext.currentTime - seekPosition;
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


function createAudioGraph() {
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = buffer;

  gainNode = audioContext.createGain();
  eqFilters = [
    createFilter(60),
    createFilter(1000),
    createFilter(5000)
  ];

  updateAudioSettings();

  sourceNode.connect(eqFilters[0]);
  eqFilters[0].connect(eqFilters[1]);
  eqFilters[1].connect(eqFilters[2]);
  eqFilters[2].connect(gainNode);
  gainNode.connect(audioContext.destination);

  sourceNode.onended = () => clearInterval(seekInterval);
}

function createFilter(freq) {
  const filter = audioContext.createBiquadFilter();
  filter.type = 'peaking';
  filter.frequency.value = freq;
  filter.Q.value = 1;
  filter.gain.value = 0;
  return filter;
}

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

function stopAudio() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    clearInterval(seekInterval);
    seekBar.value = 0;
    timeDisplay.textContent = "0:00 / 0:00";
  }
}

function pauseAudio() {
  if (audioContext && sourceNode) {
    sourceNode.stop();
    pausedAt = audioContext.currentTime - startTime;
    clearInterval(seekInterval);
  }
}

let seekInterval;
function updateSeekBar() {
  seekInterval = setInterval(() => {
    const currentTime = audioContext.currentTime - startTime;
    seekBar.max = duration;
    seekBar.value = currentTime;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  }, 200);
}

function formatTime(time) {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function activateJameosMode() {
  const bassSlider = document.getElementById('bass');
  const gainSlider = document.getElementById('gain');

  bassSlider.value = 30;
  gainSlider.value = 5;

  bassSlider.title = "30 dB";
  gainSlider.title = "5x gain";

  updateAudioSettings();
}
