export const DATA_VERSION = "v2";
export const UI_STORAGE_VERSION = "v2";

export function withV(key) {
  return `${DATA_VERSION}:${key}`;
}
