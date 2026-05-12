# Capstone Project - Exhibition : FutureScape

## Project Overview
A 4-screen interactive exhibition installation where Screen 1 serves as a touch-enabled menu/control interface, and Screens 2, 3, and 4 display **synchronized pre-split images only**. Each display runs in **its own Chrome tab** (one tab per physical screen), showing the **left**, **middle**, or **right** portion of the artwork in order (Screen 2 → left, Screen 3 → middle, Screen 4 → right). Portions are shown at full size; **no cropping or splitting is done in code**—assets are prepared in advance.

**Sound (future):** An **ambisonics** playback system will be added later so that spatial audio can run when a choice is made. It is **not** part of the current image-only milestone.

## Hardware Setup
- **1 Machine** connected to 4 screens
- **Screen 1**: Native touch screen (Menu / coordination server UI)
- **Screen 2**: Display (Client — **left** portion) — **dedicated Chrome tab**
- **Screen 3**: Display (Client — **middle** portion) — **dedicated Chrome tab**
- **Screen 4**: Display (Client — **right** portion) — **dedicated Chrome tab**
- The menu may run in a fifth tab or on the same machine as configured; all clients connect to the **local** Node server (see **Local / offline operation** below).

## Local / offline operation
- The exhibition runs from **localhost** (Node.js + Express + Socket.io). **Browsers do not need internet** once dependencies are installed.
- **P5.js** is bundled in **`client/vendor/p5.min.js`** and served by the local app. Browsers never need a public CDN during the show.
- **Images** are **local files** under `assets/` and referenced by path; no remote asset URLs are required for normal operation.
- **One-time setup** (can be done while online): run `npm install` in the project folder. After that, `npm start` and opening the local URLs works **without outbound network access** for the installation runtime.

## Application Architecture

### Communication Model
- **Server / client**
  - Screen 1: Menu UI + control logic (registers as **menu** client over WebSocket)
  - Screens 2–4: Display clients (each tab registers as **screen2**, **screen3**, or **screen4**)
- **Communication:** WebSocket (**Socket.io**) on the local server

### Technology Stack
- **Frontend:** P5.js for rendering (served locally)
- **Backend:** Node.js / Express for static files and coordination
- **Realtime:** Socket.io
- **Assets:** Pre-load images, then **display on all three tabs at the same time** after every client reports ready

---

## Screen 1 (Menu) — State Machine

### State 1: Idle State
- **Display:** Black background; message: “Please press anywhere in the screen to open Menu”
- **Interaction:** Tap / click anywhere → Main Menu
- **Timeout:** 20 seconds → return to Idle when applicable (see timeout section)

### State 2: Main Menu
- **Layout:**
  - **Top left:** “Welcome to FutureScape, where the future is a choice away”
  - **Bottom right:** “by Roberto Cunha” + logo (to be provided)
  - **Center:** At least **4** buttons (placeholder labels) — each selects a **location / image set**
- **Interaction:** Button → start pre-load on display tabs → **Loading** → when all ready → **Photo Selection**
- **Timeout:** 20 seconds inactivity → Idle

### State 3: Loading State
- **Display:** Rotating gauge / progress-style indicator while Screens 2–4 **pre-load** their image portions
- **Transition:** When all three clients confirm **READY** → next state depends on flow (**Photo Selection** after main menu choice, or **Image exhibit** after a secondary choice)

### State 4: Photo Selection State
- **Display:** Same layout idea as Main Menu; **3** buttons:
  1. “Back to Main Menu”
  2. “Choice 1” — pre-loads **image set A** (three files) on clients
  3. “Choice 2” — pre-loads **image set B** (three files) on clients
- **Interaction:**
  - Button 1 → Main Menu (and **IDLE** / clear signal to clients as implemented)
  - Buttons 2–3 → **Loading** → when all ready → **Image exhibit** (full triptych on the three tabs at once)
- **Timeout:** 20 seconds inactivity → Idle

### State 5: Image Exhibit State (menu overlay)
- **Display (Screen 1):** Menu fades out; short message fades in (placeholder copy). After **7 seconds**, “Back to Main Menu” appears (e.g. bottom right).
- **Display (Screens 2–4):** Each tab shows its **pre-split** image portion, **in sync** (same moment for left / middle / right).
- **Interaction:** “Back to Main Menu” → clear / idle clients → Main Menu on Screen 1

---

## Screens 2, 3, 4 (Clients) — State Machine

Each client is a **separate Chrome tab**, manually configured as **Screen 2**, **3**, or **4** so the server sends the correct **left / middle / right** file path.

### State 1: Idle / Placeholder
- Placeholder background when the menu is idle / main menu, or after return

### State 2: Pre-loading
- Triggered when Screen 1 requests a **LOAD_IMAGE** with paths for each screen
- Clients load **only their** file; when done, emit **READY**

### State 3: Image Display
- **Screen 2:** left file at full size  
- **Screen 3:** middle file at full size  
- **Screen 4:** right file at full size  
- **Synchronization:** Server issues **DISPLAY_IMAGE** (or equivalent “show” command) **only after** all three **READY** acknowledgments, so all three tabs **reveal the image at the same time**

---

## Technical Requirements

