const DISPATCH_STORAGE_KEY = "twellium_warehouse_portal_v1";
const DEFAULT_DISPATCH_SECTOR_ID = "water";
const DAY_ONLY_DISPATCH_SECTORS = new Set(["hh", "mcberry"]);
const FALLBACK_DISPATCH_SECTORS = [
  { id: "water", label: "Water & Beverages" },
  { id: "hh", label: "H&H Products" },
  { id: "mcberry", label: "Mcberry Products" }
];

let dispatchSectorId = DEFAULT_DISPATCH_SECTOR_ID;

function normalizeDispatchSectorId(sectorId) {
  const normalized = String(sectorId || "").trim().toLowerCase();
  return normalized || DEFAULT_DISPATCH_SECTOR_ID;
}

function getDispatchStorageKey(sectorId) {
  const normalized = normalizeDispatchSectorId(sectorId);
  return normalized === DEFAULT_DISPATCH_SECTOR_ID
    ? DISPATCH_STORAGE_KEY
    : `${DISPATCH_STORAGE_KEY}_${normalized}`;
}

function loadDispatchDataForSector(sectorId) {
  const storageKey = getDispatchStorageKey(sectorId);

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error(`Failed to read dispatch data for sector "${sectorId}".`, error);
    return null;
  }
}

function getDispatchSectors() {
  return Array.isArray(globalThis.WAREHOUSE_SECTORS) && globalThis.WAREHOUSE_SECTORS.length
    ? globalThis.WAREHOUSE_SECTORS
    : FALLBACK_DISPATCH_SECTORS;
}

function getDispatchSectorLabel(sectorId) {
  const normalized = normalizeDispatchSectorId(sectorId);
  const match = getDispatchSectors().find((sector) => sector.id === normalized);
  return match?.label || normalized || "Unknown Sector";
}

function getDispatchDailyStores(data) {
  if (data?.daily && typeof data.daily === "object") {
    return data.daily;
  }

  if (data?.dailyStores && typeof data.dailyStores === "object") {
    return data.dailyStores;
  }

  return {};
}

function getProductNameMap(products) {
  const names = new Map();

  for (const product of Array.isArray(products) ? products : []) {
    if (!product?.id) continue;
    names.set(product.id, product.name || "Unknown Product");
  }

  return names;
}

function getDispatchDatesToProcess(dailyStores, dateFilter, allDates) {
  if (allDates) {
    return Object.keys(dailyStores).filter((dateKey) => !!dateKey && !!dailyStores[dateKey]);
  }

  if (dateFilter && dailyStores[dateFilter]) {
    return [dateFilter];
  }

  return [];
}

function getDispatchShiftKeys(sectorId, shiftFilter, allDates) {
  const normalizedSectorId = normalizeDispatchSectorId(sectorId);
  if (DAY_ONLY_DISPATCH_SECTORS.has(normalizedSectorId)) {
    return ["day"];
  }

  if (allDates) {
    return ["day", "night"];
  }

  if (shiftFilter) {
    return [shiftFilter];
  }

  return ["day", "night"];
}

function createDispatchRow(customer, productNames, dateKey, shiftKey) {
  return {
    productId: customer.productId || "",
    productName: productNames.get(customer.productId) || "Unknown Product",
    waybill: customer.waybillNumber || "",
    qty: customer.quantity ?? "",
    date: dateKey,
    shift: shiftKey
  };
}

function collectDispatchRowsForShift(customers, productNames, dateKey, shiftKey) {
  const rows = [];

  for (const customer of customers) {
    if (!customer || typeof customer !== "object") continue;
    rows.push(createDispatchRow(customer, productNames, dateKey, shiftKey));
  }

  return rows;
}

