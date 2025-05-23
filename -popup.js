document.getElementById('openPanel').addEventListener('click', async () => {
  // Open the side panel for the current window
  if (chrome.sidePanel && chrome.sidePanel.open) {
    await chrome.sidePanel.open({});
    window.close(); // close popup after opening side panel
  } else {
    alert('Side panel API not available.');
  }
});
