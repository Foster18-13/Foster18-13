// Real-Time Typing Presence + Live Input Sync
// 1) Shows a typing toast for other users on the same sector.
// 2) Mirrors form input values in near real-time for users on the same page/sector/date/shift.

(function () {
  const PRESENCE_COLLECTION = "warehousePortal";
  const PRESENCE_DOCUMENT   = "presenceState";
  const LIVE_INPUTS_COLLECTION = "warehousePortalLiveInputs";
  const TYPING_TIMEOUT_MS   = 4000;   // clear "typing" flag after 4 s idle
  const TOAST_HIDE_DELAY_MS = 5000;   // hide toast 5 s after last update
  const LIVE_PUSH_DEBOUNCE_MS = 120;

  let _presenceUnsubscribe = null;
  let _liveInputsUnsubscribe = null;
  let _typingTimer          = null;
  let _toastHideTimer       = null;
  let _channelWatchTimer    = null;
  let _liveChannelKey       = "";
  let _suppressLocalBroadcast = false;
  let _currentUid           = null;
  let _currentName          = null;
  let _currentSector        = null;
  let _initialized          = false;
  const _fieldBroadcastTimers = new Map();
  const _fieldLastAppliedTs = new Map();

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

  function getCurrentPageFile() {
    return String(globalThis._originalPathname || location.pathname || "")
      .split("/").pop()
      .toLowerCase() || "";
  }

  function getSelectedDateSafe() {
    try {
      if (typeof globalThis.getSelectedDate === "function") {
        return String(globalThis.getSelectedDate() || "");
      }
    } catch {
      // ignore
    }
    const el = document.getElementById("dateSelector") || document.getElementById("dateInput");
    return String(el?.value || "");
  }

  function getSelectedShiftSafe() {
    try {
      if (typeof globalThis.getSelectedShift === "function") {
        return String(globalThis.getSelectedShift() || "");
      }
    } catch {
      // ignore
    }
    const el = document.getElementById("shiftSelector") || document.getElementById("shift");
    return String(el?.value || "");
  }

  function sanitizePart(value) {
    return String(value || "")
      .toLowerCase()
      .replaceAll(/[^a-z0-9_-]/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-|-$/g, "") || "na";
  }

  function buildLiveChannelKey() {
    const sector = sanitizePart(getCurrentSector());
    const page = sanitizePart(getCurrentPageFile());
    const date = sanitizePart(getSelectedDateSafe() || "global");
    const shift = sanitizePart(getSelectedShiftSafe() || "all");
    return `${sector}__${page}__${date}__${shift}`;
  }

  function hashString(input) {
    let hash = 0;
    const text = String(input || "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash * 31) + (text.codePointAt(i) || 0)) >>> 0;
    }
    return hash.toString(16);
  }

  function getElementDescriptor(el) {
    if (!el || !(el instanceof Element)) return null;
    if (el.id) {
      return { mode: "id", value: el.id };
    }
    const name = el.getAttribute("name");
    if (name) {
      return { mode: "name", value: name };
    }
    return null;
  }

  function getFieldKeyFromDescriptor(descriptor) {
    if (!descriptor?.mode || !descriptor?.value) return null;
    return `f_${hashString(`${descriptor.mode}:${descriptor.value}`)}`;
  }

  function getLiveInputsRef() {
    if (!globalThis.firebase?.firestore) return null;
    try {
      const channelKey = buildLiveChannelKey();
      return globalThis.firebase.firestore()
        .collection(LIVE_INPUTS_COLLECTION)
        .doc(channelKey);
    } catch {
      return null;
    }
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

  function readElementState(el) {
    const tagName = String(el.tagName || "").toLowerCase();
    const type = String(el.type || "").toLowerCase();

    if (type === "checkbox") {
      return { kind: "checkbox", checked: !!el.checked, value: String(el.value || "") };
    }
    if (type === "radio") {
      return { kind: "radio", checked: !!el.checked, value: String(el.value || "") };
    }
    if (tagName === "select" && el.multiple) {
      const values = [];
      for (const option of el.options) {
        if (option.selected) values.push(String(option.value || ""));
      }
      return { kind: "select-multiple", values };
    }
    return { kind: "value", value: String(el.value ?? "") };
  }

  function findTargetElement(descriptor) {
    if (!descriptor?.mode || !descriptor?.value) return null;
    if (descriptor.mode === "id") {
      return document.getElementById(descriptor.value);
    }
    if (descriptor.mode === "name") {
      return document.querySelector(`[name="${CSS.escape(descriptor.value)}"]`);
    }
    return null;
  }

  function applyRemoteStateToElement(descriptor, state) {
    if (!state || !descriptor) return;

    if (descriptor.mode === "name" && state.kind === "radio") {
      const radios = document.querySelectorAll(`[name="${CSS.escape(descriptor.value)}"]`);
      for (const radio of radios) {
        const shouldCheck = String(radio.value || "") === String(state.value || "");
        radio.checked = shouldCheck;
      }
      return;
    }

    const el = findTargetElement(descriptor);
    if (!el) return;

    if (document.activeElement === el) return;

    if (state.kind === "checkbox") {
      el.checked = !!state.checked;
      return;
    }
    if (state.kind === "select-multiple" && el.options) {
      const set = new Set(Array.isArray(state.values) ? state.values.map(String) : []);
      for (const option of el.options) {
        option.selected = set.has(String(option.value || ""));
      }
      return;
    }

    el.value = String(state.value ?? "");
  }

  function ensureLiveInputsListener() {
    const nextChannel = buildLiveChannelKey();
    if (nextChannel === _liveChannelKey && _liveInputsUnsubscribe) return;

    if (typeof _liveInputsUnsubscribe === "function") {
      _liveInputsUnsubscribe();
    }
    _liveInputsUnsubscribe = null;
    _liveChannelKey = nextChannel;

    const ref = getLiveInputsRef();
    if (!ref) return;

    _liveInputsUnsubscribe = ref.onSnapshot((snapshot) => {
      if (!snapshot.exists) return;
      const data = snapshot.data() || {};
      const fields = data.fields && typeof data.fields === "object" ? data.fields : {};

      _suppressLocalBroadcast = true;
      try {
        for (const [fieldKey, payload] of Object.entries(fields)) {
          if (!payload || typeof payload !== "object") continue;
          if (payload.updatedBy === _currentUid) continue;

          const updatedAt = Number(payload.updatedAt || 0);
          const lastApplied = Number(_fieldLastAppliedTs.get(fieldKey) || 0);
          if (updatedAt <= lastApplied) continue;

          applyRemoteStateToElement(payload.descriptor, payload.state);
          _fieldLastAppliedTs.set(fieldKey, updatedAt);
        }
      } finally {
        _suppressLocalBroadcast = false;
      }
    }, () => {
      // ignore realtime listener errors for now
    });
  }

  function stopLiveInputsListener() {
    if (typeof _liveInputsUnsubscribe === "function") {
      _liveInputsUnsubscribe();
    }
    _liveInputsUnsubscribe = null;
    _liveChannelKey = "";
  }

  function pushFieldUpdate(el) {
    if (!_currentUid || _suppressLocalBroadcast) return;

    const descriptor = getElementDescriptor(el);
    if (!descriptor) return;
    const fieldKey = getFieldKeyFromDescriptor(descriptor);
    if (!fieldKey) return;

    ensureLiveInputsListener();
    const ref = getLiveInputsRef();
    if (!ref) return;

    const patch = {
      channel: buildLiveChannelKey(),
      sector: getCurrentSector(),
      page: getCurrentPageFile(),
      date: getSelectedDateSafe(),
      shift: getSelectedShiftSafe(),
      updatedAt: Date.now(),
      fields: {
        [fieldKey]: {
          descriptor,
          state: readElementState(el),
          updatedAt: Date.now(),
          updatedBy: _currentUid,
          updatedByName: _currentName
        }
      }
    };

    ref.set(patch, { merge: true }).catch(() => {
      // ignore write failures silently
    });
  }

  function queueFieldUpdate(el) {
    const descriptor = getElementDescriptor(el);
    const fieldKey = getFieldKeyFromDescriptor(descriptor);
    if (!fieldKey) return;

    const existing = _fieldBroadcastTimers.get(fieldKey);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      _fieldBroadcastTimers.delete(fieldKey);
      pushFieldUpdate(el);
    }, LIVE_PUSH_DEBOUNCE_MS);

    _fieldBroadcastTimers.set(fieldKey, timer);
  }

  function onUserTyping(event) {
    markTyping();
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(clearTyping, TYPING_TIMEOUT_MS);

    if (_suppressLocalBroadcast) return;
    const target = event?.target;
    if (!(target instanceof Element)) return;

    const tag = String(target.tagName || "").toLowerCase();
    if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
    queueFieldUpdate(target);
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

    // Keep listener channel aligned when sector/date/shift changes.
    globalThis.addEventListener("warehouse:sector-changed", ensureLiveInputsListener);
    document.addEventListener("change", (event) => {
      const id = String(event?.target?.id || "").toLowerCase();
      if (id === "dateselector" || id === "shiftselector" || id === "shift") {
        ensureLiveInputsListener();
      }
    }, { capture: true, passive: true });

    if (!_channelWatchTimer) {
      _channelWatchTimer = setInterval(ensureLiveInputsListener, 1000);
    }
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
    ensureLiveInputsListener();

    // Clean up on page unload / sign-out
    globalThis.addEventListener("beforeunload", () => {
      clearTyping();
      stopPresenceListener();
      stopLiveInputsListener();
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
        for (const timer of _fieldBroadcastTimers.values()) {
          clearTimeout(timer);
        }
        _fieldBroadcastTimers.clear();
        if (_channelWatchTimer) {
          clearInterval(_channelWatchTimer);
          _channelWatchTimer = null;
        }
        clearTyping();
        stopPresenceListener();
        stopLiveInputsListener();
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
