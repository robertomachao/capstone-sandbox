// FutureScape Menu Screen (Screen 1)
// P5.js sketch for the touch-enabled menu interface

let socket;
let connected = false;
let roster = null;
let assetManifest = null;
let menuFont = null;
/** Menu picker art only (never triptych wall panels) — index 0–3 */
let locationMenuImages = [null, null, null, null];
/** idle | loading | loaded | unavailable */
let locationMenuLoadState = ['idle', 'idle', 'idle', 'idle'];
/** 000N_Menu.jpg — 5760×1080 */
const MENU_PICKER_ASPECT = 5760 / 1080;

function defaultMenuImagePath(locationNum) {
  const n = String(locationNum).padStart(4, '0');
  return `/assets/images/${n}_Menu.jpg`;
}

function onAssetManifestReady() {
  const fontPath = menuFontPath();
  if (fontPath) {
    menuFont = loadFont(fontPath);
  }
  loadLocationMenuImages();
}

function preload() {
  assetManifest = loadJSON('/api/asset-manifest', onAssetManifestReady);
}

function loadLocationMenuImages() {
  if (!assetManifest || !assetManifest.locations) {
    return;
  }
  for (let i = 0; i < 4; i++) {
    const imgPath = menuImagePathForLocation(i);
    if (!imgPath) {
      locationMenuLoadState[i] = 'idle';
      continue;
    }
    if (
      locationMenuLoadState[i] === 'loaded' &&
      imageIsDrawable(locationMenuImages[i])
    ) {
      continue;
    }
    if (locationMenuLoadState[i] === 'loading') {
      continue;
    }

    locationMenuLoadState[i] = 'loading';
    const slot = i;
    loadImage(
      imgPath,
      (img) => {
        locationMenuImages[slot] = img;
        locationMenuLoadState[slot] = imageIsDrawable(img)
          ? 'loaded'
          : 'unavailable';
        if (locationMenuLoadState[slot] === 'loaded') {
          console.log('Menu picker loaded:', imgPath);
        }
      },
      () => {
        locationMenuImages[slot] = null;
        locationMenuLoadState[slot] = 'unavailable';
        console.warn('Menu picker not found (add file later):', imgPath);
      }
    );
  }
}

function menuFontPath() {
  if (assetManifest && assetManifest.fonts) {
    if (assetManifest.fonts.menu) return assetManifest.fonts.menu;
    if (assetManifest.fonts.montserratRegular) {
      return assetManifest.fonts.montserratRegular;
    }
  }
  return '/assets/Fonts/Montserrat-Regular.ttf';
}

function applyMenuFont() {
  if (menuFont) {
    textFont(menuFont);
  }
}

function menuImagePathForLocation(locationIndex) {
  const n = locationIndex + 1;
  const k = String(n);
  const loc =
    assetManifest && assetManifest.locations && assetManifest.locations[k];
  if (loc && loc.menuImage === false) {
    return null;
  }
  if (loc && loc.menuImage) {
    return loc.menuImage;
  }
  return defaultMenuImagePath(n);
}

function menuPickerAspectForLocation(locationIndex) {
  const k = String(locationIndex + 1);
  const loc =
    assetManifest && assetManifest.locations && assetManifest.locations[k];
  if (loc && loc.menuImageAspect) {
    return loc.menuImageAspect;
  }
  return MENU_PICKER_ASPECT;
}

const MENU_INACTIVITY_MS = 20000;
const LOADING_STALL_MS = 120000;
/** Phase 4 — fade timings (ms); tune on site */
const MENU_FADE_MS = 800;
const IMAGE_EXHIBIT_BACK_BUTTON_MS = 7000;

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
let loadProgress = { screen2: false, screen3: false, screen4: false };
let loadingErrorMessage = '';

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

/** Shown on Screen 1 during image exhibit (walls show the triptych) */
const IMAGE_EXHIBIT_LINES = [
  'Your choice is on the walls.',
  'Take a moment to look around.'
];
/** Multiplier on base line height between consecutive exhibit lines */
const IMAGE_EXHIBIT_LINE_LEADING = 1.55;

