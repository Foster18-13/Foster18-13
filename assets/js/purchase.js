function renderPurchaseProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  productSelect.innerHTML = createProductOptions(data.products);
}

function getSelectedProductFactor() {
  const data = loadData();
  const productId = document.getElementById("productId").value;
  const product = getProductById(data, productId);
  return asNumber(product?.palletFactor) || 1;
}

function renderPurchaseTable() {
  const tbody = document.querySelector("#purchaseTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

  if (!dayStore.purchases.length) {
    tbody.innerHTML = `<tr><td colspan="6">No purchase entries for this date.</td></tr>`;
    return;
  }

  tbody.innerHTML = dayStore.purchases
    .map((purchase) => {
      const product = getProductById(data, purchase.productId);
      return `
        <tr>
          <td>${product ? product.name : "Unknown Product"}</td>
          <td>${purchase.waybill}</td>
          <td>${purchase.batchCode}</td>
          <td>${purchase.pallets}</td>
          <td>${purchase.dateReceived}</td>
          <td><button class="button button-danger" data-delete-id="${purchase.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deletePurchase(button.dataset.deleteId));
  });
}

function addPurchaseEntry(event) {
  event.preventDefault();

  const productId = document.getElementById("productId").value;
  const waybill = document.getElementById("waybill").value.trim();
  const batchCode = document.getElementById("batchCode").value.trim();
  const pallets = document.getElementById("pallets").value;
  const factor = getSelectedProductFactor();
  const goodsReceived = asNumber(pallets) * factor;
  const dateReceived = document.getElementById("dateReceived").value;

  if (!productId || !waybill || !batchCode || !dateReceived) {
    setStatus("All fields are required.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

  dayStore.purchases.push({
    id: generateId("purchase"),
    productId,
    waybill,
    batchCode,
    pallets,
    factor,
    goodsReceived,
    dateReceived
  });

  saveData(data);
  event.target.reset();
  document.getElementById("dateReceived").value = date;
  renderPurchaseTable();
  setStatus("Purchase entry added.", "ok");
}

function deletePurchase(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);
  dayStore.purchases = dayStore.purchases.filter((item) => item.id !== id);
  saveData(data);
  renderPurchaseTable();
  setStatus("Purchase entry deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderPurchaseProductOptions();
  renderPurchaseTable();
  const currentDate = getSelectedDate();
  document.getElementById("dateReceived").value = currentDate;

  const form = document.getElementById("purchaseForm");
  const exportButton = document.getElementById("exportPurchase");
  const exportPdfButton = document.getElementById("exportPurchasePdf");
  form.addEventListener("submit", addPurchaseEntry);
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("purchaseTable", "purchase_sheet");
    });
  }
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("purchaseTable", "Purchase Sheet", "purchase_sheet");
    });
  }
});
