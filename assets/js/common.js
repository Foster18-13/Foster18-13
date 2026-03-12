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

function roleAllowsPage(role, pageName) {
  const minRole = getMinimumRoleForPage(pageName);
  if (typeof hasRoleAccess === "function") {
    return hasRoleAccess(role, minRole);
  }
  return true;
}

function applyRoleNavAccess(role) {
  document.querySelectorAll(".main-nav a").forEach((link) => {
    const target = String(link.getAttribute("href") || "").split("?")[0];
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

  const dateInput = document.getElementById("workingDate");
  if (!dateInput) return;

  dateInput.value = getSelectedDate();
  initDateQuickNavigation();
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    setSelectedDate(dateInput.value);
    location.reload();
  });

  const todayButton = document.getElementById("jumpToday");
  if (todayButton) {
    todayButton.addEventListener("click", () => {
      const date = todayISO();
      setSelectedDate(date);
      dateInput.value = date;
      location.reload();
    });
  }

  initDayLockControls();
  initGlobalSearch();
}

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
  const controls = document.querySelector(".topbar-controls");
  const todayButton = document.getElementById("jumpToday");
  if (!controls || !todayButton) return;

  if (!document.getElementById("jumpPrevDay")) {
    const prevButton = document.createElement("button");
    prevButton.id = "jumpPrevDay";
    prevButton.type = "button";
    prevButton.className = "button";
    prevButton.textContent = "Previous Day";
    todayButton.before(prevButton);
  }

  if (!document.getElementById("jumpNextDay")) {
    const nextButton = document.createElement("button");
    nextButton.id = "jumpNextDay";
    nextButton.type = "button";
    nextButton.className = "button";
    nextButton.textContent = "Next Day";
    todayButton.after(nextButton);
  }

  const prevButton = document.getElementById("jumpPrevDay");
  const nextButton = document.getElementById("jumpNextDay");
  if (prevButton) prevButton.addEventListener("click", () => shiftWorkingDate(-1));
  if (nextButton) nextButton.addEventListener("click", () => shiftWorkingDate(1));
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
    checklistMeta.textContent = "Run checklist before locking the day.";
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
  const checklistResult = evaluateDailyClosingChecklist(details);
  toggleButton.textContent = locked ? "Unlock Day" : "Lock Day";
  lockState.textContent = locked ? "Day locked" : "Day open";
  lockState.className = `status ${locked ? "error" : "ok"}`;

  renderDayLockApprovalInfo(approvalInfo, details, locked);
  renderChecklistInfo(checklistState, checklistMeta, checklistResult, details);

  applyDayLockState(locked);
}

