# Feelings Vending Co. (きもちの自販機)

A small three.js website: a Japanese-style drinks machine that sells canned feelings.
Click a can, its button, or pick one from **Menu**. The can drops into the tray (ガコン!) and flies out to you.
Read its "Feeling Facts", then **Drink it** and the whole world turns that feeling's colour. Or **Put it back** (no refunds).

The look is comic / cel-shaded: flat two-tone toon shading, ink outlines with a constant on-screen width,
sticker lettering, and tone-on-tone shapes floating in a bold background.

Everything is made in code: the 3D models, the can wrappers and signs (drawn on canvases), and the sound effects (Web Audio).
Fonts come from Google Fonts: Dela Gothic One (display), Zen Kaku Gothic New (text) and DotGothic16 (the LED screen).

Music: "Pitcher Perfect Theme" from the [Not Jam Music Pack](https://not-jam.itch.io/not-jam-music-pack) (CC0),
in `public/music/`. It loops quietly after the first click, and the sound button mutes it with the effects.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. To make a production build in `dist/`, run `npm run build`.
It's a static site, so Vercel, Netlify or GitHub Pages can host `dist/` as-is.

## Cans for Blender

With `npm run dev` running, open http://localhost:5173/tools/export.html. It writes to `exports/`:
`feelings_cans.glb` (all 12 cans, plain PBR materials, wrappers embedded) and `label_<code>.png` for each wrapper.
The Blender scene and the portfolio video are built from these by
`Desktop\Blender\Blender\MOCKUP\Feelings_Tools\build_feelings_can.py` (see the top of that script).

## Files

| File | What it does |
| --- | --- |
| `src/feelings.js` | The 12 feelings: name, Japanese name, drawing, price, facts, colours. Edit this to change the menu. |
| `src/toon.js` | The cel shader (two tones with a crisp edge) and the ink outline (inverted hull, constant pixel width). |
| `src/machine.js` | Builds the machine: cabinet, lit window, shelves with price tags and buttons, money panel, LED, tray. |
| `src/can.js` | The can: wrapper, shoulder and rolled rim, countersunk lid, rivet, pull tab, scored opening, shine. |
| `src/textures.js` | Canvas drawings: can wrappers (one drawing per feeling), sign, LED, price strips, stickers, backdrop. |
| `src/sound.js` | Synthesised beeps, motor, clunk, can opening, gulps, chime. |
| `src/ui.js` | HTML layer: tooltip, product card, menu, comic burst toast, ガコン! sound effect lettering. |
| `src/main.js` | Scene, toon lights, background shapes, camera framing, and the vend → present → drink sequence (GSAP). |

## Ideas for next steps

- Swap the code-built can for your own Blender model: export a `.glb` and load it with `GLTFLoader` in `src/can.js`.
  Keep the wrapper as the body material so each feeling still gets its own label.
- Give each feeling its own effect after drinking (Nap Juice dims the lights, Big Laugh makes the machine wobble).
- Add a "receipt" that prints out of the machine with the feelings you've drunk.
