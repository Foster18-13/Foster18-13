let currentPeriodType = 'monthly';

function initializePage() {
  populateYearSelectors();
  populateMonthSelector();
  
  // Set current month and year as defaults
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  document.getElementById('yearSelect').value = currentYear;
  document.getElementById('quarterYear').value = currentYear;
  document.getElementById('yearlyYear').value = currentYear;
  document.getElementById('monthSelect').value = currentMonth;
  
  // Determine current quarter
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  document.getElementById('quarterSelect').value = `Q${currentQuarter}`;
}

function populateYearSelectors() {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  // Generate years from 2020 to current year + 1
  for (let year = 2020; year <= currentYear + 1; year++) {
    years.push(year);
  }
  
  const yearSelects = ['yearSelect', 'quarterYear', 'yearlyYear'];
  yearSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    years.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    });
  });
}

function populateMonthSelector() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const select = document.getElementById('monthSelect');
  months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month;
    select.appendChild(option);
  });
}

function selectPeriodType(type) {
  currentPeriodType = type;
  
  // Update tabs
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Show/hide selectors
  document.getElementById('monthlySelector').style.display = type === 'monthly' ? 'block' : 'none';
  document.getElementById('quarterlySelector').style.display = type === 'quarterly' ? 'block' : 'none';
  document.getElementById('yearlySelector').style.display = type === 'yearly' ? 'block' : 'none';
  
  // Clear results
  document.getElementById('reportResults').innerHTML = '';
}

function generateReport() {
  const data = loadData();
  let startDate, endDate, periodLabel;
  
  if (currentPeriodType === 'monthly') {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    if (isNaN(month) || isNaN(year)) {
      alert('Please select both month and year');
      return;
    }
    
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
    periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    
  } else if (currentPeriodType === 'quarterly') {
    const quarter = document.getElementById('quarterSelect').value;
    const year = parseInt(document.getElementById('quarterYear').value);
    
    if (!quarter || isNaN(year)) {
      alert('Please select both quarter and year');
      return;
    }
    
    const quarterNum = parseInt(quarter.substring(1));
    const startMonth = (quarterNum - 1) * 3;
    startDate = new Date(year, startMonth, 1);
    endDate = new Date(year, startMonth + 3, 0);
    periodLabel = `${quarter} ${year}`;
    
  } else if (currentPeriodType === 'yearly') {
    const year = parseInt(document.getElementById('yearlyYear').value);
    
    if (isNaN(year)) {
      alert('Please select a year');
      return;
    }
    
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
    periodLabel = `${year}`;
  }
  
  const reportData = calculatePeriodData(data, startDate, endDate);
  const previousPeriodData = calculatePreviousPeriodData(data, startDate, endDate);
  
  renderReport(reportData, previousPeriodData, periodLabel, startDate, endDate);
}

