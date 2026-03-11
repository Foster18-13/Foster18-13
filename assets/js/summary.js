function renderSummary() {
  const tbody = document.querySelector("#summaryTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const activeProducts = getActiveProductsForDate(data, date);

  if (!activeProducts.length) {
    tbody.innerHTML = `<tr><td colspan="2">No products available for this date.</td></tr>`;
    return;
  }

  // Sort products alphabetically by name
  const sortedProducts = [...activeProducts].sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  tbody.innerHTML = sortedProducts
    .map((product) => {
      const available = getStockAvailable(dayStore, product.id);
      return `<tr><td>${product.name}</td><td>${available}</td></tr>`;
    })
    .join("");

  setStatus(`Summary loaded for ${date}.`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderSummary();
    });
  }

  renderSummary();
  const refreshButton = document.getElementById("refreshSummary");
  const exportPdfButton = document.getElementById("exportSummaryPdf");
  if (refreshButton) refreshButton.addEventListener("click", renderSummary);
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("summaryTable", "Summary Sheet", "summary_sheet");
    });
  }
});
