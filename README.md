# AI-Translator

一个可直接加载到 Chrome 的 AI 翻译扩展，支持 DeepSeek / OpenAI 配置、右键翻译、划词悬浮结果，以及全文双语对照或底部悬浮展示。

## 功能

- DeepSeek 默认接入，支持自定义 Base URL 和模型
- 支持 OpenAI 兼容配置
- 右键划词翻译，结果悬浮显示
- 右键全文翻译
- 全文支持 `段落对照` 和 `底部悬浮` 两种展示方式
- Popup 弹窗用于快速保存和测试配置
- Options 页面用于完整参数配置

## 工程说明

项目规划见 [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md)。

## Chrome 加载

1. 打开 `chrome://extensions`
2. 开启 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 选择当前 `AI-Translator` 目录
5. 修改代码后，在扩展页点击 `重新加载`

## 推荐配置

- 服务商：`DeepSeek`
- DeepSeek Base URL：`https://api.deepseek.com`
- DeepSeek 模型：`deepseek-chat`
- OpenAI Base URL：`https://api.openai.com/v1`
- OpenAI 模型：`gpt-4.1-mini`

## 使用方式

1. 打开扩展弹窗，填写 API Key。
2. 点击 `保存` 或 `测试`。
3. 在网页中右键：
   `AI Translate: 翻译当前文本`
   `AI Translate: 翻译当前页面`
4. 全文翻译展示位置可在设置中切换：
   `段落对照`
   `底部悬浮`

## 配置说明

- API Key 保存在 `chrome.storage.local`
- 当前弹窗提供基础配置和连接测试
- 更多翻译参数可在 `设置页` 中调整
- 当前实现基于 Chat Completions 兼容接口

## 目录

```text
AI-Translator/
  manifest.json
  README.md
  docs/PROJECT_PLAN.md
  assets/icons/
  src/
    background/
    content/
    options/
    popup/
    shared/
```

## 参考文档

- DeepSeek：https://api-docs.deepseek.com/zh-cn/
- OpenAI：https://developers.openai.com/
