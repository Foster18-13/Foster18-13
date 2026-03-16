const STORAGE_PREFIX = "twelliumWarehousePortal";
const DATE_KEY_PREFIX = "twelliumWarehouseDate";

const LEGACY_GENERIC_PRODUCT_NAMES = [
  "Water 500ml",
  "Water 1.5L",
  "Soft Drink"
];

const HH_PRODUCT_NAMES = [
  "H&H CHINESE GREEN TEA 25G -(20KG-BOX)",
  "H&H BRAND CANNED CHICKEN SAUSAGE (HOTDOGS)",
  "H&H BRAND CANNED LUNCHEON MEAT-BEEF GRADE A 198G X24",
  "H&H BRAND LUNCHEON MEAT-BEEF GRADE A 340G X24",
  "H&H BRAND CANNED LUNCHEON MEAT-CHICKEN GRADE A 198G X24",
  "H&H BRAND CANNED MUSHROOM 12/400G, D.W 230G, EO LID",
  "H&H BRAND CANNED SARDINES IN VEGETABLE OIL 50/125G D.W. 90G",
  "H&H INSTANT OATS FLAKES 500G X 20 BAG PER CARTON",
  "H&H BRAND SWEET CONDENSED MILK 1KG X 24 CANS",
  "H&H LAITA NON-DAIRY CREAMER X 288 PACKS",
  "H&H LAITA NON-DAIRY CREAMER X 50 PACK",
  "CANNED GREEN PEAS 24 TINS X 400G D.W.:250G",
  "H&H CANNED SWEET CORN 24 TINS_340G",
  "H&H MARGARINE 250GR * 60 SACHETS",
  "H&H PALM OIL - 250ML X 48PCS",
  "H&H BEEF PATE 400G X 24",
  "JASMINE RICE 5% BROKEN H&H 0.8KG X 20",
  "H&H JASMINE RICE 5% BROKEN (4.25K X 5)",
  "H&H BRAND JASMINE RICE 5% BROKEN 45KG",
  "CANNED CORNED BEEF 21% PROTEIN H&H 340G X 24",
  "H&H CANNED CORNED BEEF 21% PROTEIN 340G X 12",
  "H&H SPAGHETTI 1.2 MM 20 X 400G",
  "H&H NON-DAIRY CREAMER 240G_50BAGS",
  "H&H EVAPORATED MILK 6% PROTEIN 24TINS X 400GM NOE/CARTON",
  "H&H INDIAN BASMATI RICE PARBOILED CREAMY (5K X 5)",
  "H&H MAYONNAISE 1L X 6",
  "H&H MAYONNAISE 250ML X 12",
  "H&H BLACK TEA FLAVOURED GINGER 12CTN X 25 SACHETS X 1.8G",
  "H&H BLACK TEA FLAVOURED STRAWBERRY 12CTN X 25 SACHETS X 1.8G",
  "H&H BLACK TEA 24 CTN X 27 SACHETS X 2 GMS",
  "H&H BEEF SEASONING POWDER 10G X 12BAGS X 25STRIPS X 2 BIG BA",
  "H&H CHICKEN SEASONING POWDER 10G X 12BAGS X 25STRIPS X 2 BIG",
  "H&H GOAT SEASONING POWDER 10G X 12BAGS X 25STRIPS X 2 BIG BA",
  "H&H NOODLES & SPAGHETTI SEASONING POWDER 10G X 12BAGS X 25STRIPS",
  "H&H MOSQUITO COIL H&H 38G-40G_5DOUBLE COILS+5 METAL STAND",
  "H&H THAI HOM MALI RICE LONG GRAIN 100% POLISHED AND SORTED 5",
  "H&H TOMATO KETCHUP IN PET 340GX24",
  "H&H SUNFLOWER OIL 0.9L X 12",
  "H&H CANNED BAKED BEANS IN TOMATO SAUCE 425G_12 EASY OPEN",
  "H&H CANNED MACKEREL IN TOMATO SAUCE 155G X 50 EASY OPEN LID",
  "EASY BRAND CANNED MACKEREL IN TOMATO SAUCE 425G X24 EASY OPEN",
  "H&H CANNED MACKEREL IN TOMATO SAUCE 100G X50 EASY OPEN"
];

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

function slugifyProductName(name) {
  return String(name || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);
}

function namesToProducts(names) {
  return names.map((name, index) => ({
    id: `prod-${slugifyProductName(name) || `item-${index + 1}`}-${index + 1}`,
    name
  }));
}

function sectorDefaultProducts() {
  if (currentSector() === "hh") {
    return namesToProducts(HH_PRODUCT_NAMES);
  }
  return namesToProducts(LEGACY_GENERIC_PRODUCT_NAMES);
}

function defaultProducts() {
  return sectorDefaultProducts();
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
    const parsedProducts = Array.isArray(parsed.products) ? parsed.products : defaultProducts();
    const parsedNames = parsedProducts.map((item) => String(item?.name || "")).filter(Boolean);
    const looksLegacyGeneric =
      currentSector() === "hh" &&
      parsedNames.length > 0 &&
      parsedNames.every((name) => LEGACY_GENERIC_PRODUCT_NAMES.includes(name));

    return {
      products: looksLegacyGeneric ? defaultProducts() : parsedProducts,
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
