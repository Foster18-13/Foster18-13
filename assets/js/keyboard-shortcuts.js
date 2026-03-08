// Keyboard Shortcuts
// Ctrl+B: Balance Sheet
// Ctrl+R: Returns Sheet
// Ctrl+S: Save current sheet
// Ctrl+D: Dashboard
// Ctrl+H: Home

document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  // Ctrl+B: Balance Sheet
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    window.location.href = 'balance.html';
  }

  // Ctrl+R: Returns Sheet
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    window.location.href = 'returns.html';
  }

  // Ctrl+D: Dashboard
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    window.location.href = 'dashboard.html';
  }

  // Ctrl+H: Home
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    window.location.href = 'home.html';
  }

  // Ctrl+S: Save (if on sheets with save buttons)
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    
    // Try to find and click save button
    const saveButton = document.getElementById('saveBalance') || 
                      document.getElementById('saveRecording') || 
                      document.getElementById('saveSummary') ||
                      document.getElementById('savePurchase');
    
    if (saveButton) {
      saveButton.click();
    }
  }

  // Ctrl+P: Products
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault();
    window.location.href = 'products.html';
  }

  // Ctrl+N: Notes for the Day
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    window.location.href = 'notebook.html';
  }

  // Ctrl+C: Customers
  if (e.ctrlKey && e.key === 'c') {
    e.preventDefault();
    window.location.href = 'customers.html';
  }
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
