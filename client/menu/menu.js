// FutureScape Menu Screen (Screen 1)
// P5.js sketch for the touch-enabled menu interface

let socket;
let connected = false;
/** Last roster from server (Phase 1 smoke-test HUD) */
let roster = null;

const STATES = {
  IDLE: 'idle',
  MAIN_MENU: 'main_menu',
  LOADING: 'loading',
  PHOTO_SELECTION: 'photo_selection',
  IMAGE_EXHIBIT: 'image_exhibit'
};

let currentState = STATES.IDLE;
/** After LOAD_IMAGE + all READY: where to go next */
let loadingDestination = null;
let imageExhibitStartMs = 0;

function setup() {
  createCanvas(3840, 2160);

  socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('register-menu');
  });

  socket.on('registered', (data) => {
    console.log('Registered as:', data.type);
    connected = true;
  });

  socket.on('roster', (data) => {
    roster = data;
  });

  socket.on('all-ready', () => {
    console.log('All display screens are ready');
    if (currentState !== STATES.LOADING || !loadingDestination) return;
    if (loadingDestination === 'photo_selection') {
      currentState = STATES.PHOTO_SELECTION;
    } else if (loadingDestination === 'image_exhibit') {
      currentState = STATES.IMAGE_EXHIBIT;
      imageExhibitStartMs = millis();
    }
    loadingDestination = null;
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    connected = false;
  });
}

function draw() {
  background(0);

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
    case STATES.IMAGE_EXHIBIT:
      drawImageExhibit();
      break;
  }

  drawPhase1RosterHud();
}

function drawPhase1RosterHud() {
  if (!roster) return;
  push();
  textAlign(RIGHT, TOP);
  textSize(28);
  fill(connected ? color(0, 180, 80) : color(180, 60, 60));
  const L = roster.screen2 ? 'L:OK' : 'L:--';
  const M = roster.screen3 ? 'M:OK' : 'M:--';
  const R = roster.screen4 ? 'R:OK' : 'R:--';
  text(`Phase 1 | ${L} ${M} ${R}`, width - 24, 24);
  pop();
}

function drawIdleState() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(72);
  text('Please press anywhere in the screen to open Menu', width / 2, height / 2);
}

function drawMainMenu() {
  background(0);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(64);
  text('Welcome to FutureScape, where the future is a choice away', 50, 50);

  textAlign(RIGHT, BOTTOM);
  textSize(48);
  text('by Roberto Cunha', width - 50, height - 50);

  drawButtons([
    { text: 'Location 1', x: width / 2, y: height / 2 - 200 },
    { text: 'Location 2', x: width / 2, y: height / 2 - 50 },
    { text: 'Location 3', x: width / 2, y: height / 2 + 100 },
    { text: 'Location 4', x: width / 2, y: height / 2 + 250 }
  ]);
}

function drawLoadingState() {
  background(0);
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
  text('Loading...', width / 2, height / 2 + 150);
}

function drawPhotoSelection() {
  background(0);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(64);
  text('Welcome to FutureScape, where the future is a choice away', 50, 50);

  textAlign(RIGHT, BOTTOM);
  textSize(48);
  text('by Roberto Cunha', width - 50, height - 50);

  drawButtons([
    { text: 'Back to Main Menu', x: width / 2, y: height / 2 - 100 },
    { text: 'Choice 1', x: width / 2, y: height / 2 + 50 },
    { text: 'Choice 2', x: width / 2, y: height / 2 + 200 }
  ]);
}

function drawImageExhibit() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(72);
  text('Temporary message text', width / 2, height / 2);

  if (millis() - imageExhibitStartMs > 7000) {
    fill(50);
    rectMode(CENTER);
    rect(width - 200, height - 100, 360, 80, 10);
    fill(255);
    textSize(36);
    text('Back to Main Menu', width - 200, height - 100);
  }
}

function drawButtons(buttons) {
  buttons.forEach((button) => {
    fill(50);
    rectMode(CENTER);
    rect(button.x, button.y, 600, 120, 10);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text(button.text, button.x, button.y);
  });
}

/** Pre-split image paths for main-menu location (1-based index). */
function pathsForLocation(locationIndex) {
  const n = locationIndex + 1;
  return {
    screen2: `/assets/images/location${n}_left.jpg`,
    screen3: `/assets/images/location${n}_middle.jpg`,
    screen4: `/assets/images/location${n}_right.jpg`
  };
}

/** Pre-split image paths for secondary choice (1 or 2). */
function pathsForChoice(choiceNum) {
  return {
    screen2: `/assets/images/choice${choiceNum}_left.jpg`,
    screen3: `/assets/images/choice${choiceNum}_middle.jpg`,
    screen4: `/assets/images/choice${choiceNum}_right.jpg`
  };
}

function emitIdleToDisplays() {
  if (socket && connected) {
    socket.emit('idle');
  }
}

function mousePressed() {
  if (currentState === STATES.IDLE) {
    currentState = STATES.MAIN_MENU;
  } else if (currentState === STATES.MAIN_MENU) {
    const buttons = [
      { text: 'Location 1', x: width / 2, y: height / 2 - 200 },
      { text: 'Location 2', x: width / 2, y: height / 2 - 50 },
      { text: 'Location 3', x: width / 2, y: height / 2 + 100 },
      { text: 'Location 4', x: width / 2, y: height / 2 + 250 }
    ];

    buttons.forEach((button, index) => {
      if (
        mouseX > button.x - 300 &&
        mouseX < button.x + 300 &&
        mouseY > button.y - 60 &&
        mouseY < button.y + 60
      ) {
        loadingDestination = 'photo_selection';
        currentState = STATES.LOADING;
        if (socket && connected) {
          socket.emit('load-image', pathsForLocation(index));
        }
        console.log(`Location ${index + 1} selected — pre-loading images on display tabs`);
      }
    });
  } else if (currentState === STATES.PHOTO_SELECTION) {
    const buttons = [
      { text: 'Back to Main Menu', x: width / 2, y: height / 2 - 100, action: 'back' },
      { text: 'Choice 1', x: width / 2, y: height / 2 + 50, action: 'choice1' },
      { text: 'Choice 2', x: width / 2, y: height / 2 + 200, action: 'choice2' }
    ];

    buttons.forEach((button) => {
      if (
        mouseX > button.x - 300 &&
        mouseX < button.x + 300 &&
        mouseY > button.y - 60 &&
        mouseY < button.y + 60
      ) {
        if (button.action === 'back') {
          emitIdleToDisplays();
          currentState = STATES.MAIN_MENU;
        } else if (button.action === 'choice1') {
          loadingDestination = 'image_exhibit';
          currentState = STATES.LOADING;
          if (socket && connected) {
            socket.emit('load-image', pathsForChoice(1));
          }
        } else if (button.action === 'choice2') {
          loadingDestination = 'image_exhibit';
          currentState = STATES.LOADING;
          if (socket && connected) {
            socket.emit('load-image', pathsForChoice(2));
          }
        }
      }
    });
  } else if (currentState === STATES.IMAGE_EXHIBIT) {
    if (millis() - imageExhibitStartMs > 7000) {
      const bx = width - 200;
      const by = height - 100;
      if (mouseX > bx - 180 && mouseX < bx + 180 && mouseY > by - 40 && mouseY < by + 40) {
        emitIdleToDisplays();
        currentState = STATES.MAIN_MENU;
      }
    }
  }
}
