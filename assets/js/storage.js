const STORAGE_KEY = "twellium_warehouse_portal_v1";
const LEGACY_DAILY_RECORDS_KEY = "dailyRecordingSheetData";
const LEGACY_DAILY_BALANCE_KEY = "dailyBalanceSheetData";
const LOCAL_BACKUP_STORAGE_KEY = "twellium_warehouse_portal_backup_v1";
const SELECTED_DATE_STORAGE_KEY = "twellium_selected_date";
const SELECTED_SHIFT_STORAGE_KEY = "twellium_selected_shift";
const LOCAL_BACKUP_LIMIT = 40;
const CLOUD_LOCAL_CACHE_DAYS = 45;
const CLOUD_BACKUP_LIMIT = 5;
const AUDIT_LOG_LIMIT = 500;
const WATER_REQUIRED_PRODUCTS = [
  "BIGOO APPLE 350MLX20PCS",
  "BIGOO COCKTAIL 350MLX20PCS",
  "BIGOO COCONUT 350MLX20PCS",
  "BIGOO COLA 350MLX20PCS",
  "BIGOO GRAPE 350MLX20PCS",
  "Bigoo Lemonade 350MLX20pcs",
  "BIGOO LEMONLIME 350MLX20PCS",
  "BIGOO ORANGE 350MLX20PCS",
  "CAN BUBBLE UP TONIC 330MLX24PCS",
  "CAN CHALE SOURSOP SLEEK 330MLX24",
  "CAN DR. MALT DARK SLEEK 330X24PCS",
  "CHAMPAGNE ENERGY DRINK 500MLX12PCS",
  "EASY SPORTS ENERGY 500MLX12PCS",
  "PLANET COCONUT 350ML X 16PCS",
  "PLANET ORANGE 350MLX16PCS",
  "RASTA-CHOCO MALT 350MLX16PCS",
  "RASTA-CHOCO MALT 500MLX12PCS",
  "ROSA Premium 1Liter x 12 Bottles",
  "RUN BLUE ENERGY DRINK 350MLX16PCS",
  "RUN ENERGY DRINK 500MLX12PCS",
  "RUSH ENERGY 350MLX12PCS",
  "Slemfit water 500ml x16pcs",
  "VERNA SHRINK WATER 1.5L X 6PCS",
  "VERNA SPORT  WATER 500ML X 12",
  "VERNA WATER GALLON 19 LITER",
  "VERNA WATER SHRINK 500MLLX16PCS",
  "VERNA WATER SHRINK 500MLX24PCS",
  "VERNA WATER SHRINK 500MLX36PCS",
  "VERNA WATER SHRINK 750MLX16PCS"
];