/** Photo selection — edit labels anytime */
const CHOICE_LABELS = {
  1: 'Conserve water and protect our rivers - use only what we need;',
  2: 'Ignore water shortages - keep consuming without limits.'
};

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('p5-container');

  if (assetManifest && assetManifest.locations) {
    loadLocationMenuImages();
  }

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

  socket.on('load-progress', (progress) => {
    loadProgress = progress || loadProgress;
  });

  socket.on('display-load-error', (payload) => {
    console.warn('display-load-error', payload);
    if (payload && payload.reason === 'displays-missing') {
      loadingErrorMessage =
        'Connect all three display tabs (Left, Middle, Right), then try again.';
    } else {
      loadingErrorMessage = 'Could not load images. Check files in assets/images/.';
    }
    if (currentState !== STATES.LOADING) {
      return;
    }
    const dest = loadingDestination;
    loadingDestination = null;
    loadProgress = { screen2: false, screen3: false, screen4: false };
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
    loadingErrorMessage = '';
    loadProgress = { screen2: false, screen3: false, screen4: false };
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
  applyMenuFont();

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
  text(`Phase 4 | ${L} ${M} ${R}`, width - 24, 24);
  pop();
}

function fadeAlpha(elapsedMs, delayMs, durationMs) {
  const t = elapsedMs - delayMs;
  if (t <= 0 || durationMs <= 0) return 0;
  return constrain((t * 255) / durationMs, 0, 255);
}

function allDisplaysConnected() {
  return roster && roster.screen2 && roster.screen3 && roster.screen4;
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
  loadProgress = { screen2: false, screen3: false, screen4: false };
}

function tryStartLoad(destination, paths) {
  if (!socket || !connected) {
    loadingErrorMessage = 'Menu is not connected to the server. Refresh after npm start.';
    return false;
  }
  if (!allDisplaysConnected()) {
    loadingErrorMessage =
      'Connect all three display tabs (Left, Middle, Right), then try again.';
    return false;
  }
  loadingErrorMessage = '';
  enterLoading(destination);
  socket.emit('load-image', paths);
  return true;
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
  textAlign(CENTER, TOP);
  textSize(min(48, width / 28));
  text('Welcome to FutureScape, where the future is a choice away', width / 2, 24);

  textAlign(CENTER, BOTTOM);
  textSize(min(36, width / 36));
  text('by Roberto Cunha', width / 2, height - 24);
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

function layoutLocationImageStack() {
  const cx = width / 2;
  const gap = 10;
  const top = height * 0.17;
  const backBh = min(88, height * 0.095);
  const reservedBottom = backBh + 40;
  const availableH = height - top - reservedBottom;
  const placeholderH = min(72, height * 0.08);

  let tileW = min(1200, width * 0.92);
  let tileH = tileW / MENU_PICKER_ASPECT;
  const aspects = [0, 1, 2, 3].map(menuPickerAspectForLocation);
  const maxAspect = max(aspects);
  tileH = tileW / maxAspect;

  let totalH = 0;
  for (let i = 0; i < 4; i++) {
    const h = menuImagePathForLocation(i) ? tileH : placeholderH;
    totalH += h + (i < 3 ? gap : 0);
  }

  if (totalH > availableH) {
    const menuCount = [0, 1, 2, 3].filter((i) => menuImagePathForLocation(i)).length;
    const placeCount = 4 - menuCount;
    const menuH = (availableH - gap * 3 - placeCount * placeholderH) / max(menuCount, 1);
    tileH = menuH;
    tileW = tileH * maxAspect;
    if (tileW > width * 0.92) {
      tileW = width * 0.92;
      tileH = tileW / maxAspect;
    }
  }

  const tiles = [];
  let y = top;
  for (let i = 0; i < 4; i++) {
    const hasMenu = !!menuImagePathForLocation(i);
    const h = hasMenu ? tileH : placeholderH;
    tiles.push({
      index: i,
      x: cx,
      y: y + h / 2,
      w: tileW,
      h: h,
      hasMenuImage: hasMenu
    });
    y += h + gap;
  }
  return { tiles, stackBottom: y - gap };
}

function layoutLocationBackButton(stackBottom) {
  const bw = min(480, width * 0.75);
  const bh = min(88, height * 0.1);
  return {
    text: 'Back to Menu',
    x: width / 2,
    y: stackBottom + 28 + bh / 2,
    w: bw,
    h: bh,
    action: 'back_menu'
  };
}

const LOCATION_TILE_RADIUS = 10;

function clipRoundedRect(cx, cy, w, h, radius) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const ctx = drawingContext;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    const r = min(radius, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  ctx.clip();
}

function drawImageCover(img, cx, cy, boxW, boxH) {
  const scale = max(boxW / img.width, boxH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  imageMode(CENTER);
  image(img, cx, cy, dw, dh);
}

function drawLocationImageTile(tile) {
  const radius = LOCATION_TILE_RADIUS;
  const img = locationMenuImages[tile.index];
  const state = locationMenuLoadState[tile.index];

  push();
  clipRoundedRect(tile.x, tile.y, tile.w, tile.h, radius);

  if (imageIsDrawable(img)) {
    drawImageCover(img, tile.x, tile.y, tile.w, tile.h);
  } else {
    fill(35);
    noStroke();
    rectMode(CENTER);
    rect(tile.x, tile.y, tile.w, tile.h);
    if (state === 'loading') {
      fill(200);
      textAlign(CENTER, CENTER);
      textSize(min(26, tile.w / 18));
      text('SOON...', tile.x, tile.y);
    } else if (state === 'unavailable') {
      fill(90);
      textAlign(CENTER, CENTER);
      textSize(min(26, tile.w / 16));
      text(`LOCATION ${tile.index + 1}`, tile.x, tile.y - 10);
      textSize(min(20, tile.w / 22));
      fill(70);
      text(`Add ${String(tile.index + 1).padStart(4, '0')}_Menu.jpg`, tile.x, tile.y + 16);
    } else {
      fill(80);
      textAlign(CENTER, CENTER);
      textSize(min(26, tile.w / 16));
      text(`LOCATION ${tile.index + 1}`, tile.x, tile.y);
    }
  }
  pop();

  noFill();
  stroke(45);
  strokeWeight(2);
  rectMode(CENTER);
  rect(tile.x, tile.y, tile.w, tile.h, radius);
  noStroke();
}

function imageIsDrawable(img) {
  return img && typeof img.width === 'number' && img.width > 0;
}

function drawLocationSelect() {
  loadLocationMenuImages();

  background(0);
  drawBrandingHeader();

  fill(255);
  textAlign(CENTER, TOP);
  textSize(min(40, width / 26));
  text('Choose a location', width / 2, height * 0.2);

  if (loadingErrorMessage) {
    fill(220, 100, 80);
    textSize(min(26, width / 36));
    text(loadingErrorMessage, width / 2, height * 0.27);
  }

  const { tiles, stackBottom } = layoutLocationImageStack();
  tiles.forEach(drawLocationImageTile);
  drawButtonRow([layoutLocationBackButton(stackBottom)]);
}

function drawLoadingState() {
  background(0);
  const elapsed = millis() - loadingEnteredMs;
  const spin = frameCount * 0.05;
  const pulse = 0.85 + 0.15 * sin(elapsed * 0.004);

  push();
  translate(width / 2, height / 2);
  rotate(spin);
  stroke(255, 220);
  strokeWeight(10);
  noFill();
  const r = 100 * pulse;
  arc(0, 0, r * 2, r * 2, 0, PI * 1.35);
  noStroke();
  fill(255, 40);
  arc(0, 0, r * 2, r * 2, 0, TWO_PI);
  pop();

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(52, width / 24));
  text('SOON...', width / 2, height / 2 + 120);

  const readyLine = `Ready: ${loadProgress.screen2 ? 'L✓' : 'L…'} ${loadProgress.screen3 ? 'M✓' : 'M…'} ${loadProgress.screen4 ? 'R✓' : 'R…'}`;
  fill(200);
  textSize(min(30, width / 34));
  text(readyLine, width / 2, height / 2 + 200);

  if (!allDisplaysConnected()) {
    fill(220, 160, 80);
    textSize(min(26, width / 38));
    text(
      'Open three display tabs (Left, Middle, Right) and connect each to the server.',
      width / 2,
      height / 2 + 260
    );
  }
}

/** Title, optional error, and three buttons — vertically equal gaps inside the content band */
function layoutPhotoSelectionScreen() {
  const bw = min(1100, width * 0.9);
  const cx = width / 2;
  const backBh = min(88, height * 0.095);
  const choiceBh = min(120, height * 0.13);
  const titleTs = min(38, width / 28);
  const titleBlockH = titleTs * 1.35;
  const errTs = min(26, width / 36);
  const lineGap = errTs * 1.35;

  let errLines = [];
  if (loadingErrorMessage) {
    errLines = wrapButtonLines(loadingErrorMessage, bw - 48, errTs);
  }
  const errBlockH =
    errLines.length > 0 ? errLines.length * lineGap + errTs * 0.25 : 0;

  const blockHeights = [titleBlockH];
  if (errBlockH > 0) {
    blockHeights.push(errBlockH);
  }
  blockHeights.push(backBh, choiceBh, choiceBh);

  const sumBlocks = blockHeights.reduce((a, b) => a + b, 0);
  const nGap = blockHeights.length + 1;
  const regionTop = min(92, height * 0.11);
  const regionBottom = height - min(92, height * 0.1);
  const usable = regionBottom - regionTop - sumBlocks;
  let gap = usable / nGap;
  gap = max(12, gap);

  let y = regionTop + gap;
  const titleY = y;
  y += titleBlockH + gap;

  let errorY = null;
  if (errLines.length > 0) {
    errorY = y;
    y += errBlockH + gap;
  }

  const backCy = y + backBh / 2;
  y += backBh + gap;
  const choice1Cy = y + choiceBh / 2;
  y += choiceBh + gap;
  const choice2Cy = y + choiceBh / 2;

  return {
    cx,
    titleY,
    titleTs,
    errorY,
    errTs,
    errLines,
    lineGap,
    buttons: [
      {
        text: 'Back to Menu',
        x: cx,
        y: backCy,
        w: bw,
        h: backBh,
        action: 'back_main'
      },
      {
        text: CHOICE_LABELS[1],
        x: cx,
        y: choice1Cy,
        w: bw,
        h: choiceBh,
        action: 'choice1',
        wrap: true
      },
      {
        text: CHOICE_LABELS[2],
        x: cx,
        y: choice2Cy,
        w: bw,
        h: choiceBh,
        action: 'choice2',
        wrap: true
      }
    ]
  };
}

function drawPhotoSelection() {
  background(0);
  drawBrandingHeader();

  const lay = layoutPhotoSelectionScreen();

  fill(255);
  textAlign(CENTER, TOP);
  textSize(lay.titleTs);
  text('Make a choice', lay.cx, lay.titleY);

  if (lay.errLines.length > 0) {
    fill(220, 100, 80);
    textAlign(CENTER, TOP);
    textSize(lay.errTs);
    let ey = lay.errorY;
    lay.errLines.forEach((ln) => {
      text(ln, lay.cx, ey);
      ey += lay.lineGap;
    });
  }

  fill(255);
  drawButtonRow(lay.buttons);
}

function drawImageExhibit() {
  background(0);
  const elapsed = millis() - imageExhibitStartMs;
  const msgAlpha = fadeAlpha(elapsed, 0, MENU_FADE_MS);

  fill(255, msgAlpha);
  textAlign(CENTER, CENTER);
  textSize(min(48, width / 24));
  let y = height * 0.42;
  const lh = min(58, height / 20);
  IMAGE_EXHIBIT_LINES.forEach((line) => {
    text(line, width / 2, y);
    y += lh * IMAGE_EXHIBIT_LINE_LEADING;
  });

  if (elapsed > IMAGE_EXHIBIT_BACK_BUTTON_MS) {
    const btnAlpha = fadeAlpha(
      elapsed,
      IMAGE_EXHIBIT_BACK_BUTTON_MS,
      MENU_FADE_MS
    );
    const bw = min(480, width * 0.75);
    const bh = min(88, height * 0.1);
    drawButtonRow(
      [
        {
          text: 'Back to Menu',
          x: width / 2,
          y: height - min(100, height * 0.12),
          w: bw,
          h: bh,
          action: 'back_menu_exhibit'
        }
      ],
      btnAlpha
    );
  }
}

function drawGoodbye() {
  background(0);
  const elapsed = millis() - goodbyeShownMs;
  const lineAlpha = fadeAlpha(elapsed, 0, MENU_FADE_MS);

  fill(255, lineAlpha);
  textAlign(CENTER, CENTER);
  textSize(min(44, width / 24));
  let y = height * 0.38;
  const lh = min(52, height / 22);
  GOODBYE_LINES.forEach((line) => {
    text(line, width / 2, y);
    y += lh * 1.35;
  });

  if (elapsed > 1500) {
    const hintAlpha = fadeAlpha(elapsed, 1500, MENU_FADE_MS);
    textSize(min(28, width / 32));
    fill(180, hintAlpha);
    text('Tap anywhere to return to the welcome screen', width / 2, height * 0.72);
  }
}

function wrapButtonLines(label, maxWidth, size) {
  textSize(size);
  const words = label.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const trial = line ? `${line} ${word}` : word;
    if (textWidth(trial) <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawButtonRow(buttons, alpha = 255) {
  buttons.forEach((button) => {
    fill(50, alpha);
    rectMode(CENTER);
    rect(button.x, button.y, button.w, button.h, 10);
    fill(255, alpha);
    textAlign(CENTER, CENTER);
    const label = (button.text || '').toUpperCase();
    const size = button.wrap
      ? min(26, button.w / 34)
      : min(44, button.h * 0.42);
    textSize(size);
    if (button.wrap) {
      const lines = wrapButtonLines(label, button.w - 32, size);
      const lh = size * 1.25;
      const startY = button.y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => {
        text(ln, button.x, startY + i * lh);
      });
    } else {
      text(label, button.x, button.y);
    }
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
  if (n === 1) {
    return {
      screen2: '/assets/images/SC_1_FC_L.jpg',
      screen3: '/assets/images/SC_1_FC_M.jpg',
      screen4: '/assets/images/SC_1_FC_R.jpg'
    };
  }
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
  if (choiceNum === 1) {
    return {
      screen2: '/assets/images/SC_1_FC-P_L.jpg',
      screen3: '/assets/images/SC_1_FC-P_M.jpg',
      screen4: '/assets/images/SC_1_FC-P_R.jpg'
    };
  }
  if (choiceNum === 2) {
    return {
      screen2: '/assets/images/SC_1_FC-N_L.jpg',
      screen3: '/assets/images/SC_1_FC-N_M.jpg',
      screen4: '/assets/images/SC_1_FC-N_R.jpg'
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
    const { tiles, stackBottom } = layoutLocationImageStack();
    const back = layoutLocationBackButton(stackBottom);
    if (hitRect(mx, my, back)) {
      emitIdleToDisplays();
      currentState = STATES.MAIN_MENU;
      bumpInteraction();
      return;
    }
    tiles.forEach((tile) => {
      if (!hitRect(mx, my, tile)) return;
      tryStartLoad('photo_selection', pathsForLocation(tile.index));
    });
    return;
  }

  if (currentState === STATES.PHOTO_SELECTION) {
    layoutPhotoSelectionScreen().buttons.forEach((b) => {
      if (!hitRect(mx, my, b)) return;
      if (b.action === 'back_main') {
        emitIdleToDisplays();
        currentState = STATES.MAIN_MENU;
        bumpInteraction();
      } else if (b.action === 'choice1') {
        tryStartLoad('image_exhibit', pathsForChoice(1));
      } else if (b.action === 'choice2') {
        tryStartLoad('image_exhibit', pathsForChoice(2));
      }
    });
    return;
  }

  if (currentState === STATES.IMAGE_EXHIBIT) {
    if (millis() - imageExhibitStartMs > IMAGE_EXHIBIT_BACK_BUTTON_MS) {
      const bw = min(480, width * 0.75);
      const bh = min(88, height * 0.1);
      const bx = width / 2;
      const by = height - min(100, height * 0.12);
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
