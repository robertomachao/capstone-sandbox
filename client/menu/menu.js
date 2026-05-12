// FutureScape Menu Screen (Screen 1)
// P5.js sketch for the touch-enabled menu interface

let socket;
let connected = false;
let roster = null;
let assetManifest = null;

function preload() {
  assetManifest = loadJSON('/api/asset-manifest');
}

const MENU_INACTIVITY_MS = 20000;
const LOADING_STALL_MS = 120000;

const STATES = {
  IDLE: 'idle',
  MAIN_MENU: 'main_menu',
  INSTRUCTIONS: 'instructions',
  LOCATION_SELECT: 'location_select',
  LOADING: 'loading',
  PHOTO_SELECTION: 'photo_selection',
  IMAGE_EXHIBIT: 'image_exhibit',
  GOODBYE: 'goodbye'
};

let currentState = STATES.IDLE;
let loadingDestination = null;
let imageExhibitStartMs = 0;
let lastInteractionMs = 0;
let loadingEnteredMs = 0;
const INPUT_DEBOUNCE_MS = 350;
let lastInputEventMs = 0;
/** After goodbye, allow tap to dismiss to idle */
let goodbyeShownMs = 0;

/** Copy — edit anytime */
const INSTRUCTION_LINES = [
  'Welcome to FutureScape.',
  'Tap “Choose location” to explore pre-split scenes on the three display screens.',
  'Each wall shows one third of the image — left, middle, and right.',
  'Use “Close” when you are finished to see a farewell message.'
];

const GOODBYE_LINES = [
  'Thank you for visiting FutureScape.',
  'We hope the future feels a little closer.',
  '— Roberto Cunha'
];

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('p5-container');

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
    } else if (dest === 'photo_selection') {
      currentState = STATES.LOCATION_SELECT;
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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
    case STATES.INSTRUCTIONS:
      drawInstructions();
      break;
    case STATES.LOCATION_SELECT:
      drawLocationSelect();
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
    case STATES.GOODBYE:
      drawGoodbye();
      break;
  }

  drawRosterHud();
  checkMenuTimeouts();
}

function drawRosterHud() {
  if (!roster) return;
  push();
  textAlign(RIGHT, TOP);
  textSize(min(28, width / 48));
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

  const timeoutStates = [
    STATES.MAIN_MENU,
    STATES.INSTRUCTIONS,
    STATES.LOCATION_SELECT,
    STATES.PHOTO_SELECTION,
    STATES.GOODBYE
  ];
  if (timeoutStates.includes(currentState)) {
    if (millis() - lastInteractionMs >= MENU_INACTIVITY_MS) {
      goToIdle();
    }
  }
}

function drawBrandingHeader() {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(min(48, width / 28));
  text('Welcome to FutureScape, where the future is a choice away', 24, 24);

  textAlign(RIGHT, BOTTOM);
  textSize(min(36, width / 36));
  text('by Roberto Cunha', width - 24, height - 24);
}

function drawIdleState() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(56, width / 22));
  text('Please press anywhere in the screen to open Menu', width / 2, height / 2);
}

function layoutThreeMainButtons() {
  const bw = min(560, width * 0.85);
  const bh = min(100, height * 0.11);
  const cx = width / 2;
  const gap = bh + 18;
  const total = gap * 2;
  const top = height / 2 - total / 2;
  return [
    { text: 'Instructions', x: cx, y: top, w: bw, h: bh, action: 'instructions' },
    { text: 'Choose location', x: cx, y: top + gap, w: bw, h: bh, action: 'location' },
    { text: 'Close', x: cx, y: top + gap * 2, w: bw, h: bh, action: 'close' }
  ];
}

function drawMainMenu() {
  background(0);
  drawBrandingHeader();
  drawButtonRow(layoutThreeMainButtons());
}

