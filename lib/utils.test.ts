// Run with: npm test (node --import tsx --test lib/*.test.ts)
import test from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "./utils";

const now = new Date("2026-10-02T12:00:00.000Z");
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

test("relative times name the right unit", () => {
  assert.equal(timeAgo(ago(30), "fr", now), "à l'instant");
  assert.equal(timeAgo(ago(10 * 60), "fr", now), "il y a 10 min");
  assert.equal(timeAgo(ago(10 * 3600), "fr", now), "il y a 10 h");
  assert.equal(timeAgo(ago(3 * 86400), "fr", now), "il y a 3 j");
  assert.equal(timeAgo(ago(30), "en", now), "just now");
  assert.equal(timeAgo(ago(10 * 60), "en", now), "10m ago");
  assert.equal(timeAgo(ago(10 * 3600), "en", now), "10h ago");
  assert.equal(timeAgo(ago(3 * 86400), "en", now), "3d ago");
});

test("a date slightly in the future (clock skew of a feed) reads as now", () => {
  assert.equal(timeAgo(new Date(now.getTime() + 120_000), "fr", now), "à l'instant");
});
