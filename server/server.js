const express = require('express');
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

// Phase 1: HTTP smoke check (curl / browser) — no WebSocket required
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    phase: 1,
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
  socket.on('ready', (data) => {
    if (socket.screenId) {
      readyStates[socket.screenId] = true;
      console.log(`${socket.screenId} is ready`);
      
      // Check if all screens are ready
      if (readyStates.screen2 && readyStates.screen3 && readyStates.screen4) {
        console.log('All screens ready, sending display command');
        // Notify menu that all screens are ready
        if (clients.menu) {
          clients.menu.emit('all-ready');
        }
        // Send display command to all screens
        io.to(clients.display.screen2.id).emit('display');
        io.to(clients.display.screen3.id).emit('display');
        io.to(clients.display.screen4.id).emit('display');
        
        // Reset ready states
        readyStates.screen2 = false;
        readyStates.screen3 = false;
        readyStates.screen4 = false;
      }
    }
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
    console.log('Load image command received:', data);
    // Forward to all display screens
    Object.values(clients.display).forEach(client => {
      if (client) {
        client.emit('load-image', data);
      }
    });
  });

  socket.on('idle', () => {
    console.log('Idle command received');
    // Forward to all display screens
    Object.values(clients.display).forEach(client => {
      if (client) {
        client.emit('idle');
      }
    });
  });

  socket.on('stop', () => {
    console.log('Stop command received');
    // Forward to all display screens
    Object.values(clients.display).forEach(client => {
      if (client) {
        client.emit('stop');
      }
    });
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
