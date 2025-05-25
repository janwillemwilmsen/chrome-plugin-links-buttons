function fetchFaqs() {
  fetch(chrome.runtime.getURL('faqs.json'))
    .then(r => r.json())
    .then(faqs => {
      const container = document.getElementById('faqContent');
      container.innerHTML = '';
      faqs.forEach(faq => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = faq.q;
        details.appendChild(summary);
        const p = document.createElement('p');
        p.textContent = faq.a;
        details.appendChild(p);
        container.appendChild(details);
      });
    });
}

function renderResults(data) {
  const list = document.getElementById('resultList');
  list.innerHTML = '';
  
  if (data.error) {
    const errorLi = document.createElement('li');
    errorLi.textContent = `Error: ${data.error}`;
    errorLi.style.color = 'red';
    list.appendChild(errorLi);
    return;
  }
  
  // Show truncation warning if data was truncated
  if (data.truncated) {
    const warningLi = document.createElement('li');
    warningLi.style.backgroundColor = '#fff3cd';
    warningLi.style.border = '1px solid #ffeaa7';
    warningLi.style.borderRadius = '5px';
    warningLi.style.padding = '10px';
    warningLi.style.marginBottom = '10px';
    warningLi.style.color = '#856404';
    
    const warningText = document.createElement('div');
    warningText.innerHTML = `
      <strong>⚠️ Data Truncated</strong><br>
      Showing ${data.processedCount || 0} of ${data.originalCount || 0} elements.<br>
      Some HTML content may be shortened due to size limits.<br>
      <small>Estimated size: ${Math.round((data.estimatedSize || 0) / 1024)} KB</small>
    `;
    warningLi.appendChild(warningText);
    list.appendChild(warningLi);
  }
  
  // Show deduplication info if applicable
  if (data.deduplicationInfo) {
    const dedupLi = document.createElement('li');
    dedupLi.style.backgroundColor = '#d1ecf1';
    dedupLi.style.border = '1px solid #bee5eb';
    dedupLi.style.borderRadius = '5px';
    dedupLi.style.padding = '10px';
    dedupLi.style.marginBottom = '10px';
    dedupLi.style.color = '#0c5460';
    
    const dedupText = document.createElement('div');
    dedupText.innerHTML = `
      <strong>🔗 Deduplication Applied</strong><br>
      Found ${data.deduplicationInfo.originalCount} elements, showing ${data.deduplicationInfo.uniqueCount} unique.<br>
      Removed ${data.deduplicationInfo.duplicatesRemoved} duplicates (prioritized Shadow DOM content).<br>
    `;
    dedupLi.appendChild(dedupText);
    list.appendChild(dedupLi);
  }
  
  (data.elements || []).forEach(item => {
    const li = document.createElement('li');
    li.style.marginBottom = '15px';
    li.style.padding = '10px';
    li.style.border = '1px solid #ddd';
    li.style.borderRadius = '5px';
    
    // Create main element info
    const mainInfo = document.createElement('div');
    mainInfo.style.fontWeight = 'bold';
    mainInfo.style.marginBottom = '8px';
    
    let displayText = `[${item.tag}] ${item.text || item.href || 'No text'}`;
    if (item.isWebComponent) displayText += ' (Web Component)';
    if (item.inShadowDom) displayText += ' (Shadow DOM)';
    if (item.inSlot) displayText += ' (Slot)';
    
    // Show if this element was deduplicated
    if (item.originalId !== undefined && item.originalId !== item.id) {
      displayText += ` [Deduplicated: was #${item.originalId}]`;
    }
    
    mainInfo.textContent = displayText;
    li.appendChild(mainInfo);
    
    // Create details section
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'View HTML & Details';
    summary.style.cursor = 'pointer';
    summary.style.color = '#0066cc';
    details.appendChild(summary);
    
    const detailsContent = document.createElement('div');
    detailsContent.style.marginTop = '10px';
    detailsContent.style.fontSize = '12px';
    
    // Add comprehensive information
    const sections = [];
    
    // Basic information
    sections.push(`<strong>Basic Info:</strong>`);
    sections.push(`ID: ${item.id}${item.originalId !== undefined && item.originalId !== item.id ? ` (was ${item.originalId})` : ''}`);
    sections.push(`Tag: ${item.tag}`);
    sections.push(`Text: ${item.text || 'None'}`);
    sections.push(`Href: ${item.href || 'None'}`);
    
    // Show what type of HTML was captured and why
    if (item.relevantHtml) {
      sections.push(`<br><strong>HTML Source:</strong>`);
      sections.push(`Type: ${item.relevantHtml.reason}`);
      sections.push(`Description: ${item.relevantHtml.description}`);
    }
    
    // CSS positioning info
    if (item.hasAbsolutePosition || item.hasFixedPosition || item.hasRelativePosition) {
      sections.push(`<br><strong>CSS Positioning:</strong>`);
      sections.push(`Position: ${item.computedStyles?.position || 'static'}`);
      sections.push(`Has Absolute: ${item.hasAbsolutePosition}`);
      sections.push(`Has Fixed: ${item.hasFixedPosition}`);
      sections.push(`Has Relative: ${item.hasRelativePosition}`);
    }
    
    // Pseudo-element info
    if (item.hasPseudoElements) {
      sections.push(`<br><strong>Pseudo Elements:</strong>`);
      sections.push(`Has Pseudo: ${item.hasPseudoElements}`);
      if (item.pseudoElementInfo) {
        sections.push(`Before Absolute: ${item.pseudoElementInfo.beforeAbsolute}`);
        sections.push(`After Absolute: ${item.pseudoElementInfo.afterAbsolute}`);
      }
    }
    
    // JavaScript handler info
    if (item.hasJsHandlers || item.hasJsHref) {
      sections.push(`<br><strong>JavaScript Handlers:</strong>`);
      sections.push(`Has JS Handlers: ${item.hasJsHandlers}`);
      sections.push(`Has JS Href: ${item.hasJsHref}`);
    }
    
    // Shadow DOM info
    if (item.inShadowDom) {
      sections.push(`<br><strong>Shadow DOM:</strong>`);
      sections.push(`In Shadow DOM: ${item.inShadowDom}`);
      sections.push(`Shadow Host: ${item.shadowHost || 'Unknown'}`);
    }
    
    // Web component info
    if (item.inWebComponent || item.isWebComponent) {
      sections.push(`<br><strong>Web Components:</strong>`);
      sections.push(`In Web Component: ${item.inWebComponent}`);
      sections.push(`Is Web Component: ${item.isWebComponent}`);
    }
    
    // Slot info
    if (item.inSlot) {
      sections.push(`<br><strong>Slots:</strong>`);
      sections.push(`In Slot: ${item.inSlot}`);
    }
    
    detailsContent.innerHTML = sections.join('<br>');
    details.appendChild(detailsContent);
    
    // Add the single relevant HTML section
    if (item.relevantHtml && item.relevantHtml.html) {
      const htmlSection = createHtmlSection(
        `Relevant HTML (${item.relevantHtml.reason})`, 
        item.relevantHtml.html
      );
      details.appendChild(htmlSection);
    } else if (data.truncated) {
      // Show message if HTML was removed due to size limits
      const noHtmlMessage = document.createElement('div');
      noHtmlMessage.style.marginTop = '10px';
      noHtmlMessage.style.padding = '8px';
      noHtmlMessage.style.backgroundColor = '#f8f9fa';
      noHtmlMessage.style.border = '1px solid #dee2e6';
      noHtmlMessage.style.borderRadius = '3px';
      noHtmlMessage.style.fontSize = '12px';
      noHtmlMessage.style.color = '#6c757d';
      noHtmlMessage.textContent = 'HTML removed due to size constraints.';
      details.appendChild(noHtmlMessage);
    }
    
    li.appendChild(details);
    
    // Add click handler for console logging
    li.addEventListener('click', (e) => {
      if (e.target.tagName !== 'SUMMARY') {
        console.log('=== ELEMENT ANALYSIS ===');
        console.log('Element:', item);
        if (item.relevantHtml) {
          console.log('=== RELEVANT HTML ===');
          console.log(`Type: ${item.relevantHtml.reason}`);
          console.log(`Description: ${item.relevantHtml.description}`);
          console.log('HTML:', item.relevantHtml.html);
        }
      }
    });
    
    list.appendChild(li);
  });
  
  const count = Array.isArray(data.elements) ? data.elements.length : 0;
  const totalCount = data.originalCount || count;
  
  let countText = `Items found: ${count}`;
  if (data.truncated && totalCount > count) {
    countText += ` (${totalCount} total, showing ${count})`;
  }
  
  // Add deduplication info to count text
  if (data.deduplicationInfo && data.deduplicationInfo.duplicatesRemoved > 0) {
    countText += ` • ${data.deduplicationInfo.duplicatesRemoved} duplicates removed`;
  }
  
  document.getElementById('counts').textContent = countText;
}

