chrome.storage.local.get("scrapedData", (result) => {
  const container = document.getElementById("output");

  if (result.scrapedData && result.scrapedData.length > 0) {
    container.textContent = JSON.stringify(result.scrapedData, null, 2);
  } else {
    container.textContent = "No data found!";
  }
});
