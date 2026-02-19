const recordingProducts = [
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
  "DrMalt – Classic Malt – 330ml x 24",
  "Rasta Choco Malt – Chocolate Malt – 330ml x 16"
];

function getActiveRecordingProducts() {
  if (typeof globalThis.getProductList === "function") {
    const list = globalThis.getProductList();
    if (Array.isArray(list) && list.length) {
      return list;
    }
  }
  return recordingProducts;
}

let untitledColumns = 6;
const LOADING_STORAGE_KEY = "recordingLoadingTotals";
const DAILY_RECORDS_STORAGE_KEY = "dailyRecordingSheetData";

function createInputCell() {
  const td = document.createElement("td");
  td.className = "double-input-cell";

  const mainInput = document.createElement("input");
  mainInput.type = "number";
  mainInput.min = "0";
  mainInput.value = "0";
  mainInput.className = "record-cell";
  mainInput.addEventListener("input", () => updateRowTotal(td.parentElement));
  td.appendChild(mainInput);

  const extraInput = document.createElement("input");
  extraInput.type = "text";
  extraInput.className = "extra-cell";
  extraInput.placeholder = "Extra";
  extraInput.addEventListener("input", () => saveLoadingTotals());
  td.appendChild(extraInput);

  return td;
}

function updateRowTotal(row) {
  const values = [...row.querySelectorAll("input.record-cell")].map((el) => Number(el.value) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  row.querySelector("input.total-cell").value = total;
  saveLoadingTotals();
}

function saveLoadingTotals() {
  const totalsByProduct = {};

  [...document.querySelectorAll("#recording-body tr")].forEach((row) => {
    const product = row.querySelector("td")?.textContent?.trim() || "";
    const rowTotal = Number(row.querySelector("input.total-cell")?.value) || 0;
    totalsByProduct[product] = (totalsByProduct[product] || 0) + rowTotal;
  });

  localStorage.setItem(LOADING_STORAGE_KEY, JSON.stringify(totalsByProduct));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSelectedDate() {
  const dateInput = document.getElementById("record-date");
  return dateInput?.value || todayIsoDate();
}

function showSaveStatus(text) {
  const status = document.getElementById("record-save-status");
  if (status) {
    status.textContent = text;
  }
}

function buildRowId(row) {
  return `${row.dataset.product}__${row.dataset.rowIndex}`;
}

function readAllDailyRecords() {
  try {
    const raw = localStorage.getItem(DAILY_RECORDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllDailyRecords(records) {
  localStorage.setItem(DAILY_RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function collectCurrentSheetData() {
  const rows = [...document.querySelectorAll("#recording-body tr")].map((row) => {
    const numericValues = [...row.querySelectorAll("input.record-cell")].map((input) => input.value || "0");
    const extraValues = [...row.querySelectorAll("input.extra-cell")].map((input) => input.value || "");
    return {
      rowId: buildRowId(row),
      numericValues,
      extraValues
    };
  });

  return {
    untitledColumns,
    rows
  };
}

function saveDailyRecord() {
  const dateKey = getSelectedDate();
  const allRecords = readAllDailyRecords();
  allRecords[dateKey] = collectCurrentSheetData();
  writeAllDailyRecords(allRecords);
  showSaveStatus(`Saved for ${dateKey}`);
}

function applySavedSheetData(savedData) {
  if (!savedData) return;

  while (untitledColumns < (savedData.untitledColumns || 6)) {
    addUntitledColumn();
  }

  const savedRowMap = new Map((savedData.rows || []).map((row) => [row.rowId, row]));

  [...document.querySelectorAll("#recording-body tr")].forEach((row) => {
    const savedRow = savedRowMap.get(buildRowId(row));
    if (!savedRow) return;

    const numericInputs = [...row.querySelectorAll("input.record-cell")];
    const extraInputs = [...row.querySelectorAll("input.extra-cell")];

    numericInputs.forEach((input, index) => {
      input.value = savedRow.numericValues?.[index] ?? "0";
    });

    extraInputs.forEach((input, index) => {
      input.value = savedRow.extraValues?.[index] ?? "";
    });

    updateRowTotal(row);
  });

  saveLoadingTotals();
}

function loadDailyRecord() {
  const dateKey = getSelectedDate();
  const allRecords = readAllDailyRecords();
  const savedData = allRecords[dateKey];

  if (!savedData) {
    showSaveStatus(`No saved data for ${dateKey}`);
    return;
  }

  buildRecordingRows();
  applySavedSheetData(savedData);
  highlightRequestedItem();
  showSaveStatus(`Loaded data for ${dateKey}`);
}

function buildRecordingRows() {
  const body = document.getElementById("recording-body");
  body.innerHTML = "";

  getActiveRecordingProducts().forEach((product) => {
    for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
      const tr = document.createElement("tr");
      tr.dataset.product = product;
      tr.dataset.rowIndex = String(rowIndex + 1);

      const productCell = document.createElement("td");
      productCell.textContent = product;
      tr.appendChild(productCell);

      const totalCell = document.createElement("td");
      const totalInput = document.createElement("input");
      totalInput.type = "number";
      totalInput.className = "total-cell";
      totalInput.readOnly = true;
      totalInput.value = "0";
      totalCell.className = "readonly";
      totalCell.appendChild(totalInput);
      tr.appendChild(totalCell);

      for (let i = 0; i < untitledColumns; i += 1) {
        tr.appendChild(createInputCell());
      }

      body.appendChild(tr);
    }
  });

  saveLoadingTotals();
}

function addUntitledColumn() {
  untitledColumns += 1;

  const headRow = document.getElementById("recording-head");
  const blank = document.createElement("th");
  blank.className = "blank";
  blank.textContent = "";
  headRow.appendChild(blank);

  [...document.querySelectorAll("#recording-body tr")].forEach((row) => {
    row.appendChild(createInputCell());
  });

  saveLoadingTotals();
}

function highlightRequestedItem() {
  const requested = new URLSearchParams(location.search).get("item");
  if (!requested) return;

  const rows = [...document.querySelectorAll("#recording-body tr")];
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

window.addEventListener("DOMContentLoaded", () => {
  renderNav(location.pathname);
  const dateInput = document.getElementById("record-date");
  if (dateInput) {
    dateInput.value = todayIsoDate();
    dateInput.addEventListener("change", loadDailyRecord);
  }
  buildRecordingRows();
  loadDailyRecord();
  highlightRequestedItem();
  document.getElementById("save-record-btn").addEventListener("click", saveDailyRecord);
  document.getElementById("load-record-btn").addEventListener("click", loadDailyRecord);
  document.getElementById("add-column-btn").addEventListener("click", addUntitledColumn);
});
