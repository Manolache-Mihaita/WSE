# Wraeclast Sound Editor (WSE) — web (static)

The **Wraeclast Sound Editor** (**WSE**) is a fully client-side version of the
tool that runs in the browser and can be hosted on **GitHub Pages**. No server,
no Python — the same engine as the CLI is ported to JavaScript (`engine.js`).

What a visitor can do:

- Upload one or more `.filter` files, or a `.zip` containing them (and,
  optionally, sound files).
- Edit the sound rules with the same map system as the desktop tool: categories
  (`type` / `tier` / `bucket` / `alertSound`), single items, item groups,
  `type`+`tier` refinement (e.g. gold `stack3`), and item **conditions** (e.g.
  `Rarity Unique`, `StackSize >= 1000`).
- Works on **any NeverSink filter** — stock (built-in `PlayAlertSound`) or any
  custom sound pack (Mathil, Bex, …). Use the **`soundTier` 1–6** rule (or the
  "universal sound tiers" preset) and one map re-sounds the right categories on
  every filter, no matter how its sounds are encoded.
- Start from a **preset** — blank rule-structures (assign your own sounds) or
  full example maps.
- Provide sounds by **uploading their own** (stored in the browser via IndexedDB,
  so they persist and play back) or just **typing a sound file name** without
  uploading.
- Download a `patched_filter.zip` (the `filter/` folder is the drop-in for the
  PoE folder; any uploaded sounds that are referenced are bundled in).

The same guarantees apply: only sound lines change (an **appearance check** runs
on every generate), and a change summary is shown per file.

**No copyrighted audio is hosted** — the site ships only sound *names*; audio
lives in each visitor's browser.

## Deploy to GitHub Pages

1. Put this `docs/` folder in a GitHub repository (e.g. commit the whole project).
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Choose your branch (e.g. `main`) and folder **`/docs`**, then Save.
4. Your site is served at `https://<user>.github.io/<repo>/`.

(Alternatively, copy the contents of `docs/` to the repo root, or to a
`gh-pages` branch, and point Pages there.)

## Run locally

Open `index.html` through any static server, e.g.:

```
cd docs
python -m http.server 8000    # then open http://localhost:8000
```

Opening the file directly (`file://`) also works, but a local server is more
reliable. `JSZip` is loaded from a CDN; for fully offline use, download
`jszip.min.js` next to `index.html` and change the `<script src>` in `index.html`.

## Files

```
index.html      markup + styling + script includes
engine.js       the ported engine (parse / catalog / patch / appearance / summary)
app.js          the browser UI (upload, rules editor, presets, sounds, generate)
sound-names.js  the default sound-name library (edit freely)
presets.js      bundled preset maps (blank structures + full examples)
```

## Customising

- **Sound names**: edit the array in `sound-names.js`.
- **Presets**: edit `presets.js` (each entry has `kind: "structure" | "example"`
  and a `map`).
- The map format matches the desktop tool, so maps are interchangeable between
  this web version, the CLI (`apply_sounds.py --map`), and the Flask app.
