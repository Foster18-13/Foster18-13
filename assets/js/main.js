// Main JS for new portal
window.showToast = function(msg, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.position = 'fixed';
    c.style.top = '24px';
    c.style.right = '24px';
    c.style.zIndex = 3000;
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.style.gap = '12px';
    document.body.appendChild(c);
  }
  const toast = document.createElement('div');
  toast.className = 'glass';
  toast.style.padding = '16px 22px';
  toast.style.fontWeight = '600';
  toast.style.fontSize = '1.1rem';
  toast.style.color = type === 'error' ? '#fff' : 'var(--text)';
  toast.style.background = type === 'error' ? '#ef4444' : 'var(--surface-glass)';
  toast.textContent = msg;
  c.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 2200);
  setTimeout(() => { c.removeChild(toast); }, 2700);
};
// Dark mode toggle
window.toggleDark = function() {
  document.documentElement.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.documentElement.classList.contains('dark-mode') ? '1' : '0');
};
window.initDark = function() {
  const darkPref = localStorage.getItem('darkMode');
  if (darkPref === '1' || (darkPref === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark-mode');
  }
};
document.addEventListener('DOMContentLoaded', window.initDark);
