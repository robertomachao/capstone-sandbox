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
   - **Menu HUD:** Top-right shows **`Phase 3 | L:OK M:OK R:OK`** when displays register (connection roster).

**Offline show:** P5 is served from `client/vendor/p5.min.js` (no CDN). After `npm install`, the runtime does not need internet.

**Start the server before opening the menu tab** so `preload()` can load `/api/asset-manifest`.

## Menu behavior (Phases 2–3)

- **20s inactivity** on Main Menu or Photo Selection → **Idle** (and **`idle`** to displays).
- **Touch:** `touchStarted` shares the same handler as the mouse (debounced).
- **Loading stall:** **120s** without all **ready** → **Idle**.

## When to add your image files

You **do not** need to upload images to the AI for the pipeline to work. Add files under **`assets/images/`** when you want real pictures on the wall; names must match **`assets/asset-manifest.json`** (or edit that JSON). Details: **`assets/images/ASSETS.md`**.

## Phase 3 — image pipeline (same `npm start`)

- **Manifest:** `http://127.0.0.1:3000/api/asset-manifest` — JSON path map for all triptychs.
- **Health:** `/api/health` includes `"phase": 3`.
- **Errors:** Missing or bad images → displays report **`load-error`** → menu recovers (no infinite loading); optional red error flash on the affected display tab.

## Project layout

```
server/server.js       # Express + Socket.io + /api/health
client/menu/           # Screen 1
client/display/        # Screens 2–4 (manual ID)
client/vendor/p5.min.js
assets/images/         # Bitmap files (see ASSETS.md + asset-manifest.json)
assets/asset-manifest.json
scripts/check-phase1.js
```

## Development

```bash
npm run dev
```

## Next phases

See [Planning.md](Planning.md): **Phase 4** (fades & broader error handling), **Phase 5** (ambisonics).
