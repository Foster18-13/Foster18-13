function renderCustomerProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  productSelect.innerHTML = createProductOptions(activeProducts);
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
  document.getElementById("productId").value = customer.productId;
  document.getElementById("quantity").value = customer.quantity;
  document.getElementById("dateDelivered").value = customer.dateDelivered;

  // Update button text and show cancel button
  document.getElementById("submitCustomerBtn").textContent = "💾 Update Entry";
  document.getElementById("cancelEditBtn").style.display = "inline-block";

  // Scroll to form
  document.getElementById("customerForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditCustomerEntry() {
  // Reset form and UI
  document.getElementById("editingEntryId").value = "";
  document.getElementById("customerForm").reset();
  document.getElementById("submitCustomerBtn").textContent = "Add Single Entry";
  document.getElementById("cancelEditBtn").style.display = "none";
  
  const currentDate = getSelectedDate();
  document.getElementById("dateDelivered").value = currentDate;
  setStatus("", "ok");
}

function addCustomerEntry(event) {
  const customerName = document.getElementById("customerName").value.trim();
  const waybillNumber = document.getElementById("waybillNumber").value.trim();
  const productId = document.getElementById("productId").value;
  const quantity = document.getElementById("quantity").value;
  const dateDelivered = document.getElementById("dateDelivered").value;

  if (!customerName || !waybillNumber || !productId || !quantity || !dateDelivered) {
    setStatus("All fields are required.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  // Initialize customers array if it doesn't exist
  if (!dayStore.customers) {
    dayStore.customers = [];
  }

  // Validate quantity is positive
  const quantityNum = Number.parseFloat(quantity);
  if (quantityNum <= 0) {
    setStatus("Quantity must be greater than zero.", "error");
    return;
  }

  dayStore.customers.push({
    id: generateId("customer"),
    customerName,
    waybillNumber,
    productId,
    quantity: quantityNum,
    dateDelivered
  });

  // Initialize recording for this product if it doesn't exist
  if (!dayStore.recording[productId]) {
    dayStore.recording[productId] = { entries: [] };
  }

  // Ensure entries array exists
  if (!dayStore.recording[productId].entries) {
    dayStore.recording[productId].entries = [];
  }

  // Find the next empty slot or add to the end
  const entries = dayStore.recording[productId].entries;
  let added = false;
  
  // Look for an empty slot
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i] || (typeof entries[i] === 'object' && !entries[i].waybill && !entries[i].qty)) {
      entries[i] = {
        waybill: waybillNumber,
        qty: String(quantityNum)
      };
      added = true;
      break;
    }
  }

  // If no empty slot found, add a new entry
  if (!added) {
    entries.push({
      waybill: waybillNumber,
      qty: String(quantityNum)
    });
    
    // Update column count if we've added beyond current columns
    if (entries.length > dayStore.recordingColumns) {
      dayStore.recordingColumns = entries.length;
    }
  }

  const editingEntryId = document.getElementById("editingEntryId").value;

  if (editingEntryId) {
    // Update existing entry
    const existingEntry = dayStore.customers.find(item => item.id === editingEntryId);
    if (existingEntry) {
      const oldProductId = existingEntry.productId;
      const oldWaybillNumber = existingEntry.waybillNumber;

      // Update the customer entry
      existingEntry.customerName = customerName;
      existingEntry.waybillNumber = waybillNumber;
      existingEntry.productId = productId;
      existingEntry.quantity = quantityNum;
      existingEntry.dateDelivered = dateDelivered;

      // Update recording - remove old entry and add new one
      if (oldProductId !== productId || oldWaybillNumber !== waybillNumber) {
        removeFromRecording(dayStore, oldProductId, oldWaybillNumber);
      }

      // Ensure new recording entry exists
      if (!dayStore.recording[productId]) {
        dayStore.recording[productId] = { entries: [] };
      }

      if (!dayStore.recording[productId].entries) {
        dayStore.recording[productId].entries = [];
      }

      const entries = dayStore.recording[productId].entries;
      let updated = false;

      // Find and update the matching entry in recording
      for (let i = 0; i < entries.length; i++) {
        if (entries[i] && entries[i].waybill === oldWaybillNumber) {
          entries[i] = {
            waybill: waybillNumber,
            qty: String(quantityNum)
          };
          updated = true;
          break;
        }
      }

      // If not found, add as new
      if (!updated) {
        const added = false;
        for (let i = 0; i < entries.length; i++) {
          if (!entries[i] || (typeof entries[i] === 'object' && !entries[i].waybill && !entries[i].qty)) {
            entries[i] = {
              waybill: waybillNumber,
              qty: String(quantityNum)
            };
            break;
          }
        }
        if (!added) {
          entries.push({
            waybill: waybillNumber,
            qty: String(quantityNum)
          });
        }
      }

      if (entries.length > dayStore.recordingColumns) {
        dayStore.recordingColumns = entries.length;
      }

      saveData(data);
      addAuditLog("Customer entry updated", {
        customerName,
        waybillNumber,
        quantity: quantityNum,
        productId
      });
      setStatus("Customer entry updated successfully!", "ok");
      cancelEditCustomerEntry();
    }
  } else {
    // Add new entry
    dayStore.customers.push({
      id: generateId("customer"),
      customerName,
      waybillNumber,
      productId,
      quantity: quantityNum,
      dateDelivered
    });

    // Initialize recording for this product if it doesn't exist
    if (!dayStore.recording[productId]) {
      dayStore.recording[productId] = { entries: [] };
    }

    // Ensure entries array exists
    if (!dayStore.recording[productId].entries) {
      dayStore.recording[productId].entries = [];
    }

    // Find the next empty slot or add to the end
    const entries = dayStore.recording[productId].entries;
    let added = false;
    
    // Look for an empty slot
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i] || (typeof entries[i] === 'object' && !entries[i].waybill && !entries[i].qty)) {
        entries[i] = {
          waybill: waybillNumber,
          qty: String(quantityNum)
        };
        added = true;
        break;
      }
    }

    // If no empty slot found, add a new entry
    if (!added) {
      entries.push({
        waybill: waybillNumber,
        qty: String(quantityNum)
      });
    }
    
    // Update column count if we've added beyond current columns
    if (entries.length > dayStore.recordingColumns) {
      dayStore.recordingColumns = entries.length;
    }

    saveData(data);
    addAuditLog("Customer entry added", {
      customerName,
      waybillNumber,
      quantity: quantityNum,
      productId
    });
    setStatus("Customer entry added and synced to dispatch records!", "ok");
  }

  event.target.reset();
  document.getElementById("dateDelivered").value = date;
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

