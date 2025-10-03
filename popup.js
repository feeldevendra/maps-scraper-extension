let entries = [];
let latestResults = [];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const rows = lines.map(line => line.split(',').map(c=>c.trim()));
  if (rows.length && rows[0].length>=2) {
    const h0 = rows[0][0].toLowerCase();
    const h1 = rows[0][1].toLowerCase();
    if ((h0.includes('name') && h1.includes('country')) || (h0.includes('company') && h1.includes('country'))) {
      rows.shift();
    }
  }
  return rows.map(r => ({ name: r[0]||'', country: r[1]||'' }));
}

document.getElementById('startBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('csvFile');
  if (!fileInput.files.length) { alert('Please upload a CSV file first'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    entries = parseCSV(e.target.result);
    if (!entries.length) { alert('No rows found'); return; }
    chrome.runtime.sendMessage({ type: 'startScrape', data: entries }, () => {
      showStatus('Scraping started for ' + entries.length + ' items.');
    });
  };
  reader.readAsText(fileInput.files[0]);
});

function showStatus(msg) {
  document.getElementById('results').innerText = msg;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'scrapeComplete') {
    latestResults = message.data || [];
    showResults(latestResults);
  }
});

function showResults(rows) {
  const el = document.getElementById('results');
  if (!rows.length) { el.innerText = 'No results'; return; }
  const headers = ['Search Name','Country','Name','Address','Website','Phone','Email'];
  const csvLines = [headers.join(',')].concat(rows.map(r => {
    return [r.search_name||'', r.country||'', r.name||'', r.address||'', r.website||'', r.phone||'', r.email||'']
      .map(escapeCsv).join(',');
  }));
  el.innerText = 'Scrape complete. ' + rows.length + ' items.';
  el.dataset.csv = csvLines.join('\n');
}

function escapeCsv(s){
  if (!s) return '';
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g,'""') + '"';
  }
  return s;
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  const el = document.getElementById('results');
  const csv = el.dataset.csv || '';
  if (!csv) { alert('No results yet. Run a scrape first.'); return; }
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'maps_scraped_results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
});
