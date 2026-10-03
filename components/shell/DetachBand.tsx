"use client";

import { Icon } from "@/lib/nebula-design/Icon";
import { useI18n } from "@/lib/i18n/client";

/**
 * Hub mode (desktop): the window is shown inside Nebula Hub. "Detach" brings it back as a
 * normal window. It is a plain link on purpose: a full navigation to this path is caught by
 * desktop/main.js (will-navigate), which undocks instead of loading anything.
 */
export function DetachBand() {
  const { t } = useI18n();
  return (
    <div className="detach-band" role="status">
      <Icon name="orbit" size={16} />
      <span>{t("dock.inHub")}</span>
      <a className="button-link ghost small" href="/__nebula/detach">
        <Icon name="external" size={14} />
        {t("dock.detach")}
      </a>
    </div>
  );
}
