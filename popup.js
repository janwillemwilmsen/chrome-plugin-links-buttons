document.getElementById('openPanel').addEventListener('click', async () => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    await chrome.sidePanel.open({});
    window.close();
  }
});
