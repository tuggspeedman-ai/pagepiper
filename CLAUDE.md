# CLAUDE.md

## Project: PagePiper Chrome Extension

A Chrome extension that converts web pages to clean markdown and copies to clipboard. Uses Readability.js for content extraction and Turndown.js for HTML-to-markdown conversion.

### Key Constraints
- Manifest V3 only (no Manifest V2 patterns)
- Service workers, NOT background pages
- Cannot use remote code (all JS must be bundled locally)
- Use `chrome.scripting.executeScript()` not `chrome.tabs.executeScript()`
- Libraries injected programmatically on-demand (NOT declared in manifest content_scripts)
- Clipboard access requires `clipboardWrite` permission
- Readability.js and Turndown.js must be vendored into the extension (no CDN)
- No inline scripts in extension pages (MV3 CSP requirement)
- All event binding via `addEventListener`, never inline handlers
- Modern JS throughout: `const`/`let`, arrow functions, optional chaining

### Architecture
- `/src` — source code (background.js, popup/, content/, offscreen/)
- `/libs` — vendored libraries (Readability.js, turndown.browser.umd.js)
- `/icons` — extension icons (16, 32, 48, 128px PNGs)
- `manifest.json` at root

### Key Patterns
- Programmatic injection via `chrome.scripting.executeScript()` — libs load only when user triggers a clip
- `activeTab` permission for minimal privilege
- `chrome.storage.session` as intermediary between content scripts and popup (eliminates race conditions)
- Three-step injection: libs → mode flag via `func` → clip.js
- Offscreen document as clipboard fallback for HTTP pages

### Markdown Cleanup Pipeline
The `cleanupMarkdown()` function in `clip.js` post-processes Turndown output:
- Breaks numbered lists into separate lines (with capital letter guard against false positives)
- Strips "Advertisement" lines from news sites
- Strips photo agency credits (Getty, AP, Reuters, etc.) with optional trailing attribution
- Collapses excessive blank lines

### Custom Turndown Rules
- `removeImages` — strips all `<img>` tags
- `removeEmptyLinks` — strips `<a>` tags with no visible text
- `tables` — converts `<table>` to GFM markdown tables
- `absoluteLinks` — resolves relative URLs to absolute, prefers real URLs over t.co trackers
