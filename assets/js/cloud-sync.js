let cloudSyncState = {
  enabled: false,
  ready: false,
  user: null,
  pushing: false,
  pullInProgress: false,
  debounceTimer: null,
  firestore: null,
  auth: null,
  docRef: null
};

function hasFirebaseConfig() {
  const config = globalThis.FIREBASE_CONFIG;
  return !!(
    config?.apiKey &&
    config?.authDomain &&
    config?.projectId &&
    config?.appId
  );
}

function ensureCloudControls() {
  const controls = document.querySelector(".topbar-controls");
  if (!controls || document.getElementById("cloudAuthArea")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "cloudAuthArea";
  wrapper.className = "cloud-auth-area";
  wrapper.innerHTML = `
    <button class="button" id="cloudSignInBtn" type="button">Cloud Sign In</button>
    <button class="button" id="cloudSignOutBtn" type="button" style="display:none;">Sign Out</button>
    <span class="status" id="cloudStatus">Local mode</span>
  `;

  controls.appendChild(wrapper);
}

function setCloudStatus(message, type = "") {
  const cloudStatus = document.getElementById("cloudStatus");
  if (!cloudStatus) return;
  cloudStatus.textContent = message;
  cloudStatus.className = `status ${type}`.trim();
}

function renderCloudAuthState() {
  const signInBtn = document.getElementById("cloudSignInBtn");
  const signOutBtn = document.getElementById("cloudSignOutBtn");
  if (!signInBtn || !signOutBtn) return;

  if (cloudSyncState.user) {
    signInBtn.style.display = "none";
    signOutBtn.style.display = "";
    const label = cloudSyncState.user.email || cloudSyncState.user.displayName || "Signed in";
    setCloudStatus(`Cloud: ${label}`, "ok");
  } else if (cloudSyncState.enabled) {
    signInBtn.style.display = "";
    signOutBtn.style.display = "none";
    setCloudStatus("Cloud ready (not signed in)");
  } else {
    signInBtn.style.display = "";
    signOutBtn.style.display = "none";
    setCloudStatus("Local mode");
  }
}

function getCloudDocRef() {
  if (!cloudSyncState.firestore) return null;
  if (cloudSyncState.docRef) return cloudSyncState.docRef;

  const location = globalThis.FIREBASE_CLOUD_DOC || {};
  const collection = location.collection || "warehousePortal";
  const documentId = location.document || "twellium-main";
  cloudSyncState.docRef = cloudSyncState.firestore.collection(collection).doc(documentId);
  return cloudSyncState.docRef;
}

async function pullFromCloudIfNewer() {
  if (!cloudSyncState.user || cloudSyncState.pullInProgress) return;
  const docRef = getCloudDocRef();
  if (!docRef) return;

  cloudSyncState.pullInProgress = true;
  try {
    const snapshot = await docRef.get();
    if (!snapshot.exists) return;

    const payload = snapshot.data() || {};
    const cloudData = payload.data;
    if (!cloudData || typeof cloudData !== "object") return;

    const localData = loadData();
    const localUpdatedAt = asNumber(localData?._meta?.updatedAt);
    const cloudUpdatedAt = asNumber(cloudData?._meta?.updatedAt);

    if (cloudUpdatedAt > localUpdatedAt) {
      saveData(cloudData);
      setCloudStatus("Cloud sync: latest data loaded", "ok");
      globalThis.setTimeout(() => {
        location.reload();
      }, 400);
    }
  } catch {
    setCloudStatus("Cloud pull failed", "error");
  } finally {
    cloudSyncState.pullInProgress = false;
  }
}

async function pushLocalToCloud() {
  if (!cloudSyncState.user || cloudSyncState.pushing) return;
  const docRef = getCloudDocRef();
  if (!docRef) return;

  cloudSyncState.pushing = true;
  try {
    const data = loadData();
    await docRef.set(
      {
        data,
        updatedAt: Date.now(),
        updatedBy: cloudSyncState.user.uid
      },
      { merge: true }
    );
    setCloudStatus("Cloud sync: up to date", "ok");
  } catch {
    setCloudStatus("Cloud push failed", "error");
  } finally {
    cloudSyncState.pushing = false;
  }
}

function queueCloudPush() {
  if (!cloudSyncState.user) return;
  globalThis.clearTimeout(cloudSyncState.debounceTimer);
  cloudSyncState.debounceTimer = globalThis.setTimeout(() => {
    pushLocalToCloud();
  }, 600);
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";

  if (code === "auth/unauthorized-domain") {
    const host = globalThis.location?.hostname || "this domain";
    return `Sign in blocked: add ${host} to Firebase Authorized Domains.`;
  }
  if (code === "auth/operation-not-allowed") {
    return "Sign in blocked: enable Google provider in Firebase Authentication.";
  }
  if (code === "auth/invalid-api-key") {
    return "Sign in blocked: Firebase apiKey is invalid.";
  }
  if (code === "auth/app-not-authorized") {
    return "Sign in blocked: app not authorized in Firebase project settings.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup blocked by browser; switching to redirect sign-in.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign in popup was closed before completion.";
  }

  return error?.message ? `Sign in failed: ${error.message}` : "Sign in failed.";
}

async function finalizeRedirectResult() {
  if (!cloudSyncState.auth) return;
  try {
    await cloudSyncState.auth.getRedirectResult();
  } catch (error) {
    setCloudStatus(getAuthErrorMessage(error), "error");
  }
}

async function handleCloudSignIn() {
  if (!cloudSyncState.auth || !globalThis.firebase?.auth) return;
  const provider = new globalThis.firebase.auth.GoogleAuthProvider();

  try {
    await cloudSyncState.auth.signInWithPopup(provider);
  } catch (error) {
    const message = getAuthErrorMessage(error);
    if (error?.code === "auth/popup-blocked") {
      setCloudStatus(message, "error");
      try {
        await cloudSyncState.auth.signInWithRedirect(provider);
      } catch (redirectError) {
        setCloudStatus(getAuthErrorMessage(redirectError), "error");
      }
      return;
    }
    setCloudStatus(message, "error");
  }
}

async function handleCloudSignOut() {
  if (!cloudSyncState.auth) return;
  try {
    await cloudSyncState.auth.signOut();
    setCloudStatus("Signed out (local mode)");
  } catch {
    setCloudStatus("Sign out failed", "error");
  }
}

function wireCloudButtons() {
  const signInBtn = document.getElementById("cloudSignInBtn");
  const signOutBtn = document.getElementById("cloudSignOutBtn");
  if (signInBtn) signInBtn.addEventListener("click", handleCloudSignIn);
  if (signOutBtn) signOutBtn.addEventListener("click", handleCloudSignOut);
}

function initCloudSync() {
  ensureCloudControls();

  if (!hasFirebaseConfig()) {
    cloudSyncState.enabled = false;
    setCloudStatus("Local mode (add Firebase config)");
    renderCloudAuthState();
    return;
  }

  if (!globalThis.firebase?.initializeApp) {
    cloudSyncState.enabled = false;
    setCloudStatus("Firebase SDK not loaded", "error");
    renderCloudAuthState();
    return;
  }

  try {
    if (!globalThis.firebase.apps.length) {
      globalThis.firebase.initializeApp(globalThis.FIREBASE_CONFIG);
    }

    cloudSyncState.auth = globalThis.firebase.auth();
    cloudSyncState.firestore = globalThis.firebase.firestore();
    cloudSyncState.enabled = true;
    cloudSyncState.ready = true;

    finalizeRedirectResult();

    wireCloudButtons();
    renderCloudAuthState();

    cloudSyncState.auth.onAuthStateChanged(async (user) => {
      cloudSyncState.user = user || null;
      renderCloudAuthState();

      if (cloudSyncState.user) {
        await pullFromCloudIfNewer();
        queueCloudPush();
      }
    });

    globalThis.addEventListener("warehouse:data-saved", () => {
      queueCloudPush();
    });
  } catch {
    cloudSyncState.enabled = false;
    setCloudStatus("Cloud setup failed", "error");
    renderCloudAuthState();
  }
}

document.addEventListener("DOMContentLoaded", initCloudSync);
