async function initHomePage() {
  if (typeof globalThis.cloudSyncHydrateAll === "function") {
    await globalThis.cloudSyncHydrateAll();
  }
  renderNav(location.pathname);
}

globalThis.addEventListener("DOMContentLoaded", initHomePage);
