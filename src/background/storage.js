import { DEFAULT_SETTINGS, STORAGE_KEY, cloneSettings, deepMerge, mergeSettings } from "../shared/defaults.js";

export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return mergeSettings(result[STORAGE_KEY]);
}

export async function saveSettings(settings) {
  const merged = mergeSettings(settings);
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

export async function patchSettings(patch) {
  const current = await getSettings();
  const merged = deepMerge(current, patch);
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

export async function resetSettings() {
  const nextSettings = cloneSettings(DEFAULT_SETTINGS);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextSettings });
  return nextSettings;
}

export async function ensureSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);

  if (!result[STORAGE_KEY]) {
    const initialSettings = cloneSettings(DEFAULT_SETTINGS);
    await chrome.storage.local.set({ [STORAGE_KEY]: initialSettings });
    return initialSettings;
  }

  return mergeSettings(result[STORAGE_KEY]);
}
