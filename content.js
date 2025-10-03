// Example scraping logic
// Replace this with your real scraping function
async function scrapeData() {
  let results = [];

  // ❗ Replace this part with actual scraping from Google Maps
  // Example dummy data:
  results.push({
    name: "Business One",
    address: "123 Main Street",
    phone: "+1 555-1234"
  });
  results.push({
    name: "Business Two",
    address: "456 Side Avenue",
    phone: "+1 555-5678"
  });

  // ✅ Store results only once
  if (results && results.length > 0) {
    chrome.storage.local.set({ scrapedData: results }, () => {
      console.log("✅ Scraped data saved:", results);

      // Tell background script to open results page
      chrome.runtime.sendMessage({ action: "openResultsPage" });
    });
  } else {
    console.log("⚠️ No results found during scraping.");
  }
}

// Run scraper (for testing)
scrapeData();
