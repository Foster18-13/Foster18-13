const SYNC_KEYS = [
  "portalProductList",
  "dailyRecordingSheetData",
  "dailyBalanceSheetData",
  "dailyPortalNoteContent",
  "recordingLoadingTotals",
  "availableStockData",
  "portalNoteContent"
];

let syncDatabase = null;

function canInitFirebase() {
  return typeof firebase !== "undefined"
    && typeof FIREBASE_CONFIG !== "undefined"
    && FIREBASE_CONFIG
    && typeof FIREBASE_CONFIG.databaseURL === "string"
    && !FIREBASE_CONFIG.databaseURL.includes("REPLACE_WITH");
}

function ensureFirebaseReady() {
  if (syncDatabase) return true;
  if (!canInitFirebase()) return false;

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    syncDatabase = firebase.database();
    return true;
  } catch {
    syncDatabase = null;
    return false;
  }
}

function keyRef(key) {
  const root = typeof FIREBASE_DB_PATH === "string" && FIREBASE_DB_PATH ? FIREBASE_DB_PATH : "twelliumWarehousePortal";
  return syncDatabase.ref(`${root}/${key}`);
}

async function cloudSyncSaveKey(key, value) {
  if (!ensureFirebaseReady()) return false;
  try {
    await keyRef(key).set(value);
    return true;
  } catch {
    return false;
  }
}

async function cloudSyncHydrate(keys = SYNC_KEYS) {
  if (!ensureFirebaseReady()) return false;

  for (const key of keys) {
    try {
      const snapshot = await keyRef(key).get();
      if (snapshot.exists()) {
        localStorage.setItem(key, JSON.stringify(snapshot.val()));
      }
    } catch {
      // Continue for other keys
    }
  }

  return true;
}

async function cloudSyncHydrateAll() {
  return cloudSyncHydrate(SYNC_KEYS);
}

globalThis.cloudSyncSaveKey = cloudSyncSaveKey;
globalThis.cloudSyncHydrate = cloudSyncHydrate;
globalThis.cloudSyncHydrateAll = cloudSyncHydrateAll;
