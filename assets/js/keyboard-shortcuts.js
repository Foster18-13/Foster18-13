// Keyboard Shortcuts
// Ctrl+B: Balance Sheet
// Ctrl+R: Returns Sheet
// Ctrl+S: Save current sheet
// Ctrl+D: Dashboard
// Ctrl+H: Home

// Navigation shortcuts mapping
const navigationShortcuts = {
  'b': 'balance.html',
  'r': 'returns.html',
  'd': 'dashboard.html',
  'h': 'home.html',
  'p': 'products.html',
  'n': 'notebook.html',
  'c': 'customers.html'
};

// Save button IDs to try
const saveButtonIds = ['saveBalance', 'saveRecording', 'saveSummary', 'savePurchase'];

function handleNavigation(key) {
  const page = navigationShortcuts[key];
  if (page) {
    globalThis.location.href = page;
  }
}

function handleSave() {
  const saveButton = saveButtonIds
    .map(id => document.getElementById(id))
    .find(btn => btn !== null);
  
  if (saveButton) {
    saveButton.click();
  }
}

document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  if (!e.ctrlKey) {
    return;
  }

  e.preventDefault();

  // Handle save shortcut
  if (e.key === 's') {
    handleSave();
    return;
  }

  // Handle navigation shortcuts
  handleNavigation(e.key);
});

// Show shortcuts help on Ctrl+/
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    alert(`Keyboard Shortcuts:
    
Ctrl+H - Home
Ctrl+D - Dashboard
Ctrl+B - Balance Sheet
Ctrl+R - Returns Sheet
Ctrl+S - Save current sheet
Ctrl+P - Products
Ctrl+C - Customers
Ctrl+N - Notes for the Day
Ctrl+/ - Show this help`);
  }
});
