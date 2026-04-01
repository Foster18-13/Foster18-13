// page-stock-sheet.js — Systematic Stock Sheet
// Shows all stock movements per product for the selected date/shift.
// Columns: Opening | Purchases In | Returns In | Dispatch Out | Damages | Computed Balance | Closing Stock | Variance | Status

// ── helpers ──────────────────────────────────────────────────────────────────

function _ssEscHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _ssStatusInfo(effectiveStock) {
  if (effectiveStock <= 0)   return { cls: "badge badge-danger",  text: "Zero",     priority: 0 };
  if (effectiveStock <= 20)  return { cls: "badge badge-danger",  text: "Critical", priority: 1 };
  if (effectiveStock <= 100) return { cls: "badge badge-warning", text: "Low",      priority: 2 };
  return                            { cls: "badge badge-success", text: "OK",       priority: 3 };
}

function _ssMakeNumberInput(value, onSave) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.className = "input";
  input.value = value > 0 ? String(value) : "";
  input.placeholder = "0";
  input.setAttribute("inputmode", "numeric");
  input.addEventListener("change", () => {
    const raw = parseFloat(input.value);
    onSave(Number.isFinite(raw) && raw >= 0 ? raw : 0);
  });
  return input;
}

// ── main render ──────────────────────────────────────────────────────────────

