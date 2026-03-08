let cloudSyncState = {
  enabled: false,
  ready: false,
  user: null,
  pushing: false,
  pullInProgress: false,
  debounceTimer: null,
  firestore: null,
  auth: null,
  docRef: null,
  lastPullTime: 0
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
  const current = location.pathname.split("/").pop() || "index.html";
  if (current !== "home.html" && current !== "index.html") return;

  const controls = document.getElementById("homeCloudAuthMount") || document.querySelector(".topbar-controls");
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

function hasMeaningfulDailyData(data) {
  if (!data || typeof data !== "object") return false;
  const daily = data.daily && typeof data.daily === "object" ? data.daily : {};

  return Object.values(daily).some((dayValue) => {
    if (!dayValue || typeof dayValue !== "object") return false;
    return ["day", "night"].some((shiftKey) => {
      const shift = dayValue[shiftKey];
      if (!shift || typeof shift !== "object") return false;

      const recordingCount = Object.keys(shift.recording || {}).length;
      const balanceCount = Object.keys(shift.balance || {}).length;
      const purchaseCount = Array.isArray(shift.purchases) ? shift.purchases.length : 0;

      return recordingCount > 0 || balanceCount > 0 || purchaseCount > 0;
    });
  });
}

async function pullFromCloudIfNewer() {
  if (!cloudSyncState.user || cloudSyncState.pullInProgress) return;
  const docRef = getCloudDocRef();
  if (!docRef) return;

  // Check if we already synced this session to prevent refresh loops
  const sessionKey = 'cloudSyncCompleted';
  if (sessionStorage.getItem(sessionKey) === 'true') {
    return;
  }

  cloudSyncState.pullInProgress = true;
  try {
    // Clear any pending push operations
    globalThis.clearTimeout(cloudSyncState.debounceTimer);
    cloudSyncState.debounceTimer = null;
    
    const snapshot = await docRef.get();
    if (!snapshot.exists) return;

    const payload = snapshot.data() || {};
    const cloudData = payload.data;
    if (!cloudData || typeof cloudData !== "object") return;

    const localData = loadData();
    const localUpdatedAt = asNumber(localData?._meta?.updatedAt);
    const cloudUpdatedAt = asNumber(cloudData?._meta?.updatedAt);
    const localHasData = hasMeaningfulDailyData(localData);
    const cloudHasData = hasMeaningfulDailyData(cloudData);

    const shouldRecoverFromCloud = !localHasData && cloudHasData;

    if (cloudUpdatedAt > localUpdatedAt || shouldRecoverFromCloud) {
      saveData(cloudData, true); // Preserve timestamp to avoid sync loop
      cloudSyncState.lastPullTime = Date.now(); // Record pull time
      setCloudStatus(
        shouldRecoverFromCloud ? "Cloud recovery: historical data loaded" : "Cloud sync: latest data loaded",
        "ok"
      );
      // Mark sync as completed in this session
      sessionStorage.setItem('cloudSyncCompleted', 'true');
      globalThis.setTimeout(() => {
        location.reload();
      }, 400);
    } else {
      // Data is up to date, mark as synced
      cloudSyncState.lastPullTime = Date.now(); // Record check time
      sessionStorage.setItem('cloudSyncCompleted', 'true');
    }
  } catch (error) {
    setCloudStatus(getCloudSyncErrorMessage(error, "pull"), "error");
  } finally {
    cloudSyncState.pullInProgress = false;
  }
}

async function pushLocalToCloud() {
  if (!cloudSyncState.user || cloudSyncState.pushing) return;
  const docRef = getCloudDocRef();
  if (!docRef) return;

  // Don't push within 5 seconds of pulling to avoid loops
  const timeSinceLastPull = Date.now() - cloudSyncState.lastPullTime;
  if (timeSinceLastPull < 5000) {
    return;
  }

  cloudSyncState.pushing = true;
  try {
    const data = loadData();
    const localHasData = hasMeaningfulDailyData(data);

    if (!localHasData) {
      const existing = await docRef.get();
      if (existing.exists) {
        const payload = existing.data() || {};
        const cloudData = payload.data;
        if (cloudData && hasMeaningfulDailyData(cloudData)) {
          setCloudStatus("Cloud sync paused: local data is empty", "error");
          return;
        }
      }
    }

    await docRef.set(
      {
        data,
        updatedAt: Date.now(),
        updatedBy: cloudSyncState.user.uid
      },
      { merge: true }
    );
    setCloudStatus("Cloud sync: up to date", "ok");
  } catch (error) {
    setCloudStatus(getCloudSyncErrorMessage(error, "push"), "error");
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

function getCloudSyncErrorMessage(error, action = "sync") {
  const code = error?.code || "";

  if (code === "permission-denied") {
    return `Cloud ${action} blocked: update Firestore rules for warehousePortal/twellium-main.`;
  }
  if (code === "unauthenticated") {
    return `Cloud ${action} blocked: sign in to cloud first.`;
  }

  return `Cloud ${action} failed`;
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
    sessionStorage.removeItem('cloudSyncCompleted'); // Allow fresh sync on next sign in
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
      
      // Clear sync flag when auth state changes to allow fresh sync
      if (!user) {
        sessionStorage.removeItem('cloudSyncCompleted');
      }
      
      renderCloudAuthState();

      if (cloudSyncState.user) {
        await pullFromCloudIfNewer();
        // Don't push immediately after pull to avoid loops
      }
    });

    globalThis.addEventListener("warehouse:data-saved", () => {
      // Only push if user is signed in and not currently pulling
      if (cloudSyncState.user && !cloudSyncState.pullInProgress) {
        queueCloudPush();
      }
    });
  } catch {
    cloudSyncState.enabled = false;
    setCloudStatus("Cloud setup failed", "error");
    renderCloudAuthState();
  }
}

document.addEventListener("DOMContentLoaded", initCloudSync);
