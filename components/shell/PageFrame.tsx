import type { ReactNode } from "react";

/**
 * Page shell, as Nebula Hub's ScreenFrame: eyebrow, title, intro, actions (that never
 * shrink), then the content, in a centered column whose width grows with the screen
 * (hub-app.css: 1480 px, then 1680 / 1960 / 2280 px on wide screens).
 */
export function PageFrame({
  eyebrow,
  title,
  intro,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="workspace motion-page" aria-labelledby="page-title">
      <div className={`workspace-inner ${className ?? ""}`}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="page-title">{title}</h1>
            {intro ? <p className="topbar-intro">{intro}</p> : null}
          </div>
          {actions ? <div className="topbar-actions">{actions}</div> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
