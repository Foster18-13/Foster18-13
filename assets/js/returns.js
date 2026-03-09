function renderReturnProductOptions() {
  const productSelect = document.getElementById("returnProductId");
  const data = loadData();
  const date = getSelectedDate();
  const activeProducts = getActiveProductsForDate(data, date);
  productSelect.innerHTML = createProductOptions(activeProducts);
}

function ensureReturnsStore(dayStore) {
  if (!Array.isArray(dayStore.returns)) {
    dayStore.returns = [];
  }
}

function syncReturnsToBalance(dayStore) {
  ensureReturnsStore(dayStore);
  const totalsByProduct = {};

  dayStore.returns.forEach((entry) => {
    totalsByProduct[entry.productId] = (totalsByProduct[entry.productId] || 0) + asNumber(entry.quantityReturned);
  });

  Object.keys(dayStore.balance || {}).forEach((productId) => {
    if (!Object.hasOwn(totalsByProduct, productId)) {
      dayStore.balance[productId] = {
        ...dayStore.balance[productId],
        returns: ""
      };
    }
  });

  Object.entries(totalsByProduct).forEach(([productId, total]) => {
    dayStore.balance[productId] = {
      ...dayStore.balance[productId],
      returns: String(total)
    };
  });
}

function renderReturnsTable() {
  const tbody = document.querySelector("#returnsTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  ensureReturnsStore(dayStore);

  if (!dayStore.returns.length) {
    tbody.innerHTML = `<tr><td colspan="6">No return entries for this date.</td></tr>`;
    return;
  }

  tbody.innerHTML = dayStore.returns
    .map((entry) => {
      const product = getProductById(data, entry.productId);
      return `
        <tr>
          <td>${product ? product.name : "Unknown Product"}</td>
          <td>${entry.waybill}</td>
          <td>${entry.quantityReturned}</td>
          <td>${entry.dateReturned}</td>
          <td>${entry.reason || ""}</td>
          <td><button class="button button-danger" data-delete-id="${entry.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await withLoadingFeedback(button, "Deleting...", () => deleteReturn(button.dataset.deleteId));
    });
  });
}

function addReturnEntry(event) {
  const productId = document.getElementById("returnProductId").value;
  const waybill = document.getElementById("returnWaybill").value.trim();
  const quantityReturned = document.getElementById("returnQuantity").value;
  const dateReturned = document.getElementById("returnDate").value;
  const reason = document.getElementById("returnReason").value.trim();

  if (!productId || !waybill || !quantityReturned || !dateReturned) {
    setStatus("All required fields are needed.", "error");
    return;
  }

  const qty = asNumber(quantityReturned);
  if (qty <= 0) {
    setStatus("Returned quantity must be greater than zero.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  ensureReturnsStore(dayStore);

  dayStore.returns.push({
    id: generateId("return"),
    productId,
    waybill,
    quantityReturned,
    dateReturned,
    reason
  });

  syncReturnsToBalance(dayStore);
  saveData(data);
  addAuditLog("Return entry added", {
    productId,
    waybill,
    quantityReturned,
    dateReturned,
    reason
  });

  event.target.reset();
  document.getElementById("returnDate").value = date;
  renderReturnsTable();
  setStatus("Return entry saved and synced to Balance Sheet.", "ok");
}

function deleteReturn(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  ensureReturnsStore(dayStore);

  const record = dayStore.returns.find((item) => item.id === id);
  dayStore.returns = dayStore.returns.filter((item) => item.id !== id);

  syncReturnsToBalance(dayStore);
  saveData(data);
  addAuditLog("Return entry deleted", {
    productId: record?.productId || "",
    waybill: record?.waybill || "",
    quantityReturned: record?.quantityReturned || ""
  });

  renderReturnsTable();
  setStatus("Return entry deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderReturnProductOptions();
      renderReturnsTable();
    });
  }

  renderReturnProductOptions();
  renderReturnsTable();

  const currentDate = getSelectedDate();
  document.getElementById("returnDate").value = currentDate;

  const form = document.getElementById("returnsForm");
  const exportButton = document.getElementById("exportReturns");
  const exportPdfButton = document.getElementById("exportReturnsPdf");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await withLoadingFeedback(form.querySelector('button[type="submit"]'), "Saving...", () => addReturnEntry(event));
  });

  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("returnsTable", "returns_sheet");
    });
  }

  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("returnsTable", "Returns Sheet", "returns_sheet");
    });
  }
});
