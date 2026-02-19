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

  initGlobalSearch();
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

function makeCsvFromTable(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return "";

  const rows = table.querySelectorAll("tr");
  const lines = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    if (!cells.length) return;

    const values = Array.from(cells).map((cell) => {
      const fields = cell.querySelectorAll("input, textarea, select");
      const value = fields.length
        ? Array.from(fields)
            .map((field) => field.value)
            .join(" | ")
        : cell.textContent.trim();
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