function collectDispatchRows(data, sectorId, dateFilter, shiftFilter, allDates) {
  if (!data || typeof data !== "object") return [];

  const dailyStores = getDispatchDailyStores(data);
  const productNames = getProductNameMap(data.products);
  const datesToProcess = getDispatchDatesToProcess(dailyStores, dateFilter, allDates);
  const shiftsToProcess = getDispatchShiftKeys(sectorId, shiftFilter, allDates);
  const rows = [];

  for (const dateKey of datesToProcess) {
    const dayValue = dailyStores[dateKey];
    if (!dayValue || typeof dayValue !== "object") continue;

    for (const shiftKey of shiftsToProcess) {
      const shiftStore = dayValue[shiftKey];
      const customers = Array.isArray(shiftStore?.customers) ? shiftStore.customers : [];
      rows.push(...collectDispatchRowsForShift(customers, productNames, dateKey, shiftKey));
    }
  }

  return rows;
}

function escapeDispatchHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmptyDispatchState(tbody, countEl, message) {
  tbody.innerHTML = `<tr><td colspan="3" class="dispatch-empty-state">${message}</td></tr>`;
  if (countEl) countEl.textContent = "";
}

function buildDispatchTableHtml(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.productName;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  const productNames = Array.from(grouped.keys()).sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()));
  let html = "";
  let totalEntries = 0;

  for (const productName of productNames) {
    const entries = grouped.get(productName) || [];
    totalEntries += entries.length;

    entries.forEach((entry, index) => {
      html += "<tr>";
      if (index === 0) {
        html += `<td class="dispatch-product-cell" rowspan="${entries.length}">${escapeDispatchHtml(productName)}</td>`;
      }
      html += `<td>${escapeDispatchHtml(entry.waybill)}</td>`;
      html += `<td>${escapeDispatchHtml(entry.qty)}</td>`;
      html += "</tr>";
    });
  }

  return {
    html,
    productCount: productNames.length,
    totalEntries
  };
}

function updateDispatchSummary(countEl, totalEntries, productCount) {
  if (!countEl) return;

  const entryLabel = totalEntries === 1 ? "entry" : "entries";
  const productLabel = productCount === 1 ? "product" : "products";
  countEl.textContent = `${totalEntries} ${entryLabel} across ${productCount} ${productLabel}`;
}

function renderDispatchTable() {
  const tbody = document.querySelector("#dispatchTable tbody");
  const countEl = document.getElementById("dispatchCount");
  if (!tbody) return;

  const sectorId = normalizeDispatchSectorId(dispatchSectorId);
  const data = loadDispatchDataForSector(sectorId);
  const dateFilter = document.getElementById("workingDate")?.value || todayISO();
  const shiftFilter = document.getElementById("shiftSelector")?.value || "day";
  const allDates = !!document.getElementById("allDatesToggle")?.checked;

  if (!data) {
    renderEmptyDispatchState(
      tbody,
      countEl,
      "No data found for this sector. Make sure you have recorded customer entries while in this sector."
    );
    return;
  }

  const rows = collectDispatchRows(data, sectorId, dateFilter, shiftFilter, allDates);
  if (!rows.length) {
    renderEmptyDispatchState(
      tbody,
      countEl,
      "No customer delivery entries found for the selected filter."
    );
    return;
  }

  const tableState = buildDispatchTableHtml(rows);
  tbody.innerHTML = tableState.html;
  updateDispatchSummary(countEl, tableState.totalEntries, tableState.productCount);
  setStatus("Dispatch report loaded.", "ok");
}

function syncDispatchSectorHeading() {
  const labelEl = document.getElementById("activeSectorLabel");
  if (labelEl) {
    labelEl.textContent = getDispatchSectorLabel(dispatchSectorId);
  }
}

function syncDispatchShiftSelector() {
  const shiftSelect = document.getElementById("shiftSelector");
  if (!shiftSelect) return;

  const dayOnly = DAY_ONLY_DISPATCH_SECTORS.has(normalizeDispatchSectorId(dispatchSectorId));
  const nightOption = shiftSelect.querySelector('option[value="night"]');

  if (nightOption) {
    nightOption.disabled = dayOnly;
    nightOption.hidden = dayOnly;
  }

  if (dayOnly || !shiftSelect.value) {
    shiftSelect.value = "day";
  }
}

function setActiveDispatchSector(nextSectorId) {
  dispatchSectorId = normalizeDispatchSectorId(nextSectorId);

  document.querySelectorAll(".dispatch-sector-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.sector === dispatchSectorId);
  });

  syncDispatchSectorHeading();
  syncDispatchShiftSelector();
  renderDispatchTable();
}

