# Retro WASM Deck – Emulator Hub (React + Vite)

Pick an emulator from the hub (MS-DOS ready; GBA/NES/SNES/PSX/N64 are WIP) and run everything client-side. Drop a `.zip` for DOS and boot instantly via the js-dos WebAssembly build. Styled with a CRT-inspired UI and ready for GitHub Pages.

## What’s inside

- **Hub-first UX**: a landing grid lists emulators; add new ones by extending the `EMULATORS` array in `src/App.jsx`.
- **MS-DOS emulator (ready)**: js-dos (WASM, CDN) with drag & drop ZIP loading, auto-start command detection (EXE/BAT/COM), Start/Reset, Big view overlay, and Fullscreen.
- **Coming soon** placeholders: GBA, NES, SNES, PSX, N64 cards with WIP screens; swap in real components later.
- **Zero backend**: everything runs locally in the browser; your files never leave your machine.
- **Retro UI**: CRT shell, console log, badges, and chips for view controls.
- **GitHub Pages ready**: Vite build output in `dist/`; existing CI workflow can deploy it.

## Usage (deployed site)

1. Open the site; you land on the hub.
2. Click **MS-DOS** to launch the DOS player.
3. Load a `.zip` via button or drag & drop. The startup command auto-fills from the first EXE/BAT/COM; override if needed (default `dir`).
4. Hit **Start**. Use **Reset** to stop (ZIP stays in memory), **Big view** for the floating overlay, or **Fullscreen**.
5. Use **← Back to hub** to return to the emulator list.

> Everything stays local. The app never uploads your archives.

## Local development

```bash
npm install
npm run dev
```

The dev server runs on Vite (typically `http://localhost:5173`). Emulator scripts load from CDN.

## Build

```bash
npm run build
```

Outputs static assets to `dist/`.

## Deployment (GitHub Pages)

- Every push to `main` runs the GitHub Actions workflow at `.github/workflows/deploy.yml`.
- Steps: checkout → install → build (`npm run build`) → upload `dist/` as the Pages artifact → deploy to GitHub Pages.
- The site is served from the repository root’s `dist/` output (no `docs/` folder needed).

## Legal notice

- This repository ships only the web app and emulator integration; **no games or ROMs are included**.
- You must provide your own legally obtained game files and comply with applicable copyright laws.

## Emulator

- Library: **js-dos** (WebAssembly build) loaded from the official CDN.
- See the official js-dos documentation for API details and licensing (js-dos is GPL-licensed). No modifications to the emulator are included here.
