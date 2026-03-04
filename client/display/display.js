// FutureScape Display Screen (Screens 2, 3, 4)
// P5.js sketch for the display screens that show synchronized content

let socket;
let connected = false;
let screenId = null; // Will be set manually: 'screen2', 'screen3', or 'screen4'
let currentAsset = null;
let currentImage = null;
let currentVideo = null;

// State management
const STATES = {
  IDLE: 'idle',
  PRELOADING: 'preloading',
  IMAGE_DISPLAY: 'image_display',
  VIDEO_DISPLAY: 'video_display'
};

let currentState = STATES.IDLE;

// Global function to set screen ID from HTML button
window.setScreenId = function(id) {
  screenId = id;
  document.getElementById('status').textContent = `Configured as: ${id}`;
  document.getElementById('screen-config').style.display = 'none';
  document.getElementById('p5-container').style.display = 'block';
  
  // Connect to server (P5.js setup will be called automatically)
  connectToServer();
};

function connectToServer() {
  if (!screenId) return;
  
  // Connect to Socket.io server
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
  
  socket.on('load-video', (data) => {
    console.log('Load video command received:', data);
    loadVideoAsset(data);
  });
  
  socket.on('display', () => {
    console.log('Display command received');
    if (currentState === STATES.PRELOADING) {
      if (currentImage) {
        currentState = STATES.IMAGE_DISPLAY;
      } else if (currentVideo) {
        currentState = STATES.VIDEO_DISPLAY;
        currentVideo.loop();
      }
    }
  });
  
  socket.on('idle', () => {
    console.log('Idle command received');
    currentState = STATES.IDLE;
    if (currentVideo) {
      currentVideo.stop();
      currentVideo = null;
    }
    currentImage = null;
    currentAsset = null;
  });
  
  socket.on('stop', () => {
    console.log('Stop command received');
    if (currentVideo) {
      currentVideo.stop();
    }
    currentState = STATES.IDLE;
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connected = false;
  });
}

function setup() {
  // Set canvas to full screen (4K resolution: 3840 x 2160)
  createCanvas(3840, 2160);
  
  // Note: Connection will be established when screenId is set via setScreenId()
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
    case STATES.VIDEO_DISPLAY:
      drawVideoDisplay();
      break;
  }
}

function drawIdleState() {
  // Placeholder background (black)
  background(0);
}

function drawPreloadingState() {
  // Placeholder background while loading
  background(0);
  
  // Optional: loading indicator
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Loading...", width / 2, height / 2);
}

function drawImageDisplay() {
  if (currentImage) {
    background(0);
    imageMode(CENTER);
    image(currentImage, width / 2, height / 2, width, height);
  }
}

function drawVideoDisplay() {
  if (currentVideo && currentVideo.elt.readyState >= 2) {
    background(0);
    imageMode(CENTER);
    image(currentVideo, width / 2, height / 2, width, height);
  }
}

function loadImageAsset(data) {
  // data should contain file paths for each screen
  // Example: { screen2: 'assets/images/location1_left.jpg', screen3: 'assets/images/location1_middle.jpg', screen4: 'assets/images/location1_right.jpg' }
  
  currentState = STATES.PRELOADING;
  const filePath = data[screenId];
  
  if (!filePath) {
    console.error('No file path for', screenId);
    return;
  }
  
  console.log('Loading image:', filePath);
  currentImage = loadImage(filePath, () => {
    console.log('Image loaded:', filePath);
    // Send ready signal to server
    socket.emit('ready', { screenId: screenId });
  }, () => {
    console.error('Failed to load image:', filePath);
  });
  
  currentAsset = filePath;
}

function loadVideoAsset(data) {
  // data should contain file paths for each screen
  // Example: { screen2: 'assets/videos/choice1_left.mp4', screen3: 'assets/videos/choice1_middle.mp4', screen4: 'assets/videos/choice1_right.mp4' }
  
  currentState = STATES.PRELOADING;
  const filePath = data[screenId];
  
  if (!filePath) {
    console.error('No file path for', screenId);
    return;
  }
  
  console.log('Loading video:', filePath);
  
  // Stop previous video if exists
  if (currentVideo) {
    currentVideo.stop();
  }
  
  currentVideo = createVideo(filePath, () => {
    console.log('Video loaded:', filePath);
    currentVideo.hide(); // Hide HTML5 video element, we'll draw it with P5
    currentVideo.volume(0); // Mute by default (or set volume as needed)
    // Send ready signal to server
    socket.emit('ready', { screenId: screenId });
  });
  
  currentVideo.onended(() => {
    // Video ended, but should loop - handled by loop() call
    console.log('Video ended');
  });
  
  currentAsset = filePath;
}
