// Enhanced Global Search - Search across all sheets, dates, and data

let searchResults = [];

// Initialize enhanced search
function initEnhancedSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const searchBtn = document.getElementById('globalSearchBtn');
  
  if (searchInput && searchBtn) {
    // Search on button click
    searchBtn.addEventListener('click', performGlobalSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performGlobalSearch();
      }
    });
    
    // Live search suggestions (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (e.target.value.length >= 2) {
          showSearchSuggestions(e.target.value);
        } else {
          hideSearchSuggestions();
        }
      }, 300);
    });
  }
}

// Perform comprehensive global search
function performGlobalSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const query = searchInput?.value.trim().toLowerCase();
  
  if (!query || query.length < 2) {
    alert('Please enter at least 2 characters to search');
    return;
  }
  
  searchResults = [];
  const data = loadData();
  
  // Search in products
  searchInProducts(data, query);
  
  // Search in balance sheets
  searchInBalance(data, query);
  
  // Search in recording sheets
  searchInRecording(data, query);
  
  // Search in customers
  searchInCustomers(data, query);
  
  // Search in purchases
  searchInPurchases(data, query);
  
  // Display results
  displaySearchResults(query);
}

// Search in products
function searchInProducts(data, query) {
  data.products.forEach(product => {
    if (product.name.toLowerCase().includes(query)) {
      searchResults.push({
        type: 'Product',
        title: product.name,
        details: `Product ID: ${product.id}`,
        link: 'products.html',
        icon: '📦'
      });
    }
  });
}

// Search in balance sheets
function searchInBalance(data, query) {
  Object.entries(data.daily || {}).forEach(([date, dayData]) => {
    ['day', 'night'].forEach(shift => {
      const shiftData = dayData[shift];
      if (!shiftData?.balance) return;
      
      Object.entries(shiftData.balance).forEach(([productId, balance]) => {
        const product = data.products.find(p => p.id === productId);
        const productName = product?.name || 'Unknown';
        
        if (productName.toLowerCase().includes(query) || 
            date.includes(query) || 
            shift.includes(query)) {
          searchResults.push({
            type: 'Balance',
            title: `${productName} - ${date} (${shift})`,
            details: `Opening: ${balance.opening || 0}, Closing: ${balance.closing || 0}`,
            link: `balance.html?date=${date}&shift=${shift}`,
            date: date,
            shift: shift,
            icon: '📊'
          });
        }
      });
    });
  });
}

// Search in recording sheets
function searchInRecording(data, query) {
  Object.entries(data.daily || {}).forEach(([date, dayData]) => {
    ['day', 'night'].forEach(shift => {
      const shiftData = dayData[shift];
      if (!shiftData?.recording) return;
      
      Object.entries(shiftData.recording).forEach(([productId, recording]) => {
        const product = data.products.find(p => p.id === productId);
        const productName = product?.name || 'Unknown';
        
        if (recording.entries && Array.isArray(recording.entries)) {
          recording.entries.forEach((entry, index) => {
            if (entry && (
              entry.waybill?.toLowerCase().includes(query) ||
              productName.toLowerCase().includes(query) ||
              date.includes(query)
            )) {
              searchResults.push({
                type: 'Recording',
                title: `Waybill: ${entry.waybill} - ${productName}`,
                details: `Date: ${date} (${shift}), Qty: ${entry.qty}`,
                link: `recording.html?date=${date}&shift=${shift}`,
                date: date,
                shift: shift,
                icon: '📝'
              });
            }
          });
        }
      });
    });
  });
}

// Search in customers
function searchInCustomers(data, query) {
  Object.entries(data.daily || {}).forEach(([date, dayData]) => {
    ['day', 'night'].forEach(shift => {
      const shiftData = dayData[shift];
      if (!shiftData?.customers) return;
      
      shiftData.customers.forEach(customer => {
        const product = data.products.find(p => p.id === customer.productId);
        const productName = product?.name || 'Unknown';
        
        if (customer.customerName?.toLowerCase().includes(query) ||
            customer.waybillNumber?.toLowerCase().includes(query) ||
            productName.toLowerCase().includes(query) ||
            date.includes(query)) {
          searchResults.push({
            type: 'Customer',
            title: `${customer.customerName} - ${customer.waybillNumber}`,
            details: `Product: ${productName}, Date: ${date} (${shift}), Qty: ${customer.quantity}`,
            link: `customers.html?date=${date}&shift=${shift}`,
            date: date,
            shift: shift,
            icon: '👤'
          });
        }
      });
    });
  });
}

// Search in purchases
function searchInPurchases(data, query) {
  Object.entries(data.daily || {}).forEach(([date, dayData]) => {
    ['day', 'night'].forEach(shift => {
      const shiftData = dayData[shift];
      if (!shiftData?.purchases) return;
      
      shiftData.purchases.forEach(purchase => {
        const product = data.products.find(p => p.id === purchase.productId);
        const productName = product?.name || 'Unknown';
        
        if (productName.toLowerCase().includes(query) ||
            date.includes(query) ||
            purchase.supplier?.toLowerCase().includes(query)) {
          searchResults.push({
            type: 'Purchase',
            title: `Purchase: ${productName}`,
            details: `Supplier: ${purchase.supplier || 'N/A'}, Date: ${date} (${shift}), Qty: ${purchase.quantity}`,
            link: `purchase.html?date=${date}&shift=${shift}`,
            date: date,
            shift: shift,
            icon: '🛒'
          });
        }
      });
    });
  });
}

// Display search results in modal
function displaySearchResults(query) {
  const modal = getOrCreateSearchModal();
  const resultsContainer = modal.querySelector('.search-results');
  const queryDisplay = modal.querySelector('.search-query');
  
  queryDisplay.textContent = `Results for "${query}" (${searchResults.length} found)`;
  
  if (searchResults.length === 0) {
    resultsContainer.innerHTML = '<div class="search-no-results">No results found. Try different keywords.</div>';
  } else {
    // Sort by date (newest first)
    searchResults.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    
    resultsContainer.innerHTML = searchResults.map((result, index) => `
      <div class="search-result-item" onclick="navigateToResult('${result.link.replace(/'/g, "\\'")}')">
        <div class="search-result-icon">${result.icon}</div>
        <div class="search-result-content">
          <div class="search-result-type">${result.type}</div>
          <div class="search-result-title">${result.title}</div>
          <div class="search-result-details">${result.details}</div>
        </div>
        <div class="search-result-arrow">→</div>
      </div>
    `).join('');
  }
  
  modal.style.display = 'flex';
}

// Navigate to search result
function navigateToResult(link) {
  window.location.href = link;
}

// Show search suggestions
function showSearchSuggestions(query) {
  // This can be enhanced with autocomplete suggestions
  // For now, we'll keep it simple
}

// Hide search suggestions
function hideSearchSuggestions() {
  // Clear suggestions
}

// Get or create search modal
function getOrCreateSearchModal() {
  let modal = document.getElementById('searchModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'searchModal';
    modal.className = 'search-modal';
    modal.innerHTML = `
      <div class="search-modal-content">
        <div class="search-modal-header">
          <h3>🔍 Search Results</h3>
          <button class="search-close" onclick="closeSearchModal()">×</button>
        </div>
        <div class="search-query"></div>
        <div class="search-results"></div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSearchModal();
      }
    });
  }
  return modal;
}

// Close search modal
function closeSearchModal() {
  const modal = document.getElementById('searchModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Make functions globally available
window.navigateToResult = navigateToResult;
window.closeSearchModal = closeSearchModal;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initEnhancedSearch();
});
