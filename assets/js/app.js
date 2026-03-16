function setUserLabel(user) {
  const el = document.getElementById("userLabel");
  if (!el || !user) return;
  el.textContent = user.email || "Guest Access";
}

function setSectorLabel() {
  const el = document.getElementById("sectorLabel");
  if (!el) return;
  el.textContent = getSector();
}

function initShiftControl(onShiftChange) {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  const existing = document.getElementById("shiftControlWrap");
  if (!usesShiftStorage()) {
    existing?.remove();
    return;
  }

  let wrapper = existing;
  if (!wrapper) {
    wrapper = document.createElement("span");
    wrapper.id = "shiftControlWrap";
    wrapper.className = "shift-control-wrap";
    wrapper.innerHTML = `
      <label for="workingShift">Shift</label>
      <select id="workingShift" class="input">
        <option value="day">Day Shift (6:00 AM - 6:00 PM)</option>
        <option value="night">Night Shift (6:00 PM - 6:00 AM)</option>
      </select>
    `;

    const menuButton = document.getElementById("sidebarToggle");
    if (menuButton) {
      menuButton.before(wrapper);
    } else {
      controls.appendChild(wrapper);
    }
  }

  const shiftSelect = document.getElementById("workingShift");
  if (!shiftSelect) return;
  shiftSelect.value = selectedShift();

  if (shiftSelect.dataset.bound === "true") return;
  shiftSelect.dataset.bound = "true";
  shiftSelect.addEventListener("change", () => {
    setSelectedShiftValue(shiftSelect.value);
    if (typeof onShiftChange === "function") {
      onShiftChange();
    }
  });
}

function setActiveNav() {
  const current = (globalThis.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  document.querySelectorAll(".sidebar a[data-page]").forEach((link) => {
    if (link.dataset.page === current) {
      link.classList.add("active");
    }
  });
}

function getBrandLogoConfig() {
  const sector = (getSector() || "").toLowerCase();
  const page = (globalThis.location.pathname.split("/").pop() || "").toLowerCase();

  if (page === "sector-select.html") {
    return {
      src: "assets/img/site-logo.png",
      alt: "Twellium Warehouse Portal Logo"
    };
  }

  if (sector === "water") {
    return {
      src: "assets/img/water-logo.png",
      alt: "Water and Beverages Logo"
    };
  }
  if (sector === "mcberry") {
    return {
      src: "assets/img/mcberry-logo.png",
      alt: "Mcberry Logo"
    };
  }
  if (sector === "hh") {
    return {
      src: "assets/img/hh-logo.png",
      alt: "H and H Logo"
    };
  }
  return {
    src: "assets/img/site-logo.png",
    alt: "Warehouse Portal Logo"
  };
}

function getSectorDisplayName() {
  const sector = (getSector() || "").toLowerCase();
  if (sector === "water") return "Water";
  if (sector === "hh") return "H&H";
  if (sector === "mcberry") return "McBerry";
  return getSector();
}

const PRINT_LAYOUT_KEY = "twelliumPrintLayout";

function choosePrintLayout() {
  const saved = String(sessionStorage.getItem(PRINT_LAYOUT_KEY) || "auto").toLowerCase();
  const suggestion = saved === "portrait" || saved === "landscape" ? saved : "auto";
  const answer = globalThis.prompt(
    "Choose print layout: auto, portrait, or landscape",
    suggestion
  );

  if (answer === null) return null;

  const normalized = String(answer || "").trim().toLowerCase();
  let layout = "auto";
  if (normalized === "portrait" || normalized === "p") {
    layout = "portrait";
  } else if (normalized === "landscape" || normalized === "l") {
    layout = "landscape";
  }

  sessionStorage.setItem(PRINT_LAYOUT_KEY, layout);
  return layout;
}

function attachBrandLogo() {
  const brandEl = document.querySelector(".brand");
  if (!brandEl || brandEl.querySelector(".brand-logo-wrap")) return;

  const text = brandEl.textContent?.trim() || "Warehouse Portal";
  brandEl.textContent = "";

  const logoWrap = document.createElement("span");
  logoWrap.className = "brand-logo-wrap";

  const logoConfig = getBrandLogoConfig();
  const logo = document.createElement("img");
  logo.className = "brand-logo";
  logo.src = logoConfig.src;
  logo.alt = logoConfig.alt;
  logo.addEventListener("error", () => {
    logo.src = "assets/img/site-logo.png";
    logo.alt = "Warehouse Portal Logo";
  });
  logoWrap.appendChild(logo);

  const textEl = document.createElement("span");
  textEl.className = "brand-text";
  textEl.textContent = text;

  brandEl.appendChild(logoWrap);
  brandEl.appendChild(textEl);
}

function initDateControl(onDateChange) {
  const dateInput = document.getElementById("workingDate");
  initShiftControl(onDateChange);
  if (!dateInput) return;
  dateInput.value = selectedDate();
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    setSelectedDateValue(dateInput.value);
    if (typeof onDateChange === "function") {
      onDateChange();
    }
  });
}

