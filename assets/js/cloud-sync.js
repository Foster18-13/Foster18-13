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
  lastPullTime: 0,
  initialized: false,
  realtimeUnsubscribe: null,
  lastSeenCloudUpdatedAt: 0
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

  // Try to find a place to put the controls
  let controls = document.getElementById("homeCloudAuthMount");
  if (!controls) {
    controls = document.querySelector(".topbar-controls");
  }
  
  if (!controls) return;
  
  // Check if controls already exist to avoid duplicates
  if (document.getElementById("cloudAuthArea")) return;

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

function getCloudLocationForCurrentSector() {
  if (typeof globalThis.getCurrentSectorConfig === "function") {
    return globalThis.getCurrentSectorConfig();
  }
  return globalThis.FIREBASE_CLOUD_DOC || { collection: "warehousePortal", document: "twellium-main" };
}

function getCloudDocRef() {
  if (!cloudSyncState.firestore) {
    console.warn("[Cloud Sync] Firestore not initialized");
    return null;
  }
  if (cloudSyncState.docRef) return cloudSyncState.docRef;

  const location = getCloudLocationForCurrentSector() || {};
  const collection = location.collection || "warehousePortal";
  const documentId = location.document || "twellium-main";
  
  cloudSyncState.docRef = cloudSyncState.firestore.collection(collection).doc(documentId);
  console.log("[Cloud Sync] Document reference created:", collection, documentId);
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

function mergeProductLists(localProducts, cloudProducts) {
  const byKey = new Map();

  const register = (product) => {
    if (!product || typeof product !== "object") return;
    const idKey = product.id ? `id:${product.id}` : "";
    const nameKey = product.name ? `name:${String(product.name).toLowerCase()}` : "";
    const key = idKey || nameKey;
    if (!key) return;
    if (!byKey.has(key)) {
      byKey.set(key, product);
      return;
    }

    const current = byKey.get(key) || {};
    byKey.set(key, {
      ...current,
      ...product
    });
  };

  (Array.isArray(cloudProducts) ? cloudProducts : []).forEach(register);
  (Array.isArray(localProducts) ? localProducts : []).forEach(register);

  return Array.from(byKey.values());
}

function mergeCloudHistoryIfWindowedLocal(localData, cloudData) {
  const localMeta = localData?._meta && typeof localData._meta === "object" ? localData._meta : {};
  const shouldMergeHistory = !!localMeta.cloudPriorityCache;

  if (!shouldMergeHistory) {
    return localData;
  }

  const merged = {
    ...localData,
    daily: {
      ...(cloudData?.daily && typeof cloudData.daily === "object" ? cloudData.daily : {}),
      ...(localData?.daily && typeof localData.daily === "object" ? localData.daily : {})
    },
    products: mergeProductLists(localData?.products, cloudData?.products)
  };

  return merged;
}

async function pullFromCloudIfNewer(forceCheck = false) {
  if (!cloudSyncState.user || cloudSyncState.pullInProgress) return;
  const docRef = getCloudDocRef();
  if (!docRef) {
    console.warn("[Cloud Sync] No document reference available for pull");
    return;
  }

  // Prevent too-frequent pulls (min 10 seconds between checks unless forced)
  const timeSinceLastPull = Date.now() - cloudSyncState.lastPullTime;
  if (!forceCheck && timeSinceLastPull < 10000) {
    return;
  }

  console.log("[Cloud Sync] Attempting to pull from cloud...");
  cloudSyncState.pullInProgress = true;
  try {
    // Clear any pending push operations
    globalThis.clearTimeout(cloudSyncState.debounceTimer);
    cloudSyncState.debounceTimer = null;
    
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      console.log("[Cloud Sync] Cloud document does not exist yet");
      return;
    }

    const payload = snapshot.data() || {};
    const cloudData = payload.data;
    if (!cloudData || typeof cloudData !== "object") {
      console.warn("[Cloud Sync] Cloud data is invalid");
      return;
    }

    const localData = loadData();
    const localUpdatedAt = asNumber(localData?._meta?.updatedAt);
    const cloudUpdatedAt = asNumber(cloudData?._meta?.updatedAt);
    const localHasData = hasMeaningfulDailyData(localData);
    const cloudHasData = hasMeaningfulDailyData(cloudData);

    const shouldRecoverFromCloud = !localHasData && cloudHasData;

    console.log("[Cloud Sync] Pull check:", {localUpdatedAt, cloudUpdatedAt, shouldRecover: shouldRecoverFromCloud});

    if (cloudUpdatedAt > localUpdatedAt || shouldRecoverFromCloud) {
      saveData(cloudData, true); // Preserve timestamp to avoid sync loop
      cloudSyncState.lastPullTime = Date.now(); // Record pull time
      cloudSyncState.lastSeenCloudUpdatedAt = cloudUpdatedAt;
      setCloudStatus(
        shouldRecoverFromCloud ? "Cloud recovery: historical data loaded" : "Cloud sync: latest data loaded",
        "ok"
      );
      console.log("[Cloud Sync] Data pulled successfully from cloud");

      if (typeof globalThis.dispatchEvent === "function") {
        globalThis.dispatchEvent(
          new CustomEvent("warehouse:data-saved", {
            detail: { data: cloudData, fromCloud: true }
          })
        );
      }
    } else {
      // Data is up to date
      cloudSyncState.lastPullTime = Date.now(); // Record check time
      setCloudStatus("Cloud sync: up to date", "ok");
      console.log("[Cloud Sync] Data is already up to date");
    }
  } catch (error) {
    const errorMsg = getCloudSyncErrorMessage(error, "pull");
    console.error("[Cloud Sync] Pull failed:", error?.code, error?.message);
    setCloudStatus(errorMsg, "error");
  } finally {
    cloudSyncState.pullInProgress = false;
  }
}

