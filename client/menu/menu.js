// FutureScape Menu Screen (Screen 1)
// P5.js sketch for the touch-enabled menu interface

let socket;
let connected = false;
/** Last roster from server (Phase 1 smoke-test HUD) */
let roster = null;
/** Triptych paths from server (Phase 3); fallback if request fails */
let assetManifest = null;

function preload() {
  assetManifest = loadJSON('/api/asset-manifest');
}

/** Phase 2: inactivity → Idle (Planning: 20s, cancellable on transition) */
const MENU_INACTIVITY_MS = 20000;
/** If clients never become ready, escape loading (exhibition safety) */
const LOADING_STALL_MS = 120000;

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
let lastInteractionMs = 0;
let loadingEnteredMs = 0;
/** Ignore duplicate touch + mouse within this window (ms) */
const INPUT_DEBOUNCE_MS = 350;
let lastInputEventMs = 0;

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

  socket.on('display-load-error', (payload) => {
    console.warn('display-load-error', payload);
    if (currentState !== STATES.LOADING) return;
    const dest = loadingDestination;
    loadingDestination = null;
    emitIdleToDisplays();
    if (dest === 'image_exhibit') {
      currentState = STATES.PHOTO_SELECTION;
    } else {
      currentState = STATES.MAIN_MENU;
    }
    bumpInteraction();
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
    bumpInteraction();
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

  drawRosterHud();
  checkMenuTimeouts();
}

function drawRosterHud() {
  if (!roster) return;
  push();
  textAlign(RIGHT, TOP);
  textSize(28);
  fill(connected ? color(0, 180, 80) : color(180, 60, 60));
  const L = roster.screen2 ? 'L:OK' : 'L:--';
  const M = roster.screen3 ? 'M:OK' : 'M:--';
  const R = roster.screen4 ? 'R:OK' : 'R:--';
  text(`Phase 3 | ${L} ${M} ${R}`, width - 24, 24);
  pop();
}

function bumpInteraction() {
  lastInteractionMs = millis();
}

function goToIdle() {
  emitIdleToDisplays();
  currentState = STATES.IDLE;
  loadingDestination = null;
  bumpInteraction();
}

function enterLoading(destination) {
  loadingDestination = destination;
  currentState = STATES.LOADING;
  loadingEnteredMs = millis();
}

function checkMenuTimeouts() {
  if (currentState === STATES.LOADING) {
    if (millis() - loadingEnteredMs >= LOADING_STALL_MS) {
      goToIdle();
    }
    return;
  }

  if (
    currentState === STATES.MAIN_MENU ||
    currentState === STATES.PHOTO_SELECTION
  ) {
    if (millis() - lastInteractionMs >= MENU_INACTIVITY_MS) {
      goToIdle();
    }
  }
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

/** Pre-split image paths for main-menu location (0-based index → locations "1"…"4"). */
function pathsForLocation(locationIndex) {
  const k = String(locationIndex + 1);
  const loc =
    assetManifest && assetManifest.locations && assetManifest.locations[k];
  if (loc && loc.screen2 && loc.screen3 && loc.screen4) {
    return {
      screen2: loc.screen2,
      screen3: loc.screen3,
      screen4: loc.screen4
    };
  }
  const n = locationIndex + 1;
  return {
    screen2: `/assets/images/location${n}_left.jpg`,
    screen3: `/assets/images/location${n}_middle.jpg`,
    screen4: `/assets/images/location${n}_right.jpg`
  };
}

/** Pre-split paths for secondary choice (1 or 2). */
function pathsForChoice(choiceNum) {
  const k = String(choiceNum);
  const ch =
    assetManifest && assetManifest.choices && assetManifest.choices[k];
  if (ch && ch.screen2 && ch.screen3 && ch.screen4) {
    return {
      screen2: ch.screen2,
      screen3: ch.screen3,
      screen4: ch.screen4
    };
  }
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

function touchStarted() {
  handleMenuInput();
  return false;
}

function mousePressed() {
  handleMenuInput();
}

function handleMenuInput() {
  const now = millis();
  if (now - lastInputEventMs < INPUT_DEBOUNCE_MS) {
    return;
  }
  lastInputEventMs = now;

  if (currentState === STATES.MAIN_MENU || currentState === STATES.PHOTO_SELECTION) {
    bumpInteraction();
  }

  if (currentState === STATES.IDLE) {
    currentState = STATES.MAIN_MENU;
    bumpInteraction();
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
        enterLoading('photo_selection');
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
          bumpInteraction();
        } else if (button.action === 'choice1') {
          enterLoading('image_exhibit');
          if (socket && connected) {
            socket.emit('load-image', pathsForChoice(1));
          }
        } else if (button.action === 'choice2') {
          enterLoading('image_exhibit');
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
        bumpInteraction();
      }
    }
  }
}
