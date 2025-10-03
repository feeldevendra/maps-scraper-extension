let resultsTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openResultsPage") {
    if (resultsTabId) {
      // If already open, focus it
      chrome.tabs.update(resultsTabId, { active: true });
    } else {
      // Otherwise create a new tab
      chrome.tabs.create(
        { url: chrome.runtime.getURL("results.html") },
        (tab) => {
          resultsTabId = tab.id;
        }
      );
    }
  }
});

// Reset when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === resultsTabId) {
    resultsTabId = null;
  }
});

