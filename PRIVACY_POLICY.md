# Privacy Policy

Last updated: 2026-04-15

AI-Translator is a Chrome extension used to translate selected text and full web pages with user-configured AI providers such as DeepSeek and OpenAI.

## What the extension stores

The extension stores the following settings locally in `chrome.storage.local`:

- selected AI provider
- API key entered by the user
- provider base URL
- model name
- translation preferences such as source language, target language, and display mode

This data stays in the user's browser profile unless the user removes it or uninstalls the extension.

## What the extension sends

When the user manually triggers translation, the extension sends the minimum text needed for that request to the configured provider:

- selected text for selection translation
- extracted page text or page blocks for full-page translation
- the configured model and request parameters

The extension sends requests only to the provider endpoint configured by the user, such as:

- `https://api.deepseek.com`
- `https://api.openai.com`

## What the extension does not do

AI-Translator does not:

- collect browsing history for analytics
- sell user data
- use advertising trackers
- send data to any server controlled by the extension developer
- upload page content unless the user explicitly starts a translation request

## Third-party services

Translation requests are processed by the AI provider selected by the user. The handling of translated content, prompts, and API keys by that provider is governed by the provider's own terms and privacy policy.

Users should review the relevant provider policies before use.

## Data retention

The extension itself does not maintain a remote database and does not retain translated content on developer-owned servers.

Locally stored settings remain on the device until changed or removed by the user.

## Security note

API keys are stored locally in the browser storage area used by the extension. Users are responsible for protecting access to their browser profile and device.

## Contact

Project repository:

- `https://github.com/zhangzhenggit/AI-Translator`

