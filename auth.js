const ACCESS_PAGE = "access.html";
const ACCESS_STORAGE_KEY = "warehousePortalAccess";

const SHIFT_PASSWORDS = {
  day: "TwelliumDay#2026",
  night: "TwelliumNight#2026"
};

function getPathName() {
  return location.pathname.split("/").pop() || "index.html";
}

function isAccessPage() {
  return getPathName().toLowerCase() === ACCESS_PAGE;
}

function hasPortalAccess() {
  try {
    const raw = sessionStorage.getItem(ACCESS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.authenticated === true && (parsed.shift === "day" || parsed.shift === "night");
  } catch {
    return false;
  }
}

function setPortalAccess(shift) {
  const payload = {
    authenticated: true,
    shift,
    time: new Date().toISOString()
  };
  sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(payload));
}

function clearPortalAccess() {
  sessionStorage.removeItem(ACCESS_STORAGE_KEY);
}

function redirectToAccess() {
  const next = `${getPathName()}${location.search || ""}`;
  location.replace(`${ACCESS_PAGE}?next=${encodeURIComponent(next)}`);
}

function protectPortalPage() {
  if (isAccessPage()) return;
  if (!hasPortalAccess()) {
    redirectToAccess();
  }
}

function setupAccessPage() {
  if (!isAccessPage()) return;

  const form = document.getElementById("portal-access-form");
  const shiftInput = document.getElementById("shift");
  const passwordInput = document.getElementById("access-password");
  const status = document.getElementById("access-status");

  if (!form || !shiftInput || !passwordInput || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const shift = shiftInput.value;
    const password = passwordInput.value;

    if (!SHIFT_PASSWORDS[shift] || SHIFT_PASSWORDS[shift] !== password) {
      status.textContent = "Invalid password for selected shift.";
      return;
    }

    setPortalAccess(shift);
    status.textContent = "Access granted. Redirecting...";

    const next = new URLSearchParams(location.search).get("next") || "index.html";
    location.replace(next);
  });
}

globalThis.logoutPortal = function logoutPortal() {
  clearPortalAccess();
  redirectToAccess();
};

protectPortalPage();
window.addEventListener("DOMContentLoaded", setupAccessPage);
