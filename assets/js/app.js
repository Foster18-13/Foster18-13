function setUserLabel(user) {
  const el = document.getElementById("userLabel");
  if (!el || !user) return;
  el.textContent = user.email || "Signed in";
}

function setSectorLabel() {
  const el = document.getElementById("sectorLabel");
  if (!el) return;
  el.textContent = getSector();
}

async function initProtectedPage() {
  const user = await requireAuth();
  setUserLabel(user);
  setSectorLabel();
  initSidebar();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logoutUser();
    });
  }
}

function mapAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-email") return "Invalid email format.";
  if (code === "auth/user-not-found") return "No account found for this email.";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Wrong email or password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  return error?.message || "Login failed.";
}

function initLoginPage() {
  initFirebase();

  const form = document.getElementById("loginForm");
  const message = document.getElementById("authMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const submit = document.getElementById("submitBtn");

    message.textContent = "";
    submit.disabled = true;
    submit.textContent = "Signing in...";

    try {
      await loginWithEmail(email, password);
      message.className = "auth-message ok";
      message.textContent = "Login successful. Redirecting...";
      setTimeout(() => {
        globalThis.location.href = "sector-select.html";
      }, 500);
    } catch (error) {
      message.className = "auth-message error";
      message.textContent = mapAuthError(error);
    } finally {
      submit.disabled = false;
      submit.textContent = "Login";
    }
  });
}

async function initSectorPage() {
  await requireAuth();
  const buttons = document.querySelectorAll("[data-sector]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setSector(button.dataset.sector);
      globalThis.location.href = "dashboard.html";
    });
  });
}
