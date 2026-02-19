async function initHomePage() {
  renderNav(location.pathname);
}

globalThis.addEventListener("DOMContentLoaded", initHomePage);
