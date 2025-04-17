// Utility: Recursively get all elements, including shadow roots
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
      // Traverse shadow root if present
      if (node.shadowRoot) {
        elements = elements.concat(getAllElements(node.shadowRoot));
      }
    }
    node = treeWalker.nextNode();
  }
  return elements;
}

// Helper to get text content, slot/shadow content, and image info
function extractElementData(el) {
  if (!el || !el.tagName) return { type: '', linkUrl: '', text: '', slotContent: '', images: [] };
  let type = el.tagName.toLowerCase();
  if (el.hasAttribute && el.hasAttribute('role')) type = el.getAttribute('role');
  let linkUrl = el.href || (el.getAttribute && el.getAttribute('href')) || el.action || '';
  let text = el.textContent ? el.textContent.trim() : '';

  // Try to get slot content if present
  let slotContent = '';
  if (el.shadowRoot && el.shadowRoot.textContent) {
    slotContent = el.shadowRoot.textContent.trim();
  }

  // Get images inside the element
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

function isLinkOrButton(el) {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (['a', 'button'].includes(tag)) return true;
  const role = el.getAttribute('role');
  if (role && ['link', 'button'].includes(role)) return true;
  return false;
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function renderResults(items) {
  const results = document.getElementById('results');
  if (!items.length) {
    results.innerHTML = '<em>No links or buttons found.</em>';
    return;
  }
  results.innerHTML = '';
  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <span class="type">[${item.tag}]</span>
      <span class="text">${item.text || '(no text)'}</span><br>
      ${item.linkUrl ? `<span class="url">${item.linkUrl}</span><br>` : ''}
      <span class="meta">ID: <b>${item.id || '-'}</b> | Class: <b>${item.className || '-'}</b> | Role: <b>${item.role || '-'}</b></span><br>
      <span class="meta">aria-hidden: <b>${item.ariaHidden ? 'true' : 'false'}</b> | aria-label: <b>${item.ariaLabel || '-'}</b></span><br>
      <span class="meta">aria-labelledby: <b>${item.ariaLabelledBy || '-'}</b> <em>${item.ariaLabelledByText ? '(' + item.ariaLabelledByText + ')' : ''}</em></span><br>
      <span class="meta">aria-describedby: <b>${item.ariaDescribedBy || '-'}</b> <em>${item.ariaDescribedByText ? '(' + item.ariaDescribedByText + ')' : ''}</em></span><br>
      ${item.ancestorLink ? `<span class="meta">Ancestor Link: <a href="${item.ancestorLink}" target="_blank">${item.ancestorLink}</a></span><br>` : ''}
      ${item.inFigureWithFigcaption ? `<span class="meta">In Figure with Figcaption</span><br>` : ''}
      ${item.hasShadowDom ? `<span class="meta">Has Shadow DOM</span><br>` : ''}
      ${item.slotContent ? `<span class="meta">Slot Content: <b>${item.slotContent}</b></span><br>` : ''}
      ${item.images && item.images.length ? `<span class="meta">Images/SVGs:<ul style='font-size:0.9em;overflow-x:auto;'>$${item.images.map(img => `<li>type: ${img.type} ${img.type === 'img' ? `src: ${img.src} alt: ${img.alt}` : ''} ${img.type === 'svg' ? `role: ${img.role || '-'} title: ${img.title || '-'} desc: ${img.desc || '-'} aria-label: ${img.ariaLabel || '-'} ...` : ''}</li>`).join('')}</ul></span>` : ''}
      <br>
      <button class="scroll-btn" data-idx="${idx}">Scroll To</button>
      <button class="html-btn" data-idx="${idx}">Show HTML</button>
      <div class="popover" style="display:none;position:absolute;z-index:9999;background:#fff;border:1px solid #ccc;padding:0.5em;max-width:400px;max-height:300px;overflow:auto;"></div>
    `;
    // Scroll To button logic
    div.querySelector('.scroll-btn').onclick = async (e) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'scroll-to-element', index: idx });
    };
    // Show HTML button logic
    div.querySelector('.html-btn').onclick = async (e) => {
      const popover = div.querySelector('.popover');
      if (popover.style.display === 'block') {
        popover.style.display = 'none';
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'get-element-html', index: idx }, (response) => {
        if (response && response.html) {
          popover.innerText = response.html;
          popover.style.display = 'block';
        } else {
          popover.innerText = 'Unable to fetch HTML.';
          popover.style.display = 'block';
        }
      });
    };
    results.appendChild(div);
  });
}

async function gatherLinksAndButtons() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    renderResults([]);
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: 'get-links-buttons' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      renderResults([]);
      return;
    }
    renderResults(response.items || []);
  });
}

document.addEventListener('DOMContentLoaded', gatherLinksAndButtons);
