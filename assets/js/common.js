function markActiveNav() {
  const current = location.pathname.split("/").pop() || "balance.html";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    const target = link.getAttribute("href");
    if (target === current) {
      link.classList.add("active");
    }
  });
}

function initSharedHeader() {
  markActiveNav();

  const dateInput = document.getElementById("workingDate");
  if (!dateInput) return;

  dateInput.value = getSelectedDate();
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

function getCurrentDayLockedState() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);
  return !!dayStore.locked;
}

function getCurrentDayLockDetails() {
  const data = loadData();
  const date = getSelectedDate();
  return ensureDayStore(data, date);
}

function formatApprovalTimestamp(timestamp) {
  const value = asNumber(timestamp);
  if (!value) return "";
  return new Date(value).toLocaleString();
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
  if (!toggleButton || !lockState) return;

  const details = getCurrentDayLockDetails();
  const locked = !!details.locked;
  toggleButton.textContent = locked ? "Unlock Day" : "Lock Day";
  lockState.textContent = locked ? "Day locked" : "Day open";
  lockState.className = `status ${locked ? "error" : "ok"}`;

  if (approvalInfo) {
    if (locked && details.lockedBy && details.lockedAt) {
      approvalInfo.textContent = `Approved by ${details.lockedBy} on ${formatApprovalTimestamp(details.lockedAt)}`;
      approvalInfo.className = "status";
    } else {
      approvalInfo.textContent = "";
      approvalInfo.className = "status";
    }
  }

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
      const dayStore = ensureDayStore(data, date);

      if (dayStore.locked) {
        dayStore.locked = false;
      } else {
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

function createProductOptions(products, selected = "") {
  const options = [`<option value="">Select product</option>`];
  products.forEach((product) => {
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

  const doc = new jsPdfClass({ orientation: "landscape", unit: "pt", format: "a4" });

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
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [18, 84, 161] }
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
    th, td { border: 1px solid #c7d2e2; padding: 6px 8px; font-size: 12px; text-align: left; }
    th { background: #eef3fb; }
    @page { size: A4 landscape; margin: 12mm; }
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

document.addEventListener("DOMContentLoaded", initSharedHeader);
