// Service worker for Links & Buttons Finder
const openTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true });
});

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  if (openTabs.has(tabId)) {
    await chrome.sidePanel.close({ tabId });
    openTabs.delete(tabId);
  } else {
    await chrome.sidePanel.open({ tabId });
    openTabs.add(tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.runtime.sendMessage({ action: 'page-navigated' });
  }
});
