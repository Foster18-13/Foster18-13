// User Account Authentication System
const USER_AUTH_STORAGE_KEY = "warehousePortalUserAuth";
const WORK_SECTOR_STORAGE_KEY = "warehousePortalWorkSector";
const WORK_SECTOR_PENDING_KEY = "warehousePortalWorkSectorPending";
const DEFAULT_WORK_SECTOR = "water";
const DEFAULT_USER_ROLE = "clerk";
const FORCED_ADMIN_EMAILS = [
  "antwifosterfrimpong@gmail.com"
];
const ROOT_ONLY_URL_MODE = true;
const USER_ROLE_PRIORITY = {
  clerk: 1,
  supervisor: 2,
  admin: 3
};

const KNOWN_WORK_SECTORS = new Set(
  (Array.isArray(globalThis.WAREHOUSE_SECTORS) && globalThis.WAREHOUSE_SECTORS.length
    ? globalThis.WAREHOUSE_SECTORS
    : [
        { id: "water" },
        { id: "hh" },
        { id: "mcberry" }
      ]
  )
    .map((sector) => String(sector?.id || "").trim().toLowerCase())
    .filter(Boolean)
);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getSiteBasePath() {
  try {
    const currentScript = document.currentScript;
    const scriptSrc = currentScript?.src || '';
    const marker = '/assets/js/user-auth.js';
    const index = scriptSrc.indexOf(marker);
    if (index >= 0) {
      return scriptSrc.slice(0, index + 1);
    }
  } catch (error) {
    console.debug('Failed to resolve site base path from script:', error);
  }
  return '';
}

function ensureSiteFavicon() {
  try {
    const basePath = getSiteBasePath();
    const href = `${basePath}assets/images/logo.png`;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = href;
  } catch (error) {
    console.debug('Failed to set favicon:', error);
  }
}

ensureSiteFavicon();

function applyCleanUrlCanonicalPath() {
  try {
    if (!ROOT_ONLY_URL_MODE) return;
    
    // Prevent multiple executions
    if (globalThis._urlCleanupApplied) return;

    const pathname = String(globalThis.location?.pathname || '');
    if (!globalThis._originalPathname) {
      globalThis._originalPathname = pathname;
    }
    const currentUrl = globalThis.location?.href || '';
    
    // Safety check: If URL is too long (>2000 chars), force clean it
    if (currentUrl.length > 2000) {
      globalThis.history?.replaceState?.({}, '', '/');
      globalThis._urlCleanupApplied = true;
      return;
    }
    
    if (pathname === '/') {
      globalThis._urlCleanupApplied = true;
      return;
    }

    // In ROOT_ONLY_URL_MODE, strip ALL query strings and hashes to show just "/"
    globalThis.history?.replaceState?.({}, '', '/');
    globalThis._urlCleanupApplied = true;
  } catch (error) {
    console.debug('Failed to apply clean URL canonical path:', error);
  }
}

applyCleanUrlCanonicalPath();

function isForcedAdminEmail(email) {
  const target = normalizeEmail(email);
  return target && FORCED_ADMIN_EMAILS.some((item) => normalizeEmail(item) === target);
}

function normalizeUserRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return USER_ROLE_PRIORITY[normalized] ? normalized : DEFAULT_USER_ROLE;
}

function normalizeCanMakeEntries(value) {
  return value !== false;
}

function normalizeWorkSector(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return KNOWN_WORK_SECTORS.has(normalized) ? normalized : DEFAULT_WORK_SECTOR;
}

function getCurrentWorkSector() {
  try {
    const stored = localStorage.getItem(WORK_SECTOR_STORAGE_KEY);
    return normalizeWorkSector(stored || DEFAULT_WORK_SECTOR);
  } catch {
    return DEFAULT_WORK_SECTOR;
  }
}

function hasSelectedWorkSector() {
  try {
    const stored = localStorage.getItem(WORK_SECTOR_STORAGE_KEY);
    if (!stored) return false;
    return KNOWN_WORK_SECTORS.has(String(stored).trim().toLowerCase());
  } catch {
    return false;
  }
}

function setCurrentWorkSector(sectorId) {
  const normalized = normalizeWorkSector(sectorId);
  localStorage.setItem(WORK_SECTOR_STORAGE_KEY, normalized);
  if (typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(
      new CustomEvent("warehouse:sector-changed", {
        detail: { sector: normalized }
      })
    );
  }
  return normalized;
}

