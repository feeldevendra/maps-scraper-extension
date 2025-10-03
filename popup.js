// popup.js
const fileInput = document.getElementById("csvFile");
const fileLabel = document.getElementById("fileLabel");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

let parsedCompanies = [];

fileInput.addEventListener("change", handleFile);
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  fileLabel.textContent = file.name;
  readCSV(file);
}

function readCSV(file) {
  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;
    parsedCompanies = parseCSV(text);
    statusEl.textContent = `Loaded ${parsedCompanies.length} rows`;
    // store for content script
    chrome.storage.local.set({ companyList: parsedCompanies }, () => {});
  };
  reader.readAsText(file);
}

// Simple CSV parser (handles commas inside quotes)
function parseCSV(text) {
  const lines = [];
  let cur = "";
  let inQuotes = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur.trim());
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur !== "" || row.length) {
        row.push(cur.trim());
        lines.push(row);
        row = [];
        cur = "";
      }
      // skip extra \r or \n
      while (text[i+1] === "\n" || text[i+1] === "\r") i++;
      continue;
    }
    cur += ch;
  }
  if (cur !== "" || row.length) {
    row.push(cur.trim());
    lines.push(row);
  }
  // Normalize to objects {name, country}
  return lines.filter(r => r.length >= 1).map(r => ({
    name: (r[0] || "").trim(),
    country: (r[1] || "").trim()
  }));
}

startBtn.addEventListener("click", () => {
  // fetch stored companies (in case file already stored)
  chrome.storage.local.get(["companyList"], (res) => {
    const companies = res.companyList || parsedCompanies || [];
    if (!companies || companies.length === 0) {
      alert("Please upload a CSV first (Company,Country).");
      return;
    }
    statusEl.textContent = "Starting scraping...";
    // clear old results first
    chrome.runtime.sendMessage({ action: "clearResults" }, () => {
      // tell background to start (will open results and maps)
      chrome.runtime.sendMessage({ action: "startScraping" }, (response) => {
        statusEl.textContent = "Scraping started — Maps tab opened.";
      });
    });
  });
});

clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "clearResults" }, (resp) => {
    statusEl.textContent = "Results cleared";
  });
});

