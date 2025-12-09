# MS-DOS Web Player (React + Vite, GitHub Pages Ready)

A retro-styled, client-side MS-DOS game runner built with React and Vite. Load your own `.zip` archive, boot it instantly in the browser via a WebAssembly-powered js-dos emulator, and deploy automatically to GitHub Pages on every push to `main`.

## What’s inside

- **Zero backend**: everything runs locally in the browser; your files never leave your machine.
- **js-dos (WASM)** from CDN for MS-DOS emulation.
- **Drag & drop + file picker** for `.zip` game archives with auto-detected startup command.
- **Start/Reset/Fullscreen controls**, startup command input (remembered via `localStorage`).
- **Retro UI** with CRT-inspired display and console log.
- **GitHub Actions** workflow to build with Vite and deploy the `dist/` output to GitHub Pages automatically.

## Usage (deployed site)

1. Open the GitHub Pages site.
2. Click **“Load game (.zip)”** or drag & drop your MS-DOS game ZIP.
3. The startup command auto-fills from the first executable found (EXE/BAT/COM); you can override it (e.g., `GAME.EXE`), default is `dir`.
4. Click **Start** to launch the emulator.
5. Use **Reset** (keeps the loaded ZIP in memory) or **Fullscreen** as needed.

> Everything stays local. The app never uploads your archives.

## Local development

```bash
npm install
npm run dev
```

The dev server runs on Vite (typically `http://localhost:5173`). The emulator script is loaded via CDN.

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
