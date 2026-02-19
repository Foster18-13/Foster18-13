function renderBalanceTable() {
  const tbody = document.querySelector("#balanceTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

  if (!data.products.length) {
    tbody.innerHTML = `<tr><td colspan="9">No products found. Add products from the Products page.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.products
    .map((product) => {
      const existing = dayStore.balance[product.id] || {};
      const loading = getLoadingForProduct(dayStore, product.id);
      const goodsReceived = getGoodsReceivedForProduct(dayStore, product.id);
      const balanceValue = computeBalanceValue({
        opening: existing.opening,
        returns: existing.returns,
        goodsReceived,
        loading,
        damages: existing.damages
      });
      const remarkValue = asNumber(existing.closing) - asNumber(balanceValue);

      return `
        <tr data-product-id="${product.id}">
          <td>${product.name}</td>
          <td><input class="input" type="number" min="0" step="any" data-field="opening" value="${existing.opening ?? ""}" /></td>
          <td><input class="input" type="number" min="0" step="any" data-field="returns" value="${existing.returns ?? ""}" /></td>
          <td><input class="input" type="number" readonly value="${goodsReceived}" /></td>
          <td><input class="input" type="number" min="0" step="any" data-field="damages" value="${existing.damages ?? ""}" /></td>
          <td><input class="input" type="number" readonly value="${loading}" /></td>
          <td><input class="input" type="number" readonly data-field="balance" value="${balanceValue}" /></td>
          <td><input class="input" type="number" min="0" step="any" data-field="closing" value="${existing.closing ?? ""}" /></td>
          <td><input class="input" type="number" readonly data-field="remark" value="${remarkValue}" /></td>
        </tr>
      `;
    })
    .join("");

  attachBalanceCalculations();
}

function attachBalanceCalculations() {
  document.querySelectorAll("#balanceTable tbody tr").forEach((row) => {
    const openingInput = row.querySelector('[data-field="opening"]');
    const returnsInput = row.querySelector('[data-field="returns"]');
    const damagesInput = row.querySelector('[data-field="damages"]');
    const balanceInput = row.querySelector('[data-field="balance"]');
    const closingInput = row.querySelector('[data-field="closing"]');
    const remarkInput = row.querySelector('[data-field="remark"]');
    const goodsInput = row.querySelector("td:nth-child(4) input");
    const loadingInput = row.querySelector("td:nth-child(6) input");

    const recalc = () => {
      const balanceValue = computeBalanceValue({
        opening: openingInput.value,
        returns: returnsInput.value,
        goodsReceived: goodsInput.value,
        loading: loadingInput.value,
        damages: damagesInput.value
      });
      balanceInput.value = balanceValue;
      remarkInput.value = asNumber(closingInput.value) - asNumber(balanceValue);
    };

    [openingInput, returnsInput, damagesInput, closingInput].forEach((input) => {
      input.addEventListener("input", recalc);
    });
  });
}

function saveBalanceSheet() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = ensureDayStore(data, date);

  document.querySelectorAll("#balanceTable tbody tr").forEach((row) => {
    const productId = row.dataset.productId;
    dayStore.balance[productId] = {
      opening: row.querySelector('[data-field="opening"]').value,
      returns: row.querySelector('[data-field="returns"]').value,
      damages: row.querySelector('[data-field="damages"]').value,
      closing: row.querySelector('[data-field="closing"]').value,
      remark: row.querySelector('[data-field="remark"]').value
    };
  });

  saveData(data);
  setStatus("Balance sheet saved.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderBalanceTable();
  const saveButton = document.getElementById("saveBalance");
  const exportButton = document.getElementById("exportBalance");
  if (saveButton) saveButton.addEventListener("click", saveBalanceSheet);
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("balanceTable", "balance_sheet");
    });
  }
});
