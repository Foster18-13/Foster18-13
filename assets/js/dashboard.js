function renderDashboard() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  // Total products
  document.getElementById('totalProducts').textContent = data.products.length;

  // Calculate totals
  let totalStock = 0;
  let totalLoaded = 0;
  let totalReceived = 0;
  let totalDamaged = 0;
  const lowStockProducts = [];
  const productMovements = [];

  data.products.forEach(product => {
    const balance = dayStore.balance[product.id] || {};
    const recording = dayStore.recording[product.id] || { entries: [] };
    
    const closing = asNumber(balance.closing);
    const loaded = recording.entries.reduce((sum, entry) => sum + asNumber(entry.qty || 0), 0);
    const damaged = asNumber(balance.damaged);

    totalStock += closing;
    totalLoaded += loaded;
    totalDamaged += damaged;

    // Check for low stock (less than 10)
    if (closing > 0 && closing < 10) {
      lowStockProducts.push({ name: product.name, stock: closing });
    }

    productMovements.push({
      name: product.name,
      loaded: loaded,
      received: asNumber(balance.received),
      stock: closing
    });
  });

  // Count purchases
  totalReceived = dayStore.purchases.reduce((sum, p) => sum + asNumber(p.quantityReceived || p.pallets), 0);

  // Count customers
  const totalCustomers = dayStore.customers ? dayStore.customers.length : 0;

  // Update stats
  document.getElementById('totalStock').textContent = totalStock;
  document.getElementById('totalLoaded').textContent = totalLoaded;
  document.getElementById('totalReceived').textContent = totalReceived;
  document.getElementById('totalDamaged').textContent = totalDamaged;
  document.getElementById('totalCustomers').textContent = totalCustomers;

  // Low stock alerts
  const alertsContainer = document.getElementById('lowStockAlerts');
  if (lowStockProducts.length > 0) {
    alertsContainer.innerHTML = `
      <div class="alert-box">
        <h3>⚠️ Low Stock Alerts</h3>
        ${lowStockProducts.map(p => `
          <div class="alert-item">
            <strong>${p.name}</strong>: Only ${p.stock} units remaining
          </div>
        `).join('')}
      </div>
    `;
  } else {
    alertsContainer.innerHTML = '';
  }

  // Top products by movement
  const topProducts = productMovements
    .filter(p => p.loaded > 0 || p.received > 0)
    .sort((a, b) => (b.loaded + b.received) - (a.loaded + a.received))
    .slice(0, 10);

  const topProductsTable = document.querySelector('#topProductsTable tbody');
  if (topProducts.length === 0) {
    topProductsTable.innerHTML = '<tr><td colspan="4">No product movements for this date.</td></tr>';
  } else {
    topProductsTable.innerHTML = topProducts.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.loaded}</td>
        <td>${p.received}</td>
        <td>${p.stock}</td>
      </tr>
    `).join('');
  }

  // Top customers
  if (dayStore.customers && dayStore.customers.length > 0) {
    const customerStats = {};
    dayStore.customers.forEach(customer => {
      if (!customerStats[customer.customerName]) {
        customerStats[customer.customerName] = { orders: 0, quantity: 0 };
      }
      customerStats[customer.customerName].orders++;
      customerStats[customer.customerName].quantity += customer.quantity;
    });

    const topCustomers = Object.entries(customerStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topCustomersTable = document.querySelector('#topCustomersTable tbody');
    topCustomersTable.innerHTML = topCustomers.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.orders}</td>
        <td>${c.quantity}</td>
      </tr>
    `).join('');
  } else {
    document.querySelector('#topCustomersTable tbody').innerHTML = 
      '<tr><td colspan="3">No customer orders for this date.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});
