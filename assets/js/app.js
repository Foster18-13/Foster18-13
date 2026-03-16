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
    src: "assets/img/hh-logo.png",
    alt: "Warehouse Portal Logo"
  };
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
    logo.src = "assets/img/hh-logo.png";
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

  const styleHref = "assets/css/style.css?v=20260316q";
  const printWin = globalThis.open("", "_blank", "width=1200,height=900");
  if (!printWin) return;

  const shiftSegment = usesShiftStorage() ? ` | Shift: ${selectedShiftLabel()}` : "";
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="stylesheet" href="${styleHref}" />
        <style>
          body { background: #fff; }
          .print-header { margin: 12px 0 10px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="layout">
          <div class="print-header">${title} | Date: ${selectedDate()} | Sector: ${getSector()}${shiftSegment}</div>
          <div class="card">${source.innerHTML}</div>
        </div>
      </body>
    </html>
  `);
  printWin.document.close();
  printWin.focus();
  printWin.print();
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
