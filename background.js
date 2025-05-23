const SIDE_PANEL_PATH = 'sidepanel.html';
const openTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: SIDE_PANEL_PATH }).catch(err => {
    console.error('Error setting side panel options:', err);
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id === undefined) return;
  const tabId = tab.id;
  if (openTabs.has(tabId)) {
    await chrome.sidePanel.close({ tabId }).catch(() => {});
    openTabs.delete(tabId);
  } else {
    await chrome.sidePanel.open({ tabId }).catch(() => {});
    openTabs.add(tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' && openTabs.has(tabId)) {
    chrome.sidePanel.open({ tabId }).catch(() => {});
  }
});
