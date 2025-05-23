const SIDE_PANEL_PATH = 'sidepanel.html';
let activePanelTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: SIDE_PANEL_PATH }).catch(err => console.error('setOptions', err));
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(err => console.error('setPanelBehavior', err));
});

chrome.sidePanel.onShown.addListener(tabId => {
  activePanelTabId = tabId;
});

chrome.sidePanel.onHidden.addListener(() => {
  activePanelTabId = null;
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (activePanelTabId === tabId && info.status === 'complete') {
    chrome.runtime.sendMessage({ action: 'page-updated' });
  }
});
