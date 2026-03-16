function renderRecordingTable() {
  const host = document.getElementById("recordingTableHost");
  const date = selectedDate();
  if (!host) return;

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const products = readProducts();
  const productById = new Map(products.map((product) => [product.id, product.name]));
  const entries = readCustomerEntries(date);

  const productOptions = products
    .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`)
    .join("");

  host.innerHTML = `
    <div class="toolbar">
      <input id="customerNameInput" class="input" type="text" placeholder="Customer Name" />
      <select id="customerProductInput" class="input">
        <option value="">Select Product</option>
        ${productOptions}
      </select>
      <input id="customerQuantityInput" class="input" type="number" min="1" step="1" placeholder="Quantity" />
      <input id="customerWaybillInput" class="input" type="text" placeholder="Waybill Number" />
      <button id="saveCustomerEntryBtn" class="button primary" type="button">Save</button>
    </div>
    <div id="customerEntryMessage" class="auth-message"></div>
    <table>
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Product</th>
          <th>Quantity</th>
          <th>Waybill Number</th>
          <th>Time</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="customerEntryRows"></tbody>
    </table>
  `;

  const rows = host.querySelector("#customerEntryRows");
  if (!rows) return;

  if (entries.length === 0) {
    rows.innerHTML = `<tr><td colspan="6">No customer entries saved for this date yet.</td></tr>`;
  } else {
    rows.innerHTML = entries
      .map((entry) => {
        const productName = productById.get(entry.productId) || "Unknown Product";
        const timeText = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString() : "";
        return `
          <tr>
            <td>${escapeHtml(entry.customerName || "")}</td>
            <td>${escapeHtml(productName)}</td>
            <td>${entry.quantity || 0}</td>
            <td>${escapeHtml(entry.waybillNumber || "")}</td>
            <td>${escapeHtml(timeText)}</td>
            <td><button class="button" data-entry-id="${escapeHtml(entry.id)}" type="button">Delete</button></td>
          </tr>
        `;
      })
      .join("");
  }

  const msg = host.querySelector("#customerEntryMessage");
  const customerNameInput = host.querySelector("#customerNameInput");
  const customerProductInput = host.querySelector("#customerProductInput");
  const customerQuantityInput = host.querySelector("#customerQuantityInput");
  const customerWaybillInput = host.querySelector("#customerWaybillInput");
  const saveBtn = host.querySelector("#saveCustomerEntryBtn");

  saveBtn?.addEventListener("click", () => {
    const customerName = String(customerNameInput?.value || "").trim();
    const productId = String(customerProductInput?.value || "").trim();
    const quantity = Number(customerQuantityInput?.value || 0);
    const waybillNumber = String(customerWaybillInput?.value || "").trim();

    if (!customerName || !productId || !Number.isFinite(quantity) || quantity <= 0) {
      if (msg) {
        msg.className = "auth-message error";
        msg.textContent = "Enter customer name, select a product, and provide quantity above 0.";
      }
      return;
    }

    addCustomerEntry(date, { customerName, productId, quantity, waybillNumber });
    if (msg) {
      msg.className = "auth-message ok";
      msg.textContent = "Customer entry saved.";
    }
    renderRecordingTable();
  });

  rows.querySelectorAll("button[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.dataset.entryId;
      if (!entryId) return;
      deleteCustomerEntry(date, entryId);
      renderRecordingTable();
    });
  });
}

function initRecordingPage() {
  initProtectedPage();
  renderRecordingTable();
}
