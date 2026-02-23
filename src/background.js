// PagePiper — Background Service Worker
// Handles context menus, keyboard shortcuts, and content script injection

'use strict';

// --- Context Menu ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-selection-md',
    title: 'Clip selection as Markdown',
    contexts: ['selection']
  });
});

// --- Core Injection ---

const performClip = async (tabId, mode) => {
  try {
    // Step 1: Inject vendored libraries
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['libs/Readability.js', 'libs/turndown.browser.umd.js']
    });

    // Step 2: Set mode flag
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (m) => { window.__pagepiper_mode = m; },
      args: [mode]
    });

    // Step 3: Inject clip content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/clip.js']
    });
  } catch (e) {
    // Injection failed (restricted page, etc.)
    chrome.storage.session.set({
      lastClipResult: {
        action: 'clip-error',
        data: { error: 'Cannot clip this page. ' + (e.message || '') }
      }
    });
    showBadge('!', '#f44747', tabId);
  }
};

// --- Keyboard Shortcuts ---

chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;

  const mode = command === 'clip-selection' ? 'selection' : 'full';
  await performClip(tabs[0].id, mode);
});

// --- Context Menu Click ---

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'clip-selection-md') {
    await performClip(tab.id, 'selection');
  }
});

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'check-selection') {
    handleCheckSelection(message.data.tabId).then(sendResponse);
    return true; // async response
  }

  if (message.action === 'clip-page' || message.action === 'clip-selection') {
    const mode = message.action === 'clip-selection' ? 'selection' : 'full';
    performClip(message.data.tabId, mode);
  }

  if (message.action === 'copy-to-clipboard') {
    writeClipboardViaOffscreen(message.data.text);
  }

  // Forward clip results from content script to session storage
  if (message.action === 'clip-result' || message.action === 'clip-error') {
    chrome.storage.session.set({ lastClipResult: message });

    // For shortcut/context-menu flows: write clipboard directly and show badge
    if (!message._fromPopup && message.action === 'clip-result') {
      writeClipboardViaOffscreen(message.data.markdown);
      showBadge('OK', '#4ec9b0', sender.tab ? sender.tab.id : null);
    }
    if (message.action === 'clip-error') {
      showBadge('!', '#f44747', sender.tab ? sender.tab.id : null);
    }
  }
});

// --- Selection Check ---

const handleCheckSelection = async (tabId) => {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/selection-check.js']
    });
    if (results?.[0]?.result) {
      return results[0].result;
    }
  } catch (e) {
    // Restricted page
  }
  return { hasSelection: false, selectionText: '' };
};

// --- Badge Feedback ---

const showBadge = (text, color, tabId) => {
  const opts = { text };
  if (tabId) opts.tabId = tabId;
  chrome.action.setBadgeText(opts);
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => {
    const clearOpts = { text: '' };
    if (tabId) clearOpts.tabId = tabId;
    chrome.action.setBadgeText(clearOpts);
  }, 2000);
};

// --- Offscreen Clipboard Fallback ---

const writeClipboardViaOffscreen = async (text) => {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Write markdown to clipboard'
    });
  }

  chrome.runtime.sendMessage({
    action: 'write-clipboard',
    data: { text }
  });
};
