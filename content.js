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
function collectElements() {
  const elements = findInteractiveElements();
  return elements.map((el, index) => ({
    id: index,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || '').trim(),
    href: el.getAttribute('href'),
  }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    sendResponse({ elements: collectElements() });
  }
});
