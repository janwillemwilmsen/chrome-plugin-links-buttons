// Content script: Listens for a message from the side panel, gathers all links/buttons (with shadow DOM), and sends the data back

function getAllElements(root = document) {
  let elements = [];
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  let node = treeWalker.currentNode;
  while(node) {
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      elements.push(node);
      if (node.shadowRoot) {
        elements = elements.concat(getAllElements(node.shadowRoot));
      }
    }
    node = treeWalker.nextNode();
  }
  return elements;
}

function extractElementData(el) {
  if (!el || !el.tagName) return { type: '', linkUrl: '', text: '', slotContent: '', images: [] };
  let type = el.tagName.toLowerCase();
  if (el.hasAttribute && el.hasAttribute('role')) type = el.getAttribute('role');
  let linkUrl = el.href || (el.getAttribute && el.getAttribute('href')) || el.action || '';
  let text = el.textContent ? el.textContent.trim() : '';
  let slotContent = '';
  if (el.shadowRoot && el.shadowRoot.textContent) {
    slotContent = el.shadowRoot.textContent.trim();
  }
  let images = [];
  if (el.querySelectorAll) {
    el.querySelectorAll('img,svg').forEach(img => {
      if (img.tagName && img.tagName.toLowerCase() === 'img') {
        images.push({
          type: 'img',
          src: img.src,
          alt: img.alt,
          title: img.title
        });
      } else if (img.tagName && img.tagName.toLowerCase() === 'svg') {
        images.push({
          type: 'svg',
          outerHTML: img.outerHTML
        });
      }
    });
  }
  return { type, linkUrl, text, slotContent, images };
}

function gatherLinksAndButtons() {
  const all = getAllElements();
  const filtered = all.filter(isLinkOrButton);
  const items = filtered.map(extractElementData);
  chrome.runtime.sendMessage({ action: 'gathered', items });
}

function isLinkOrButton(el) {
  if (!el || !el.tagName) return false;
  const type = el.tagName.toLowerCase();
  if (type === 'a' || type === 'button') return true;
  if (el.hasAttribute && el.hasAttribute('role')) {
    const role = el.getAttribute('role');
    if (role === 'link' || role === 'button') return true;
  }
  return false;
}

// Listen for message from side panel to gather links/buttons
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'get-links-buttons') {
    try {
      const all = getAllElements();
      const filtered = all.filter(isLinkOrButton);
      const items = filtered.map(extractElementData);
      sendResponse({ success: true, items });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true; // async
  }
});
