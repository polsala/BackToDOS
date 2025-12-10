import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";

const WDOSBOX_URL = "https://js-dos.com/6.22/current/wdosbox.js";
const STARTUP_KEY = "dos-startup-command";
const getFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.msFullscreenElement ||
  document.mozFullScreenElement;

const EMULATORS = [
  {
    id: "dos",
    name: "MS-DOS",
    status: "Ready",
    description: "Run classic PC titles in-browser via js-dos. Drop a ZIP and boot instantly.",
    tags: ["PC", "WASM", "DOS"],
    component: DosEmulator,
  },
  {
    id: "gba",
    name: "Game Boy Advance",
    status: "WIP",
    description: "WIP: WebAssembly build with save states and fast-forward.",
    tags: ["Nintendo", "GBA"],
  },
  {
    id: "nes",
    name: "NES / Famicom",
    status: "WIP",
    description: "8-bit nostalgia with shader presets and CRT vibes.",
    tags: ["Nintendo", "8-bit"],
  },
  {
    id: "snes",
    name: "SNES",
    status: "WIP",
    description: "Super Nintendo core with planned rewind and pixel-perfect scaling.",
    tags: ["Nintendo", "16-bit"],
  },
  {
    id: "psx",
    name: "PlayStation",
    status: "WIP",
    description: "PS1 classics with texture filtering and dual-shock mapping.",
    tags: ["Sony", "32-bit"],
  },
  {
    id: "n64",
    name: "Nintendo 64",
    status: "WIP",
    description: "Early 3D gems with planned Rumble Pak support.",
    tags: ["Nintendo", "3D"],
  },
];

function App() {
  const [activeId, setActiveId] = useState(null);
  const active = EMULATORS.find((emu) => emu.id === activeId);

  if (active?.component) {
    const Component = active.component;
    return <Component onBack={() => setActiveId(null)} />;
  }

  if (active) {
    return <ComingSoon emulator={active} onBack={() => setActiveId(null)} />;
  }

  return <Hub emulators={EMULATORS} onSelect={setActiveId} />;
}