const HH_REQUIRED_PRODUCTS = [
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
  "H&H BEEF PATÉ 400G X 24",
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

const MCBERRY_REQUIRED_PRODUCTS = [
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

function getCurrentSectorId() {
  if (typeof globalThis.getCurrentWorkSector === "function") {
    return globalThis.getCurrentWorkSector();
  }
  return "water";
}

function isDayOnlySector() {
  const sector = getCurrentSectorId();
  return sector === "hh" || sector === "mcberry";
}

function getSectorScopedKey(baseKey) {
  const sector = getCurrentSectorId();
  if (!sector || sector === "water") {
    return baseKey;
  }
  return `${baseKey}_${sector}`;
}

function getStorageDataKey() {
  return getSectorScopedKey(STORAGE_KEY);
}

function getBackupStorageKey() {
  return getSectorScopedKey(LOCAL_BACKUP_STORAGE_KEY);
}

function getSelectedDateStorageKey() {
  return getSectorScopedKey(SELECTED_DATE_STORAGE_KEY);
}

function getSelectedShiftStorageKey() {
  return getSectorScopedKey(SELECTED_SHIFT_STORAGE_KEY);
}

function getRequiredProductsForSector() {
  const sector = getCurrentSectorId();
  if (sector === "hh") return HH_REQUIRED_PRODUCTS;
  if (sector === "mcberry") return MCBERRY_REQUIRED_PRODUCTS;
  return WATER_REQUIRED_PRODUCTS;
}

function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatDateToLocalISO(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return formatDateToLocalISO(new Date());
}

function inferPalletFactorFromName(name) {
  const text = String(name || "");
  const match = /x\s*(\d+)/i.exec(text);
  if (!match) return 1;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function defaultData() {
  const requiredProducts = getRequiredProductsForSector();
  return {
    products: requiredProducts.map((name) => ({
      id: generateId("product"),
      name,
      palletFactor: inferPalletFactorFromName(name),
      addedDate: null
    })),
    daily: {},
    _meta: {
      updatedAt: Date.now()
    }
  };
}

function createWarehouseSnapshot(data) {
  return {
    products: Array.isArray(data?.products) ? data.products : [],
    daily: data?.daily && typeof data.daily === "object" ? data.daily : {},
    auditLogs: Array.isArray(data?.auditLogs) ? data.auditLogs : [],
    _meta: data?._meta && typeof data._meta === "object" ? data._meta : {}
  };
}

function safeReadBackupHistory() {
  try {
    const raw = localStorage.getItem(getBackupStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackupHistory(backups) {
  try {
    localStorage.setItem(getBackupStorageKey(), JSON.stringify(backups));
  } catch {
    // ignore quota/write errors for backup stream
  }
}

function safeReadLegacyObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeProductName(value) {
  return String(value || "").trim();
}

function findOrCreateProductIdByName(data, rawName) {
  const productName = normalizeProductName(rawName);
  if (!productName) return "";

  const existing = data.products.find((item) => item.name.toLowerCase() === productName.toLowerCase());
  if (existing) return existing.id;

  const newProduct = {
    id: generateId("product"),
    name: productName,
    palletFactor: inferPalletFactorFromName(productName)
  };
  data.products.push(newProduct);
  return newProduct.id;
}

function mapLegacyEntryItem(item) {
  if (item && typeof item === "object") {
    return {
      waybill: String(item.waybill ?? item.waybillNo ?? item.waybill_number ?? ""),
      qty: String(item.qty ?? item.quantity ?? item.value ?? "")
    };
  }

  return {
    waybill: "",
    qty: String(item ?? "")
  };
}

function mapLegacyRowEntries(row) {
  if (!row || typeof row !== "object") return [];

  const candidates = [row.entries, row.values, row.columns, row.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((item) => mapLegacyEntryItem(item));
    }
  }

  if (row.qty !== undefined || row.quantity !== undefined || row.loaded !== undefined) {
    return [
      {
        waybill: String(row.waybill ?? row.waybillNo ?? ""),
        qty: String(row.qty ?? row.quantity ?? row.loaded ?? "")
      }
    ];
  }

  return [];
}

function hasLegacySourceData() {
  const dailyRecords = safeReadLegacyObject(LEGACY_DAILY_RECORDS_KEY);
  const dailyBalance = safeReadLegacyObject(LEGACY_DAILY_BALANCE_KEY);
  return Object.keys(dailyRecords).length > 0 || Object.keys(dailyBalance).length > 0;
}

function isWarehouseSnapshotCandidate(value) {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value.products)) return false;
  if (!value.daily || typeof value.daily !== "object") return false;
  return true;
}

function getDailySnapshotScore(data) {
  if (!data || typeof data !== "object" || !data.daily || typeof data.daily !== "object") return 0;

  let score = 0;
  Object.values(data.daily).forEach((dayValue) => {
    if (!dayValue || typeof dayValue !== "object") return;
    ["day", "night"].forEach((shiftKey) => {
      const shift = dayValue[shiftKey];
      if (!shift || typeof shift !== "object") return;
      score += Object.keys(shift.recording || {}).length * 3;
      score += Object.keys(shift.balance || {}).length * 2;
      score += Array.isArray(shift.purchases) ? shift.purchases.length : 0;
    });
  });

  return score;
}

function findBestLocalStorageWarehouseSnapshot(excludedKeys = []) {
  const excluded = new Set(excludedKeys);
  let best = null;

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || excluded.has(key)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 20) continue;
      const parsed = JSON.parse(raw);
      if (!isWarehouseSnapshotCandidate(parsed)) continue;

      const score = getDailySnapshotScore(parsed);
      if (!best || score > best.score) {
        best = { key, score, data: parsed };
      }
    } catch {
      // ignore non-json storage values
    }
  }

  return best;
}

