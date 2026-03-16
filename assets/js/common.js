function markActiveNav() {
  const current = location.pathname.split("/").pop() || "home.html";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    const target = link.getAttribute("href");
    if (target === current) {
      link.classList.add("active");
    }
  });
}

function getCurrentPageName() {
  return location.pathname.split("/").pop() || "index.html";
}

function isHomePage(pageName) {
  return pageName === "home.html" || pageName === "index.html";
}

const PAGE_MIN_ROLE = {
  "home.html": "clerk",
  "index.html": "clerk",
  "dashboard.html": "clerk",
  "balance.html": "clerk",
  "returns.html": "clerk",
  "summary.html": "clerk",
  "purchase.html": "clerk",
  "customers.html": "clerk",
  "product-dispatch.html": "clerk",
  "customer-history.html": "clerk",
  "damages.html": "clerk",
  "product-movement.html": "clerk",
  "reports.html": "clerk",
  "notebook.html": "clerk",
  "saved-sheets.html": "clerk",
  "products.html": "supervisor",
  "vehicles.html": "supervisor",
  "account.html": "supervisor",
  "add-product.html": "supervisor",
  "access.html": "admin",
  "login.html": "clerk",
  "register.html": "clerk"
};

function getMinimumRoleForPage(pageName) {
  const normalized = String(pageName || "").toLowerCase().trim();
  return PAGE_MIN_ROLE[normalized] || "clerk";
}

function currentUserRole() {
  if (typeof getCurrentUserRole === "function") {
    return getCurrentUserRole();
  }
  return "clerk";
}

function currentUserCanMakeEntries() {
  if (typeof getCurrentUserCanMakeEntries === "function") {
    return !!getCurrentUserCanMakeEntries();
  }
  return true;
}

const CLERK_ENTRY_AUTO_LOCK_DAYS = 2;
const ENTRY_OPEN_FROM_DATE = "2026-03-01";

function isAdminRole(role) {
  if (typeof hasRoleAccess === "function") {
    return hasRoleAccess(role, "admin");
  }
  return String(role || "").toLowerCase() === "admin";
}

function getRecordAgeInDays(dateString) {
  const selected = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today.getTime() - selectedDay.getTime()) / millisPerDay);
}

function isClerkEntryDateAutoLocked(dateString = getSelectedDate(), role = currentUserRole()) {
  if (isAdminRole(role)) return false;
  const ageInDays = getRecordAgeInDays(dateString);
  return ageInDays >= CLERK_ENTRY_AUTO_LOCK_DAYS;
}

function ensureEntryPermission(actionLabel = "perform this action") {
  const selectedDate = typeof getSelectedDate === "function" ? getSelectedDate() : "";
  const openFromDate = ENTRY_OPEN_FROM_DATE;

  if (selectedDate && openFromDate && selectedDate < openFromDate) {
    const readable = new Date(`${openFromDate}T00:00:00`).toLocaleDateString();
    setStatus(`Dates before ${readable} are locked.`, "error");
    return false;
  }

  if (!currentUserCanMakeEntries()) {
    setStatus(`You are not allowed to ${actionLabel}. Contact an admin to enable entry permission.`, "error");
    return false;
  }

  if (isClerkEntryDateAutoLocked()) {
    setStatus(`Entries older than ${CLERK_ENTRY_AUTO_LOCK_DAYS} days are locked. Only admin can ${actionLabel}.`, "error");
    return false;
  }

  return true;
}

function roleAllowsPage(role, pageName) {
  const minRole = getMinimumRoleForPage(pageName);
  if (typeof hasRoleAccess === "function") {
    return hasRoleAccess(role, minRole);
  }
  return true;
}

function applyRoleNavAccess(role) {
  const showSettingsLink = isHomePage(getCurrentPageName());

  document.querySelectorAll(".main-nav a").forEach((link) => {
    const target = String(link.getAttribute("href") || "").split("?")[0];
    if (target === "settings.html" && !showSettingsLink) {
      link.style.display = "none";
      link.setAttribute("aria-disabled", "true");
      return;
    }

    const allowed = roleAllowsPage(role, target);

    if (allowed) {
      link.style.display = "";
      link.removeAttribute("aria-disabled");
      return;
    }

    link.style.display = "none";
    link.setAttribute("aria-disabled", "true");
  });

  document.querySelectorAll('[data-min-role]').forEach((element) => {
    const minRole = element.dataset.minRole || 'clerk';
    const allowed = typeof hasRoleAccess === 'function' ? hasRoleAccess(role, minRole) : true;
    if (allowed) {
      element.style.display = "";
      element.removeAttribute("aria-disabled");
    } else {
      element.style.display = "none";
      element.setAttribute("aria-disabled", "true");
    }
  });
}

