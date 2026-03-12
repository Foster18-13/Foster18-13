function searchCustomerHistory() {
  const searchTerm = document.getElementById("searchCustomer").value.trim().toLowerCase();
  const resultsDiv = document.getElementById("historyResults");

  if (!searchTerm) {
    resultsDiv.innerHTML = '<p class="text-error">Please enter a customer name.</p>';
    return;
  }

  const data = loadData();
  const allResults = [];
  let dailyStores = {};
  if (data?.daily && typeof data.daily === "object") {
    dailyStores = data.daily;
  } else if (data?.dailyStores && typeof data.dailyStores === "object") {
    dailyStores = data.dailyStores;
  }

  const currentSector = typeof getCurrentWorkSector === "function" ? getCurrentWorkSector() : "water";

  const collectShiftResults = (date, shiftLabel, shiftStore) => {
    if (!Array.isArray(shiftStore?.customers)) return;

    shiftStore.customers.forEach((customer) => {
      const customerName = String(customer?.customerName || "");
      if (!customerName.toLowerCase().includes(searchTerm)) return;

      const product = getProductById(data, customer.productId);
      allResults.push({
        date,
        shift: shiftLabel,
        customerName,
        waybillNumber: customer.waybillNumber || "",
        productName: product ? product.name : 'Unknown Product',
        quantity: Number(customer.quantity || 0),
        dateDelivered: customer.dateDelivered || ""
      });
    });
  };

  // Search across all dates
  Object.keys(dailyStores).forEach((date) => {
    const dayStore = dailyStores[date] || {};
    collectShiftResults(date, 'Day', dayStore.day);
    if (currentSector !== "hh") {
      collectShiftResults(date, 'Night', dayStore.night);
    }
  });

  if (allResults.length === 0) {
    resultsDiv.innerHTML = `<p class="text-muted">No orders found for "${searchTerm}".</p>`;
    return;
  }

  // Sort by date (newest first)
  allResults.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals
  const totalOrders = allResults.length;
  const totalQuantity = allResults.reduce((sum, r) => sum + r.quantity, 0);

  resultsDiv.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px;">
      <strong>Found ${totalOrders} order(s)</strong> with total quantity of <strong>${totalQuantity}</strong>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Shift</th>
            <th>Customer Name</th>
            <th>Waybill No.</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Delivered</th>
          </tr>
        </thead>
        <tbody>
          ${allResults.map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r.shift}</td>
              <td>${r.customerName}</td>
              <td>${r.waybillNumber}</td>
              <td>${r.productName}</td>
              <td>${r.quantity}</td>
              <td>${r.dateDelivered}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function clearSearch() {
  document.getElementById("searchCustomer").value = '';
  document.getElementById("historyResults").innerHTML = 
    '<p class="text-muted" style="font-size: 13px;">Enter a customer name to view their order history.</p>';
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchButton").addEventListener("click", searchCustomerHistory);
  document.getElementById("clearButton").addEventListener("click", clearSearch);
  
  // Search on Enter key
  document.getElementById("searchCustomer").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchCustomerHistory();
    }
  });
});
