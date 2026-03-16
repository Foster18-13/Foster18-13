function renderReturnsSheet() {
  const host = document.getElementById("returnsTableHost");
  const totalEl = document.getElementById("returnsGrandTotal");
  if (!host) return;

  const date = selectedDate();
  const products = readProducts();

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const productById = new Map(products.map((product) => [product.id, product.name]));
  const entries = readReturnsEntries(date);
  const grandTotal = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);

  const productOptions = products
    .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`)
    .join("");

  host.innerHTML = `
    <div class="toolbar">
      <input id="returnsCustomerNameInput" class="input" type="text" placeholder="Customer Name" />
      <select id="returnsProductInput" class="input">
        <option value="">Select Product</option>
        ${productOptions}
      </select>
      <input id="returnsQuantityInput" class="input" type="number" min="1" step="1" placeholder="Quantity" />
      <input id="returnsWaybillInput" class="input" type="text" placeholder="Waybill Number" />
      <button id="saveReturnEntryBtn" class="button primary" type="button">Save</button>
      <button id="cancelReturnEditBtn" class="button" type="button" style="display:none;">Cancel Edit</button>
    </div>
    <div id="returnsEntryMessage" class="auth-message"></div>
    <table>
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Product</th>
          <th>Quantity</th>
          <th>Waybill Number</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="returnsEntryRows"></tbody>
    </table>
  `;

  if (totalEl) {
    totalEl.textContent = String(grandTotal);
  }

  const rows = host.querySelector("#returnsEntryRows");
  if (!rows) return;

  if (entries.length === 0) {
    rows.innerHTML = `<tr><td colspan="6">No goods returned entries saved for this date yet.</td></tr>`;
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
            <td>
              <button class="button" data-action="edit" data-entry-id="${escapeHtml(entry.id)}" type="button">Edit</button>
              <button class="button" data-action="delete" data-entry-id="${escapeHtml(entry.id)}" type="button">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  const msg = host.querySelector("#returnsEntryMessage");
  const customerNameInput = host.querySelector("#returnsCustomerNameInput");
  const productInput = host.querySelector("#returnsProductInput");
  const quantityInput = host.querySelector("#returnsQuantityInput");
  const waybillInput = host.querySelector("#returnsWaybillInput");
  const saveBtn = host.querySelector("#saveReturnEntryBtn");
  const cancelBtn = host.querySelector("#cancelReturnEditBtn");

  const resetForm = () => {
    if (customerNameInput) customerNameInput.value = "";
    if (productInput) productInput.value = "";
    if (quantityInput) quantityInput.value = "";
    if (waybillInput) waybillInput.value = "";
    if (saveBtn) {
      saveBtn.textContent = "Save";
      saveBtn.dataset.editingId = "";
    }
    if (cancelBtn) cancelBtn.style.display = "none";
  };

  saveBtn?.addEventListener("click", () => {
    const customerName = String(customerNameInput?.value || "").trim();
    const productId = String(productInput?.value || "").trim();
    const quantity = Number(quantityInput?.value || 0);
    const waybillNumber = String(waybillInput?.value || "").trim();

    if (!customerName || !productId || !Number.isFinite(quantity) || quantity <= 0) {
      if (msg) {
        msg.className = "auth-message error";
        msg.textContent = "Enter customer name, select a product, and provide quantity above 0.";
      }
      return;
    }

    const editingId = String(saveBtn.dataset.editingId || "").trim();
    const ok = editingId
      ? updateReturnEntry(date, editingId, { customerName, productId, quantity, waybillNumber })
      : !!addReturnEntry(date, { customerName, productId, quantity, waybillNumber });

    if (!ok) {
      if (msg) {
        msg.className = "auth-message error";
        msg.textContent = "Could not save goods returned entry. Please check all fields.";
      }
      return;
    }

    if (msg) {
      msg.className = "auth-message ok";
      msg.textContent = editingId ? "Goods returned entry updated." : "Goods returned entry saved.";
    }
    resetForm();
    renderReturnsSheet();
  });

  cancelBtn?.addEventListener("click", () => {
    resetForm();
    if (msg) {
      msg.className = "auth-message";
      msg.textContent = "";
    }
  });

  rows.querySelectorAll("button[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.dataset.entryId;
      if (!entryId) return;

      const action = button.dataset.action;
      if (action === "delete") {
        deleteReturnEntry(date, entryId);
        renderReturnsSheet();
        return;
      }

      const entry = entries.find((item) => item.id === entryId);
      if (!entry) return;

      if (customerNameInput) customerNameInput.value = entry.customerName || "";
      if (productInput) productInput.value = entry.productId || "";
      if (quantityInput) quantityInput.value = String(entry.quantity || "");
      if (waybillInput) waybillInput.value = entry.waybillNumber || "";
      if (saveBtn) {
        saveBtn.textContent = "Update";
        saveBtn.dataset.editingId = entry.id;
      }
      if (cancelBtn) cancelBtn.style.display = "inline-block";
      if (msg) {
        msg.className = "auth-message";
        msg.textContent = "Editing selected goods returned entry.";
      }
    });
  });
}

function initReturnsPage() {
  initProtectedPage();
  renderReturnsSheet();

  const printBtn = document.getElementById("printReturnsBtn");
  printBtn?.addEventListener("click", () => {
    printSection("returnsTableHost", "Goods Returned Sheet");
  });
}
