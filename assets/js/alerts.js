// Real-Time Alert System for Stock Notifications

let alertCheckInterval = null;
const ALERT_CHECK_FREQUENCY = 60000; // Check every minute
const LOW_STOCK_THRESHOLD = 10;

// Initialize alert system
function initAlertSystem() {
  requestNotificationPermission();
  startAlertMonitoring();
  
  // Check alerts immediately on load
  setTimeout(checkStockAlerts, 2000);
}

// Request browser notification permission
function requestNotificationPermission() {
  if ('Notification' in globalThis && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Start monitoring for alerts
function startAlertMonitoring() {
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
  }
  
  alertCheckInterval = setInterval(() => {
    checkStockAlerts();
  }, ALERT_CHECK_FREQUENCY);
}

// Stop monitoring
function stopAlertMonitoring() {
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
  }
}

// Check for low stock items
function checkStockAlerts() {
  const data = loadData();
  const date = getSelectedDate();
  const shift = getSelectedShift();
  const dayStore = getShiftStore(data, date);
  
  const lowStockItems = [];
  
  // Check balance sheet for low stock
  if (dayStore.balance) {
    data.products.forEach(product => {
      const productBalance = dayStore.balance[product.id] || {};
      const closing = Number.parseFloat(productBalance.closing) || 0;
      
      if (closing > 0 && closing <= LOW_STOCK_THRESHOLD) {
        lowStockItems.push({
          product: product.name,
          stock: closing,
          type: 'low'
        });
      } else if (closing === 0) {
        lowStockItems.push({
          product: product.name,
          stock: 0,
          type: 'out'
        });
      }
    });
  }
  
  // Show alerts if any
  if (lowStockItems.length > 0) {
    showStockAlert(lowStockItems, date, shift);
  }
}

// Show alert notification
function showStockAlert(items, date, shift) {
  const alertContainer = getOrCreateAlertContainer();
  
  // Group by type
  const outOfStock = items.filter(item => item.type === 'out');
  const lowStock = items.filter(item => item.type === 'low');
  
  let html = '<div class="alert-notification">';
  html += '<div class="alert-header">';
  html += '<span class="alert-icon">⚠️</span>';
  html += '<span class="alert-title">Stock Alert</span>';
  html += '<button class="alert-close" onclick="closeAlert(this)">×</button>';
  html += '</div>';
  html += `<div class="alert-body">`;
  html += `<p class="alert-date">${date} - ${shift.toUpperCase()} shift</p>`;
  
  if (outOfStock.length > 0) {
    html += `<div class="alert-section alert-critical">`;
    html += `<strong>🔴 Out of Stock (${outOfStock.length}):</strong>`;
    html += '<ul>';
    outOfStock.slice(0, 3).forEach(item => {
      html += `<li>${item.product}</li>`;
    });
    if (outOfStock.length > 3) {
      html += `<li>and ${outOfStock.length - 3} more...</li>`;
    }
    html += '</ul>';
    html += `</div>`;
  }
  
  if (lowStock.length > 0) {
    html += `<div class="alert-section alert-warning">`;
    html += `<strong>🟡 Low Stock (${lowStock.length}):</strong>`;
    html += '<ul>';
    lowStock.slice(0, 3).forEach(item => {
      html += `<li>${item.product} (${item.stock} left)</li>`;
    });
    if (lowStock.length > 3) {
      html += `<li>and ${lowStock.length - 3} more...</li>`;
    }
    html += '</ul>';
    html += `</div>`;
  }
  
  html += '<div class="alert-actions">';
  html += '<button class="button button-primary" onclick="window.location.href=\'balance.html\'">View Balance</button>';
  html += '<button class="button" onclick="closeAlert(this.closest(\'.alert-notification\'))">Dismiss</button>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  
  // Only add if not already present
  if (!alertContainer.querySelector('.alert-notification')) {
    alertContainer.innerHTML = html;
    alertContainer.style.display = 'block';
    
    // Browser notification
    showBrowserNotification(outOfStock.length + lowStock.length);
  }
}

// Show browser notification
function showBrowserNotification(count) {
  if ('Notification' in globalThis && Notification.permission === 'granted') {
    const notification = new Notification('Stock Alert', {
      body: `You have ${count} item(s) that need attention`,
      icon: '/assets/images/logo.png',
      badge: '/assets/images/badge.png',
      tag: 'stock-alert',
      requireInteraction: false
    });
    
    notification.onclick = function() {
      globalThis.focus();
      this.close();
    };
    
    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }
}

// Get or create alert container
function getOrCreateAlertContainer() {
  let container = document.getElementById('alertContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alertContainer';
    container.className = 'alert-container';
    document.body.appendChild(container);
  }
  return container;
}

// Close alert
function closeAlert(element) {
  const alertElement = element.closest ? element.closest('.alert-notification') : element;
  if (alertElement) {
    alertElement.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      alertElement.remove();
      const container = document.getElementById('alertContainer');
      if (container && !container.querySelector('.alert-notification')) {
        container.style.display = 'none';
      }
    }, 300);
  }
}

// Make closeAlert available globally
globalThis.closeAlert = closeAlert;

// Cleanup on page unload
globalThis.addEventListener('unload', stopAlertMonitoring);