function setHomeLoginStatus(message, type = "") {
  const element = document.getElementById("loginGateStatus");
  if (!element) return;
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function toggleProtectedAccessLinks(locked) {
  document.querySelectorAll('[data-requires-auth="true"]').forEach((link) => {
    if (locked) {
      link.classList.add("auth-locked");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
    } else {
      link.classList.remove("auth-locked");
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
    }
  });
}

function initAuthAccessGuard() {
  const currentPage = getCurrentPageName();
  const onHome = isHomePage(currentPage);
  const firebaseReady = !!globalThis.firebase?.initializeApp;
  const firebaseConfig = globalThis.FIREBASE_CONFIG;
  const hasConfig = !!(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId && firebaseConfig?.appId);

  if (!firebaseReady || !hasConfig) {
    if (onHome) {
      toggleProtectedAccessLinks(true);
      setHomeLoginStatus("Login is required before accessing the portal.", "error");
    }
    return;
  }

  if (!globalThis.firebase.apps.length) {
    globalThis.firebase.initializeApp(firebaseConfig);
  }

  const auth = globalThis.firebase.auth();
  auth.onAuthStateChanged((user) => {
    const pageMinRole = getMinimumRoleForPage(currentPage);

    if (user) {
      Promise.resolve(
        typeof globalThis.resolveUserRole === "function"
          ? globalThis.resolveUserRole(user)
          : currentUserRole()
      ).then((resolvedRole) => {
        const role = String(resolvedRole || currentUserRole());
        applyRoleNavAccess(role);

        if (!roleAllowsPage(role, currentPage)) {
          location.replace(`home.html?unauthorized=1&requiredRole=${encodeURIComponent(pageMinRole)}`);
          return;
        }

        if (onHome) {
          toggleProtectedAccessLinks(false);
          const label = user.email || user.displayName || "Signed in";
          setHomeLoginStatus(`Access granted: ${label} (${role})`, "ok");

          const params = new URLSearchParams(location.search);
          const nextPage = params.get("next");
          const isNextAllowed = !nextPage || roleAllowsPage(role, nextPage);
          if (nextPage && nextPage !== "home.html" && nextPage !== "index.html") {
            if (!isNextAllowed) {
              setHomeLoginStatus("Signed in, but your role cannot access that page.", "error");
              return;
            }
            location.replace(nextPage);
          }

          const unauthorized = params.get("unauthorized");
          if (unauthorized === "1") {
            setHomeLoginStatus("Your role does not permit access to that page.", "error");
          }
        }
      });
      return;
    }

    if (!onHome) {
      const target = encodeURIComponent(currentPage || "home.html");
      location.replace(`home.html?authRequired=1&next=${target}`);
      return;
    }

    toggleProtectedAccessLinks(true);
    setHomeLoginStatus("Please sign in first to access the website.", "error");
  });
}

function initSharedHeader() {
  markActiveNav();
  applyRoleNavAccess(currentUserRole());

  enforceSectorShiftRules();
  initSectorHeaderBadge();
  initCurrentContextBadge();
  initSectorSwitcher();

  // Set print date
  const printDateElement = document.getElementById("printDate");
  if (printDateElement) {
    const date = getSelectedDate();
    const formatted = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
    printDateElement.textContent = formatted;
  }

  let dateInput = document.getElementById("workingDate");
  if (!dateInput) {
    const controls = document.querySelector(".topbar-controls");
    if (controls) {
      const dateLabel = document.createElement("label");
      dateLabel.setAttribute("for", "workingDate");
      dateLabel.textContent = "Working Date";

      dateInput = document.createElement("input");
      dateInput.className = "input";
      dateInput.type = "date";
      dateInput.id = "workingDate";

      const searchInput = controls.querySelector("#globalSearchInput");
      if (searchInput) {
        searchInput.before(dateLabel);
        dateLabel.after(dateInput);
      } else {
        controls.appendChild(dateLabel);
        controls.appendChild(dateInput);
      }

      initSectorHeaderBadge();
      initCurrentContextBadge();
      initSectorSwitcher();
    }
  }

  if (!dateInput) return;

  dateInput.min = ENTRY_OPEN_FROM_DATE;
  dateInput.value = getSelectedDate();
  if (dateInput.value < ENTRY_OPEN_FROM_DATE) {
    dateInput.value = ENTRY_OPEN_FROM_DATE;
    setSelectedDate(ENTRY_OPEN_FROM_DATE);
  }
  initDateQuickNavigation();
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    if (dateInput.value < ENTRY_OPEN_FROM_DATE) {
      dateInput.value = ENTRY_OPEN_FROM_DATE;
    }
    setSelectedDate(dateInput.value);
    updateCurrentContextBadge();
  });

  const todayButton = document.getElementById("jumpToday");
  if (todayButton) {
    todayButton.addEventListener("click", () => {
      const date = todayISO();
      setSelectedDate(date);
      dateInput.value = date;
      updateCurrentContextBadge();
    });
  }

  initDayLockControls();
  initGlobalSearch();
}

