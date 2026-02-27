// Theme Toggle - Light/Dark Mode

function initThemeToggle() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
  createThemeToggleButton();
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function createThemeToggleButton() {
  // Create theme toggle button if it doesn't exist
  if (document.getElementById('themeToggleBtn')) {
    return;
  }

  const topbarControls = document.querySelector('.topbar-controls');
  if (!topbarControls) {
    return;
  }

  const themeToggle = document.createElement('button');
  themeToggle.id = 'themeToggleBtn';
  themeToggle.className = 'theme-toggle';
  themeToggle.type = 'button';
  themeToggle.title = 'Toggle Dark/Light Mode (Ctrl+T)';
  themeToggle.textContent = 'Theme';
  
  // Insert before user controls if present, otherwise at the end
  const userControls = topbarControls.querySelector('#userControls') || topbarControls.querySelector('.user-controls');
  if (userControls) {
    userControls.parentNode.insertBefore(themeToggle, userControls);
  } else {
    topbarControls.appendChild(themeToggle);
  }

  themeToggle.addEventListener('click', toggleTheme);
}

// Keyboard shortcut: Ctrl+T for theme toggle
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    toggleTheme();
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