function Hub({ emulators, onSelect }) {
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Retro WASM Deck</p>
          <h1>Pick Your Emulator</h1>
          <p className="subtitle">Client-side emulation hub. Drop ROMs, boot instantly, no uploads.</p>
          <div className="hero-actions">
            <span className="pill pill-ready">Ready</span>
            <span className="pill pill-wip">WIP</span>
            <span className="pill pill-beta">More soon</span>
          </div>
        </div>
        <div className="hero-badge">
          <span className="dot" />
          <span>All local. No backend.</span>
        </div>
      </header>

      <main className="hub-grid">
        {emulators.map((emu) => (
          <button
            key={emu.id}
            className={`emu-card ${emu.status === "Ready" ? "ready" : "wip"}`}
            onClick={() => onSelect(emu.id)}
          >
            <div className="card-top">
              <span className={`pill ${emu.status === "Ready" ? "pill-ready" : "pill-wip"}`}>{emu.status}</span>
              <div className="tag-row">
                {emu.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <h3>{emu.name}</h3>
            <p className="muted">{emu.description}</p>
            <div className="card-footer">
              <span className="cta">{emu.component ? "Launch" : "Soon"}</span>
              <span className="caret">→</span>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}

function ComingSoon({ emulator, onBack }) {
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">WIP</p>
          <h1>{emulator.name}</h1>
          <p className="subtitle">{emulator.description}</p>
          <div className="hero-actions">
            <span className="pill pill-wip">In progress</span>
            <div className="tag-row">
              {emulator.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-badge">
          <span className="dot" />
          <span>Coming soon</span>
        </div>
      </header>

      <main className="hub-grid">
        <div className="wip-panel">
          <h3>We’re wiring this emulator up.</h3>
          <p className="muted">
            Core integration, controller mappings, and save-state plumbing are in progress. Check back soon or hop to
            another emulator.
          </p>
          <div className="button-row">
            <button className="primary" onClick={onBack}>Back to hub</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function DosEmulator({ onBack }) {
  const [command, setCommand] = useState("dir");
  const [zipMeta, setZipMeta] = useState(null); // { name, sizeKb }
  const [logs, setLogs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [booted, setBooted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [escLocked, setEscLocked] = useState(false);

  const bufferRef = useRef(null); // holds ArrayBuffer of loaded ZIP
  const dosRef = useRef(null); // js-dos instance
  const shellRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const addLog = useCallback((message, type = "info") => {
    const entry = { message, type, time: new Date() };
    setLogs((prev) => [entry, ...prev].slice(0, 120)); // keep log short
  }, []);

  const formatTime = (time) =>
    time.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  useEffect(() => {
    const saved = localStorage.getItem(STARTUP_KEY);
    if (saved) setCommand(saved);
    addLog("Ready. Drop a MS-DOS game ZIP or click Load.", "info");
  }, [addLog]);

  const resizeDisplay = useCallback(
    (opts = {}) => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;

      // Avoid resetting the WebGL context while running; only set canvas dimensions before boot
      if (!booted || opts.forceCanvasResize) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
      }

      // Ensure all layers fill the container
      const applySize = (el) => {
        if (!el) return;
        el.style.width = "100%";
        el.style.height = "100%";
      };

      applySize(canvas);
      const dosWrapper = container.querySelector(".dosbox-container");
      applySize(dosWrapper);
      applySize(dosWrapper?.querySelector("canvas"));
    },
    [booted]
  );

  const lockEscapeKey = useCallback(() => {
    if (!navigator.keyboard?.lock) {
      setEscLocked(false);
      return;
    }
    navigator.keyboard
      .lock(["Escape"])
      .then(() => setEscLocked(true))
      .catch(() => setEscLocked(false));
  }, []);

  const unlockEscapeKey = useCallback(() => {
    if (navigator.keyboard?.unlock) {
      navigator.keyboard.unlock();
    }
    setEscLocked(false);
  }, []);

  useEffect(() => {
    resizeDisplay({ forceCanvasResize: !booted });
    const observer = new ResizeObserver(() => resizeDisplay());
    if (containerRef.current) observer.observe(containerRef.current);
    if (shellRef.current) observer.observe(shellRef.current);
    window.addEventListener("resize", resizeDisplay);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeDisplay);
    };
  }, [resizeDisplay, booted]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => resizeDisplay());
    const timeout = setTimeout(() => resizeDisplay(), 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [showModal, resizeDisplay]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const target = shellRef.current;
      const active = !!target && getFullscreenElement() === target;
      setIsFullscreen(active);
      requestAnimationFrame(() => resizeDisplay());
      if (active) {
        lockEscapeKey();
      } else {
        unlockEscapeKey();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [resizeDisplay, lockEscapeKey, unlockEscapeKey]);

  useEffect(() => {
    const handleEscapeOverride = (e) => {
      if (e.key === "Escape" && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const exit =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;
        if (exit) exit.call(document);
        unlockEscapeKey();
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleEscapeOverride, true);
    return () => window.removeEventListener("keydown", handleEscapeOverride, true);
  }, [unlockEscapeKey]);

  useEffect(() => () => unlockEscapeKey(), [unlockEscapeKey]);

  const validateFile = (file) => {
    if (!file) return false;
    const isZip =
      file.name.toLowerCase().endsWith(".zip") ||
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";
    if (!isZip) {
      addLog("Only .zip files are supported. Please provide a MS-DOS game archive.", "error");
      return false;
    }
    return true;
  };

  const readZip = (file) => {
    if (!validateFile(file)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      bufferRef.current = e.target.result;
      setZipMeta({ name: file.name, sizeKb: Math.round(file.size / 1024) });
      addLog(`ZIP "${file.name}" loaded (${Math.round(file.size / 1024)} KB).`, "ok");
      autoDetectCommand(bufferRef.current);
    };
    reader.onerror = () => addLog("Could not read the file. Please try again.", "error");
    reader.readAsArrayBuffer(file);
  };

  const scoreExecutable = (path) => {
    const lower = path.toLowerCase();
    const ext = lower.split(".").pop();
    const extPriority = { exe: 0, bat: 1, com: 2 }[ext] ?? 9;
    const keywords = ["start", "run", "play", "game", "dos"];
    const keywordHit = keywords.some((k) => lower.includes(k)) ? 0 : 1;
    const depth = (path.match(/\//g) || []).length;
    // Prefer executables closer to the root to avoid picking nested launchers by default
    return [depth, extPriority, keywordHit, path.length];
  };

  const autoDetectCommand = async (arrayBuffer) => {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const executables = [];
      zip.forEach((relativePath, file) => {
        if (file.dir) return;
        const lower = relativePath.toLowerCase();
        if (/\.(exe|bat|com)$/.test(lower)) {
          executables.push(relativePath);
        }
      });
      if (executables.length === 0) {
        addLog("No executable found in ZIP; defaulting to `dir`.", "info");
        setCommand("dir");
        return;
      }
      executables.sort((a, b) => {
        const [ea1, ea2, ea3, ea4] = scoreExecutable(a);
        const [eb1, eb2, eb3, eb4] = scoreExecutable(b);
        return ea1 - eb1 || ea2 - eb2 || ea3 - eb3 || ea4 - eb4 || a.localeCompare(b);
      });
      const selected = executables[0];
      setCommand(selected);
      localStorage.setItem(STARTUP_KEY, selected);
      addLog(`Startup command auto-set to "${selected}".`, "ok");
    } catch (err) {
      addLog(`Could not inspect ZIP for executables; using "dir". (${err?.message || err})`, "error");
      setCommand("dir");
      localStorage.setItem(STARTUP_KEY, "dir");
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) readZip(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) readZip(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const initDosInstance = () => {
    if (!window.Dos) {
      addLog("Emulator script not loaded yet. Please wait a second and try again.", "error");
      return null;
    }
    // dispose previous instance
    if (dosRef.current && typeof dosRef.current.exit === "function") {
      try {
        dosRef.current.exit();
      } catch (err) {
        addLog("Previous emulator instance could not be closed cleanly.", "error");
      }
    }
    if (!canvasRef.current || !containerRef.current) {
      addLog("Display canvas not ready yet.", "error");
      return null;
    }

    // js-dos requires a <canvas>; ensure we clear previous pixels before reusing it
    resizeDisplay({ forceCanvasResize: true });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    dosRef.current = window.Dos(canvas, { wdosboxUrl: WDOSBOX_URL });
    return dosRef.current;
  };

  const stopEmulator = (message = "Emulator stopped. Press Start to run again.") => {
    if (dosRef.current && typeof dosRef.current.exit === "function") {
      try {
        dosRef.current.exit();
      } catch (err) {
        addLog("Could not stop previous emulator cleanly.", "error");
      }
    }
    dosRef.current = null;
    setBooted(false);
    if (document.fullscreenElement === shellRef.current || document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    }

    // Remove js-dos wrapper/overlay and clear the canvas
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container && canvas) {
      const wrapper = container.querySelector(".dosbox-container");
      if (wrapper) wrapper.remove();
      if (!container.contains(canvas)) container.prepend(canvas);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reset canvas sizing to match the container for the next boot
      resizeDisplay({ forceCanvasResize: true });
    }

    if (message) addLog(message, "info");
  };

  const startEmulator = () => {
    if (!bufferRef.current) {
      addLog("No game ZIP loaded. Load one before starting.", "error");
      return;
    }

    resizeDisplay({ forceCanvasResize: true });

    const cmd = (command || "dir").trim();
    localStorage.setItem(STARTUP_KEY, cmd);

    const instance = initDosInstance();
    if (!instance) return;

    instance
      .ready((fs, main) => {
        // js-dos expects a URL for extraction; use an object URL for the in-memory ZIP
        const zipUrl = URL.createObjectURL(new Blob([bufferRef.current], { type: "application/zip" }));
        return fs
          .extract(zipUrl)
          .then(() => {
            addLog("Game ZIP extracted. Booting...", "ok");
            return main(["-c", "mount c .", "-c", "c:", "-c", cmd || "dir"]);
          })
          .then(() => {
            setBooted(true);
            requestAnimationFrame(() => resizeDisplay());
            addLog(`Emulator started with command: ${cmd || "dir"}.`, "ok");
          })
          .finally(() => URL.revokeObjectURL(zipUrl));
      })
      .catch((err) => addLog(`Emulator failed to start: ${err?.message || err}`, "error"));
  };

  const resetEmulator = () => {
    stopEmulator("Emulator reset. Loaded ZIP kept in memory; press Start to run again.");
  };

  const toggleFullscreen = () => {
    const el = shellRef.current || containerRef.current;
    if (!el) return;
    const fsEl = getFullscreenElement();
    const isFs = fsEl === el;
    if (isFs) {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => Promise.resolve()))().catch((err) =>
        addLog(`Could not exit fullscreen: ${err?.message || err}`, "error")
      );
      return;
    }
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;
    if (!req) {
      addLog("Fullscreen API not available in this browser.", "error");
      return;
    }
    Promise.resolve(req.call(el))
      .then(() => lockEscapeKey())
      .catch((err) => addLog(`Fullscreen not available: ${err?.message || err}`, "error"));
  };

  const handleBack = () => {
    stopEmulator(null);
    setShowModal(false);
    onBack();
  };

  return (
    <div className="page">
      {showModal && <div className="modal-backdrop-lite" onClick={() => setShowModal(false)} />}
      <header className="hero">
        <div>
          <p className="eyebrow">Retro WASM Lab</p>
          <h1>MS-DOS Web Player</h1>
          <p className="subtitle">Play your own MS-DOS games in-browser. No uploads, no backend.</p>
          <div className="hero-actions">
            <button className="ghost" onClick={handleBack}>← Back to hub</button>
          </div>
        </div>
        <div className="hero-badge">
          <span className="dot" />
          <span>Client-side only</span>
        </div>
      </header>

      <main className="grid">
        <section className="panel emulator-panel">
          <div className="panel-header">
            <div>
              <p className="label">Emulator</p>
              <p className="title">CRT View</p>
            </div>
            <div className="header-right">
              <div className="view-actions">
                <button
                  className={`chip-btn ${showModal ? "active" : ""}`}
                  onClick={() => setShowModal((v) => !v)}
                  title={showModal ? "Close big view" : "Open big view"}
                  aria-label={showModal ? "Close big view" : "Open big view"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7H7v2H5v2h2v2h2v2h2v-2h2V9h-2V7H9v2Zm6 8v2h2v-2Z" />
                  </svg>
                  <span>{showModal ? "Close big view" : "Big view"}</span>
                </button>
                <button className="chip-btn" onClick={toggleFullscreen} title="Fullscreen" aria-label="Fullscreen">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5H5v3H3V3h5v2Zm11 3h-3V5h3V3h2v5h-2Zm-3 11h3v-3h2v5h-5v-2ZM5 16h3v3h2v2H5v-5h2Z" />
                  </svg>
                  <span>Fullscreen</span>
                </button>
              </div>
              <div className="esc-hint" aria-live="polite">
                Esc goes to the game. Use Shift+Esc to exit view.
              </div>
              <div className="mini-leds">
                <span className="led green" />
                <span className="led amber" />
              </div>
            </div>
          </div>
          <div className={`crt-shell ${showModal ? "floating" : ""} ${isFullscreen ? "fullscreen-mode" : ""}`} ref={shellRef}>
            <div className="crt-overlay" />
            <div
              className={`crt-inner ${showModal ? "expanded" : ""} ${isFullscreen ? "fullscreen-active" : ""}`}
              ref={containerRef}
            >
              <canvas ref={canvasRef} className="crt-canvas" />
              <div className={`crt-placeholder ${booted ? "hidden" : ""}`}>
                <p>Load a game ZIP to boot MS-DOS</p>
              </div>
            </div>
            {showModal && (
              <div className="floating-controls">
                <button onClick={() => setShowModal(false)}>Close big view</button>
                <button onClick={toggleFullscreen}>Fullscreen</button>
              </div>
            )}
          </div>
        </section>

        <section className="panel control-panel">
          <div className="panel-header">
            <div>
              <p className="label">Control Desk</p>
              <p className="title">Load & Launch</p>
            </div>
            <button className="ghost" onClick={() => addLog("Log snapshot saved.", "info")}>
              Snapshot
            </button>
          </div>

          <div className="controls">
            <div className="button-row">
              <button className="primary" onClick={() => fileInputRef.current?.click()}>Load game (.zip)</button>
              <input ref={fileInputRef} hidden type="file" accept=".zip" onChange={handleFileInput} />
              <button onClick={startEmulator}>Start</button>
              <button onClick={resetEmulator}>Reset</button>
            </div>

            <label className="input-label" htmlFor="command-input">
              Startup command (e.g. GAME.EXE)
            </label>
            <input
              id="command-input"
              className="command-input"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="dir"
            />

            <div
              className={`drop-zone ${dragActive ? "active" : ""}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p>Drag & drop your MS-DOS game here (ZIP)</p>
              <p className="muted">Nothing is uploaded. Everything runs locally.</p>
            </div>

            <div className="meta">
              <p className="muted">Status</p>
              <p className="status">
                {zipMeta ? (
                  <>
                    <span className="dot green" /> ZIP loaded: {zipMeta.name} ({zipMeta.sizeKb} KB)
                  </>
                ) : (
                  <>
                    <span className="dot gray" /> No game loaded
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="panel log-panel">
          <div className="panel-header">
            <div>
              <p className="label">Console</p>
              <p className="title">Status & Log</p>
            </div>
            <div className="button-row">
              <button className="ghost" onClick={() => setLogs([])}>Clear</button>
            </div>
          </div>
          <div className="log">
            {logs.length === 0 && <p className="muted">Idle. Waiting for actions...</p>}
            {logs.map((entry, idx) => (
              <div key={idx} className={`log-line ${entry.type}`}>
                <span className="time">{formatTime(entry.time)}</span>
                <span className="text">{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
