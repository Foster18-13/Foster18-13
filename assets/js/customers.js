function renderCustomerProductOptions() {
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  const options = createProductOptions(activeProducts);

  document.querySelectorAll(".customer-product").forEach((productSelect) => {
    const selectedValue = productSelect.value;
    productSelect.innerHTML = options;
    if (selectedValue) {
      productSelect.value = selectedValue;
    }
  });
}

let customerRowCounter = 0;

function createCustomerProductRow(productId = "", quantity = "") {
  const rowId = `customer-row-${customerRowCounter++}`;
  const row = document.createElement("div");
  row.className = "grid-2 customer-product-row";
  row.dataset.rowId = rowId;
  row.style.marginBottom = "0.5rem";
  row.style.padding = "0.75rem";
  row.style.border = "1px solid #ddd";
  row.style.borderRadius = "8px";

  row.innerHTML = `
    <div>
      <label>Product Name</label>
      <select class="select customer-product" required></select>
    </div>
    <div style="display: flex; gap: 0.5rem; align-items: end;">
      <div style="flex: 1;">
        <label>Quantity</label>
        <input class="input customer-quantity" type="number" min="0" step="any" required value="${quantity}" />
      </div>
      <button class="button button-danger remove-customer-row" type="button">Remove</button>
    </div>
  `;

  row.querySelector(".remove-customer-row").addEventListener("click", () => removeCustomerProductRow(rowId));
  document.getElementById("customerProductRows").appendChild(row);
  renderCustomerProductOptions();

  if (productId) {
    row.querySelector(".customer-product").value = productId;
  }

  updateCustomerRowRemovalState();
}

function removeCustomerProductRow(rowId) {
  const rows = document.querySelectorAll(".customer-product-row");
  if (rows.length <= 1) {
    setStatus("At least one product is required.", "error");
    return;
  }

  const row = document.querySelector(`[data-row-id="${rowId}"]`);
  if (row) {
    row.remove();
  }

  updateCustomerRowRemovalState();
}

function updateCustomerRowRemovalState() {
  const rows = document.querySelectorAll(".customer-product-row");
  rows.forEach((row) => {
    const button = row.querySelector(".remove-customer-row");
    if (button) {
      button.style.display = rows.length > 1 ? "inline-block" : "none";
    }
  });
}

function initCustomerEntryForm() {
  const rowsContainer = document.getElementById("customerProductRows");
  if (rowsContainer) {
    rowsContainer.innerHTML = "";
  }
  createCustomerProductRow();
  document.getElementById("dateDelivered").value = getSelectedDate();
}

function collectCustomerProducts() {
  const rows = document.querySelectorAll(".customer-product-row");
  const products = [];

  for (let i = 0; i < rows.length; i++) {
    const productId = rows[i].querySelector(".customer-product")?.value;
    const quantity = Number.parseFloat(rows[i].querySelector(".customer-quantity")?.value);

    if (!productId || !quantity || quantity <= 0) {
      setStatus(`Product ${i + 1}: Please select a product and enter a valid quantity.`, "error");
      return null;
    }

    products.push({ productId, quantity });
  }

  return products;
}

function ensureRecordingEntriesArray(dayStore, productId) {
  if (!dayStore.recording[productId]) {
    dayStore.recording[productId] = { entries: [] };
  }

  if (!dayStore.recording[productId].entries) {
    dayStore.recording[productId].entries = [];
  }

  return dayStore.recording[productId].entries;
}

function findRecordingEntryIndex(entries, waybillNumber) {
  return entries.findIndex((entry) => entry && entry.waybill === waybillNumber);
}

function findEmptyRecordingSlot(entries) {
  return entries.findIndex((entry) => !entry || (typeof entry === 'object' && !entry.waybill && !entry.qty));
}

