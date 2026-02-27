// Day/Night Theme Toggle

function getTheme() {
  return localStorage.getItem('twellium_theme') || 'light';
}

function setTheme(theme) {
  localStorage.setItem('twellium_theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  updateThemeButton();
}

function updateThemeButton() {
  const themeButton = document.getElementById('themeToggle');
  if (!themeButton) return;
  
  const theme = getTheme();
  if (theme === 'dark') {
    themeButton.innerHTML = '☀️ Light';
    themeButton.title = 'Switch to Light Mode';
  } else {
    themeButton.innerHTML = '🌙 Dark';
    themeButton.title = 'Switch to Dark Mode';
  }
}

// Apply theme on page load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getTheme());
  
  // Setup theme toggle button if it exists
  const themeButton = document.getElementById('themeToggle');
  if (themeButton) {
    themeButton.addEventListener('click', toggleTheme);
    updateThemeButton();
  }
});

// Apply theme immediately (before DOMContentLoaded to prevent flash)
applyTheme(getTheme());