function initSectorHeaderBadge() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  const sectors = Array.isArray(globalThis.WAREHOUSE_SECTORS) && globalThis.WAREHOUSE_SECTORS.length
    ? globalThis.WAREHOUSE_SECTORS
    : [
      { id: "water", label: "Water & Beverages" },
      { id: "hh", label: "H&H Products" },
      { id: "mcberry", label: "Mcberry Products" }
    ];

  const sectorImages = {
    water: "assets/images/sector-water.png",
    hh: "assets/images/sector-hh.png",
    mcberry: "assets/images/sector-mcberry.png"
  };

  const currentSector = typeof getCurrentWorkSector === "function" ? getCurrentWorkSector() : "water";
  const sectorMeta = sectors.find((sector) => sector.id === currentSector) || { id: currentSector, label: currentSector };
  const logoSrc = sectorImages[sectorMeta.id] || "assets/images/logo.png";

  let badge = document.getElementById("activeSectorBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "activeSectorBadge";
    badge.className = "sector-header-badge";
    badge.innerHTML = `
      <img class="sector-header-logo" alt="Active sector logo" />
      <span class="sector-header-label"></span>
    `;

    const dateLabel = controls.querySelector('label[for="workingDate"]');
    if (dateLabel) {
      dateLabel.before(badge);
    } else {
      controls.prepend(badge);
    }
  }

  const logo = badge.querySelector(".sector-header-logo");
  const label = badge.querySelector(".sector-header-label");
  if (logo) logo.src = logoSrc;
  if (label) label.textContent = sectorMeta.label || currentSector;
}

function formatWorkingDateLabel(dateValue) {
  const iso = String(dateValue || "").trim();
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso || "N/A";
  return parsed.toLocaleDateString("en-GB");
}

function formatShiftLabel(shiftValue) {
  const normalized = String(shiftValue || "").trim().toLowerCase();
  if (normalized === "night") return "Night";
  return "Day";
}

function getCurrentShiftForBadge() {
  const shiftSelector = document.querySelector('#shiftSelector, select[id*="shiftSelector"]');
  if (shiftSelector?.value) {
    return formatShiftLabel(shiftSelector.value);
  }

  if (typeof getSelectedShift === "function") {
    return formatShiftLabel(getSelectedShift());
  }

  return "Day";
}

function updateCurrentContextBadge() {
  const badge = document.getElementById("currentContextBadge");
  if (!badge) return;

  const dateLabel = formatWorkingDateLabel(typeof getSelectedDate === "function" ? getSelectedDate() : "");
  const shiftLabel = getCurrentShiftForBadge();
  badge.textContent = `Current Date: ${dateLabel} | Current Shift: ${shiftLabel}`;
}

function initCurrentContextBadge() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  let badge = document.getElementById("currentContextBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "currentContextBadge";
    badge.className = "current-context-badge";

    const dateLabel = controls.querySelector('label[for="workingDate"]');
    if (dateLabel) {
      dateLabel.before(badge);
    } else {
      controls.prepend(badge);
    }
  }

  updateCurrentContextBadge();

  const dateInput = document.getElementById("workingDate");
  if (dateInput) {
    dateInput.addEventListener("change", updateCurrentContextBadge);
  }

  document.querySelectorAll('#shiftSelector, select[id*="shiftSelector"]').forEach((selector) => {
    selector.addEventListener("change", () => {
      updateCurrentContextBadge();
    });
  });
}

function initSectorSwitcher() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  if (document.getElementById("sectorSwitcher")) return;

  const sectors = Array.isArray(globalThis.WAREHOUSE_SECTORS) && globalThis.WAREHOUSE_SECTORS.length
    ? globalThis.WAREHOUSE_SECTORS
    : [
      { id: "water", label: "Water & Beverages" },
      { id: "hh", label: "H&H Products" },
      { id: "mcberry", label: "Mcberry Products" }
    ];

  if (!sectors.length) return;

  const currentSector = typeof getCurrentWorkSector === "function" ? getCurrentWorkSector() : "water";

  const label = document.createElement("label");
  label.setAttribute("for", "sectorSwitcher");
  label.textContent = "Sector";

  const select = document.createElement("select");
  select.id = "sectorSwitcher";
  select.className = "select";
  select.style.minWidth = "180px";

  select.innerHTML = sectors
    .map((sector) => `<option value="${sector.id}">${sector.label || sector.id}</option>`)
    .join("");
  select.value = currentSector;

  const dateLabel = controls.querySelector('label[for="workingDate"]');
  if (dateLabel) {
    dateLabel.before(label);
    label.after(select);
  } else {
    controls.prepend(select);
    controls.prepend(label);
  }

  select.addEventListener("change", () => {
    const nextSector = String(select.value || "").trim().toLowerCase();
    if (!nextSector || nextSector === currentSector) return;

    if (typeof setCurrentWorkSector === "function") {
      setCurrentWorkSector(nextSector);
    }
    if (typeof clearSectorSelectionPending === "function") {
      clearSectorSelectionPending();
    }

    if (typeof setStatus === "function") {
      setStatus("Sector changed. Reloading...", "ok");
    }

    globalThis.setTimeout(() => {
      location.reload();
    }, 120);
  });
}

