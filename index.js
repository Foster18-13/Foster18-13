function renderNav(pathname) {
  // Initialize shared header with navigation and role-based access
  if (typeof initSharedHeader === "function") {
    initSharedHeader();
  }
}

async function initHomePage() {
  renderNav(location.pathname);
}

globalThis.addEventListener("DOMContentLoaded", initHomePage);
