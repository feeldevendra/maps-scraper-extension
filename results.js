chrome.storage.local.get("scrapedData", (result) => {
  if (result.scrapedData) {
    document.getElementById("output").textContent =
      JSON.stringify(result.scrapedData, null, 2);
  } else {
    document.getElementById("output").textContent = "No data found!";
  }
});
