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
const activeRealtimeSubscriptions = [];

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

function cloudSyncSubscribe(keys, onChange = null) {
  if (!ensureFirebaseReady()) return () => {};

  const targetKeys = Array.isArray(keys) && keys.length ? keys : SYNC_KEYS;

  const refs = [];

  targetKeys.forEach((key) => {
    try {
      const ref = keyRef(key);
      const handler = (snapshot) => {
        if (snapshot.exists()) {
          localStorage.setItem(key, JSON.stringify(snapshot.val()));
        } else {
          localStorage.removeItem(key);
        }

        if (typeof onChange === "function") {
          onChange(key, snapshot.exists() ? snapshot.val() : null);
        }
      };

      ref.on("value", handler);
      refs.push({ ref, handler });
      activeRealtimeSubscriptions.push({ ref, handler });
    } catch {
      // Continue other keys
    }
  });

  return () => {
    refs.forEach(({ ref, handler }) => {
      try {
        ref.off("value", handler);
      } catch {
        // ignore
      }
    });
  };
}

function cloudSyncUnsubscribeAll() {
  while (activeRealtimeSubscriptions.length) {
    const item = activeRealtimeSubscriptions.pop();
    try {
      item.ref.off("value", item.handler);
    } catch {
      // ignore
    }
  }
}

globalThis.cloudSyncSaveKey = cloudSyncSaveKey;
globalThis.cloudSyncHydrate = cloudSyncHydrate;
globalThis.cloudSyncHydrateAll = cloudSyncHydrateAll;
globalThis.cloudSyncSubscribe = cloudSyncSubscribe;
globalThis.cloudSyncUnsubscribeAll = cloudSyncUnsubscribeAll;
