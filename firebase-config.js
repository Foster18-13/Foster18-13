const FIREBASE_CONFIG_STORAGE_KEY = "firebaseRuntimeConfig";
const FIREBASE_DB_PATH_STORAGE_KEY = "firebaseRuntimeDbPath";

const defaultFirebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
  databaseURL: "REPLACE_WITH_FIREBASE_DATABASE_URL",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID"
};

function readStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredFirebaseDbPath() {
  try {
    return localStorage.getItem(FIREBASE_DB_PATH_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveFirebaseRuntimeConfig(config, dbPath) {
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config || {}));
  localStorage.setItem(FIREBASE_DB_PATH_STORAGE_KEY, dbPath || "twelliumWarehousePortal");
}

function clearFirebaseRuntimeConfig() {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  localStorage.removeItem(FIREBASE_DB_PATH_STORAGE_KEY);
}

const FIREBASE_CONFIG = readStoredFirebaseConfig() || defaultFirebaseConfig;
const FIREBASE_DB_PATH = readStoredFirebaseDbPath() || "twelliumWarehousePortal";

globalThis.getFirebaseRuntimeConfig = () => ({ ...FIREBASE_CONFIG });
globalThis.getFirebaseRuntimeDbPath = () => FIREBASE_DB_PATH;
globalThis.saveFirebaseRuntimeConfig = saveFirebaseRuntimeConfig;
globalThis.clearFirebaseRuntimeConfig = clearFirebaseRuntimeConfig;
