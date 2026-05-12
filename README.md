# FutureScape — Exhibition (capstone)

Four-screen installation: **Screen 1** is the touch menu; **Screens 2–4** are three Chrome tabs showing **pre-split image thirds** (left / middle / right), kept in sync over **Socket.io**. **Images only** (no video). **Ambisonics** is planned later.

Full spec: [Planning.md](Planning.md).

## Phase 1 — deploy locally

**Prerequisites:** Node.js 18+ (or 14+ with working npm).

1. **Install**

   ```bash
   npm install
   ```

2. **Sanity-check files** (no server required)

   ```bash
   npm run phase1:check
   ```

3. **Start the server** (listens on **127.0.0.1** only — one machine, no LAN bind)

   ```bash
   npm start
   ```

4. **Open Chrome** (four tabs on the same machine)

   - Menu: `http://127.0.0.1:3000/menu`  
   - Display (open **three** times): `http://127.0.0.1:3000/display`  
     On each display tab, choose **Screen 2 (Left)**, **Screen 3 (Middle)**, or **Screen 4 (Right)** exactly once.

5. **Smoke tests**

   - **HTTP:** `http://127.0.0.1:3000/api/health` — JSON includes `phase` (milestone), `menu`, `screen2`, `screen3`, `screen4`.  
   - **With server running:** `PHASE1_PROBE=1 npm run phase1:check`  
   - **Menu HUD:** Top-right shows **`Phase 2 | L:OK M:OK R:OK`** when displays register (connection roster).

**Offline show:** P5 is served from `client/vendor/p5.min.js` (no CDN). After `npm install`, the runtime does not need internet.

## Phase 2 — menu behavior (no extra install)

Already included when you run Phase 1 steps above.

- **20 second timeout:** On **Main Menu** or **Photo Selection**, if nobody touches the menu for 20 seconds, the app returns to the **Idle** screen and sends **`idle`** to the three display tabs (same as Phase 1 wiring).
- **Touch:** The menu responds to **`touchStarted`** as well as mouse clicks (with a short debounce so one tap does not double-trigger).
- **Loading safety:** If a load never finishes (missing assets or disconnected clients), after **120 seconds** the menu returns to **Idle**.

Nothing else is required to “turn on” Phase 2 beyond `npm start` and refreshing the menu tab after you pull the latest code.

## Project layout

```
server/server.js       # Express + Socket.io + /api/health
client/menu/           # Screen 1
client/display/        # Screens 2–4 (manual ID)
client/vendor/p5.min.js
assets/images/         # Your pre-split files (see menu.js path helpers)
scripts/check-phase1.js
```

## Development

```bash
npm run dev
```

## Next phases

See [Planning.md](Planning.md): **Phase 3** (image pipeline hardening), **Phase 4** (fades & errors), **Phase 5** (ambisonics).
