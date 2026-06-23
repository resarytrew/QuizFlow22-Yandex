// vitest.setup.ts
//
// Global setup for Vitest runs. Patches jsdom globals that aren't
// implemented by default but are required by services that interact
// with the browser environment (e.g. navigator.sendBeacon).

import { vi } from "vitest";

if (
  typeof navigator !== "undefined" &&
  typeof navigator.sendBeacon === "undefined"
) {
  Object.defineProperty(navigator, "sendBeacon", {
    value: vi.fn(() => true),
    writable: true,
    configurable: true,
  });
}