function ensureRecordingEntry(dayStore, productId, waybillNumber, quantityNum, previousWaybillNumber = null) {
  const entries = ensureRecordingEntriesArray(dayStore, productId);
  const matchWaybill = previousWaybillNumber || waybillNumber;
  const payload = { waybill: waybillNumber, qty: String(quantityNum) };
  const matchedIndex = findRecordingEntryIndex(entries, matchWaybill);

  if (matchedIndex >= 0) {
    entries[matchedIndex] = payload;
  } else {
    const emptyIndex = findEmptyRecordingSlot(entries);
    if (emptyIndex >= 0) {
      entries[emptyIndex] = payload;
    } else {
      entries.push(payload);
    }
  }

  if (entries.length > dayStore.recordingColumns) {
    dayStore.recordingColumns = entries.length;
  }
}

function renderCustomerNameSuggestions() {
  const datalist = document.getElementById("customerNameList");
  if (!datalist) return;

  const data = loadData();
  const uniqueNames = new Map();

  Object.values(data.daily || {}).forEach((dayStore) => {
    ["day", "night"].forEach((shift) => {
      const shiftStore = dayStore[shift];
      if (!shiftStore || !Array.isArray(shiftStore.customers)) return;

      shiftStore.customers.forEach((customer) => {
        const name = String(customer.customerName || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!uniqueNames.has(key)) {
          uniqueNames.set(key, name);
        }
      });
    });
  });

  const options = Array.from(uniqueNames.values())
    .sort((a, b) => a.localeCompare(b));

  datalist.innerHTML = options.map((name) => `<option value="${name}"></option>`).join("");
}

