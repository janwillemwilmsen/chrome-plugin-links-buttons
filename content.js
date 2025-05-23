// Recursively search for link and button elements, including inside shadow DOM
function findInteractiveElements(root = document) {
  const selector = 'a, button, [role="link"], [role="button"]';
  let results = Array.from(root.querySelectorAll(selector));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    if (node.shadowRoot) {
      results = results.concat(findInteractiveElements(node.shadowRoot));
    }
    node = walker.nextNode();
  }
  return results;
}

// Collect links and buttons on the page
// Get outer HTML for an element and include relevant shadow/slotted content
function getElementHtml(el) {
  let html = el.outerHTML || '';

  if (el.shadowRoot) {
    const shadow = Array.from(el.shadowRoot.childNodes)
      .map(n => n.outerHTML || n.textContent || '')
      .join('');
    html += `\n<shadow-root>${shadow}</shadow-root>`;
  }

  if (typeof el.assignedNodes === 'function') {
    const assigned = Array.from(el.assignedNodes());
    if (assigned.length) {
      html += '\n' + assigned.map(n => n.outerHTML || n.textContent || '').join('');
    }
  }

  return html.trim();
}

// Check for position:absolute on the element
function hasAbsolutePosition(el) {
  const style = window.getComputedStyle(el);
  return style.position === 'absolute';
}

// Check for absolute positioning on ::before/::after pseudo elements
function hasAbsolutePseudo(el) {
  for (const pseudo of ['::before', ':before', '::after', ':after']) {
    const ps = window.getComputedStyle(el, pseudo);
    if (!ps) continue;
    if ((ps.content && ps.content !== 'none' && ps.content !== '""') && ps.position === 'absolute') {
      return true;
    }
  }
  return false;
}

// Determine if element has a JavaScript click handler
function hasJsClickHandler(el) {
  if (el.getAttribute('onclick')) return true;
  if (typeof el.onclick === 'function') return true;
  if (typeof getEventListeners === 'function') {
    const listeners = getEventListeners(el).click;
    if (listeners && listeners.length) return true;
  }
  return false;
}

function isInShadowDom(el) {
  return el.getRootNode() instanceof ShadowRoot;
}

function isSlotted(el) {
  return !!el.assignedSlot;
}

function isWebComponent(el) {
  return el.tagName && el.tagName.includes('-');
}

function collectElements() {
  const elements = findInteractiveElements();
  return elements.map((el, index) => ({
    id: index,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || '').trim(),
    href: el.getAttribute('href'),
    html: getElementHtml(el),
    absolute: hasAbsolutePosition(el),
    pseudoAbsolute: hasAbsolutePseudo(el),
    hasClickHandler: hasJsClickHandler(el),
    inShadowDom: isInShadowDom(el),
    slotted: isSlotted(el),
    webComponent: isWebComponent(el)
  }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    sendResponse({ elements: collectElements() });
  }
});
