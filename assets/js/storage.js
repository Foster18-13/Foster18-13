const STORAGE_KEY = "twellium_warehouse_portal_v1";
const REQUIRED_PRODUCTS = [
  "Verna Shrink 500ml x 24",
  "Verna Shrink 500ml x 16",
  "Verna Shrink 750ml x 16",
  "Verna Shrink 1.5L x 6",
  "Verna Jar 5L x 4",
  "Verna Active Sport Water 500ml x 12",
  "Verna Jar 19L",
  "Slemfit Water 500ml x 16",
  "Run Energy 350ml x 12",
  "Run Energy 500ml x 12",
  "Rush Energy 350ml x 12",
  "Ch. Vim Energy 500ml x 12",
  "Rosa Still Water 1L x 12",
  "Rosa Still Water 330ml x 12",
  "Bigoo Cola 350ml x 20",
  "Bigoo Lemonlime 350ml x 20",
  "Bigoo Apple 350ml x 20",
  "Bigoo Grapes 350ml x 20",
  "Bigoo Orange 350ml x 20",
  "Bigoo Coconut 350ml x 20",
  "Bigoo Cocktail 350ml x 20",
  "American Cola 350ml x 16",
  "Rasta Ch. Malt 350ml x 16",
  "Rasta Ch. Malt 500ml x 12",
  "Easy Sport Energy 500ml x 12",
  "Can Planet Orange 330ml x 24",
  "Can Dr. Malt 330ml x 24",
  "Can Ch. Soursop 330ml x 24",
  "Can Bubble Up Tonic 330ml x 24",
  "Planet Orange 350ml x 16",
  "Planet Tropical 350ml x 16",
  "Planet Cocktail 350ml x 16",
  "Planet Coconut 350ml x 16",
  "Dispenser Machine",
  "Single Door Fridge",
  "Double Door Fridge"
];

function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inferPalletFactorFromName(name) {
  const text = String(name || "");
  const match = /x\s*(\d+)/i.exec(text);
  if (!match) return 1;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function defaultData() {
  return {
    products: REQUIRED_PRODUCTS.map((name) => ({
      id: generateId("product"),
      name,
      palletFactor: inferPalletFactorFromName(name)
    })),
    daily: {},
    _meta: {
      updatedAt: Date.now()
    }
  };
}

function isLegacyStarterList(products) {
  if (products.length !== 2) return false;
  const names = new Set(products.map((item) => item.name.toLowerCase().trim()));
  return names.has("mineral water") && names.has("soft drink");
}

function ensureRequiredProducts(data) {
  if (!Array.isArray(data.products)) {
    data.products = [];
  }

  const deletedRequired = getDeletedRequiredSet(data);

  if (isLegacyStarterList(data.products)) {
    data.products = REQUIRED_PRODUCTS.map((name) => ({
      id: generateId("product"),
      name,
      palletFactor: inferPalletFactorFromName(name)
    }));
    return true;
  }

  const currentNames = new Set(data.products.map((item) => item.name.toLowerCase().trim()));
  let changed = false;

  REQUIRED_PRODUCTS.forEach((name) => {
    const key = name.toLowerCase();
    if (!currentNames.has(key) && !deletedRequired.has(key)) {
      data.products.push({
        id: generateId("product"),
        name,
        palletFactor: inferPalletFactorFromName(name)
      });
      currentNames.add(key);
      changed = true;
    }
  });

  data.products.forEach((product) => {
    const factor = Number(product.palletFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      product.palletFactor = inferPalletFactorFromName(product.name);
      changed = true;
    }
  });

  return changed;
}

function getDeletedRequiredSet(data) {
  const meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  const deleted = Array.isArray(meta.deletedRequired) ? meta.deletedRequired : [];
  return new Set(deleted.map((item) => String(item).toLowerCase().trim()).filter(Boolean));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = defaultData();
      saveData(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    parsed.products = Array.isArray(parsed.products) ? parsed.products : [];
    parsed.daily = parsed.daily && typeof parsed.daily === "object" ? parsed.daily : {};
    parsed._meta = parsed._meta && typeof parsed._meta === "object" ? parsed._meta : {};
    parsed._meta.updatedAt = asNumber(parsed._meta.updatedAt) || 0;
    const changed = ensureRequiredProducts(parsed);
    if (changed) saveData(parsed);
    return parsed;
  } catch {
    const fallback = defaultData();
    saveData(fallback);
    return fallback;
  }
}

function saveData(data) {
  data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  data._meta.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent("warehouse:data-saved", {
        detail: { data }
      })
    );
  }
}

function ensureDayStore(data, date) {
  if (!data.daily[date]) {
    data.daily[date] = {
      recordingColumns: 3,
      recording: {},
      balance: {},
      purchases: [],
      locked: false,
      lockedBy: "",
      lockedAt: 0
    };
  }

  const day = data.daily[date];
  if (!day.recording || typeof day.recording !== "object") day.recording = {};
  if (!day.balance || typeof day.balance !== "object") day.balance = {};
  if (!Array.isArray(day.purchases)) day.purchases = [];
  if (!Number.isInteger(day.recordingColumns) || day.recordingColumns < 1) day.recordingColumns = 3;
  if (typeof day.locked !== "boolean") day.locked = false;
  if (typeof day.lockedBy !== "string") day.lockedBy = "";
  day.lockedAt = asNumber(day.lockedAt);

  return day;
}