function renderCustomersTable() {
  const tbody = document.querySelector("#customersTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  // Initialize customers array if it doesn't exist
  if (!dayStore.customers) {
    dayStore.customers = [];
    saveData(data);
  }

  // Deduplicate by ID — clean up any duplicates that may exist in storage
  const seen = new Set();
  const deduplicated = dayStore.customers.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  if (deduplicated.length !== dayStore.customers.length) {
    dayStore.customers = deduplicated;
    saveData(data);
  }

  if (!dayStore.customers.length) {
    tbody.innerHTML = `<tr><td colspan="6">No customer entries for this date.</td></tr>`;
    return;
  }

  // Reverse the array so newest entries appear first (at the top)
  tbody.innerHTML = dayStore.customers
    .slice()
    .reverse()
    .map((customer) => {
      const product = getProductById(data, customer.productId);
      return `
        <tr>
          <td>${customer.customerName}</td>
          <td>${customer.waybillNumber}</td>
          <td>${product ? product.name : "Unknown Product"}</td>
          <td>${customer.quantity}</td>
          <td>${customer.dateDelivered}</td>
          <td><button class="button" data-edit-id="${customer.id}" type="button">Edit</button></td>
          <td><button class="button button-danger" data-delete-id="${customer.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      editCustomerEntry(button.dataset.editId);
    });
  });

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.dataset.deleteId;
      if (confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        withLoadingFeedback(button, "Deleting...", () => deleteCustomerEntry(entryId));
      }
    });
  });
}

function editCustomerEntry(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  if (!dayStore.customers) {
    return;
  }

  const customer = dayStore.customers.find(item => item.id === id);
  
  if (!customer) {
    setStatus("Entry not found.", "error");
    return;
  }

  // Populate the form with the customer data
  document.getElementById("editingEntryId").value = id;
  document.getElementById("customerName").value = customer.customerName;
  document.getElementById("waybillNumber").value = customer.waybillNumber;
  document.getElementById("dateDelivered").value = customer.dateDelivered;
  const rowsContainer = document.getElementById("customerProductRows");
  rowsContainer.innerHTML = "";
  createCustomerProductRow(customer.productId, customer.quantity);

  // Update button text and show cancel button
  document.getElementById("submitCustomerBtn").textContent = "💾 Update Entry";
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  document.getElementById("addCustomerProductRow").style.display = "none";

  // Scroll to form
  document.getElementById("customerForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditCustomerEntry() {
  // Reset form and UI
  document.getElementById("editingEntryId").value = "";
  document.getElementById("customerForm").reset();
  document.getElementById("submitCustomerBtn").textContent = "💾 Save Entries";
  document.getElementById("cancelEditBtn").style.display = "none";
  document.getElementById("addCustomerProductRow").style.display = "inline-block";
  initCustomerEntryForm();
}

function addCustomerEntry(event) {
  if (typeof ensureEntryPermission === 'function' && !ensureEntryPermission('save customer entries')) {
    return;
  }

  const customerName = document.getElementById("customerName").value.trim();
  const waybillNumber = document.getElementById("waybillNumber").value.trim();
  const dateDelivered = document.getElementById("dateDelivered").value;
  const products = collectCustomerProducts();

  if (!customerName || !waybillNumber || !dateDelivered || !products) {
    setStatus("All fields are required.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  if (!dayStore.customers) {
    dayStore.customers = [];
  }

  const editingEntryId = document.getElementById("editingEntryId").value;

  if (editingEntryId) {
    if (products.length !== 1) {
      setStatus("Edit mode supports one product entry at a time.", "error");
      return;
    }

    // --- UPDATE EXISTING ENTRY ---
    const existingEntry = dayStore.customers.find(item => item.id === editingEntryId);
    if (existingEntry) {
      const { productId, quantity } = products[0];
      const quantityNum = Number.parseFloat(quantity);
      const oldProductId = existingEntry.productId;
      const oldWaybillNumber = existingEntry.waybillNumber;

      existingEntry.customerName = customerName;
      existingEntry.waybillNumber = waybillNumber;
      existingEntry.productId = productId;
      existingEntry.quantity = quantityNum;
      existingEntry.dateDelivered = dateDelivered;

      if (oldProductId !== productId || oldWaybillNumber !== waybillNumber) {
        removeFromRecording(dayStore, oldProductId, oldWaybillNumber);
      }

      ensureRecordingEntry(dayStore, productId, waybillNumber, quantityNum, oldWaybillNumber);

      saveData(data);
      addAuditLog("Customer entry updated", { customerName, waybillNumber, quantity: quantityNum, productId });
      setStatus("Customer entry updated successfully!", "ok");
    }
  } else {
    // --- ADD NEW ENTRY ---
    products.forEach(({ productId, quantity }) => {
      const quantityNum = Number.parseFloat(quantity);

      dayStore.customers.push({
        id: generateId("customer"),
        customerName,
        waybillNumber,
        productId,
        quantity: quantityNum,
        dateDelivered
      });

      ensureRecordingEntry(dayStore, productId, waybillNumber, quantityNum);
    });

    saveData(data);
    addAuditLog("Customer entry added", { customerName, waybillNumber, productsCount: products.length });
    setStatus(
      products.length === 1
        ? "Customer entry added and synced to dispatch records!"
        : `Added ${products.length} customer entries and synced them to dispatch records!`,
      "ok"
    );
  }

  cancelEditCustomerEntry();
  renderCustomersTable();
  renderCustomerNameSuggestions();
}

function removeFromRecording(dayStore, productId, waybillNumber) {
  // Only remove from the specific dayStore provided - ensures deletion is scoped to current day/shift only
  if (!dayStore?.recording) {
    return;
  }
  
  if (dayStore.recording[productId]?.entries) {
    const entries = dayStore.recording[productId].entries;
    // Find the first matching entry in THIS dayStore only and clear it
    for (let i = 0; i < entries.length; i++) {
      if (entries[i] && entries[i].waybill === waybillNumber) {
        entries[i] = { waybill: "", qty: "" };
        break; // Only clear one entry to match the deleted customer
      }
    }
  }
}

// Delete a customer entry from the current day/shift ONLY
// This does NOT affect the same item in other days or shifts
function deleteCustomerEntry(id) {
  if (typeof ensureEntryPermission === 'function' && !ensureEntryPermission('delete customer entries')) {
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const shift = getSelectedShift();
  const dayStore = getShiftStore(data, date);
  
  if (!dayStore.customers) {
    return;
  }
  
  const customerEntry = dayStore.customers.find(item => item.id === id);
  
  if (!customerEntry) {
    return;
  }
  
  // Remove from current day/shift customers array
  dayStore.customers = dayStore.customers.filter((item) => item.id !== id);
  
  // Remove from current day/shift recording sheet only
  // This ensures the deletion only affects the selected day + shift
  removeFromRecording(dayStore, customerEntry.productId, customerEntry.waybillNumber);
  
  // Save and refresh current display
  saveData(data);
  addAuditLog("Customer entry deleted", {
    customerName: customerEntry.customerName,
    waybillNumber: customerEntry.waybillNumber,
    quantity: customerEntry.quantity,
    productId: customerEntry.productId
  });
  renderCustomersTable();
  setStatus(`Customer entry deleted from ${date} ${shift} shift only.`, "ok");
}

function syncAllToRecording() {
  if (typeof ensureEntryPermission === 'function' && !ensureEntryPermission('sync customer entries to dispatch records')) {
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  if (!dayStore.customers || dayStore.customers.length === 0) {
    setStatus("No customer entries to sync.", "error");
    return;
  }

  // Clear existing recording entries that match customer waybills
  // This prevents duplicates
  const customerWaybills = new Set(dayStore.customers.map(c => c.waybillNumber));
  
  // Group customers by product
  const customersByProduct = {};
  dayStore.customers.forEach(customer => {
    if (!customersByProduct[customer.productId]) {
      customersByProduct[customer.productId] = [];
    }
    customersByProduct[customer.productId].push(customer);
  });

  // For each product with customer orders
  Object.keys(customersByProduct).forEach(productId => {
    const customers = customersByProduct[productId];
    
    // Initialize recording for this product
    if (!dayStore.recording[productId]) {
      dayStore.recording[productId] = { entries: [] };
    }
    
    if (!dayStore.recording[productId].entries) {
      dayStore.recording[productId].entries = [];
    }

    const entries = dayStore.recording[productId].entries;
    
    // Clear entries that match customer waybills (avoid duplicates)
    for (let i = 0; i < entries.length; i++) {
      if (entries[i] && customerWaybills.has(entries[i].waybill)) {
        entries[i] = { waybill: "", qty: "" };
      }
    }

    // Add each customer entry
    customers.forEach(customer => {
      let added = false;
      
      // Find an empty slot
      for (let i = 0; i < entries.length; i++) {
        if (!entries[i] || (typeof entries[i] === 'object' && !entries[i].waybill && !entries[i].qty)) {
          entries[i] = {
            waybill: customer.waybillNumber,
            qty: String(customer.quantity)
          };
          added = true;
          break;
        }
      }
      
      // If no empty slot, add new entry
      if (!added) {
        entries.push({
          waybill: customer.waybillNumber,
          qty: String(customer.quantity)
        });
      }
    });

    // Update column count if needed
    if (entries.length > dayStore.recordingColumns) {
      dayStore.recordingColumns = entries.length;
    }
  });

  saveData(data);
  addAuditLog("Customer entries synced to recording", {
    count: dayStore.customers.length
  });
  setStatus(`Synced ${dayStore.customers.length} customer entries to dispatch records!`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderCustomersTable();
      renderCustomerProductOptions();
    });
  }

  renderCustomerProductOptions();
  renderCustomerNameSuggestions();
  renderCustomersTable();
  initCustomerEntryForm();

  // Initialize auto-save tracking
  if (typeof initAutoSave === 'function') {
    initAutoSave(() => {
      // Auto-save is passive for customers since adding/deleting already saves
      markDataSaved();
    });
    trackInputChanges('#customerForm');
  }

  const form = document.getElementById("customerForm");
  const addCustomerProductRowBtn = document.getElementById("addCustomerProductRow");
  const exportPdfButton = document.getElementById("exportCustomersPdf");
  const syncButton = document.getElementById("syncToRecording");

  if (addCustomerProductRowBtn) {
    addCustomerProductRowBtn.addEventListener("click", () => createCustomerProductRow());
  }

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", (e) => {
      e.preventDefault();
      cancelEditCustomerEntry();
    });
  }
  
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    await withLoadingFeedback(submitButton, "Adding...", () => addCustomerEntry(event));
  });
  
  if (syncButton) {
    syncButton.addEventListener("click", async () => {
      await withLoadingFeedback(syncButton, "Syncing...", () => syncAllToRecording());
    });
  }
  
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("customersTable", "Customers Entry Sheet", "customers_entry");
    });
  }
});
