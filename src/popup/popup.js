import {
  PAGE_DISPLAY_OPTIONS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  cloneSettings
} from "../shared/defaults.js";
import { getSettings, saveSettings } from "../background/storage.js";

const elements = {
  sourceLanguage: document.getElementById("source-language"),
  targetLanguage: document.getElementById("target-language"),
  pageDisplayMode: document.getElementById("page-display-mode"),
  saveSettings: document.getElementById("save-settings"),
  testConnection: document.getElementById("test-connection"),
  openOptions: document.getElementById("open-options"),
  status: document.getElementById("status")
};

let settingsState = null;

await initialize();

async function initialize() {
  populateSelect(elements.sourceLanguage, SOURCE_LANGUAGES);
  populateSelect(elements.targetLanguage, TARGET_LANGUAGES);
  populateSelect(elements.pageDisplayMode, PAGE_DISPLAY_OPTIONS);

  settingsState = cloneSettings(await getSettings());
  renderForm();
  bindEvents();
}

function bindEvents() {
  elements.saveSettings.addEventListener("click", persistSettings);
  elements.testConnection.addEventListener("click", () => runBackgroundAction("action:testConnection", false));
  elements.openOptions.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });
}

function renderForm() {
  const translation = settingsState.translation;

  elements.sourceLanguage.value = translation.sourceLanguage;
  elements.targetLanguage.value = translation.targetLanguage;
  elements.pageDisplayMode.value = translation.pageDisplayMode;
}

function collectForm() {
  settingsState.translation.sourceLanguage = elements.sourceLanguage.value;
  settingsState.translation.targetLanguage = elements.targetLanguage.value;
  settingsState.translation.pageDisplayMode = elements.pageDisplayMode.value;
}

async function persistSettings() {
  try {
    toggleBusy(true);
    collectForm();
    settingsState = cloneSettings(await saveSettings(settingsState));
    renderForm();
    setStatus("设置已保存到本地。", "success");
  } catch (error) {
    setStatus(error.message || "保存设置失败。", "error");
  } finally {
    toggleBusy(false);
  }
}

async function runBackgroundAction(type, closeOnSuccess) {
  try {
    toggleBusy(true);
    collectForm();
    settingsState = cloneSettings(await saveSettings(settingsState));
    const response = await chrome.runtime.sendMessage({ type });

    if (!response?.ok) {
      throw new Error(response?.error || "操作执行失败。");
    }

    setStatus(response.payload?.message || "操作已发送。", "success");
    if (closeOnSuccess) {
      window.close();
    }
  } catch (error) {
    setStatus(error.message || "操作执行失败。", "error");
  } finally {
    toggleBusy(false);
  }
}

function toggleBusy(isBusy) {
  for (const key of ["saveSettings", "testConnection", "openOptions"]) {
    elements[key].disabled = isBusy;
  }
}

function populateSelect(select, items) {
  if (!select) {
    return;
  }

  select.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  }
}

function setStatus(message, type = "") {
  elements.status.textContent = message;
  elements.status.className = `status${type ? ` is-${type}` : ""}`;
}