// Batch Entry Functions
function toggleBatchMode() {
  const batchSection = document.getElementById("batchEntrySection");
  const singleForm = document.getElementById("customerForm");
  const toggleBtn = document.getElementById("toggleBatchMode");
  
  const isBatchVisible = batchSection.style.display !== "none";
  
  if (isBatchVisible) {
    // Switch to single mode
    batchSection.style.display = "none";
    singleForm.style.display = "grid";
    toggleBtn.textContent = "📦 Batch Entry Mode";
  } else {
    // Switch to batch mode
    batchSection.style.display = "block";
    singleForm.style.display = "none";
    toggleBtn.textContent = "📝 Single Entry Mode";
    initBatchEntry();
  }
}

function initBatchEntry() {
  const batchDateInput = document.getElementById("batchDateDelivered");
  if (batchDateInput) {
    batchDateInput.value = getSelectedDate();
  }
  
  // Clear and add first product row
  const container = document.getElementById("batchProductRows");
  container.innerHTML = "";
  addBatchProductRow();
}

let batchRowCounter = 0;

function addBatchProductRow() {
  const container = document.getElementById("batchProductRows");
  const rowId = `batch-row-${batchRowCounter++}`;
  
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  const productOptions = createProductOptions(activeProducts);
  
  const rowDiv = document.createElement("div");
  rowDiv.className = "grid-2";
  rowDiv.id = rowId;
  rowDiv.style.marginBottom = "0.5rem";
  rowDiv.style.padding = "0.5rem";
  rowDiv.style.border = "1px solid #ddd";
  rowDiv.style.borderRadius = "4px";
  
  rowDiv.innerHTML = `
    <div>
      <label>Product</label>
      <select class="select batch-product" required>${productOptions}</select>
    </div>
    <div style="display: flex; gap: 0.5rem; align-items: end;">
      <div style="flex: 1;">
        <label>Quantity</label>
        <input class="input batch-quantity" type="number" min="0" step="any" required />
      </div>
      <button class="button button-danger" type="button" onclick="removeBatchProductRow('${rowId}')">Remove</button>
    </div>
  `;
  
  container.appendChild(rowDiv);
}

function removeBatchProductRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    const container = document.getElementById("batchProductRows");
    if (container.children.length > 1) {
      row.remove();
    } else {
      setStatus("At least one product is required.", "error");
    }
  }
}

// Make function globally accessible for inline onclick
globalThis.removeBatchProductRow = removeBatchProductRow;

