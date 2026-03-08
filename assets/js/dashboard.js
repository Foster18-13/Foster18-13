function renderDashboard() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const activeProducts = getActiveProductsForDate(data, date);

  // Total products
  document.getElementById('totalProducts').textContent = activeProducts.length;

  // Calculate totals
  let totalStock = 0;
  let totalOpening = 0;
  let totalOutstanding = 0;
  let totalClosing = 0;
  let totalDelivered = 0;
  let totalReceived = 0;
  let totalDamaged = 0;
  const lowStockProducts = [];
  const productMovements = [];

  activeProducts.forEach(product => {
    const balance = dayStore.balance[product.id] || {};
    const recording = dayStore.recording[product.id] || { entries: [] };
    
    const closing = asNumber(balance.closing);
    const opening = asNumber(balance.opening);
    const returns = asNumber(balance.returns);
    const delivered = recording.entries.reduce((sum, entry) => sum + asNumber(entry.qty || 0), 0);
    const damaged = asNumber(balance.damaged);
    const received = getGoodsReceivedForProduct(dayStore, product.id);
    const outstanding = computeBalanceValue({
      opening,
      returns,
      goodsReceived: received,
      loading: delivered,
      damages: damaged
    });

    totalStock += closing;
    totalOpening += opening;
    totalOutstanding += outstanding;
    totalClosing += closing;
    totalDelivered += delivered;
    totalDamaged += damaged;

    // Check for low stock (less than 10)
    if (closing > 0 && closing < 10) {
      lowStockProducts.push({ name: product.name, stock: closing });
    }

    productMovements.push({
      name: product.name,
      delivered: delivered,
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
  document.getElementById('totalOpening').textContent = totalOpening;
  document.getElementById('totalOutstanding').textContent = totalOutstanding;
  document.getElementById('totalClosing').textContent = totalClosing;
  document.getElementById('totalLoaded').textContent = totalDelivered;
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
    .filter(p => p.delivered > 0 || p.received > 0)
    .sort((a, b) => (b.delivered + b.received) - (a.delivered + a.received))
    .slice(0, 10);

  const topProductsTable = document.querySelector('#topProductsTable tbody');
  if (topProducts.length === 0) {
    topProductsTable.innerHTML = '<tr><td colspan="4">No product movements for this date.</td></tr>';
  } else {
    topProductsTable.innerHTML = topProducts.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.delivered}</td>
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

  renderMovementChart(productMovements);
  renderStockStatusChart(productMovements);
}

function getThemeChartColors() {
  const css = getComputedStyle(document.documentElement);
  return {
    text: css.getPropertyValue('--text').trim() || '#1f2937',
    textMuted: css.getPropertyValue('--text-muted').trim() || '#667085',
    border: css.getPropertyValue('--border').trim() || '#d0d5dd',
    bg: css.getPropertyValue('--bg').trim() || '#f8fafc',
    primary: css.getPropertyValue('--primary').trim() || '#4f46e5',
    success: css.getPropertyValue('--success').trim() || '#16a34a',
    danger: css.getPropertyValue('--danger').trim() || '#dc2626'
  };
}

function drawNoData(canvas, message) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = getThemeChartColors();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colors.textMuted;
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function renderMovementChart(productMovements) {
  const canvas = document.getElementById('movementChart');
  if (!canvas) return;

  const topFive = productMovements
    .map(product => ({
      name: product.name,
      value: asNumber(product.delivered) + asNumber(product.received)
    }))
    .filter(product => product.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (topFive.length === 0) {
    drawNoData(canvas, 'No movement data for selected date');
    return;
  }

  const ctx = canvas.getContext('2d');
  const colors = getThemeChartColors();
  const width = canvas.width;
  const height = canvas.height;
  const left = 130;
  const right = 26;
  const top = 24;
  const bottom = 24;
  const chartWidth = width - left - right;
  const barGap = 10;
  const barHeight = Math.floor((height - top - bottom - (barGap * (topFive.length - 1))) / topFive.length);
  const maxValue = Math.max(...topFive.map(item => item.value), 1);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  topFive.forEach((item, index) => {
    const y = top + index * (barHeight + barGap);
    const barWidth = Math.max(2, Math.round((item.value / maxValue) * chartWidth));

    ctx.fillStyle = colors.primary;
    ctx.fillRect(left, y, barWidth, barHeight);

    ctx.fillStyle = colors.text;
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name.length > 16 ? `${item.name.slice(0, 16)}…` : item.name, left - 8, y + barHeight / 2);

    ctx.textAlign = 'left';
    ctx.fillText(String(item.value), left + barWidth + 8, y + barHeight / 2);
  });
}

function renderStockStatusChart(productMovements) {
  const canvas = document.getElementById('stockStatusChart');
  if (!canvas) return;

  let healthy = 0;
  let low = 0;
  let out = 0;

  productMovements.forEach(product => {
    const stock = asNumber(product.stock);
    if (stock <= 0) {
      out++;
    } else if (stock <= 10) {
      low++;
    } else {
      healthy++;
    }
  });

  const total = healthy + low + out;
  if (total === 0) {
    drawNoData(canvas, 'No stock data available');
    return;
  }

  const ctx = canvas.getContext('2d');
  const colors = getThemeChartColors();
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  const legend = [
    { label: 'Healthy (>10)', value: healthy, color: colors.success },
    { label: 'Low (1-10)', value: low, color: '#f59e0b' },
    { label: 'Out (0)', value: out, color: colors.danger }
  ];

  const barX = 50;
  const barY = 64;
  const barW = width - 100;
  const barH = 26;
  let cursor = barX;

  legend.forEach(item => {
    if (item.value <= 0) return;
    const segmentW = Math.max(0, Math.round((item.value / total) * barW));
    ctx.fillStyle = item.color;
    ctx.fillRect(cursor, barY, segmentW, barH);
    cursor += segmentW;
  });

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = colors.text;
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Total products: ${total}`, barX, barY - 14);

  let legendY = 126;
  legend.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(barX, legendY - 10, 14, 14);

    ctx.fillStyle = colors.text;
    ctx.fillText(`${item.label}: ${item.value}`, barX + 22, legendY);
    legendY += 28;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();

  const workingDate = document.getElementById('workingDate');
  const jumpToday = document.getElementById('jumpToday');
  const themeToggle = document.getElementById('themeToggle');

  if (workingDate) {
    workingDate.addEventListener('change', renderDashboard);
  }

  if (jumpToday) {
    jumpToday.addEventListener('click', () => {
      setTimeout(renderDashboard, 0);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTimeout(renderDashboard, 0);
    });
  }
});
