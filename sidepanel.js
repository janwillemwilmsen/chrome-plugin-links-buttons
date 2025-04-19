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

document.addEventListener('DOMContentLoaded', function() {
  // Add event listener for reload button
  const reloadBtn = document.getElementById('reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      // Reload the current tab
      if (chrome && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      }
      // Reload the side panel content (simulate by reloading the panel document)
      location.reload();
      // Optionally, send a message to the background script to refresh any caches or state
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'soft-reload' });
      }
    });
  }
  renderFilterPanel();
  gatherLinksAndButtons();
});

function renderFilterPanel() {
  const panel = document.getElementById('filter-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div style="margin-bottom:1em;">
      <fieldset><legend>Show/hide only buttons or links</legend>
        <label><input type="radio" name="isButtonFilter" value="either" checked> Either</label>
        <label><input type="radio" name="isButtonFilter" value="true"> Buttons only</label>
        <label><input type="radio" name="isButtonFilter" value="false"> Links only</label>
      </fieldset>
      <fieldset><legend>Show/hide items with link text</legend>
        <label><input type="radio" name="haslinkTxtRFilter" value="either" checked> Either</label>
        <label><input type="radio" name="haslinkTxtRFilter" value="true"> With link text</label>
        <label><input type="radio" name="haslinkTxtRFilter" value="false"> Without text</label>
      </fieldset>
      <fieldset><legend>Show/hide items with image</legend>
        <label><input type="radio" name="imageInLinkFilter" value="either" checked> Either</label>
        <label><input type="radio" name="imageInLinkFilter" value="true"> With image</label>
        <label><input type="radio" name="imageInLinkFilter" value="false"> Without image</label>
      </fieldset>
      <fieldset><legend>Show/hide items with aria-* attribute</legend>
        <label><input type="radio" name="ariaElementFilter" value="either" checked> Either</label>
        <label><input type="radio" name="ariaElementFilter" value="true"> With aria-* attribute</label>
        <label><input type="radio" name="ariaElementFilter" value="false"> Without aria-* attribute</label>
      </fieldset>
      <fieldset><legend>Show/hide items with title attribute</legend>
        <label><input type="radio" name="hastitleAttributeFilter" value="either" checked> Either</label>
        <label><input type="radio" name="hastitleAttributeFilter" value="true"> With title</label>
        <label><input type="radio" name="hastitleAttributeFilter" value="false"> Without title</label>
      </fieldset>
      <fieldset><legend>Show/hide items with tabindex</legend>
        <label><input type="radio" name="hasTabindexFilter" value="either" checked> Either</label>
        <label><input type="radio" name="hasTabindexFilter" value="true"> With tabindex</label>
        <label><input type="radio" name="hasTabindexFilter" value="false"> Without tabindex</label>
      </fieldset>
      <fieldset><legend>Show/hide items that open in new window</legend>
        <label><input type="radio" name="opensInNewWindowFilter" value="either" checked> Either</label>
        <label><input type="radio" name="opensInNewWindowFilter" value="true"> Opens in new window</label>
        <label><input type="radio" name="opensInNewWindowFilter" value="false"> Does not open in new window</label>
      </fieldset>
      <button id="resetFiltersBtn" style="margin-top:0.5em;">Reset Filters</button>
    </div>
  `;
  panel.querySelectorAll('input[type=radio]').forEach(input => {
    input.addEventListener('change', filterFuncLinks);
  });
  document.getElementById('resetFiltersBtn').addEventListener('click', function() {
    panel.querySelectorAll('input[type=radio][value=either]').forEach(r => r.checked = true);
    filterFuncLinks();
  });
}

function renderResults(items) {
  const results = document.getElementById('results');
  if (!items.length) {
    results.innerHTML = '<em>No links or buttons found.</em>';
    return;
  }
  let html = '<ul id="results-list" style="padding-left:0;list-style:none;">';
  let linkId = 1;
  let buttonId = 1;
  let imageId = 1;
  items.forEach((item, idx) => {
    // Compute filter fields
    const isButton = item.tag === 'button' || item.role === 'button';
    const haslinkTxtR = !!(item.text && item.text.trim());
    const imageInLink = item.images && item.images.length > 0;
    const ariaElement = !!(item.ariaLabel || item.ariaLabelledBy || item.ariaDescribedBy);
    const hastitleAttribute = !!item.title;
    const hasTabindex = typeof item.tabindex !== 'undefined' && item.tabindex !== null;
    const opensInNewWindow = !!item.opensInNewWindow;
    // Assign separate sequential IDs for links and buttons
    let idLabel = '';
    if (isButton) {
      item._buttonId = buttonId++;
      idLabel = `<span class=\"meta\"><b>Button ID: ${item._buttonId}</b></span><br>`;
    } else {
      item._linkId = linkId++;
      idLabel = `<span class=\"meta\"><b>Link ID: ${item._linkId}</b></span><br>`;
    }
    html += `<li class=\"item\" data-isbutton=\"${isButton}\" data-haslinktxtr=\"${haslinkTxtR}\" data-imageinlink=\"${imageInLink}\" data-ariaelement=\"${ariaElement}\" data-hastitleattribute=\"${hastitleAttribute}\" data-hastabindex=\"${hasTabindex}\" data-opensinnewwindow=\"${opensInNewWindow}\">\n      ${idLabel}
      <span class="type">[${item.tag}]</span>
      <span class="text">${item.text || '(no text)'}</span><br>
      ${item.linkUrl ? `<span class="url">${item.linkUrl}</span><br>` : ''}
      <span class="meta">ID: <b>${item.id || '-'}</b> | Class: <b>${item.className || '-'}</b> | Role: <b>${item.role || '-'}</b></span><br>
<span class="meta">Title: <b>${item.title || '-'}</b></span><br>
      <span class="meta">aria-hidden: <b>${item.ariaHidden ? 'true' : 'false'}</b> | aria-label: <b>${item.ariaLabel || '-'}</b></span><br>
      <span class="meta">aria-labelledby: <b>${item.ariaLabelledBy || '-'}</b> <em>${item.ariaLabelledByText ? '(' + item.ariaLabelledByText + ')' : ''}</em></span><br>
      <span class="meta">aria-describedby: <b>${item.ariaDescribedBy || '-'}</b> <em>${item.ariaDescribedByText ? '(' + item.ariaDescribedByText + ')' : ''}</em></span><br>
      ${item.ancestorLink ? `<span class="meta">Ancestor Link: <a href="${item.ancestorLink}" target="_blank">${item.ancestorLink}</a></span><br>` : ''}
      ${item.inFigureWithFigcaption ? `<span class="meta">In Figure with Figcaption</span><br>` : ''}
      ${item.hasShadowDom ? `<span class=\"meta\">Has Shadow DOM</span><br>` : ''}
      ${item.slotContent ? `<span class=\"meta\">Slot Content: <b>${item.slotContent}</b></span><br>` : ''}
      <span class=\"meta\">Opens in New Window: <b>${item.opensInNewWindow ? 'Yes' : 'No'}</b></span><br>
      ${item.images && item.images.length ? `<span class="meta">Images/SVGs:<ul style='font-size:0.9em;overflow-x:auto;'>${item.images.map(img => {
        img._imgId = imageId++;
        return `<li><b>ImgID: ${img._imgId}</b> type: ${img.type} ${img.type === 'img' ? `src: ${img.src} alt: ${img.alt}` : ''} ${img.type === 'svg' ? `role: ${img.role || '-'} title: ${img.title || '-'} desc: ${img.desc || '-'} aria-label: ${img.ariaLabel || '-'} ...` : ''}</li>`;
      }).join('')}</ul></span>` : ''}
      <br>
      <button class="scroll-btn" data-idx="${idx}">Scroll To</button>
      <button class="html-btn" data-idx="${idx}">Show HTML</button>
      <div class="popover" style="display:none;position:absolute;z-index:9999;background:#fff;border:1px solid #ccc;padding:0.5em;max-width:400px;max-height:300px;overflow:auto;"></div>
    </li>`;
  });
  html += '</ul>';
  results.innerHTML = html;
  // Add scroll/html button logic
  document.querySelectorAll('.scroll-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'scroll-to-element', index: idx });
    };
  });
  document.querySelectorAll('.html-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const div = btn.closest('li').querySelector('.popover');
      if (div.style.display === 'block') {
        div.style.display = 'none';
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'get-element-html', index: idx }, (response) => {
        if (response && response.html) {
          div.innerText = response.html;
          div.style.display = 'block';
        } else {
          div.innerText = 'Unable to fetch HTML.';
          div.style.display = 'block';
        }
      });
    };
  });
  filterFuncLinks();
}

function filterFuncLinks() {
  const list = document.getElementById('results-list');
  if (!list) return;
  const filters = {
    isButton: document.querySelector('input[name="isButtonFilter"]:checked').value,
    haslinkTxtR: document.querySelector('input[name="haslinkTxtRFilter"]:checked').value,
    imageInLink: document.querySelector('input[name="imageInLinkFilter"]:checked').value,
    ariaElement: document.querySelector('input[name="ariaElementFilter"]:checked').value,
    hastitleAttribute: document.querySelector('input[name="hastitleAttributeFilter"]:checked').value,
    hasTabindex: document.querySelector('input[name="hasTabindexFilter"]:checked').value,
    opensInNewWindow: document.querySelector('input[name="opensInNewWindowFilter"]:checked').value
  };
  list.querySelectorAll('li').forEach(li => {
    let visible = true;
    for (const key in filters) {
      const value = filters[key];
      if (value === 'either') continue;
      if (li.getAttribute(`data-${key.toLowerCase()}`) !== value) {
        visible = false;
        break;
      }
    }
    li.style.display = visible ? '' : 'none';
  });
}

