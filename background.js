// Define the default path for clarity
const SIDE_PANEL_PATH = 'sidepanel.html';
let activePanelTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  // Set the default path for the side panel
  chrome.sidePanel.setOptions({
      path: SIDE_PANEL_PATH
  }).catch((error) => console.error('[Background] Error setting initial panel options:', error));

  // THIS IS THE KEY: Tell Chrome to open/close the panel when the action icon is clicked.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => {
        console.log('[Background] Panel behavior set: openPanelOnActionClick = true');
    })
    .catch((error) => console.error('[Background] Error setting panel behavior:', error));
});
