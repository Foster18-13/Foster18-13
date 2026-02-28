// Auto-Save System - Saves data every 30 seconds if changes detected

let autoSaveTimer = null;
let hasUnsavedChanges = false;
let lastSaveTime = null;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Mark that data has been modified
function markDataChanged() {
  hasUnsavedChanges = true;
  updateSaveStatus('unsaved');
}

// Mark that data has been saved
function markDataSaved() {
  hasUnsavedChanges = false;
  lastSaveTime = new Date();
  updateSaveStatus('saved');
}

// Update the save status indicator
function updateSaveStatus(status) {
  const statusElement = document.getElementById('autoSaveStatus');
  if (!statusElement) return;

  if (status === 'saving') {
    statusElement.innerHTML = '💾 Saving...';
    statusElement.style.color = '#607085';
  } else if (status === 'saved') {
    const timeStr = lastSaveTime ? formatTime(lastSaveTime) : '';
    statusElement.innerHTML = `✓ Saved ${timeStr}`;
    statusElement.style.color = '#027a48';
  } else if (status === 'unsaved') {
    statusElement.innerHTML = '● Unsaved changes';
    statusElement.style.color = '#b42318';
  } else if (status === 'error') {
    statusElement.innerHTML = '⚠ Save failed';
    statusElement.style.color = '#b42318';
  }
}

// Format time as "at HH:MM AM/PM"
function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `at ${displayHours}:${displayMinutes} ${ampm}`;
}

// Start auto-save timer
function startAutoSave(saveFunction) {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  autoSaveTimer = setInterval(() => {
    if (hasUnsavedChanges) {
      performAutoSave(saveFunction);
    }
  }, AUTO_SAVE_INTERVAL);
}

// Perform the actual save
async function performAutoSave(saveFunction) {
  if (!hasUnsavedChanges) return;

  updateSaveStatus('saving');
  
  try {
    if (typeof saveFunction === 'function') {
      await saveFunction();
    }
    markDataSaved();
  } catch (error) {
    console.error('Auto-save failed:', error);
    updateSaveStatus('error');
    // Retry after 5 seconds
    setTimeout(() => {
      if (hasUnsavedChanges) {
        performAutoSave(saveFunction);
      }
    }, 5000);
  }
}

// Stop auto-save (cleanup)
function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Save before leaving page
function setupBeforeUnloadHandler() {
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
}

// Initialize auto-save for a page
function initAutoSave(saveFunction) {
  startAutoSave(saveFunction);
  setupBeforeUnloadHandler();
  
  // Show initial status
  updateSaveStatus('saved');
  
  // Cleanup on page unload
  window.addEventListener('unload', stopAutoSave);
}

// Track input changes
function trackInputChanges(containerSelector = 'body') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Track text inputs, textareas, and selects
  container.addEventListener('input', (e) => {
    if (e.target.matches('input, textarea, select')) {
      markDataChanged();
    }
  });

  // Track any programmatic data changes
  const originalSaveData = window.saveData;
  if (originalSaveData) {
    window.saveData = function(...args) {
      markDataChanged();
      return originalSaveData.apply(this, args);
    };
  }
}
