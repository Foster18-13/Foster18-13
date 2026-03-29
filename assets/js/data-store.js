const STORAGE_PREFIX = "twelliumWarehousePortal";
const DATE_KEY_PREFIX = "twelliumWarehouseDate";
const SHIFT_KEY_PREFIX = "twelliumWarehouseShift";

const LEGACY_GENERIC_PRODUCT_NAMES = [
  "Water 500ml",
  "Water 1.5L",
  "Soft Drink"
];

const WATER_PRODUCT_NAMES = [
  "Bigoo Apple 350ml x 20",
  "Bigoo Cocktail 350ml x 20",
  "Bigoo Coconut 350ml x 20",
  "Bigoo Cola 350ml x 20",
  "Bigoo Grapes 350ml x 20",
  "Bigoo Lemonade 350ml x 20",
  "Bigoo Lemonlime 350ml x 20",
  "Bigoo Orange 350ml x 20",
  "Can Bubble Up Tonic 330ml x 24",
  "Can Ch. Soursop 330ml x 24",
  "Can Dr. Malt 330ml x 24",
  "Ch. Vim Energy 500ml x 12",
  "Dr Malt 350ml x 20",
  "Easy Sport Energy 500ml x 12",
  "Planet Coconut 350ml x 16",
  "Planet Orange 350ml x 16",
  "Rasta Ch. Malt 350ml x 16",
  "Rasta Ch. Malt 500ml x 12",
  "Rosa Still Water 1L x 12",
  "Rosa Still Water 330ml x 12",
  "Run Energy 350ml x 16",
  "Run Energy 500ml x 12",
  "Rush Energy 350ml x 12",
  "Verna Active Sport Water 500ml x 12",
  "Verna Jar 19L",
  "Verna Jar 5L x 4",
  "Verna Shrink 1.5L x 6",
  "Verna Shrink 500ml x 16",
  "Verna Shrink 500ml x 24",
  "Verna Shrink 750ml x 16"
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

const MCBERRY_PRODUCT_NAMES = [
  "Happy Face Chocolate (12x6)",
  "Alpha Cracker Big (12x4)",
  "Alpha Cracker (12x6)",
  "Choco Blast (4x12)",
  "Bourbon Small Biscuit (6x12)",
  "Bourbon Small Milk (6x12)",
  "Bourbon Big Biscuit (4x12)",
  "Breakfast Milk Cereal Biscuit Big (6X12)",
  "Chocolate Cereal Biscuit Big (6X12)",
  "Breakfast Cracker (12x6)",
  "Ring Cookies Choco (6x12)",
  "Ring Cookies Vanilla (6x12)",
  "Choco Bites Biscuit (12x6)",
  "Chocomalt biscuit (12x6)",
  "Corn cracker (4x12)",
  "Crack-x Cracker (10x4)",
  "Creamy Twins Butter Medium (6x12)",
  "Creamy Twins Butter Big (4x12)",
  "Dexter Cracker Butter (3+2) (6x12)",
  "Dexter cracker Tray (48 Tray)",
  "Dexter Jumbo Chocolate (3+2)(12x4)",
  "Dexter Cracker Strawberry (3+2) (6x12)",
  "Fill UP Milk Wafer (6x12)",
  "Butter Finger biscuits (6x12)",
  "Gari biscuits (6x12)",
  "H&H Potato Chips Original Flavor Non Fried (6x8)",
  "Milky Blast (4x12)",
  "H&H Malt N Milk Medium (6x12)",
  "Mora Cream Crackers (12x4)",
  "London Oat Digestive tray (6x6)",
  "London Oat Digestive Chocochips (6x6)",
  "London Oat Digestive (6x6)",
  "Pika Mini Choco (12x4)",
  "Pika mini Straw (12x4)",
  "Puredelight cookies milk (12x12)",
  "Puredelight cookies Choco (12x12)",
  "Rich Tea Cream Vanilla (2+2+2) (12x6)",
  "Rich Tea Cream Chocolate (2+2+2) (12x6)",
  "Rich Tea Cream Strawberry (2+2+2) (12x6)",
  "Rich tea choco 170E (12x4)",
  "Snacker cracker (4x12)",
  "Sugar Free Soda Cracker (18x12)",
  "Meidam Soda Cracker 12x18",
  "Tigernut Biscuit (6x12)",
  "Tokyo Milk Crackers (12x6)",
  "H&H Soda Cracker Tray (48 Tray)",
  "Twist STRAW 70Ex3x48",
  "Twist choco 70Ex3x48",
  "Big Daddy choco (12x12)",
  "Big Daddy Milk (12x12)",
  "Dubai wafer original (12x12)",
  "Dubai coconut wafer (12x12)",
  "Dubai strawberry wafer (12x12)",
  "Grande twin choco wafer (12x12)",
  "Grande Twin Milk wafer (12x12)",
  "Pika mini (12x4)",
  "Pure Delight Milk Cream Wafer (6x12)",
  "Sky High Choco Wafer (12x12)",
  "Sky High Milk Wafer (12x12)",
  "Yupp Banana Wafer (12x6)",
  "Yupp Choco Wafer (12x6)",
  "Yupp Strawberry Wafer (12x6)",
  "Yup Vanilla Wafer (12x6)",
  "Bella Cake Choco (6x24)",
  "SIMA Cookies (6x12)",
  "SIMA Cookies Chocolate (6x12)",
  "Tutti Frutti Wheels Cookies (6x24)",
  "Banana strawberry Wheels Cookies (12x12)",
  "Banana Wheels Cookies (6x24)",
  "Kreambis 1+1+1 (12x12)",
  "French Donuts Marble Cake (6x24)",
  "Fun Cupcakes Vanilla single (4x12)",
  "Kreambis 2+2 cookies x144",
  "Layerz Chocolate Coated Cake (6x24)",
  "Lovan Cake Vanilla (72PCS)",
  "Maxi Choco Cookie Bar (12x6)",
  "Pan Cake (4x10)",
  "Pound Cake (6x24)",
  "Pure delight sliced cake vanilla (6x24)",
  "Pure Delight Sliced Cake Marble (6x24)",
  "Red velvet ships cake (6x12)",
  "Retro Marble Cookies (6x24)",
  "Sandwich Vanilla Cake (6x24)",
  "Sandwich choco Cake (6x24)",
  "Sandwich strawberry Cake (6x24)",
  "Teddy bear (6x12)",
  "Twist single cupcake vanilla (6x12)",
  "Cheese balls cereal x72",
  "Chootos (12X6)",
  "CHOCO CLOUD X72",
  "Corn flakes original 100 pcs",
  "Choco flakes 100 pcs",
  "Choco balls 100 pcs",
  "Cereal Letters Mix 100PCS",
  "Wheat Honey 100PCS",
  "Duo Ball 100PCS",
  "Corn flakes x10",
  "H&H Gari Choco Malt 40pcs Small",
  "H&H Gari Cup 24pcs Mix",
  "H&H INFANT WHEAT CEREALS 12x10",
  "H&H INSTANT OATS (10x4)",
  "Mcfries (6x12)"
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

function shiftKey() {
  return `${SHIFT_KEY_PREFIX}:${currentSector()}`;
}

function usesShiftStorage() {
  return currentSector() === "water";
}

function selectedShift() {
  if (!usesShiftStorage()) return "day";
  const stored = String(sessionStorage.getItem(shiftKey()) || "day").toLowerCase();
  return stored === "night" ? "night" : "day";
}

function setSelectedShiftValue(value) {
  const normalized = String(value || "day").toLowerCase() === "night" ? "night" : "day";
  if (!usesShiftStorage()) {
    sessionStorage.removeItem(shiftKey());
    return;
  }
  sessionStorage.setItem(shiftKey(), normalized);
}

function selectedShiftLabel() {
  if (selectedShift() === "night") {
    return "Night Shift (6:00 PM - 6:00 AM)";
  }
  return "Day Shift (6:00 AM - 6:00 PM)";
}

function dayStoreKey(date) {
  const baseDate = String(date || selectedDate());
  return usesShiftStorage() ? `${baseDate}::${selectedShift()}` : baseDate;
}

function oppositeShiftStoreKey(date) {
  if (!usesShiftStorage()) return null;
  const baseDate = String(date || selectedDate());
  const opposite = selectedShift() === "day" ? "night" : "day";
  return `${baseDate}::${opposite}`;
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
  if (currentSector() === "water") {
    return namesToProducts(WATER_PRODUCT_NAMES);
  }
  if (currentSector() === "hh") {
    return namesToProducts(HH_PRODUCT_NAMES);
  }
  if (currentSector() === "mcberry") {
    return namesToProducts(MCBERRY_PRODUCT_NAMES);
  }
  return namesToProducts(LEGACY_GENERIC_PRODUCT_NAMES);
}

function defaultProducts() {
  return sectorDefaultProducts();
}

function migrateWaterShiftDays(days) {
  if (currentSector() !== "water" || !days || typeof days !== "object") {
    return days && typeof days === "object" ? days : {};
  }

  const nextDays = { ...days };
  Object.keys(days).forEach((key) => {
    if (String(key).includes("::")) return;

    const shiftedKey = `${key}::day`;
    if (!nextDays[shiftedKey]) {
      nextDays[shiftedKey] = days[key];
    }
    delete nextDays[key];
  });

  return nextDays;
}

function emptyDay() {
  return {
    recordingColumnCount: 3,
    recordingEntries: {},
    customerEntries: [],
    returnsEntries: [],
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
      (currentSector() === "water" || currentSector() === "hh" || currentSector() === "mcberry") &&
      parsedNames.length > 0 &&
      parsedNames.every((name) => LEGACY_GENERIC_PRODUCT_NAMES.includes(name));

    return {
      products: looksLegacyGeneric ? defaultProducts() : parsedProducts,
      days: migrateWaterShiftDays(parsed.days && typeof parsed.days === "object" ? parsed.days : {})
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
  const key = dayStoreKey(date);
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
    day.customerEntries = Array.isArray(day.customerEntries)
      ? day.customerEntries.filter((entry) => entry.productId !== productId)
      : [];
    day.returnsEntries = Array.isArray(day.returnsEntries)
      ? day.returnsEntries.filter((entry) => entry.productId !== productId)
      : [];

    if (Array.isArray(day.returnsEntries) && day.returnsEntries.length > 0) {
      const totals = {};
      day.returnsEntries.forEach((entry) => {
        const key = String(entry.productId || "");
        if (!key) return;
        totals[key] = numeric(totals[key]) + numeric(entry.quantity);
      });
      day.returns = totals;
    }
  });
  saveDB(db);
}

function readCustomerEntries(date) {
  const db = loadDB();
  const day = ensureDay(db, date);
  return Array.isArray(day.customerEntries) ? day.customerEntries : [];
}

function addCustomerEntry(date, entry) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!Array.isArray(day.customerEntries)) day.customerEntries = [];

  const customerName = String(entry?.customerName || "").trim();
  const productId = String(entry?.productId || "").trim();
  const waybillNumber = String(entry?.waybillNumber || "").trim();
  const quantity = Math.max(0, numeric(entry?.quantity));
  if (!customerName || !productId || quantity <= 0) return null;

  const createdAt = Date.now();
  const id = `customer-entry-${createdAt}-${Math.floor(Math.random() * 1000)}`;

  day.customerEntries.push({
    id,
    customerName,
    productId,
    quantity,
    waybillNumber,
    createdAt
  });

  saveDB(db);
  return id;
}

