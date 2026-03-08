function renderDamageProductOptions() {
  const productSelect = document.getElementById("productIdDamage");
  const data = loadData();
  const currentDate = document.getElementById('workingDate')?.value || todayISO();
  const activeProducts = getActiveProductsForDate(data, currentDate);
  productSelect.innerHTML = '<option value="">-- Select product --</option>' + createProductOptions(activeProducts);
}

function renderDamagesTable() {
  const tbody = document.querySelector("#damagesTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  // Initialize damages array if it doesn't exist
  if (!dayStore.damageReasons) {
    dayStore.damageReasons = [];
    saveData(data);
  }

  if (!dayStore.damageReasons.length) {
    tbody.innerHTML = `<tr><td colspan="6">No damage records for this date.</td></tr>`;
    return;
  }

  tbody.innerHTML = dayStore.damageReasons
    .map((damage) => {
      const product = getProductById(data, damage.productId);
      return `
        <tr>
          <td>${damage.damageDate}</td>
          <td>${product ? product.name : "Unknown Product"}</td>
          <td><strong>${damage.quantity}</strong></td>
          <td><span style="padding: 4px 8px; background: #dc3545; color: white; border-radius: 4px; font-size: 11px;">${damage.reason}</span></td>
          <td style="max-width: 250px;">${damage.notes || '-'}</td>
          <td><button class="button button-danger" data-delete-id="${damage.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteDamage(button.dataset.deleteId));
  });
}

function addDamageRecord(event) {
  event.preventDefault();

  const productId = document.getElementById("productIdDamage").value;
  const quantity = Number.parseFloat(document.getElementById("damageQuantity").value);
  const reason = document.getElementById("damageReason").value;
  const damageDate = document.getElementById("damageDate").value;
  const notes = document.getElementById("damageNotes").value.trim();

  if (!productId || !quantity || !reason || !damageDate) {
    setStatus("All required fields must be filled.", "error");
    return;
  }

  if (quantity <= 0) {
    setStatus("Quantity must be greater than zero.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const product = getProductById(data, productId);

  if (!dayStore.damageReasons) {
    dayStore.damageReasons = [];
  }

  dayStore.damageReasons.push({
    id: generateId("damage"),
    productId,
    quantity,
    reason,
    damageDate,
    notes
  });

  saveData(data);
  addAuditLog("Damage record added", {
    productId,
    productName: product?.name || "",
    quantity,
    reason,
    damageDate
  });
  event.target.reset();
  document.getElementById("damageDate").value = date;
  renderDamagesTable();
  setStatus("Damage record added.", "ok");
}

function deleteDamage(id) {
  if (!confirm("Delete this damage record?")) return;

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const damage = (dayStore.damageReasons || []).find((d) => d.id === id);
  const product = damage ? getProductById(data, damage.productId) : null;

  dayStore.damageReasons = dayStore.damageReasons.filter((d) => d.id !== id);
  saveData(data);
  addAuditLog("Damage record deleted", {
    productId: damage?.productId || "",
    productName: product?.name || "",
    quantity: damage?.quantity || "",
    reason: damage?.reason || ""
  });
  renderDamagesTable();
  setStatus("Damage record deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderDamageProductOptions();
  renderDamagesTable();
  
  const date = getSelectedDate();
  document.getElementById("damageDate").value = date;
  
  document.getElementById("damageForm").addEventListener("submit", addDamageRecord);
});
