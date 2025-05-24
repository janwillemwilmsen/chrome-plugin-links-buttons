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
  (data.elements || []).forEach(item => {
    const li = document.createElement('li');
    li.textContent = `[${item.tag}] ${item.text || item.href || ''}`;
    if (item.htmlcode && item.htmlcode.length) {
      li.addEventListener('click', () => {
        console.log('HTML code:', item.htmlcode);
    if (item.html) {
      li.addEventListener('click', () => {
        console.log('Element HTML:', item.html);
        if (item.absoluteHtml) console.log('Absolute HTML:', item.absoluteHtml);
        if (item.pseudoHtml) console.log('Pseudo HTML:', item.pseudoHtml);
        if (item.jsHandlerHtml) console.log('JS Handler HTML:', item.jsHandlerHtml);
      });
    }
    list.appendChild(li);
  });
  const count = Array.isArray(data.elements) ? data.elements.length : 0;
  document.getElementById('counts').textContent = `Items found: ${count}`;
}


function showLoading() {
  document.getElementById('counts').textContent = 'Loading...';
  const list = document.getElementById('resultList');
  if (list) list.innerHTML = '';
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

function reloadTabAndWait(tabId) {
  return new Promise(resolve => {
    const listener = (updatedId, info) => {
      if (updatedId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.reload(tabId, { bypassCache: true }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
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

// Fetch link/button data from the active tab
async function requestData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await waitForTabComplete(tab.id);
  // Give dynamic pages a moment to render additional content
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