function updateCustomerEntry(date, entryId, entry) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!Array.isArray(day.customerEntries)) day.customerEntries = [];

  const target = day.customerEntries.find((item) => item.id === entryId);
  if (!target) return false;

  const customerName = String(entry?.customerName || "").trim();
  const productId = String(entry?.productId || "").trim();
  const waybillNumber = String(entry?.waybillNumber || "").trim();
  const quantity = Math.max(0, numeric(entry?.quantity));
  if (!customerName || !productId || quantity <= 0) return false;

  target.customerName = customerName;
  target.productId = productId;
  target.quantity = quantity;
  target.waybillNumber = waybillNumber;
  saveDB(db);
  return true;
}

function deleteCustomerEntry(date, entryId) {
  const db = loadDB();
  const day = ensureDay(db, date);
  day.customerEntries = Array.isArray(day.customerEntries)
    ? day.customerEntries.filter((entry) => entry.id !== entryId)
    : [];
  saveDB(db);
}

function readReturnsEntries(date) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (Array.isArray(day.returnsEntries)) return day.returnsEntries;

  const seeded = Object.entries(day.returns || {})
    .map(([productId, qty], idx) => {
      const quantity = numeric(qty);
      if (quantity <= 0) return null;
      return {
        id: `returns-entry-legacy-${Date.now()}-${idx}`,
        customerName: "",
        productId,
        quantity,
        waybillNumber: "",
        createdAt: Date.now()
      };
    })
    .filter(Boolean);

  day.returnsEntries = seeded;
  saveDB(db);
  return day.returnsEntries;
}

