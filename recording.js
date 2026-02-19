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

let untitledColumns = 6;
const LOADING_STORAGE_KEY = "recordingLoadingTotals";

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

function buildRecordingRows() {
  const body = document.getElementById("recording-body");
  body.innerHTML = "";

  recordingProducts.forEach((product) => {
    for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
      const tr = document.createElement("tr");

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
  buildRecordingRows();
  highlightRequestedItem();
  document.getElementById("add-column-btn").addEventListener("click", addUntitledColumn);
});
