let __lastElements = [];

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'get-links-buttons') {
    (async () => {
      try {
        const items = await gatherItems();
        sendResponse({ success: true, items });
      } catch (e) {
        console.error('gather error', e);
        sendResponse({ success: false });
      }
    })();
    return true;
  }
  if (req.action === 'scroll-to-element' && typeof req.index === 'number') {
    const el = __lastElements[req.index];
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
  if (req.action === 'get-element-html' && typeof req.index === 'number') {
    const el = __lastElements[req.index];
    sendResponse({ success: !!el, html: el ? el.outerHTML : '' });
    return true;
  }
});

function findAll(selector, root=document) {
  let els = Array.from(root.querySelectorAll(selector));
  root.querySelectorAll('*').forEach(n => {
    if (n.shadowRoot) {
      els = els.concat(findAll(selector, n.shadowRoot));
    }
  });
  return els;
}

function getAllInteractiveElements() {
  return findAll('a, button, [role="link"], [role="button"]');
}

function getTextForIds(idStr) {
  if (!idStr) return '';
  return idStr.split(/\s+/).map(id => {
    const el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }).filter(Boolean).join(' ');
}

function hasAbsolutePosition(el) {
  const style = getComputedStyle(el);
  if (style.position === 'absolute') return true;
  for (const pseudo of ['::before','::after']) {
    const ps = getComputedStyle(el, pseudo);
    if (ps.position === 'absolute' && ps.content && ps.content !== 'none') return true;
  }
  return false;
}

function hasClickHandler(el) {
  if (el.onclick) return true;
  if (el.getAttribute && el.getAttribute('onclick')) return true;
  return false;
}

async function extractData(el, index, isButton) {
  const tag = el.tagName.toLowerCase();
  const ariaLabel = el.getAttribute('aria-label');
  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  const ariaDescribedBy = el.getAttribute('aria-describedby');
  const item = {
    tag,
    id: el.id || '',
    className: el.className || '',
    role: el.getAttribute('role') || '',
    ariaHidden: el.getAttribute('aria-hidden') || '',
    ariaLabel,
    ariaLabelledBy,
    ariaLabelledByText: getTextForIds(ariaLabelledBy),
    ariaDescribedBy,
    ariaDescribedByText: getTextForIds(ariaDescribedBy),
    title: el.getAttribute('title') || '',
    tabindex: el.hasAttribute('tabindex') ? Number(el.getAttribute('tabindex')) : null,
    linkUrl: el.href || el.action || '',
    text: el.textContent.trim(),
    opensInNewWindow: tag === 'a' ? el.getAttribute('target') === '_blank' : hasClickHandler(el) && /window\.open/.test(el.onclick?.toString() || el.getAttribute('onclick') || ''),
    hasShadowDom: !!el.shadowRoot,
    inSlot: !!el.assignedSlot,
    hasAbsolutePosition: hasAbsolutePosition(el),
    hasClickHandler: hasClickHandler(el),
    images: analyzeImagesInElement(el),
    sequentialId: index,
    isButton
  };
  return item;
}

async function gatherItems() {
  const elements = getAllInteractiveElements();
  __lastElements = elements;
  let linkNum = 1, buttonNum = 1;
  const items = [];
  for (const el of elements) {
    const isButton = el.tagName.toLowerCase() === 'button' || el.getAttribute('role') === 'button';
    const seq = isButton ? buttonNum++ : linkNum++;
    items.push(await extractData(el, seq, isButton));
  }
  return items;
}

(function(){
  const style = document.createElement('style');
  style.textContent = `.links-buttons-highlight{outline:3px solid #4285f4 !important;background:#e3f0fd !important;transition:outline 0.3s;}`;
  document.head.appendChild(style);
})();
