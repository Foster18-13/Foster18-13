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

  const productsWithEntries = products.filter((product) => {
    const data = dispatchByProduct[product.id];
    return data && data.entries.length > 0;
  });

  if (productsWithEntries.length === 0) {
    host.innerHTML = '<div class="empty-state">No dispatch records found for the selected date.</div>';
    return;
  }

  const maxEntryCount = productsWithEntries.reduce((maxCount, product) => {
    const data = dispatchByProduct[product.id];
    return Math.max(maxCount, data.entries.length);
  }, 0);

  // Keep at least 4 waybill/quantity column pairs so the sheet has wider dispatch visibility.
  const dispatchColumnPairs = Math.max(4, maxEntryCount);

  const table = document.createElement("table");
  const columnHeaders = Array.from({ length: dispatchColumnPairs }, (_, index) => {
    const n = index + 1;
    return `
      <th>Waybill ${n}</th>
      <th>Qty ${n}</th>
    `;
  }).join("");

  table.innerHTML = `
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Total Quantity</th>
        ${columnHeaders}
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  productsWithEntries.forEach((product) => {
    const data = dispatchByProduct[product.id];

    const row = document.createElement("tr");

    const productCell = document.createElement("td");
    productCell.textContent = product.name;
    row.appendChild(productCell);

    const totalQty = data.entries.reduce((sum, e) => sum + numeric(e.quantity), 0);
    const totalCell = document.createElement("td");
    totalCell.textContent = String(totalQty);
    row.appendChild(totalCell);

    for (let index = 0; index < dispatchColumnPairs; index += 1) {
      const entry = data.entries[index];

      const waybillCell = document.createElement("td");
      const qtyCell = document.createElement("td");

      if (entry) {
        const waybillText = String(entry.waybill || "-");
        waybillCell.textContent = entry.type === "return" ? `${waybillText} (R)` : waybillText;
        qtyCell.textContent = String(entry.quantity || 0);

        if (entry.type === "return") {
          waybillCell.style.color = "#b91c1c";
          qtyCell.style.color = "#b91c1c";
          waybillCell.style.fontWeight = "700";
          qtyCell.style.fontWeight = "700";
        }
      } else {
        waybillCell.textContent = "-";
        qtyCell.textContent = "-";
      }

      row.appendChild(waybillCell);
      row.appendChild(qtyCell);
    }

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
