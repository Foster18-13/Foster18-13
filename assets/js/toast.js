// Toast notification system
(function() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);

  window.showToast = function(message, type = 'info', timeout = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, timeout);
  };
})();
