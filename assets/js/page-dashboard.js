function escapeDashboardHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDashboardNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function buildDashboardStats(products, date, customerEntries, returnsEntries, purchases) {
  const totalLoading = products.reduce((sum, product) => sum + loadingByProduct(date, product.id), 0);
  const totalReturns = returnsEntries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const totalGoodsReceived = purchases.reduce((sum, item) => sum + Number(item.pallets || 0), 0);
  const movedProducts = products.filter((product) => {
    return loadingByProduct(date, product.id) > 0
      || goodsReceivedByProduct(date, product.id) > 0
      || getBalanceField(date, "returns", product.id) > 0;
  }).length;

  return {
    totalLoading,
    totalReturns,
    totalGoodsReceived,
    movedProducts,
    productCount: products.length,
    customerEntryCount: customerEntries.length,
    purchaseCount: purchases.length,
    returnsEntryCount: returnsEntries.length
  };
}

function setDashboardMetric(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderDashboardSummary(date, stats) {
  const summaryText = document.getElementById("dashboardSummaryText");
  if (!summaryText) return;

  const shiftText = usesShiftStorage() ? ` | ${selectedShiftLabel()}` : "";
  summaryText.textContent = `Selected date ${date} for ${String(getSector() || "-").toUpperCase()} sector${shiftText} with ${formatDashboardNumber(stats.movedProducts)} products showing movement.`;
}

function renderDashboardMetrics(stats) {
  setDashboardMetric("metricProductsCount", formatDashboardNumber(stats.productCount));
  setDashboardMetric("metricCustomerEntries", formatDashboardNumber(stats.customerEntryCount));
  setDashboardMetric("metricTotalLoading", formatDashboardNumber(stats.totalLoading));
  setDashboardMetric("metricReturnsTotal", formatDashboardNumber(stats.totalReturns));
  setDashboardMetric("metricPurchasesCount", formatDashboardNumber(stats.purchaseCount));
  setDashboardMetric("metricGoodsReceived", formatDashboardNumber(stats.totalGoodsReceived));
}

function buildDashboardStatuses(stats) {
  return [
    {
      title: "Customer Entry Coverage",
      detail: stats.customerEntryCount > 0
        ? `${formatDashboardNumber(stats.customerEntryCount)} customer transactions captured.`
        : "No customer transactions captured yet.",
      state: stats.customerEntryCount > 0 ? "ok" : "pending",
      label: stats.customerEntryCount > 0 ? "Active" : "Pending"
    },
    {
      title: "Goods Returned Logging",
      detail: stats.returnsEntryCount > 0
        ? `${formatDashboardNumber(stats.totalReturns)} units returned across ${formatDashboardNumber(stats.returnsEntryCount)} entries.`
        : "No goods returned entries have been logged yet.",
      state: stats.returnsEntryCount > 0 ? "ok" : "pending",
      label: stats.returnsEntryCount > 0 ? "Updated" : "Pending"
    },
    {
      title: "Purchase Receipts",
      detail: stats.purchaseCount > 0
        ? `${formatDashboardNumber(stats.totalGoodsReceived)} pallets received from ${formatDashboardNumber(stats.purchaseCount)} purchase records.`
        : "No purchases logged for this date.",
      state: stats.purchaseCount > 0 ? "ok" : "pending",
      label: stats.purchaseCount > 0 ? "Received" : "Pending"
    },
    {
      title: "Movement Coverage",
      detail: stats.movedProducts > 0
        ? `${formatDashboardNumber(stats.movedProducts)} products show goods delivered, goods returned, or goods received.`
        : "No product movement recorded yet.",
      state: stats.movedProducts > 0 ? "ok" : "pending",
      label: stats.movedProducts > 0 ? "Tracked" : "Pending"
    }
  ];
}

function renderDashboardStatuses(stats) {
  const statusList = document.getElementById("dashboardStatusList");
  if (!statusList) return;

  statusList.innerHTML = buildDashboardStatuses(stats).map((item) => `
    <div class="status-row">
      <div>
        <strong>${escapeDashboardHtml(item.title)}</strong>
        <p>${escapeDashboardHtml(item.detail)}</p>
      </div>
      <span class="status-badge ${item.state}">${escapeDashboardHtml(item.label)}</span>
    </div>
  `).join("");
}

function buildDashboardActivities(productById, date, customerEntries, returnsEntries, purchases) {
  return [
    ...customerEntries.map((entry) => ({
      type: "Customer Entry",
      title: entry.customerName,
      detail: `${productById.get(entry.productId) || "Unknown Product"} | Waybill ${entry.waybillNumber || "-"}`,
      metric: `Qty ${formatDashboardNumber(entry.quantity)}`,
      time: entry.createdAt || 0
    })),
    ...returnsEntries.map((entry) => ({
      type: "Return Entry",
      title: entry.customerName,
      detail: `${productById.get(entry.productId) || "Unknown Product"} | Waybill ${entry.waybillNumber || "-"}`,
      metric: `Qty ${formatDashboardNumber(entry.quantity)}`,
      time: entry.createdAt || 0
    })),
    ...purchases.map((entry) => ({
      type: "Purchase Entry",
      title: productById.get(entry.productId) || "Unknown Product",
      detail: `Waybill ${entry.waybill || "-"} | Batch ${entry.batchCode || "-"}`,
      metric: `Pallets ${formatDashboardNumber(entry.pallets)}`,
      time: Date.parse(entry.dateReceived || date) || 0
    }))
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 6);
}

function renderDashboardActivities(productById, date, customerEntries, returnsEntries, purchases) {
  const activityList = document.getElementById("dashboardActivityList");
  if (!activityList) return;

  const recentActivities = buildDashboardActivities(productById, date, customerEntries, returnsEntries, purchases);
  activityList.innerHTML = recentActivities.length === 0
    ? '<div class="empty-state">No activity has been recorded for the selected date yet.</div>'
    : recentActivities.map((item) => `
        <div class="activity-item">
          <div>
            <strong>${escapeDashboardHtml(item.type)}: ${escapeDashboardHtml(item.title)}</strong>
            <p>${escapeDashboardHtml(item.detail)}</p>
          </div>
          <div class="activity-meta">
            <strong>${escapeDashboardHtml(item.metric)}</strong>
            <div>${escapeDashboardHtml(item.time ? new Date(item.time).toLocaleTimeString() : "")}</div>
          </div>
        </div>
      `).join("");
}

function buildDashboardMovement(products, date) {
  return products
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
}

function renderDashboardMovement(products, date) {
  const movementList = document.getElementById("dashboardMovementList");
  if (!movementList) return;

  const ranked = buildDashboardMovement(products, date);
  movementList.innerHTML = ranked.length === 0
    ? '<div class="empty-state">Movement highlights will appear here after entries are added.</div>'
    : ranked.map((item) => `
        <div class="movement-item">
          <div>
            <strong>${escapeDashboardHtml(item.name)}</strong>
            <p>Goods Delivered ${formatDashboardNumber(item.loading)} | Goods Returned ${formatDashboardNumber(item.returnsQty)} | Goods Received ${formatDashboardNumber(item.received)}</p>
          </div>
          <div class="movement-meta">
            <strong>${formatDashboardNumber(item.combined)}</strong>
            <div>Total movement</div>
          </div>
        </div>
      `).join("");
}

function renderDashboard() {
  const products = readProducts();
  const date = selectedDate();
  const customerEntries = readCustomerEntries(date);
  const returnsEntries = readReturnsEntries(date);
  const purchases = readPurchases(date);
  const productById = new Map(products.map((product) => [product.id, product.name]));
  const stats = buildDashboardStats(products, date, customerEntries, returnsEntries, purchases);

  renderDashboardSummary(date, stats);
  renderDashboardMetrics(stats);
  renderDashboardStatuses(stats);
  renderDashboardActivities(productById, date, customerEntries, returnsEntries, purchases);
  renderDashboardMovement(products, date);
}

function initDashboardPage() {
  initProtectedPage();
  renderDashboard();
}