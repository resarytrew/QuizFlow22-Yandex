import type { DesignSettings } from "./types";

let designSettings: DesignSettings | undefined;

export function setDesignSettings(ds: DesignSettings | undefined): void {
  designSettings = ds;
}

export function getDesignSettings(): DesignSettings | undefined {
  return designSettings;
}
