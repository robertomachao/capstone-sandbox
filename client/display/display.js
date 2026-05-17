// FutureScape Display Screen (Screens 2, 3, 4)
// P5.js sketch for the display screens that show synchronized images

let socket;
let connected = false;
let screenId = null; // Set manually: 'screen2', 'screen3', or 'screen4'
let currentAsset = null;
let currentImage = null;
/** Invalidate in-flight loadImage callbacks after cancel or new load */
let loadToken = 0;

const STATES = {
  IDLE: 'idle',
  PRELOADING: 'preloading',
  IMAGE_DISPLAY: 'image_display',
  FADING_OUT: 'fading_out',
  ERROR: 'error'
};

let currentState = STATES.IDLE;
let lastErrorPath = '';
/** Phase 4 — ms to fade image in/out (edit for on-site tuning) */
const DISPLAY_FADE_MS = 900;
let displayRevealStartMs = 0;
let fadeOutStartMs = 0;

window.setScreenId = function (id) {
  screenId = id;
  document.getElementById('status').textContent = `Configured as: ${id}`;
  document.getElementById('screen-config').style.display = 'none';
  document.getElementById('p5-container').style.display = 'block';

  connectToServer();
};

function connectToServer() {
  if (!screenId) return;

  socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('register-display', { screenId: screenId });
  });

  socket.on('registered', (data) => {
    console.log('Registered as:', data.type, data.screenId);
    connected = true;
  });

  socket.on('load-image', (data) => {
    console.log('Load image command received:', data);
    loadImageAsset(data);
  });

  socket.on('cancel-load', () => {
    resetToIdleImmediate();
    console.log('cancel-load: returned to idle');
  });

  socket.on('display', () => {
    console.log('Display command received');
    if (currentState === STATES.PRELOADING && currentImage) {
      currentState = STATES.IMAGE_DISPLAY;
      displayRevealStartMs = millis();
    }
  });

  socket.on('idle', () => {
    console.log('Idle command received');
    beginFadeToIdle();
  });

  socket.on('stop', () => {
    console.log('Stop command received');
    beginFadeToIdle();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connected = false;
  });
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('p5-container');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function fadeAlphaSince(startMs, durationMs) {
  if (durationMs <= 0) return 255;
  return constrain((millis() - startMs) * 255 / durationMs, 0, 255);
}

function fadeOutAlphaSince(startMs, durationMs) {
  return 255 - fadeAlphaSince(startMs, durationMs);
}

function resetToIdleImmediate() {
  loadToken++;
  currentState = STATES.IDLE;
  currentImage = null;
  currentAsset = null;
  lastErrorPath = '';
  displayRevealStartMs = 0;
  fadeOutStartMs = 0;
}

function beginFadeToIdle() {
  loadToken++;
  if (currentState === STATES.IMAGE_DISPLAY && currentImage) {
    currentState = STATES.FADING_OUT;
    fadeOutStartMs = millis();
    return;
  }
  resetToIdleImmediate();
}

function draw() {
  switch (currentState) {
    case STATES.IDLE:
      drawIdleState();
      break;
    case STATES.PRELOADING:
      drawPreloadingState();
      break;
    case STATES.IMAGE_DISPLAY:
      drawImageDisplay(fadeAlphaSince(displayRevealStartMs, DISPLAY_FADE_MS));
      break;
    case STATES.FADING_OUT:
      drawFadeOut();
      break;
    case STATES.ERROR:
      drawErrorState();
      break;
  }
}

function drawIdleState() {
  background(0);
}

function drawPreloadingState() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text('Loading…', width / 2, height / 2 - 40);
  textSize(28);
  if (currentAsset) {
    text(currentAsset, width / 2, height / 2 + 50);
  }
}

function drawImageDisplay(alpha) {
  if (!currentImage) return;
  background(0);
  push();
  tint(255, alpha);
  imageMode(CENTER);
  image(currentImage, width / 2, height / 2, width, height);
  pop();
}

function drawFadeOut() {
  const alpha = fadeOutAlphaSince(fadeOutStartMs, DISPLAY_FADE_MS);
  if (alpha <= 0) {
    resetToIdleImmediate();
    drawIdleState();
    return;
  }
  drawImageDisplay(alpha);
}

function drawErrorState() {
  background(20, 0, 0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text('Image load failed', width / 2, height / 2 - 40);
  textSize(28);
  text(lastErrorPath || 'unknown path', width / 2, height / 2 + 40);
}

function loadImageAsset(data) {
  const myToken = ++loadToken;
  currentState = STATES.PRELOADING;
  lastErrorPath = '';

  const filePath = data[screenId];

  if (!filePath) {
    console.error('No file path for', screenId);
    currentState = STATES.ERROR;
    lastErrorPath = '(missing path for ' + screenId + ')';
    socket.emit('load-error', { screenId, path: null, reason: 'no-path' });
    return;
  }

  console.log('Loading image:', filePath);
  currentAsset = filePath;

  currentImage = loadImage(
    filePath,
    () => {
      if (myToken !== loadToken) {
        return;
      }
      console.log('Image loaded:', filePath);
      socket.emit('ready', { screenId: screenId });
    },
    () => {
      if (myToken !== loadToken) {
        return;
      }
      console.error('Failed to load image:', filePath);
      lastErrorPath = filePath;
      currentState = STATES.ERROR;
      socket.emit('load-error', { screenId, path: filePath, reason: 'load-failed' });
    }
  );
}