### Asset management
- **Pre-load** each portion before show; handle progress and errors
- **Storage:** local files only
- **Structure:** each “scene” or choice has **three** image files (left, middle, right). Paths are mapped per `screen2` / `screen3` / `screen4`
- **Resolution target:** **3840 × 2160 (4K UHD)** per portion (design intent)

### Synchronization
- **Problem:** variable timing between tabs  
- **Solution (selected):** **Ready-state confirmation**
  - Server sends **LOAD_IMAGE** with `{ screen2: path, screen3: path, screen4: path }` (or equivalent)
  - Each client loads its path, then sends **READY**
  - Server waits for **all three READY**, then broadcasts **display** so all tabs switch together

### Communication protocol (image-only)
- **`IDLE`:** placeholder on clients
- **`LOAD_IMAGE`:** pre-load with **local path** for this tab’s portion
- **`DISPLAY_IMAGE` / display:** show the already-loaded image (current implementation may use a single “display” event after ready)
- **`STOP`:** stop / clear as needed
- **`READY`:** client finished loading

### Timeout management
- **20 seconds:** from Main Menu entry, resets on interaction; also applies where specified; return to **Idle** when fired; must be cancellable on transitions

### Animation
- **Fade duration:** configurable for menu and overlay messages

---

## File structure (proposed)

```
capstone-sandbox-1/
├── server/
│   ├── server.js              # Express + Socket.io + static vendor
│   └── routes.js              # optional
├── client/
│   ├── vendor/
│   │   └── p5.min.js          # vendored P5 (offline; no CDN)
│   ├── menu/
│   │   ├── index.html
│   │   ├── menu.js
│   │   └── styles.css
│   └── display/
│       ├── index.html
│       ├── display.js
│       └── styles.css
├── assets/
│   └── images/                # pre-split left / middle / right per scene
├── public/                    # optional static assets
├── package.json
├── README.md
└── Planning.md
```

---

## Implementation notes

### P5.js
- Use **`loadImage()`** for dynamic assets; **`image()`** for drawing
- Custom pre-load flow for choices driven by Socket.io (not only `preload()`)

### Screen identification
- **Manual** per display tab: each of the three Chrome tabs is configured as **Screen 2, 3, or 4** (UI or config) ✓

### Future: ambisonics
- Not implemented in the image-only phase; when added, it should tie to **choice** events without changing the **three-tab image sync** model unless explicitly redesigned.

### Error handling
- Disconnects, failed image loads, missing client READY, timeout edge cases

---

## Decisions made ✓

1. **Communication:** Socket.io ✓  
2. **Screen ID:** Manual per client tab ✓  
3. **Assets:** Local image files, pre-split ✓  
4. **Resolution:** 4K UHD target ✓  
5. **Sync:** Ready-state confirmation ✓  
6. **Fades:** Configurable ✓  
7. **Media type:** **Images only** (no video in scope) ✓  
8. **Runtime:** **Local / no browser CDN; no internet required** during show ✓  
9. **Displays:** **Three Chrome tabs**, one per wall screen, **simultaneous** image show ✓  

## Open questions

1. **Logo** timing / asset  
2. **Final** menu button labels  
3. **Image exhibit** overlay message copy  
4. **Loading** gauge visual design  
5. **Ambisonics** toolchain and trigger mapping (later)

---

## Development phases (revised)

### Phase 1: Basic setup — **deployed**
- Local server + Socket.io; HTML for menu + display; P5 from **`client/vendor`**; manual screen IDs; smoke-test messaging
- **Run:** `npm install` then `npm start` — open **Menu** and **three Display** tabs at `http://127.0.0.1:3000/menu` and `http://127.0.0.1:3000/display` (pick Left / Middle / Right on each tab).
- **Verify layout:** `npm run phase1:check` (with server up: `PHASE1_PROBE=1 npm run phase1:check` to hit **`GET /api/health`**).
- **Live roster:** Menu shows **Phase 1 | L:OK M:OK R:OK** (top right) when each display socket is registered.

### Phase 2: Menu system — **deployed**
- Screen 1 **state machine** (idle → main menu → loading → photo selection → image exhibit) with **navigation** as before
- **20s inactivity** on Main Menu and Photo Selection returns to **Idle** (clears displays via `idle`); timer **resets** on any tap in those states (including non-button areas)
- **Touch:** `touchStarted()` forwards to the same handler as mouse (debounced to avoid double fire with mouse events)
- **Loading stall:** if clients never report ready within **120s**, menu returns to **Idle** so the UI cannot hang indefinitely
- **HUD:** menu shows **Phase 2 | L/M/R** connection line (same as Phase 1 roster)

### Phase 3: Image pipeline
- **LOAD_IMAGE** path map, **READY** / **display**, triptych on three tabs at once, loading UI

### Phase 4: Polish
- Fades, error handling, idle / stop behavior, on-site testing with 4K assets

### Phase 5 (future): Ambisonics
- Spatial audio triggered by choices; integration plan TBD

---

## Notes
- **Three display Chrome tabs** must stay open—one per physical screen—with correct **left / middle / right** assignment.  
- Pre-split **images** only; no in-code splitting.  
- **Ambisonics** is planned later; specification above is **image + sync** first.