function stopRealtimeCloudListener() {
  if (typeof cloudSyncState.realtimeUnsubscribe === "function") {
    cloudSyncState.realtimeUnsubscribe();
  }
  cloudSyncState.realtimeUnsubscribe = null;
}

function startRealtimeCloudListener() {
  if (!cloudSyncState.user || !cloudSyncState.firestore) return;

  stopRealtimeCloudListener();

  const docRef = getCloudDocRef();
  if (!docRef || typeof docRef.onSnapshot !== "function") return;

  cloudSyncState.realtimeUnsubscribe = docRef.onSnapshot(
    (snapshot) => {
      if (!snapshot?.exists) return;

      const payload = snapshot.data() || {};
      const cloudData = payload.data;
      if (!cloudData || typeof cloudData !== "object") return;

      const localData = loadData();
      const localUpdatedAt = asNumber(localData?._meta?.updatedAt);
      const cloudUpdatedAt = asNumber(cloudData?._meta?.updatedAt);
      const cloudHasData = hasMeaningfulDailyData(cloudData);
      const localHasData = hasMeaningfulDailyData(localData);
      const shouldRecoverFromCloud = !localHasData && cloudHasData;
      const wasAlreadyHandled = cloudUpdatedAt > 0 && cloudUpdatedAt <= cloudSyncState.lastSeenCloudUpdatedAt;

      if (wasAlreadyHandled) return;

      if (cloudUpdatedAt > localUpdatedAt || shouldRecoverFromCloud) {
        saveData(cloudData, true);
        cloudSyncState.lastPullTime = Date.now();
        cloudSyncState.lastSeenCloudUpdatedAt = cloudUpdatedAt;
        setCloudStatus("Cloud sync: live update received", "ok");

        if (typeof globalThis.dispatchEvent === "function") {
          globalThis.dispatchEvent(
            new CustomEvent("warehouse:data-saved", {
              detail: { data: cloudData, fromCloud: true }
            })
          );
        }
      }
    },
    (error) => {
      const errorMsg = getCloudSyncErrorMessage(error, "listen");
      console.error("[Cloud Sync] Realtime listener failed:", error?.code, error?.message);
      setCloudStatus(errorMsg, "error");
    }
  );
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
    const localData = loadData();
    const localHasData = hasMeaningfulDailyData(localData);
    const existing = await docRef.get();
    const cloudData = existing.exists ? existing.data()?.data : null;
    const dataToUpload = mergeCloudHistoryIfWindowedLocal(localData, cloudData);

    if (!localHasData) {
      if (existing.exists) {
        if (cloudData && hasMeaningfulDailyData(cloudData)) {
          setCloudStatus("Cloud sync paused: local data is empty", "error");
          return;
        }
      }
    }

    await docRef.set(
      {
        data: dataToUpload,
        updatedAt: Date.now(),
        updatedBy: cloudSyncState.user.uid
      },
      { merge: true }
    );
    setCloudStatus("Cloud sync: up to date", "ok");
  } catch (error) {
    const errorMsg = getCloudSyncErrorMessage(error, "push");
    console.error("[Cloud Sync] Push failed:", error?.code, error?.message);
    setCloudStatus(errorMsg, "error");
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
  const message = error?.message || "";
  const location = getCloudLocationForCurrentSector();
  const target = `${location.collection || "warehousePortal"}/${location.document || "twellium-main"}`;

  if (code === "permission-denied") {
    return `Cloud ${action} blocked: Firestore permission denied. Administrator needs to update security rules for ${target} collection.`;
  }
  if (code === "unauthenticated") {
    return `Cloud ${action} blocked: You need to sign in to cloud first.`;
  }
  if (code === "not-found") {
    return `Cloud ${action}: Document not found in cloud. It may not exist yet.`;
  }
  if (message?.includes("quota") || message?.includes("QuotaExceedError")) {
    return `Cloud ${action}: Local storage full. Old records have been cleaned up. Try again in a moment.`;
  }

  return `Cloud ${action} failed: ${message || code || "Unknown error"}`;
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
  // Prevent multiple initializations
  if (cloudSyncState.initialized) {
    return;
  }
  cloudSyncState.initialized = true;

  // Debug: Log initialization
  console.log("[Cloud Sync] Initializing...");
  
  ensureCloudControls();

  if (!hasFirebaseConfig()) {
    cloudSyncState.enabled = false;
    setCloudStatus("Local mode (add Firebase config)");
    renderCloudAuthState();
    console.log("[Cloud Sync] Firebase config missing");
    return;
  }

  if (!globalThis.firebase?.initializeApp) {
    cloudSyncState.enabled = false;
    setCloudStatus("Firebase SDK not loaded", "error");
    renderCloudAuthState();
    console.log("[Cloud Sync] Firebase SDK not available");
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

    console.log("[Cloud Sync] Initialized successfully");
    finalizeRedirectResult();
    wireCloudButtons();
    renderCloudAuthState();

    cloudSyncState.auth.onAuthStateChanged(async (user) => {
      cloudSyncState.user = user || null;
      renderCloudAuthState();

      if (cloudSyncState.user) {
        await pullFromCloudIfNewer(true); // Force initial check on sign-in
        startRealtimeCloudListener();
      } else {
        stopRealtimeCloudListener();
      }
    });

    globalThis.addEventListener("warehouse:data-saved", () => {
      // Only push if user is signed in and not currently pulling
      if (cloudSyncState.user && !cloudSyncState.pullInProgress) {
        queueCloudPush();
      }
    });

    globalThis.addEventListener("warehouse:sector-changed", async () => {
      cloudSyncState.docRef = null;
      stopRealtimeCloudListener();
      if (cloudSyncState.user) {
        await pullFromCloudIfNewer(true);
        startRealtimeCloudListener();
      }
    });
  } catch {
    cloudSyncState.enabled = false;
    setCloudStatus("Cloud setup failed", "error");
    renderCloudAuthState();
  }
}

document.addEventListener("DOMContentLoaded", initCloudSync);

// Also try to initialize immediately in case DOM is already ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCloudSync);
} else {
  // DOM is already ready
  initCloudSync();
}
