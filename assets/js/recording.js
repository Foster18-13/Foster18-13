function getRowTotal(row) {
  const entryInputs = row.querySelectorAll("input[data-qty-index]");
  let total = 0;
  entryInputs.forEach((input) => {
    total += asNumber(input.value);
  });
  return total;
}

function hasRecordingContent(shiftStore) {
  if (!shiftStore || typeof shiftStore !== "object") return false;
  const recording = shiftStore.recording && typeof shiftStore.recording === "object" ? shiftStore.recording : {};

  return Object.values(recording).some((record) => {
    const entries = Array.isArray(record?.entries) ? record.entries : [];
    return entries.some((entry) => {
      if (entry && typeof entry === "object") {
        return String(entry.waybill ?? "").trim() !== "" || String(entry.qty ?? "").trim() !== "";
      }
      return String(entry ?? "").trim() !== "";
    });
  });
}

function getNearbyRecordingLocations(data, selectedDate, selectedShift, limit = 4) {
  if (!data || typeof data !== "object" || !data.daily) return [];

  return Object.entries(data.daily)
    .flatMap(([dateKey, dayValue]) => {
      if (!dayValue || typeof dayValue !== "object") return [];
      return ["day", "night"]
        .filter((shiftKey) => hasRecordingContent(dayValue[shiftKey]))
        .map((shiftKey) => ({ dateKey, shiftKey }));
    })
    .filter((item) => !(item.dateKey === selectedDate && item.shiftKey === selectedShift))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, limit);
}

function autoSwitchToLatestRecordingIfEmpty() {
  const data = loadData();
  const selectedDate = getSelectedDate();
  const selectedShift = getSelectedShift();
  const currentStore = getShiftStore(data, selectedDate, selectedShift);

  if (hasRecordingContent(currentStore)) return false;

  const nearby = getNearbyRecordingLocations(data, selectedDate, selectedShift, 1);
  if (!nearby.length) return false;

  const target = nearby[0];
  setSelectedDate(target.dateKey);
  setSelectedShift(target.shiftKey);

  const dateInput = document.getElementById("workingDate");
  if (dateInput) dateInput.value = target.dateKey;

  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) shiftSelector.value = target.shiftKey;

  setStatus(`Showing latest found entries: ${target.dateKey} (${target.shiftKey})`, "ok");
  return true;
}

