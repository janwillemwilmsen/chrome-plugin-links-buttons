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

function findNearestRelative(el) {
  let current = el.parentElement;
  while (current) {
    const pos = window.getComputedStyle(current).position;
    if (pos === 'relative') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function pseudoHasAbsolute(el) {
  const beforePos = window.getComputedStyle(el, '::before').getPropertyValue('position');
  const afterPos = window.getComputedStyle(el, '::after').getPropertyValue('position');
  return beforePos === 'absolute' || afterPos === 'absolute';
}









function collectElements() {
  const elements = findInteractiveElements();
  return elements.map((el, index) => {
    const computed = window.getComputedStyle(el);
    const positionAbsolute = computed.position === 'absolute';
    const nearestRelative = positionAbsolute ? findNearestRelative(el) : null;
    const htmlAbsolute = nearestRelative ? nearestRelative.outerHTML : null;

    const pseudoAbsolute = pseudoHasAbsolute(el);
    const pseudoRelative = pseudoAbsolute ? findNearestRelative(el) : null;
    const htmlPseudo = pseudoRelative ? pseudoRelative.outerHTML : null;

    const href = el.getAttribute('href');
    const hasJsHref = href && href.trim().toLowerCase().startsWith('javascript:');
    const hasClickHandler =
      hasJsHref || el.hasAttribute('onclick') || typeof el.onclick === 'function';

    const inShadowDom = el.getRootNode() instanceof ShadowRoot;
    const inSlot = !!(el.assignedSlot || el.parentNode instanceof HTMLSlotElement);

    const htmlSet = new Set([el.outerHTML]);
    if (htmlAbsolute) htmlSet.add(htmlAbsolute);
    if (htmlPseudo) htmlSet.add(htmlPseudo);
    if (hasClickHandler) htmlSet.add(el.outerHTML);

    return {
      id: index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').trim(),
      href,
      htmlcode: Array.from(htmlSet),
      inShadowDom,
      inSlot,
      hasPositionAbsolute: positionAbsolute,
      hasPseudoAbsolute: pseudoAbsolute,
      hasJsClickHandler: hasClickHandler
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    sendResponse({ elements: collectElements() });
  }
});