function drawInstructions() {
  background(0);
  drawBrandingHeader();

  fill(220);
  textAlign(CENTER, TOP);
  textSize(min(34, width / 28));
  let y = height * 0.22;
  const lh = min(46, height / 26);
  INSTRUCTION_LINES.forEach((line) => {
    text(line, width / 2, y);
    y += lh * 1.55;
  });

  const bw = min(480, width * 0.75);
  const bh = min(88, height * 0.1);
  drawButtonRow([
    {
      text: 'Back to Menu',
      x: width / 2,
      y: height - min(140, height * 0.18),
      w: bw,
      h: bh,
      action: 'back'
    }
  ]);
}

function layoutLocationButtons() {
  const bw = min(520, width * 0.82);
  const bh = min(88, height * 0.095);
  const cx = width / 2;
  const gap = bh + 14;
  const top = height * 0.38;
  return [
    { text: 'Location 1', x: cx, y: top, w: bw, h: bh, index: 0 },
    { text: 'Location 2', x: cx, y: top + gap, w: bw, h: bh, index: 1 },
    { text: 'Location 3', x: cx, y: top + gap * 2, w: bw, h: bh, index: 2 },
    { text: 'Location 4', x: cx, y: top + gap * 3, w: bw, h: bh, index: 3 },
    {
      text: 'Back to Menu',
      x: cx,
      y: top + gap * 4 + 24,
      w: bw,
      h: bh,
      action: 'back_menu'
    }
  ];
}

function drawLocationSelect() {
  background(0);
  drawBrandingHeader();

  fill(255);
  textAlign(CENTER, TOP);
  textSize(min(40, width / 26));
  text('Choose a location', width / 2, height * 0.26);

  drawButtonRow(layoutLocationButtons());
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
  textSize(min(52, width / 24));
  text('Loading...', width / 2, height / 2 + 120);
}

function drawPhotoSelection() {
  background(0);
  drawBrandingHeader();

  fill(255);
  textAlign(CENTER, TOP);
  textSize(min(38, width / 28));
  text('Make a choice', width / 2, height * 0.26);

  const bw = min(520, width * 0.82);
  const bh = min(88, height * 0.095);
  const cx = width / 2;
  const gap = bh + 14;
  const top = height * 0.38;
  drawButtonRow([
    {
      text: 'Back to Menu',
      x: cx,
      y: top,
      w: bw,
      h: bh,
      action: 'back_main'
    },
    { text: 'Choice 1', x: cx, y: top + gap, w: bw, h: bh, action: 'choice1' },
    { text: 'Choice 2', x: cx, y: top + gap * 2, w: bw, h: bh, action: 'choice2' }
  ]);
}

function drawImageExhibit() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(56, width / 22));
  text('Temporary message text', width / 2, height / 2);

  if (millis() - imageExhibitStartMs > 7000) {
    const bw = min(360, width * 0.45);
    const bh = min(72, height * 0.08);
    drawButtonRow([
      {
        text: 'Back to Menu',
        x: width - 24 - bw / 2,
        y: height - min(80, height * 0.1),
        w: bw,
        h: bh,
        action: 'back_menu_exhibit'
      }
    ]);
  }
}

function drawGoodbye() {
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(44, width / 24));
  let y = height * 0.38;
  const lh = min(52, height / 22);
  GOODBYE_LINES.forEach((line) => {
    text(line, width / 2, y);
    y += lh * 1.35;
  });

  if (millis() - goodbyeShownMs > 1500) {
    textSize(min(28, width / 32));
    fill(180);
    text('Tap anywhere to return to the welcome screen', width / 2, height * 0.72);
  }
}

function drawButtonRow(buttons) {
  buttons.forEach((button) => {
    fill(50);
    rectMode(CENTER);
    rect(button.x, button.y, button.w, button.h, 10);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(min(44, button.h * 0.42));
    text(button.text, button.x, button.y);
  });
}

