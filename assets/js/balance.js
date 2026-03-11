function renderBalanceTable() {
  const tbody = document.querySelector("#balanceTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const selectedShift = getSelectedShift();
  const dayStore = getShiftStore(data, date);
  const activeProducts = getActiveProductsForDate(data, date);

  if (!activeProducts.length) {
    tbody.innerHTML = `<tr><td colspan="9">No products available for this date.</td></tr>`;
    return;
  }

  // Sort products alphabetically by name
  const sortedProducts = [...activeProducts].sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  tbody.innerHTML = sortedProducts
    .map((product) => {
      const existing = dayStore.balance[product.id] || {};
      const openingValue =
        existing.opening === null || existing.opening === undefined || existing.opening === ""
          ? getPreviousClosingStock(data, date, product.id, selectedShift)
          : existing.opening;
      const loading = getLoadingForProduct(dayStore, product.id);
      const goodsReceived = getGoodsReceivedForProduct(dayStore, product.id);
      const balanceValue = computeBalanceValue({
        opening: openingValue,
        returns: existing.returns,
        goodsReceived,
        loading,
        damages: existing.damages
      });
      const remarkValue = asNumber(existing.closing) - asNumber(balanceValue);

      return `
        <tr data-product-id="${product.id}">
          <td>${product.name}</td>
          <td><input class="input" type="number" min="0" step="any" data-field="opening" value="${openingValue ?? ""}" /></td>
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

    const applyRemarkFlag = (remarkValue) => {
      if (Math.abs(remarkValue) > 10) {
        remarkInput.style.backgroundColor = '#fff3cd';
        remarkInput.title = 'Variance over 10 detected';
      } else {
        remarkInput.style.backgroundColor = '';
        remarkInput.title = '';
      }
    };

    const recalc = () => {
      const balanceValue = computeBalanceValue({
        opening: openingInput.value,
        returns: returnsInput.value,
        goodsReceived: goodsInput.value,
        loading: loadingInput.value,
        damages: damagesInput.value
      });
      balanceInput.value = balanceValue;
      const remarkValue = asNumber(closingInput.value) - asNumber(balanceValue);
      remarkInput.value = remarkValue;

      // Real-time validation styling
      if (asNumber(closingInput.value) < 0) {
        closingInput.style.borderColor = '#dc3545';
        closingInput.title = 'Closing stock cannot be negative';
      } else {
        closingInput.style.borderColor = '';
        closingInput.title = '';
      }

      applyRemarkFlag(remarkValue);
    };

    applyRemarkFlag(asNumber(remarkInput.value));

    // Prevent negative values
    [openingInput, returnsInput, damagesInput, closingInput].forEach((input) => {
      input.addEventListener("input", (e) => {
        if (asNumber(e.target.value) < 0) {
          e.target.value = 0;
        }
        recalc();
      });
    });
  });
}

function saveBalanceSheet() {
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const warnings = [];

  document.querySelectorAll("#balanceTable tbody tr").forEach((row) => {
    const productId = row.dataset.productId;
    const opening = asNumber(row.querySelector('[data-field="opening"]').value);
    const returns = asNumber(row.querySelector('[data-field="returns"]').value);
    const damages = asNumber(row.querySelector('[data-field="damages"]').value);
    const closing = asNumber(row.querySelector('[data-field="closing"]').value);
    const balance = asNumber(row.querySelector('[data-field="balance"]').value);
    const productName = row.querySelector("td:first-child").textContent.trim();

    if (returns > opening + asNumber(row.querySelector("td:nth-child(4) input").value)) {
      warnings.push(`${productName}: Goods Returned looks high compared to available stock.`);
    }
    if (damages > opening + returns) {
      warnings.push(`${productName}: Goods Damaged looks high for the day.`);
    }
    if (closing < 0) {
      warnings.push(`${productName}: Closing stock cannot be negative.`);
    }
    if (Math.abs(closing - balance) > 0 && Math.abs(closing - balance) > 1000000) {
      warnings.push(`${productName}: Very large difference between closing and balance.`);
    }

    dayStore.balance[productId] = {
      opening: row.querySelector('[data-field="opening"]').value,
      returns: row.querySelector('[data-field="returns"]').value,
      damages: row.querySelector('[data-field="damages"]').value,
      closing: row.querySelector('[data-field="closing"]').value,
      remark: row.querySelector('[data-field="remark"]').value
    };
  });

  saveData(data);
  addAuditLog("Balance sheet saved", {
    warnings: warnings.length,
    products: document.querySelectorAll("#balanceTable tbody tr").length
  });
  if (warnings.length) {
    setStatus(`Saved with ${warnings.length} warning(s).`, "error");
  } else {
    setStatus("Balance sheet saved.", "ok");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const shiftSelector = document.getElementById("shiftSelector");
  if (shiftSelector) {
    shiftSelector.value = getSelectedShift();
    shiftSelector.addEventListener("change", (e) => {
      setSelectedShift(e.target.value);
      renderBalanceTable();
    });
  }

  renderBalanceTable();
  
  // Initialize auto-save
  if (typeof initAutoSave === 'function') {
    initAutoSave(saveBalanceSheet);
    trackInputChanges('#balanceTable');
  }
  
  const saveButton = document.getElementById("saveBalance");
  const copyPrevDayButton = document.getElementById("copyPrevDay");
  const exportButton = document.getElementById("exportBalance");
  const exportPdfButton = document.getElementById("exportBalancePdf");
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      await withLoadingFeedback(saveButton, "Saving...", () => saveBalanceSheet());
    });
  }
  if (copyPrevDayButton) {
    copyPrevDayButton.addEventListener("click", async () => {
      if (!confirm("Copy previous day's data to today? This will overwrite current data.")) return;
      await withLoadingFeedback(copyPrevDayButton, "Copying...", () => {
        const data = loadData();
        const currentDate = getSelectedDate();
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const currentDayStore = getShiftStore(data, currentDate);
        const prevDayStore = getShiftStore(data, prevDateStr);
        
        // Copy balance data
        currentDayStore.balance = structuredClone(prevDayStore.balance);
        // Copy recording data
        currentDayStore.recording = structuredClone(prevDayStore.recording);
        // Copy recording columns
        currentDayStore.recordingColumns = prevDayStore.recordingColumns;
        // Copy purchases
        currentDayStore.purchases = structuredClone(prevDayStore.purchases || []);
        
        saveData(data);
        addAuditLog("Data copied from previous day", {
          fromDate: prevDateStr,
          toDate: currentDate,
          shift: getSelectedShift()
        });
        renderBalanceTable();
        setStatus(`Data copied from ${prevDateStr}`, "ok");
      });
    });
  }
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      exportTableAsCsv("balanceTable", "balance_sheet");
    });
  }
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("balanceTable", "Daily Balance Sheet", "balance_sheet");
    });
  }
});
