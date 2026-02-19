function getRowTotal(row) {
  const entryInputs = row.querySelectorAll("input[data-qty-index]");
  let total = 0;
  entryInputs.forEach((input) => {
    total += asNumber(input.value);
  });
  return total;
}

function renderRecordingTable() {
  const tableHead = document.querySelector("#recordingTable thead");
  const tbody = document.querySelector("#recordingTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);
  const columns = dayStore.recordingColumns;

  if (!data.products.length) {
    tableHead.innerHTML = "";
    tbody.innerHTML = `<tr><td>No products found. Add products from the Products page.</td></tr>`;
    return;
  }

  const headers = ["Product Name", "Total"];
  for (let index = 1; index <= columns; index += 1) {
    headers.push(`Entry ${index}`);
  }

  tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;

  tbody.innerHTML = data.products
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

  attachRecordingCalculations();
}

function attachRecordingCalculations() {
  document.querySelectorAll("#recordingTable tbody tr").forEach((row) => {
    const totalInput = row.querySelector("input[data-total]");
    row.querySelectorAll("input[data-qty-index]").forEach((input) => {
      input.addEventListener("input", () => {
        totalInput.value = getRowTotal(row);
      });
    });
  });
}

function saveRecordingSheet() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

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
  setStatus("Recording sheet saved. Loading values are updated in Balance Sheet.", "ok");
}

function addRecordingColumn() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);
  dayStore.recordingColumns += 1;
  saveData(data);
  renderRecordingTable();
  setStatus(`Added Entry ${dayStore.recordingColumns}.`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderRecordingTable();
  const saveButton = document.getElementById("saveRecording");
  const addColumnButton = document.getElementById("addColumn");
  const exportButton = document.getElementById("exportRecording");
  const exportPdfButton = document.getElementById("exportRecordingPdf");

  if (saveButton) saveButton.addEventListener("click", saveRecordingSheet);
  if (addColumnButton) addColumnButton.addEventListener("click", addRecordingColumn);
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
