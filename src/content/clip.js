// PagePiper — Content Script: Extract page/selection and convert to markdown
(() => {
  'use strict';

  const mode = window.__pagepiper_mode || 'full';
  delete window.__pagepiper_mode;

  const truncateTitle = (title) => {
    // Strip common suffixes like " / X", " - YouTube", " | Medium"
    title = title.replace(/\s*[/|–—-]\s*(?:X|Twitter)\s*$/, '');

    if (title.length <= 80) return title;

    // Truncate at word boundary before 80 chars
    const truncated = title.substring(0, 80);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) return truncated.substring(0, lastSpace) + '...';
    return truncated + '...';
  };

  const buildHeader = (title, url) => {
    const date = new Date().toISOString().split('T')[0];
    return '# ' + truncateTitle(title) + '\n' +
      '**Source:** ' + url + '\n' +
      '**Clipped:** ' + date + '\n\n---\n\n';
  };

  const createTurndown = () => {
    const td = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      br: '\n'
    });

    // Strip images — keep text clean
    td.addRule('removeImages', {
      filter: 'img',
      replacement: () => ''
    });

    // Strip links that have no visible text (e.g. image-only links, avatar links)
    td.addRule('removeEmptyLinks', {
      filter: (node) => node.nodeName === 'A' && node.textContent.trim() === '',
      replacement: () => ''
    });

    // Convert HTML tables to GFM markdown tables
    td.addRule('tables', {
      filter: 'table',
      replacement: (content, node) => {
        const rows = node.querySelectorAll('tr');
        if (!rows.length) return content;

        const tableData = [];
        let maxCols = 0;

        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('th, td');
          const rowData = [];
          for (let j = 0; j < cells.length; j++) {
            rowData.push(cells[j].textContent.trim().replace(/\|/g, '\\|').replace(/\n/g, ' '));
          }
          if (rowData.length > maxCols) maxCols = rowData.length;
          tableData.push(rowData);
        }

        if (tableData.length === 0 || maxCols === 0) return content;

        // Pad rows to same column count
        for (const row of tableData) {
          while (row.length < maxCols) row.push('');
        }

        const lines = [];
        lines.push('| ' + tableData[0].join(' | ') + ' |');
        const sep = [];
        for (let k = 0; k < maxCols; k++) sep.push('---');
        lines.push('| ' + sep.join(' | ') + ' |');
        for (let d = 1; d < tableData.length; d++) {
          lines.push('| ' + tableData[d].join(' | ') + ' |');
        }

        return '\n\n' + lines.join('\n') + '\n\n';
      }
    });

    // Resolve relative links to absolute URLs
    td.addRule('absoluteLinks', {
      filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
      replacement: (content, node) => {
        let href = node.getAttribute('href');
        const text = content.trim();
        if (!text) return '';

        // Resolve relative URLs to absolute
        if (href && !href.match(/^https?:\/\//)) {
          try {
            href = new URL(href, window.location.origin).href;
          } catch (e) { /* malformed URL, keep original href */ }
        }

        // If link text looks like a URL, prefer it over tracker URLs (e.g. t.co)
        if (text.match(/^https?:\/\//) && href.match(/\/\/t\.co\//)) {
          href = text;
        }

        return '[' + text + '](' + href + ')';
      }
    });

    return td;
  };

  const cleanupMarkdown = (md) => {
    // Break numbered lists into separate lines — require capital letter after number to avoid
    // false positives like "Feb. 20." being treated as a list item
    md = md.replace(/([.!?:)"'\u201D]) (\d+\. [A-Z])/g, '$1\n\n$2');

    // Strip "Advertisement" lines (common on news sites)
    md = md.replace(/^\s*Advertisement\s*$/gm, '');

    // Strip photo/image captions: "(Name/Agency via Getty Images)" and similar, with optional trailing credit
    md = md.replace(/^\s*\((?:[A-Z][\w\s.'-]*(?:\/[\w\s.'-]+)*\s+via\s+)?(?:Getty Images|AP|Reuters|AFP|AP Photo|Shutterstock|Alamy|Bloomberg|Agence[^)]*)\)(?:\s*[·|]?\s*[A-Z\w].*)?$/gm, '');

    // Strip standalone parenthetical photo credits (e.g. "(Photo by Name/Agency)")
    md = md.replace(/^\s*\((?:Photo|Image|Illustration|Credit)[s]?\s*(?:by|:)\s*[^)]+\)(?:\s*[·|]?\s*[A-Z\w].*)?$/gm, '');

    // Collapse 3+ consecutive blank lines into 2
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
  };

  const clipFullPage = () => {
    const docClone = document.cloneNode(true);
    let article = null;

    try {
      article = new Readability(docClone).parse();
    } catch (e) {
      // Readability threw — fall through to fallback
    }

    const title = article?.title || document.title || 'Untitled';
    const html = article?.content || document.body.innerHTML;

    const markdown = cleanupMarkdown(createTurndown().turndown(html));
    return buildHeader(title, window.location.href) + markdown;
  };

  const clipSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      return null;
    }

    const container = document.createElement('div');
    for (let i = 0; i < sel.rangeCount; i++) {
      container.appendChild(sel.getRangeAt(i).cloneContents());
    }

    const html = container.innerHTML;
    const title = document.title || 'Untitled';
    const markdown = cleanupMarkdown(createTurndown().turndown(html));
    return buildHeader(title, window.location.href) + markdown;
  };

  // Execute
  let result = null;
  let error = null;

  try {
    if (mode === 'selection') {
      result = clipSelection();
      if (!result) {
        error = 'No text selected';
      }
    } else {
      result = clipFullPage();
    }
  } catch (e) {
    error = e.message || 'Failed to clip page';
  }

  if (error) {
    chrome.runtime.sendMessage({
      action: 'clip-error',
      data: { error }
    });
  } else {
    chrome.runtime.sendMessage({
      action: 'clip-result',
      data: {
        markdown: result,
        title: document.title,
        url: window.location.href,
        mode
      }
    });
  }
})();
