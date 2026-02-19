const balanceProducts = [
  "Verna Natural Mineral Water – Neutral – 500ml x 24",
  "Verna Natural Mineral Water – Neutral – 500ml x 16",
  "Verna Natural Mineral Water – Neutral – 750ml x 16",
  "Verna Natural Mineral Water – Neutral – 1.5L x 6",
  "Sports Water by Verna – Zesty Lemon – 500ml x 16",
  "Verna Active – Electrolyte – 500ml x 16",
  "Slemfit Water – Purified – 500ml x 16",
  "Rosa Still Water – Premium Neutral – 330ml x 16",
  "Rush Energy Drink – Classic – 350ml x 12",
  "Run Energy Drink – Classic – 350ml x 16",
  "American Cola – Original – 350ml x 16",
  "Bubble Up – Lemon Lime – 350ml x 20",
  "Planet – Cocktail – 350ml x 20",
  "Planet – Orange – 350ml x 20",
  "Planet – Pineapple – 350ml x 20",
  "Bigoo – Apple – 350ml x 20",
  "Bigoo – Cocktail – 350ml x 20",
  "Bigoo – Coconut – 350ml x 20",
  "Bigoo – Cola – 350ml x 20",
  "Bigoo – Grape – 350ml x 20",
  "Bigoo – Lemon Lime – 350ml x 20",
  "Bigoo – Orange – 350ml x 20",
  "DrMalt – Classic Malt – 330ml x 24"
];

function getActiveBalanceProducts() {
  if (typeof globalThis.getProductList === "function") {
    const list = globalThis.getProductList();
    if (Array.isArray(list) && list.length) {
      return list;
    }
  }
  return balanceProducts;
}

const BALANCE_STORAGE_KEY = "availableStockData";
const DAILY_BALANCE_STORAGE_KEY = "dailyBalanceSheetData";
const LOADING_STORAGE_KEY = "recordingLoadingTotals";
let balanceAutoSaveTimer = null;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSelectedBalanceDate() {
  const dateInput = document.getElementById("balance-date");
  return dateInput?.value || todayIsoDate();
}

function showBalanceSaveStatus(message) {
  const status = document.getElementById("balance-save-status");
  if (status) {
    status.textContent = message;
  }
}

