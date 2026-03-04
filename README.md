# Capstone Project - Exhibition : FutureScape

A 4-screen interactive exhibition installation where Screen 1 serves as a touch-enabled menu/control interface, and Screens 2, 3, and 4 display synchronized pre-split content (images/videos).

## Project Structure

```
capstone-sandbox-1/
├── server/
│   └── server.js              # Express + Socket.io server
├── client/
│   ├── menu/                  # Screen 1 (Menu/Server)
│   │   ├── index.html
│   │   ├── menu.js            # P5.js menu logic
│   │   └── styles.css
│   └── display/               # Screens 2, 3, 4 (Clients)
│       ├── index.html
│       ├── display.js         # P5.js display logic
│       └── styles.css
├── assets/
│   ├── images/                # Location photos (pre-split into left/middle/right)
│   └── videos/                # Video choices (pre-split into left/middle/right)
├── package.json
├── README.md
└── Planning.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open the screens in Chrome:**
   - **Screen 1 (Menu)**: Open `http://localhost:3000/menu` in Chrome
   - **Screen 2 (Display)**: Open `http://localhost:3000/display` in Chrome
   - **Screen 3 (Display)**: Open `http://localhost:3000/display` in Chrome
   - **Screen 4 (Display)**: Open `http://localhost:3000/display` in Chrome

4. **Configure Display Screens:**
   - On each display screen, click the button corresponding to its position:
     - Screen 2: Click "Screen 2 (Left)"
     - Screen 3: Click "Screen 3 (Middle)"
     - Screen 4: Click "Screen 4 (Right)"

## Current Status: Phase 1 Complete ✅

Phase 1 includes:
- ✅ Node.js server with Socket.io (WebSocket)
- ✅ Basic HTML structure for menu and display screens
- ✅ Basic P5.js sketches for both menu and display
- ✅ Manual screen identification system
- ✅ Basic communication protocol between server and clients

## Next Steps (Phase 2+)

- Implement full menu system with state machine
- Add asset pre-loading and synchronization
- Implement image/video display functionality
- Add timeout management
- Polish UI and animations

## Technical Details

- **Resolution**: 3840 x 2160 (4K UHD)
- **Video Format**: MP4 H.264
- **Communication**: WebSocket (Socket.io)
- **Screen Identification**: Manual configuration
- **Asset Storage**: Local files

For detailed planning and requirements, see [Planning.md](Planning.md).
