// Collect links and buttons on the page
function collectElements() {
  const selectors = ['a', 'button', '[role="button"]', '[role="link"]'];
  const elements = Array.from(document.querySelectorAll(selectors.join(',')));
  return elements.map((el, index) => {
    return {
      id: index,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').trim(),
      href: el.getAttribute('href'),
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    sendResponse({ elements: collectElements() });
  }
});