function getSelectedDate() {
  return localStorage.getItem("twellium_selected_date") || todayISO();
}

function setSelectedDate(date) {
  localStorage.setItem("twellium_selected_date", date);
}

function getPreviousDateISO(date) {
  const targetDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) return "";
  targetDate.setDate(targetDate.getDate() - 1);
  return targetDate.toISOString().slice(0, 10);
}

function getPreviousClosingStock(data, date, productId) {
  const previousDate = getPreviousDateISO(date);
  if (!previousDate) return "";

  const previousDay = data.daily[previousDate];
  if (!previousDay?.balance) return "";

  const previousBalance = previousDay.balance[productId] || {};
  const closingStock = previousBalance.closing;
  if (closingStock === null || closingStock === undefined || closingStock === "") {
    return "";
  }

  return closingStock;
}

function getProductById(data, productId) {
  return data.products.find((item) => item.id === productId);
}

function addProduct(name) {
  const clean = String(name || "").trim();
  if (!clean) return { ok: false, message: "Product name is required." };

  const data = loadData();
  const exists = data.products.some((product) => product.name.toLowerCase() === clean.toLowerCase());
  if (exists) return { ok: false, message: "Product already exists." };

  const deletedRequired = getDeletedRequiredSet(data);
  const cleanKey = clean.toLowerCase();
  if (deletedRequired.has(cleanKey)) {
    data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
    data._meta.deletedRequired = Array.isArray(data._meta.deletedRequired)
      ? data._meta.deletedRequired.filter((item) => String(item).toLowerCase().trim() !== cleanKey)
      : [];
  }

  data.products.push({
    id: generateId("product"),
    name: clean,
    palletFactor: inferPalletFactorFromName(clean)
  });
  saveData(data);
  return { ok: true };
}

function updateProductPalletFactor(productId, factor) {
  const value = Number(factor);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, message: "Pallet factor must be greater than 0." };
  }

  const data = loadData();
  const target = data.products.find((item) => item.id === productId);
  if (!target) return { ok: false, message: "Product not found." };

  target.palletFactor = value;
  saveData(data);
  return { ok: true };
}

function updateProduct(productId, newName) {
  const clean = String(newName || "").trim();
  if (!clean) return { ok: false, message: "Product name is required." };

  const data = loadData();
  const target = data.products.find((item) => item.id === productId);
  if (!target) return { ok: false, message: "Product not found." };

  const duplicate = data.products.some((item) => item.id !== productId && item.name.toLowerCase() === clean.toLowerCase());
  if (duplicate) return { ok: false, message: "Another product has the same name." };

  target.name = clean;
  saveData(data);
  return { ok: true };
}

function deleteProduct(productId) {
  const data = loadData();
  const target = data.products.find((item) => item.id === productId);
  data.products = data.products.filter((item) => item.id !== productId);

  if (target) {
    const targetKey = String(target.name || "").toLowerCase().trim();
    const requiredKey = REQUIRED_PRODUCTS.find((name) => name.toLowerCase() === targetKey);
    if (requiredKey) {
      data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
      const deleted = Array.isArray(data._meta.deletedRequired) ? data._meta.deletedRequired : [];
      if (!deleted.some((item) => String(item).toLowerCase().trim() === targetKey)) {
        deleted.push(requiredKey);
      }
      data._meta.deletedRequired = deleted;
    }
  }

  Object.values(data.daily).forEach((day) => {
    if (day.recording) delete day.recording[productId];
    if (day.balance) delete day.balance[productId];
    if (Array.isArray(day.purchases)) {
      day.purchases = day.purchases.filter((purchase) => purchase.productId !== productId);
    }
  });

  saveData(data);
  return { ok: true };
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getLoadingForProduct(dayStore, productId) {
  const record = dayStore.recording[productId];
  if (!record || !Array.isArray(record.entries)) return 0;
  return record.entries.reduce((sum, item) => {
    const quantity = typeof item === "object" && item !== null ? item.qty : item;
    return sum + asNumber(quantity);
  }, 0);
}

function getGoodsReceivedForProduct(dayStore, productId) {
  return dayStore.purchases
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => {
      const quantityReceived = item.quantityReceived ?? item.pallets;
      const goodsReceived = item.goodsReceived ?? quantityReceived;
      return sum + asNumber(goodsReceived);
    }, 0);
}

function computeBalanceValue({ opening, returns, goodsReceived, loading, damages }) {
  return asNumber(opening) + asNumber(returns) + asNumber(goodsReceived) - asNumber(loading) - asNumber(damages);
}

function getStockAvailable(dayStore, productId) {
  const balance = dayStore.balance[productId] || {};
  const loading = getLoadingForProduct(dayStore, productId);
  const goodsReceived = getGoodsReceivedForProduct(dayStore, productId);

  const computedBalance = computeBalanceValue({
    opening: balance.opening,
    returns: balance.returns,
    goodsReceived,
    loading,
    damages: balance.damages
  });

  const closing = Number(balance.closing);
  return Number.isFinite(closing) ? closing : computedBalance;
}