function enforceSectorShiftRules() {
  const currentSector = typeof getCurrentWorkSector === "function" ? getCurrentWorkSector() : "water";
  if (currentSector !== "hh" && currentSector !== "mcberry") return;

  if (typeof setSelectedShift === "function") {
    setSelectedShift("day");
  }

  document.querySelectorAll('#shiftSelector, select[id*="shiftSelector"]').forEach((selector) => {
    const nightOption = selector.querySelector('option[value="night"]');
    if (nightOption) {
      nightOption.disabled = true;
      nightOption.hidden = true;
    }
    selector.value = "day";
  });

  document.querySelectorAll('[data-shift-key="night"], [data-shift="night"], .shift-card.night').forEach((element) => {
    element.style.display = "none";
  });
}

globalThis.ensureEntryPermission = ensureEntryPermission;

function shiftWorkingDate(days) {
  const current = getSelectedDate() || todayISO();
  const base = new Date(`${current}T00:00:00`);
  if (Number.isNaN(base.getTime())) return;

  base.setDate(base.getDate() + days);
  const nextDate = formatDateToLocalISO(base);
  if (!nextDate) return;
  setSelectedDate(nextDate);
  location.reload();
}

function initDateQuickNavigation() {
  // Date quick-jump controls were removed to keep date selection deliberate
  // through the date picker only.
}

function getCurrentDayLockedState() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  return !!dayStore.locked;
}

function getCurrentDayLockDetails() {
  const data = loadData();
  const date = getSelectedDate();
  return getShiftStore(data, date);
}