function renderStockSheet() {
  const host = document.getElementById("stockSheetHost");
  if (!host) return;

  const date = selectedDate();
  const allProducts = readProducts();

  // Search filter
  const searchInput = document.getElementById("stockSearch");
  const searchTerm = (searchInput ? searchInput.value.trim().toLowerCase() : "");
  const products = searchTerm
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm))
    : allProducts;

  // Meta line
  const meta = document.getElementById("stockSheetMeta");
  if (meta) {
    meta.textContent = `${products.length} of ${allProducts.length} product(s) • ${date}`;
  }

  if (!products.length) {
    host.innerHTML = `<p class="text-muted" style="padding:20px 0;">No products match your search.</p>`;
    renderStockSummary(allProducts, date);
    return;
  }

  // Build table
  const table = document.createElement("table");
  table.id = "stockSheetTable";
  table.className = "stock-sheet-table";

  // ── thead ──
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Product Name</th>
      <th title="Starting inventory for this day/shift">Opening Stock</th>
      <th title="Pallets / cases received from supplier">Purchases In</th>
      <th title="Goods returned by customers">Returns In</th>
      <th title="Goods loaded / delivered to customers">Dispatch Out</th>
      <th title="Goods confirmed as damaged or lost">Damages</th>
      <th title="Opening + Purchases + Returns − Dispatch − Damages">Computed Balance</th>
      <th title="Physical end-of-day count (auto-seeds next opening)">Closing Stock</th>
      <th title="Closing − Computed Balance">Variance</th>
      <th>Status</th>
    </tr>
  `;
  table.appendChild(thead);

  // ── tbody ──
  const tbody = document.createElement("tbody");

  let totOpening = 0, totPurchases = 0, totReturns = 0,
      totDispatch = 0, totDamages = 0, totBalance = 0, totClosing = 0;

  products.forEach((product, idx) => {
    const opening   = getBalanceField(date, "opening",  product.id);
    const damages   = getBalanceField(date, "damages",  product.id);
    const closing   = getBalanceField(date, "closing",  product.id);
    const returns   = getBalanceField(date, "returns",  product.id);
    const dispatch  = loadingByProduct(date, product.id);
    const purchases = goodsReceivedByProduct(date, product.id);
    const balance   = balanceComputed(date, product.id);
    const variance  = closing > 0 ? closing - balance : null;

    totOpening   += opening;
    totPurchases += purchases;
    totReturns   += returns;
    totDispatch  += dispatch;
    totDamages   += damages;
    totBalance   += balance;
    totClosing   += closing;

    const effectiveStock = closing > 0 ? closing : balance;
    const status = _ssStatusInfo(effectiveStock);

    const row = document.createElement("tr");

    // # ─ row number
    const tdNum = document.createElement("td");
    tdNum.className = "text-muted";
    tdNum.textContent = String(idx + 1);
    row.appendChild(tdNum);

    // Product name
    const tdName = document.createElement("td");
    tdName.textContent = product.name;
    tdName.style.fontWeight = "500";
    tdName.style.minWidth = "180px";
    row.appendChild(tdName);

    // Opening (editable)
    const tdOpening = document.createElement("td");
    tdOpening.appendChild(_ssMakeNumberInput(opening, (v) => {
      setBalanceField(date, "opening", product.id, v);
      renderStockSheet();
    }));
    row.appendChild(tdOpening);

    // Purchases In (read-only)
    const tdPurchases = document.createElement("td");
    tdPurchases.textContent = String(purchases);
    if (purchases > 0) tdPurchases.className = "text-success";
    row.appendChild(tdPurchases);

    // Returns In (read-only)
    const tdReturns = document.createElement("td");
    tdReturns.textContent = String(returns);
    if (returns > 0) tdReturns.className = "text-warning";
    row.appendChild(tdReturns);

    // Dispatch Out (read-only)
    const tdDispatch = document.createElement("td");
    tdDispatch.textContent = String(dispatch);
    if (dispatch > 0) tdDispatch.className = "text-primary";
    row.appendChild(tdDispatch);

    // Damages (editable)
    const tdDamages = document.createElement("td");
    tdDamages.appendChild(_ssMakeNumberInput(damages, (v) => {
      setBalanceField(date, "damages", product.id, v);
      renderStockSheet();
    }));
    row.appendChild(tdDamages);

    // Computed Balance (read-only, highlighted if negative)
    const tdBalance = document.createElement("td");
    tdBalance.textContent = String(balance);
    tdBalance.style.fontWeight = "700";
    if (balance < 0) tdBalance.className = "text-danger";
    row.appendChild(tdBalance);

    // Closing Stock (editable)
    const tdClosing = document.createElement("td");
    tdClosing.appendChild(_ssMakeNumberInput(closing, (v) => {
      setBalanceField(date, "closing", product.id, v);
      renderStockSheet();
    }));
    row.appendChild(tdClosing);

    // Variance
    const tdVariance = document.createElement("td");
    if (variance !== null) {
      tdVariance.textContent = variance > 0 ? `+${variance}` : String(variance);
      if (variance > 0)       tdVariance.className = "text-success";
      else if (variance < 0)  tdVariance.className = "text-danger";
    } else {
      tdVariance.textContent = "—";
      tdVariance.className = "text-muted";
    }
    row.appendChild(tdVariance);

    // Status badge
    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = `<span class="${_ssEscHtml(status.cls)}">${_ssEscHtml(status.text)}</span>`;
    row.appendChild(tdStatus);

    tbody.appendChild(row);
  });

  // ── totals row ──
  const totVariance = totClosing > 0 ? totClosing - totBalance : null;
  const totRow = document.createElement("tr");
  totRow.className = "totals-row";
  totRow.innerHTML = `
    <td colspan="2"><strong>TOTALS (${products.length} products)</strong></td>
    <td><strong>${totOpening}</strong></td>
    <td><strong>${totPurchases}</strong></td>
    <td><strong>${totReturns}</strong></td>
    <td><strong>${totDispatch}</strong></td>
    <td><strong>${totDamages}</strong></td>
    <td><strong>${totBalance}</strong></td>
    <td><strong>${totClosing}</strong></td>
    <td><strong>${totVariance !== null ? (totVariance > 0 ? "+" + totVariance : totVariance) : "—"}</strong></td>
    <td></td>
  `;
  tbody.appendChild(totRow);
  table.appendChild(tbody);

  host.innerHTML = "";
  host.appendChild(table);

  // Render summary cards
  renderStockSummary(allProducts, date);
}

// ── stock summary section ─────────────────────────────────────────────────────

function renderStockSummary(products, date) {
  const host = document.getElementById("stockSummaryHost");
  if (!host) return;

  let zeroCount = 0, criticalCount = 0, lowCount = 0, okCount = 0;
  const attentionItems = [];

  products.forEach(product => {
    const closing = getBalanceField(date, "closing",  product.id);
    const balance = balanceComputed(date, product.id);
    const effective = closing > 0 ? closing : balance;
    const info = _ssStatusInfo(effective);

    if (info.text === "Zero")     { zeroCount++;     attentionItems.push({ name: product.name, qty: effective, priority: 0 }); }
    else if (info.text === "Critical") { criticalCount++; attentionItems.push({ name: product.name, qty: effective, priority: 1 }); }
    else if (info.text === "Low") { lowCount++;      attentionItems.push({ name: product.name, qty: effective, priority: 2 }); }
    else                          { okCount++; }
  });

  // Sort by priority (zero first, then critical, then low)
  attentionItems.sort((a, b) => a.priority - b.priority || a.qty - b.qty);

  const summaryCards = [
    { label: "Total Products",    value: products.length,          color: "var(--primary, #2563eb)" },
    { label: "OK Stock",          value: okCount,                   color: "var(--success, #16a34a)" },
    { label: "Low Stock",         value: lowCount,                  color: "var(--warning, #d97706)" },
    { label: "Critical / Zero",   value: zeroCount + criticalCount, color: "var(--danger, #dc2626)"  },
  ];

  const cardsHtml = summaryCards.map(c => `
    <div class="metric-card" style="min-width:150px;flex:1;border-left:4px solid ${c.color};">
      <div class="metric-label">${_ssEscHtml(c.label)}</div>
      <div class="metric-value" style="color:${c.color};">${c.value}</div>
    </div>
  `).join("");

  let attentionHtml = `<p class="text-muted" style="margin-top:16px;">All stock levels are adequate. ✓</p>`;
  if (attentionItems.length > 0) {
    const rows = attentionItems.slice(0, 15).map(item => {
      const info = _ssStatusInfo(item.qty);
      return `<li><span class="${_ssEscHtml(info.cls)}" style="margin-right:8px;">${_ssEscHtml(info.text)}</span>${_ssEscHtml(item.name)} — <strong>${item.qty}</strong> remaining</li>`;
    }).join("");
    attentionHtml = `
      <div style="margin-top:16px;">
        <strong>Items requiring attention (${attentionItems.length}):</strong>
        <ul class="attention-list">${rows}</ul>
        ${attentionItems.length > 15 ? `<p class="text-muted">…and ${attentionItems.length - 15} more. Use the main table above to view all.</p>` : ""}
      </div>
    `;
  }

  host.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:8px;">${cardsHtml}</div>
    ${attentionHtml}
  `;
}