function hasMeaningfulDailySnapshot(data) {
  return getDailySnapshotScore(data) > 0;
}

function isCloudSessionActive() {
  try {
    return !!globalThis.firebase?.auth?.()?.currentUser;
  } catch {
    return false;
  }
}

function createCloudLocalCachePayload(data, daysToKeep = CLOUD_LOCAL_CACHE_DAYS) {
  const snapshot = createWarehouseSnapshot(data);
  pruneOldDailyRecords(snapshot, daysToKeep);

  const logs = Array.isArray(snapshot.auditLogs) ? snapshot.auditLogs : [];
  snapshot.auditLogs = logs.slice(0, Math.min(AUDIT_LOG_LIMIT, 120));

  snapshot._meta = snapshot._meta && typeof snapshot._meta === "object" ? snapshot._meta : {};
  snapshot._meta.cloudPriorityCache = true;
  snapshot._meta.localCacheDays = daysToKeep;
  snapshot._meta.localCachePreparedAt = Date.now();

  return snapshot;
}

function addLocalBackupSnapshot(data, source = "auto-save") {
  const snapshot = createWarehouseSnapshot(data);
  const score = getDailySnapshotScore(snapshot);
  const history = safeReadBackupHistory();
  const backupLimit = isCloudSessionActive() ? CLOUD_BACKUP_LIMIT : LOCAL_BACKUP_LIMIT;
  const backupItem = {
    timestamp: Date.now(),
    source,
    score,
    data: snapshot
  };

  history.unshift(backupItem);
  const trimmed = history.slice(0, backupLimit);
  writeBackupHistory(trimmed);
}

function tryRecoverFromBackupHistory(data) {
  const alreadyRecovered = !!data?._meta?.recoveredFromBackupAt;
  if (alreadyRecovered || hasMeaningfulDailySnapshot(data)) return false;

  const history = safeReadBackupHistory();
  if (!history.length) return false;

  const candidate = history
    .filter((item) => item?.data && isWarehouseSnapshotCandidate(item.data))
    .sort((a, b) => {
      const scoreGap = (b.score || 0) - (a.score || 0);
      if (scoreGap !== 0) return scoreGap;
      return (b.timestamp || 0) - (a.timestamp || 0);
    })[0];

  if (!candidate?.data || !hasMeaningfulDailySnapshot(candidate.data)) return false;

  data.products = Array.isArray(candidate.data.products) ? candidate.data.products : data.products;
  data.daily = candidate.data.daily && typeof candidate.data.daily === "object" ? candidate.data.daily : data.daily;
  data.auditLogs = Array.isArray(candidate.data.auditLogs) ? candidate.data.auditLogs : data.auditLogs;

  data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  data._meta.recoveredFromBackupAt = Date.now();
  data._meta.recoveredBackupScore = asNumber(candidate.score);

  return true;
}