function calculatePeriodData(data, startDate, endDate) {
  const result = {
    totalDays: 0,
    operatingDays: 0,
    totalCustomers: 0,
    uniqueCustomers: new Set(),
    totalPurchases: 0,
    totalRevenue: 0,
    products: {},
    customers: {},
    vehicles: {},
    dailyBreakdown: []
  };
  
  // Iterate through all dates in range
  Object.keys(data.dailyStores || {}).forEach(dateStr => {
    const date = new Date(dateStr);
    if (date >= startDate && date <= endDate) {
      result.totalDays++;
      
      const dayStore = data.dailyStores[dateStr];
      let hasActivity = false;
      
      ['day', 'night'].forEach(shift => {
        if (!dayStore[shift]) return;
        
        const shiftData = dayStore[shift];
        
        // Process customers
        if (shiftData.customers && shiftData.customers.length > 0) {
          hasActivity = true;
          result.totalCustomers += shiftData.customers.length;
          
          shiftData.customers.forEach(customer => {
            result.uniqueCustomers.add(customer.customerId);
            
            // Track customer stats
            if (!result.customers[customer.customerId]) {
              result.customers[customer.customerId] = {
                name: customer.customerName,
                visits: 0,
                totalQuantity: 0,
                products: new Set()
              };
            }
            result.customers[customer.customerId].visits++;
            result.customers[customer.customerId].totalQuantity += asNumber(customer.quantity);
            result.customers[customer.customerId].products.add(customer.productId);
          });
        }
        
        // Process purchases
        if (shiftData.purchases && shiftData.purchases.length > 0) {
          hasActivity = true;
          result.totalPurchases += shiftData.purchases.length;
        }
        
        // Process products
        const activeProducts = getActiveProductsForDate(data, dateStr);
        activeProducts.forEach(product => {
          if (!result.products[product.id]) {
            result.products[product.id] = {
              name: product.name,
              totalLoaded: 0,
              totalReceived: 0,
              totalDamages: 0,
              totalReturns: 0,
              totalSold: 0,
              activeDays: 0
            };
          }
          
          const balance = shiftData.balance?.[product.id] || {};
          const recording = shiftData.recording?.[product.id] || { entries: [] };
          
          // Track if product had activity this day
          const received = asNumber(balance.received);
          const damages = asNumber(balance.damages);
          const returns = asNumber(balance.returns);
          
          if (received > 0 || damages > 0 || returns > 0 || recording.entries.length > 0) {
            result.products[product.id].activeDays++;
          }
          
          result.products[product.id].totalReceived += received;
          result.products[product.id].totalDamages += damages;
          result.products[product.id].totalReturns += returns;
          
          // Calculate loaded (sum of all entries)
          recording.entries.forEach(entry => {
            const loaded = asNumber(entry.loaded);
            result.products[product.id].totalLoaded += loaded;
            
            // Track by vehicle
            if (entry.vehicleId) {
              if (!result.vehicles[entry.vehicleId]) {
                result.vehicles[entry.vehicleId] = {
                  name: entry.vehicleNumber || entry.vehicleId,
                  totalLoaded: 0,
                  products: new Set()
                };
              }
              result.vehicles[entry.vehicleId].totalLoaded += loaded;
              result.vehicles[entry.vehicleId].products.add(product.id);
            }
          });
          
          // Calculate sold (loaded - returned)
          const totalLoadedForProduct = recording.entries.reduce((sum, e) => sum + asNumber(e.loaded), 0);
          result.products[product.id].totalSold += (totalLoadedForProduct - returns);
        });
      });
      
      if (hasActivity) {
        result.operatingDays++;
      }
    }
  });
  
  return result;
}

function calculatePreviousPeriodData(data, startDate, endDate) {
  const periodLength = endDate - startDate;
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - periodLength);
  
  return calculatePeriodData(data, prevStartDate, prevEndDate);
}

