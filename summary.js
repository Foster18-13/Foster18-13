const SUMMARY_STORAGE_KEY = "availableStockData";

function updateLastUpdated() {
  const label = document.getElementById("last-updated");
  if (!label) return;
  const now = new Date();
  label.textContent = `Last updated: ${now.toLocaleString()}`;
}

function loadSummaryData() {
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderSummaryRows() {
  const body = document.getElementById("summary-body");
  const data = loadSummaryData();
  body.innerHTML = "";

  if (!data.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "No stock data yet. Fill the Balance Sheet first.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  data.forEach((item) => {
    const tr = document.createElement("tr");

    const productCell = document.createElement("td");
    productCell.textContent = item.product || "";
    tr.appendChild(productCell);

    const stockCell = document.createElement("td");
    stockCell.textContent = String(Number(item.closing) || 0);
    tr.appendChild(stockCell);

    body.appendChild(tr);
  });

  updateLastUpdated();
}

function highlightRequestedItem() {
  const requested = new URLSearchParams(location.search).get("item");
  if (!requested) return;

  const rows = [...document.querySelectorAll("#summary-body tr")];
  let firstMatch = null;

  rows.forEach((row) => {
    row.classList.remove("searched-row");
    const productName = row.querySelector("td")?.textContent?.trim();
    if (productName === requested) {
      row.classList.add("searched-row");
      if (!firstMatch) {
        firstMatch = row;
      }
    }
  });

  if (firstMatch) {
    firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function refreshSummary() {
  if (typeof globalThis.cloudSyncHydrate === "function") {
    await globalThis.cloudSyncHydrate([SUMMARY_STORAGE_KEY, "portalProductList"]);
  }
  renderSummaryRows();
  highlightRequestedItem();
}

globalThis.addEventListener("DOMContentLoaded", async () => {
  renderNav(location.pathname);
  await refreshSummary();
  const refreshBtn = document.getElementById("refresh-summary-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshSummary);
  }
  setInterval(refreshSummary, 10000);
});
