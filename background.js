// background.js
let results = [];
let resultsTabId = null;
let mapsTabId = null;

// Listen for messages from popup/content/results
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === "startScraping") {
    // Save company list to storage (already in popup), open results tab and then open maps
    openResultsTab().then(() => openMapsTab());
    sendResponse({ status: "started" });
  }

  if (message.action === "newRow") {
    // Save new row in-memory and storage
    results.push(message.data);
    chrome.storage.local.set({ scrapedData: results });

    // Forward to results tab if open
    if (resultsTabId) {
      chrome.tabs.sendMessage(resultsTabId, { action: "newRow", data: message.data }).catch(() => {});
    }
  }

  if (message.action === "requestExistingData") {
    // Return stored data
    chrome.storage.local.get(["scrapedData"], (res) => {
      sendResponse({ data: res.scrapedData || [] });
    });
    return true; // async response
  }

  if (message.action === "downloadCSV") {
    downloadCSV(message.filename || "scraped_results.csv");
  }

  if (message.action === "clearResults") {
    results = [];
    chrome.storage.local.remove("scrapedData");
    sendResponse({ status: "cleared" });
  }

  return true;
});

// open results tab (or focus if exists)
function openResultsTab() {
  return new Promise((resolve) => {
    if (resultsTabId) {
      chrome.tabs.update(resultsTabId, { active: true }, (tab) => resolve(tab));
      return;
    }
    chrome.tabs.create({ url: chrome.runtime.getURL("results.html") }, (tab) => {
      resultsTabId = tab.id;
      // track when closed
      resolve(tab);
    });
  });
}

// open maps tab and store its id
function openMapsTab() {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: "https://www.google.com/maps" }, (tab) => {
      mapsTabId = tab.id;

      // Wait until the maps tab is fully loaded, then tell it to begin
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === mapsTabId && changeInfo.status === "complete") {
          // Send a message telling content script to start (content script will be present on maps)
          chrome.tabs.sendMessage(mapsTabId, { action: "beginScrape" }).catch(() => {
            // content script might not be injected yet; but content_scripts in manifest will run automatically.
          });
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      });
    });
  });
}

// Download csv using current results[]
function downloadCSV(filename = "scraped_results.csv") {
  if (!results.length) return;
  // create CSV header dynamically
  const keys = new Set();
  results.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  const header = Array.from(keys);
  const csvRows = [header.join(",")];

  results.forEach(r => {
    const row = header.map(h => {
      let v = r[h] == null ? "" : String(r[h]);
      // escape quotes
      if (v.includes('"') || v.includes(",") || v.includes("\n")) {
        v = `"` + v.replace(/"/g, '""') + `"`;
      }
      return v;
    }).join(",");
    csvRows.push(row);
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename });
}

// Reset resultsTabId if closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === resultsTabId) resultsTabId = null;
  if (tabId === mapsTabId) mapsTabId = null;
});
