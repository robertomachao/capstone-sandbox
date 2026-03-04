# Capstone Project - Exhibition : FutureScape

## Project Overview
A 4-screen interactive exhibition installation where Screen 1 serves as a touch-enabled menu/control interface, and Screens 2, 3, and 4 display synchronized pre-split content (images/videos). Each display screen shows its assigned portion (left, middle, or right) at full size - no cropping or splitting is performed in code as assets are already prepared.

## Hardware Setup
- **1 Machine** connected to 4 screens
- **Screen 1**: Native touch screen (Menu/Server)
- **Screen 2**: Display screen (Client - Left portion)
- **Screen 3**: Display screen (Client - Middle portion)
- **Screen 4**: Display screen (Client - Right portion)
- Each screen runs in a separate Chrome tab

## Application Architecture

### Communication Model
- **Server/Client Architecture**
  - Screen 1: Server (Menu/Controller)
  - Screens 2, 3, 4: Clients (Receivers/Display)
  - **Communication method: WebSocket (Socket.io)** ✓

### Technology Stack
- **Frontend**: P5.js for rendering
- **Backend**: Node.js/Express server for coordination
- **Communication**: WebSocket (Socket.io) for real-time sync
- **Asset Management**: Pre-loading system for synchronized deployment

---

## Screen 1 (Menu/Server) - State Machine

### State 1: Idle State
- **Display**: 
  - Message: "Please press anywhere in the screen to open Menu"
  - Black background
- **Interaction**: Click anywhere → Transition to Main Menu
- **Timeout**: 20 seconds → Return to Idle (if in Main Menu or after photo selection)

### State 2: Main Menu
- **Layout**:
  - **Top Left**: "Welcome to FutureScape, where the future is a choice away"
  - **Bottom Right**: "by Roberto Cunha" + Logo (to be provided)
  - **Center**: At least 4 buttons (temporary text for now)
    - Each button represents a location/photo option
- **Interaction**: 
  - Click button → Select location/photo
  - Transition to Photo Selection State
- **Timeout**: 20 seconds of inactivity → Return to Idle State

### State 3: Loading State
- **Display**: 
  - Rotating gauge/progress indicator
  - Shown while assets are pre-loading on Screens 2, 3, 4
- **Trigger**: After photo selection, while assets load
- **Transition**: When all assets loaded → Photo Selection State

### State 4: Photo Selection State
- **Display**: 
  - Same layout as Main Menu but with different buttons
  - 3 buttons:
    1. "Back to Main Menu" (returns to Main Menu)
    2. "Choice 1" (pre-loads and plays video1)
    3. "Choice 2" (pre-loads and plays video2)
- **Interaction**:
  - Button 1 → Return to Main Menu
  - Button 2 → Pre-load video1 → Transition to Video Playback State
  - Button 3 → Pre-load video2 → Transition to Video Playback State
- **Timeout**: 20 seconds of inactivity → Return to Idle State

### State 5: Video Playback State
- **Display**:
  - Menu fades out
  - Message fades in (temporary text for now)
  - After 7 seconds: "Back to Main Menu" button appears (bottom right corner)
- **Interaction**:
  - Click "Back to Main Menu" → Stop video → Return to Main Menu
- **Video**: Playing in loop on Screens 2, 3, 4

---

## Screens 2, 3, 4 (Clients/Display) - State Machine

### State 1: Idle/Placeholder State
- **Display**: Placeholder background
- **Trigger**: 
  - Initial state
  - When Screen 1 is in Idle or Main Menu
  - After returning to Main Menu

### State 2: Pre-loading State
- **Display**: 
  - Placeholder background (or loading indicator)
  - Assets loading in background
- **Trigger**: After photo/video selection on Screen 1
- **Transition**: When asset loaded → Display State

### State 3: Image Display State
- **Display**: 
  - Screen 2: Pre-split left portion of image (full size)
  - Screen 3: Pre-split middle portion of image (full size)
  - Screen 4: Pre-split right portion of image (full size)
- **Synchronization**: All screens display simultaneously after pre-loading
- **Trigger**: After photo selection and pre-loading complete
- **Note**: Images are already split into 3 parts, no cropping needed

### State 4: Video Display State
- **Display**: 
  - Screen 2: Pre-split left portion of video (full size, looping)
  - Screen 3: Pre-split middle portion of video (full size, looping)
  - Screen 4: Pre-split right portion of video (full size, looping)
- **Synchronization**: 
  - All screens start playback simultaneously
  - Videos loop continuously
- **Trigger**: After video selection and pre-loading complete
- **Note**: Videos are already split into 3 parts, no cropping needed

---

## Technical Requirements

### Asset Management
- **Pre-loading System**:
  - Assets must be fully loaded before deployment
  - Synchronized deployment across all 3 display screens
  - Handle loading progress and errors
  - Support for images and videos
- **Asset Storage**: **Local files** ✓
- **Asset Structure**:
  - Images and videos are **pre-split** into 3 parts (left, middle, right)
  - Each screen receives its specific portion file path
  - No cropping or splitting needed in code - assets are already prepared
  - Screen 2 receives left portion, Screen 3 receives middle portion, Screen 4 receives right portion
- **Video Format**: **MP4 H.264** ✓
- **Resolution**: **3840 x 2160 (4K UHD)** ✓

