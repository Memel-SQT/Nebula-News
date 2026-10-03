"use client";

import type { CSSProperties } from "react";
import { ACCENT_PRESETS, BACKGROUNDS, DEFAULT_APPEARANCE, MOTIONS, type BackgroundEffect } from "@/lib/nebula-design/appearance";
import { Icon, type IconName } from "@/lib/nebula-design/Icon";
import { playSound } from "@/lib/nebula-design/sound";
import { THEMES, isGlassTheme } from "@/lib/nebula-design/theme";
import { useI18n } from "@/lib/i18n/client";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import type { Locale } from "@/types";

// Ported from Nebula Hub 05204fd (src/renderer/screens/SettingsScreen.tsx, appearance part):
// same controls, same order, same sounds, same labels. Every change applies at once, with no
// Save button.

const BACKGROUND_ICONS: Record<BackgroundEffect, IconName> = {
  glow: "sparkles",
  aurora: "droplet",
  stars: "moon",
  particles: "layers",
  waves: "bolt",
  none: "close",
};

const LANGUAGE_LABELS: Record<Locale, string> = { fr: "Français", en: "English" };

export function SettingsPanel() {
  const { t, locale, setLocale } = useI18n();
  const { appearance, resolvedTheme, setAppearance, desktop, hubConnected, followHub, setFollowHub } = useAppearance();
  // Following a connected Hub: its appearance wins, the local controls wait.
  const followed = desktop && followHub && hubConnected;

  return (
    <div className="settings-panel nebula-surface">
      <div className="settings-section">
        <h2><Icon name="palette" size={15} />{t("settings.appearance")}</h2>
        {followed ? (
          <small className="path-note settings-hint"><Icon name="orbit" size={14} />{t("settings.followedHint")}</small>
        ) : null}
        <fieldset className="appearance-fields" disabled={followed}>
          <p className="settings-label" id="settings-theme-label">{t("settings.theme")}</p>
          <div className="segmented" role="radiogroup" aria-labelledby="settings-theme-label">
            {THEMES.map((theme) => (
              <button key={theme} type="button" role="radio" aria-checked={appearance.theme === theme} className={appearance.theme === theme ? "active" : ""} data-sound="toggle" onClick={() => setAppearance({ theme })}>
                {t(`appearance.theme.${theme}`)}
              </button>
            ))}
          </div>
          {isGlassTheme(resolvedTheme) && appearance.background !== "aurora" ? (
            <small className="path-note settings-hint"><Icon name="info" size={14} />{t("settings.glassHint")}</small>
          ) : null}

          <p className="settings-label" id="settings-language-label">{t("settings.language")}</p>
          <div className="segmented" role="radiogroup" aria-labelledby="settings-language-label">
            {(Object.keys(LANGUAGE_LABELS) as Locale[]).map((language) => (
              <button key={language} type="button" role="radio" lang={language} aria-checked={locale === language} className={locale === language ? "active" : ""} data-sound="toggle" onClick={() => language !== locale && setLocale(language)}>
                {LANGUAGE_LABELS[language]}
              </button>
            ))}
          </div>

          <p className="settings-label" id="settings-accent-label">{t("settings.accent")}</p>
          <div className="swatch-row" role="radiogroup" aria-labelledby="settings-accent-label">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={appearance.accentPreset === preset.id}
                className={`swatch ${appearance.accentPreset === preset.id ? "active" : ""}`}
                style={{ "--swatch-a": preset.secondary, "--swatch-b": preset.primary } as CSSProperties}
                onClick={() => setAppearance({ accentPreset: preset.id })}
                data-sound="toggle"
              >
                <i aria-hidden="true" />
                <span>{t(`appearance.accent.${preset.id}`)}</span>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={appearance.accentPreset === "custom"}
              className={`swatch ${appearance.accentPreset === "custom" ? "active" : ""}`}
              style={{ "--swatch-a": appearance.customSecondary, "--swatch-b": appearance.customPrimary } as CSSProperties}
              onClick={() => setAppearance({ accentPreset: "custom" })}
              data-sound="toggle"
            >
              <i aria-hidden="true" />
              <span>{t("appearance.accent.custom")}</span>
            </button>
          </div>
          {appearance.accentPreset === "custom" ? (
            <div className="settings-fields color-fields">
              <label className="color-field">
                <input type="color" value={appearance.customPrimary} onChange={(event) => setAppearance({ customPrimary: event.target.value })} />
                {t("settings.accentPrimary")}
              </label>
              <label className="color-field">
                <input type="color" value={appearance.customSecondary} onChange={(event) => setAppearance({ customSecondary: event.target.value })} />
                {t("settings.accentSecondary")}
              </label>
            </div>
          ) : null}
        </fieldset>
      </div>

      <div className="settings-section">
        <h2><Icon name="sparkles" size={15} />{t("settings.effects")}</h2>
        <fieldset className="appearance-fields" disabled={followed}>
          <p className="settings-label" id="settings-background-label">{t("settings.background")}</p>
          <div className="effect-grid" role="radiogroup" aria-labelledby="settings-background-label">
            {BACKGROUNDS.map((background) => (
              <button
                key={background}
                type="button"
                role="radio"
                aria-checked={appearance.background === background}
                className={`effect-tile effect-${background} ${appearance.background === background ? "active" : ""}`}
                onClick={() => setAppearance({ background })}
                data-sound="toggle"
              >
                <span className="effect-preview" aria-hidden="true"><Icon name={BACKGROUND_ICONS[background]} size={18} /></span>
                <span>{t(`appearance.background.${background}`)}</span>
              </button>
            ))}
          </div>
          <p className="settings-label" id="settings-motion-label">{t("settings.motion")}</p>
          <div className="segmented" role="radiogroup" aria-labelledby="settings-motion-label">
            {MOTIONS.map((motion) => (
              <button key={motion} type="button" role="radio" aria-checked={appearance.motion === motion} className={appearance.motion === motion ? "active" : ""} onClick={() => setAppearance({ motion })} data-sound="toggle">
                {t(`appearance.motion.${motion}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="settings-section">
        <h2><Icon name={appearance.soundEnabled ? "volume" : "volumeOff"} size={15} />{t("settings.sounds")}</h2>
        <fieldset className="appearance-fields" disabled={followed}>
          <div className="sound-row">
            <button
              type="button"
              role="switch"
              aria-checked={appearance.soundEnabled}
              className={`switch ${appearance.soundEnabled ? "on" : ""}`}
              data-sound="none"
              onClick={() => {
                const next = !appearance.soundEnabled;
                setAppearance({ soundEnabled: next });
                if (next) playSound("toggle", { force: true });
              }}
            >
              <i aria-hidden="true" />
              <span>{t("settings.soundEnabled")} — {t(appearance.soundEnabled ? "settings.on" : "settings.off")}</span>
            </button>
            <label className="range-field">
              {t("settings.soundVolume")}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={appearance.soundVolume}
                disabled={!appearance.soundEnabled}
                onChange={(event) => setAppearance({ soundVolume: Number(event.target.value) })}
              />
              <b>{appearance.soundVolume}%</b>
            </label>
            <button type="button" className="ghost small" data-sound="none" disabled={!appearance.soundEnabled} onClick={() => playSound("success")}>
              <Icon name="volume" size={15} />{t("settings.soundTest")}
            </button>
          </div>
          <div className="settings-actions settings-reset">
            <button
              type="button"
              className="ghost small"
              data-sound="none"
              onClick={() => setAppearance({ ...DEFAULT_APPEARANCE, theme: "nebula-dark" })}
            >
              <Icon name="refresh" size={15} />{t("settings.reset")}
            </button>
          </div>
        </fieldset>
      </div>

      {desktop ? (
        <div className="settings-section" id="nebula">
          <h2><Icon name="orbit" size={15} />{t("settings.hub")}</h2>
          <p className="settings-hub-status">
            <i className={`status-dot ${hubConnected ? "" : "warn"}`} aria-hidden="true" />
            {t("sidebar.hub.title")} · {hubConnected ? t("sidebar.hub.connected") : t("sidebar.hub.absent")}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={followHub}
            aria-describedby="settings-follow-hint"
            className={`switch ${followHub ? "on" : ""}`}
            data-sound="toggle"
            onClick={() => setFollowHub(!followHub)}
          >
            <i aria-hidden="true" />
            <span>{t("settings.followHub")}</span>
          </button>
          <small className="path-note" id="settings-follow-hint">{t("settings.followHubHint")}</small>
          <div className="settings-actions settings-followed">
            <a className="button-link ghost small" href="nebula://hub/" target="_blank" rel="noreferrer">
              <Icon name="apps" size={15} />{t("settings.openHub")}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
