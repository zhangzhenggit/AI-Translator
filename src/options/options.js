import {
  PAGE_DISPLAY_OPTIONS,
  PROVIDER_LABELS,
  SOURCE_LANGUAGES,
  STYLE_OPTIONS,
  TARGET_LANGUAGES,
  cloneSettings
} from "../shared/defaults.js";
import { getSettings, resetSettings, saveSettings } from "../background/storage.js";

const elements = {
  form: document.getElementById("settings-form"),
  providerSwitch: document.getElementById("provider-switch"),
  apiKey: document.getElementById("api-key"),
  baseUrl: document.getElementById("base-url"),
  model: document.getElementById("model"),
  sourceLanguage: document.getElementById("source-language"),
  targetLanguage: document.getElementById("target-language"),
  style: document.getElementById("style"),
  temperature: document.getElementById("temperature"),
  selectionMaxChars: document.getElementById("selection-max-chars"),
  pageMaxChars: document.getElementById("page-max-chars"),
  pageDisplayMode: document.getElementById("page-display-mode"),
  saveSettings: document.getElementById("save-settings"),
  testConnection: document.getElementById("test-connection"),
  resetSettings: document.getElementById("reset-settings"),
  status: document.getElementById("status")
};

let settingsState = null;

await initialize();

async function initialize() {
  populateSelect(elements.sourceLanguage, SOURCE_LANGUAGES);
  populateSelect(elements.targetLanguage, TARGET_LANGUAGES);
  populateSelect(elements.style, STYLE_OPTIONS);
  populateSelect(elements.pageDisplayMode, PAGE_DISPLAY_OPTIONS);

  settingsState = cloneSettings(await getSettings());
  renderProviderSwitch();
  renderForm();
  bindEvents();
}

function bindEvents() {
  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await persistSettings();
  });

  elements.testConnection.addEventListener("click", () => runBackgroundAction("action:testConnection"));
  elements.resetSettings.addEventListener("click", restoreDefaults);
}

function renderProviderSwitch() {
  elements.providerSwitch.innerHTML = "";

  for (const [providerKey, label] of Object.entries(PROVIDER_LABELS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.classList.toggle("is-active", settingsState.activeProvider === providerKey);
    button.addEventListener("click", () => {
      collectForm();
      settingsState.activeProvider = providerKey;
      renderProviderSwitch();
      renderForm();
      setStatus(`已切换到 ${label}。`, "success");
    });
    elements.providerSwitch.appendChild(button);
  }
}

function renderForm() {
  const provider = settingsState.providers[settingsState.activeProvider];
  const translation = settingsState.translation;

  elements.apiKey.value = provider.apiKey;
  elements.baseUrl.value = provider.baseUrl;
  elements.model.value = provider.model;
  elements.sourceLanguage.value = translation.sourceLanguage;
  elements.targetLanguage.value = translation.targetLanguage;
  elements.style.value = translation.style;
  elements.temperature.value = String(translation.temperature);
  elements.selectionMaxChars.value = String(translation.selectionMaxChars);
  elements.pageMaxChars.value = String(translation.pageMaxChars);
  elements.pageDisplayMode.value = translation.pageDisplayMode;
}

function collectForm() {
  const provider = settingsState.providers[settingsState.activeProvider];

  provider.apiKey = elements.apiKey.value.trim();
  provider.baseUrl = elements.baseUrl.value.trim();
  provider.model = elements.model.value.trim();

  settingsState.translation.sourceLanguage = elements.sourceLanguage.value;
  settingsState.translation.targetLanguage = elements.targetLanguage.value;
  settingsState.translation.style = elements.style.value;
  settingsState.translation.temperature = Number(elements.temperature.value || 0.2);
  settingsState.translation.selectionMaxChars = Number(elements.selectionMaxChars.value || 1600);
  settingsState.translation.pageMaxChars = Number(elements.pageMaxChars.value || 12000);
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

async function restoreDefaults() {
  try {
    toggleBusy(true);
    settingsState = cloneSettings(await resetSettings());
    renderProviderSwitch();
    renderForm();
    setStatus("已恢复默认配置。", "success");
  } catch (error) {
    setStatus(error.message || "恢复默认失败。", "error");
  } finally {
    toggleBusy(false);
  }
}

async function runBackgroundAction(type) {
  try {
    toggleBusy(true);
    collectForm();
    settingsState = cloneSettings(await saveSettings(settingsState));
    const response = await chrome.runtime.sendMessage({ type });

    if (!response?.ok) {
      throw new Error(response?.error || "操作执行失败。");
    }

    setStatus(response.payload?.message || "操作已完成。", "success");
  } catch (error) {
    setStatus(error.message || "操作执行失败。", "error");
  } finally {
    toggleBusy(false);
  }
}

function toggleBusy(isBusy) {
  elements.saveSettings.disabled = isBusy;
  elements.testConnection.disabled = isBusy;
  elements.resetSettings.disabled = isBusy;
}

function populateSelect(select, items) {
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