function handleBatchCustomerEntry(event) {
  const customerName = document.getElementById("batchCustomerName").value.trim();
  const waybillNumber = document.getElementById("batchWaybillNumber").value.trim();
  const dateDelivered = document.getElementById("batchDateDelivered").value;
  
  if (!customerName || !waybillNumber || !dateDelivered) {
    setStatus("Customer name, waybill, and date are required.", "error");
    return;
  }
  
  // Collect all product rows
  const productSelects = document.querySelectorAll(".batch-product");
  const quantityInputs = document.querySelectorAll(".batch-quantity");
  
  const products = [];
  for (let i = 0; i < productSelects.length; i++) {
    const productId = productSelects[i].value;
    const quantity = Number.parseFloat(quantityInputs[i].value);
    
    if (!productId || !quantity || quantity <= 0) {
      setStatus(`Product ${i + 1}: Please select a product and enter a valid quantity.`, "error");
      return;
    }
    
    products.push({ productId, quantity });
  }
  
  if (products.length === 0) {
    setStatus("Add at least one product.", "error");
    return;
  }
  
  // Add all entries
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  
  // Initialize customers array if it doesn't exist
  if (!dayStore.customers) {
    dayStore.customers = [];
  }
  
  let addedCount = 0;
  products.forEach(({ productId, quantity }) => {
    // Add customer entry
    dayStore.customers.push({
      id: generateId("customer"),
      customerName,
      waybillNumber,
      productId,
      quantity,
      dateDelivered
    });
    
    // Add to recording sheet
    if (!dayStore.recording[productId]) {
      dayStore.recording[productId] = { entries: [] };
    }
    
    if (!dayStore.recording[productId].entries) {
      dayStore.recording[productId].entries = [];
    }
    
    const entries = dayStore.recording[productId].entries;
    let added = false;
    
    // Find an empty slot
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i] || (typeof entries[i] === 'object' && !entries[i].waybill && !entries[i].qty)) {
        entries[i] = {
          waybill: waybillNumber,
          qty: String(quantity)
        };
        added = true;
        break;
      }
    }
    
    // If no empty slot, add new entry
    if (!added) {
      entries.push({
        waybill: waybillNumber,
        qty: String(quantity)
      });
    }
    
    // Update column count
    if (entries.length > dayStore.recordingColumns) {
      dayStore.recordingColumns = entries.length;
    }
    
    addedCount++;
  });
  
  saveData(data);
  addAuditLog("Batch customer entry added", {
    customerName,
    waybillNumber,
    productsCount: addedCount
  });
  
  // Reset form
  event.target.reset();
  initBatchEntry();
  renderCustomersTable();
  renderCustomerNameSuggestions();
  setStatus(`✓ Added ${addedCount} products for ${customerName} (Waybill: ${waybillNumber})`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderCustomersTable();
    });
  }

  renderCustomerProductOptions();
  renderCustomerNameSuggestions();
  renderCustomersTable();
  const currentDate = getSelectedDate();
  document.getElementById("dateDelivered").value = currentDate;

  // Initialize auto-save tracking
  if (typeof initAutoSave === 'function') {
    initAutoSave(() => {
      // Auto-save is passive for customers since adding/deleting already saves
      markDataSaved();
    });
    trackInputChanges('#customerForm');
  }

  const form = document.getElementById("customerForm");
  const exportButton = document.getElementById("exportCustomers");
  const exportPdfButton = document.getElementById("exportCustomersPdf");
  const syncButton = document.getElementById("syncToRecording");
  
  // Batch entry event listeners
  const toggleBatchBtn = document.getElementById("toggleBatchMode");
  const batchForm = document.getElementById("batchCustomerForm");
  const addBatchRowBtn = document.getElementById("addBatchProductRow");
  const cancelBatchBtn = document.getElementById("cancelBatchEntry");
  
  if (toggleBatchBtn) {
    toggleBatchBtn.addEventListener("click", toggleBatchMode);
  }
  
  if (batchForm) {
    batchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = batchForm.querySelector('button[type="submit"]');
      await withLoadingFeedback(submitButton, "Saving all...", () => handleBatchCustomerEntry(event));
    });
  }
  
  if (addBatchRowBtn) {
    addBatchRowBtn.addEventListener("click", addBatchProductRow);
  }
  
  if (cancelBatchBtn) {
    cancelBatchBtn.addEventListener("click", toggleBatchMode);
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
  
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("customersTable", "customers_entry");
    });
  }
  
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("customersTable", "Customers Entry Sheet", "customers_entry");
    });
  }
});