function clearCurrentWorkSector() {
  try {
    localStorage.removeItem(WORK_SECTOR_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function markSectorSelectionPending() {
  try {
    sessionStorage.setItem(WORK_SECTOR_PENDING_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function clearSectorSelectionPending() {
  try {
    sessionStorage.removeItem(WORK_SECTOR_PENDING_KEY);
  } catch {
    // ignore storage errors
  }
}

function isSectorSelectionPending() {
  try {
    return sessionStorage.getItem(WORK_SECTOR_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

function getCurrentSectorConfig() {
  const sector = getCurrentWorkSector();
  const sectorConfig = globalThis.FIREBASE_CLOUD_DOCS?.[sector];
  if (sectorConfig?.collection && sectorConfig?.document) {
    return sectorConfig;
  }
  return globalThis.FIREBASE_CLOUD_DOC || { collection: "warehousePortal", document: "twellium-main" };
}

function getRoleFallbackForUser(user) {
  const email = user?.email;
  if (isForcedAdminEmail(email)) {
    return 'admin';
  }

  const cachedRole = getCurrentUserRole();
  if (cachedRole && ['admin', 'supervisor', 'clerk'].includes(cachedRole)) {
    return cachedRole;
  }

  return DEFAULT_USER_ROLE;
}

async function isUserApproved(user) {
  if (!user?.uid || !globalThis.firebase?.firestore) return false;

  try {
    const doc = await firebase.firestore().collection('users').doc(user.uid).get();
    const approved = doc.exists ? doc.data()?.approved : false;
    return approved === true;
  } catch (error) {
    console.error('Failed to check user approval status:', error);
    return false;
  }
}

async function approveUser(userId) {
  if (!userId || !globalThis.firebase?.firestore) return false;

  try {
    await firebase.firestore().collection('users').doc(userId).update({
      approved: true,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Failed to approve user:', error);
    return false;
  }
}

async function rejectUser(userId) {
  if (!userId || !globalThis.firebase?.firestore) return false;

  try {
    await firebase.firestore().collection('users').doc(userId).delete();
    return true;
  } catch (error) {
    console.error('Failed to reject user:', error);
    return false;
  }
}

function hasRoleAccess(currentRole, minimumRole) {
  const current = USER_ROLE_PRIORITY[normalizeUserRole(currentRole)] || 0;
  const minimum = USER_ROLE_PRIORITY[normalizeUserRole(minimumRole)] || 0;
  return current >= minimum;
}

async function getDefaultRoleForNewUser(email = "") {
  if (isForcedAdminEmail(email)) {
    return "admin";
  }
  // All new users start as clerk - admin must be assigned manually
  return DEFAULT_USER_ROLE;
}

function persistResolvedAuthState(user, role, canMakeEntries) {
  if (typeof saveUserAuthState === 'function') {
    saveUserAuthState(user, role, canMakeEntries);
  }
}

async function initializeMissingUserProfile(usersRef, user, role, canMakeEntries) {
  try {
    await usersRef.set({
      username: user.displayName || user.email || '',
      email: user.email || '',
      uid: user.uid,
      role,
      canMakeEntries,
      approved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to initialize user profile in Firestore:', error);
  }
}

async function syncRoleAndEntryPermission(usersRef, docData, role, canMakeEntries) {
  const needsRoleSync = role !== docData?.role;
  const needsEntrySync = docData?.canMakeEntries === undefined;
  if (!needsRoleSync && !needsEntrySync) return;

  try {
    await usersRef.set({
      role,
      canMakeEntries,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync user role in Firestore:', error);
  }
}

async function writeUserToDirectory(user, role, canMakeEntries) {
  if (!user?.uid || !globalThis.firebase?.firestore) return;
  try {
    const col = globalThis.FIREBASE_CLOUD_DOC?.collection || 'warehousePortal';
    const dirRef = firebase.firestore().collection(col).doc('userDirectory');
    await dirRef.set({
      [user.uid]: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role,
        canMakeEntries,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  } catch (e) {
    console.debug('Could not write to user directory:', e);
  }
}

async function resolveUserRole(user) {
  if (!user?.uid || !globalThis.firebase?.firestore) return DEFAULT_USER_ROLE;

  try {
    const usersRef = firebase.firestore().collection('users').doc(user.uid);
    const doc = await usersRef.get();
    const forcedAdmin = isForcedAdminEmail(user.email);

    if (!doc.exists) {
      const role = forcedAdmin ? "admin" : DEFAULT_USER_ROLE;
      const canMakeEntries = true;
      await initializeMissingUserProfile(usersRef, user, role, canMakeEntries);
      persistResolvedAuthState(user, role, canMakeEntries);
      writeUserToDirectory(user, role, canMakeEntries);
      return role;
    }

    const docData = doc.data() || {};
    const currentRole = normalizeUserRole(doc.data()?.role);
    const role = forcedAdmin ? "admin" : currentRole;
    const canMakeEntries = normalizeCanMakeEntries(docData.canMakeEntries);
    await syncRoleAndEntryPermission(usersRef, docData, role, canMakeEntries);
    persistResolvedAuthState(user, role, canMakeEntries);
    writeUserToDirectory(user, role, canMakeEntries);

    return role;
  } catch (error) {
    console.error('Failed to resolve user role:', error);
    const role = getRoleFallbackForUser(user);
    const canMakeEntries = normalizeCanMakeEntries(getCurrentUserCanMakeEntries());
    saveUserAuthState(user, role, canMakeEntries);
    return role;
  }
}

function initializeUserAuth() {
  // Initialize Firebase if not already done
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
}

function setupUserAuthPage() {
  // Setup registration page
  if (document.getElementById('registerForm')) {
    setupRegistrationForm();
  }
}

function setupRegistrationForm() {
  const form = document.getElementById('registerForm');
  const errorDiv = document.getElementById('authError');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Validate inputs
    if (!username || !email || !password || !confirmPassword) {
      errorDiv.textContent = 'Please fill in all required fields.';
      errorDiv.style.display = 'block';
      return;
    }

    if (username.length < 3) {
      errorDiv.textContent = 'Username must be at least 3 characters long.';
      errorDiv.style.display = 'block';
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match.';
      errorDiv.style.display = 'block';
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters long.';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      // Create Firebase user
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      console.log('User created:', userCredential.user.uid);

      // Update user profile with username
      await userCredential.user.updateProfile({
        displayName: username
      });

      const role = await getDefaultRoleForNewUser(email);

      // Store user data in Firestore
      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        username: username,
        email: email,
        role,
        canMakeEntries: true,
        approved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      // Save auth state
      saveUserAuthState(userCredential.user, role);

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'auth-success';
      successMsg.style.display = 'block';
      successMsg.style.color = '#155724';
      successMsg.style.background = '#d4edda';
      successMsg.style.padding = '0.75rem';
      successMsg.style.borderRadius = '4px';
      successMsg.style.marginBottom = '1rem';
      
      // Show success and redirect
      successMsg.textContent = 'Account created successfully! Redirecting to home...';
      form.parentElement.insertBefore(successMsg, form);
      
      // Redirect to home after 1 second
      setTimeout(() => {
        globalThis.location.href = 'home.html';
      }, 1000);

    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';

      console.error('Registration error:', error.code, error.message);

      if (error.code === 'permission-denied' || String(error.message || '').toLowerCase().includes('insufficient permissions')) {
        errorDiv.textContent = 'Your login account was created, but profile setup is blocked by database permissions. Please contact the administrator to update Firestore rules for users registration.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorDiv.textContent = 'Email already in use. Please use a different email or login.';
      } else if (error.code === 'auth/invalid-email') {
        errorDiv.textContent = 'Invalid email address format.';
      } else if (error.code === 'auth/weak-password') {
        errorDiv.textContent = 'Password is too weak. Please use a stronger password (min. 6 characters).';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorDiv.textContent = 'Email/password registration is not enabled. Please contact support.';
      } else {
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
      }
      errorDiv.style.display = 'block';
    }
  });
}

function saveUserAuthState(user, role, canMakeEntries) {
  try {
    const current = getCurrentUser();
    const resolvedRole = normalizeUserRole(role || getCurrentUserRole());
    const resolvedCanMakeEntries = typeof canMakeEntries === "boolean"
      ? canMakeEntries
      : normalizeCanMakeEntries(current?.canMakeEntries);
    const authState = {
      authenticated: true,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: resolvedRole,
      canMakeEntries: resolvedCanMakeEntries,
      time: new Date().toISOString()
    };
    sessionStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(authState));
    localStorage.setItem(USER_AUTH_STORAGE_KEY + "_persistent", JSON.stringify(authState));
  } catch (e) {
    console.error('Failed to save user auth state:', e);
  }
}

function getCurrentUserRole() {
  const current = getCurrentUser();
  return normalizeUserRole(current?.role);
}

function getCurrentUserCanMakeEntries() {
  const current = getCurrentUser();
  return normalizeCanMakeEntries(current?.canMakeEntries);
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_AUTH_STORAGE_KEY) || localStorage.getItem(USER_AUTH_STORAGE_KEY + "_persistent");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.debug('Failed to parse stored auth state:', e);
    return null;
  }
}

function clearUserAuthState() {
  sessionStorage.removeItem(USER_AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_AUTH_STORAGE_KEY + "_persistent");
  clearCurrentWorkSector();
  clearSectorSelectionPending();
}

function logoutUser() {
  firebase.auth().signOut().then(() => {
    clearUserAuthState();
    globalThis.location.href = 'login.html';
  }).catch((error) => {
    console.error('Logout error:', error);
  });
}

// Expose to global scope for onclick handlers and other scripts
globalThis.logoutUser = logoutUser;
globalThis.saveUserAuthState = saveUserAuthState;
globalThis.getCurrentUser = getCurrentUser;
globalThis.getCurrentUserRole = getCurrentUserRole;
globalThis.getCurrentUserCanMakeEntries = getCurrentUserCanMakeEntries;
globalThis.resolveUserRole = resolveUserRole;
globalThis.normalizeUserRole = normalizeUserRole;
globalThis.hasRoleAccess = hasRoleAccess;
globalThis.clearUserAuthState = clearUserAuthState;
globalThis.isUserApproved = isUserApproved;
globalThis.approveUser = approveUser;
globalThis.rejectUser = rejectUser;
globalThis.writeUserToDirectory = writeUserToDirectory;
globalThis.getCurrentWorkSector = getCurrentWorkSector;
globalThis.hasSelectedWorkSector = hasSelectedWorkSector;
globalThis.setCurrentWorkSector = setCurrentWorkSector;
globalThis.clearCurrentWorkSector = clearCurrentWorkSector;
globalThis.getCurrentSectorConfig = getCurrentSectorConfig;
globalThis.markSectorSelectionPending = markSectorSelectionPending;
globalThis.clearSectorSelectionPending = clearSectorSelectionPending;
globalThis.isSectorSelectionPending = isSectorSelectionPending;

function protectPortalPageWithAuth() {
  // Prevent multiple initializations
  if (globalThis._authProtectionInitialized) {
    return;
  }
  globalThis._authProtectionInitialized = true;

  // Don't protect auth pages
  const effectivePathname = String(globalThis._originalPathname || location.pathname || '');
  const currentPage = effectivePathname.split("/").pop() || "index.html";
  const authPages = ['login.html', 'register.html', 'access.html', 'index.html', '404.html'];

  if (authPages.includes(currentPage.toLowerCase())) {
    return;
  }

  // Check if user is authenticated
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User authenticated, save their info with role
      resolveUserRole(user).then((role) => {
        saveUserAuthState(user, role);

        const normalizedPage = String(currentPage || '').toLowerCase();
        const currentUrl = new URL(globalThis.location.href);
        const nextParam = String(currentUrl.searchParams.get('next') || '').trim();
        const forceSectorSelection = currentUrl.searchParams.get('forceSector') === '1';
        const pendingSectorSelection = isSectorSelectionPending();
        const safeNext = nextParam && !nextParam.includes('://') && !nextParam.startsWith('javascript:')
          ? nextParam
          : 'home.html';

        if (normalizedPage !== 'sector-select.html' && normalizedPage !== 'home.html' && (pendingSectorSelection || !hasSelectedWorkSector())) {
          globalThis.location.replace(`sector-select.html?next=${encodeURIComponent(currentPage)}&forceSector=1`);
          return;
        }

        if (normalizedPage === 'sector-select.html' && hasSelectedWorkSector() && !forceSectorSelection && !pendingSectorSelection) {
          globalThis.location.replace(safeNext);
        }
      });
      return;
    }

    // Not authenticated, redirect to login (strip query strings to avoid URI bloat)
    clearCurrentWorkSector();
    clearUserAuthState();
    globalThis.location.replace(`login.html?next=${encodeURIComponent(currentPage)}`);
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeUserAuth();
    // Give Firebase a moment to fully initialize
    setTimeout(() => {
      setupUserAuthPage();
      protectPortalPageWithAuth();
    }, 200);
  });
} else {
  initializeUserAuth();
  setTimeout(() => {
    setupUserAuthPage();
    protectPortalPageWithAuth();
  }, 200);
}
