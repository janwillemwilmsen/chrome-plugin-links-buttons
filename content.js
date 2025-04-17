chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'get-links-buttons') {
    console.log('[ContentScript] Received get-links-buttons');
    try {
      const all = getAllElements();
      const filtered = all.filter(isLinkOrButton);
      __lastFilteredElements = filtered;
      const items = filtered.map(extractElementData);
      console.log('[ContentScript] Sending items:', items);
      sendResponse({ success: true, items });
    } catch (e) {
      console.log('[ContentScript] Error:', e);
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
  // ...rest unchanged
});

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
  let tag = el.tagName.toLowerCase();
  let id = el.id || '';
  let className = el.className || '';
  let role = el.getAttribute && el.getAttribute('role');
  let ariaHidden = (function checkAriaHidden(e, depth = 0) {
    if (!e || depth > 10) return false;
    if (e.getAttribute && e.getAttribute('aria-hidden') === 'true') return true;
    return checkAriaHidden(e.parentElement, depth + 1);
  })(el);
  let ariaLabel = el.getAttribute && el.getAttribute('aria-label');
  let ariaLabelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
  let ariaDescribedBy = el.getAttribute && el.getAttribute('aria-describedby');
  function resolveAriaRefs(refStr) {
    if (!refStr) return '';
    return refStr.split(' ').map(id => {
      const ref = document.getElementById(id);
      return ref ? ref.textContent.trim() : '';
    }).filter(Boolean).join(' ');
  }
  let ariaLabelledByText = resolveAriaRefs(ariaLabelledBy);
  let ariaDescribedByText = resolveAriaRefs(ariaDescribedBy);
  let linkUrl = el.href || (el.getAttribute && el.getAttribute('href')) || el.action || '';
  let text = el.textContent ? el.textContent.trim() : '';
  let slotContent = '';
  if (el.shadowRoot && el.shadowRoot.textContent) {
    slotContent = el.shadowRoot.textContent.trim();
  }
  // Robustly detect if opens in new window (align with playwrightcode.js logic)
  let opensInNewWindow = false;
  if (tag === 'a') {
    opensInNewWindow = el.getAttribute('target') === '_blank';
  } else if (tag === 'button' || role === 'button') {
    // Check inline onclick attribute
    let handler = el.getAttribute('onclick');
    if (handler && handler.includes('window.open')) {
      opensInNewWindow = true;
    }
    // Check attached JS handler
    else if (typeof el.onclick === 'function' && el.onclick.toString().includes('window.open')) {
      opensInNewWindow = true;
    }
    // Check for any attribute containing window.open
    else {
      for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i].value && el.attributes[i].value.includes('window.open')) {
          opensInNewWindow = true;
          break;
        }
      }
    }
    // Recursively check children for onclick="window.open"
    function checkChildrenForWindowOpen(element) {
      if (!element || !element.children) return false;
      for (let i = 0; i < element.children.length; i++) {
        let child = element.children[i];
        let childHandler = child.getAttribute && child.getAttribute('onclick');
        if (childHandler && childHandler.includes('window.open')) {
          return true;
        }
        if (checkChildrenForWindowOpen(child)) {
          return true;
        }
      }
      return false;
    }
    if (!opensInNewWindow && checkChildrenForWindowOpen(el)) {
      opensInNewWindow = true;
    }
  }

  // Find ancestor link
  function findAncestorLink(e, depth = 0) {
    if (!e || depth > 10) return null;
    if (e.tagName && e.tagName.toLowerCase() === 'a') return e.href || null;
    return findAncestorLink(e.parentElement, depth + 1);
  }
  let ancestorLink = findAncestorLink(el.parentElement);
  // Figure/figcaption context
  function isInFigureWithFigcaption(e, depth = 0) {
    if (!e || depth > 10) return false;
    if (e.tagName && e.tagName.toLowerCase() === 'figure') {
      return !!e.querySelector('figcaption');
    }
    return isInFigureWithFigcaption(e.parentElement, depth + 1);
  }
  let inFigureWithFigcaption = isInFigureWithFigcaption(el.parentElement);
  // Shadow DOM presence
  let hasShadowDom = !!el.shadowRoot;
  // Slot content
  let slots = [];
  if (el.tagName && el.tagName.toLowerCase() === 'slot') {
    slots = Array.from(el.assignedNodes ? el.assignedNodes() : []);
  }
  // Images/SVG info
  let images = [];
  if (el.querySelectorAll) {
    el.querySelectorAll('img,svg').forEach(img => {
      if (img.tagName && img.tagName.toLowerCase() === 'img') {
        images.push({
          type: 'img',
          src: img.src,
          alt: img.getAttribute('alt'),
          title: img.getAttribute('title'),
          role: img.getAttribute('role'),
          ancestorLink: findAncestorLink(img.parentElement),
          inFigureWithFigcaption: isInFigureWithFigcaption(img.parentElement)
        });
      } else if (img.tagName && img.tagName.toLowerCase() === 'svg') {
        // SVG accessibility: title, desc, aria-label, labelledby, describedby
        let svgTitle = '';
        let svgDesc = '';
        let svgTitleElem = img.querySelector('title');
        let svgDescElem = img.querySelector('desc');
        if (svgTitleElem) svgTitle = svgTitleElem.textContent;
        if (svgDescElem) svgDesc = svgDescElem.textContent;
        images.push({
          type: 'svg',
          outerHTML: img.outerHTML,
          ariaLabel: img.getAttribute('aria-label'),
          ariaLabelledBy: img.getAttribute('aria-labelledby'),
          ariaLabelledByText: resolveAriaRefs(img.getAttribute('aria-labelledby')),
          ariaDescribedBy: img.getAttribute('aria-describedby'),
          ariaDescribedByText: resolveAriaRefs(img.getAttribute('aria-describedby')),
          title: svgTitle,
          desc: svgDesc,
          role: img.getAttribute('role')
        });
      }
    });
  }
  // Presentation/none role for images
  let rolePresentation = (el.tagName && el.tagName.toLowerCase() === 'img') ? (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') : false;
  // Outer HTML
  let outerHTML = el.outerHTML;
  return {
    tag, id, className, role, ariaHidden, ariaLabel, ariaLabelledBy, ariaLabelledByText, ariaDescribedBy, ariaDescribedByText,
    linkUrl, text, slotContent, slots, hasShadowDom, ancestorLink, inFigureWithFigcaption, rolePresentation, outerHTML, images,
    opensInNewWindow,
    title: el.getAttribute && el.getAttribute('title')
  };
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
let __lastFilteredElements = [];
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'get-links-buttons') {
    try {
      const all = getAllElements();
      const filtered = all.filter(isLinkOrButton);
      __lastFilteredElements = filtered;
      const items = filtered.map(extractElementData);
      sendResponse({ success: true, items });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true; // async
  }
  if (request && request.action === 'scroll-to-element' && typeof request.index === 'number') {
    const el = __lastFilteredElements[request.index];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('links-buttons-highlight');
      setTimeout(() => el.classList.remove('links-buttons-highlight'), 2000);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  if (request && request.action === 'get-element-html' && typeof request.index === 'number') {
    const el = __lastFilteredElements[request.index];
    if (el) {
      sendResponse({ success: true, html: el.outerHTML });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
});

// Add highlight CSS for scroll-to-element
(function() {
  const style = document.createElement('style');
  style.textContent = `.links-buttons-highlight { outline: 3px solid #4285f4 !important; background: #e3f0fd !important; transition: outline 0.3s; }`;
  document.head.appendChild(style);
})();
