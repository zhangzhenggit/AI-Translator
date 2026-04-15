import { requestTranslation } from "./api-client.js";
import { buildConnectionTestMessages, buildPageBlockMessages, buildPageMessages, buildSelectionMessages } from "./prompts.js";
import { ensureSettings, getSettings } from "./storage.js";
import { CONTEXT_MENU_IDS, resolveProviderSettings } from "../shared/defaults.js";

let contextMenusPromise = null;

initializeExtension();

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSettings();
  await ensureContextMenus();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureContextMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) {
    return;
  }

  try {
    if (info.menuItemId === CONTEXT_MENU_IDS.selection) {
      await translateSelectionInTab(tab.id, info.selectionText ?? "");
      return;
    }

    if (info.menuItemId === CONTEXT_MENU_IDS.page) {
      await translatePageInTab(tab.id);
    }
  } catch (error) {
    const mode = info.menuItemId === CONTEXT_MENU_IDS.selection ? "selection" : "page";
    await notifyContentError(tab.id, error, mode);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleRuntimeMessage(message)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unknown error" }));

  return true;
});

async function handleRuntimeMessage(message) {
  switch (message?.type) {
    case "action:translateSelection": {
      const tabId = await getActiveTabId();
      await translateSelectionInTab(tabId, "");
      return { message: "已发起划词翻译。" };
    }

    case "action:translatePage": {
      const tabId = await getActiveTabId();
      await translatePageInTab(tabId);
      return { message: "已发起全文翻译。" };
    }

    case "action:testConnection": {
      const settings = await getSettings();
      const result = await requestTranslation(settings, buildConnectionTestMessages(settings));
      return {
        message: `连接成功：${result.provider.label} / ${result.provider.model}`
      };
    }

    default:
      return { message: "已忽略。" };
  }
}

async function ensureContextMenus() {
  if (contextMenusPromise) {
    return contextMenusPromise;
  }

  contextMenusPromise = (async () => {
    await chrome.contextMenus.removeAll();

    await createContextMenu({
      id: CONTEXT_MENU_IDS.selection,
      title: "AI Translate: 翻译当前文本",
      contexts: ["selection"]
    });

    await createContextMenu({
      id: CONTEXT_MENU_IDS.page,
      title: "AI Translate: 翻译当前页面",
      contexts: ["page"]
    });
  })();

  try {
    await contextMenusPromise;
  } finally {
    contextMenusPromise = null;
  }
}

function createContextMenu(options) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
      const error = chrome.runtime.lastError;

      if (!error) {
        resolve();
        return;
      }

      if (String(error.message || "").includes("duplicate id")) {
        resolve();
        return;
      }

      reject(new Error(error.message || "创建右键菜单失败。"));
    });
  });
}

async function translateSelectionInTab(tabId, fallbackSelectionText) {
  await ensureContentReady(tabId);
  const settings = await getSettings();
  const provider = resolveProviderSettings(settings);
  const prepared = await sendMessageToTab(tabId, {
    type: "selection:prepare",
    selectionText: fallbackSelectionText,
    providerLabel: provider.label
  });

  const originalText = String(prepared?.text || fallbackSelectionText || "").trim();

  if (!originalText) {
    throw new Error("当前页面没有检测到选中文本。");
  }

  const maxChars = Number(settings.translation.selectionMaxChars || 1600);
  const trimmedText = originalText.slice(0, maxChars);
  const translation = await requestTranslation(settings, buildSelectionMessages(settings, trimmedText));

  await sendMessageToTab(tabId, {
    type: "selection:result",
    payload: {
      originalText: trimmedText,
      translation: translation.text,
      providerLabel: translation.provider.label,
      model: translation.provider.model,
      truncated: originalText.length > trimmedText.length
    }
  });
}

async function translatePageInTab(tabId) {
  await ensureContentReady(tabId);
  const settings = await getSettings();
  const provider = resolveProviderSettings(settings);
  const pagePayload = await sendMessageToTab(tabId, {
    type: "page:collect",
    providerLabel: provider.label,
    displayMode: settings.translation.pageDisplayMode
  });

  const originalText = String(pagePayload?.text || "").trim();

  if (!originalText) {
    throw new Error("当前页面没有提取到可翻译的正文内容。");
  }

  if (
    settings.translation.pageDisplayMode === "inline" &&
    Array.isArray(pagePayload?.blocks) &&
    pagePayload.blocks.length > 0
  ) {
    const blockResult = await translatePageBlocks(tabId, settings, pagePayload);

    await sendMessageToTab(tabId, {
      type: "page:result",
      payload: {
        title: pagePayload?.title || "",
        providerLabel: blockResult.provider.label,
        model: blockResult.provider.model,
        blockTranslations: blockResult.blockTranslations,
        truncated: blockResult.truncated,
        displayMode: settings.translation.pageDisplayMode
      }
    });
    return;
  }

  const maxChars = Number(settings.translation.pageMaxChars || 12000);
  const trimmedText = originalText.slice(0, maxChars);
  const translation = await requestTranslation(
    settings,
    buildPageMessages(settings, {
      ...pagePayload,
      text: trimmedText
    })
  );

  await sendMessageToTab(tabId, {
    type: "page:result",
    payload: {
      title: pagePayload?.title || "",
      translation: translation.text,
      providerLabel: translation.provider.label,
      model: translation.provider.model,
      originalLength: originalText.length,
      translatedLength: translation.text.length,
      truncated: originalText.length > trimmedText.length,
      displayMode: settings.translation.pageDisplayMode
    }
  });
}

