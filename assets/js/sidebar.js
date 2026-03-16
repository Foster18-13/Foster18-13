function initSidebar() {
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const root = document.body;

  if (!toggle || !sidebar || !overlay || !root) return;

  const open = () => {
    root.classList.add("sidebar-open");
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    root.classList.remove("sidebar-open");
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  close();

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (sidebar.classList.contains("is-open")) {
      close();
    } else {
      open();
    }
  });

  overlay.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", close);
  });
}
