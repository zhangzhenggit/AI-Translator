if (!window.__AI_TRANSLATOR_CONTENT_READY__) {
  window.__AI_TRANSLATOR_CONTENT_READY__ = true;

  const APP_ROOT_ID = "ai-translator-root-host";
  const INLINE_TRANSLATION_SELECTOR = "[data-ai-translator-inline='true']";
  const INLINE_STATUS_SELECTOR = "[data-ai-translator-inline-status='true']";

  let rootNode;
  let selectionBubble;
  let selectionTextNode;
  let selectionMetaNode;
  let pagePanel;
  let pagePanelBody;
  let pagePanelMeta;
  let pagePanelTitle;
  let lastPageTargetNode = null;
  let lastPageBlocks = [];
  let lastPageBlockMap = new Map();
  let lastPageDisplayMode = "inline";
  let lastSelectionSnapshot = {
    text: "",
    rect: null
  };

  document.addEventListener("selectionchange", captureSelectionSnapshot);
  document.addEventListener("mouseup", captureSelectionSnapshot);
  document.addEventListener("keyup", captureSelectionSnapshot);
  document.addEventListener("mousedown", handleDocumentPointerDown, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case "aerolingo:ping":
        sendResponse({ ok: true });
        return true;

      case "selection:prepare":
        sendResponse(handleSelectionPrepare(message));
        return true;

      case "selection:result":
        renderSelectionResult(message.payload);
        sendResponse({ ok: true });
        return true;

      case "selection:error":
        renderSelectionError(message.payload?.message || "翻译失败。");
        sendResponse({ ok: true });
        return true;

      case "page:collect":
        sendResponse(handlePageCollect(message));
        return true;

      case "page:result":
        renderPageResult(message.payload);
        sendResponse({ ok: true });
        return true;

      case "page:chunk":
        renderPageChunk(message.payload);
        sendResponse({ ok: true });
        return true;

      case "page:error":
        renderPageError(message.payload?.message || "翻译失败。");
        sendResponse({ ok: true });
        return true;

      default:
        return false;
    }
  });

  function handleSelectionPrepare(message) {
    captureSelectionSnapshot();
    const text = String(message.selectionText || lastSelectionSnapshot.text || "").trim();
    renderSelectionLoading();
    return { text };
  }

  function handlePageCollect(message) {
    lastPageDisplayMode = message.displayMode || "inline";
    const pagePayload = collectPageContent(lastPageDisplayMode);
    renderPageLoading(pagePayload.title || document.title, lastPageDisplayMode);
    return pagePayload;
  }

  function renderSelectionLoading() {
    ensureSelectionBubble();
    selectionMetaNode.textContent = "正在翻译";
    selectionTextNode.innerHTML = getLoadingSkeleton();
    selectionTextNode.className = "alx-copy is-loading";
    positionSelectionBubble();
    selectionBubble.hidden = false;
  }

  function renderSelectionResult(payload) {
    ensureSelectionBubble();
    selectionMetaNode.textContent = payload.providerLabel || "AI Translate";
    selectionTextNode.textContent = payload.translation || "";
    selectionTextNode.className = "alx-copy";
    positionSelectionBubble();
    selectionBubble.hidden = false;
  }

  function renderSelectionError(message) {
    ensureSelectionBubble();
    selectionMetaNode.textContent = "翻译失败";
    selectionTextNode.textContent = message;
    selectionTextNode.className = "alx-copy is-error";
    positionSelectionBubble();
    selectionBubble.hidden = false;
  }

  function renderPageLoading(title, displayMode) {
    if (displayMode === "inline") {
      hideBottomPanel();
      clearInlineArtifacts();
      renderInlineStatus({
        title: title || "当前页面",
        meta: "全文翻译中",
        body: "AI 正在翻译本页内容",
        isLoading: true
      });
      return;
    }

    clearInlineArtifacts();
    ensurePagePanel();
    pagePanelTitle.textContent = title || "当前页面";
    pagePanelMeta.textContent = "正在翻译";
    pagePanelBody.innerHTML = getLoadingSkeleton();
    pagePanelBody.className = "alx-panel-body alx-copy is-loading";
    pagePanel.hidden = false;
  }

  function renderPageResult(payload) {
    const displayMode = payload?.displayMode || lastPageDisplayMode;

    if (displayMode === "inline") {
      hideBottomPanel();
      const inserted = document.querySelectorAll(INLINE_TRANSLATION_SELECTOR).length;

      if (inserted === 0) {
        renderInlineStatus({
          title: payload.title || "当前页面",
          meta: "翻译失败",
          body: "没有成功插入段落译文，请切换到底部悬浮模式重试。",
          isError: true
        });
        return;
      }

      renderInlineStatus({
        title: payload.title || "当前页面",
        meta: payload.providerLabel || "AI Translate",
        body: payload.truncated ? "译文已插入，部分内容因上限未翻译。" : "译文已插入页面。"
      });
      return;
    }

    clearInlineArtifacts();
    ensurePagePanel();
    pagePanelTitle.textContent = payload.title || "当前页面";
    pagePanelMeta.textContent = payload.providerLabel || "AI Translate";
    pagePanelBody.textContent = payload.translation || "";
    pagePanelBody.className = "alx-panel-body alx-copy";
    pagePanel.hidden = false;
  }

  function renderPageError(message) {
    if (lastPageDisplayMode === "inline") {
      hideBottomPanel();
      clearInlineTranslations();
      renderInlineStatus({
        title: "当前页面",
        meta: "翻译失败",
        body: message,
        isError: true
      });
      return;
    }

    clearInlineArtifacts();
    ensurePagePanel();
    pagePanelTitle.textContent = "当前页面";
    pagePanelMeta.textContent = "翻译失败";
    pagePanelBody.textContent = message;
    pagePanelBody.className = "alx-panel-body alx-copy is-error";
    pagePanel.hidden = false;
  }

  function renderPageChunk(payload) {
    if (lastPageDisplayMode !== "inline") {
      return;
    }

    let firstInsertedNode = null;

    for (const item of payload.blockTranslations || []) {
      const blockId = Number(item.id);
      const block = lastPageBlockMap.get(blockId);

      if (!block || !block.element || !document.contains(block.element)) {
        continue;
      }

      let host = block.element.nextElementSibling;
      if (!host || host.getAttribute("data-ai-translator-inline") !== "true") {
        host = createInlineTranslationHost(item.translation, payload.providerLabel || "AI Translate");
        block.element.insertAdjacentElement("afterend", host);
      } else {
        updateInlineTranslationHost(host, item.translation, payload.providerLabel || "AI Translate");
      }

      if (!firstInsertedNode) {
        firstInsertedNode = host;
      }
    }

    if (payload.progress) {
      renderInlineStatus({
        title: document.title || "当前页面",
        meta: payload.providerLabel || "AI Translate",
        body: `正在翻译 ${payload.progress.done}/${payload.progress.total}`,
        isLoading: true
      });
    }

    if (firstInsertedNode && payload.progress?.done === 1) {
      scrollNodeIntoView(firstInsertedNode);
    }
  }

  function ensureRoot() {
    if (rootNode && document.contains(rootNode)) {
      return rootNode;
    }

    rootNode = document.createElement("div");
    rootNode.id = APP_ROOT_ID;
    rootNode.className = "alx-root";
    rootNode.dataset.aerolingoRoot = "true";
    document.documentElement.appendChild(rootNode);
    return rootNode;
  }

  function ensureSelectionBubble() {
    if (selectionBubble && document.contains(selectionBubble)) {
      return selectionBubble;
    }

    const root = ensureRoot();
    selectionBubble = document.createElement("section");
    selectionBubble.hidden = true;
    selectionBubble.className = "alx-card alx-selection";
    selectionBubble.dataset.aerolingoRoot = "true";
    selectionBubble.innerHTML = `
      <div class="alx-selection-head">
        <div>
          <div class="alx-badge">划词翻译</div>
          <p class="alx-meta" id="alx-selection-meta"></p>
        </div>
        <div class="alx-actions">
          <button class="alx-button" type="button" data-action="close-selection">关闭</button>
        </div>
      </div>
      <div class="alx-selection-body">
        <div class="alx-copy" id="alx-selection-text"></div>
      </div>
    `;

    selectionTextNode = selectionBubble.querySelector("#alx-selection-text");
    selectionMetaNode = selectionBubble.querySelector("#alx-selection-meta");
    selectionBubble.querySelector("[data-action='close-selection']").addEventListener("click", () => {
      selectionBubble.hidden = true;
    });

    root.appendChild(selectionBubble);
    return selectionBubble;
  }

  function ensurePagePanel() {
    if (pagePanel && document.contains(pagePanel)) {
      return pagePanel;
    }

    const root = ensureRoot();
    pagePanel = document.createElement("section");
    pagePanel.hidden = true;
    pagePanel.className = "alx-card alx-page-panel";
    pagePanel.dataset.aerolingoRoot = "true";
    pagePanel.innerHTML = `
      <div class="alx-panel-head">
        <div>
          <div class="alx-badge">全文翻译</div>
          <h2 class="alx-title" id="alx-panel-title">当前页面</h2>
          <p class="alx-meta" id="alx-panel-meta"></p>
        </div>
        <div class="alx-actions">
          <button class="alx-button alx-button--brand" type="button" data-action="close-page">关闭</button>
        </div>
      </div>
      <div class="alx-panel-body" id="alx-panel-body"></div>
    `;

    pagePanelBody = pagePanel.querySelector("#alx-panel-body");
    pagePanelMeta = pagePanel.querySelector("#alx-panel-meta");
    pagePanelTitle = pagePanel.querySelector("#alx-panel-title");
    pagePanel.querySelector("[data-action='close-page']").addEventListener("click", () => {
      pagePanel.hidden = true;
    });

    root.appendChild(pagePanel);
    return pagePanel;
  }

  function captureSelectionSnapshot() {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      lastSelectionSnapshot = { text: "", rect: null };
      return;
    }

    const text = selection.toString().trim();

    if (!text) {
      lastSelectionSnapshot = { text: "", rect: null };
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();

    lastSelectionSnapshot = {
      text,
      rect: rect.width || rect.height ? rect : lastSelectionSnapshot.rect
    };
  }

  function positionSelectionBubble() {
    if (!selectionBubble) {
      return;
    }

    const rect = getSelectionRect();
    const margin = 16;

    requestAnimationFrame(() => {
      const bubbleWidth = selectionBubble.offsetWidth || 320;
      const bubbleHeight = selectionBubble.offsetHeight || 160;

      let left = rect.left;
      let top = rect.bottom + 14;

      if (left + bubbleWidth + margin > window.innerWidth) {
        left = window.innerWidth - bubbleWidth - margin;
      }

      if (top + bubbleHeight + margin > window.innerHeight) {
        top = Math.max(margin, rect.top - bubbleHeight - 14);
      }

      selectionBubble.style.left = `${Math.max(margin, left)}px`;
      selectionBubble.style.top = `${Math.max(margin, top)}px`;
    });
  }

  function getSelectionRect() {
    if (lastSelectionSnapshot.rect) {
      return lastSelectionSnapshot.rect;
    }

    return {
      left: window.innerWidth / 2 - 120,
      top: 48,
      bottom: 120
    };
  }

  function collectPageContent(displayMode) {
    const node = pickMainContentNode();
    lastPageTargetNode = node;

    if (displayMode === "inline") {
      lastPageBlocks = collectPageBlocks(node);
      lastPageBlockMap = new Map(lastPageBlocks.map((block) => [block.id, block]));
      const text = lastPageBlocks.map((block) => block.text).join("\n\n");

      return {
        title: document.title,
        url: location.href,
        text,
        blocks: lastPageBlocks.map((block) => ({
          id: block.id,
          text: block.text
        }))
      };
    }

    const text = cleanPageText(extractVisibleText(node));
    return {
      title: document.title,
      url: location.href,
      text
    };
  }

  function pickMainContentNode() {
    const selectors = [
      "main article",
      "article",
      "main .theme-doc-markdown",
      "main .markdown",
      "main",
      "[role='main']",
      ".article",
      ".post",
      ".entry-content",
      ".content"
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) {
        continue;
      }

      const text = cleanPageText(extractVisibleText(node));
      if (text.length > 800) {
        return node;
      }
    }

    return document.body;
  }

  function collectPageBlocks(root) {
    const elements = Array.from(root.querySelectorAll("h1, h2, h3, h4, p, li, blockquote"));
    const blocks = [];
    let id = 1;

    for (const element of elements) {
      if (shouldSkipBlock(element, root)) {
        continue;
      }

      const text = cleanInlineText(element.innerText || element.textContent || "");

      if (!text || text.length < 2 || /^[\p{P}\p{S}\s]+$/u.test(text)) {
        continue;
      }

      blocks.push({
        id,
        text,
        element
      });
      id += 1;

      if (blocks.length >= 120) {
        break;
      }
    }

    return blocks;
  }

  function shouldSkipBlock(element, root) {
    if (!root.contains(element)) {
      return true;
    }

    if (element.closest("[data-aerolingo-root='true']")) {
      return true;
    }

    if (element.closest("nav, aside, header, footer, [role='navigation'], [aria-hidden='true']")) {
      return true;
    }

    if (element.closest(".table-of-contents, .toc, .theme-doc-toc-desktop, .theme-doc-toc-mobile, .menu, .navbar, .pagination-nav")) {
      return true;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return true;
    }

    return false;
  }

  function extractVisibleText(node) {
    const hiddenNodes = Array.from(document.querySelectorAll("[data-aerolingo-root='true']"));
    const previousDisplays = hiddenNodes.map((element) => element.style.display);

    hiddenNodes.forEach((element) => {
      element.style.display = "none";
    });

    try {
      return node.innerText || node.textContent || "";
    } finally {
      hiddenNodes.forEach((element, index) => {
        element.style.display = previousDisplays[index];
      });
    }
  }

  function cleanPageText(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function cleanInlineText(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function clearInlineArtifacts() {
    clearInlineTranslations();
    clearInlineStatus();
  }

  function clearInlineTranslations() {
    document.querySelectorAll(INLINE_TRANSLATION_SELECTOR).forEach((node) => node.remove());
  }

  function clearInlineStatus() {
    document.querySelectorAll(INLINE_STATUS_SELECTOR).forEach((node) => node.remove());
  }

  function renderInlineStatus({ title, meta, body, isError = false, isLoading = false }) {
    clearInlineStatus();
    const host = document.createElement("div");
    host.dataset.aiTranslatorInlineStatus = "true";
    host.dataset.aerolingoRoot = "true";
    host.style.display = "block";
    host.className = "alx-inline-toast-host";

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 2147483647;
          display: block;
          width: min(360px, calc(100vw - 24px));
          pointer-events: auto;
          animation: toast-enter 180ms ease-out;
        }
        .card {
          border: 1px solid ${isError ? "#f3c8c3" : "#d8e6ff"};
          border-left: 3px solid ${isError ? "#c03d2e" : "#1f6feb"};
          border-radius: 12px;
          background: ${isError ? "rgba(255, 247, 246, 0.96)" : "rgba(248, 251, 255, 0.97)"};
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(10px);
          padding: 12px 14px;
          color: #1f2328;
          font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
        }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .title { font-size: 15px; font-weight: 600; margin: 0; }
        .meta { margin: 4px 0 0; color: ${isError ? "#c03d2e" : "#6b7280"}; font-size: 12px; }
        .body { margin-top: 8px; white-space: pre-wrap; line-height: 1.65; font-size: 14px; }
        .loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #334155;
        }
        .loading-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .loading-dots span {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #1f6feb;
          opacity: 0.35;
          animation: loading-pulse 1s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.3s; }
        button {
          border: 1px solid #dfe4ea;
          border-radius: 8px;
          background: #fff;
          color: #1f2328;
          font: inherit;
          padding: 6px 10px;
          cursor: pointer;
        }
        button:hover { background: #f8fafc; }
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes loading-pulse {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          40% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
      </style>
      <div class="card">
        <div class="head">
          <div>
            <p class="title">${escapeHtml(title)}</p>
            <p class="meta">${escapeHtml(meta)}</p>
          </div>
          <button id="clear-btn" type="button">清除</button>
        </div>
        <div class="body">${
          isLoading
            ? `<div class="loading"><span class="loading-dots"><span></span><span></span><span></span></span><span>${escapeHtml(body)}</span></div>`
            : escapeHtml(body)
        }</div>
      </div>
    `;

    shadow.getElementById("clear-btn").addEventListener("click", () => {
      clearInlineArtifacts();
    });

    ensureRoot().appendChild(host);
  }

  function createInlineTranslationHost(translation, providerLabel) {
    const host = document.createElement("div");
    host.dataset.aiTranslatorInline = "true";
    host.dataset.aerolingoRoot = "true";
    host.style.display = "block";

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display: block; margin: 10px 0 18px; }
        .card {
          border: 1px solid #d8e6ff;
          border-left: 3px solid #1f6feb;
          border-radius: 10px;
          background: #f8fbff;
          padding: 12px 14px;
          color: #1f2328;
          font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
        }
        .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          background: #eaf2ff;
          color: #1f6feb;
          font-size: 11px;
          font-weight: 600;
        }
        .meta { color: #6b7280; font-size: 12px; }
        .body {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.75;
          font-size: 14px;
        }
      </style>
      <div class="card">
        <div class="head">
          <span class="badge">AI Translate</span>
          <span class="meta">${escapeHtml(providerLabel)}</span>
        </div>
        <div class="body">${escapeHtml(translation)}</div>
      </div>
    `;

    return host;
  }

  function updateInlineTranslationHost(host, translation, providerLabel) {
    const shadow = host.shadowRoot;
    if (!shadow) {
      return;
    }

    const metaNode = shadow.querySelector(".meta");
    const bodyNode = shadow.querySelector(".body");

    if (metaNode) {
      metaNode.textContent = providerLabel;
    }

    if (bodyNode) {
      bodyNode.textContent = translation;
    }
  }

  function hideBottomPanel() {
    if (pagePanel) {
      pagePanel.hidden = true;
    }
  }

  function getLoadingSkeleton() {
    return `
      <div class="alx-skeleton">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }

  function scrollNodeIntoView(node) {
    requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }

  function handleDocumentPointerDown(event) {
    if (selectionBubble && !selectionBubble.hidden && !selectionBubble.contains(event.target)) {
      selectionBubble.hidden = true;
    }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
