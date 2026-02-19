function renderSummary() {
  const tbody = document.querySelector("#summaryTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

  if (!data.products.length) {
    tbody.innerHTML = `<tr><td colspan="2">No products found. Add products from the Products page.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.products
    .map((product) => {
      const available = getStockAvailable(dayStore, product.id);
      return `<tr><td>${product.name}</td><td>${available}</td></tr>`;
    })
    .join("");

  setStatus(`Summary loaded for ${date}.`, "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderSummary();
  const refreshButton = document.getElementById("refreshSummary");
  const exportButton = document.getElementById("exportSummary");
  if (refreshButton) refreshButton.addEventListener("click", renderSummary);
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("summaryTable", "summary_sheet");
    });
  }
});
