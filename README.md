# PagePiper

A Chrome extension that converts web pages to clean markdown and copies to clipboard. Clip full pages or just your selection - perfect for saving articles to Obsidian, Notion, or any markdown-based tool.

---

## How it works

PagePiper uses [Mozilla's Readability.js](https://github.com/mozilla/readability) to extract article content from any web page, then converts it to clean markdown with [Turndown.js](https://github.com/mixmark-io/turndown). Everything runs locally — no API calls, no accounts, no data leaves your browser.

```
Click extension icon (or keyboard shortcut)
  → Readability.js extracts article content from the page
  → Turndown.js converts HTML to clean markdown
  → Preview the result in the popup
  → Copy to clipboard with one click
```

### Output format

Every clip produces:

```markdown
# Article Title
**Source:** https://example.com/article
**Clipped:** 2026-02-23

---

Clean markdown content here...
```

## Features

| Feature | Details |
|---------|---------|
| **Full page clip** | Extracts article content via Readability, strips ads/nav/sidebars |
| **Selection clip** | Clip just the text you've highlighted on the page |
| **Keyboard shortcuts** | `Alt+Shift+C` (full page), `Alt+Shift+S` (selection) |
| **Context menu** | Right-click selected text → "Clip selection as Markdown" |
| **Preview before copy** | See the markdown output before it hits your clipboard |
| **Smart cleanup** | Strips images, ads, photo credits, tracker URLs, empty links |
| **Table support** | HTML tables convert to proper GFM markdown tables |
| **Absolute links** | Relative URLs are resolved to full absolute URLs |
| **Works offline** | All libraries bundled locally, no external dependencies |

## Architecture

```
manifest.json                    # MV3 manifest
src/
├── background.js                # Service worker — orchestration, context menus, shortcuts
├── popup/
│   ├── popup.html               # Popup UI — buttons, preview, status indicators
│   ├── popup.css                # Dark theme (VS Code-inspired)
│   └── popup.js                 # State machine: default → loading → preview → success
├── content/
│   ├── clip.js                  # Core clipping — Readability + Turndown + cleanup pipeline
│   └── selection-check.js       # Checks if text is selected (enables selection button)
└── offscreen/
    ├── offscreen.html           # Clipboard fallback for HTTP pages
    └── offscreen.js
libs/
├── Readability.js               # Vendored from @mozilla/readability v0.6.0
└── turndown.browser.umd.js      # Vendored from turndown v7.2.2
icons/
└── icon-{16,32,48,128}.png
```

### Key design decisions

- **Programmatic injection** — Libraries (~120KB) are injected on-demand via `chrome.scripting.executeScript`, not on every page load
- **`activeTab` permission** — Only gets access to a tab when the user explicitly triggers the extension
- **Session storage intermediary** — `chrome.storage.session` passes results between content scripts and the popup, eliminating race conditions
- **Offscreen clipboard fallback** — Handles clipboard writes on HTTP pages where the Clipboard API isn't available

### Markdown cleanup pipeline

After Turndown converts HTML to markdown, a cleanup pipeline handles common noise:

- Breaks numbered lists into separate lines (with guards against false positives like dates)
- Strips "Advertisement" lines from news sites
- Strips photo agency credits (Getty, AP, Reuters, etc.)
- Resolves relative links to absolute URLs
- Replaces t.co tracker URLs with the actual destination URL
- Truncates overly long page titles (e.g. full tweet text in `<title>` tags)
- Collapses excessive blank lines

## Install (local development)

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the repo directory
5. The PagePiper icon appears in your toolbar

### Updating vendored libraries

```bash
./scripts/vendor.sh
```

This pulls the latest Readability.js and Turndown from npm into `libs/`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Extension format | Chrome Manifest V3 |
| Content extraction | Readability.js (Mozilla) |
| HTML → Markdown | Turndown.js |
| UI | Vanilla HTML/CSS/JS, dark theme |
| Clipboard | Clipboard API + offscreen document fallback |
| Build | Zero build step — plain JS, no bundler |

## License

MIT
