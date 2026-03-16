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

function setActiveNav() {
  const current = (globalThis.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  document.querySelectorAll(".sidebar a[data-page]").forEach((link) => {
    if (link.dataset.page === current) {
      link.classList.add("active");
    }
  });
}

function initDateControl(onDateChange) {
  const dateInput = document.getElementById("workingDate");
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

async function initProtectedPage() {
  const user = await requireAuth();
  setUserLabel(user);
  setSectorLabel();
  setActiveNav();
  initSidebar();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logoutUser();
    });
  }
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
  const buttons = document.querySelectorAll("[data-sector]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setSector(button.dataset.sector);
      setSelectedDateValue(todayISO());
      globalThis.location.href = "dashboard.html";
    });
  });
}
