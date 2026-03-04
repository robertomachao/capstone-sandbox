// FutureScape Menu Screen (Screen 1)
// P5.js sketch for the touch-enabled menu interface

let socket;
let connected = false;

// State management
const STATES = {
  IDLE: 'idle',
  MAIN_MENU: 'main_menu',
  LOADING: 'loading',
  PHOTO_SELECTION: 'photo_selection',
  VIDEO_PLAYBACK: 'video_playback'
};

let currentState = STATES.IDLE;

function setup() {
  // Set canvas to full screen (4K resolution: 3840 x 2160)
  createCanvas(3840, 2160);
  
  // Connect to Socket.io server
  socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('register-menu');
  });
  
  socket.on('registered', (data) => {
    console.log('Registered as:', data.type);
    connected = true;
  });
  
  socket.on('all-ready', () => {
    console.log('All display screens are ready');
    if (currentState === STATES.LOADING) {
      currentState = STATES.PHOTO_SELECTION;
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connected = false;
  });
}

function draw() {
  background(0); // Black background
  
  switch (currentState) {
    case STATES.IDLE:
      drawIdleState();
      break;
    case STATES.MAIN_MENU:
      drawMainMenu();
      break;
    case STATES.LOADING:
      drawLoadingState();
      break;
    case STATES.PHOTO_SELECTION:
      drawPhotoSelection();
      break;
    case STATES.VIDEO_PLAYBACK:
      drawVideoPlayback();
      break;
  }
}

function drawIdleState() {
  // Black background with message
  background(0);
  
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(72);
  text("Please press anywhere in the screen to open Menu", width / 2, height / 2);
}

function drawMainMenu() {
  background(0);
  
  // Top left: Welcome message
  fill(255);
  textAlign(LEFT, TOP);
  textSize(64);
  text("Welcome to FutureScape, where the future is a choice away", 50, 50);
  
  // Bottom right: Author credit
  textAlign(RIGHT, BOTTOM);
  textSize(48);
  text("by Roberto Cunha", width - 50, height - 50);
  // TODO: Add logo when provided
  
  // Center: Buttons (temporary text)
  drawButtons([
    { text: "Location 1", x: width / 2, y: height / 2 - 200 },
    { text: "Location 2", x: width / 2, y: height / 2 - 50 },
    { text: "Location 3", x: width / 2, y: height / 2 + 100 },
    { text: "Location 4", x: width / 2, y: height / 2 + 250 }
  ]);
}

function drawLoadingState() {
  background(0);
  
  // Rotating gauge/progress indicator
  push();
  translate(width / 2, height / 2);
  rotate(frameCount * 0.05);
  
  stroke(255);
  strokeWeight(10);
  noFill();
  arc(0, 0, 200, 200, 0, PI * 1.5);
  pop();
  
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Loading...", width / 2, height / 2 + 150);
}

function drawPhotoSelection() {
  // Same layout as Main Menu but with different buttons
  background(0);
  
  // Top left: Welcome message
  fill(255);
  textAlign(LEFT, TOP);
  textSize(64);
  text("Welcome to FutureScape, where the future is a choice away", 50, 50);
  
  // Bottom right: Author credit
  textAlign(RIGHT, BOTTOM);
  textSize(48);
  text("by Roberto Cunha", width - 50, height - 50);
  
  // Center: 3 buttons
  drawButtons([
    { text: "Back to Main Menu", x: width / 2, y: height / 2 - 100 },
    { text: "Choice 1", x: width / 2, y: height / 2 + 50 },
    { text: "Choice 2", x: width / 2, y: height / 2 + 200 }
  ]);
}

function drawVideoPlayback() {
  // Menu fades out, message fades in
  background(0);
  
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(72);
  text("Temporary message text", width / 2, height / 2);
  
  // After 7 seconds, show back button (bottom right)
  // TODO: Implement timing logic
}

function drawButtons(buttons) {
  buttons.forEach(button => {
    // Button background
    fill(50);
    rectMode(CENTER);
    rect(button.x, button.y, 600, 120, 10);
    
    // Button text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text(button.text, button.x, button.y);
  });
}

function mousePressed() {
  if (currentState === STATES.IDLE) {
    currentState = STATES.MAIN_MENU;
  } else if (currentState === STATES.MAIN_MENU) {
    // Check if clicked on a button (temporary - will be improved)
    const buttons = [
      { text: "Location 1", x: width / 2, y: height / 2 - 200 },
      { text: "Location 2", x: width / 2, y: height / 2 - 50 },
      { text: "Location 3", x: width / 2, y: height / 2 + 100 },
      { text: "Location 4", x: width / 2, y: height / 2 + 250 }
    ];
    
    buttons.forEach((button, index) => {
      if (mouseX > button.x - 300 && mouseX < button.x + 300 &&
          mouseY > button.y - 60 && mouseY < button.y + 60) {
        // Button clicked - transition to loading state
        currentState = STATES.LOADING;
        // TODO: Send load-image command with specific location
        console.log(`Location ${index + 1} selected`);
      }
    });
  } else if (currentState === STATES.PHOTO_SELECTION) {
    // Handle photo selection buttons
    const buttons = [
      { text: "Back to Main Menu", x: width / 2, y: height / 2 - 100, action: 'back' },
      { text: "Choice 1", x: width / 2, y: height / 2 + 50, action: 'choice1' },
      { text: "Choice 2", x: width / 2, y: height / 2 + 200, action: 'choice2' }
    ];
    
    buttons.forEach(button => {
      if (mouseX > button.x - 300 && mouseX < button.x + 300 &&
          mouseY > button.y - 60 && mouseY < button.y + 60) {
        if (button.action === 'back') {
          currentState = STATES.MAIN_MENU;
        } else if (button.action === 'choice1') {
          // TODO: Load video1
          console.log('Choice 1 selected');
        } else if (button.action === 'choice2') {
          // TODO: Load video2
          console.log('Choice 2 selected');
        }
      }
    });
  }
}