function initSectorTabs() {
  const tabs = document.querySelectorAll(".dispatch-sector-tab");
  const currentSector = typeof globalThis.getCurrentWorkSector === "function"
    ? globalThis.getCurrentWorkSector()
    : DEFAULT_DISPATCH_SECTOR_ID;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveDispatchSector(tab.dataset.sector);
    });
  });

  setActiveDispatchSector(currentSector);
}

function exportDispatchPdf() {
  // Try to get jsPDF from multiple locations (UMD bundle compatibility)
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  
  if (!jsPDF) {
    alert("PDF export library is not loaded. Please refresh the page and try again.");
    console.error("jsPDF not found.");
    return;
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sectorLabel = getDispatchSectorLabel(dispatchSectorId);
  const dateLabel = document.getElementById("workingDate")?.value || todayISO();
  const allDates = !!document.getElementById("allDatesToggle")?.checked;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add header to each page
  const addHeaderToPage = () => {
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Product Dispatch Report', 15, 16);
    
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Sector: ${sectorLabel}`, 15, 24);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${allDates ? 'All Dates' : dateLabel}`, 15, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 36);
    
    // Horizontal line
    doc.setDrawColor(150, 150, 150);
    doc.line(15, 38, pageWidth - 15, 38);
  };

  // Add footer with page numbers
  const addFooterToPage = (pageNum) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Twellium Warehouse Portal`, 15, pageHeight - 10);
  };

  // Add header to first page
  addHeaderToPage();

  const table = document.getElementById("dispatchTable");
  if (table && typeof doc.autoTable === "function") {
    let pageCount = 1;
    
    doc.autoTable({
      html: table,
      startY: 42,
      margin: { top: 42, right: 15, bottom: 15, left: 15 },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: 'wrap',
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
        valign: 'middle',
        cellPadding: 5
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 70, halign: 'left' },
        1: { cellWidth: 60, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' }
      },
      didDrawPage: (data) => {
        // Add footer to each page
        pageCount = doc.internal.pages.length - 1;
        addFooterToPage(pageCount);
        
        // Re-add header on new pages after the first
        if (pageCount > 1) {
          doc.setPageSize('a4');
          // Move to top of page
          const yPos = doc.internal.pageSize.getHeight() - doc.lastAutoTable.finalY - 15;
          if (yPos < 30) {
            // Add header on continued pages
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`${sectorLabel} - Continued`, 15, 15);
          }
        }
      }
    });
  }

  const safeSectorLabel = sectorLabel.replaceAll(/\s+/g, "_").toLowerCase();
  doc.save(`product_dispatch_${safeSectorLabel}_${dateLabel}.pdf`);
    setStatus("PDF exported successfully.", "ok");
  } catch (error) {
    console.error("PDF export error:", error);
    alert(`Error exporting PDF: ${error.message}`);
  }
}

function initDispatchFilters() {
  const dateInput = document.getElementById("workingDate");
  if (dateInput) {
    dateInput.value = typeof getSelectedDate === "function" ? getSelectedDate() : todayISO();
    dateInput.addEventListener("change", renderDispatchTable);
  }

  const shiftSelect = document.getElementById("shiftSelector");
  if (shiftSelect) {
    shiftSelect.value = typeof getSelectedShift === "function" ? getSelectedShift() : "day";
    shiftSelect.addEventListener("change", renderDispatchTable);
  }

  const allDatesToggle = document.getElementById("allDatesToggle");
  if (allDatesToggle) {
    allDatesToggle.addEventListener("change", () => {
      const filterRow = document.getElementById("dateFilterRow");
      if (filterRow) {
        filterRow.style.display = allDatesToggle.checked ? "none" : "";
      }
      renderDispatchTable();
    });
  }
}

function initDispatchActions() {
  const refreshBtn = document.getElementById("refreshDispatch");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", renderDispatchTable);
  }

  const exportBtn = document.getElementById("exportDispatchPdf");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportDispatchPdf);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSectorTabs();
  initDispatchFilters();
  initDispatchActions();
  syncDispatchShiftSelector();
  renderDispatchTable();
});
