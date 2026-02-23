# Privacy Policy — PagePiper

**Last updated:** 2026-02-23

## Overview

PagePiper is a Chrome extension that converts web pages to clean markdown and copies the result to your clipboard. It is designed with privacy as a core principle.

## Data Collection

PagePiper does **not** collect, store, transmit, or share any user data. Specifically:

- **No analytics or tracking** — No usage data, telemetry, or analytics of any kind
- **No network requests** — All processing happens locally in your browser. PagePiper makes zero network calls
- **No accounts or sign-in** — No registration, authentication, or user accounts
- **No external services** — No APIs, servers, or cloud infrastructure. Everything runs on-device
- **No browsing history** — PagePiper does not read or record your browsing history

## How It Works

When you activate PagePiper (via the toolbar button, keyboard shortcut, or context menu), it:

1. Reads the content of the **current active tab only** (using the `activeTab` permission, which requires explicit user action)
2. Extracts the article content locally using Mozilla's Readability.js
3. Converts the HTML to markdown locally using Turndown.js
4. Copies the result to your clipboard

All processing happens entirely within your browser. No page content ever leaves your device.

## Permissions

| Permission | Why It's Needed |
|---|---|
| `activeTab` | Access the current page content when you click the extension |
| `scripting` | Inject the content extraction scripts into the active tab |
| `storage` | Pass clipping results between the content script and popup (session storage only, not persisted) |
| `clipboardWrite` | Write the markdown result to your clipboard |
| `contextMenus` | Add "Clip selection as Markdown" to the right-click menu |
| `offscreen` | Clipboard fallback for HTTP pages where the Clipboard API is unavailable |

## Data Retention

PagePiper uses `chrome.storage.session` to temporarily hold clipping results between the content script and popup UI. This data:

- Exists only in memory (not written to disk)
- Is cleared when the browser session ends
- Is cleared after each successful copy operation
- Contains only the markdown text generated from the page you clipped

## Third-Party Libraries

PagePiper bundles two open-source libraries locally (no CDN, no external loading):

- [Readability.js](https://github.com/mozilla/readability) (Mozilla, Apache 2.0)
- [Turndown.js](https://github.com/mixmark-io/turndown) (MIT)

Neither library makes any network requests.

## Changes

If this policy changes, the update will be posted here with a revised date.

## Contact

For questions about this privacy policy, open an issue at [github.com/tuggspeedman-ai/pagepiper](https://github.com/tuggspeedman-ai/pagepiper/issues).
