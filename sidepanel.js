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

// Wait until the given tab has finished loading
function waitForTabComplete(tabId) {
  return new Promise(resolve => {
    chrome.tabs.get(tabId, tab => {
      if (!tab || tab.status === 'complete') {
        resolve();
        return;
      }
      const listener = (updatedId, info) => {
        if (updatedId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

// Fetch link/button data from the active tab
async function requestData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await waitForTabComplete(tab.id);
  // Give dynamic pages a moment to render additional content
  await new Promise(r => setTimeout(r, 1000));
  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, renderResults);
}

async function handleReload() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const done = waitForTabComplete(tab.id);
  chrome.tabs.reload(tab.id, { bypassCache: true });
  await done;
  await new Promise(r => setTimeout(r, 1000));
  chrome.tabs.sendMessage(tab.id, { action: 'collect' }, renderResults);
}

document.getElementById('reload').addEventListener('click', handleReload);

chrome.runtime.onMessage.addListener(message => {
  if (message.action === 'page-navigated') {
    requestData();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  requestData();
  fetchFaqs();
});