function tryMigrateLegacyStorage(data) {
  const alreadyMigrated = !!data?._meta?.legacyMigratedAt;
  if (alreadyMigrated || !hasLegacySourceData()) return false;

  const dailyRecords = safeReadLegacyObject(LEGACY_DAILY_RECORDS_KEY);
  const dailyBalance = safeReadLegacyObject(LEGACY_DAILY_BALANCE_KEY);
  const dateKeys = new Set([...Object.keys(dailyRecords), ...Object.keys(dailyBalance)]);

  let changed = false;

  dateKeys.forEach((dateKey) => {
    if (!dateKey) return;
    const dayStore = getShiftStore(data, dateKey, "day");

    const recordDay = dailyRecords[dateKey] || {};
    const rows = Array.isArray(recordDay.rows) ? recordDay.rows : [];
    const legacyColumns = Number(recordDay.untitledColumns);
    if (Number.isFinite(legacyColumns) && legacyColumns > dayStore.recordingColumns) {
      dayStore.recordingColumns = legacyColumns;
      changed = true;
    }

    rows.forEach((row) => {
      const productId = findOrCreateProductIdByName(data, row.product ?? row.productName ?? row.name ?? row.item);
      if (!productId) return;

      const mappedEntries = mapLegacyRowEntries(row);
      if (!mappedEntries.length) return;

      const currentRecord = dayStore.recording[productId];
      const hasCurrentEntries = !!(currentRecord && Array.isArray(currentRecord.entries) && currentRecord.entries.length > 0);
      if (!hasCurrentEntries) {
        dayStore.recording[productId] = { entries: mappedEntries };
        dayStore.recordingColumns = Math.max(dayStore.recordingColumns, mappedEntries.length);
        changed = true;
      }
    });

    const balanceRows = Array.isArray(dailyBalance[dateKey]) ? dailyBalance[dateKey] : [];
    balanceRows.forEach((row) => {
      const productId = findOrCreateProductIdByName(data, row.product ?? row.productName ?? row.name ?? row.item);
      if (!productId) return;

      dayStore.balance[productId] = dayStore.balance[productId] || {};
      const currentClosing = dayStore.balance[productId].closing;
      const hasClosing = currentClosing !== undefined && currentClosing !== null && currentClosing !== "";
      if (!hasClosing && row.closing !== undefined && row.closing !== null && row.closing !== "") {
        dayStore.balance[productId].closing = row.closing;
        changed = true;
      }
    });
  });

  if (changed) {
    data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
    data._meta.legacyMigratedAt = Date.now();
  }

  return changed;
}

function tryRecoverFromAlternativeLocalStorage(data) {
  const alreadyRecovered = !!data?._meta?.recoveredFromStorageKey;
  if (alreadyRecovered || hasMeaningfulDailySnapshot(data)) return false;

  const candidate = findBestLocalStorageWarehouseSnapshot([
    getStorageDataKey(),
    STORAGE_KEY,
    LEGACY_DAILY_RECORDS_KEY,
    LEGACY_DAILY_BALANCE_KEY,
    getSelectedDateStorageKey(),
    getSelectedShiftStorageKey(),
    SELECTED_DATE_STORAGE_KEY,
    SELECTED_SHIFT_STORAGE_KEY
  ]);

  if (!candidate?.data || !hasMeaningfulDailySnapshot(candidate.data)) return false;

  data.products = Array.isArray(candidate.data.products) ? candidate.data.products : data.products;
  data.daily = candidate.data.daily && typeof candidate.data.daily === "object" ? candidate.data.daily : data.daily;
  data.auditLogs = Array.isArray(candidate.data.auditLogs) ? candidate.data.auditLogs : data.auditLogs;

  data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  data._meta.recoveredFromStorageKey = candidate.key;
  data._meta.recoveredAt = Date.now();
  data._meta.recoveredScore = candidate.score;

  return true;
}

function isLegacyStarterList(products) {
  if (products.length !== 2) return false;
  const names = new Set(products.map((item) => item.name.toLowerCase().trim()));
  return names.has("mineral water") && names.has("soft drink");
}

