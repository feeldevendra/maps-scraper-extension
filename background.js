let results = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startScrape') {
    results = [];
    const list = message.data; // array of {name, country}
    scrapeListSequential(list).then(() => {
      chrome.runtime.sendMessage({type: 'scrapeComplete', data: results});
      sendResponse({status: 'done'});
    });
    return true; // async
  }
});

// Delay helper
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeListSequential(list) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const query = encodeURIComponent(item.name + ' ' + item.country);
    const url = `https://www.google.com/maps/search/${query}`;
    try {
      const tab = await createTab(url);
      await waitForTabComplete(tab.id, 7000);

      const info = await executeScriptInTab(tab.id);
      let business = info || {};
      business.search_name = item.name;
      business.country = item.country;

      if (business.website && business.website !== 'Not found') {
        try {
          const email = await fetchEmailFromWebsite(business.website);
          business.email = email || 'Not found';
        } catch {
          business.email = 'Not found';
        }
      } else {
        business.email = 'Not found';
      }

      results.push(business);
      chrome.tabs.remove(tab.id);
      await sleep(1500);
    } catch (e) {
      console.error('Error scraping', item, e);
      results.push({ search_name: item.name, country: item.country, name: 'Error', address: '', phone: '', website: '', email: '' });
    }
  }
}

function createTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(tab);
    });
  });
}

function waitForTabComplete(tabId, timeout=8000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if(!done){ done=true; resolve(); } }, timeout);
    function listener(tabIdChanged, changeInfo) {
      if (tabIdChanged === tabId && changeInfo.status === 'complete') {
        if(!done){ done=true; clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); resolve(); }
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function executeScriptInTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      { target: { tabId }, func: () => {
          if (window.__mapsScraperExtract) {
            return window.__mapsScraperExtract();
          } else {
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
          }
        }
      },
      (res) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(res && res[0] && res[0].result ? res[0].result : null);
      }
    );
  });
}

async function fetchEmailFromWebsite(url) {
  const response = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await response.text();
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  if (m && m.length) return m[0];
  return null;
}
