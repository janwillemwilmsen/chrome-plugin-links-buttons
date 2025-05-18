// Define the default path for clarity
const SIDE_PANEL_PATH = 'sidepanel.html';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: SIDE_PANEL_PATH }).catch(err =>
    console.error('[Background] Error setting panel options:', err)
  );

  // Allow clicking the action icon to toggle the side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(err =>
    console.error('[Background] Error setting panel behavior:', err)
  );
});

// When the active tab navigates to a new page, notify the side panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.runtime.sendMessage({ action: 'page-updated' });
  }
});
