// Nebula Hub integration through Nebula Link (optional). Without the Hub the SDK stays offline
// without error and Nebula News works exactly as before.
//
// Shared (public only): the first three stories of today's briefing for the Hub's Home widget,
// and "your briefing is ready" once a day. Received: the Nebula language (applied only when it
// changes, so the app's own toggle keeps working), the Hub mode placement, and deep links /
// intents (open the app, open the briefing — Nebula Clock's long breaks can offer it).
const fs = require("node:fs");
const path = require("node:path");
const { NebulaLink } = require("@nebula/link");
const { headlinesWidget, briefingReadyNotification, languageToApply } = require("./nebula-rules");

const ROUTES = { "/": "/", "/briefing": "/briefing" };

class NebulaIntegration {
  constructor(deps) {
    this.deps = deps;
    this.settings = { lastHubLanguage: null, lastBriefingNotified: null };
    this.hubLanguage = null;
    // NEBULA_LINK_SESSION_FILE points a manual test at a test-mode Hub; never set when installed.
    this.link = NebulaLink.create({
      appId: "nebula.news",
      appVersion: deps.appVersion,
      manifestPath: deps.manifestPath,
      sessionFile: process.env.NEBULA_LINK_SESSION_FILE || undefined,
    });
  }

  async start() {
    this.loadSettings();
    this.link.on("nebula.appearance.changed", (appearance) => {
      if (appearance?.language === "fr" || appearance?.language === "en") this.hubLanguage = appearance.language;
      const language = languageToApply(appearance, this.settings.lastHubLanguage);
      if (!language) return;
      this.settings.lastHubLanguage = language;
      this.saveSettings();
      this.deps.applyLanguage(language);
    });
    this.link.on("nebula.hub.dock", (payload) => this.deps.onDock(payload));
    this.link.onStatus((status) => {
      // Never stay frameless and placed for a Hub that is gone.
      if (status === "offline") this.deps.onDock({ state: "released" });
      if (status === "connected") void this.briefingMaybeReady();
    });
    this.link.onIntent((intent) => {
      const route = ROUTES[intent.path];
      if (route) this.deps.openRoute(route);
    });
    this.link.provide("news.headlines.today", async () => {
      const briefing = await this.deps.briefing().catch(() => null);
      return briefing ? headlinesWidget(briefing, this.language(), new Date()) : null;
    });
    await this.link.connect();
  }

  dispose() {
    this.link.dispose();
  }

  /** The Hub's language when known, else the system's. */
  language() {
    return this.hubLanguage ?? this.deps.language();
  }

  /** The route a `--nebula-intent` argument asks for, if it is one of ours. */
  routeOfArgv(argv) {
    const intent = NebulaLink.intentFromArgv(argv, this.link.manifest);
    return intent ? ROUTES[intent.path] ?? null : null;
  }

  /** After an ingestion: announces today's briefing to the Hub, once a day. */
  async briefingMaybeReady() {
    if (this.link.status !== "connected") return;
    const briefing = await this.deps.briefing().catch(() => null);
    const notification = briefingReadyNotification(briefing, this.language(), this.settings.lastBriefingNotified);
    if (!notification) return;
    const result = await this.link.notify(notification);
    if (result.ok) {
      this.settings.lastBriefingNotified = briefing.date;
      this.saveSettings();
    }
  }

  loadSettings() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.deps.settingsPath, "utf8"));
      this.settings = {
        lastHubLanguage: parsed.lastHubLanguage === "fr" || parsed.lastHubLanguage === "en" ? parsed.lastHubLanguage : null,
        lastBriefingNotified: typeof parsed.lastBriefingNotified === "string" ? parsed.lastBriefingNotified : null,
      };
    } catch {
      // First run, or an unreadable file: defaults.
    }
  }

  saveSettings() {
    try {
      fs.mkdirSync(path.dirname(this.deps.settingsPath), { recursive: true });
      fs.writeFileSync(this.deps.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch {
      // A preference that cannot be saved never breaks the app.
    }
  }
}

module.exports = { NebulaIntegration };
