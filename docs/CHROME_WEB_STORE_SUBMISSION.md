# Chrome Web Store Submission Pack

Last updated: 2026-04-15

This file collects the text and materials needed to submit AI-Translator to the Chrome Web Store.

## Package to upload

- Upload a `.zip` package
- Keep `manifest.json` at the root of the zip
- Suggested file: `AI-Translator-webstore-v0.1.4.zip`

## Basic listing

### Product name

- `AI-Translator`

### Summary

- `使用 DeepSeek 或 OpenAI 快速翻译划词和整页内容，支持右键启动、段落对照和底部悬浮展示。`

### Category

- `Productivity`

### Language

- `Chinese (Simplified)`

## Detailed description

`AI-Translator` 是一个面向日常阅读场景的 Chrome AI 翻译插件，支持划词翻译和全文翻译，并允许用户在 DeepSeek 与 OpenAI 兼容接口之间切换。

主要能力：

- 右键直接翻译当前文本
- 右键直接翻译当前页面
- 划词结果就地悬浮展示
- 全文结果支持段落对照
- 全文结果支持底部悬浮面板
- 支持自定义 API Key、Base URL、模型名
- 支持源语言、目标语言和全文显示方式配置

适用场景：

- 阅读英文技术文档
- 快速查看外文网页
- 对照原文理解段落内容
- 使用自有 AI 服务账号完成网页翻译

## Single purpose description

- `Translate selected text and full web pages with a user-configured AI provider.`

## Privacy policy URL

If the repository is public, use one of the following URLs:

- `https://github.com/zhangzhenggit/AI-Translator/blob/main/PRIVACY_POLICY.md`
- `https://raw.githubusercontent.com/zhangzhenggit/AI-Translator/main/PRIVACY_POLICY.md`

Recommended:

- use the `raw.githubusercontent.com` URL if the dashboard accepts it cleanly

## Support URL

- `https://github.com/zhangzhenggit/AI-Translator/issues`

## Homepage URL

- `https://github.com/zhangzhenggit/AI-Translator`

## Permissions justification

### `contextMenus`

- used to add right-click translation entries for selected text and the current page

### `activeTab`

- used to operate on the currently active tab when the user starts a translation action

### `scripting`

- used to ensure the content script is available in the current tab

### `storage`

- used to store API configuration and translation preferences locally

### Host permissions

- `https://api.deepseek.com/*`
- `https://api.openai.com/*`

Justification:

- used only to call the user-configured AI translation provider APIs

## Suggested privacy disclosures

Review these carefully in the Chrome Web Store dashboard before submitting.

### Data handled by the extension

- website content
- user-provided API key and provider settings

### Suggested answers

- Data is used only to provide the translation feature requested by the user
- Data is not sold
- Data is not used for creditworthiness or lending purposes
- Data is not used for advertising or user profiling
- Data is not transferred to the developer's own server

### Important review note

The extension sends selected text or page text to the AI provider chosen by the user. This is the core product behavior and should be disclosed conservatively in the dashboard.

## Reviewer test instructions

1. Open the extension popup.
2. Enter a valid DeepSeek or OpenAI compatible API key.
3. Save settings.
4. Open any normal web page with visible text.
5. Right click selected text and choose `AI Translate: 翻译当前文本`.
6. Right click the page and choose `AI Translate: 翻译当前页面`.
7. In settings, switch full-page display between `段落对照` and `底部悬浮` to verify both modes.

## Store assets

Prepared assets in [store-assets](../store-assets):

- `small-promo-440x280.png`
- `marquee-1400x560.png`

Screenshots still need to be captured from the running extension because store screenshots should reflect the actual product UI.

Recommended screenshots:

1. popup configuration page
2. options page with provider configuration
3. selection translation floating result
4. full-page translation in `段落对照` mode
5. full-page translation in `底部悬浮` mode

## Pre-submit checklist

- repository is public if GitHub URLs are used
- privacy policy URL is reachable without login
- zip package opens with `manifest.json` at the root
- screenshots are real product screenshots
- API key is removed from all screenshots
- version number is correct before upload

