const DAILY_RECORDS_STORAGE_KEY = "dailyRecordingSheetData";
const BALANCE_STORAGE_KEY = "availableStockData";
const DAILY_BALANCE_STORAGE_KEY = "dailyBalanceSheetData";
const LOADING_STORAGE_KEY = "recordingLoadingTotals";
const NOTE_STORAGE_KEY = "portalNoteContent";
const DAILY_NOTE_STORAGE_KEY = "dailyPortalNoteContent";

function showSavedBalanceStatus(message) {
  const status = document.getElementById("saved-balance-status");
  if (status) {
    status.textContent = message;
  }
}

function showSavedNoteStatus(message) {
  const status = document.getElementById("saved-note-status");
  if (status) {
    status.textContent = message;
  }
}

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
        renderSavedSheets();
      }
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      const nextName = prompt("Edit product name:", product);
      if (nextName === null) return;
      if (typeof globalThis.editProduct === "function" && globalThis.editProduct(product, nextName)) {
        showProductStatus("Product updated.");
        renderSavedSheets();
        return;
      }
      showProductStatus("Unable to update product name.");
    });

    item.appendChild(name);
    item.appendChild(editBtn);
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
      renderSavedSheets();
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

function populateSavedProductFilter() {
  const filter = document.getElementById("saved-product-filter");
  if (!filter) return;

  const previous = filter.value;
  filter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Products";
  filter.appendChild(allOption);

  getManagedProductList().forEach((product) => {
    const option = document.createElement("option");
    option.value = product;
    option.textContent = product;
    filter.appendChild(option);
  });

  if ([...filter.options].some((option) => option.value === previous)) {
    filter.value = previous;
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

  const activeFilter = document.getElementById("saved-product-filter")?.value || "";
  const dailyBalance = safeReadObject(DAILY_BALANCE_STORAGE_KEY);
  const dates = Object.keys(dailyBalance).sort((a, b) => b.localeCompare(a));
  const loadedMap = safeReadObject(LOADING_STORAGE_KEY);

  if (!dates.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "No saved balance/summary data yet.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  const productOptions = getManagedProductList();

  function saveEditedBalanceRow(dateKey, rowIndex, payload) {
    const allDaily = safeReadObject(DAILY_BALANCE_STORAGE_KEY);
    const dateRows = Array.isArray(allDaily[dateKey]) ? allDaily[dateKey] : [];
    if (!dateRows[rowIndex]) return;

    dateRows[rowIndex] = {
      ...dateRows[rowIndex],
      product: payload.product,
      loaded: payload.loaded,
      closing: payload.closing,
      remark: payload.remark
    };

    allDaily[dateKey] = dateRows;
    localStorage.setItem(DAILY_BALANCE_STORAGE_KEY, JSON.stringify(allDaily));

    const nextLoadedMap = safeReadObject(LOADING_STORAGE_KEY);
    nextLoadedMap[payload.product] = payload.loaded;
    localStorage.setItem(LOADING_STORAGE_KEY, JSON.stringify(nextLoadedMap));

    localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(dateRows));

    if (typeof globalThis.cloudSyncSaveKey === "function") {
      globalThis.cloudSyncSaveKey(DAILY_BALANCE_STORAGE_KEY, allDaily);
      globalThis.cloudSyncSaveKey(LOADING_STORAGE_KEY, nextLoadedMap);
      globalThis.cloudSyncSaveKey(BALANCE_STORAGE_KEY, dateRows);
    }

    showSavedBalanceStatus(`Saved ${payload.product} for ${dateKey}`);
    renderBalanceAndSummaryData();
  }

  dates.forEach((dateKey) => {
    const rows = Array.isArray(dailyBalance[dateKey]) ? dailyBalance[dateKey] : [];
    rows.forEach((row, rowIndex) => {
      if (activeFilter && row.product !== activeFilter) {
        return;
      }

      const tr = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = dateKey;
      tr.appendChild(dateCell);

      const productCell = document.createElement("td");
      const productSelect = document.createElement("select");
      productOptions.forEach((product) => {
        const option = document.createElement("option");
        option.value = product;
        option.textContent = product;
        if (product === row.product) {
          option.selected = true;
        }
        productSelect.appendChild(option);
      });
      productCell.appendChild(productSelect);
      tr.appendChild(productCell);

      const loadedCell = document.createElement("td");
      const loadedInput = document.createElement("input");
      loadedInput.type = "number";
      loadedInput.min = "0";
      loadedInput.value = String(Number(loadedMap[row.product] ?? row.loaded ?? 0));
      loadedCell.appendChild(loadedInput);
      tr.appendChild(loadedCell);

      const closingCell = document.createElement("td");
      const closingInput = document.createElement("input");
      closingInput.type = "number";
      closingInput.value = String(Number(row.closing ?? 0));
      closingCell.appendChild(closingInput);
      tr.appendChild(closingCell);

      const remarkCell = document.createElement("td");
      const remarkInput = document.createElement("input");
      remarkInput.type = "number";
      remarkInput.value = String(Number(row.remark ?? 0));
      remarkCell.appendChild(remarkInput);
      tr.appendChild(remarkCell);

      const actionCell = document.createElement("td");
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", () => {
        saveEditedBalanceRow(dateKey, rowIndex, {
          product: productSelect.value,
          loaded: Number(loadedInput.value) || 0,
          closing: Number(closingInput.value) || 0,
          remark: Number(remarkInput.value) || 0
        });
      });
      actionCell.appendChild(saveBtn);
      tr.appendChild(actionCell);

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

  function saveEditedNote(dateKey, text) {
    const dailyNotes = safeReadObject(DAILY_NOTE_STORAGE_KEY);
    dailyNotes[dateKey] = text;
    localStorage.setItem(DAILY_NOTE_STORAGE_KEY, JSON.stringify(dailyNotes));
    localStorage.setItem(NOTE_STORAGE_KEY, text);

    if (typeof globalThis.cloudSyncSaveKey === "function") {
      globalThis.cloudSyncSaveKey(DAILY_NOTE_STORAGE_KEY, dailyNotes);
      globalThis.cloudSyncSaveKey(NOTE_STORAGE_KEY, text);
    }

    showSavedNoteStatus(`Saved note for ${dateKey}`);
    renderNotesData();
  }

  dates.forEach((dateKey) => {
    const tr = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = dateKey;
    tr.appendChild(dateCell);

    const noteCell = document.createElement("td");
    const noteInput = document.createElement("textarea");
    noteInput.rows = 3;
    noteInput.value = String(dailyNotes[dateKey] || "");
    noteCell.appendChild(noteInput);
    tr.appendChild(noteCell);

    const actionCell = document.createElement("td");
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      saveEditedNote(dateKey, noteInput.value || "");
    });
    actionCell.appendChild(saveBtn);
    tr.appendChild(actionCell);

    body.appendChild(tr);
  });
}

function renderSavedSheets() {
  populateSavedProductFilter();
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

  const productFilter = document.getElementById("saved-product-filter");
  if (productFilter) {
    productFilter.addEventListener("change", renderBalanceAndSummaryData);
  }

  const refreshBtn = document.getElementById("refresh-saved-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await hydrateSavedSheetsData();
      renderSavedSheets();
    });
  }
});
