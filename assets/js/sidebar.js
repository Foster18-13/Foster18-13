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

  // Dropdown/collapsible group logic
  sidebar.querySelectorAll('.sidebar-group-toggle').forEach((toggle) => {
    const menu = toggle.nextElementSibling;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      const newExpanded = !expanded;
      toggle.setAttribute('aria-expanded', newExpanded);
      if (menu) menu.style.display = newExpanded ? 'flex' : 'none';
    });
    // Start collapsed on load
    toggle.setAttribute('aria-expanded', 'false');
    if (menu) menu.style.display = 'none';
  });

  // Responsive: close sidebar on resize if too wide
  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) close();
  });
}
