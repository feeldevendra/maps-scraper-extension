// results.js
const tbody = document.querySelector("#resultsTable tbody");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

function addRowToTable(row, idx) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${idx}</td>
    <td>${escapeHtml(row.company || "")}</td>
    <td>${escapeHtml(row.country || "")}</td>
    <td>${escapeHtml(row.name || "")}</td>
    <td>${escapeHtml(row.phone || "")}</td>
    <td>${row.website ? `<a href="${row.website}" target="_blank">${escapeHtml(row.website)}</a>` : ""}</td>
    <td>${escapeHtml(row.address || "")}</td>
  `;
  tbody.appendChild(tr);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// load existing scraped data
chrome.runtime.sendMessage({ action: "requestExistingData" }, (response) => {
  const rows = (response && response.data) || [];
  tbody.innerHTML = "";
  rows.forEach((r, i) => addRowToTable(r, i+1));
});

// Listen for live new rows (forwarded by background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;
  if (message.action === "newRow") {
    // append to table
    const curCount = tbody.querySelectorAll("tr").length;
    addRowToTable(message.data, curCount + 1);
  }
});

// download/export
downloadBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadCSV" });
});

// clear results
clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "clearResults" }, (resp) => {
    tbody.innerHTML = "";
  });
});
