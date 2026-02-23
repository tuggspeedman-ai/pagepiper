// PagePiper — Offscreen Document for Clipboard Fallback
'use strict';

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'write-clipboard') return;

  navigator.clipboard.writeText(message.data.text).catch(() => {
    // Last resort: textarea + execCommand (deprecated but functional fallback)
    const textarea = document.createElement('textarea');
    textarea.value = message.data.text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
});
