function renderCustomerProductOptions() {
  const productSelect = document.getElementById("productId");
  const data = loadData();
  productSelect.innerHTML = createProductOptions(data.products);
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

  dayStore.customers.push({
    id: generateId("customer"),
    customerName,
    waybillNumber,
    productId,
    quantity: asNumber(quantity),
    dateDelivered
  });

  // Also add to recording sheet
  if (!dayStore.recording[productId]) {
    dayStore.recording[productId] = { entries: [] };
  }

  // Find the next empty slot or add to the end
  const entries = dayStore.recording[productId].entries;
  let added = false;
  
  for (let i = 0; i < dayStore.recordingColumns; i++) {
    if (!entries[i] || (!entries[i].waybill && !entries[i].qty)) {
      entries[i] = {
        waybill: waybillNumber,
        qty: quantity
      };
      added = true;
      break;
    }
  }

  // If no empty slot found, add a new column
  if (!added) {
    entries.push({
      waybill: waybillNumber,
      qty: quantity
    });
    // Increase column count if needed
    if (entries.length > dayStore.recordingColumns) {
      dayStore.recordingColumns = entries.length;
    }
  }

  saveData(data);
  event.target.reset();
  document.getElementById("dateDelivered").value = date;
  renderCustomersTable();
  setStatus("Customer entry added and recorded in Recording Sheet.", "ok");
}

function deleteCustomerEntry(id) {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  
  if (dayStore.customers) {
    // Find the customer entry before deleting
    const customerEntry = dayStore.customers.find(item => item.id === id);
    
    if (customerEntry) {
      // Remove from customers array
      dayStore.customers = dayStore.customers.filter((item) => item.id !== id);
      
      // Also remove from recording sheet
      if (dayStore.recording[customerEntry.productId]) {
        const entries = dayStore.recording[customerEntry.productId].entries;
        
        // Find and remove the matching entry by waybill number
        for (let i = 0; i < entries.length; i++) {
          if (entries[i] && entries[i].waybill === customerEntry.waybillNumber) {
            entries[i] = { waybill: "", qty: "" };
            break;
          }
        }
      }
      
      saveData(data);
      renderCustomersTable();
      setStatus("Customer entry deleted and removed from Recording Sheet.", "ok");
    }
  }
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
  renderCustomersTable();
  const currentDate = getSelectedDate();
  document.getElementById("dateDelivered").value = currentDate;

  const form = document.getElementById("customerForm");
  const exportButton = document.getElementById("exportCustomers");
  const exportPdfButton = document.getElementById("exportCustomersPdf");
  
  form.addEventListener("submit", addCustomerEntry);
  
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