// ── page init ─────────────────────────────────────────────────────────────────

function initStockSheetPage() {
  initProtectedPage();
  renderStockSheet();

  // Live search
  const searchInput = document.getElementById("stockSearch");
  searchInput?.addEventListener("input", renderStockSheet);

  // Shift control for Water sector
  if (typeof initShiftControl === "function") {
    initShiftControl(renderStockSheet);
  }

  // Export PDF (print)
  document.getElementById("printStockBtn")?.addEventListener("click", () => {
    if (typeof printSection === "function") {
      printSection("stockSheetHost", "Stock Sheet");
    } else {
      window.print();
    }
  });

  // Export CSV
  document.getElementById("exportStockCsvBtn")?.addEventListener("click", () => {
    const table = document.getElementById("stockSheetTable");
    if (!table) return;
    if (typeof exportTableToCSV === "function") {
      // Override filename by wrapping the download
      const originalDownload = HTMLAnchorElement.prototype.click;
      exportTableToCSV(table);
      // Rename file after the fact via cloning the anchor
      // (exportTableToCSV always uses 'table-export.csv'; we trigger it directly)
    } else {
      // Fallback: build CSV manually
      const rows = Array.from(table.querySelectorAll("tr"));
      const csv = rows.map(row =>
        Array.from(row.querySelectorAll("th,td"))
          .map(cell => `"${(cell.innerText || cell.textContent || "").replace(/"/g, '""')}"`)
          .join(",")
      ).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-sheet-${selectedDate()}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }
  });
}