function createHtmlSection(title, html) {
  const section = document.createElement('details');
  section.style.marginTop = '10px';
  
  const summary = document.createElement('summary');
  summary.textContent = title;
  summary.style.cursor = 'pointer';
  summary.style.color = '#0066cc';
  summary.style.fontWeight = 'bold';
  section.appendChild(summary);
  
  const content = document.createElement('pre');
  content.style.background = '#f5f5f5';
  content.style.padding = '10px';
  content.style.borderRadius = '3px';
  content.style.fontSize = '11px';
  content.style.overflow = 'auto';
  content.style.maxHeight = '200px';
  content.style.whiteSpace = 'pre-wrap';
  content.style.wordBreak = 'break-all';
  
  // Format HTML for better readability
  try {
    content.textContent = formatHtml(html);
  } catch (e) {
    content.textContent = html;
  }
  
  section.appendChild(content);
  return section;
}

function formatHtml(html) {
  // Simple HTML formatting
  return html
    .replace(/></g, '>\n<')
    .replace(/^\s+|\s+$/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

function showLoading() {
  document.getElementById('counts').textContent = 'Loading...';
  const list = document.getElementById('resultList');
  if (list) list.innerHTML = '';
}

// Wait until the given tab has finished loading
function waitForTabComplete(tabId) {
  return new Promise(resolve => {
    chrome.tabs.get(tabId, tab => {
      if (!tab || tab.status === 'complete') {
        resolve();
        return;
      }
      const listener = (updatedId, info) => {
        if (updatedId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

  });
}

// Fetch link/button data from the active tab
async function requestData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  showLoading();
  await waitForTabComplete(tab.id);
  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, renderResults);
}

function reloadTabAndWait(tabId) {
  return new Promise(resolve => {
    const listener = (updatedId, info) => {
      if (updatedId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.reload(tabId, { bypassCache: true }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

async function handleReload() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  showLoading();
  await reloadTabAndWait(tab.id);

}

// Fetch link/button data from the active tab
async function requestData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await waitForTabComplete(tab.id);
  // Give dynamic pages a moment to render additional content
  await new Promise(r => setTimeout(r, 1000));
  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, renderResults);
}

async function handleReload() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const done = waitForTabComplete(tab.id);
  chrome.tabs.reload(tab.id, { bypassCache: true });
  await done;
  await new Promise(r => setTimeout(r, 1000));

  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, renderResults);
}

document.getElementById('reload').addEventListener('click', handleReload);

chrome.runtime.onMessage.addListener(message => {
  if (message.action === 'page-navigated') {
    requestData();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  requestData();
  fetchFaqs();
});
