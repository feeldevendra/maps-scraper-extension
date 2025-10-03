(function(){
  window.__mapsScraperExtract = function() {
    try {
      let info = {};
      let name = document.querySelector('h1.DUwDvf')?.innerText;
      let address = document.querySelector("button[data-item-id='address']")?.innerText;
      let website = document.querySelector("a[data-item-id='authority']")?.href;
      let phone = document.querySelector("button[data-item-id^='phone']")?.innerText;

      info.name = name || 'Not found';
      info.address = address || 'Not found';
      info.website = website || 'Not found';
      info.phone = phone || 'Not found';
      return info;
    } catch {
      return null;
    }
  };
  // -------------------------------
// Your existing scraping code here
// -------------------------------

// Example: Assume you have scraped results in a variable called `scrapedData`
let scrapedData = []; // <--- Replace this with your actual scraped results array/object

// Save scraped data to chrome storage
chrome.storage.local.set({ scrapedData }, () => {
  console.log("Scraped data saved to storage", scrapedData);

  // Tell background script to open results page
  chrome.runtime.sendMessage({ action: "openResultsPage" });
});


  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'extractNow') {
      sendResponse(window.__mapsScraperExtract());
    }
  });
})();
