// Adapted from Nebula Hub 05204fd (packages/nebula-design/src/Icon.test.tsx) to node:test and
// react-dom/server (no new dependency). Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsx compiles JSX with the classic runtime here (tsconfig keeps "jsx": "preserve" for Next.js),
// so React must be in scope for Icon.tsx too: it is loaded after this line.
(globalThis as { React?: typeof React }).React = React;
const loadIcons = () => import("./Icon");

const NEWS_ICONS = ["newspaper", "rss"] as const;

test("every icon is drawn on the 24 px grid in currentColor, hidden from assistive tech", async () => {
  const { Icon, ICON_NAMES } = await loadIcons();
  for (const name of ICON_NAMES) {
    const svg = renderToStaticMarkup(<Icon name={name} />);
    assert.match(svg, /viewBox="0 0 24 24"/, name);
    assert.match(svg, /stroke="currentColor"/, name);
    assert.match(svg, /aria-hidden="true"/, name);
    assert.match(svg, /<svg[^>]*>.+<\/svg>/, name);
  }
});

test("the News icons have one duotone shape and a 1.8 px stroke", async () => {
  const { Icon } = await loadIcons();
  for (const name of NEWS_ICONS) {
    const svg = renderToStaticMarkup(<Icon name={name} />);
    assert.equal((svg.match(/icon-duo/g) ?? []).length, 1, name);
    assert.match(svg, /stroke-width="1.8"/, name);
  }
});
