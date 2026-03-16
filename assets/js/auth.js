function initFirebase() {
  if (!globalThis.firebase?.initializeApp) {
    throw new Error("Firebase SDK not loaded.");
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
  const auth = initFirebase();
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        globalThis.location.href = "login.html";
        return;
      }
      resolve(user);
    });
  });
}

async function loginWithEmail(email, password) {
  const auth = initFirebase();
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
  const auth = initFirebase();
  return auth.signOut().then(() => {
    globalThis.location.href = "login.html";
  });
}
