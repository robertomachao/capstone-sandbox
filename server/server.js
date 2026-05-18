const express = require('express');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from client directories
app.use('/menu', express.static(path.join(__dirname, '../client/menu')));
app.use('/display', express.static(path.join(__dirname, '../client/display')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// P5.js bundled in repo — no CDN or extra npm package needed at runtime
app.use('/vendor', express.static(path.join(__dirname, '../client/vendor')));

const assetManifestPath = path.join(__dirname, '../assets/asset-manifest.json');

/** Single source of truth for triptych paths (menu reads via GET) */
app.get('/api/asset-manifest', (req, res) => {
  if (!fs.existsSync(assetManifestPath)) {
    return res.status(200).json({ locations: {}, choices: {} });
  }
  res.sendFile(assetManifestPath);
});

// Store connected clients
const clients = {
  menu: null,
  display: {
    screen2: null,
    screen3: null,
    screen4: null
  }
};

// Track ready states for synchronization
const readyStates = {
  screen2: false,
  screen3: false,
  screen4: false
};

const DISPLAY_IDS = ['screen2', 'screen3', 'screen4'];

function connectedDisplayIds() {
  return DISPLAY_IDS.filter((id) => clients.display[id]);
}

function allDisplaysConnected() {
  return connectedDisplayIds().length === DISPLAY_IDS.length;
}

function emitToDisplays(event, payload) {
  DISPLAY_IDS.forEach((id) => {
    const client = clients.display[id];
    if (client) {
      if (payload !== undefined) {
        client.emit(event, payload);
      } else {
        client.emit(event);
      }
    }
  });
}

function emitLoadProgressToMenu() {
  if (!clients.menu) return;
  clients.menu.emit('load-progress', {
    screen2: readyStates.screen2,
    screen3: readyStates.screen3,
    screen4: readyStates.screen4
  });
}

function tryCompleteLoadWave() {
  if (!allDisplaysConnected()) {
    return;
  }
  const allReady = DISPLAY_IDS.every((id) => readyStates[id]);
  if (!allReady) {
    return;
  }

  console.log('All screens ready — display + all-ready');
  emitToDisplays('display');

  if (clients.menu) {
    clients.menu.emit('all-ready');
  }

  DISPLAY_IDS.forEach((id) => {
    readyStates[id] = false;
  });
}

function rosterPayload() {
  return {
    menu: !!clients.menu,
    screen2: !!clients.display.screen2,
    screen3: !!clients.display.screen3,
    screen4: !!clients.display.screen4
  };
}

function emitRosterToMenu() {
  if (clients.menu) {
    clients.menu.emit('roster', rosterPayload());
  }
}

// HTTP smoke check (curl / browser) — no WebSocket required
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    phase: 4,
    service: 'futurescape',
    ...rosterPayload()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle menu screen connection
  socket.on('register-menu', () => {
    clients.menu = socket;
    console.log('Menu screen registered:', socket.id);
    socket.emit('registered', { type: 'menu' });
    emitRosterToMenu();
  });

  // Handle display screen connection with manual identification
  socket.on('register-display', (data) => {
    const { screenId } = data; // screenId should be 'screen2', 'screen3', or 'screen4'
    
    if (screenId && ['screen2', 'screen3', 'screen4'].includes(screenId)) {
      clients.display[screenId] = socket;
      socket.screenId = screenId;
      console.log(`Display screen ${screenId} registered:`, socket.id);
      socket.emit('registered', { type: 'display', screenId: screenId });
      emitRosterToMenu();
    } else {
      console.error('Invalid screen ID:', screenId);
      socket.emit('error', { message: 'Invalid screen ID. Must be screen2, screen3, or screen4' });
    }
  });

  // Handle ready state from display screens
  socket.on('ready', () => {
    if (!socket.screenId || !DISPLAY_IDS.includes(socket.screenId)) {
      return;
    }
    if (!clients.display[socket.screenId]) {
      return;
    }

    readyStates[socket.screenId] = true;
    console.log(`${socket.screenId} is ready`);
    emitLoadProgressToMenu();
    tryCompleteLoadWave();
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket === clients.menu) {
      clients.menu = null;
    } else if (socket.screenId) {
      clients.display[socket.screenId] = null;
      readyStates[socket.screenId] = false;
    }
    emitRosterToMenu();
  });

  // Forward commands from menu to display screens
  socket.on('load-image', (data) => {
    const notifyMenu = (payload) => {
      if (clients.menu) {
        clients.menu.emit('display-load-error', payload);
      } else {
        socket.emit('display-load-error', payload);
      }
    };

    if (!data || !data.screen2 || !data.screen3 || !data.screen4) {
      console.error('load-image rejected: need screen2, screen3, screen4 paths', data);
      notifyMenu({ reason: 'invalid-payload' });
      return;
    }

    if (!allDisplaysConnected()) {
      const missing = DISPLAY_IDS.filter((id) => !clients.display[id]);
      console.error('load-image rejected: displays not connected', missing);
      notifyMenu({ reason: 'displays-missing', missing });
      return;
    }

    DISPLAY_IDS.forEach((id) => {
      readyStates[id] = false;
    });
    emitLoadProgressToMenu();

    console.log('Load image command received:', data);
    emitToDisplays('load-image', data);
  });

  socket.on('load-error', (payload) => {
    console.warn('Display load error:', payload);
    readyStates.screen2 = false;
    readyStates.screen3 = false;
    readyStates.screen4 = false;
    emitToDisplays('cancel-load');
    if (clients.menu) {
      clients.menu.emit('display-load-error', payload || {});
    }
  });

  socket.on('idle', () => {
    console.log('Idle command received');
    // Forward to all display screens
    emitToDisplays('idle');
  });

  socket.on('stop', () => {
    console.log('Stop command received');
    // Forward to all display screens
    emitToDisplays('stop');
  });
});

// Root route - redirect to menu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/menu/index.html'));
});

// Bind to loopback only: one machine, four local Chrome tabs — no LAN exposure, no internet required at runtime
server.listen(PORT, '127.0.0.1', () => {
  console.log(`FutureScape Exhibition Server running on http://127.0.0.1:${PORT}`);
  console.log(`Menu screen: http://127.0.0.1:${PORT}/menu`);
  console.log(`Display screens: http://127.0.0.1:${PORT}/display`);
});
