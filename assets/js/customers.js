function renderCustomerProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  productSelect.innerHTML = createProductOptions(data.products);
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
          <td><button class="button button-danger" data-delete-id="${customer.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await withLoadingFeedback(button, "Deleting...", () => deleteCustomerEntry(button.dataset.deleteId));
    });
  });
}

function addCustomerEntry(event) {
  event.preventDefault();

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

  saveData(data);
  addAuditLog("Customer entry added", {
    customerName,
    waybillNumber,
    quantity: quantityNum,
    productId
  });
  event.target.reset();
  document.getElementById("dateDelivered").value = date;
  renderCustomersTable();
  renderCustomerNameSuggestions();
  setStatus("Customer entry added and synced to Recording Sheet!", "ok");
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
  setStatus(`Synced ${dayStore.customers.length} customer entries to Recording Sheet!`, "ok");
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
  
  form.addEventListener("submit", async (event) => {
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
