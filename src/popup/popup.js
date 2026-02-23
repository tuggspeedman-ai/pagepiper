// PagePiper — Popup Logic (State Machine)
'use strict';

const STATES = ['default', 'loading', 'preview', 'success', 'error'];
let currentMarkdown = '';
let currentTabId = null;
let loadingTimeout = null;

// --- State Machine ---

const showState = (name) => {
  STATES.forEach((s) => {
    document.getElementById('state-' + s).classList.toggle('hidden', s !== name);
  });
};

// --- DOM Ready ---

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;

  currentTabId = tabs[0].id;
  const url = tabs[0].url || '';

  // Detect restricted pages
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
      url.startsWith('https://chrome.google.com/webstore') ||
      url.startsWith('https://chromewebstore.google.com') ||
      url === 'about:blank') {
    showError('Cannot clip this page. Chrome restricts extensions from accessing this type of page.');
    return;
  }

  // Check for active selection
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['src/content/selection-check.js']
    });

    if (results?.[0]?.result?.hasSelection) {
      const btnSelection = document.getElementById('btn-clip-selection');
      btnSelection.disabled = false;
      btnSelection.classList.add('active');
      document.getElementById('selection-hint').classList.add('hidden');
    }
  } catch (e) {
    // Injection failed — restricted page
    showError('Cannot clip this page.');
    return;
  }

  // Check for pending result from a previous clip (popup may have closed and reopened)
  const stored = await chrome.storage.session.get('lastClipResult');
  if (stored.lastClipResult?.action === 'clip-result') {
    handleClipResult(stored.lastClipResult);
    await chrome.storage.session.remove('lastClipResult');
  }

  // Wire buttons
  document.getElementById('btn-clip-page').addEventListener('click', () => {
    startClip('clip-page');
  });

  document.getElementById('btn-clip-selection').addEventListener('click', () => {
    startClip('clip-selection');
  });

  document.getElementById('btn-copy').addEventListener('click', copyToClipboard);

  document.getElementById('btn-cancel').addEventListener('click', () => {
    currentMarkdown = '';
    showState('default');
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    showState('default');
  });

  // Listen for results from background
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.lastClipResult?.newValue) {
      const msg = changes.lastClipResult.newValue;
      if (msg.action === 'clip-result') {
        handleClipResult(msg);
      } else if (msg.action === 'clip-error') {
        clearTimeout(loadingTimeout);
        showError(msg.data.error);
      }
    }
  });
});

// --- Clip Trigger ---

const startClip = (action) => {
  showState('loading');
  // Clear any stale result
  chrome.storage.session.remove('lastClipResult');

  chrome.runtime.sendMessage({
    action,
    data: { tabId: currentTabId }
  });

  // Timeout after 15 seconds
  loadingTimeout = setTimeout(() => {
    showError('Clipping timed out. The page may be too large or unresponsive.');
  }, 15000);
};

// --- Handle Result ---

const handleClipResult = (msg) => {
  clearTimeout(loadingTimeout);
  currentMarkdown = msg.data.markdown;

  const lines = currentMarkdown.split('\n').length;
  const chars = currentMarkdown.length;
  const modeLabel = msg.data.mode === 'selection' ? 'Selection' : 'Full page';

  document.getElementById('preview-stats').textContent =
    lines + ' lines | ' + chars.toLocaleString() + ' chars | ' + modeLabel;
  document.getElementById('preview-content').textContent = currentMarkdown;

  showState('preview');
};

// --- Clipboard ---

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(currentMarkdown);
    showSuccess();
  } catch (e) {
    // Fallback: ask background to use offscreen document
    chrome.runtime.sendMessage({
      action: 'copy-to-clipboard',
      data: { text: currentMarkdown }
    });
    showSuccess();
  }
};

const showSuccess = () => {
  showState('success');
  currentMarkdown = '';
  chrome.storage.session.remove('lastClipResult');

  setTimeout(() => {
    showState('default');
  }, 1500);
};

// --- Error ---

const showError = (msg) => {
  document.getElementById('error-message').textContent = msg;
  showState('error');
};