function initDayLockControls() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls) return;

  if (!document.getElementById("dayLockArea")) {
    const wrapper = document.createElement("div");
    wrapper.id = "dayLockArea";
    wrapper.className = "day-lock-area";
    wrapper.innerHTML = `
      <button class="button" id="dayChecklistRun" type="button">Run Checklist</button>
      <span class="status" id="dayChecklistState"></span>
      <span class="status" id="dayChecklistMeta"></span>
      <button class="button" id="dayLockToggle" type="button">Lock Day</button>
      <span class="status" id="dayLockState"></span>
      <span class="status" id="dayLockApproval"></span>
    `;
    controls.appendChild(wrapper);
  }

  const checklistButton = document.getElementById("dayChecklistRun");
  if (checklistButton) {
    checklistButton.addEventListener("click", () => {
      const data = loadData();
      const date = getSelectedDate();
      const dayStore = getShiftStore(data, date);
      const checklistResult = evaluateDailyClosingChecklist(dayStore);
      const operator = getCurrentOperatorLabel();

      updateChecklistSnapshot(dayStore, checklistResult, operator);
      saveData(data);
      renderDayLockControls();

      if (checklistResult.passed) {
        setStatus("Daily closing checklist passed. You can lock the day.", "ok");
      } else {
        const details = checklistResult.missingItems.join(" ");
        setStatus(`Checklist incomplete: ${details}`, "error");
      }
    });
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

function exportTableAsPdfFile(tableId, title, filePrefix) {
  const date = getSelectedDate();
  const { headers, rows } = getTableDataForExport(tableId);
  if (!headers.length || !rows.length) {
    return false;
  }

  const jsPdfClass = globalThis.jspdf?.jsPDF;
  if (typeof jsPdfClass !== "function") {
    return false;
  }

  const doc = new jsPdfClass({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 40, 54);

  if (typeof doc.autoTable !== "function") {
    return false;
  }

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 70,
    margin: { top: 70, right: 20, bottom: 20, left: 20 },
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

  doc.save(`${filePrefix}_${date}.pdf`);
  return true;
}

function exportTableAsPdf(tableId, title, filePrefix) {
  const printableTable = buildPrintableTableHtml(tableId);
  if (!printableTable) {
    setStatus("Nothing to export.", "error");
    return;
  }

  const pdfDownloaded = exportTableAsPdfFile(tableId, title, filePrefix);
  if (pdfDownloaded) {
    setStatus("PDF downloaded to your files.", "ok");
    return;
  }

  const date = getSelectedDate();
  const popup = window.open("", "_blank");
  if (!popup) {
    setStatus("Please allow popups to export PDF.", "error");
    return;
  }

  const doc = popup.document;
  doc.title = `${filePrefix}_${date}`;

  const style = doc.createElement("style");
  style.textContent = `
    body { font-family: Arial, sans-serif; padding: 16px; color: #1f2a37; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 14px; color: #4b5d73; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #c7d2e2; padding: 2px 4px; font-size: 11px; text-align: left; }
    th { background: #eef3fb; }
    @page { size: A4 portrait; margin: 12mm; }
  `;

  const heading = doc.createElement("h1");
  heading.textContent = title;

  const dateLine = doc.createElement("p");
  dateLine.textContent = `Date: ${date}`;

  doc.head.innerHTML = "";
  doc.head.appendChild(style);
  doc.body.innerHTML = "";
  doc.body.appendChild(heading);
  doc.body.appendChild(dateLine);
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
  const overlay = document.getElementById("sidebarOverlay");

  if (!sidebarToggle || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add("active");
    if (overlay) overlay.classList.add("active");
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
  }

  sidebarToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.contains("active") ? closeSidebar() : openSidebar();
  });

  // Close when clicking a nav link
  sidebar.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Close when clicking the overlay
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }
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
    return;
  }

  if (currentPage === "products.html") {
    invokeIfFunction("renderProducts");
    return;
  }

  if (currentPage === "purchase.html") {
    invokeIfFunction("renderPurchaseProductOptions");
    invokeIfFunction("renderPurchaseTable");
    return;
  }

  if (currentPage === "recording.html") {
    invokeIfFunction("renderRecordingTable");
    return;
  }

  if (currentPage === "balance.html") {
    invokeIfFunction("renderBalanceTable");
    return;
  }

  if (currentPage === "returns.html") {
    invokeIfFunction("renderReturnProductOptions");
    invokeIfFunction("renderReturnsTable");
    return;
  }

  if (currentPage === "damages.html") {
    invokeIfFunction("renderDamageProductOptions");
    invokeIfFunction("renderDamagesTable");
    return;
  }

  if (currentPage === "vehicles.html") {
    invokeIfFunction("renderVehiclesTable");
    return;
  }

  if (currentPage === "customers.html") {
    invokeIfFunction("renderCustomerProductOptions");
    invokeIfFunction("renderCustomerNameSuggestions");
    invokeIfFunction("renderCustomersTable");
    return;
  }

  if (currentPage === "dashboard.html") {
    invokeIfFunction("renderDashboard");
    return;
  }

  if (currentPage === "reports.html") {
    invokeIfFunction("generateReport");
    return;
  }

  if (currentPage === "period-reports.html") {
    invokeIfFunction("initializePage");
    return;
  }

  if (currentPage === "product-movement.html") {
    invokeIfFunction("populateProductSelect");
    invokeIfFunction("viewProductMovement");
    return;
  }

  if (currentPage === "customer-history.html") {
    invokeIfFunction("searchCustomerHistory");
  }
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
  initSharedHeader();
  initAuthAccessGuard();
  initSidebarToggle();
  initRealtimeInPlaceRefresh();
}

document.addEventListener("DOMContentLoaded", initCommon);
