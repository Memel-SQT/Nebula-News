// Electron main process for the Nebula News desktop build.
//
// There's no separate backend to deploy: this spawns the Next.js
// `output: "standalone"` server (built by `npm run build`) as a child
// process on a free local port, points it at a per-user SQLite file, waits
// for it to come up, then opens a BrowserWindow on it. Closing the window
// kills the server. See scripts/prepare-desktop-build.mjs for how the
// standalone bundle gets assembled, and README.md for the full build flow.
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");
const { spawn } = require("node:child_process");

const INGEST_INTERVAL_MS = 3 * 3600 * 1000;

app.setName("Nebula News");

let serverProcess = null;
let mainWindow = null;
let ingestTimer = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Nebula News server did not start within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

/** Copies the pre-seeded (schema + sources, zero articles) template DB into
 *  the user's app-data folder on first launch. Later launches reuse it as-is
 *  so the user's ingested articles/favorites persist across updates. */
function ensureDatabase(userDataDir) {
  const dbPath = path.join(userDataDir, "nebula-news.db");
  if (!fs.existsSync(dbPath)) {
    const templatePath = app.isPackaged
      ? path.join(process.resourcesPath, "template.db")
      : path.join(__dirname, "..", "prisma", "template.db");
    fs.copyFileSync(templatePath, dbPath);
  }
  return dbPath;
}

async function startServer() {
  const userDataDir = app.getPath("userData");
  fs.mkdirSync(userDataDir, { recursive: true });
  const dbPath = ensureDatabase(userDataDir);

  const port = await getFreePort();
  const serverEntry = app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");

  // A deliberately narrow env (not a spread of process.env) so the server's
  // behavior doesn't depend on whatever happens to be in the launching
  // shell, and it never picks up a stray project .env (e.g. INGEST_SECRET)
  // from an ambient cwd — this server only ever binds to 127.0.0.1, so
  // /api/ingest is meant to be open to the Electron main process's own
  // scheduler without a secret.
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.dirname(serverEntry),
    env: {
      PATH: process.env.PATH,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${dbPath}`,
    },
    stdio: "inherit",
    windowsHide: true,
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Nebula News server exited with code ${code}`);
    }
  });

  await waitForServer(port);
  return port;
}

/** Hits the server's own /api/ingest (unauthenticated here since it only
 *  ever binds to 127.0.0.1) — same endpoint Vercel Cron hits for the
 *  hosted-web deployment, just triggered by a plain interval timer instead
 *  since there's no cron infrastructure inside a desktop app. */
function scheduleIngestion(port) {
  const tick = () => {
    http
      .get(`http://127.0.0.1:${port}/api/ingest`, (res) => {
        res.resume();
        console.log(`[ingest] triggered, status ${res.statusCode}`);
      })
      .on("error", (err) => console.error("[ingest] request failed", err));
  };

  setTimeout(tick, 5_000);
  ingestTimer = setInterval(tick, INGEST_INTERVAL_MS);
}

async function createWindow() {
  const port = await startServer();
  scheduleIngestion(port);

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: "#0A0A0F",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Keep external links (original article URLs) in the user's real browser
  // instead of navigating the app window away from Nebula News.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (ingestTimer) clearInterval(ingestTimer);
  if (serverProcess) serverProcess.kill();
});

app.whenReady().then(createWindow);
