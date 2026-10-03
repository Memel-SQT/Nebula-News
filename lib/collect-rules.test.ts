// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { isOfflineRun } from "./collect-rules";

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 2, 12, minutes));

test("offline only when every source of the latest run failed", () => {
  assert.equal(isOfflineRun([{ status: "error", startedAt: at(0) }, { status: "error", startedAt: at(1) }]), true);
  assert.equal(isOfflineRun([{ status: "error", startedAt: at(0) }, { status: "success", startedAt: at(1) }]), false);
});

test("an older successful run does not hide a failed latest one", () => {
  const logs = [
    { status: "success", startedAt: new Date(Date.UTC(2026, 9, 2, 8, 0)) },
    { status: "error", startedAt: at(0) },
    { status: "error", startedAt: at(2) },
  ];
  assert.equal(isOfflineRun(logs), true);
});

test("a run in progress, or no run at all, is not offline", () => {
  assert.equal(isOfflineRun([{ status: "error", startedAt: at(0) }, { status: "running", startedAt: at(1) }]), false);
  assert.equal(isOfflineRun([]), false);
});