function syncReturnsFromEntries(day) {
  const totals = {};
  const entries = Array.isArray(day.returnsEntries) ? day.returnsEntries : [];
  entries.forEach((entry) => {
    const key = String(entry.productId || "");
    if (!key) return;
    totals[key] = numeric(totals[key]) + numeric(entry.quantity);
  });
  day.returns = totals;
}

function addReturnEntry(date, entry) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!Array.isArray(day.returnsEntries)) day.returnsEntries = [];

  const customerName = String(entry?.customerName || "").trim();
  const productId = String(entry?.productId || "").trim();
  const waybillNumber = String(entry?.waybillNumber || "").trim();
  const quantity = Math.max(0, numeric(entry?.quantity));
  if (!customerName || !productId || quantity <= 0) return null;

  const createdAt = Date.now();
  const id = `returns-entry-${createdAt}-${Math.floor(Math.random() * 1000)}`;

  day.returnsEntries.push({
    id,
    customerName,
    productId,
    quantity,
    waybillNumber,
    createdAt
  });

  syncReturnsFromEntries(day);
  saveDB(db);
  return id;
}

function updateReturnEntry(date, entryId, entry) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!Array.isArray(day.returnsEntries)) day.returnsEntries = [];

  const target = day.returnsEntries.find((item) => item.id === entryId);
  if (!target) return false;

  const customerName = String(entry?.customerName || "").trim();
  const productId = String(entry?.productId || "").trim();
  const waybillNumber = String(entry?.waybillNumber || "").trim();
  const quantity = Math.max(0, numeric(entry?.quantity));
  if (!customerName || !productId || quantity <= 0) return false;

  target.customerName = customerName;
  target.productId = productId;
  target.quantity = quantity;
  target.waybillNumber = waybillNumber;

  syncReturnsFromEntries(day);
  saveDB(db);
  return true;
}

