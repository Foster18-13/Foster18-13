function renderSummarySheet() {
  const host = document.getElementById("summaryTableHost");
  if (!host) return;

  const date = selectedDate();
  const products = readProducts();

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Stock Available</th>
      </tr>
    </thead>
    <tbody>
      ${products.map((product) => `
        <tr>
          <td>${product.name}</td>
          <td>${stockAvailable(date, product.id)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  host.innerHTML = "";
  host.appendChild(table);
}

function initSummaryPage() {
  initProtectedPage();
  renderSummarySheet();
}
