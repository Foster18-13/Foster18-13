const STORAGE_PREFIX = "twelliumWarehousePortal";
const DATE_KEY_PREFIX = "twelliumWarehouseDate";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentSector() {
  return (typeof getSector === "function" ? getSector() : "water") || "water";
}

function dataKey() {
  return `${STORAGE_PREFIX}:${currentSector()}`;
}

function dateKey() {
  return `${DATE_KEY_PREFIX}:${currentSector()}`;
}

function defaultProducts() {
  return [
    { id: "prod-water-small", name: "Water 500ml" },
    { id: "prod-water-large", name: "Water 1.5L" },
    { id: "prod-soft-drink", name: "Soft Drink" }
  ];
}

function emptyDay() {
  return {
    recordingColumnCount: 3,
    recordingEntries: {},
    opening: {},
    returns: {},
    damages: {},
    closing: {},
    remarks: {},
    purchases: []
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(dataKey());
    if (!raw) {
      return {
        products: defaultProducts(),
        days: {}
      };
    }
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : defaultProducts(),
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {}
    };
  } catch {
    return {
      products: defaultProducts(),
      days: {}
    };
  }
}

function saveDB(db) {
  localStorage.setItem(dataKey(), JSON.stringify(db));
}

function selectedDate() {
  const stored = sessionStorage.getItem(dateKey());
  return stored || todayISO();
}

function setSelectedDateValue(value) {
  const normalized = String(value || "").slice(0, 10);
  if (!normalized) return;
  sessionStorage.setItem(dateKey(), normalized);
}

function ensureDay(db, date) {
  const key = String(date || selectedDate());
  if (!db.days[key]) {
    db.days[key] = emptyDay();
  }
  return db.days[key];
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readProducts() {
  return loadDB().products;
}

function addProduct(name) {
  const label = String(name || "").trim();
  if (!label) return null;
  const db = loadDB();
  const id = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.products.push({ id, name: label });
  saveDB(db);
  return id;
}

function renameProduct(productId, nextName) {
  const label = String(nextName || "").trim();
  if (!label) return;
  const db = loadDB();
  const target = db.products.find((item) => item.id === productId);
  if (!target) return;
  target.name = label;
  saveDB(db);
}

function deleteProduct(productId) {
  const db = loadDB();
  db.products = db.products.filter((item) => item.id !== productId);
  Object.values(db.days).forEach((day) => {
    delete day.recordingEntries[productId];
    delete day.opening[productId];
    delete day.returns[productId];
    delete day.damages[productId];
    delete day.closing[productId];
    delete day.remarks[productId];
    day.purchases = day.purchases.filter((entry) => entry.productId !== productId);
  });
  saveDB(db);
}

function readRecording(date) {
  const db = loadDB();
  const day = ensureDay(db, date);
  return {
    columnCount: Math.max(1, numeric(day.recordingColumnCount) || 1),
    entries: day.recordingEntries
  };
}

function setRecordingColumnCount(date, count) {
  const db = loadDB();
  const day = ensureDay(db, date);
  day.recordingColumnCount = Math.max(1, numeric(count) || 1);
  saveDB(db);
}

function setRecordingValue(date, productId, columnIndex, value) {
  const db = loadDB();
  const day = ensureDay(db, date);
  const key = String(productId || "");
  if (!day.recordingEntries[key]) day.recordingEntries[key] = [];
  day.recordingEntries[key][columnIndex] = numeric(value);
  saveDB(db);
}

function loadingByProduct(date, productId) {
  const db = loadDB();
  const day = ensureDay(db, date);
  const entries = day.recordingEntries[String(productId || "")] || [];
  return entries.reduce((sum, value) => sum + numeric(value), 0);
}

function setBalanceField(date, fieldName, productId, value) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!day[fieldName]) day[fieldName] = {};
  day[fieldName][productId] = fieldName === "remarks" ? String(value || "") : numeric(value);
  saveDB(db);
}

function getBalanceField(date, fieldName, productId) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!day[fieldName]) return 0;
  const value = day[fieldName][productId];
  return numeric(value);
}

function getBalanceRemark(date, productId) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!day.remarks) return "";
  return String(day.remarks[productId] || "");
}

function addPurchase(date, purchase) {
  const db = loadDB();
  const day = ensureDay(db, date);
  day.purchases.push({
    id: `purchase-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: String(purchase.productId || ""),
    waybill: String(purchase.waybill || "").trim(),
    batchCode: String(purchase.batchCode || "").trim(),
    pallets: numeric(purchase.pallets),
    dateReceived: String(purchase.dateReceived || date).slice(0, 10)
  });
  saveDB(db);
}

function readPurchases(date) {
  const db = loadDB();
  const day = ensureDay(db, date);
  return Array.isArray(day.purchases) ? day.purchases : [];
}

function goodsReceivedByProduct(date, productId) {
  return readPurchases(date)
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + numeric(item.pallets), 0);
}

function balanceComputed(date, productId) {
  const opening = getBalanceField(date, "opening", productId);
  const returns = getBalanceField(date, "returns", productId);
  const damages = getBalanceField(date, "damages", productId);
  const loading = loadingByProduct(date, productId);
  const goodsReceived = goodsReceivedByProduct(date, productId);
  return opening + returns + goodsReceived - loading - damages;
}

function stockAvailable(date, productId) {
  const closing = getBalanceField(date, "closing", productId);
  if (closing !== 0) return closing;
  return balanceComputed(date, productId);
}