function renderRecordingTable() {
  const tableHead = document.querySelector("#recordingTable thead");
  const tbody = document.querySelector("#recordingTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const columns = dayStore.recordingColumns;
  const activeProducts = getActiveProductsForDate(data, date);

  if (!activeProducts.length) {
    tableHead.innerHTML = "";
    tbody.innerHTML = `<tr><td>No products available for this date.</td></tr>`;
    return;
  }

  const headers = ["Product Name", "Total"];
  for (let index = 1; index <= columns; index += 1) {
    headers.push(`Entry ${index}`);
  }

  tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;

  // Sort products alphabetically by name
  const sortedProducts = [...activeProducts].sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  tbody.innerHTML = sortedProducts
    .map((product) => {
      const record = dayStore.recording[product.id] || { entries: [] };
      const entries = [];
      for (let index = 0; index < columns; index += 1) {
        entries.push(record.entries[index] ?? { waybill: "", qty: "" });
      }

      const rowCells = [`<td>${product.name}</td>`];
      const total = entries.reduce((sum, item) => {
        const qty = typeof item === "object" && item !== null ? item.qty : item;
        return sum + asNumber(qty);
      }, 0);
      rowCells.push(`<td><input class="input" type="number" readonly data-total value="${total}" /></td>`);

      entries.forEach((value, index) => {
        const waybillValue = typeof value === "object" && value !== null ? value.waybill ?? "" : "";
        const qtyValue = typeof value === "object" && value !== null ? value.qty ?? "" : value ?? "";
        rowCells.push(`
          <td>
            <div class="entry-cell-stack">
              <input class="input entry-waybill" data-waybill-index="${index}" placeholder="Waybill No." value="${waybillValue}" />
              <input class="input entry-qty" type="number" min="0" step="any" data-qty-index="${index}" placeholder="Qty" value="${qtyValue}" />
            </div>
          </td>
        `);
      });

      return `<tr data-product-id="${product.id}">${rowCells.join("")}</tr>`;
    })
    .join("");

  if (!hasRecordingContent(dayStore)) {
    const selectedShift = getSelectedShift();
    const nearby = getNearbyRecordingLocations(data, date, selectedShift);
    if (nearby.length) {
      const hint = nearby.map((item) => `${item.dateKey} (${item.shiftKey})`).join(", ");
      setStatus(`No entries on ${date} (${selectedShift}). Data found on: ${hint}`, "error");
    }
  }

  attachRecordingCalculations();
}

function resetBorderColor(element) {
  element.style.borderColor = '';
}

function handleQtyInput(e, totalInput, row) {
  // Prevent negative quantities
  if (asNumber(e.target.value) < 0) {
    e.target.value = 0;
    e.target.style.borderColor = '#dc3545';
    setTimeout(() => {
      resetBorderColor(e.target);
    }, 1500);
  }
  totalInput.value = getRowTotal(row);
}

function attachRecordingCalculations() {
  document.querySelectorAll("#recordingTable tbody tr").forEach((row) => {
    const totalInput = row.querySelector("input[data-total]");
    row.querySelectorAll("input[data-qty-index]").forEach((input) => {
      input.addEventListener("input", (e) => {
        handleQtyInput(e, totalInput, row);
      });
    });
  });
}

let recordingPersistTimer = null;

function queueRecordingPersist(delay = 1200) {
  if (recordingPersistTimer) {
    clearTimeout(recordingPersistTimer);
  }

  recordingPersistTimer = setTimeout(() => {
    saveRecordingSheet({ silent: true, logAudit: false });
  }, delay);
}

function saveRecordingSheet(options = {}) {
  const { silent = false, logAudit = true } = options;
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  document.querySelectorAll("#recordingTable tbody tr").forEach((row) => {
    const productId = row.dataset.productId;
    const entries = Array.from(row.querySelectorAll("td .entry-cell-stack")).map((cell) => {
      const waybillInput = cell.querySelector("input[data-waybill-index]");
      const qtyInput = cell.querySelector("input[data-qty-index]");
      return {
        waybill: waybillInput ? waybillInput.value.trim() : "",
        qty: qtyInput ? qtyInput.value : ""
      };
    });
    dayStore.recording[productId] = { entries };
  });

  saveData(data);
  if (logAudit) {
    addAuditLog("Recording sheet saved", {
      products: document.querySelectorAll("#recordingTable tbody tr").length,
      columns: dayStore.recordingColumns
    });
  }
  if (!silent) {
    setStatus("Recording sheet saved. Loading values are updated in Balance Sheet.", "ok");
  }
}

function addRecordingColumn() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  dayStore.recordingColumns += 1;
  saveData(data);
  addAuditLog("Recording column added", {
    columns: dayStore.recordingColumns
  });
  renderRecordingTable();
  setStatus(`Added Entry ${dayStore.recordingColumns}.`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderRecordingTable();
    });
  }

  autoSwitchToLatestRecordingIfEmpty();
  renderRecordingTable();

  const recordingTable = document.getElementById("recordingTable");
  if (recordingTable) {
    recordingTable.addEventListener("input", (event) => {
      if (event.target.matches(".entry-waybill, .entry-qty")) {
        queueRecordingPersist();
      }
    });
  }

  globalThis.addEventListener("pagehide", () => {
    saveRecordingSheet({ silent: true, logAudit: false });
  });
  
  // Initialize auto-save
  if (typeof initAutoSave === 'function') {
    initAutoSave(saveRecordingSheet);
    trackInputChanges('#recordingTable');
  }
  
  const saveButton = document.getElementById("saveRecording");
  const addColumnButton = document.getElementById("addColumn");
  const exportButton = document.getElementById("exportRecording");
  const exportPdfButton = document.getElementById("exportRecordingPdf");

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      await withLoadingFeedback(saveButton, "Saving...", () => saveRecordingSheet({ silent: false, logAudit: true }));
    });
  }
  if (addColumnButton) {
    addColumnButton.addEventListener("click", async () => {
      await withLoadingFeedback(addColumnButton, "Adding...", () => addRecordingColumn());
    });
  }
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("recordingTable", "recording_sheet");
    });
  }
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("recordingTable", "Recording Sheet", "recording_sheet");
    });
  }
});
