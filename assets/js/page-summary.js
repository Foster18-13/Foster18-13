(function () {
  "use strict";

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getSectorSafe() {
    if (typeof globalThis.getSector === "function") {
      return globalThis.getSector();
    }

    return globalThis.sessionStorage.getItem("warehouseSector")
      || globalThis.localStorage.getItem("warehouseSector")
      || "water";
  }

  function loadPortalDb() {
    try {
      return JSON.parse(globalThis.localStorage.getItem("twelliumWarehousePortalV1") || "{}");
    } catch {
      return {};
    }
  }

  function getProductsSafe() {
    const db = loadPortalDb();

    if (Array.isArray(db.products) && db.products.length) {
      return db.products.map(function (item, index) {
        if (typeof item === "string") {
          return { id: item, name: item, sortOrder: index };
        }

        return {
          id: item?.id || item?.name || ("product-" + index),
          name: item?.name || item?.productName || item?.title || ("Product " + (index + 1)),
          sortOrder: index
        };
      });
    }

    return [
      "Verna Shrink 500ml x 24",
      "Verna Shrink 500ml x 16",
      "Verna Shrink 750ml x 16",
      "Verna Shrink 1.5L x 6",
      "Verna Active Sport Water 500ml x 12",
      "Verna Jar 19L"
    ].map(function (name, index) {
      return { id: name, name: name, sortOrder: index };
    });
  }

  function getDayState(date) {
    const db = loadPortalDb();
    return db?.days?.[date] || {};
  }

  function getStockSheetState(date, sector) {
    try {
      return JSON.parse(globalThis.localStorage.getItem("twellium:stock-sheet:" + sector + ":" + date) || "{}");
    } catch {
      return {};
    }
  }

  function getBalanceEntry(dayState, stockSheetState, product) {
    return dayState?.balance?.[product.id]
      || dayState?.balance?.[product.name]
      || stockSheetState?.[product.name]
      || stockSheetState?.[product.id]
      || {};
  }

  function getPurchaseTotal(dayState, product) {
    const purchases = Array.isArray(dayState?.purchases) ? dayState.purchases : [];

    return purchases
      .filter(function (item) {
        return item?.productId === product.id
          || item?.productName === product.name
          || item?.product === product.name
          || item?.name === product.name;
      })
      .reduce(function (sum, item) {
        return sum + numberValue(item?.pallets ?? item?.quantity ?? item?.qty ?? item?.total);
      }, 0);
  }

  function getLoadingTotal(dayState, product) {
    const row = dayState?.recording?.rows?.[product.id]
      || dayState?.recording?.rows?.[product.name];

    if (!Array.isArray(row)) {
      return 0;
    }

    return row.reduce(function (sum, value) {
      return sum + numberValue(value);
    }, 0);
  }

  function computeAvailable(entry, purchaseTotal, loadingTotal) {
    if (entry?.closing !== undefined && entry?.closing !== "") {
      return numberValue(entry.closing);
    }

    return numberValue(entry?.opening)
      + numberValue(entry?.returns)
      + numberValue(purchaseTotal)
      - numberValue(loadingTotal)
      - numberValue(entry?.damages);
  }

  function setUserLabel() {
    const userLabel = globalThis.document.getElementById("userLabel");
    if (!userLabel) {
      return;
    }

    if (typeof globalThis.requireAuth !== "function") {
      userLabel.textContent = "Guest Access";
      return;
    }

    Promise.resolve(globalThis.requireAuth())
      .then(function (user) {
        userLabel.textContent = user?.email || user?.name || "Guest Access";
      })
      .catch(function () {
        userLabel.textContent = "Guest Access";
      });
  }

  function renderSummaryPage() {
    const host = globalThis.document.getElementById("summaryTableHost");
    const meta = globalThis.document.getElementById("summaryMeta");
    const dateInput = globalThis.document.getElementById("workingDate");
    const searchInput = globalThis.document.getElementById("summarySearchInput");

    if (!host || !dateInput) {
      return;
    }

    const date = dateInput.value || todayIso();
    const sector = getSectorSafe();
    const search = String(searchInput?.value || "").trim().toLowerCase();

    const products = getProductsSafe();
    const dayState = getDayState(date);
    const stockSheetState = getStockSheetState(date, sector);

    const rows = products.map(function (product) {
      const balanceEntry = getBalanceEntry(dayState, stockSheetState, product);
      const purchaseTotal = getPurchaseTotal(dayState, product);
      const loadingTotal = getLoadingTotal(dayState, product);
      const available = computeAvailable(balanceEntry, purchaseTotal, loadingTotal);

      return {
        id: product.id,
        name: product.name,
        available: available
      };
    });

    const filteredRows = search
      ? rows.filter(function (row) {
          return row.name.toLowerCase().includes(search);
        })
      : rows;

    host.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Stock Available</th>
          </tr>
        </thead>
        <tbody>
          ${
            filteredRows.length
              ? filteredRows.map(function (row) {
                  return `
                    <tr>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${row.available}</td>
                    </tr>
                  `;
                }).join("")
              : '<tr><td colspan="2">No matching products found.</td></tr>'
          }
        </tbody>
      </table>
    `;

    if (meta) {
      meta.textContent = "Date: " + date + " • Sector: " + sector + " • Showing: " + filteredRows.length + "/" + rows.length;
    }
  }

  function initSummaryPage() {
    const dateInput = globalThis.document.getElementById("workingDate");
    const sectorLabel = globalThis.document.getElementById("sectorLabel");
    const searchInput = globalThis.document.getElementById("summarySearchInput");

    if (dateInput) {
      dateInput.value = todayIso();
      dateInput.addEventListener("change", renderSummaryPage);
    }

    if (searchInput) {
      searchInput.addEventListener("input", renderSummaryPage);
    }

    if (sectorLabel) {
      sectorLabel.textContent = getSectorSafe();
    }

    setUserLabel();
    renderSummaryPage();
  }

  globalThis.initSummaryPage = initSummaryPage;
  globalThis.renderSummaryPage = renderSummaryPage;
})();
