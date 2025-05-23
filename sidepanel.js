function fetchFaqs() {
  fetch(chrome.runtime.getURL('faqs.json'))
    .then(r => r.json())
    .then(faqs => {
      const container = document.getElementById('faqContent');
      container.innerHTML = '';
      faqs.forEach(faq => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = faq.q;
        details.appendChild(summary);
        const p = document.createElement('p');
        p.textContent = faq.a;
        details.appendChild(p);
        container.appendChild(details);
      });
    });
}

function renderResults(data) {
  const list = document.getElementById('resultList');
  list.innerHTML = '';
  data.elements.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `[${item.tag}] ${item.text || item.href || ''}`;
    list.appendChild(li);
  });
  document.getElementById('counts').textContent = `Items found: ${data.elements.length}`;
}

function requestData() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'collect' }, renderResults);
  });
}

document.getElementById('reload').addEventListener('click', requestData);

chrome.runtime.onMessage.addListener(message => {
  if (message.action === 'page-navigated') {
    requestData();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  requestData();
  fetchFaqs();
});
