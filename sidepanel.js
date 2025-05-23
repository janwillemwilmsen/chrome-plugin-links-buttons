async function gatherLinksAndButtons() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return renderResults([]);
  chrome.tabs.sendMessage(tab.id, { action: 'get-links-buttons' }, res => {
    if (chrome.runtime.lastError || !res || !res.success) return renderResults([]);
    renderResults(res.items || []);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reload-btn').addEventListener('click', () => {
    gatherLinksAndButtons();
  });
  gatherLinksAndButtons();
  renderFilterPanel();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'page-updated') {
    gatherLinksAndButtons();
  }
});

function renderFilterPanel() {
  const panel = document.getElementById('filter-panel');
  panel.innerHTML = `
    <fieldset><legend>Show</legend>
      <label><input type="radio" name="isButtonFilter" value="either" checked> Either</label>
      <label><input type="radio" name="isButtonFilter" value="true"> Buttons</label>
      <label><input type="radio" name="isButtonFilter" value="false"> Links</label>
    </fieldset>
    <fieldset><legend>Text</legend>
      <label><input type="radio" name="hasTextFilter" value="either" checked> Either</label>
      <label><input type="radio" name="hasTextFilter" value="true"> With text</label>
      <label><input type="radio" name="hasTextFilter" value="false"> Without text</label>
    </fieldset>
    <fieldset><legend>Image</legend>
      <label><input type="radio" name="hasImageFilter" value="either" checked> Either</label>
      <label><input type="radio" name="hasImageFilter" value="true"> With image</label>
      <label><input type="radio" name="hasImageFilter" value="false"> Without image</label>
    </fieldset>
    <fieldset><legend>ARIA</legend>
      <label><input type="radio" name="hasAriaFilter" value="either" checked> Either</label>
      <label><input type="radio" name="hasAriaFilter" value="true"> With aria</label>
      <label><input type="radio" name="hasAriaFilter" value="false"> Without aria</label>
    </fieldset>
    <fieldset><legend>Title</legend>
      <label><input type="radio" name="hasTitleFilter" value="either" checked> Either</label>
      <label><input type="radio" name="hasTitleFilter" value="true"> With title</label>
      <label><input type="radio" name="hasTitleFilter" value="false"> Without title</label>
    </fieldset>
    <fieldset><legend>Tabindex</legend>
      <label><input type="radio" name="hasTabindexFilter" value="either" checked> Either</label>
      <label><input type="radio" name="hasTabindexFilter" value="true"> With tabindex</label>
      <label><input type="radio" name="hasTabindexFilter" value="false"> Without tabindex</label>
    </fieldset>
    <fieldset><legend>Opens New Window</legend>
      <label><input type="radio" name="opensNewWindowFilter" value="either" checked> Either</label>
      <label><input type="radio" name="opensNewWindowFilter" value="true"> Yes</label>
      <label><input type="radio" name="opensNewWindowFilter" value="false"> No</label>
    </fieldset>
    <button id="resetFiltersBtn">Reset Filters</button>
  `;
  panel.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', filterFunc));
  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    panel.querySelectorAll('input[value=either]').forEach(r => r.checked = true);
    filterFunc();
  });
}

