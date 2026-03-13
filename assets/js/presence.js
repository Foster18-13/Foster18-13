// Real-Time Typing Presence System
// Writes to warehousePortal/presenceState in Firestore when the current user types.
// All other signed-in users on the same sector get a live toast notification.

(function () {
  const PRESENCE_COLLECTION = "warehousePortal";
  const PRESENCE_DOCUMENT   = "presenceState";
  const TYPING_TIMEOUT_MS   = 4000;   // clear "typing" flag after 4 s idle
  const TOAST_HIDE_DELAY_MS = 5000;   // hide toast 5 s after last update

  let _presenceUnsubscribe = null;
  let _typingTimer          = null;
  let _toastHideTimer       = null;
  let _currentUid           = null;
  let _currentName          = null;
  let _currentSector        = null;
  let _initialized          = false;

  // ── helpers ──────────────────────────────────────────────────────────────

  function getPageLabel() {
    const raw = String(globalThis._originalPathname || location.pathname || "")
      .split("/").pop() || "";
    const map = {
      "purchase.html":         "Purchases",
      "balance.html":          "Balance Sheet",
      "damages.html":          "Damages",
      "returns.html":          "Returns",
      "customers.html":        "Customers",
      "products.html":         "Products",
      "vehicles.html":         "Vehicles",
      "product-dispatch.html": "Product Dispatch",
      "product-movement.html": "Product Movement",
      "recording.html":        "Recording",
      "notebook.html":         "Notebook",
      "reports.html":          "Reports",
      "summary.html":          "Summary",
      "dashboard.html":        "Dashboard",
    };
    return map[raw.toLowerCase()] || raw.replace(".html", "") || "a page";
  }

  function getCurrentSector() {
    try {
      if (typeof globalThis.getCurrentWorkSector === "function") {
        return globalThis.getCurrentWorkSector();
      }
    } catch { /* ignore */ }
    return "water";
  }

  function getPresenceRef() {
    if (!globalThis.firebase?.firestore) return null;
    try {
      return globalThis.firebase.firestore()
        .collection(PRESENCE_COLLECTION)
        .doc(PRESENCE_DOCUMENT);
    } catch {
      return null;
    }
  }

  // ── toast UI ─────────────────────────────────────────────────────────────

  function ensureToastContainer() {
    let el = document.getElementById("presenceToastContainer");
    if (!el) {
      el = document.createElement("div");
      el.id = "presenceToastContainer";
      el.className = "presence-toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function showTypingToast(typersText) {
    const container = ensureToastContainer();
    let toast = document.getElementById("presenceTypingToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "presenceTypingToast";
      toast.className = "presence-typing-toast";
      container.appendChild(toast);
    }

    toast.innerHTML = `
      <span class="presence-typing-dot"></span>
      <span class="presence-typing-dot"></span>
      <span class="presence-typing-dot"></span>
      <span class="presence-typing-message">${typersText}</span>
    `;
    toast.classList.add("visible");

    clearTimeout(_toastHideTimer);
    _toastHideTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, TOAST_HIDE_DELAY_MS);
  }

  function hideTypingToast() {
    const toast = document.getElementById("presenceTypingToast");
    if (toast) toast.classList.remove("visible");
    clearTimeout(_toastHideTimer);
  }

  // ── write typing state ───────────────────────────────────────────────────

  function markTyping() {
    if (!_currentUid) return;
    const ref = getPresenceRef();
    if (!ref) return;

    const sector = getCurrentSector();
    ref.set(
      {
        [_currentUid]: {
          uid:      _currentUid,
          name:     _currentName,
          sector:   sector,
          page:     getPageLabel(),
          typingAt: Date.now()
        }
      },
      { merge: true }
    ).catch(() => {});
  }

  function clearTyping() {
    if (!_currentUid) return;
    const ref = getPresenceRef();
    if (!ref) return;
    ref.set(
      { [_currentUid]: globalThis.firebase.firestore.FieldValue.delete() },
      { merge: true }
    ).catch(() => {});
  }

  function onUserTyping() {
    markTyping();
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(clearTyping, TYPING_TIMEOUT_MS);
  }

  // ── listen for others ────────────────────────────────────────────────────

  function startPresenceListener() {
    if (_presenceUnsubscribe) return; // already listening
    const ref = getPresenceRef();
    if (!ref) return;

    _presenceUnsubscribe = ref.onSnapshot((snapshot) => {
      if (!snapshot.exists) return;

      const data = snapshot.data() || {};
      const now  = Date.now();
      const sector = getCurrentSector();

      // Collect everyone currently typing on the SAME sector, excluding self
      const typers = Object.values(data).filter((entry) => {
        if (!entry || typeof entry !== "object") return false;
        if (entry.uid === _currentUid) return false;          // not self
        if (entry.sector !== sector) return false;            // same sector only
        if (now - Number(entry.typingAt || 0) > TYPING_TIMEOUT_MS + 1000) return false; // stale
        return true;
      });

      if (typers.length === 0) {
        hideTypingToast();
        return;
      }

      const names = typers.map((t) => String(t.name || "Someone"));
      // eslint-disable-next-line unicorn/no-array-callback-reference
      const pagesSet = new Set(typers.map((t) => String(t.page || "")));
      pagesSet.delete("");
      const pages = [...pagesSet];

      let msg;
      if (names.length === 1) {
        msg = `<strong>${escapeHtml(names[0])}</strong> is entering data on <em>${escapeHtml(pages[0] || "a page")}</em>`;
      } else if (names.length === 2) {
        msg = `<strong>${escapeHtml(names[0])}</strong> and <strong>${escapeHtml(names[1])}</strong> are entering data`;
      } else {
        msg = `<strong>${names.length} users</strong> are currently entering data`;
      }

      showTypingToast(msg);
    }, () => { /* ignore listener errors silently */ });
  }

  function stopPresenceListener() {
    if (typeof _presenceUnsubscribe === "function") {
      _presenceUnsubscribe();
    }
    _presenceUnsubscribe = null;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // ── attach input listeners ────────────────────────────────────────────────

  function attachInputListeners() {
    // Capture-phase listener on the document catches all input/change events
    document.addEventListener("input",  onUserTyping, { capture: true, passive: true });
    document.addEventListener("change", onUserTyping, { capture: true, passive: true });
  }

  // ── init ───────────────────────────────────────────────────────────────

  function initPresence(user) {
    if (_initialized) return;
    _initialized  = true;
    _currentUid   = user.uid;
    _currentName  = user.displayName || user.email || "Someone";
    _currentSector = getCurrentSector();

    attachInputListeners();
    startPresenceListener();

    // Clean up on page unload / sign-out
    globalThis.addEventListener("beforeunload", () => {
      clearTyping();
      stopPresenceListener();
    });
  }

  // Watch firebase auth; init once the user is confirmed signed in
  function waitForAuth() {
    if (!globalThis.firebase?.auth) {
      // Firebase not ready yet — retry shortly
      setTimeout(waitForAuth, 300);
      return;
    }
    globalThis.firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        initPresence(user);
      } else {
        // Signed out: clean up
        clearTimeout(_typingTimer);
        clearTyping();
        stopPresenceListener();
        hideTypingToast();
        _initialized = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForAuth);
  } else {
    waitForAuth();
  }
})();
