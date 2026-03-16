function fillPurchaseProductOptions() {
  const select = document.getElementById("purchaseProduct");
  if (!select) return;
  const products = readProducts();
  select.innerHTML = products.map((p) => `<option value=\"${p.id}\">${p.name}</option>`).join("");
}

function renderPurchaseTable() {
  const host = document.getElementById("purchaseTableHost");
  if (!host) return;

  const date = selectedDate();
  const products = readProducts();
  const map = new Map(products.map((p) => [p.id, p.name]));
  const rows = readPurchases(date);

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product</th>
        <th>Waybill No.</th>
        <th>Batch Code</th>
        <th>Pallets</th>
        <th>Date Received</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((item) => `
        <tr>
          <td>${map.get(item.productId) || "Unknown"}</td>
          <td>${item.waybill}</td>
          <td>${item.batchCode}</td>
          <td>${item.pallets}</td>
          <td>${item.dateReceived}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  host.innerHTML = "";
  host.appendChild(table);
}

function initPurchasePage() {
  initProtectedPage();
  fillPurchaseProductOptions();
  renderPurchaseTable();

  const form = document.getElementById("purchaseForm");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const date = selectedDate();

    addPurchase(date, {
      productId: document.getElementById("purchaseProduct").value,
      waybill: document.getElementById("waybillNo").value,
      batchCode: document.getElementById("batchCode").value,
      pallets: document.getElementById("pallets").value,
      dateReceived: document.getElementById("dateReceived").value || date
    });

    form.reset();
    document.getElementById("dateReceived").value = date;
    renderPurchaseTable();
  });

  const dateReceived = document.getElementById("dateReceived");
  if (dateReceived && !dateReceived.value) {
    dateReceived.value = selectedDate();
  }
}