### Synchronization
- **Challenge**: Network delay between screens receiving commands
- **Solution**: 
  - Pre-load assets on all clients
  - Use timestamp-based sync or ready-state confirmation
  - Server waits for all clients to confirm "ready" before sending "play" command
  - Consider using WebSocket with acknowledgment system

### Communication Protocol
- **Message Types**:
  - `IDLE`: Return to idle/placeholder state
  - `LOAD_IMAGE`: Pre-load image asset (with specific portion **local file path** for this screen)
  - `LOAD_VIDEO`: Pre-load video asset (with specific portion **local file path** for this screen)
  - `DISPLAY_IMAGE`: Show pre-loaded image
  - `DISPLAY_VIDEO`: Play pre-loaded video
  - `STOP`: Stop current playback
  - `READY`: Client confirmation that asset is loaded
- **Note**: Each screen receives its own pre-split asset **local file path** (left, middle, or right portion)

### Timeout Management
- **20-second timeout**:
  - Starts when entering Main Menu
  - Resets on any interaction
  - Starts after photo selection
  - Returns to Idle State when triggered
  - Must be cancellable when transitioning to other states

### Animation & Transitions
- **Fade Duration**: **Customizable** ✓
  - Fade in/out animations for menu transitions
  - Fade in for video playback messages
  - Configurable timing for smooth user experience

---

## File Structure (Proposed)

```
capstone-sandbox-1/
├── server/
│   ├── server.js              # Express + WebSocket server
│   └── routes.js              # API routes (if needed)
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
├── public/                    # Static assets
├── package.json
├── README.md
└── Planning.md
```

---

## Implementation Considerations

### P5.js Specifics
- Use `loadImage()` and `loadVideo()` for asset loading
- Use `preload()` function for initial assets
- Implement custom pre-loading system for dynamic assets
- Use `image()` and `video()` functions for display
- Handle video looping with `video.loop()`

### Synchronization Strategy
**Selected: Option A - Ready State Confirmation** ✓
- Server sends `LOAD_IMAGE` / `LOAD_VIDEO` with the specific portion **local file path** for each screen (left/middle/right)
- Each client loads its assigned asset and sends "READY" when complete
- Server waits for all 3 clients to send "READY"
- Server sends `DISPLAY_IMAGE` / `DISPLAY_VIDEO` to all clients simultaneously

~~Option B - Timestamp Sync~~ (Not selected)
~~Option C - Frame Sync~~ (Not selected)

### Screen Identification
**Selected: Method 3 - Manual configuration on each client** ✓
- Each client screen will have manual configuration to identify itself (Screen 2, 3, or 4)
- Implementation: Configuration file or UI setting on each display screen

~~Method 1: URL parameters~~ (Not selected; we are using manual configuration)
~~Method 2: Server assigns screen ID~~ (Not selected)

### Error Handling
- Network disconnection recovery
- Asset loading failures
- Screen connection issues
- Timeout edge cases

---

## Decisions Made ✓

1. **Communication Protocol**: **WebSocket (Socket.io)** ✓
2. **Screen Identification**: **Manual configuration on each client** ✓
3. **Asset Storage**: **Local files** ✓
4. **Video Format**: **MP4 H.264** ✓
5. **Resolution**: **3840 x 2160 (4K UHD)** ✓
6. **Synchronization Strategy**: **Option A - Ready State Confirmation** ✓
7. **Fade Duration**: **Customizable** ✓

## Open Questions

1. **Logo**: When will the logo be provided? (Placeholder for now)
2. **Button Text**: What should the 4+ menu buttons say? (Temporary text for now)
3. **Message Text**: What should the message during video playback say? (Temporary text for now)
4. **Loading Indicator**: Specific design for the rotating gauge? (Not sure yet)

---

## Development Phases (Proposed)

### Phase 1: Basic Setup
- Set up Node.js server with Socket.io (WebSocket)
- Create basic HTML structure for menu and display screens
- Implement basic P5.js sketches
- Set up manual screen identification system
- Test communication between server and clients

### Phase 2: Menu System
- Implement Screen 1 state machine
- Create Main Menu UI
- Implement button interactions
- Add timeout functionality

### Phase 3: Asset Management
- Implement pre-loading system
- Set up asset **file-path mapping** (left/middle/right portions)
- Test image display across 3 screens with pre-split assets
- Add loading indicators

### Phase 4: Video Playback
- Implement video pre-loading with pre-split assets
- Add video synchronization across screens
- Create video playback state
- Implement message fade in/out

### Phase 5: Polish & Testing
- Add animations and transitions
- Test timeout scenarios
- Optimize synchronization
- Error handling and edge cases

---

## Notes
- All screens run in Chrome tabs
- Screen 1 is touch-enabled
- Screens 2, 3, 4 are arranged left to right
- Assets must be pre-loaded to handle network delays
- **Images and videos are pre-split into 3 parts** - no cropping needed in code
- Each screen displays its assigned portion at full size (3840 x 2160 resolution)
- Videos are MP4 H.264 format
- Assets stored as local files
- 20-second timeout returns to Idle state
- Fade animations are customizable
- Logo and specific button/message text to be provided later
- Loading indicator design TBD