function formatApprovalTimestamp(timestamp) {
  const value = asNumber(timestamp);
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function getCurrentOperatorLabel() {
  try {
    const firebaseUser = globalThis.firebase?.auth?.()?.currentUser;
    if (firebaseUser) {
      return firebaseUser.displayName || firebaseUser.email || "Unknown user";
    }
  } catch {
    // ignore and use fallback
  }
  return "Unknown user";
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
}

function countRecordingEntries(shiftStore) {
  if (!shiftStore?.recording || typeof shiftStore.recording !== "object") return 0;

  return Object.values(shiftStore.recording).reduce((count, row) => {
    const entries = Array.isArray(row?.entries) ? row.entries : [];
    const filled = entries.filter((entry) => hasValue(entry?.qty) || hasValue(entry?.waybill)).length;
    return count + filled;
  }, 0);
}

function countBalanceEntries(shiftStore) {
  if (!shiftStore?.balance || typeof shiftStore.balance !== "object") return 0;

  return Object.values(shiftStore.balance).reduce((count, item) => {
    if (!item || typeof item !== "object") return count;
    const keys = [
      "opening",
      "goodsReceived",
      "goodsReturn",
      "goodsDamaged",
      "goodsIssued",
      "loaded",
      "returns",
      "closing",
      "outstanding"
    ];
    const hasAny = keys.some((key) => hasValue(item[key]));
    return hasAny ? count + 1 : count;
  }, 0);
}

function evaluateDailyClosingChecklist(shiftStore) {
  const recordingCount = countRecordingEntries(shiftStore);
  const balanceCount = countBalanceEntries(shiftStore);
  const purchaseCount = Array.isArray(shiftStore?.purchases) ? shiftStore.purchases.length : 0;

  const missingItems = [];
  if (purchaseCount === 0) {
    missingItems.push("Add at least one purchase entry.");
  }
  if (recordingCount === 0) {
    missingItems.push("Capture at least one recording entry.");
  }
  if (balanceCount === 0) {
    missingItems.push("Fill at least one balance row.");
  }

  return {
    passed: missingItems.length === 0,
    missingItems,
    recordingCount,
    balanceCount,
    purchaseCount
  };
}

function updateChecklistSnapshot(dayStore, checklistResult, operator) {
  dayStore.closingChecklist = dayStore.closingChecklist && typeof dayStore.closingChecklist === "object"
    ? dayStore.closingChecklist
    : {
      lastRunAt: 0,
      lastRunBy: "",
      lastPassedAt: 0,
      lastPassedBy: "",
      lastIssues: []
    };

  dayStore.closingChecklist.lastRunAt = Date.now();
  dayStore.closingChecklist.lastRunBy = operator;
  dayStore.closingChecklist.lastIssues = checklistResult.missingItems.slice(0, 10);

  if (checklistResult.passed) {
    dayStore.closingChecklist.lastPassedAt = dayStore.closingChecklist.lastRunAt;
    dayStore.closingChecklist.lastPassedBy = operator;
  }
}

function renderDayLockApprovalInfo(approvalInfo, details, locked) {
  if (!approvalInfo) return;

  if (locked && details.lockedBy && details.lockedAt) {
    approvalInfo.textContent = `Approved by ${details.lockedBy} on ${formatApprovalTimestamp(details.lockedAt)}`;
    approvalInfo.className = "status";
    return;
  }

  approvalInfo.textContent = "";
  approvalInfo.className = "status";
}

function renderChecklistInfo(checklistState, checklistMeta, checklistResult, details) {
  if (checklistState) {
    checklistState.textContent = checklistResult.passed ? "Checklist: ready" : "Checklist: incomplete";
    checklistState.className = `status ${checklistResult.passed ? "ok" : "error"}`;
  }

  if (!checklistMeta) return;

  const snapshot = details.closingChecklist || {};
  if (snapshot.lastRunAt) {
    const who = snapshot.lastRunBy ? ` by ${snapshot.lastRunBy}` : "";
    checklistMeta.textContent = `Last run${who} on ${formatApprovalTimestamp(snapshot.lastRunAt)}`;
  } else {
    checklistMeta.textContent = "";
  }
  checklistMeta.className = "status";
}

function isAllowWhenLocked(element) {
  if (!element) return false;
  if (element.matches('[data-allow-locked="true"]')) return true;

  const id = element.id || "";
  if (id.startsWith("export")) return true;
  if (id === "refreshSummary") return true;

  return false;
}

function applyDayLockState(locked) {
  const container = document.querySelector("main");
  if (!container) return;

  container.querySelectorAll("input, select, textarea, button").forEach((element) => {
    if (isAllowWhenLocked(element)) {
      element.disabled = false;
      return;
    }

    const isReadonlyInput = element.matches('input[readonly], textarea[readonly]');
    if (isReadonlyInput) return;

    element.disabled = locked;
  });
}

function renderDayLockControls() {
  const toggleButton = document.getElementById("dayLockToggle");
  const lockState = document.getElementById("dayLockState");
  const approvalInfo = document.getElementById("dayLockApproval");
  const checklistState = document.getElementById("dayChecklistState");
  const checklistMeta = document.getElementById("dayChecklistMeta");
  if (!toggleButton || !lockState) return;

  const details = getCurrentDayLockDetails();
  const locked = !!details.locked;
  const autoLocked = isClerkEntryDateAutoLocked();
  const effectiveLocked = locked || autoLocked;
  const checklistResult = evaluateDailyClosingChecklist(details);
  toggleButton.textContent = locked ? "Unlock Day" : "Lock Day";
  toggleButton.disabled = autoLocked;

  if (autoLocked) {
    lockState.textContent = `Auto-locked (older than ${CLERK_ENTRY_AUTO_LOCK_DAYS} days)`;
    lockState.className = "status error";
  } else {
    lockState.textContent = locked ? "Day locked" : "Day open";
    lockState.className = `status ${locked ? "error" : "ok"}`;
  }

  renderDayLockApprovalInfo(approvalInfo, details, locked);
  renderChecklistInfo(checklistState, checklistMeta, checklistResult, details);

  applyDayLockState(effectiveLocked);
}

function initDayLockControls() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  if (!document.getElementById("dayLockArea")) {
    const wrapper = document.createElement("div");
    wrapper.id = "dayLockArea";
    wrapper.className = "day-lock-area";
    wrapper.innerHTML = `
      <button class="button" id="dayLockToggle" type="button">Lock Day</button>
      <span class="status" id="dayLockState"></span>
      <span class="status" id="dayLockApproval"></span>
    `;
    controls.appendChild(wrapper);
  }

  const toggleButton = document.getElementById("dayLockToggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const data = loadData();
      const date = getSelectedDate();
      const dayStore = getShiftStore(data, date);

      if (dayStore.locked) {
        dayStore.locked = false;
      } else {
        const operator = getCurrentOperatorLabel();
        const checklistResult = evaluateDailyClosingChecklist(dayStore);
        updateChecklistSnapshot(dayStore, checklistResult, operator);

        if (!checklistResult.passed) {
          saveData(data);
          renderDayLockControls();
          setStatus(`Cannot lock day: ${checklistResult.missingItems.join(" ")}`, "error");
          return;
        }

        const approverInput = prompt("Enter supervisor approval name:");
        const approver = String(approverInput || "").trim();
        if (!approver) {
          setStatus("Lock cancelled: supervisor name is required.", "error");
          return;
        }

        dayStore.locked = true;
        dayStore.lockedBy = approver;
        dayStore.lockedAt = Date.now();
      }

      saveData(data);
      renderDayLockControls();
      setStatus(dayStore.locked ? "Day locked with supervisor approval." : "Day unlocked. Editing is enabled.", dayStore.locked ? "error" : "ok");
    });
  }

  renderDayLockControls();

  globalThis.setTimeout(() => {
    renderDayLockControls();
  }, 300);
}

