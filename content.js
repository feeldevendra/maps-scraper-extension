// content.js
// This file is injected on Google Maps pages (from manifest host_permissions)

// Helper wait
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Wait for the maps search input to appear
async function getSearchInput(retries = 20) {
  for (let i = 0; i < retries; i++) {
    // Different locales/classes: try multiple selectors
    let el = document.querySelector("input#searchboxinput") ||
             document.querySelector("input[aria-label='Search Google Maps']") ||
             document.querySelector("input[aria-label='Search']");
    if (el) return el;
    await wait(500);
  }
  return null;
}

// Wait for place panel to show (right-side info)
async function waitForPanel(retries = 20) {
  for (let i = 0; i < retries; i++) {
    // typical info panel class
    let panel = document.querySelector("div[role='article']") || document.querySelector("div.section-hero-header") || document.querySelector("div[data-section-id='pane']") || document.querySelector("div[aria-label='Place details']");
    if (panel && panel.innerText.trim().length > 0) return panel;
    await wait(500);
  }
  return null;
}

// Extract details from currently-open place panel
function extractDetails() {
  const result = { name: "", phone: "", website: "", address: "" };

  // Name
  try {
    let nameEl = document.querySelector("h1.section-hero-header-title-title") || document.querySelector("h1[class*='fontHeadlineLarge']") || document.querySelector("h1");
    if (nameEl) result.name = nameEl.innerText.trim();
  } catch (e) {}

  // Phone, website, address often in buttons/links with aria-label or data attributes
  // Look for anchor tags with tel:, website links and address text nodes
  try {
    const anchors = Array.from(document.querySelectorAll("a"));
    anchors.forEach(a => {
      if (!result.website && a.href && a.href.startsWith("http") && a.getAttribute("aria-label") && a.getAttribute("aria-label").toLowerCase().includes("website")) {
        result.website = a.href;
      } else if (!result.website && a.href && a.href.startsWith("http") && a.closest("div[role='article']")) {
        // some websites are plain anchors in the panel
        // prefer those that don't go to google maps directions
        result.website = a.href;
      }
    });
  } catch (e) {}

  // phone and address via text scanning
  try {
    const panelText = (document.querySelector("div[role='article']") || document.body).innerText;
    // phone regex
    const phoneMatch = panelText.match(/(?:Phone|Call)?[:\s]*([+()0-9\s\-]{7,})/i);
    if (phoneMatch) result.phone = phoneMatch[1].trim();

    // address: look for lines with digits and street keywords or the word "Address"
    const addrMatch = panelText.match(/Address[:\s]*([^\n]{5,200})/i);
    if (addrMatch) {
      result.address = addrMatch[1].split("\n")[0].trim();
    } else {
      // fallback: try to find probable address lines
      const lines = panelText.split("\n").map(s => s.trim()).filter(Boolean);
      for (let ln of lines) {
        // heuristic: contains street, road, avenue, city or numbers
        if (/\d+/.test(ln) && /(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Suite|,)/i.test(ln)) {
          result.address = ln;
          break;
        }
      }
    }
  } catch (e) {}

  return result;
}

// Main scraping loop
async function runScrape() {
  // load companyList from storage
  const res = await new Promise(r => chrome.storage.local.get(["companyList"], r));
  const companies = (res.companyList || []).filter(c => c && c.name);
  if (!companies.length) {
    console.log("No companies found in storage to scrape.");
    return;
  }

  const searchInput = await getSearchInput();
  if (!searchInput) {
    console.log("Search input not found on Maps page.");
    return;
  }

  for (let idx = 0; idx < companies.length; idx++) {
    const company = companies[idx];
    console.log(`Searching ${idx+1}/${companies.length}:`, company.name, company.country);

    // Write into search box and trigger search
    try {
      // Focus and set value
      searchInput.focus();
      searchInput.value = `${company.name} ${company.country || ""}`;
      // dispatch input events to make maps react
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      // simulate Enter
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    } catch (e) {
      console.warn("Failed to enter search", e);
    }

    // wait for results (panel)
    await wait(2000);
    const panel = await waitForPanel(30); // wait up to ~15s
    await wait(1000);

    // extract details
    const scraped = extractDetails();
    const payload = {
      company: company.name,
      country: company.country,
      name: scraped.name || "",
      phone: scraped.phone || "",
      website: scraped.website || "",
      address: scraped.address || ""
    };

    // Send the new row to background
    chrome.runtime.sendMessage({ action: "newRow", data: payload });

    // small delay before next search to avoid aggressive behavior
    await wait(1200);
  }

  // finished
  console.log("Scraping finished.");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;
  if (message.action === "beginScrape") {
    // Run scrape (async)
    runScrape().catch(err => console.error("scrape error:", err));
  }
});