function ensureRequiredProducts(data) {
  const requiredProducts = getRequiredProductsForSector();
  if (!Array.isArray(data.products)) {
    data.products = [];
  }

  const deletedRequired = getDeletedRequiredSet(data);

  if (isLegacyStarterList(data.products)) {
    data.products = requiredProducts.map((name) => ({
      id: generateId("product"),
      name,
      palletFactor: inferPalletFactorFromName(name)
    }));
    return true;
  }

  const currentNames = new Set(data.products.map((item) => item.name.toLowerCase().trim()));
  let changed = false;

  requiredProducts.forEach((name) => {
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
    const raw = localStorage.getItem(getStorageDataKey());
    if (!raw) {
      const initial = defaultData();
      tryMigrateLegacyStorage(initial);
      tryRecoverFromAlternativeLocalStorage(initial);
      tryRecoverFromBackupHistory(initial);
      saveData(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    parsed.products = Array.isArray(parsed.products) ? parsed.products : [];
    parsed.daily = parsed.daily && typeof parsed.daily === "object" ? parsed.daily : {};
    parsed._meta = parsed._meta && typeof parsed._meta === "object" ? parsed._meta : {};
    parsed._meta.updatedAt = asNumber(parsed._meta.updatedAt) || 0;
    const changed =
      ensureRequiredProducts(parsed) ||
      tryMigrateLegacyStorage(parsed) ||
      tryRecoverFromAlternativeLocalStorage(parsed) ||
      tryRecoverFromBackupHistory(parsed);
    if (changed) saveData(parsed);
    return parsed;
  } catch {
    const fallback = defaultData();
    tryRecoverFromBackupHistory(fallback);
    saveData(fallback);
    return fallback;
  }
}

function pruneOldDailyRecords(data, daysToKeep = 180) {
  if (!data?.daily || typeof data.daily !== "object") return 0;

  const now = Date.now();
  const cutoffTime = now - daysToKeep * 24 * 60 * 60 * 1000;
  let removedCount = 0;
  const datesToRemove = [];

  Object.keys(data.daily).forEach((dateStr) => {
    try {
      // Parse ISO date (YYYY-MM-DD) to timestamp
      const dateObj = new Date(dateStr + "T00:00:00Z");
      const dateTime = dateObj.getTime();

      if (dateTime < cutoffTime) {
        datesToRemove.push(dateStr);
      }
    } catch {
      // Skip unparseable dates
    }
  });

  datesToRemove.forEach((dateStr) => {
    delete data.daily[dateStr];
    removedCount++;
  });

  if (removedCount > 0) {
    console.log(`[Storage] Pruned ${removedCount} old daily records (older than ${daysToKeep} days)`);
    data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
    data._meta.lastPruneAt = Date.now();
    data._meta.lastPruneCount = removedCount;
  }

  return removedCount;
}

function isQuotaExceededError(error) {
  return error?.name === "QuotaExceededError" || String(error?.message || "").toLowerCase().includes("quota");
}

function setStorageStatus(message, level) {
  if (typeof globalThis.setStatus === "function") {
    globalThis.setStatus(message, level);
  }
}

function writeStoragePayload(payload) {
  localStorage.setItem(getStorageDataKey(), JSON.stringify(payload));
}

function retrySaveAfterPrune(payloadToStore, cloudPriorityMode, originalError) {
  const daysToKeep = cloudPriorityMode ? 30 : 180;
  const removed = pruneOldDailyRecords(payloadToStore, daysToKeep);

  if (removed <= 0) {
    console.error("[Storage] Over quota but no old records to prune");
    setStorageStatus("Storage: Critical - no space available. Please archive records in reports section.", "error");
    throw originalError;
  }

  try {
    writeStoragePayload(payloadToStore);
    console.log("[Storage] Successfully saved after cleanup");
    setStorageStatus(`Storage: Cleaned up ${removed} old records. Data saved successfully.`, "warning");
  } catch (retryError) {
    console.error("[Storage] Still over quota even after cleanup", retryError);
    setStorageStatus(
      "Storage: Critical - over quota even after cleanup. Archive old records in the reports section.",
      "error"
    );
    throw retryError;
  }
}

function saveData(data, preserveTimestamp = false) {
  data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  if (!preserveTimestamp) {
    data._meta.updatedAt = Date.now();
  }

  const cloudPriorityMode = isCloudSessionActive();
  let payloadToStore = data;

  if (cloudPriorityMode) {
    payloadToStore = createCloudLocalCachePayload(data, CLOUD_LOCAL_CACHE_DAYS);
  }

  try {
    writeStoragePayload(payloadToStore);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn("[Storage] Quota exceeded, attempting to prune old records...");
      retrySaveAfterPrune(payloadToStore, cloudPriorityMode, error);
    } else {
      throw error;
    }
  }

  addLocalBackupSnapshot(data);

  // Only dispatch event for local changes, not cloud syncs
  if (!preserveTimestamp && typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent("warehouse:data-saved", {
        detail: { data }
      })
    );
  }
}

function getCurrentUserLabel() {
  try {
    const firebaseUser = globalThis.firebase?.auth?.()?.currentUser;
    if (firebaseUser) {
      return firebaseUser.displayName || firebaseUser.email || "Unknown user";
    }
  } catch {
    // ignore auth lookup errors and fall back
  }
  return "Unknown user";
}

function getCurrentUserRoleLabel() {
  try {
    if (typeof globalThis.getCurrentUserRole === "function") {
      return globalThis.getCurrentUserRole();
    }

    const cachedUser = typeof globalThis.getCurrentUser === "function" ? globalThis.getCurrentUser() : null;
    return String(cachedUser?.role || "clerk").toLowerCase();
  } catch {
    return "clerk";
  }
}

function getCurrentPageForAudit() {
  try {
    if (typeof globalThis.getCurrentPageName === "function") {
      return globalThis.getCurrentPageName();
    }
    return location.pathname.split("/").pop() || "";
  } catch {
    return "";
  }
}

function ensureAuditLogStore(data) {
  if (!Array.isArray(data.auditLogs)) {
    data.auditLogs = [];
  }
}

function pushAuditLogEntry(data, action, details = {}) {
  ensureAuditLogStore(data);
  let fallbackValue = "";
  if (details !== null && details !== undefined) {
    try {
      fallbackValue = JSON.stringify(details);
    } catch {
      fallbackValue = "[unserializable]";
    }
  }
  const normalizedDetails = details && typeof details === "object"
    ? details
    : { value: fallbackValue };
  const entry = {
    id: generateId("audit"),
    action: String(action || "Unknown action"),
    details: normalizedDetails,
    date: getSelectedDate(),
    shift: getSelectedShift(),
    user: getCurrentUserLabel(),
    role: getCurrentUserRoleLabel(),
    page: getCurrentPageForAudit(),
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  };

  data.auditLogs.unshift(entry);
  if (data.auditLogs.length > AUDIT_LOG_LIMIT) {
    data.auditLogs = data.auditLogs.slice(0, AUDIT_LOG_LIMIT);
  }

  return entry;
}

function addAuditLog(action, details = {}) {
  const data = loadData();
  const entry = pushAuditLogEntry(data, action, details);
  saveData(data);
  return entry;
}

function getAuditLogs(limit = 200) {
  const data = loadData();
  ensureAuditLogStore(data);
  return data.auditLogs.slice(0, Math.max(0, asNumber(limit) || 200));
}

function clearAuditLogs() {
  const data = loadData();
  data.auditLogs = [];
  saveData(data);
}

function defaultClosingChecklist() {
  return {
    lastRunAt: 0,
    lastRunBy: "",
    lastPassedAt: 0,
    lastPassedBy: "",
    lastIssues: []
  };
}

function hasShiftData(shift) {
  if (!shift || typeof shift !== "object") return false;
  const recordingCount = Object.keys(shift.recording || {}).length;
  const balanceCount = Object.keys(shift.balance || {}).length;
  const returnsCount = Array.isArray(shift.returns) ? shift.returns.length : 0;
  const purchasesCount = Array.isArray(shift.purchases) ? shift.purchases.length : 0;
  const customersCount = Array.isArray(shift.customers) ? shift.customers.length : 0;
  return recordingCount > 0 || balanceCount > 0 || returnsCount > 0 || purchasesCount > 0 || customersCount > 0;
}

function ensureDayStore(data, date) {
  if (!data.daily[date]) {
    data.daily[date] = {
      day: {
        recordingColumns: 3,
        recording: {},
        balance: {},
        returns: [],
        purchases: [],
        locked: false,
        lockedBy: "",
        lockedAt: 0,
        closingChecklist: defaultClosingChecklist()
      },
      night: {
        recordingColumns: 3,
        recording: {},
        balance: {},
        returns: [],
        purchases: [],
        locked: false,
        lockedBy: "",
        lockedAt: 0,
        closingChecklist: defaultClosingChecklist()
      }
    };
  }

  const day = data.daily[date];
  
  // Ensure both shifts exist
  ["day", "night"].forEach((shiftId) => {
    if (!day[shiftId] || typeof day[shiftId] !== "object") {
      day[shiftId] = {
        recordingColumns: 3,
        recording: {},
        balance: {},
        returns: [],
        purchases: [],
        locked: false,
        lockedBy: "",
        lockedAt: 0,
        closingChecklist: defaultClosingChecklist()
      };
    }
    const shift = day[shiftId];
    if (!shift.recording || typeof shift.recording !== "object") shift.recording = {};
    if (!shift.balance || typeof shift.balance !== "object") shift.balance = {};
    if (!Array.isArray(shift.returns)) shift.returns = [];
    if (!Array.isArray(shift.purchases)) shift.purchases = [];
    if (!Array.isArray(shift.customers)) shift.customers = [];
    if (!Number.isInteger(shift.recordingColumns) || shift.recordingColumns < 1) shift.recordingColumns = 3;
    if (typeof shift.locked !== "boolean") shift.locked = false;
    if (typeof shift.lockedBy !== "string") shift.lockedBy = "";
    shift.lockedAt = asNumber(shift.lockedAt);
    if (!shift.closingChecklist || typeof shift.closingChecklist !== "object") {
      shift.closingChecklist = defaultClosingChecklist();
    }
    if (!Array.isArray(shift.closingChecklist.lastIssues)) shift.closingChecklist.lastIssues = [];
    shift.closingChecklist.lastRunAt = asNumber(shift.closingChecklist.lastRunAt);
    shift.closingChecklist.lastPassedAt = asNumber(shift.closingChecklist.lastPassedAt);
    if (typeof shift.closingChecklist.lastRunBy !== "string") shift.closingChecklist.lastRunBy = "";
    if (typeof shift.closingChecklist.lastPassedBy !== "string") shift.closingChecklist.lastPassedBy = "";
  });

  return day;
}

function getSelectedDate() {
  return localStorage.getItem(getSelectedDateStorageKey()) || localStorage.getItem(SELECTED_DATE_STORAGE_KEY) || todayISO();
}

function setSelectedDate(date) {
  localStorage.setItem(getSelectedDateStorageKey(), date);
}

function getSelectedShift() {
  if (isDayOnlySector()) {
    return "day";
  }
  const shift = localStorage.getItem(getSelectedShiftStorageKey()) || localStorage.getItem(SELECTED_SHIFT_STORAGE_KEY);
  return shift === "night" ? "night" : "day";
}

function setSelectedShift(shift) {
  if (isDayOnlySector()) {
    localStorage.setItem(getSelectedShiftStorageKey(), "day");
    return;
  }
  const normalized = shift === "night" ? "night" : "day";
  localStorage.setItem(getSelectedShiftStorageKey(), normalized);
}

function getShiftStore(data, date, shift = null) {
  const selectedShift = shift || getSelectedShift();
  const day = ensureDayStore(data, date);

  if (
    !shift &&
    getCurrentSectorId() === "water" &&
    selectedShift === "day" &&
    !hasShiftData(day.day) &&
    hasShiftData(day.night)
  ) {
    return day.night;
  }

  return day[selectedShift];
}

function getPreviousDateISO(date) {
  const targetDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) return "";
  targetDate.setDate(targetDate.getDate() - 1);
  return formatDateToLocalISO(targetDate);
}

function hasStockValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function getClosingFromShift(shiftStore, productId) {
  const closing = shiftStore?.balance?.[productId]?.closing;
  return hasStockValue(closing) ? closing : "";
}

function getPreviousClosingStock(data, date, productId, shift = null) {
  const selectedShift = shift || getSelectedShift();

  if (selectedShift === "night") {
    return getClosingFromShift(data.daily?.[date]?.day, productId);
  }

  const previousDate = getPreviousDateISO(date);
  if (!previousDate) return "";

  const previousDay = data.daily[previousDate];
  const previousNightClosing = getClosingFromShift(previousDay?.night, productId);
  if (hasStockValue(previousNightClosing)) return previousNightClosing;

  const previousDayClosing = getClosingFromShift(previousDay?.day, productId);
  return hasStockValue(previousDayClosing) ? previousDayClosing : "";
}

function getProductById(data, productId) {
  return data.products.find((item) => item.id === productId);
}

function getActiveProductsForDate(data, dateString) {
  if (!dateString) return data.products;
  
  return data.products.filter((product) => {
    const addedDate = product.addedDate;
    const deletedDate = product.deletedDate;
    
    // If product has addedDate, check if date is on or after addedDate
    if (addedDate && dateString < addedDate) {
      return false;
    }
    
    // If product has deletedDate, check if date is before deletedDate
    if (deletedDate && dateString >= deletedDate) {
      return false;
    }
    
    return true;
  });
}