function setStatus(message, type = "") {
  const element = document.getElementById("status");
  if (!element) return;
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function getOrCreateGlobalLoadingOverlay() {
  let overlay = document.getElementById("globalLoadingOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "globalLoadingOverlay";
  overlay.className = "global-loading-overlay";
  overlay.innerHTML = `
    <div class="global-loading-box" role="status" aria-live="polite" aria-busy="true">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span id="globalLoadingMessage">Processing...</span>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function showGlobalLoading(message = "Processing...") {
  const overlay = getOrCreateGlobalLoadingOverlay();
  const messageNode = document.getElementById("globalLoadingMessage");
  if (messageNode) messageNode.textContent = message;
  overlay.classList.add("active");
}

function hideGlobalLoading() {
  const overlay = document.getElementById("globalLoadingOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
}

async function withLoadingFeedback(triggerElement, loadingText, task, options = {}) {
  const showOverlay = !!options.overlay;
  const buttonLike = triggerElement && typeof triggerElement === "object" ? triggerElement : null;
  const originalText = buttonLike ? buttonLike.textContent : "";

  try {
    if (buttonLike) {
      buttonLike.disabled = true;
      buttonLike.classList.add("button-loading");
      if (loadingText) {
        buttonLike.textContent = loadingText;
      }
    }
    if (showOverlay) {
      showGlobalLoading(loadingText || "Processing...");
    }

    return await Promise.resolve(task());
  } finally {
    if (showOverlay) {
      hideGlobalLoading();
    }
    if (buttonLike) {
      buttonLike.disabled = false;
      buttonLike.classList.remove("button-loading");
      buttonLike.textContent = originalText;
    }
  }
}

function createProductOptions(products, selected = "") {
  const options = [`<option value="">Select product</option>`];
  
  // Sort products alphabetically by name
  const sortedProducts = [...products].sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  
  sortedProducts.forEach((product) => {
    const isSelected = selected === product.id ? "selected" : "";
    options.push(`<option value="${product.id}" ${isSelected}>${product.name}</option>`);
  });
  return options.join("");
}

function csvEscape(value) {
  const text = String(value ?? "");
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCellValue(cell) {
  const fields = cell.querySelectorAll("input, textarea, select");
  if (!fields.length) return cell.textContent.trim();
  return Array.from(fields)
    .map((field) => field.value)
    .join(" | ");
}

function makeCsvFromTable(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return "";

  const rows = table.querySelectorAll("tr");
  const lines = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    if (!cells.length) return;

    const values = Array.from(cells).map((cell) => {
      const value = getCellValue(cell);
      return csvEscape(value);
    });

    lines.push(values.join(","));
  });

  return lines.join("\n");
}

function downloadCsv(content, fileName) {
  if (!content) return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportTableAsCsv(tableId, filePrefix) {
  const date = getSelectedDate();
  const csv = makeCsvFromTable(tableId);
  if (!csv) {
    setStatus("Nothing to export.", "error");
    return;
  }

  downloadCsv(csv, `${filePrefix}_${date}.csv`);
  setStatus("CSV exported successfully.", "ok");
}

function buildPrintableTableHtml(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return "";

  const headerCells = Array.from(table.querySelectorAll("thead th"));
  const headers = headerCells.map((cell) => `<th>${htmlEscape(cell.textContent.trim())}</th>`).join("");

  const bodyRows = Array.from(table.querySelectorAll("tbody tr"))
    .filter((row) => row.style.display !== "none")
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const dataCells = cells.map((cell) => `<td>${htmlEscape(getCellValue(cell))}</td>`).join("");
      return `<tr>${dataCells}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function getTableDataForExport(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return { headers: [], rows: [] };

  const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent.trim());
  const rows = Array.from(table.querySelectorAll("tbody tr"))
    .filter((row) => row.style.display !== "none")
    .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => getCellValue(cell)));

  return { headers, rows };
}

function getCurrentSectorMeta() {
  const sectors = Array.isArray(globalThis.WAREHOUSE_SECTORS) && globalThis.WAREHOUSE_SECTORS.length
    ? globalThis.WAREHOUSE_SECTORS
    : [
      { id: "water", label: "Water & Beverages" },
      { id: "hh", label: "H&H Products" },
      { id: "mcberry", label: "Mcberry Products" }
    ];

  const sectorImages = {
    water: "assets/images/sector-water.png",
    hh: "assets/images/sector-hh.png",
    mcberry: "assets/images/sector-mcberry.png"
  };

  const currentSector = typeof getCurrentWorkSector === "function" ? getCurrentWorkSector() : "water";
  const sectorMeta = sectors.find((sector) => sector.id === currentSector) || { id: currentSector, label: currentSector };
  const logoSrc = sectorImages[sectorMeta.id] || "assets/images/logo.png";

  return {
    id: sectorMeta.id,
    label: sectorMeta.label || currentSector,
    logoSrc
  };
}

