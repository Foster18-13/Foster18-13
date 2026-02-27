// Keyboard Shortcuts
// Ctrl+B: Balance Sheet
// Ctrl+R: Recording Sheet
// Ctrl+S: Save current sheet
// Ctrl+D: Dashboard
// Ctrl+H: Home

const shortcutMap = {
  'b': 'balance.html',
  'r': 'recording.html',
  'd': 'dashboard.html',
  'h': 'home.html',
  'p': 'products.html',
  'n': 'notebook.html',
  'c': 'customers.html',
};

const saveButtonIds = ['saveBalance', 'saveRecording', 'saveSummary', 'savePurchase'];

function handleKeyboardShortcut(e) {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  if (!e.ctrlKey) {
    return;
  }

  const key = e.key.toLowerCase();

  // Handle navigation shortcuts
  if (shortcutMap[key]) {
    e.preventDefault();
    globalThis.location.href = shortcutMap[key];
    return;
  }

  // Handle save shortcut
  if (key === 's') {
    e.preventDefault();
    const saveButton = saveButtonIds.reduce((button, id) => button || document.getElementById(id), null);
    if (saveButton) {
      saveButton.click();
    }
  }
}

document.addEventListener('keydown', handleKeyboardShortcut);

// Show shortcuts help on Ctrl+/
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    alert(`Keyboard Shortcuts:
    
Ctrl+H - Home
Ctrl+D - Dashboard
Ctrl+B - Balance Sheet
Ctrl+R - Recording Sheet
Ctrl+S - Save current sheet
Ctrl+P - Products
Ctrl+C - Customers
Ctrl+N - Notebook
Ctrl+/ - Show this help`);
  }
});
