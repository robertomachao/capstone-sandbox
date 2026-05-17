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

   - **Menu (Screen 1)** — this is where buttons live: `http://127.0.0.1:3000/menu`  
   - **Display** (open **three** times): `http://127.0.0.1:3000/display`  
     On each tab, pick **Left**, **Middle**, or **Right** once (three different tabs).

   **Using the menu:** **Idle** → tap once → **Main Menu** with three buttons: **Instructions**, **Choose location** (then pick Location 1–4), **Close** (goodbye message). Display tabs stay black until you load images from **Choose location** / choices (normal).

5. **Smoke tests**

   - **HTTP:** `http://127.0.0.1:3000/api/health` — JSON includes `phase` (milestone), `menu`, `screen2`, `screen3`, `screen4`.  
   - **With server running:** `PHASE1_PROBE=1 npm run phase1:check`  
   - **Menu HUD:** Top-right shows **`Phase 4 | L:OK M:OK R:OK`** when displays register (connection roster).

**Offline show:** P5 is served from `client/vendor/p5.min.js` (no CDN). After `npm install`, the runtime does not need internet.

**Start the server before opening the menu tab** so `preload()` can load `/api/asset-manifest`.

## Troubleshooting: all black, no buttons

- Use the **menu** URL (`/menu`), not only `/display`. Display clients intentionally show black until content loads.
- **Tap or click the menu once** on the idle screen to reveal the Location buttons (idle → main menu).
- Open DevTools (F12) → **Console** on the menu tab: red errors often mean the server was not running when the tab loaded, or Socket.io failed to connect — refresh after `npm start`.
- **Do not open the menu as a local file** (`file://…`); always use `http://127.0.0.1:3000/menu` so scripts and `/api/asset-manifest` load.

## Menu behavior (Phases 2–4)

- **20s inactivity** on Main Menu or Photo Selection → **Idle** (and **`idle`** to displays).
- **Touch:** `touchStarted` shares the same handler as the mouse (debounced).
- **Loading stall:** **120s** without all **ready** → **Idle**.
- **Phase 4 fades:** walls fade in on synchronized **display**; fade to black on **idle**/**stop**; menu exhibit/goodbye text fade in (tune `MENU_FADE_MS` / `DISPLAY_FADE_MS` in the client JS).

## When to add your image files

You **do not** need to upload images to the AI for the pipeline to work. Add files under **`assets/images/`** when you want real pictures on the wall; names must match **`assets/asset-manifest.json`** (or edit that JSON). Details: **`assets/images/ASSETS.md`**.

## Phase 3 — image pipeline (same `npm start`)

- **Manifest:** `http://127.0.0.1:3000/api/asset-manifest` — JSON path map for all triptychs.
- **Errors:** Missing or bad images → displays report **`load-error`** → menu recovers (no infinite loading); optional red error flash on the affected display tab.

## Phase 4 — polish (same `npm start`)

- **Health:** `/api/health` includes `"phase": 4`.
- **Fades:** display reveal + idle/stop fade-out; menu image-exhibit and goodbye overlays.
- **Exhibit copy:** edit `IMAGE_EXHIBIT_LINES` in `client/menu/menu.js`.

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

See [Planning.md](Planning.md): **Phase 5** (ambisonics).
