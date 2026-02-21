// User Account Authentication System
const USER_AUTH_STORAGE_KEY = "warehousePortalUserAuth";

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

      // Store user data in Firestore
      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        username: username,
        email: email,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });

      // Show success and redirect
      const successMsg = document.createElement('div');
      successMsg.className = 'auth-success';
      successMsg.textContent = 'Account created successfully! Redirecting to login...';
      successMsg.style.display = 'block';
      successMsg.style.color = '#155724';
      successMsg.style.background = '#d4edda';
      successMsg.style.padding = '0.75rem';
      successMsg.style.borderRadius = '4px';
      successMsg.style.marginBottom = '1rem';
      form.parentElement.insertBefore(successMsg, form);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';

      console.error('Registration error:', error.code, error.message);

      if (error.code === 'auth/email-already-in-use') {
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

function saveUserAuthState(user) {
  try {
    const authState = {
      authenticated: true,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      time: new Date().toISOString()
    };
    sessionStorage.setItem(USER_AUTH_STORAGE_KEY, JSON.stringify(authState));
    localStorage.setItem(USER_AUTH_STORAGE_KEY + "_persistent", JSON.stringify(authState));
  } catch (e) {
    console.error('Failed to save user auth state:', e);
  }
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_AUTH_STORAGE_KEY) || localStorage.getItem(USER_AUTH_STORAGE_KEY + "_persistent");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
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
    window.location.href = 'login.html';
  }).catch((error) => {
    console.error('Logout error:', error);
  });
}

// Expose to global scope for onclick handlers
window.logoutUser = logoutUser;
globalThis.logoutUser = logoutUser;

function protectPortalPageWithAuth() {
  // Don't protect auth pages
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const authPages = ['login.html', 'register.html', 'access.html'];

  if (authPages.includes(currentPage.toLowerCase())) {
    return;
  }

  // Check if user is authenticated
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // Not authenticated, redirect to login
      const nextPage = `${currentPage}${location.search || ""}`;
      window.location.replace(`login.html?next=${encodeURIComponent(nextPage)}`);
    } else {
      // User authenticated, save their info
      saveUserAuthState(user);
    }
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