function getCurrentWorkingDate() {
  const dateInput = document.getElementById('workingDate');
  if (dateInput?.value) {
    return dateInput.value;
  }
  return todayISO();
}

function addProduct(name) {
  const clean = String(name || "").trim();
  if (!clean) return { ok: false, message: "Product name is required." };

  const data = loadData();
  const currentDate = getCurrentWorkingDate();
  
  // Check if product exists and is active for current date
  const activeProducts = getActiveProductsForDate(data, currentDate);
  const exists = activeProducts.some((product) => product.name.toLowerCase() === clean.toLowerCase());
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
    palletFactor: inferPalletFactorFromName(clean),
    addedDate: currentDate
  });
  pushAuditLogEntry(data, "Product added", { productName: clean, effectiveDate: currentDate });
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

  const previous = target.palletFactor;
  target.palletFactor = value;
  pushAuditLogEntry(data, "Product pallet factor updated", {
    productName: target.name,
    previous,
    current: value
  });
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

  const previousName = target.name;
  target.name = clean;
  pushAuditLogEntry(data, "Product updated", {
    previousName,
    currentName: clean
  });
  saveData(data);
  return { ok: true };
}

function deleteProduct(productId) {
  const data = loadData();
  const target = data.products.find((item) => item.id === productId);
  if (!target) return { ok: false, message: "Product not found." };
  
  const currentDate = getCurrentWorkingDate();
  
  // Mark product as deleted from current date onwards
  target.deletedDate = currentDate;

  if (target) {
    const targetKey = String(target.name || "").toLowerCase().trim();
    const requiredKey = getRequiredProductsForSector().find((name) => name.toLowerCase() === targetKey);
    if (requiredKey) {
      data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
      const deleted = Array.isArray(data._meta.deletedRequired) ? data._meta.deletedRequired : [];
      if (!deleted.some((item) => String(item).toLowerCase().trim() === targetKey)) {
        deleted.push(requiredKey);
      }
      data._meta.deletedRequired = deleted;
    }
  }

  // Remove records only for current date and future dates
  Object.keys(data.daily).forEach((dateKey) => {
    if (dateKey >= currentDate) {
      const day = data.daily[dateKey];
      ["day", "night"].forEach((shiftId) => {
        const shift = day[shiftId];
        if (!shift) return;
        if (shift.recording) delete shift.recording[productId];
        if (shift.balance) delete shift.balance[productId];
        if (Array.isArray(shift.purchases)) {
          shift.purchases = shift.purchases.filter((purchase) => purchase.productId !== productId);
        }
      });
    }
  });

  pushAuditLogEntry(data, "Product deleted", {
    productName: target?.name || "Unknown product",
    productId,
    effectiveDate: currentDate
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
