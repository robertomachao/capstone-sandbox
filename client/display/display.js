// FutureScape Display Screen (Screens 2, 3, 4)
// P5.js sketch for the display screens that show synchronized images

let socket;
let connected = false;
let screenId = null; // Set manually: 'screen2', 'screen3', or 'screen4'
let currentAsset = null;
let currentImage = null;

const STATES = {
  IDLE: 'idle',
  PRELOADING: 'preloading',
  IMAGE_DISPLAY: 'image_display'
};

let currentState = STATES.IDLE;

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

  socket.on('display', () => {
    console.log('Display command received');
    if (currentState === STATES.PRELOADING && currentImage) {
      currentState = STATES.IMAGE_DISPLAY;
    }
  });

  socket.on('idle', () => {
    console.log('Idle command received');
    currentState = STATES.IDLE;
    currentImage = null;
    currentAsset = null;
  });

  socket.on('stop', () => {
    console.log('Stop command received');
    currentState = STATES.IDLE;
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connected = false;
  });
}

function setup() {
  createCanvas(3840, 2160);
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
      drawImageDisplay();
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
  text('Loading...', width / 2, height / 2);
}

function drawImageDisplay() {
  if (currentImage) {
    background(0);
    imageMode(CENTER);
    image(currentImage, width / 2, height / 2, width, height);
  }
}

function loadImageAsset(data) {
  currentState = STATES.PRELOADING;
  const filePath = data[screenId];

  if (!filePath) {
    console.error('No file path for', screenId);
    return;
  }

  console.log('Loading image:', filePath);
  currentImage = loadImage(
    filePath,
    () => {
      console.log('Image loaded:', filePath);
      socket.emit('ready', { screenId: screenId });
    },
    () => {
      console.error('Failed to load image:', filePath);
    }
  );

  currentAsset = filePath;
}
