const DAILY_RECORDS_STORAGE_KEY = "dailyRecordingSheetData";
const BALANCE_STORAGE_KEY = "availableStockData";
const LOADING_STORAGE_KEY = "recordingLoadingTotals";
const NOTE_STORAGE_KEY = "portalNoteContent";

function safeReadObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeReadArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderRecordingDailySaves() {
  const body = document.getElementById("saved-recording-body");
  body.innerHTML = "";

  const dailyRecords = safeReadObject(DAILY_RECORDS_STORAGE_KEY);
  const dates = Object.keys(dailyRecords).sort((a, b) => b.localeCompare(a));

  if (!dates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "No saved recording days yet.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  dates.forEach((dateKey) => {
    const item = dailyRecords[dateKey] || {};
    const tr = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = dateKey;
    tr.appendChild(dateCell);

    const rowsCell = document.createElement("td");
    rowsCell.textContent = String((item.rows || []).length);
    tr.appendChild(rowsCell);

    const colsCell = document.createElement("td");
    colsCell.textContent = String(item.untitledColumns || 0);
    tr.appendChild(colsCell);

    body.appendChild(tr);
  });
}

function renderBalanceAndSummaryData() {
  const body = document.getElementById("saved-balance-body");
  body.innerHTML = "";

  const balanceRows = safeReadArray(BALANCE_STORAGE_KEY);
  const loadedMap = safeReadObject(LOADING_STORAGE_KEY);

  if (!balanceRows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No saved balance/summary data yet.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  balanceRows.forEach((row) => {
    const tr = document.createElement("tr");

    const productCell = document.createElement("td");
    productCell.textContent = row.product || "";
    tr.appendChild(productCell);

    const loadedCell = document.createElement("td");
    loadedCell.textContent = String(Number(loadedMap[row.product] ?? row.loaded ?? 0));
    tr.appendChild(loadedCell);

    const closingCell = document.createElement("td");
    closingCell.textContent = String(Number(row.closing ?? 0));
    tr.appendChild(closingCell);

    const remarkCell = document.createElement("td");
    remarkCell.textContent = String(Number(row.remark ?? 0));
    tr.appendChild(remarkCell);

    body.appendChild(tr);
  });
}

function renderNotesData() {
  const preview = document.getElementById("saved-note-preview");
  const text = localStorage.getItem(NOTE_STORAGE_KEY) || "";

  if (!text.trim()) {
    preview.textContent = "No saved notes yet.";
    return;
  }

  preview.textContent = text;
}

function renderSavedSheets() {
  renderRecordingDailySaves();
  renderBalanceAndSummaryData();
  renderNotesData();
}

window.addEventListener("DOMContentLoaded", () => {
  renderNav(location.pathname);
  renderSavedSheets();
  const refreshBtn = document.getElementById("refresh-saved-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", renderSavedSheets);
  }
});
