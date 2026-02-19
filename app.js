const links = [
  ["index.html", "Home"],
  ["recording-sheet.html", "Recording Sheet"],
  ["balance-sheet.html", "Balance Sheet"],
  ["summary-sheet.html", "Summary Sheet"],
  ["saved-sheets.html", "Saved Sheets"],
  ["page6.html", "Note"]
];

const productSearchItems = [
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

function getSearchItems() {
  const pageItems = links.map(([href, label]) => ({
    label,
    type: "Page",
    href
  }));

  const productItems = productSearchItems.map((label) => ({
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
