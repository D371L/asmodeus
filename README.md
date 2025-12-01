# Asmodeus Wheel

Hi! I built a neon “wheel of fortune” for giveaways and interactive picks. It saves state, plays synthy sounds, has a demo auto-spin mode, and ships as a PWA. Use it, remix it, enjoy: https://d371l.github.io/asmodeus/

## Stack
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3 (bundled, no CDN)
- D3 (slice geometry)
- Web Audio API (tick / spin start / win)
- PWA: manifest + service worker (offline cache for the shell)

## What it does
- Add/remove players, drag-and-drop reordering, preset names button.
- Persists players, history, sound toggle, elimination mode, and demo mode in `localStorage`.
- Elimination mode: remove winner after spin.
- Demo mode: auto-spins every 8–12s; if the list is empty, it auto-fills a preset.
- Hotkeys: `Space` — spin, `S` — sound, `D` — demo. Spin button has aria-label; events announced via `aria-live`.
- Visuals: metallic gradients per slice, winner glow, pointer sparks/beam, confetti.
- PWA installable with icons and offline cache.

## Try it
- Live: https://d371l.github.io/asmodeus/

## Scripts
- `npm install` — install deps
- `npm run dev` — local dev (Vite)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview built assets

## Run locally
1) `npm install`
2) `npm run dev`
3) Open the URL printed by Vite (usually `http://localhost:5173/`).

## Deploy (GitHub Pages)
- `vite.config.ts` uses `base: '/asmodeus/'`. Keep it if hosting at `https://<user>.github.io/asmodeus/`.
- Workflow `.github/workflows/deploy.yml` builds and publishes `dist` to Pages on push to `main`.

## PWA bits
- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js` (caches core shell and icons)
- Icons: `public/icon-192.svg`, `public/icon-512.svg`

## Accessibility & Controls
- Hotkeys: `Space` spin, `S` sound, `D` demo.
- Spin button `aria-label`; live region announces add/remove and winner.
- Inputs/buttons keep focus styles; list is draggable with mouse (keyboard DnD not yet).

## Structure
- `App.tsx` — app state, spin logic, demo mode, audio, ARIA, SW registration.
- `components/Wheel.tsx` — SVG/D3 wheel, winner glow, pointer sparks/beam.
- `components/Controls.tsx` — player management, presets, drag-and-drop, modes.
- `components/WinnerModal.tsx` — winner dialog with gradient avatar.
- `components/Confetti.tsx` — confetti effect.
- `constants.ts` — palette and name presets.
- `utils/audio.ts` — Web Audio synthesis.
- `public/` — PWA assets (manifest, service worker, icons).
