const links = [
  ["index.html", "Home"],
  ["recording-sheet.html", "Recording Sheet"],
  ["balance-sheet.html", "Balance Sheet"],
  ["summary-sheet.html", "Summary Sheet"],
  ["saved-sheets.html", "Saved Sheets"],
  ["page6.html", "Note"]
];

const PRODUCT_LIST_STORAGE_KEY = "portalProductList";

const defaultProductList = [
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

function readStoredProductList() {
  try {
    const raw = localStorage.getItem(PRODUCT_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
  } catch {
    return [];
  }
}

function saveProductList(list) {
  localStorage.setItem(PRODUCT_LIST_STORAGE_KEY, JSON.stringify(list));
  if (typeof globalThis.cloudSyncSaveKey === "function") {
    globalThis.cloudSyncSaveKey(PRODUCT_LIST_STORAGE_KEY, list);
  }
}

function getProductList() {
  const stored = readStoredProductList();
  return stored.length ? stored : [...defaultProductList];
}

function addProduct(productName) {
  const name = (productName || "").trim();
  if (!name) return false;

  const current = getProductList();
  const alreadyExists = current.some((item) => item.toLowerCase() === name.toLowerCase());
  if (alreadyExists) return false;

  saveProductList([...current, name]);
  return true;
}

function removeProduct(productName) {
  const name = (productName || "").trim();
  if (!name) return false;

  const current = getProductList();
  const next = current.filter((item) => item !== name);
  if (next.length === current.length) return false;

  saveProductList(next);
  return true;
}

function editProduct(oldProductName, newProductName) {
  const oldName = (oldProductName || "").trim();
  const newName = (newProductName || "").trim();
  if (!oldName || !newName) return false;

  const current = getProductList();
  const oldIndex = current.indexOf(oldName);
  if (oldIndex < 0) return false;

  const duplicate = current.some((item, index) => index !== oldIndex && item.toLowerCase() === newName.toLowerCase());
  if (duplicate) return false;

  const next = [...current];
  next[oldIndex] = newName;
  saveProductList(next);
  return true;
}

globalThis.getProductList = getProductList;
globalThis.addProduct = addProduct;
globalThis.removeProduct = removeProduct;
globalThis.editProduct = editProduct;

function getSearchItems() {
  const pageItems = links.map(([href, label]) => ({
    label,
    type: "Page",
    href
  }));

  const productItems = getProductList().map((label) => ({
    label,
    type: "Item",
    href: `recording-sheet.html?item=${encodeURIComponent(label)}`
  }));

  return [...pageItems, ...productItems];
}

function renderGlobalSearch() {
  const navWrap = document.querySelector(".nav-wrap");
  if (!navWrap || document.getElementById("global-search-wrap")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "global-search";
  wrapper.id = "global-search-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "global-search-input";
  input.placeholder = "Search pages or items...";
  input.autocomplete = "off";

  const results = document.createElement("div");
  results.className = "search-results";
  results.id = "global-search-results";

  wrapper.appendChild(input);
  wrapper.appendChild(results);
  navWrap.appendChild(wrapper);

  const items = getSearchItems();

  function openItem(item) {
    location.href = item.href;
  }

  function renderResults(queryText) {
    const query = queryText.trim().toLowerCase();
    if (!query) {
      results.classList.remove("open");
      results.innerHTML = "";
      return;
    }

    const matches = items
      .filter((item) => item.label.toLowerCase().includes(query))
      .slice(0, 12);

    if (!matches.length) {
      results.classList.add("open");
      results.innerHTML = '<div class="search-empty">No matching item found</div>';
      return;
    }

    results.classList.add("open");
    results.innerHTML = "";

    matches.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-item";
      button.innerHTML = `<span class="search-label">${item.label}</span><span class="search-type">${item.type}</span>`;
      button.addEventListener("click", () => openItem(item));
      results.appendChild(button);
    });
  }

  input.addEventListener("input", (event) => renderResults(event.target.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = results.querySelector(".search-item");
      if (first) {
        first.click();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      results.classList.remove("open");
    }
  });
}

function renderNav(activePath) {
  const nav = document.querySelector("nav");
  if (!nav) return;

  nav.innerHTML = links
    .map(([href, label]) => {
      const isActive = activePath.endsWith(href);
      return `<a href="${href}" class="${isActive ? "active" : ""}">${label}</a>`;
    })
    .join("");

  renderGlobalSearch();
}
