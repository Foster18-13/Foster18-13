function renderPurchaseProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  if (productSelect) {
    productSelect.innerHTML = createProductOptions(activeProducts);
  }
}

function renderPurchaseTable() {
  const tbody = document.querySelector("#purchaseTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

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
          <td>${purchase.vehicleNumber ?? ""}</td>
          <td>${purchase.quantityReceived ?? purchase.pallets}</td>
          <td>${purchase.dateReceived}</td>
          <td><button class="button button-danger" data-delete-id="${purchase.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await withLoadingFeedback(button, "Deleting...", () => deletePurchase(button.dataset.deleteId));
    });
  });
}

function createPurchaseBatchRow() {
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  return `
    <div class="grid-2 purchase-batch-row" style="margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #eaecf0; border-radius: 6px;">
      <div>
        <label>Product Name</label>
        <select class="select batch-product-id" required>${createProductOptions(activeProducts)}</select>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: end;">
        <div style="flex: 1;">
          <label>Quantity Received</label>
          <input class="input batch-quantity-received" type="number" min="0" step="any" required />
        </div>
        <button class="button button-danger remove-purchase-batch-row" type="button">Remove</button>
      </div>
    </div>
  `;
}

function addPurchaseBatchRow() {
  const rowsContainer = document.getElementById("purchaseBatchRows");
  if (!rowsContainer) return;
  rowsContainer.insertAdjacentHTML("beforeend", createPurchaseBatchRow());
}

function initPurchaseBatchMode() {
  const rowsContainer = document.getElementById("purchaseBatchRows");
  const batchDate = document.getElementById("batchDateReceived");
  const batchSection = document.getElementById("purchaseBatchSection");
  if (!rowsContainer || !batchDate) return;

  if (batchSection) {
    batchSection.style.display = "block";
  }

  rowsContainer.innerHTML = "";
  addPurchaseBatchRow();
  batchDate.value = getSelectedDate();
}

function addPurchaseBatchEntries(event) {
  const waybill = document.getElementById("batchWaybill").value.trim();
  const vehicleNumber = document.getElementById("batchVehicleNumber").value.trim();
  const dateReceived = document.getElementById("batchDateReceived").value;

  if (!waybill || !vehicleNumber || !dateReceived) {
    setStatus("Waybill, vehicle number, and date are required.", "error");
    return;
  }

  const productInputs = Array.from(document.querySelectorAll(".batch-product-id"));
  const quantityInputs = Array.from(document.querySelectorAll(".batch-quantity-received"));

  if (!productInputs.length) {
    setStatus("Add at least one product entry.", "error");
    return;
  }

  const entries = [];
  for (let i = 0; i < productInputs.length; i += 1) {
    const productId = productInputs[i].value;
    const quantityReceived = String(quantityInputs[i].value || "").trim();
    const goodsReceived = asNumber(quantityReceived);

    if (!productId || !quantityReceived) {
      setStatus(`Complete product and quantity for row ${i + 1}.`, "error");
      return;
    }
    if (goodsReceived <= 0) {
      setStatus(`Quantity must be greater than zero for row ${i + 1}.`, "error");
      return;
    }

    entries.push({
      id: generateId("purchase"),
      productId,
      waybill,
      vehicleNumber,
      quantityReceived,
      pallets: quantityReceived,
      goodsReceived,
      dateReceived
    });
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  dayStore.purchases.push(...entries);
  saveData(data);

  addAuditLog("Multiple purchase entries added", {
    waybill,
    vehicleNumber,
    count: entries.length
  });

  event.target.reset();
  initPurchaseBatchMode();
  renderPurchaseTable();
  setStatus(`${entries.length} purchase entr${entries.length === 1 ? "y" : "ies"} added.`, "ok");
}

function deletePurchase(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const purchase = dayStore.purchases.find((item) => item.id === id);
  dayStore.purchases = dayStore.purchases.filter((item) => item.id !== id);
  saveData(data);
  addAuditLog("Purchase entry deleted", {
    productId: purchase?.productId || "",
    waybill: purchase?.waybill || "",
    quantityReceived: purchase?.quantityReceived ?? purchase?.pallets ?? ""
  });
  renderPurchaseTable();
  setStatus("Purchase entry deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderPurchaseTable();
    });
  }

  renderPurchaseProductOptions();
  renderPurchaseTable();
  initPurchaseBatchMode();

  const batchForm = document.getElementById("purchaseBatchForm");
  const addBatchRowButton = document.getElementById("addPurchaseBatchRow");
  const batchRowsContainer = document.getElementById("purchaseBatchRows");
  const exportButton = document.getElementById("exportPurchase");
  const exportPdfButton = document.getElementById("exportPurchasePdf");

  if (addBatchRowButton) {
    addBatchRowButton.addEventListener("click", addPurchaseBatchRow);
  }

  if (batchRowsContainer) {
    batchRowsContainer.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("remove-purchase-batch-row")) return;

      const rows = batchRowsContainer.querySelectorAll(".purchase-batch-row");
      if (rows.length <= 1) {
        setStatus("At least one product row is required.", "error");
        return;
      }

      const row = target.closest(".purchase-batch-row");
      if (row) row.remove();
    });
  }

  if (batchForm) {
    batchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = batchForm.querySelector('button[type="submit"]');
      await withLoadingFeedback(submitButton, "Saving...", () => addPurchaseBatchEntries(event));
    });
  }

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
