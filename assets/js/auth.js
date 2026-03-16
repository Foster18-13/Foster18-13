function initFirebase() {
  if (!globalThis.firebase?.initializeApp) {
    return null;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(globalThis.FIREBASE_CONFIG);
  }
  return firebase.auth();
}

function setSector(sectorId) {
  const value = String(sectorId || "").toLowerCase().trim();
  sessionStorage.setItem("warehouseSector", value);
  localStorage.setItem("warehouseSector", value);
}

function getSector() {
  return sessionStorage.getItem("warehouseSector") || localStorage.getItem("warehouseSector") || "water";
}

function requireAuth() {
  return Promise.resolve({
    email: "Guest Access",
    uid: "guest"
  });
}

async function loginWithEmail(email, password) {
  const auth = initFirebase();
  if (!auth) {
    const err = new Error("Login portal has been removed.");
    err.code = "auth/operation-not-allowed";
    throw err;
  }
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const rawPassword = String(password || "");
  const trimmedPassword = rawPassword.trim();

  await auth.fetchSignInMethodsForEmail(normalizedEmail);

  try {
    return await auth.signInWithEmailAndPassword(normalizedEmail, rawPassword);
  } catch (error) {
    if ((error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") && trimmedPassword !== rawPassword) {
      return await auth.signInWithEmailAndPassword(normalizedEmail, trimmedPassword);
    }
    throw error;
  }
}

function logoutUser() {
  sessionStorage.removeItem("warehouseSector");
  localStorage.removeItem("warehouseSector");
  sessionStorage.removeItem("twelliumWarehouseShift:water");
  globalThis.location.href = "sector-select.html";
  return Promise.resolve();
}
