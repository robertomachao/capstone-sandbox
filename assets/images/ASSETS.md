# When to add your images

**You do not need to send images to the AI for the app to run.** The code and `asset-manifest.json` already point at fixed paths under this folder.

### Add real artwork when:

- You are ready to **see your triptych on the three display tabs** (not only black / loading / errors).
- You are **locking content** for rehearsal or the show.

Until then, the **image pipeline still works** (load → ready → synchronized display); missing files trigger **load errors** and the menu returns to a safe screen instead of hanging.

### What to place here

Use **exact filenames** from `assets/asset-manifest.json` (or edit that JSON if you prefer different names). Default pattern:

| Kind | Files (per set) |
|------|------------------|
| Main menu **Location 1–4** | `location{N}_left.jpg`, `location{N}_middle.jpg`, `location{N}_right.jpg` |
| Photo selection **Choice 1–2** | `choice{N}_left.jpg`, `choice{N}_middle.jpg`, `choice{N}_right.jpg` |

Use **one folder**: `assets/images/`. Formats commonly work with **JPEG** or **PNG** if you change extensions in the manifest.

### Resolution

Target **3840 × 2160 per panel** (see `Planning.md`). Other sizes will scale to the canvas.

### If you want help from the assistant

Share images (or a zip / drive link) **when you want help** with naming, manifest edits, color checks, or troubleshooting loads—not required for deploying Phase 3.
