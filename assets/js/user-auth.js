// User Account Authentication System
const USER_AUTH_STORAGE_KEY = "warehousePortalUserAuth";
const DEFAULT_USER_ROLE = "clerk";
const FORCED_ADMIN_EMAILS = [
  "antwifosterfrimpong@gmail.com"
];
const USER_ROLE_PRIORITY = {
  clerk: 1,
  supervisor: 2,
  admin: 3
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isForcedAdminEmail(email) {
  const target = normalizeEmail(email);
  return target && FORCED_ADMIN_EMAILS.some((item) => normalizeEmail(item) === target);
}

function normalizeUserRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  return USER_ROLE_PRIORITY[normalized] ? normalized : DEFAULT_USER_ROLE;
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

async function resolveUserRole(user) {
  if (!user?.uid || !globalThis.firebase?.firestore) return DEFAULT_USER_ROLE;

  try {
    const usersRef = firebase.firestore().collection('users').doc(user.uid);
    const doc = await usersRef.get();
    const forcedAdmin = isForcedAdminEmail(user.email);

    if (!doc.exists) {
      const role = forcedAdmin ? "admin" : DEFAULT_USER_ROLE;
      try {
        await usersRef.set({
          username: user.displayName || user.email || '',
          email: user.email || '',
          uid: user.uid,
          role,
          approved: forcedAdmin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error('Failed to initialize user profile in Firestore:', error);
      }
      return role;
    }

    const currentRole = normalizeUserRole(doc.data()?.role);
    const role = forcedAdmin ? "admin" : currentRole;
    if (role !== doc.data()?.role) {
      try {
        await usersRef.set({
          role,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error('Failed to sync user role in Firestore:', error);
      }
    }

    return role;
  } catch (error) {
    console.error('Failed to resolve user role:', error);
    if (isForcedAdminEmail(user?.email)) {
      return "admin";
    }
    return DEFAULT_USER_ROLE;
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
        approved: false,
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
      
      // Check if user is forced admin or regular user
      if (isForcedAdminEmail(email)) {
        successMsg.textContent = 'Admin account created successfully! Redirecting to home...';
        form.parentElement.insertBefore(successMsg, form);
        // Redirect to home after 1 second
        setTimeout(() => {
          globalThis.location.href = 'home.html';
        }, 1000);
      } else {
        successMsg.textContent = 'Account created! Your account is pending admin approval. You will be notified once approved.';
        form.parentElement.insertBefore(successMsg, form);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          globalThis.location.href = 'login.html';
        }, 3000);
      }

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

function saveUserAuthState(user, role = "") {
  try {
    const resolvedRole = normalizeUserRole(role || getCurrentUserRole());
    const authState = {
      authenticated: true,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: resolvedRole,
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
globalThis.resolveUserRole = resolveUserRole;
globalThis.normalizeUserRole = normalizeUserRole;
globalThis.hasRoleAccess = hasRoleAccess;
globalThis.clearUserAuthState = clearUserAuthState;
globalThis.isUserApproved = isUserApproved;
globalThis.approveUser = approveUser;
globalThis.rejectUser = rejectUser;

function protectPortalPageWithAuth() {
  // Don't protect auth pages
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const authPages = ['login.html', 'register.html', 'access.html'];

  if (authPages.includes(currentPage.toLowerCase())) {
    return;
  }

  // Check if user is authenticated
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User authenticated, save their info with role
      resolveUserRole(user).then((role) => {
        saveUserAuthState(user, role);
      });
      return;
    }

    // Not authenticated, redirect to login
    const nextPage = `${currentPage}${location.search || ""}`;
    globalThis.location.replace(`login.html?next=${encodeURIComponent(nextPage)}`);
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