function renderReport(reportData, previousData, periodLabel, startDate, endDate) {
  const resultsDiv = document.getElementById('reportResults');
  
  if (reportData.operatingDays === 0) {
    resultsDiv.innerHTML = `
      <div class="no-data">
        <h2>No Data Available</h2>
        <p>No operational data found for ${periodLabel}</p>
      </div>
    `;
    return;
  }
  
  const productCount = Object.keys(reportData.products).length;
  const uniqueCustomers = reportData.uniqueCustomers.size;
  const vehicleCount = Object.keys(reportData.vehicles).length;
  
  // Calculate trends
  const customerTrend = calculateTrend(uniqueCustomers, previousData.uniqueCustomers.size);
  const visitTrend = calculateTrend(reportData.totalCustomers, previousData.totalCustomers);
  
  let html = `
    <div style="margin-bottom: 2rem;">
      <h2 style="color: var(--primary); margin: 0;">Period Report: ${periodLabel}</h2>
      <p style="color: var(--text-secondary); margin: 0.25rem 0;">
        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
      </p>
      <div class="action-buttons">
        <button class="button" onclick="window.print()">🖨️ Print Report</button>
        <button class="button" onclick="exportReportData()">📥 Export Data</button>
      </div>
    </div>
    
    <div class="report-summary">
      <div class="summary-card">
        <div class="label">Operating Days</div>
        <div class="value">${reportData.operatingDays}</div>
        <div class="label" style="font-size: 0.8rem;">of ${reportData.totalDays} days</div>
      </div>
      
      <div class="summary-card">
        <div class="label">Total Customer Visits</div>
        <div class="value">${reportData.totalCustomers.toLocaleString()}</div>
        ${visitTrend.html}
      </div>
      
      <div class="summary-card">
        <div class="label">Unique Customers</div>
        <div class="value">${uniqueCustomers}</div>
        ${customerTrend.html}
      </div>
      
      <div class="summary-card">
        <div class="label">Products Handled</div>
        <div class="value">${productCount}</div>
      </div>
      
      <div class="summary-card">
        <div class="label">Active Vehicles</div>
        <div class="value">${vehicleCount}</div>
      </div>
      
      <div class="summary-card">
        <div class="label">Total Purchases</div>
        <div class="value">${reportData.totalPurchases}</div>
      </div>
    </div>
  `;
  
  // Product Performance Section
  html += `
    <div class="report-section">
      <h3>📦 Product Performance</h3>
      <div style="overflow-x: auto;">
        <table class="report-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="number">Active Days</th>
              <th class="number">Total Loaded</th>
              <th class="number">Total Received</th>
              <th class="number">Total Sold</th>
              <th class="number">Total Returns</th>
              <th class="number">Total Damages</th>
              <th class="number">Avg Daily Load</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  const sortedProducts = Object.entries(reportData.products)
    .sort((a, b) => b[1].totalLoaded - a[1].totalLoaded);
  
  sortedProducts.forEach(([productId, stats]) => {
    const avgDaily = stats.activeDays > 0 ? (stats.totalLoaded / stats.activeDays).toFixed(1) : '0.0';
    html += `
      <tr>
        <td>${stats.name}</td>
        <td class="number">${stats.activeDays}</td>
        <td class="number">${stats.totalLoaded.toLocaleString()}</td>
        <td class="number">${stats.totalReceived.toLocaleString()}</td>
        <td class="number">${stats.totalSold.toLocaleString()}</td>
        <td class="number">${stats.totalReturns.toLocaleString()}</td>
        <td class="number">${stats.totalDamages.toLocaleString()}</td>
        <td class="number">${avgDaily}</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  // Top Customers Section
  html += `
    <div class="report-section">
      <h3>👥 Top Customers</h3>
      <div style="overflow-x: auto;">
        <table class="report-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th class="number">Total Visits</th>
              <th class="number">Total Quantity</th>
              <th class="number">Different Products</th>
              <th class="number">Avg per Visit</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  const sortedCustomers = Object.entries(reportData.customers)
    .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
    .slice(0, 20); // Top 20 customers
  
  sortedCustomers.forEach(([customerId, stats]) => {
    const avgPerVisit = stats.visits > 0 ? (stats.totalQuantity / stats.visits).toFixed(1) : '0.0';
    html += `
      <tr>
        <td>${stats.name}</td>
        <td class="number">${stats.visits}</td>
        <td class="number">${stats.totalQuantity.toLocaleString()}</td>
        <td class="number">${stats.products.size}</td>
        <td class="number">${avgPerVisit}</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  // Vehicle Performance Section
  if (vehicleCount > 0) {
    html += `
      <div class="report-section">
        <h3>🚚 Vehicle Performance</h3>
        <div style="overflow-x: auto;">
          <table class="report-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th class="number">Total Loaded</th>
                <th class="number">Different Products</th>
                <th class="number">Avg Daily Load</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const sortedVehicles = Object.entries(reportData.vehicles)
      .sort((a, b) => b[1].totalLoaded - a[1].totalLoaded);
    
    sortedVehicles.forEach(([vehicleId, stats]) => {
      const avgDaily = reportData.operatingDays > 0 ? (stats.totalLoaded / reportData.operatingDays).toFixed(1) : '0.0';
      html += `
        <tr>
          <td>${stats.name}</td>
          <td class="number">${stats.totalLoaded.toLocaleString()}</td>
          <td class="number">${stats.products.size}</td>
          <td class="number">${avgDaily}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  resultsDiv.innerHTML = html;
}

function calculateTrend(current, previous) {
  if (previous === 0) {
    return { html: '' };
  }
  
  const change = current - previous;
  const percentChange = ((change / previous) * 100).toFixed(1);
  const isUp = change >= 0;
  const arrow = isUp ? '↑' : '↓';
  const trendClass = isUp ? 'up' : 'down';
  
  return {
    html: `<div class="trend ${trendClass}">${arrow} ${Math.abs(percentChange)}% vs prev period</div>`,
    value: percentChange
  };
}

function exportReportData() {
  const resultsDiv = document.getElementById('reportResults');
  if (!resultsDiv.innerHTML) {
    alert('Please generate a report first');
    return;
  }
  
  // Create a printable version
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Period Report Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .number { text-align: right; font-family: monospace; }
          h2, h3 { color: #2c5aa0; }
        </style>
      </head>
      <body>
        ${resultsDiv.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePage);
