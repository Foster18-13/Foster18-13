function renderDispatchSheet() {
  const host = document.getElementById("dispatchTableHost");
  if (!host) return;

  const date = selectedDate();
  const products = readProducts();
  const customerEntries = readCustomerEntries(date);
  const returnsEntries = readReturnsEntries(date);

  // Combine all dispatch entries (customer + returns) and group by product
  const dispatchByProduct = {};

  products.forEach((product) => {
    dispatchByProduct[product.id] = {
      name: product.name,
      entries: []
    };
  });

  // Add customer entries (loading/dispatch)
  customerEntries.forEach((entry) => {
    if (dispatchByProduct[entry.productId]) {
      dispatchByProduct[entry.productId].entries.push({
        waybill: entry.waybillNumber,
        quantity: entry.quantity,
        type: "dispatch"
      });
    }
  });

  // Add returns entries
  returnsEntries.forEach((entry) => {
    if (dispatchByProduct[entry.productId]) {
      dispatchByProduct[entry.productId].entries.push({
        waybill: entry.waybillNumber,
        quantity: entry.quantity,
        type: "return"
      });
    }
  });

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Total Quantity</th>
        <th>Dispatch Details (Waybill | Qty)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  products.forEach((product) => {
    const data = dispatchByProduct[product.id];
    if (!data || data.entries.length === 0) return;

    const row = document.createElement("tr");

    const productCell = document.createElement("td");
    productCell.textContent = product.name;
    row.appendChild(productCell);

    const totalQty = data.entries.reduce((sum, e) => sum + numeric(e.quantity), 0);
    const totalCell = document.createElement("td");
    totalCell.textContent = String(totalQty);
    row.appendChild(totalCell);

    const detailsCell = document.createElement("td");
    const detailsList = document.createElement("ul");
    detailsList.style.margin = "4px 0";
    detailsList.style.paddingLeft = "20px";

    data.entries.forEach((entry) => {
      const li = document.createElement("li");
      li.style.fontSize = "13px";
      li.style.color = entry.type === "return" ? "#dc2626" : "inherit";
      const typeLabel = entry.type === "return" ? " (Return)" : "";
      li.textContent = `${entry.waybill} | ${entry.quantity}${typeLabel}`;
      detailsList.appendChild(li);
    });

    detailsCell.appendChild(detailsList);
    row.appendChild(detailsCell);

    tbody.appendChild(row);
  });

  host.innerHTML = "";
  host.appendChild(table);
}

function initDispatchPage() {
  initProtectedPage();
  renderDispatchSheet();

  const printBtn = document.getElementById("printDispatchBtn");
  printBtn?.addEventListener("click", () => {
    printSection("dispatchTableHost", "Product Dispatch Sheet");
  });
}
