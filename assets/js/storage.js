const STORAGE_KEY = "twellium_warehouse_portal_v1";
const LEGACY_DAILY_RECORDS_KEY = "dailyRecordingSheetData";
const LEGACY_DAILY_BALANCE_KEY = "dailyBalanceSheetData";
const LOCAL_BACKUP_STORAGE_KEY = "twellium_warehouse_portal_backup_v1";
const LOCAL_BACKUP_LIMIT = 40;
const AUDIT_LOG_LIMIT = 500;
const REQUIRED_PRODUCTS = [
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
  return {
    products: REQUIRED_PRODUCTS.map((name) => ({
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
    const raw = localStorage.getItem(LOCAL_BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackupHistory(backups) {
  try {
    localStorage.setItem(LOCAL_BACKUP_STORAGE_KEY, JSON.stringify(backups));
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

function addLocalBackupSnapshot(data, source = "auto-save") {
  const snapshot = createWarehouseSnapshot(data);
  const score = getDailySnapshotScore(snapshot);
  const history = safeReadBackupHistory();
  const backupItem = {
    timestamp: Date.now(),
    source,
    score,
    data: snapshot
  };

  history.unshift(backupItem);
  const trimmed = history.slice(0, LOCAL_BACKUP_LIMIT);
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
    STORAGE_KEY,
    LEGACY_DAILY_RECORDS_KEY,
    LEGACY_DAILY_BALANCE_KEY,
    "twellium_selected_date",
    "twellium_selected_shift"
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

function saveData(data, preserveTimestamp = false) {
  data._meta = data._meta && typeof data._meta === "object" ? data._meta : {};
  if (!preserveTimestamp) {
    data._meta.updatedAt = Date.now();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
        lockedAt: 0
      },
      night: {
        recordingColumns: 3,
        recording: {},
        balance: {},
        returns: [],
        purchases: [],
        locked: false,
        lockedBy: "",
        lockedAt: 0
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
        lockedAt: 0
      };
    }
    const shift = day[shiftId];
    if (!shift.recording || typeof shift.recording !== "object") shift.recording = {};
    if (!shift.balance || typeof shift.balance !== "object") shift.balance = {};
    if (!Array.isArray(shift.returns)) shift.returns = [];
    if (!Array.isArray(shift.purchases)) shift.purchases = [];
    if (!Number.isInteger(shift.recordingColumns) || shift.recordingColumns < 1) shift.recordingColumns = 3;
    if (typeof shift.locked !== "boolean") shift.locked = false;
    if (typeof shift.lockedBy !== "string") shift.lockedBy = "";
    shift.lockedAt = asNumber(shift.lockedAt);
  });

  return day;
}

function getSelectedDate() {
  return localStorage.getItem("twellium_selected_date") || todayISO();
}

function setSelectedDate(date) {
  localStorage.setItem("twellium_selected_date", date);
}

function getSelectedShift() {
  const shift = localStorage.getItem("twellium_selected_shift");
  return shift === "night" ? "night" : "day";
}

function setSelectedShift(shift) {
  const normalized = shift === "night" ? "night" : "day";
  localStorage.setItem("twellium_selected_shift", normalized);
}

function getShiftStore(data, date, shift = null) {
  const selectedShift = shift || getSelectedShift();
  const day = ensureDayStore(data, date);
  return day[selectedShift];
}

function getPreviousDateISO(date) {
  const targetDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) return "";
  targetDate.setDate(targetDate.getDate() - 1);
  return formatDateToLocalISO(targetDate);
}

function getPreviousClosingStock(data, date, productId, shift = null) {
  const selectedShift = shift || getSelectedShift();
  
  // For night shift, get current day's day shift closing
  if (selectedShift === "night") {
    const currentDay = data.daily[date];
    if (currentDay?.day?.balance) {
      const dayBalance = currentDay.day.balance[productId] || {};
      const closingStock = dayBalance.closing;
      if (closingStock !== null && closingStock !== undefined && closingStock !== "") {
        return closingStock;
      }
    }
    return "";
  }
  
  // For day shift, get previous day's night shift closing
  const previousDate = getPreviousDateISO(date);
  if (!previousDate) return "";

  const previousDay = data.daily[previousDate];
  if (!previousDay?.night?.balance) return "";

  const previousBalance = previousDay.night.balance[productId] || {};
  const closingStock = previousBalance.closing;
  if (closingStock === null || closingStock === undefined || closingStock === "") {
    return "";
  }

  return closingStock;
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
