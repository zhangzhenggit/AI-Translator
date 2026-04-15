import { resolveProviderSettings } from "../shared/defaults.js";

const REQUEST_TIMEOUT_MS = 45000;

export async function requestTranslation(settings, messages) {
  return withKeepAlive((async () => {
    const provider = resolveProviderSettings(settings);

    if (!provider.apiKey.trim()) {
      throw new Error(`请先配置 ${provider.label} 的 API Key。`);
    }

    if (!provider.baseUrl.trim()) {
      throw new Error(`请先配置 ${provider.label} 的 Base URL。`);
    }

    if (!provider.model.trim()) {
      throw new Error(`请先配置 ${provider.label} 的模型名。`);
    }

    const endpoint = `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: provider.model.trim(),
        messages,
        temperature: Number(settings.translation.temperature ?? 0.2),
        stream: false
      })
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message);
    }

    const payload = await response.json();
    const content = extractMessageContent(payload);

    if (!content) {
      throw new Error("服务商返回了空的翻译结果。");
    }

    return {
      provider,
      text: content.trim()
    };
  })());
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("翻译请求超时，请稍后重试。");
    }

    throw new Error(error.message || "连接翻译服务失败。");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function extractErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || `请求失败，状态码 ${response.status}。`;
  } catch (_error) {
    return `请求失败，状态码 ${response.status}。`;
  }
}

function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }

  return "";
}

async function withKeepAlive(promise) {
  const keepAlive = setInterval(() => {
    chrome.runtime.getPlatformInfo().catch(() => {});
  }, 25_000);

  try {
    return await promise;
  } finally {
    clearInterval(keepAlive);
  }
}
