function renderCustomerProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  productSelect.innerHTML = createProductOptions(data.products);
}

function populateCustomerNameSuggestions() {
  const data = loadData();
  const customerNames = new Set();

  // Collect all unique customer names from all dates
  Object.keys(data.dailyStores || {}).forEach(date => {
    const dayStore = data.dailyStores[date];
    
    ['day', 'night'].forEach(shift => {
      dayStore[shift]?.customers?.forEach(customer => {
          if (customer.customerName) {
            customerNames.add(customer.customerName);
          }
        });
      }
    );
  });

  // Populate datalist
  const datalist = document.getElementById('customerNameList');
  if (datalist) {
    datalist.innerHTML = Array.from(customerNames)
      .sort((a, b) => a.localeCompare(b))
      .map(name => `<option value="${name}"></option>`)
      .join('');
  }
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

  tbody.innerHTML = dayStore.customers
    .map((customer) => {
      const product = getProductById(data, customer.productId);
      return `
        <tr data-customer-id="${customer.id}">
          <td>
            <span class="customer-name-display">${customer.customerName}</span>
            <input class="input customer-name-edit" style="display: none;" list="customerNameList" value="${customer.customerName}" data-customer-id="${customer.id}" />
          </td>
          <td>${customer.waybillNumber}</td>
          <td>${product ? product.name : "Unknown Product"}</td>
          <td>${customer.quantity}</td>
          <td>${customer.dateDelivered}</td>
          <td>
            <button class="button" data-edit-id="${customer.id}" type="button">Edit Name</button>
            <button class="button button-danger" data-delete-id="${customer.id}" type="button">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Add edit functionality
  tbody.querySelectorAll("button[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const customerId = button.dataset.editId;
      const row = tbody.querySelector(`tr[data-customer-id="${customerId}"]`);
      const displaySpan = row.querySelector(".customer-name-display");
      const editInput = row.querySelector(".customer-name-edit");
      
      if (displaySpan.style.display === "none") {
        // Save the edit
        const newName = editInput.value.trim();
        if (newName) {
          updateCustomerName(customerId, newName);
          displaySpan.textContent = newName;
          displaySpan.style.display = "";
          editInput.style.display = "none";
          button.textContent = "Edit Name";
        } else {
          setStatus("Customer name cannot be empty.", "error");
        }
      } else {
        // Start editing
        displaySpan.style.display = "none";
        editInput.style.display = "";
        editInput.focus();
        editInput.select();
        button.textContent = "Save";
      }
    });
  });

  // Allow Enter key to save
  tbody.querySelectorAll(".customer-name-edit").forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const customerId = input.dataset.customerId;
        const button = tbody.querySelector(`button[data-edit-id="${customerId}"]`);
        if (button) button.click();
      }
    });
  });

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomerEntry(button.dataset.deleteId));
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

  // Check for duplicate waybill number
  const duplicateWaybill = dayStore.customers.find(c => c.waybillNumber === waybillNumber);
  if (duplicateWaybill) {
    setStatus(`Waybill number "${waybillNumber}" already exists for ${duplicateWaybill.customerName}.`, "error");
    return;
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
  event.target.reset();
  document.getElementById("dateDelivered").value = date;
  renderCustomersTable();
  populateCustomerNameSuggestions();
  setStatus("Customer entry added and synced to Recording Sheet!", "ok");
}

function removeFromRecording(dayStore, productId, waybillNumber) {
  if (dayStore.recording[productId]) {
    const entries = dayStore.recording[productId].entries;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i] && entries[i].waybill === waybillNumber) {
        entries[i] = { waybill: "", qty: "" };
        break;
      }
    }
  }
}

function deleteCustomerEntry(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  
  if (!dayStore.customers) {
    return;
  }
  
  const customerEntry = dayStore.customers.find(item => item.id === id);
  
  if (!customerEntry) {
    return;
  }
  
  dayStore.customers = dayStore.customers.filter((item) => item.id !== id);
  removeFromRecording(dayStore, customerEntry.productId, customerEntry.waybillNumber);
  
  saveData(data);
  renderCustomersTable();
  setStatus("Customer entry deleted and removed from Recording Sheet.", "ok");
}

function updateCustomerName(id, newName) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  
  if (!dayStore.customers) {
    return;
  }
  
  const customerEntry = dayStore.customers.find(item => item.id === id);
  
  if (!customerEntry) {
    return;
  }
  
  customerEntry.customerName = newName;
  
  saveData(data);
  populateCustomerNameSuggestions();
  setStatus("Customer name updated successfully.", "ok");
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
  populateCustomerNameSuggestions();
  renderCustomersTable();
  const currentDate = getSelectedDate();
  document.getElementById("dateDelivered").value = currentDate;

  const form = document.getElementById("customerForm");
  const exportButton = document.getElementById("exportCustomers");
  const exportPdfButton = document.getElementById("exportCustomersPdf");
  const syncButton = document.getElementById("syncToRecording");
  
  form.addEventListener("submit", addCustomerEntry);
  
  if (syncButton) {
    syncButton.addEventListener("click", syncAllToRecording);
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