function deleteReturnEntry(date, entryId) {
  const db = loadDB();
  const day = ensureDay(db, date);
  day.returnsEntries = Array.isArray(day.returnsEntries)
    ? day.returnsEntries.filter((entry) => entry.id !== entryId)
    : [];

  syncReturnsFromEntries(day);
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

  if (Array.isArray(day.customerEntries) && day.customerEntries.length > 0) {
    return day.customerEntries
      .filter((entry) => entry.productId === String(productId || ""))
      .reduce((sum, entry) => sum + numeric(entry.quantity), 0);
  }

  const entries = day.recordingEntries[String(productId || "")] || [];
  return entries.reduce((sum, value) => sum + numeric(value), 0);
}

function setBalanceField(date, fieldName, productId, value) {
  const db = loadDB();
  const day = ensureDay(db, date);
  if (!day[fieldName]) day[fieldName] = {};
  day[fieldName][productId] = fieldName === "remarks" ? String(value || "") : numeric(value);

  // When closing stock is saved for a Water shift, auto-seed the opening
  // stock of the opposite shift for the same date.
  if (fieldName === "closing" && usesShiftStorage()) {
    const oppKey = oppositeShiftStoreKey(date);
    if (oppKey) {
      if (!db.days[oppKey]) db.days[oppKey] = emptyDay();
      if (!db.days[oppKey].opening) db.days[oppKey].opening = {};
      db.days[oppKey].opening[productId] = numeric(value);
    }
  }

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
