function renderDashboard() {
  const products = readProducts();
  const date = selectedDate();
  const customerEntries = readCustomerEntries(date);
  const returnsEntries = readReturnsEntries(date);
  const purchases = readPurchases(date);

  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);
  const productById = new Map(products.map((product) => [product.id, product.name]));

  const totalLoading = products.reduce((sum, product) => sum + loadingByProduct(date, product.id), 0);
  const totalReturns = returnsEntries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const totalGoodsReceived = purchases.reduce((sum, item) => sum + Number(item.pallets || 0), 0);
  const movedProducts = products.filter((product) => {
    return loadingByProduct(date, product.id) > 0
      || goodsReceivedByProduct(date, product.id) > 0
      || getBalanceField(date, "returns", product.id) > 0;
  }).length;

  const summaryText = document.getElementById("dashboardSummaryText");
  if (summaryText) {
    summaryText.textContent = `Selected date ${date} for ${String(getSector() || "-").toUpperCase()} sector with ${formatNumber(movedProducts)} products showing movement.`;
  }

  const assignText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  assignText("metricProductsCount", formatNumber(products.length));
  assignText("metricCustomerEntries", formatNumber(customerEntries.length));
  assignText("metricTotalLoading", formatNumber(totalLoading));
  assignText("metricReturnsTotal", formatNumber(totalReturns));
  assignText("metricPurchasesCount", formatNumber(purchases.length));
  assignText("metricGoodsReceived", formatNumber(totalGoodsReceived));

  const statusList = document.getElementById("dashboardStatusList");
  if (statusList) {
    const statuses = [
      {
        title: "Customer Entry Coverage",
        detail: customerEntries.length > 0
          ? `${formatNumber(customerEntries.length)} customer transactions captured.`
          : "No customer transactions captured yet.",
        state: customerEntries.length > 0 ? "ok" : "pending",
        label: customerEntries.length > 0 ? "Active" : "Pending"
      },
      {
        title: "Returns Logging",
        detail: returnsEntries.length > 0
          ? `${formatNumber(totalReturns)} units returned across ${formatNumber(returnsEntries.length)} entries.`
          : "No returns have been logged yet.",
        state: returnsEntries.length > 0 ? "ok" : "pending",
        label: returnsEntries.length > 0 ? "Updated" : "Pending"
      },
      {
        title: "Purchase Receipts",
        detail: purchases.length > 0
          ? `${formatNumber(totalGoodsReceived)} pallets received from ${formatNumber(purchases.length)} purchase records.`
          : "No purchases logged for this date.",
        state: purchases.length > 0 ? "ok" : "pending",
        label: purchases.length > 0 ? "Received" : "Pending"
      },
      {
        title: "Movement Coverage",
        detail: movedProducts > 0
          ? `${formatNumber(movedProducts)} products show loading, returns, or goods received.`
          : "No product movement recorded yet.",
        state: movedProducts > 0 ? "ok" : "pending",
        label: movedProducts > 0 ? "Tracked" : "Pending"
      }
    ];

    statusList.innerHTML = statuses.map((item) => `
      <div class="status-row">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
        </div>
        <span class="status-badge ${item.state}">${escapeHtml(item.label)}</span>
      </div>
    `).join("");
  }

  const activityList = document.getElementById("dashboardActivityList");
  if (activityList) {
    const recentActivities = [
      ...customerEntries.map((entry) => ({
        type: "Customer Entry",
        title: entry.customerName,
        detail: `${productById.get(entry.productId) || "Unknown Product"} | Waybill ${entry.waybillNumber || "-"}`,
        metric: `Qty ${formatNumber(entry.quantity)}`,
        time: entry.createdAt || 0
      })),
      ...returnsEntries.map((entry) => ({
        type: "Return Entry",
        title: entry.customerName,
        detail: `${productById.get(entry.productId) || "Unknown Product"} | Waybill ${entry.waybillNumber || "-"}`,
        metric: `Qty ${formatNumber(entry.quantity)}`,
        time: entry.createdAt || 0
      })),
      ...purchases.map((entry) => ({
        type: "Purchase Entry",
        title: productById.get(entry.productId) || "Unknown Product",
        detail: `Waybill ${entry.waybill || "-"} | Batch ${entry.batchCode || "-"}`,
        metric: `Pallets ${formatNumber(entry.pallets)}`,
        time: Date.parse(entry.dateReceived || date) || 0
      }))
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);

    activityList.innerHTML = recentActivities.length === 0
      ? '<div class="empty-state">No activity has been recorded for the selected date yet.</div>'
      : recentActivities.map((item) => `
          <div class="activity-item">
            <div>
              <strong>${escapeHtml(item.type)}: ${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.detail)}</p>
            </div>
            <div class="activity-meta">
              <strong>${escapeHtml(item.metric)}</strong>
              <div>${escapeHtml(item.time ? new Date(item.time).toLocaleTimeString() : "")}</div>
            </div>
          </div>
        `).join("");
  }

  const movementList = document.getElementById("dashboardMovementList");
  if (movementList) {
    const ranked = products
      .map((product) => {
        const loading = loadingByProduct(date, product.id);
        const returnsQty = getBalanceField(date, "returns", product.id);
        const received = goodsReceivedByProduct(date, product.id);
        return {
          name: product.name,
          loading,
          returnsQty,
          received,
          combined: loading + returnsQty + received
        };
      })
      .filter((item) => item.combined > 0)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 5);

    movementList.innerHTML = ranked.length === 0
      ? '<div class="empty-state">Movement highlights will appear here after entries are added.</div>'
      : ranked.map((item) => `
          <div class="movement-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <p>Loading ${formatNumber(item.loading)} | Returns ${formatNumber(item.returnsQty)} | Received ${formatNumber(item.received)}</p>
            </div>
            <div class="movement-meta">
              <strong>${formatNumber(item.combined)}</strong>
              <div>Total movement</div>
            </div>
          </div>
        `).join("");
  }
}

function initDashboardPage() {
  initProtectedPage();
  renderDashboard();
}