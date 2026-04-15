export const STORAGE_KEY = "aerolingo-settings";

export const CONTEXT_MENU_IDS = {
  selection: "ai-translator-selection",
  page: "ai-translator-page"
};

export const SOURCE_LANGUAGES = [
  { value: "auto", label: "自动检测" },
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "ko", label: "韩语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
  { value: "es", label: "西班牙语" }
];

export const TARGET_LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "ko", label: "韩语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
  { value: "es", label: "西班牙语" }
];

export const STYLE_OPTIONS = [
  { value: "faithful", label: "忠实直译" },
  { value: "natural", label: "自然流畅" },
  { value: "concise", label: "简洁凝练" }
];

export const PAGE_DISPLAY_OPTIONS = [
  { value: "inline", label: "段落对照" },
  { value: "bottomPanel", label: "底部悬浮" }
];

export const PROVIDER_LABELS = {
  deepseek: "DeepSeek",
  openai: "OpenAI"
};

export const DEFAULT_SETTINGS = {
  activeProvider: "deepseek",
  providers: {
    deepseek: {
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat"
    },
    openai: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini"
    }
  },
  translation: {
    sourceLanguage: "auto",
    targetLanguage: "zh-CN",
    style: "natural",
    temperature: 0.2,
    selectionMaxChars: 1600,
    pageMaxChars: 12000,
    pageDisplayMode: "inline"
  }
};

export function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? [...override] : [...base];
  }

  if (!isPlainObject(base)) {
    return override === undefined ? base : override;
  }

  const result = { ...base };

  if (!isPlainObject(override)) {
    return result;
  }

  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = [...value];
      continue;
    }

    result[key] = value;
  }

  return result;
}

export function mergeSettings(override = {}) {
  return deepMerge(DEFAULT_SETTINGS, override);
}

export function cloneSettings(settings = DEFAULT_SETTINGS) {
  return JSON.parse(JSON.stringify(settings));
}

export function getLanguageLabel(value) {
  const option = [...SOURCE_LANGUAGES, ...TARGET_LANGUAGES].find((item) => item.value === value);
  return option ? option.label : value;
}

export function resolveProviderSettings(settings) {
  const providerKey = settings.activeProvider;
  return {
    providerKey,
    label: PROVIDER_LABELS[providerKey] ?? providerKey,
    ...settings.providers[providerKey]
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
