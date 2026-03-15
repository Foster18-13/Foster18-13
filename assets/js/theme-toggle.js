// Day/Night Theme Toggle

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

function getTheme() {
  return normalizeTheme(localStorage.getItem('twellium_theme'));
}

function setTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  localStorage.setItem('twellium_theme', normalizedTheme);
  applyTheme(normalizedTheme);
}

function applyTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalizedTheme;
  document.documentElement.style.colorScheme = normalizedTheme;
  if (document.body) {
    document.body.dataset.theme = normalizedTheme;
  }

  if (typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(
      new CustomEvent('twellium:theme-changed', {
        detail: { theme: normalizedTheme }
      })
    );
  }
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