function imageElementToDataUrl(imageElement) {
  if (!imageElement?.naturalWidth || !imageElement?.naturalHeight) {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(imageElement, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.debug("Unable to convert image to data URL for PDF export:", error);
    return null;
  }
}

function loadImageFromSource(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function resolveCurrentSectorLogoDataUrl(logoSrc) {
  const activeLogo = document.querySelector("#activeSectorBadge .sector-header-logo");
  const fromBadge = imageElementToDataUrl(activeLogo);
  if (fromBadge) {
    return fromBadge;
  }

  try {
    const loadedImage = await loadImageFromSource(logoSrc);
    return imageElementToDataUrl(loadedImage);
  } catch (error) {
    console.debug("Sector logo not available for PDF export:", error);
    return null;
  }
}

async function exportTableAsPdfFile(tableId, title, filePrefix) {
  const date = getSelectedDate();
  const shift = getSelectedShift();
  const shiftLabel = shift === "night" ? "Night" : "Day";
  const sectorMeta = getCurrentSectorMeta();
  const { headers, rows } = getTableDataForExport(tableId);
  if (!headers.length || !rows.length) {
    return false;
  }

  const jsPdfClass = globalThis.jspdf?.jsPDF;
  if (typeof jsPdfClass !== "function") {
    return false;
  }

  const doc = new jsPdfClass({ orientation: "portrait", unit: "pt", format: "a4" });
  const logoDataUrl = await resolveCurrentSectorLogoDataUrl(sectorMeta.logoSrc);

  doc.setFontSize(14);
  doc.text(title, 40, 34);
  doc.setFontSize(10);
  doc.text(`Sector: ${sectorMeta.label}`, 40, 50);
  doc.text(`Date: ${date} | Shift: ${shiftLabel}`, 40, 64);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 520, 18, 48, 48);
  }

  if (typeof doc.autoTable !== "function") {
    return false;
  }

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 82,
    margin: { top: 82, right: 20, bottom: 20, left: 20 },
    styles: { 
      fontSize: 9, 
      cellPadding: 5,
      minCellHeight: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    headStyles: { 
      fillColor: [18, 84, 161],
      textColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 6,
      minCellHeight: 10
    },
    bodyStyles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      minCellHeight: 8
    }
  });

  doc.save(`${filePrefix}_${date}_${shift}.pdf`);
  return true;
}

async function exportTableAsPdf(tableId, title, filePrefix) {
  const printableTable = buildPrintableTableHtml(tableId);
  if (!printableTable) {
    setStatus("Nothing to export.", "error");
    return;
  }

  const date = getSelectedDate();
  const shift = getSelectedShift();
  const shiftLabel = shift === "night" ? "Night" : "Day";
  const sectorMeta = getCurrentSectorMeta();
  const pdfDownloaded = await exportTableAsPdfFile(tableId, title, filePrefix);
  if (pdfDownloaded) {
    setStatus("PDF downloaded to your files.", "ok");
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    setStatus("Please allow popups to export PDF.", "error");
    return;
  }

  const doc = popup.document;
  doc.title = `${filePrefix}_${date}_${shift}`;

  const style = doc.createElement("style");
  style.textContent = `
    body { font-family: Arial, sans-serif; padding: 16px; color: #1f2a37; }
    .pdf-header { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 12px; }
    .pdf-header-text { min-width: 0; }
    .pdf-logo { width: 48px; height: 48px; object-fit: contain; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 14px; color: #4b5d73; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #c7d2e2; padding: 2px 4px; font-size: 11px; text-align: left; }
    th { background: #eef3fb; }
    @page { size: A4 portrait; margin: 12mm; }
  `;

  const heading = doc.createElement("h1");
  heading.textContent = title;

  const sectorLine = doc.createElement("p");
  sectorLine.textContent = `Sector: ${sectorMeta.label}`;

  const dateLine = doc.createElement("p");
  dateLine.textContent = `Date: ${date} | Shift: ${shiftLabel}`;

  const headerWrap = doc.createElement("div");
  headerWrap.className = "pdf-header";

  const headerTextWrap = doc.createElement("div");
  headerTextWrap.className = "pdf-header-text";
  headerTextWrap.appendChild(heading);
  headerTextWrap.appendChild(sectorLine);
  headerTextWrap.appendChild(dateLine);

  const logo = doc.createElement("img");
  logo.className = "pdf-logo";
  logo.alt = "Sector logo";
  logo.src = sectorMeta.logoSrc;

  headerWrap.appendChild(headerTextWrap);
  headerWrap.appendChild(logo);

  doc.head.innerHTML = "";
  doc.head.appendChild(style);
  doc.body.innerHTML = "";
  doc.body.appendChild(headerWrap);
  doc.body.insertAdjacentHTML("beforeend", printableTable);

  popup.focus();
  popup.setTimeout(() => {
    popup.print();
  }, 100);

  setStatus("Print dialog opened. Choose 'Save as PDF'.", "ok");
}

function runGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const rows = document.querySelectorAll("main table tbody tr");

  if (!rows.length) {
    setStatus("No searchable items found on this page.", "error");
    return;
  }

  let visibleCount = 0;
  rows.forEach((row) => {
    const rowText = row.textContent.toLowerCase();
    const isVisible = !query || rowText.includes(query);
    row.style.display = isVisible ? "" : "none";
    if (isVisible) visibleCount += 1;
  });

  setStatus(`Search complete: ${visibleCount} item(s) shown.`, "ok");
}

function initGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const searchButton = document.getElementById("globalSearchBtn");
  if (!searchInput || !searchButton) return;

  searchButton.addEventListener("click", runGlobalSearch);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runGlobalSearch();
    }
  });
}

