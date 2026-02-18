# Privacy Policy for Awe SubTranslate

Effective date: February 17, 2026

Awe SubTranslate ("the Extension") helps users translate webpage text and video subtitles. This policy explains what data is processed and how it is used.

## 1. Data We Process

The Extension may process:

1. Webpage visible text, selected text, and subtitle text
Purpose: to provide translation results.
2. User settings stored locally in the browser
Examples: target language, translation service, display theme, subtitle toggle, and service configuration (such as API keys, model, and base URL).
3. Local diagnostic logs
Used for local debugging in browser developer tools.

## 2. How Data Is Used

1. Data is used only to provide translation features requested by the user.
2. When the user starts translation, relevant text is sent directly to the selected third-party translation provider.
3. The developer does not use this data for advertising, profiling, or selling user data.

## 3. Third-Party Services

Depending on user choice, translation requests may be sent to:

- Google Translate
- Microsoft Translator
- DeepL
- OpenAI
- Anthropic Claude
- Google Gemini
- DeepSeek
- Zhipu GLM

No translation traffic is routed through a developer-owned backend server. Third-party handling of submitted data is governed by each provider's own terms and privacy policy.

## 4. Chrome Permissions and Why They Are Needed

- `storage`: save user preferences and service settings locally.
- `contextMenus`: provide right-click actions for page/selection translation.
- `activeTab`: perform translation actions on the current active tab after user interaction.
- `host_permissions (<all_urls>)`: allow translation on user-visited websites where content scripts must run.

## 5. Data Retention and Deletion

1. The developer does not store user translation content or API keys on developer servers.
2. Local settings are stored in `chrome.storage.local`.
3. Users can clear extension data via extension reset, browser data removal, or uninstalling the extension.
4. Data retention by third-party translation providers is controlled by those providers.

## 6. Security

The Extension uses HTTPS when communicating with translation providers. Users should avoid submitting highly sensitive content to online translation services.

## 7. Children

The Extension is not specifically directed to children under 13 and does not intentionally collect personal information from children.

## 8. Policy Updates

This policy may be updated to reflect product or compliance changes. The latest published version and effective date apply.

## 9. Contact

For privacy questions, please contact:

- GitHub Issues: https://github.com/cloveric/awe-subtranslate-chrome/issues

The Extension's data handling follows the Chrome Web Store User Data Policy, including applicable Limited Use requirements.
