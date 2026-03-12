globalThis.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC651dys2QFuA9Q5yXuaYu78cXKhqJBUHk",
  authDomain: "twellium-warehouse-portal.firebaseapp.com",
  projectId: "twellium-warehouse-portal",
  storageBucket: "twellium-warehouse-portal.firebasestorage.app",
  messagingSenderId: "379534817848",
  appId: "1:379534817848:web:1004ca9a72e30b454484cd"
};

globalThis.FIREBASE_CLOUD_DOC = {
  collection: "warehousePortal",
  document: "twellium-main"
};

globalThis.WAREHOUSE_SECTORS = [
  { id: "water", label: "Water & Beverages" },
  { id: "hh", label: "H&H Products" },
  { id: "mcberry", label: "Mcberry Products" }
];

globalThis.FIREBASE_CLOUD_DOCS = {
  water: { collection: "warehousePortal", document: "twellium-main" },
  hh: { collection: "warehousePortal", document: "hh-main" },
  mcberry: { collection: "warehousePortal", document: "mcberry-main" }
};
