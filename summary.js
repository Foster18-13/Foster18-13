const SUMMARY_STORAGE_KEY = "availableStockData";
const DAILY_BALANCE_STORAGE_KEY = "dailyBalanceSheetData";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSelectedSummaryDate() {
  const dateInput = document.getElementById("summary-date");
  return dateInput?.value || todayIsoDate();
}

function updateLastUpdated(dateKey) {
  const label = document.getElementById("last-updated");
  if (!label) return;
  const now = new Date();
  label.textContent = `Summary date: ${dateKey} · Updated: ${now.toLocaleString()}`;
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

function loadDailyBalanceData() {
  try {
    const raw = localStorage.getItem(DAILY_BALANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadSummaryDataForDate(dateKey) {
  const dailyBalance = loadDailyBalanceData();
  const dateRows = dailyBalance[dateKey];
  if (Array.isArray(dateRows)) {
    return dateRows;
  }
  return [];
}

function renderSummaryRows(dateKey) {
  const body = document.getElementById("summary-body");
  const dailyData = loadSummaryDataForDate(dateKey);
  const data = dailyData.length ? dailyData : loadSummaryData();
  body.innerHTML = "";

  if (!data.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = `No summary data for ${dateKey}. Fill and save the Balance Sheet for this date first.`;
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

  updateLastUpdated(dateKey);
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
  const dateKey = getSelectedSummaryDate();
  if (typeof globalThis.cloudSyncHydrate === "function") {
    await globalThis.cloudSyncHydrate([SUMMARY_STORAGE_KEY, DAILY_BALANCE_STORAGE_KEY, "portalProductList"]);
  }
  renderSummaryRows(dateKey);
  highlightRequestedItem();
}

globalThis.addEventListener("DOMContentLoaded", async () => {
  const dateInput = document.getElementById("summary-date");
  if (dateInput) {
    dateInput.value = todayIsoDate();
    dateInput.addEventListener("change", refreshSummary);
  }

  renderNav(location.pathname);
  await refreshSummary();

  const refreshBtn = document.getElementById("refresh-summary-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshSummary);
  }

  const loadBtn = document.getElementById("load-summary-btn");
  if (loadBtn) {
    loadBtn.addEventListener("click", refreshSummary);
  }

  setInterval(refreshSummary, 10000);
});
