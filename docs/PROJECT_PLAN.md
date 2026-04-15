# AI-Translator - 首版规划

## 目标

开发一个基于 Chrome Manifest V3 的 AI 翻译扩展，满足以下核心体验：

1. 右键启动划词翻译，结果以悬浮卡片显示在选区附近。
2. 右键启动全文翻译，结果支持显示在原文下方，或显示为页面底部抽屉。
3. 首版默认接入 DeepSeek，同时支持配置 OpenAI。
4. 提供简洁但够用的配置菜单。

## 架构选择

- 使用原生 MV3 扩展结构，不增加构建步骤，便于直接 `Load unpacked` 调试。
- API 请求统一放在后台 `service worker` 中，避免网页上下文直接触达密钥和远端接口。
- 页面内展示交给 `content script`，便于在任意普通网页中渲染浮层和底部面板。
- 配置保存在 `chrome.storage.local`，避免 API Key 默认被同步。

## 首版能力范围

### 必做

- 右键菜单启动划词翻译
- 右键菜单启动全文翻译
- DeepSeek 默认配置可直接填写使用
- OpenAI 配置支持
- Popup 菜单
- Options 设置页
- 页面内悬浮卡片
- 页面内全文翻译区块
- 页面底部翻译抽屉

### 首版配置项

- 当前服务商：`DeepSeek` / `OpenAI`
- API Key
- Base URL
- 模型名
- 源语言
- 目标语言
- 翻译风格
- Temperature
- 划词最大字符数
- 全文最大字符数
- 全文显示位置

## API 适配方案

### DeepSeek

- 默认 Base URL：`https://api.deepseek.com`
- 默认模型：`deepseek-chat`
- 请求路径：`/chat/completions`

### OpenAI

- 默认 Base URL：`https://api.openai.com/v1`
- 默认模型：`gpt-4.1-mini`
- 请求路径：`/chat/completions`

### 统一策略

- 两个服务商首版统一走 Chat Completions 风格请求。
- 使用统一的 `model + messages + temperature` 请求体。
- Prompt 严格要求“只返回译文”，降低解析复杂度。
- Base URL 与模型名保持可编辑，避免被单一版本锁死。

## 交互流程

1. 用户选中文本或在页面中右键。
2. 后台脚本接收右键菜单事件。
3. 内容脚本先展示 loading 浮层或全文容器，并在全文模式下提取正文。
4. 后台脚本读取设置并调用目标 AI 服务商。
5. 结果返回内容脚本，渲染到页面内。

## 工程结构

```text
AI-Translator/
  manifest.json
  README.md
  docs/PROJECT_PLAN.md
  assets/icons/
  src/
    background/
      api-client.js
      prompts.js
      service-worker.js
      storage.js
    content/
      content.css
      content.js
    options/
      options.css
      options.html
      options.js
    popup/
      popup.css
      popup.html
      popup.js
    shared/
      defaults.js
```

## 后续可增强项

- 流式翻译
- 历史记录
- 术语表 / 站点级偏好
- 更强的正文提取策略
- 双语对照模式
