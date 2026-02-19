const DAILY_RECORDS_STORAGE_KEY = "dailyRecordingSheetData";
const BALANCE_STORAGE_KEY = "availableStockData";
const DAILY_BALANCE_STORAGE_KEY = "dailyBalanceSheetData";
const LOADING_STORAGE_KEY = "recordingLoadingTotals";
const NOTE_STORAGE_KEY = "portalNoteContent";
const DAILY_NOTE_STORAGE_KEY = "dailyPortalNoteContent";

function showProductStatus(message) {
  const status = document.getElementById("product-manage-status");
  if (status) {
    status.textContent = message;
  }
}

function getManagedProductList() {
  if (typeof globalThis.getProductList === "function") {
    return globalThis.getProductList();
  }
  return [];
}

function renderProductManager() {
  const box = document.getElementById("product-list-box");
  if (!box) return;

  const products = getManagedProductList();
  box.innerHTML = "";

  if (!products.length) {
    const empty = document.createElement("p");
    empty.textContent = "No products available.";
    box.appendChild(empty);
    return;
  }

  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "product-item";

    const name = document.createElement("span");
    name.textContent = product;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      if (typeof globalThis.removeProduct === "function" && globalThis.removeProduct(product)) {
        showProductStatus("Product removed.");
        renderProductManager();
      }
    });

    item.appendChild(name);
    item.appendChild(removeBtn);
    box.appendChild(item);
  });
}

function setupProductManagerActions() {
  const addBtn = document.getElementById("add-product-btn");
  const input = document.getElementById("new-product-input");
  if (!addBtn || !input) return;

  addBtn.addEventListener("click", () => {
    const productName = input.value.trim();
    if (!productName) {
      showProductStatus("Enter a product name.");
      return;
    }

    if (typeof globalThis.addProduct === "function" && globalThis.addProduct(productName)) {
      input.value = "";
      showProductStatus("Product added.");
      renderProductManager();
      return;
    }

    showProductStatus("Product already exists or cannot be added.");
  });
}

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

  const dailyBalance = safeReadObject(DAILY_BALANCE_STORAGE_KEY);
  const dates = Object.keys(dailyBalance).sort((a, b) => b.localeCompare(a));
  const loadedMap = safeReadObject(LOADING_STORAGE_KEY);

  if (!dates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No saved balance/summary data yet.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  dates.forEach((dateKey) => {
    const rows = Array.isArray(dailyBalance[dateKey]) ? dailyBalance[dateKey] : [];
    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = dateKey;
      tr.appendChild(dateCell);

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
  });
}

function renderNotesData() {
  const body = document.getElementById("saved-note-body");
  body.innerHTML = "";

  const dailyNotes = safeReadObject(DAILY_NOTE_STORAGE_KEY);
  const dates = Object.keys(dailyNotes).sort((a, b) => b.localeCompare(a));

  if (!dates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = "No saved notes yet.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  dates.forEach((dateKey) => {
    const tr = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = dateKey;
    tr.appendChild(dateCell);

    const noteCell = document.createElement("td");
    noteCell.textContent = String(dailyNotes[dateKey] || "");
    tr.appendChild(noteCell);

    body.appendChild(tr);
  });
}

function renderSavedSheets() {
  renderRecordingDailySaves();
  renderBalanceAndSummaryData();
  renderNotesData();
  renderProductManager();
}

async function hydrateSavedSheetsData() {
  if (typeof globalThis.cloudSyncHydrateAll === "function") {
    await globalThis.cloudSyncHydrateAll();
  }
}

globalThis.addEventListener("DOMContentLoaded", async () => {
  await hydrateSavedSheetsData();
  renderNav(location.pathname);
  setupProductManagerActions();
  renderSavedSheets();
  const refreshBtn = document.getElementById("refresh-saved-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await hydrateSavedSheetsData();
      renderSavedSheets();
    });
  }
});
