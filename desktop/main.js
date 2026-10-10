// Electron main process for the Nebula News desktop build.
//
// There's no separate backend to deploy: this spawns the Next.js
// `output: "standalone"` server (built by `npm run build`) as a child
// process on a free local port, points it at a per-user SQLite file, waits
// for it to come up, then opens a BrowserWindow on it. Closing the window
// kills the server. See scripts/prepare-desktop-build.mjs for how the
// standalone bundle gets assembled, and README.md for the full build flow.
//
// Nebula Hub (optional, desktop/nebula.js): the "Top stories" and theme
// widgets, the "briefing ready" notification, the Nebula appearance, deep
// links and the Hub mode. Without the Hub nothing changes.
//
// The window has no native frame (as every app of the family): the page draws
// a drag strip and Windows draws the three controls, tinted to the theme of the
// appearance cookie (titleBarOverlay). The main process talks to the page only
// through cookies the server reads (appearance, Hub status, Hub mode) — there is
// no preload and no IPC.
const { app, BrowserWindow, nativeTheme, session, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { NebulaIntegration } = require("./nebula");
const { defaultAppearancePackDir, readAppearancePacks } = require("@nebula/link");
const {
  COOKIES,
  DETACH_PATH,
  chromeColors,
  externalTarget,
  hubAppearanceCookie,
  hubLanguage,
  hubPackTheme,
  packChrome,
  BACKGROUND_SWITCH,
  afterRelease,
  dockedWindowSteps,
  isDockPayload,
  quitWhenAllClosed,
  windowTarget,
  themeOfCookie,
} = require("./nebula-rules");

const INGEST_INTERVAL_MS = 3 * 3600 * 1000;
/** Height of the page's drag strip (.titlebar-drag) and of the window controls. */
const TITLE_BAR_HEIGHT = 36;

app.setName("Nebula News");

let serverProcess = null;
let mainWindow = null;
let ingestTimer = null;
let baseUrl = null;
let nebula = null;
/** Started by Nebula Hub to run without a window (ADR-034 of Nebula Hub). */
const BACKGROUND = process.argv.includes(BACKGROUND_SWITCH);
/** Connected to Nebula Hub right now: windows then open inside the Hub. */
let hubConnected = false;
/** The screen to show once the Hub has placed the window. */
let pendingRoute = null;

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
      NEBULA_APPEARANCE_PACKS_DIR: PACK_DIR,
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

/** GET a JSON route of the local server (the Hub's widget reads today's briefing this way). */
function getJson(route) {
  return new Promise((resolve, reject) => {
    if (!baseUrl) return reject(new Error("server not ready"));
    http
      .get(`${baseUrl}${route}`, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2_000_000) res.destroy(new Error("too large"));
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

/** Hits the server's own /api/ingest (unauthenticated here since it only
 *  ever binds to 127.0.0.1) — same endpoint Vercel Cron hits for the
 *  hosted-web deployment, just triggered by a plain interval timer instead
 *  since there's no cron infrastructure inside a desktop app. */
function scheduleIngestion(port) {
  const tick = () => {
    http
      .get(`http://127.0.0.1:${port}/api/ingest`, (res) => {
        // A new briefing: Nebula Hub's activity center hears about it (once a day).
        res.on("end", () => void nebula?.briefingMaybeReady());
        res.resume();
        console.log(`[ingest] triggered, status ${res.statusCode}`);
      })
      .on("error", (err) => console.error("[ingest] request failed", err));
  };

  setTimeout(tick, 5_000);
  ingestTimer = setInterval(tick, INGEST_INTERVAL_MS);
}

/** Only http(s) pages leave for the browser; nebula:// links go to Nebula Hub; nothing else opens. */
function openOutside(url) {
  const target = externalTarget(url);
  if (target === "browser") void shell.openExternal(url);
  if (target === "nebula") {
    // The protocol is registered by an installed Nebula Hub; without it, its download page.
    void shell.openExternal(
      app.getApplicationNameForProtocol("nebula://") ? url : "https://github.com/Memel-SQT/Nebula-Hub/releases",
    );
  }
}

/** The Nebula Hub mode: frameless window placed by the Hub (see openWindow). */
const dock = { docked: false, normalBounds: null, busy: Promise.resolve() };

/** The theme chosen in the appearance cookie, kept in step by the cookie listener. */
let windowTheme = "system";
/** The pack theme in use ("" = a built-in theme), from its cookie. */
let windowPackTheme = "";

/**
 * Appearance packs of installed Nebula apps (Nebula Hub NEBULA_LINK.md § 18): next to a test-mode
 * Hub's session file, or the family's shared folder. The local server reads the same folder.
 */
const PACK_DIR = process.env.NEBULA_LINK_SESSION_FILE
  ? path.join(path.dirname(process.env.NEBULA_LINK_SESSION_FILE), "appearance")
  : defaultAppearancePackDir();

/** The valid packs whose owner is installed (checked by @nebula/link); never throws. */
function packsNow() {
  try {
    return readAppearancePacks({ directory: PACK_DIR });
  } catch {
    return [];
  }
}
/** The last appearance Nebula Hub broadcast, applied again when "follow" is turned back on. */
let lastHubAppearance = null;

async function cookieValue(name) {
  if (!baseUrl) return undefined;
  const [cookie] = await session.defaultSession.cookies.get({ url: baseUrl, name }).catch(() => []);
  return cookie?.value;
}

/** A cookie for the local server (host-wide, so it survives the new port of the next launch). */
function setCookie(name, value) {
  if (!baseUrl) return Promise.resolve();
  return session.defaultSession.cookies
    .set({ url: baseUrl, name, value, path: "/", sameSite: "lax", expirationDate: Math.floor(Date.now() / 1000) + 31536000 })
    .catch(() => undefined);
}

function chrome() {
  return packChrome(packsNow(), windowPackTheme) ?? chromeColors(windowTheme, nativeTheme.shouldUseDarkColors);
}

/** Transparent overlay: the page's own background (and its animated glow) shows behind the controls. */
function titleBarOverlay() {
  return { color: "rgba(0, 0, 0, 0)", symbolColor: chrome().ink, height: TITLE_BAR_HEIGHT };
}

/** Keeps the native window controls in the current theme. */
function applyWindowTheme() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setBackgroundColor(chrome().page);
  if (!dock.docked) mainWindow.setTitleBarOverlay(titleBarOverlay());
}

/**
 * Nebula Hub broadcast its appearance: written 1:1 into the app's cookies (theme, accent,
 * background, motion, sounds and language) when "Follow Nebula Hub's appearance" is on, then
 * the page reloads — only if something actually changed.
 */
async function applyHubAppearance(appearance) {
  lastHubAppearance = appearance;
  if (!baseUrl || (await cookieValue(COOKIES.followHub)) === "0") return;
  let changed = false;
  // A pack theme installed here goes to its own cookie; the appearance cookie keeps its theme.
  const packTheme = hubPackTheme(appearance, packsNow());
  if (packTheme !== null && packTheme !== ((await cookieValue(COOKIES.packTheme)) ?? "")) {
    await setCookie(COOKIES.packTheme, packTheme);
    changed = true;
  }
  const kept = packTheme ? { ...appearance, theme: themeOfCookie(await cookieValue(COOKIES.appearance)) } : appearance;
  const value = hubAppearanceCookie(kept);
  if (value && value !== (await cookieValue(COOKIES.appearance))) {
    await setCookie(COOKIES.appearance, value);
    changed = true;
  }
  const language = hubLanguage(appearance);
  if (language && language !== (await cookieValue(COOKIES.locale))) {
    await setCookie(COOKIES.locale, language);
    changed = true;
  }
  if (changed) mainWindow?.webContents.reload();
}

/** The Hub status, for the sidebar card: a cookie for the next render, an event for this one. */
async function setHubStatus(status) {
  hubConnected = status === "connected";
  // Started by the Hub to feed the other apps: nothing left to do once the Hub is gone.
  if (!hubConnected && BACKGROUND && !(mainWindow && !mainWindow.isDestroyed() && !dock.docked)) {
    app.quit();
    return;
  }
  await setCookie(COOKIES.hubStatus, status === "connected" ? "connected" : "offline");
  if (mainWindow && !mainWindow.isDestroyed()) {
    void mainWindow.webContents.executeJavaScript("window.dispatchEvent(new Event('nebula-hub-status'))").catch(() => undefined);
  }
}

function watchCookies() {
  session.defaultSession.cookies.on("changed", (_event, cookie, _cause, removed) => {
    if (removed) return;
    if (cookie.name === COOKIES.appearance) {
      windowTheme = themeOfCookie(cookie.value);
      applyWindowTheme();
    }
    if (cookie.name === COOKIES.packTheme) {
      windowPackTheme = cookie.value;
      applyWindowTheme();
    }
    // Following the Hub again: its last appearance applies at once.
    if (cookie.name === COOKIES.followHub && cookie.value !== "0" && lastHubAppearance) {
      void applyHubAppearance(lastHubAppearance);
    }
  });
  nativeTheme.on("updated", applyWindowTheme);
}

function openWindow(options = {}) {
  const docked = options.docked === true;
  const window = new BrowserWindow({
    width: options.bounds?.width ?? 1320,
    height: options.bounds?.height ?? 880,
    ...(options.bounds ? { x: options.bounds.x, y: options.bounds.y } : {}),
    minWidth: docked ? 320 : 980,
    minHeight: docked ? 240 : 620,
    // Docked in Nebula Hub: exactly the Hub's area, no frame, no invisible resize border, off the
    // taskbar, and only the Hub moves or sizes it.
    ...(docked
      ? { frame: false, thickFrame: false, skipTaskbar: true, resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false }
      : { titleBarStyle: "hidden", titleBarOverlay: titleBarOverlay() }),
    show: false,
    backgroundColor: chrome().page,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once("ready-to-show", () => {
    if (docked) {
      window.showInactive();
      raiseDockedWindow(window);
    } else {
      window.show();
    }
  });

  // Keep external links (original article URLs) in the user's real browser
  // instead of navigating the app window away from Nebula News.
  window.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: "deny" };
  });
  // A plain link (no target) must not take the window away from the app either.
  window.webContents.on("will-navigate", (event, url) => {
    // "Detach" in the Hub mode band: back to the normal window, nothing is loaded.
    if (baseUrl && url === `${baseUrl}${DETACH_PATH}`) {
      event.preventDefault();
      void applyDock({ state: "released" });
      return;
    }
    if (baseUrl && (url === baseUrl || url.startsWith(`${baseUrl}/`))) return;
    event.preventDefault();
    openOutside(url);
  });
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(`${baseUrl}${options.route ?? "/"}`);
  mainWindow = window;
  return window;
}

/**
 * Shows Nebula News: inside the Hub when it is connected (Nebula Hub ADR-034), else its own
 * window. An older Hub that cannot place it gets the own window.
 */
async function showWindow(route) {
  if (windowTarget(hubConnected) === "hub") {
    if (dock.docked && mainWindow && !mainWindow.isDestroyed()) {
      if (route) void mainWindow.loadURL(`${baseUrl}${route}`);
      raiseDockedWindow(mainWindow);
    } else {
      pendingRoute = route ?? pendingRoute ?? "/";
    }
    if (await nebula.requestDock()) return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) {
    openWindow({ route: route ?? pendingRoute ?? "/" });
    pendingRoute = null;
    return;
  }
  if (route) void mainWindow.loadURL(`${baseUrl}${route}`);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function focusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    openWindow();
    return;
  }
  if (dock.docked) {
    // In the Hub mode the Hub decides where the window is; it only comes to the front.
    mainWindow.moveTop();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/** Opens a route of the app (deep link, intent): inside the Hub when it is there. */
function openRoute(route) {
  void showWindow(route);
}

/** Electron cannot remove the frame of an open window: it is recreated, the new one first. */
function replaceWindow(options) {
  const previous = mainWindow;
  let route = pendingRoute ?? "/";
  try {
    if (previous && !previous.isDestroyed()) route = new URL(previous.webContents.getURL()).pathname;
  } catch {
    route = pendingRoute ?? "/";
  }
  pendingRoute = null;
  openWindow({ ...options, route });
  if (previous && !previous.isDestroyed()) previous.destroy();
}

function applyDock(payload) {
  if (!isDockPayload(payload)) return dock.busy;
  dock.busy = dock.busy
    .then(async () => {
      if (payload.state === "released") return undock();
      if (!dock.docked) {
        dock.normalBounds = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
        dock.docked = true;
        // The new page renders the Hub mode band ("Detach") from this cookie.
        await setCookie(COOKIES.docked, "1");
        replaceWindow({ docked: true, bounds: payload.bounds });
      }
      const window = mainWindow;
      if (!window || window.isDestroyed()) return undefined;
      if (!payload.visible) return window.hide();
      const steps = dockedWindowSteps(window.isVisible(), payload.raise);
      window.setBounds(payload.bounds);
      if (steps.show) window.showInactive();
      if (steps.raise) raiseDockedWindow(window);
      return undefined;
    })
    .catch(() => undefined);
  return dock.busy;
}

/**
 * Brings the docked window above the Hub without taking the focus. Windows ignores moveTop() from
 * an app without the foreground right, which is the case as soon as the Hub is active; a brief
 * always-on-top is allowed and leaves the window just above the Hub (Nebula Hub ADR-032).
 */
function raiseDockedWindow(window) {
  window.setAlwaysOnTop(true);
  window.moveTop();
  window.setAlwaysOnTop(false);
}

async function undock() {
  if (!dock.docked) return;
  dock.docked = false;
  await setCookie(COOKIES.docked, "0");
  const next = afterRelease({ hubConnected, background: BACKGROUND });
  if (next === "quit") {
    app.quit();
    return;
  }
  if (next === "background") {
    // Still an extension of the apps: no window, the server and Link keep running.
    const previous = mainWindow;
    mainWindow = null;
    if (previous && !previous.isDestroyed()) previous.destroy();
    return;
  }
  replaceWindow({ docked: false, bounds: dock.normalBounds ?? undefined });
  focusWindow();
}

async function createWindow() {
  const port = await startServer();
  baseUrl = `http://127.0.0.1:${port}`;
  scheduleIngestion(port);

  // A fresh start is never docked and the Hub is not connected yet (the cookies of the last
  // session would say otherwise); the window opens in the theme the user chose.
  await setCookie(COOKIES.docked, "0");
  await setCookie(COOKIES.hubStatus, "offline");
  windowTheme = themeOfCookie(await cookieValue(COOKIES.appearance));
  windowPackTheme = (await cookieValue(COOKIES.packTheme)) ?? "";
  watchCookies();

  nebula = new NebulaIntegration({
    appVersion: app.getVersion(),
    // Packaged: copied to resources\ by electron-builder, where Nebula Hub reads it too.
    manifestPath: app.isPackaged
      ? path.join(process.resourcesPath, "nebula.app.json")
      : path.join(__dirname, "..", "nebula.app.json"),
    settingsPath: path.join(app.getPath("userData"), "nebula-hub.json"),
    briefing: () => getJson("/api/briefing/today"),
    articles: (themeKey) => getJson(`/api/articles?theme=${encodeURIComponent(themeKey)}&pageSize=20`),
    language: () => (app.getLocale().startsWith("en") ? "en" : "fr"),
    openRoute,
    onAppearance: (appearance) => void applyHubAppearance(appearance),
    onHubStatus: (status) => void setHubStatus(status),
    onDock: (payload) => void applyDock(payload),
  });

  // Started by a deep link (`--nebula-intent`): that screen. Started by the Hub in the background:
  // no window at all. Otherwise: inside the Hub when it is there, else the normal window.
  const route = nebula.routeOfArgv(process.argv);
  const status = await nebula.start().catch(() => "offline");
  hubConnected = status === "connected";
  if (BACKGROUND && !route) return;
  await showWindow(route ?? "/");
}

// One instance: a second launch (or a deep link) goes to the running one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    // Opening Nebula News again (Start menu, desktop, deep link): inside the Hub when it is there.
    if (!nebula) return;
    void showWindow(nebula.routeOfArgv(argv) ?? undefined);
  });

  app.on("window-all-closed", () => {
    if (process.platform === "darwin") return;
    if (quitWhenAllClosed({ hubConnected, background: BACKGROUND })) app.quit();
  });

  app.on("before-quit", () => {
    nebula?.dispose();
    if (ingestTimer) clearInterval(ingestTimer);
    if (serverProcess) serverProcess.kill();
  });

  app.whenReady().then(createWindow);
}