function hitRect(mx, my, b) {
  return (
    mx > b.x - b.w / 2 &&
    mx < b.x + b.w / 2 &&
    my > b.y - b.h / 2 &&
    my < b.y + b.h / 2
  );
}

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

  const mx = mouseX;
  const my = mouseY;

  if (
    currentState === STATES.MAIN_MENU ||
    currentState === STATES.INSTRUCTIONS ||
    currentState === STATES.LOCATION_SELECT ||
    currentState === STATES.PHOTO_SELECTION ||
    currentState === STATES.GOODBYE
  ) {
    bumpInteraction();
  }

  if (currentState === STATES.IDLE) {
    currentState = STATES.MAIN_MENU;
    bumpInteraction();
    return;
  }

  if (currentState === STATES.GOODBYE) {
    if (millis() - goodbyeShownMs > 800) {
      goToIdle();
    }
    return;
  }

  if (currentState === STATES.MAIN_MENU) {
    layoutThreeMainButtons().forEach((b) => {
      if (!hitRect(mx, my, b)) return;
      if (b.action === 'instructions') {
        currentState = STATES.INSTRUCTIONS;
        bumpInteraction();
      } else if (b.action === 'location') {
        currentState = STATES.LOCATION_SELECT;
        bumpInteraction();
      } else if (b.action === 'close') {
        emitIdleToDisplays();
        currentState = STATES.GOODBYE;
        goodbyeShownMs = millis();
        bumpInteraction();
      }
    });
    return;
  }

  if (currentState === STATES.INSTRUCTIONS) {
    layoutThreeMainButtons();
    const back = {
      text: 'Back to Menu',
      x: width / 2,
      y: height - min(140, height * 0.18),
      w: min(480, width * 0.75),
      h: min(88, height * 0.1)
    };
    if (hitRect(mx, my, back)) {
      currentState = STATES.MAIN_MENU;
      bumpInteraction();
    }
    return;
  }

  if (currentState === STATES.LOCATION_SELECT) {
    layoutLocationButtons().forEach((b) => {
      if (!hitRect(mx, my, b)) return;
      if (b.action === 'back_menu') {
        emitIdleToDisplays();
        currentState = STATES.MAIN_MENU;
        bumpInteraction();
      } else if (typeof b.index === 'number') {
        enterLoading('photo_selection');
        if (socket && connected) {
          socket.emit('load-image', pathsForLocation(b.index));
        }
      }
    });
    return;
  }

  if (currentState === STATES.PHOTO_SELECTION) {
    const bw = min(520, width * 0.82);
    const bh = min(88, height * 0.095);
    const cx = width / 2;
    const gap = bh + 14;
    const top = height * 0.38;
    const rows = [
      { text: 'Back to Menu', x: cx, y: top, w: bw, h: bh, action: 'back_main' },
      { text: 'Choice 1', x: cx, y: top + gap, w: bw, h: bh, action: 'choice1' },
      { text: 'Choice 2', x: cx, y: top + gap * 2, w: bw, h: bh, action: 'choice2' }
    ];
    rows.forEach((b) => {
      if (!hitRect(mx, my, b)) return;
      if (b.action === 'back_main') {
        emitIdleToDisplays();
        currentState = STATES.MAIN_MENU;
        bumpInteraction();
      } else if (b.action === 'choice1') {
        enterLoading('image_exhibit');
        if (socket && connected) {
          socket.emit('load-image', pathsForChoice(1));
        }
      } else if (b.action === 'choice2') {
        enterLoading('image_exhibit');
        if (socket && connected) {
          socket.emit('load-image', pathsForChoice(2));
        }
      }
    });
    return;
  }

  if (currentState === STATES.IMAGE_EXHIBIT) {
    if (millis() - imageExhibitStartMs > 7000) {
      const bw = min(360, width * 0.45);
      const bh = min(72, height * 0.08);
      const bx = width - 24 - bw / 2;
      const by = height - min(80, height * 0.1);
      if (
        mx > bx - bw / 2 &&
        mx < bx + bw / 2 &&
        my > by - bh / 2 &&
        my < by + bh / 2
      ) {
        emitIdleToDisplays();
        currentState = STATES.MAIN_MENU;
        bumpInteraction();
      }
    }
  }
}
