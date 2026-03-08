function calculateEntriesTotalQty(entries) {
  return entries.reduce((sum, entry) => sum + asNumber(entry.qty || 0), 0);
}

function aggregateProductDataForShift(productStats, product, shiftData) {
  const balance = shiftData.balance[product.id] || {};
  const recording = shiftData.recording[product.id] || { entries: [] };

  productStats[product.id].totalReceived += asNumber(balance.received);
  productStats[product.id].totalDamages += asNumber(balance.damages);
  productStats[product.id].totalDelivered += calculateEntriesTotalQty(recording.entries);
}

function processShiftData(dayStore, shift, productStats, data) {
  if (!dayStore[shift]) return { customers: 0, purchases: 0 };

  let customerCount = 0;
  let purchaseCount = 0;

  if (dayStore[shift].customers) {
    customerCount = dayStore[shift].customers.length;
  }

  if (dayStore[shift].purchases) {
    purchaseCount = dayStore[shift].purchases.length;
  }

  data.products.forEach(product => {
    aggregateProductDataForShift(productStats, product, dayStore[shift]);
  });

  return { customers: customerCount, purchases: purchaseCount };
}

function setQuickRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  document.getElementById("startDate").value = startDate.toISOString().split('T')[0];
  document.getElementById("endDate").value = endDate.toISOString().split('T')[0];
}

function generateReport() {
  const startDateStr = document.getElementById("startDate").value;
  const endDateStr = document.getElementById("endDate").value;
  const resultsDiv = document.getElementById("reportResults");

  if (!startDateStr || !endDateStr) {
    resultsDiv.innerHTML = '<p class="text-error">Please select both start and end dates.</p>';
    return;
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (startDate > endDate) {
    resultsDiv.innerHTML = '<p class="text-error">Start date must be before end date.</p>';
    return;
  }

  const data = loadData();
  const productStats = {};
  let totalDays = 0;
  let totalCustomers = 0;
  let totalPurchases = 0;

  // Initialize product stats
  data.products.forEach(product => {
    productStats[product.id] = {
      name: product.name,
      totalReceived: 0,
      totalDelivered: 0,
      totalDamages: 0
    };
  });
 
  // Collect data for date range
  Object.keys(data.dailyStores || {}).forEach(dateStr => {
    const date = new Date(dateStr);
    if (date >= startDate && date <= endDate) {
      totalDays++;
      const dayStore = data.dailyStores[dateStr];

      ['day', 'night'].forEach(shift => {
        const counts = processShiftData(dayStore, shift, productStats, data);
        totalCustomers += counts.customers;
        totalPurchases += counts.purchases;
      });
    }
  });

  if (totalDays === 0) {
    resultsDiv.innerHTML = `<p class="text-muted">No data found for the selected date range.</p>`;
    return;
  }

  // Sort products by total delivered (descending)
  const sortedProducts = Object.values(productStats)
    .filter(p => p.totalDelivered > 0 || p.totalReceived > 0)
    .sort((a, b) => b.totalDelivered - a.totalDelivered);

  const totalReceived = sortedProducts.reduce((sum, p) => sum + p.totalReceived, 0);
  const totalDelivered = sortedProducts.reduce((sum, p) => sum + p.totalDelivered, 0);
  const totalDamages = sortedProducts.reduce((sum, p) => sum + p.totalDamages, 0);

  resultsDiv.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">Report Summary (${startDateStr} to ${endDateStr})</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
        <div><strong>Days:</strong> ${totalDays}</div>
        <div><strong>Customer Orders:</strong> ${totalCustomers}</div>
        <div><strong>Purchase Orders:</strong> ${totalPurchases}</div>
        <div><strong>Total Received:</strong> ${totalReceived}</div>
        <div><strong>Total Delivered:</strong> ${totalDelivered}</div>
        <div><strong>Total Damages:</strong> ${totalDamages}</div>
      </div>
    </div>

    <h3 style="font-size: 14px; margin-bottom: 8px;">Product Summary</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Total Received</th>
            <th>Total Delivered</th>
            <th>Total Damages</th>
            <th>Net Movement</th>
          </tr>
        </thead>
        <tbody>
          ${sortedProducts.map(p => {
            const netMovement = p.totalReceived - p.totalDelivered - p.totalDamages;
            return `
              <tr>
                <td>${p.name}</td>
                <td>${p.totalReceived}</td>
                <td>${p.totalDelivered}</td>
                <td>${p.totalDamages}</td>
                <td class="${netMovement >= 0 ? 'text-success' : 'text-error'}">${netMovement}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  // Set default to last 7 days
  setQuickRange(7);

  document.getElementById("generateReportButton").addEventListener("click", generateReport);
  document.getElementById("quickWeek").addEventListener("click", () => {
    setQuickRange(7);
    generateReport();
  });
  document.getElementById("quickMonth").addEventListener("click", () => {
    setQuickRange(30);
    generateReport();
  });
});