function printSection(sectionId, title) {
  const source = document.getElementById(sectionId);
  if (!source) return;

  const layoutChoice = choosePrintLayout();
  if (!layoutChoice) return;

  const styleHref = document.querySelector('link[href*="assets/css/style.css"]')?.href || "assets/css/style.css?v=20260317a";
  const printWin = globalThis.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

  const logoConfig = getBrandLogoConfig();
  const logoHref = new URL(logoConfig.src, globalThis.location.href).href;
  const shiftLabel = usesShiftStorage() ? selectedShiftLabel() : "Standard Shift";

  const doc = printWin.document;
  doc.documentElement.lang = "en";
  doc.title = title;
  doc.head.innerHTML = "";
  doc.body.innerHTML = "";

  const charsetMeta = doc.createElement("meta");
  charsetMeta.setAttribute("charset", "UTF-8");
  doc.head.appendChild(charsetMeta);

  const viewportMeta = doc.createElement("meta");
  viewportMeta.name = "viewport";
  viewportMeta.content = "width=device-width, initial-scale=1.0";
  doc.head.appendChild(viewportMeta);

  const titleEl = doc.createElement("title");
  titleEl.textContent = title;
  doc.head.appendChild(titleEl);

  const linkEl = doc.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href = styleHref;
  doc.head.appendChild(linkEl);

  const styleEl = doc.createElement("style");
  styleEl.textContent = `
    @page {
      size: ${layoutChoice === "portrait" || layoutChoice === "landscape" ? `A4 ${layoutChoice}` : "auto"};
    }
    body { background: #fff; }
    .print-export-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin: 12px 0 16px;
      padding: 0 0 14px;
      border-bottom: 2px solid #dbeafe;
    }
    .print-export-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .print-export-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .print-export-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .print-export-subtitle {
      margin: 4px 0 0;
      color: #475569;
      font-size: 13px;
    }
    .print-export-meta {
      display: grid;
      gap: 4px;
      text-align: right;
      color: #0f172a;
      font-size: 13px;
    }
    .print-export-meta strong {
      color: #0f172a;
    }
    @media print {
      .print-export-header {
        break-inside: avoid;
      }
    }
  `;
  doc.head.appendChild(styleEl);

  const layout = doc.createElement("div");
  layout.className = "layout";

  const header = doc.createElement("div");
  header.className = "print-export-header";

  const brand = doc.createElement("div");
  brand.className = "print-export-brand";

  const logo = doc.createElement("img");
  logo.className = "print-export-logo";
  logo.src = logoHref;
  logo.alt = logoConfig.alt;
  brand.appendChild(logo);

  const titleWrap = doc.createElement("div");

  const titleNode = doc.createElement("h1");
  titleNode.className = "print-export-title";
  titleNode.textContent = title;
  titleWrap.appendChild(titleNode);

  const subtitleNode = doc.createElement("p");
  subtitleNode.className = "print-export-subtitle";
  subtitleNode.textContent = `${getSectorDisplayName()} Sector`;
  titleWrap.appendChild(subtitleNode);
  brand.appendChild(titleWrap);

  const meta = doc.createElement("div");
  meta.className = "print-export-meta";

  const dateRow = doc.createElement("div");
  dateRow.innerHTML = `<strong>Date:</strong> ${selectedDate()}`;
  meta.appendChild(dateRow);

  const shiftRow = doc.createElement("div");
  shiftRow.innerHTML = `<strong>Shift:</strong> ${shiftLabel}`;
  meta.appendChild(shiftRow);

  const layoutRow = doc.createElement("div");
  layoutRow.innerHTML = `<strong>Layout:</strong> ${layoutChoice[0].toUpperCase()}${layoutChoice.slice(1)}`;
  meta.appendChild(layoutRow);

  const sectorRow = doc.createElement("div");
  sectorRow.innerHTML = `<strong>Sector:</strong> ${getSectorDisplayName()}`;
  meta.appendChild(sectorRow);

  header.appendChild(brand);
  header.appendChild(meta);

  const card = doc.createElement("div");
  card.className = "card";
  card.innerHTML = source.innerHTML;

  layout.appendChild(header);
  layout.appendChild(card);
  doc.body.appendChild(layout);

  const runPrint = () => {
    globalThis.setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 250);
  };

  if (logo.complete) {
    runPrint();
  } else {
    logo.addEventListener("load", runPrint, { once: true });
    logo.addEventListener("error", runPrint, { once: true });
  }
}

async function initProtectedPage() {
  const user = await requireAuth();
  attachBrandLogo();
  setUserLabel(user);
  setSectorLabel();
  initShiftControl();
  setActiveNav();
  initSidebar();
}

function mapAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/operation-not-allowed") return "Login portal has been removed.";
  if (code === "auth/invalid-email") return "Invalid email format.";
  if (code === "auth/user-not-found") return "No account found for this email.";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Wrong email or password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  return error?.message || "Login failed.";
}

function initLoginPage() {
  globalThis.location.href = "sector-select.html";
}

async function initSectorPage() {
  await requireAuth();
  attachBrandLogo();

  const current = sessionStorage.getItem("warehouseSector") || localStorage.getItem("warehouseSector");
  if (current) {
    const activeCard = document.querySelector(`[data-sector="${current}"]`);
    if (activeCard) {
      activeCard.classList.add("sector-active");
      const badge = activeCard.querySelector(".sector-active-badge");
      if (badge) badge.hidden = false;
    }
  }

  const buttons = document.querySelectorAll("[data-sector]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setSector(button.dataset.sector);
      setSelectedDateValue(todayISO());
      setSelectedShiftValue("day");
      globalThis.location.href = "dashboard.html";
    });
  });
}