function renderResults(items) {
  const results = document.getElementById('results');
  if (!items.length) { results.innerHTML = '<em>No links or buttons found.</em>'; return; }
  let html = '<ul id="results-list">';
  items.forEach((item, idx) => {
    const isButton = item.isButton;
    const hasText = !!item.text;
    const hasImage = item.images && item.images.length > 0;
    const hasAria = !!(item.ariaLabel || item.ariaLabelledBy || item.ariaDescribedBy);
    const hasTitle = !!item.title;
    const hasTabindex = item.tabindex !== null;
    const opensNewWindow = !!item.opensInNewWindow;
    html += `<li class="item" data-isbutton="${isButton}" data-hastext="${hasText}" data-hasimage="${hasImage}" data-hasaria="${hasAria}" data-hastitle="${hasTitle}" data-hastabindex="${hasTabindex}" data-opensnewwindow="${opensNewWindow}">
      <span class="meta">${isButton ? 'Button' : 'Link'} [#${item.sequentialId}]</span>
      <span class="text">${item.text || '(no text)'}</span><br>
      ${item.linkUrl ? `<span class="url">${item.linkUrl}</span><br>` : ''}
      ${item.title ? `<span class="meta">Title: ${item.title}</span><br>` : ''}
      ${item.ariaLabel ? `<span class="meta">aria-label: ${item.ariaLabel}</span><br>` : ''}
      <button class="scroll-btn" data-idx="${idx}">Scroll To</button>
      <button class="html-btn" data-idx="${idx}">Show HTML</button>
      <div class="popover" style="display:none"></div>
    </li>`;
  });
  html += '</ul>';
  results.innerHTML = html;
  document.querySelectorAll('.scroll-btn').forEach(btn => btn.onclick = async () => {
    const idx = Number(btn.dataset.idx);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'scroll-to-element', index: idx });
  });
  document.querySelectorAll('.html-btn').forEach(btn => btn.onclick = async () => {
    const idx = Number(btn.dataset.idx);
    const div = btn.parentElement.querySelector('.popover');
    if (div.style.display === 'block') { div.style.display = 'none'; return; }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'get-element-html', index: idx }, res => {
      div.textContent = res.html || 'n/a';
      div.style.display = 'block';
    });
  });
  filterFunc();
  updateSummaryCounts(items);
}

function filterFunc() {
  const list = document.getElementById('results-list');
  if (!list) return;
  const filters = {
    isButton: document.querySelector('input[name="isButtonFilter"]:checked').value,
    hasText: document.querySelector('input[name="hasTextFilter"]:checked').value,
    hasImage: document.querySelector('input[name="hasImageFilter"]:checked').value,
    hasAria: document.querySelector('input[name="hasAriaFilter"]:checked').value,
    hasTitle: document.querySelector('input[name="hasTitleFilter"]:checked').value,
    hasTabindex: document.querySelector('input[name="hasTabindexFilter"]:checked').value,
    opensNewWindow: document.querySelector('input[name="opensNewWindowFilter"]:checked').value
  };
  list.querySelectorAll('li.item').forEach(li => {
    let show = true;
    for (const k in filters) {
      const val = filters[k];
      if (val === 'either') continue;
      if (li.dataset[k.toLowerCase()] !== val) { show = false; break; }
    }
    li.style.display = show ? '' : 'none';
  });
}

function updateSummaryCounts(items) {
  let links = 0, buttons = 0, images = 0, svgs = 0;
  items.forEach(it => {
    if (it.isButton) buttons++; else links++;
    if (it.images) it.images.forEach(img => { if (img.isImg) images++; if (img.isSvg) svgs++; });
  });
  document.getElementById('total-links-count').textContent = links;
  document.getElementById('total-buttons-count').textContent = buttons;
  document.getElementById('total-images-count').textContent = images;
  document.getElementById('total-svgs-count').textContent = svgs;
}

function loadFAQs() {
  const faqContainer = document.getElementById('faqList');
  fetch(chrome.runtime.getURL('faqs.json'))
    .then(r => r.json())
    .then(faqs => {
      faqContainer.innerHTML = '';
      faqs.forEach((f, i) => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        const q = document.createElement('div');
        q.className = 'faq-question';
        q.textContent = f.question;
        const a = document.createElement('div');
        a.className = 'faq-answer';
        a.id = `faq-answer-${i}`;
        a.innerHTML = f.answer;
        q.addEventListener('click', () => {
          const open = a.classList.contains('open');
          document.querySelectorAll('.faq-answer').forEach(el => el.classList.remove('open'));
          document.querySelectorAll('.faq-question').forEach(el => el.classList.remove('open'));
          if (!open) { a.classList.add('open'); q.classList.add('open'); }
        });
        item.appendChild(q);
        item.appendChild(a);
        faqContainer.appendChild(item);
      });
    });
}

loadFAQs();