async function translatePageBlocks(tabId, settings, pagePayload) {
  const maxChars = Number(settings.translation.pageMaxChars || 12000);
  const limited = limitBlocksByChars(pagePayload.blocks || [], maxChars);

  if (limited.blocks.length === 0) {
    throw new Error("当前页面没有提取到可翻译的正文段落。");
  }

  const chunks = chunkBlocks(limited.blocks, 1400);
  const translationMap = new Map();
  let providerInfo = null;

  await sendMessageToTab(tabId, {
    type: "page:status",
    payload: {
      meta: "全文翻译中",
      message: `已提取 ${limited.blocks.length} 段，准备开始翻译`
    }
  }).catch(() => {});

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await sendMessageToTab(tabId, {
      type: "page:status",
      payload: {
        meta: "全文翻译中",
        message: `正在翻译第 ${index + 1}/${chunks.length} 组`
      }
    }).catch(() => {});

    const result = await requestTranslation(settings, buildPageBlockMessages(settings, pagePayload, chunk));
    providerInfo = result.provider;
    const parsed = parseBlockTranslations(result.text);
    const chunkTranslations = [];

    for (const block of chunk) {
      const translated = parsed.get(block.id);

      if (!translated) {
        throw new Error("全文段落翻译解析失败，请切换到底部悬浮模式重试。");
      }

      translationMap.set(block.id, translated);
      chunkTranslations.push({
        id: block.id,
        translation: translated
      });
    }

    await sendMessageToTab(tabId, {
      type: "page:chunk",
      payload: {
        providerLabel: result.provider.label,
        model: result.provider.model,
        blockTranslations: chunkTranslations,
        progress: {
          done: index + 1,
          total: chunks.length,
          message: `已完成 ${index + 1}/${chunks.length} 组`
        }
      }
    }).catch(() => {});
  }

  return {
    provider: providerInfo || resolveProviderSettings(settings),
    truncated: limited.truncated,
    blockTranslations: limited.blocks.map((block) => ({
      id: block.id,
      translation: translationMap.get(block.id) || ""
    }))
  };
}

async function notifyContentError(tabId, error, mode) {
  await ensureContentReady(tabId).catch(() => {});
  await sendMessageToTab(tabId, {
    type: `${mode}:error`,
    payload: {
      message: error.message || "翻译失败。"
    }
  }).catch(() => {});
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("当前没有可用的活动标签页。");
  }

  return tab.id;
}

async function sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_error) {
    throw new Error("当前页面不支持注入翻译界面，请切换到普通网页后再试。");
  }
}

async function ensureContentReady(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "aerolingo:ping" });
    return;
  } catch (_error) {
    const tab = await chrome.tabs.get(tabId);

    if (!canInjectIntoTab(tab)) {
      throw new Error("当前页面不支持注入翻译界面，请切换到普通网页后再试。");
    }

    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["src/content/content.css"]
      }).catch(() => {});

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/content/content.js"]
      });

      await chrome.tabs.sendMessage(tabId, { type: "aerolingo:ping" });
    } catch (_injectError) {
      throw new Error("当前页面不支持注入翻译界面，请切换到普通网页后再试。");
    }
  }
}

function canInjectIntoTab(tab) {
  const url = String(tab?.url || "");

  if (!url) {
    return false;
  }

  return /^https?:\/\//.test(url);
}

async function initializeExtension() {
  try {
    await ensureSettings();
    await ensureContextMenus();
  } catch (_error) {
  }
}

function limitBlocksByChars(blocks, maxChars) {
  const result = [];
  let total = 0;
  let truncated = false;

  for (const block of blocks) {
    const text = String(block.text || "").trim();

    if (!text) {
      continue;
    }

    if (result.length > 0 && total + text.length > maxChars) {
      truncated = true;
      break;
    }

    if (result.length === 0 && text.length > maxChars) {
      result.push({
        ...block,
        text: text.slice(0, maxChars)
      });
      truncated = true;
      break;
    }

    result.push({
      ...block,
      text
    });
    total += text.length;
  }

  if (result.length < blocks.length) {
    truncated = true;
  }

  return {
    blocks: result,
    truncated
  };
}

function chunkBlocks(blocks, chunkSize) {
  const chunks = [];
  let current = [];
  let currentChars = 0;

  for (const block of blocks) {
    const nextChars = currentChars + block.text.length;

    if (current.length > 0 && nextChars > chunkSize) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(block);
    currentChars += block.text.length;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function parseBlockTranslations(text) {
  const normalized = String(text || "")
    .replace(/^```[\w-]*\s*/u, "")
    .replace(/\s*```$/u, "")
    .trim();
  const result = new Map();
  const pattern = /\[\[BLOCK_(\d+)\]\]\s*([\s\S]*?)(?=\n\s*\[\[BLOCK_\d+\]\]|\s*$)/gu;

  for (const match of normalized.matchAll(pattern)) {
    const id = Number(match[1]);
    const translation = String(match[2] || "").trim();

    if (!Number.isNaN(id) && translation) {
      result.set(id, translation);
    }
  }

  return result;
}