function initSidebarToggle() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".sidebar");
  const header = document.querySelector(".site-header");
  const root = document.body;

  if (!sidebarToggle || !sidebar || !root) return;
  if (sidebar.dataset.sidebarBound === "1") return;

  let overlay = document.getElementById("sidebarOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    root.appendChild(overlay);
  }

  sidebar.dataset.sidebarBound = "1";
  if (!sidebar.id) {
    sidebar.id = "primarySidebar";
  }
  sidebarToggle.style.display = "flex";
  sidebarToggle.type = "button";
  sidebarToggle.setAttribute("aria-expanded", "false");
  sidebarToggle.setAttribute("aria-controls", sidebar.id);

  function syncPanelLayout() {
    const headerH = header ? Math.round(header.getBoundingClientRect().height) : 0;
    const topOffset = Math.max(headerH + 8, 56);
    root.style.setProperty("--sidebar-top", topOffset + "px");
    overlay.style.top = headerH + "px";
    overlay.style.height = "calc(100vh - " + headerH + "px)";
  }

  function openSidebar() {
    syncPanelLayout();
    root.classList.add("sidebar-open");
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    sidebarToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    root.classList.remove("sidebar-open");
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    sidebarToggle.setAttribute("aria-expanded", "false");
  }

  syncPanelLayout();
  closeSidebar();

  const toggleSidebar = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
  };

  sidebarToggle.addEventListener("click", toggleSidebar);
  sidebarToggle.addEventListener("pointerup", toggleSidebar);
  sidebarToggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      toggleSidebar(event);
    }
  });

  sidebar.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      closeSidebar();
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      event.preventDefault();
      location.href = href;
    });
  });

  overlay.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  globalThis.addEventListener("resize", () => {
    syncPanelLayout();
  });
}

function invokeIfFunction(functionName) {
  const candidate = globalThis[functionName];
  if (typeof candidate !== "function") return false;
  candidate();
  return true;
}

function refreshCurrentPageInPlace() {
  const currentPage = getCurrentPageName();

  if (currentPage === "summary.html") {
    invokeIfFunction("renderSummary");
    return true;
  }

  if (currentPage === "products.html") {
    invokeIfFunction("renderProducts");
    return true;
  }

  if (currentPage === "purchase.html") {
    invokeIfFunction("renderPurchaseProductOptions");
    invokeIfFunction("renderPurchaseTable");
    return true;
  }

  if (currentPage === "recording.html") {
    invokeIfFunction("renderRecordingTable");
    return true;
  }

  if (currentPage === "balance.html") {
    invokeIfFunction("renderBalanceTable");
    return true;
  }

  if (currentPage === "returns.html") {
    invokeIfFunction("renderReturnProductOptions");
    invokeIfFunction("renderReturnsTable");
    return true;
  }

  if (currentPage === "damages.html") {
    invokeIfFunction("renderDamageProductOptions");
    invokeIfFunction("renderDamagesTable");
    return true;
  }

  if (currentPage === "vehicles.html") {
    invokeIfFunction("renderVehiclesTable");
    return true;
  }

  if (currentPage === "customers.html") {
    invokeIfFunction("renderCustomerProductOptions");
    invokeIfFunction("renderCustomerNameSuggestions");
    invokeIfFunction("renderCustomersTable");
    return true;
  }

  if (currentPage === "dashboard.html") {
    invokeIfFunction("renderDashboard");
    return true;
  }

  if (currentPage === "reports.html") {
    invokeIfFunction("generateReport");
    return true;
  }

  if (currentPage === "period-reports.html") {
    invokeIfFunction("initializePage");
    return true;
  }

  if (currentPage === "product-movement.html") {
    invokeIfFunction("populateProductSelect");
    invokeIfFunction("viewProductMovement");
    return true;
  }

  if (currentPage === "customer-history.html") {
    invokeIfFunction("searchCustomerHistory");
    return true;
  }

  return false;
}

function initContextDrivenRefresh() {
  const subscribe = globalThis.onWarehouseContextChange;
  if (typeof subscribe !== "function") return;

  subscribe(() => {
    updateCurrentContextBadge();
    renderDayLockControls();

    const refreshedInPlace = refreshCurrentPageInPlace();
    if (!refreshedInPlace) {
      location.reload();
    }
  });
}

function initRealtimeInPlaceRefresh() {
  globalThis.addEventListener("warehouse:data-saved", (event) => {
    if (!event?.detail?.fromCloud) return;

    globalThis.setTimeout(() => {
      refreshCurrentPageInPlace();
      renderDayLockControls();
      setStatus("Live update received from cloud.", "ok");
    }, 50);
  });
}

function initCommon() {
  const safeInit = (fn, label) => {
    try {
      fn();
    } catch (error) {
      console.error(`Failed to initialize ${label}:`, error);
    }
  };

  // Keep navigation toggle responsive even if another initializer fails.
  safeInit(initSidebarToggle, "sidebar toggle");
  safeInit(initSharedHeader, "shared header");
  safeInit(initAuthAccessGuard, "auth access guard");
  safeInit(initContextDrivenRefresh, "context-driven refresh");
  safeInit(initRealtimeInPlaceRefresh, "realtime refresh");
}

document.addEventListener("DOMContentLoaded", initCommon);