function readDailyBalanceRecords() {
  try {
    const raw = localStorage.getItem(DAILY_BALANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDailyBalanceRecords(records) {
  localStorage.setItem(DAILY_BALANCE_STORAGE_KEY, JSON.stringify(records));
}

function balanceInput(name) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = "0";
  input.className = name;
  return input;
}

function calculateForRow(row) {
  const opening = Number(row.querySelector(".opening").value) || 0;
  const received = Number(row.querySelector(".received").value) || 0;
  const returned = Number(row.querySelector(".returned").value) || 0;
  const damaged = Number(row.querySelector(".damaged").value) || 0;
  const loaded = Number(row.querySelector(".loaded").value) || 0;
  const closing = Number(row.querySelector(".closing").value) || 0;

  const balance = opening + received + returned - damaged - loaded;
  row.querySelector(".balance").value = balance;
  row.querySelector(".remark").value = closing - balance;
}

function getRowData(row) {
  return {
    product: row.dataset.product,
    opening: Number(row.querySelector(".opening").value) || 0,
    received: Number(row.querySelector(".received").value) || 0,
    returned: Number(row.querySelector(".returned").value) || 0,
    damaged: Number(row.querySelector(".damaged").value) || 0,
    loaded: Number(row.querySelector(".loaded").value) || 0,
    balance: Number(row.querySelector(".balance").value) || 0,
    closing: Number(row.querySelector(".closing").value) || 0,
    remark: Number(row.querySelector(".remark").value) || 0
  };
}

function saveAllRows() {
  const rows = [...document.querySelectorAll("#balance-body tr")].map((row) => getRowData(row));
  localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(rows));
  return rows;
}

function saveBalanceRecord(showStatus = true) {
  const dateKey = getSelectedBalanceDate();
  const rows = saveAllRows();
  const dailyRecords = readDailyBalanceRecords();
  dailyRecords[dateKey] = rows;
  writeDailyBalanceRecords(dailyRecords);

  if (typeof globalThis.cloudSyncSaveKey === "function") {
    globalThis.cloudSyncSaveKey(BALANCE_STORAGE_KEY, rows);
    globalThis.cloudSyncSaveKey(DAILY_BALANCE_STORAGE_KEY, dailyRecords);
  }
  if (showStatus) {
    showBalanceSaveStatus(`Saved for ${dateKey}`);
  }
}

function queueAutoSaveBalance() {
  if (balanceAutoSaveTimer) {
    clearTimeout(balanceAutoSaveTimer);
  }
  balanceAutoSaveTimer = setTimeout(() => {
    saveBalanceRecord(false);
    showBalanceSaveStatus(`Auto-saved for ${getSelectedBalanceDate()}`);
  }, 1200);
}

function loadSavedData() {
  try {
    const raw = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSavedDataForDate(dateKey) {
  const dailyRecords = readDailyBalanceRecords();
  const rows = dailyRecords[dateKey];
  return Array.isArray(rows) ? rows : [];
}

function applySavedValues(row, savedRow) {
  row.querySelector(".opening").value = savedRow.opening ?? 0;
  row.querySelector(".received").value = savedRow.received ?? 0;
  row.querySelector(".returned").value = savedRow.returned ?? 0;
  row.querySelector(".damaged").value = savedRow.damaged ?? 0;
  row.querySelector(".closing").value = savedRow.closing ?? 0;
}

function loadLoadingTotals() {
  try {
    const raw = localStorage.getItem(LOADING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function attachRecalc(row) {
  [".opening", ".received", ".returned", ".damaged", ".closing"].forEach((selector) => {
    row.querySelector(selector).addEventListener("input", () => {
      calculateForRow(row);
      saveAllRows();
      queueAutoSaveBalance();
    });
  });
}

function buildBalanceRows(savedRows = loadSavedData()) {
  const body = document.getElementById("balance-body");
  body.innerHTML = "";
  const savedByProduct = new Map(savedRows.map((item) => [item.product, item]));
  const loadingTotals = loadLoadingTotals();

  getActiveBalanceProducts().forEach((product) => {
    const tr = document.createElement("tr");
    tr.dataset.product = product;

    const productCell = document.createElement("td");
    productCell.textContent = product;
    tr.appendChild(productCell);

    const openingCell = document.createElement("td");
    openingCell.appendChild(balanceInput("opening"));
    tr.appendChild(openingCell);

    const receivedCell = document.createElement("td");
    receivedCell.appendChild(balanceInput("received"));
    tr.appendChild(receivedCell);

    const returnedCell = document.createElement("td");
    returnedCell.appendChild(balanceInput("returned"));
    tr.appendChild(returnedCell);

    const damagedCell = document.createElement("td");
    damagedCell.appendChild(balanceInput("damaged"));
    tr.appendChild(damagedCell);

    const loadedCell = document.createElement("td");
    const loadedInput = balanceInput("loaded");
    loadedInput.readOnly = true;
    loadedCell.className = "readonly";
    loadedCell.appendChild(loadedInput);
    tr.appendChild(loadedCell);

    const balanceCell = document.createElement("td");
    const balanceValue = document.createElement("input");
    balanceValue.type = "number";
    balanceValue.readOnly = true;
    balanceValue.value = "0";
    balanceValue.className = "balance";
    balanceCell.className = "readonly";
    balanceCell.appendChild(balanceValue);
    tr.appendChild(balanceCell);

    const closingCell = document.createElement("td");
    const closingValue = document.createElement("input");
    closingValue.type = "number";
    closingValue.value = "0";
    closingValue.className = "closing";
    closingCell.appendChild(closingValue);
    tr.appendChild(closingCell);

    const remarkCell = document.createElement("td");
    const remarkValue = document.createElement("input");
    remarkValue.type = "number";
    remarkValue.readOnly = true;
    remarkValue.value = "0";
    remarkValue.className = "remark";
    remarkCell.className = "readonly";
    remarkCell.appendChild(remarkValue);
    tr.appendChild(remarkCell);

    body.appendChild(tr);

    const saved = savedByProduct.get(product);
    if (saved) {
      applySavedValues(tr, saved);
    }

    tr.querySelector(".loaded").value = Number(loadingTotals[product]) || 0;

    attachRecalc(tr);
    calculateForRow(tr);
  });

  saveAllRows();
}

async function loadBalanceRecord() {
  if (typeof globalThis.cloudSyncHydrate === "function") {
    await globalThis.cloudSyncHydrate([DAILY_BALANCE_STORAGE_KEY, LOADING_STORAGE_KEY]);
  }

  const dateKey = getSelectedBalanceDate();
  const rows = loadSavedDataForDate(dateKey);
  if (!rows.length) {
    showBalanceSaveStatus(`No saved balance for ${dateKey}`);
    buildBalanceRows();
    highlightRequestedItem();
    return;
  }

  buildBalanceRows(rows);
  highlightRequestedItem();
  showBalanceSaveStatus(`Loaded balance for ${dateKey}`);
}

function highlightRequestedItem() {
  const requested = new URLSearchParams(location.search).get("item");
  if (!requested) return;

  const rows = [...document.querySelectorAll("#balance-body tr")];
  let firstMatch = null;

  rows.forEach((row) => {
    row.classList.remove("searched-row");
    const productName = row.dataset.product?.trim();
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

globalThis.addEventListener("DOMContentLoaded", () => {
  const init = async () => {
    if (typeof globalThis.cloudSyncHydrate === "function") {
      await globalThis.cloudSyncHydrate([BALANCE_STORAGE_KEY, DAILY_BALANCE_STORAGE_KEY, LOADING_STORAGE_KEY, "portalProductList"]);
    }

    const dateInput = document.getElementById("balance-date");
    if (dateInput) {
      dateInput.value = todayIsoDate();
      dateInput.addEventListener("change", loadBalanceRecord);
    }

    renderNav(location.pathname);
    await loadBalanceRecord();
    highlightRequestedItem();

    const saveBtn = document.getElementById("save-balance-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => saveBalanceRecord(true));
    }

    const loadBtn = document.getElementById("load-balance-btn");
    if (loadBtn) {
      loadBtn.addEventListener("click", loadBalanceRecord);
    }

    setInterval(() => {
      saveBalanceRecord(false);
    }, 120000);

    if (typeof globalThis.cloudSyncSubscribe === "function") {
      globalThis.cloudSyncSubscribe([BALANCE_STORAGE_KEY, DAILY_BALANCE_STORAGE_KEY, LOADING_STORAGE_KEY, "portalProductList"], async () => {
        await loadBalanceRecord();
      });
    }
  };
  init();
});
