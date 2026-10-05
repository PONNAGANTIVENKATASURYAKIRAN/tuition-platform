function getAuthUser() {
  return JSON.parse(localStorage.getItem("tuition_user") || "{}");
}

function enforceAuth(requiredRole = null) {
  const user = getAuthUser();
  if (!user.email) {
    window.location.href = "index.html";
    return null;
  }
  if (requiredRole && user.role !== requiredRole && user.role !== "director") {
    alert("Unauthorized access level.");
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("tuition_user");
  localStorage.removeItem("pending_director_email");
  window.location.href = "index.html";
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const formLogin = document.getElementById("form-login");
  const formSignup = document.getElementById("form-signup");
  const pinSection = document.getElementById("pin-section");

  pinSection.classList.add("hidden");

  if (mode === "login") {
    tabLogin.className = "py-2.5 rounded-xl bg-indigo-600 text-white shadow-md transition-all";
    tabSignup.className = "py-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all";
    formLogin.classList.remove("hidden");
    formSignup.classList.add("hidden");
  } else {
    tabSignup.className = "py-2.5 rounded-xl bg-indigo-600 text-white shadow-md transition-all";
    tabLogin.className = "py-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all";
    formSignup.classList.remove("hidden");
    formLogin.classList.add("hidden");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("btn-login");
  btn.disabled = true;
  btn.textContent = "Authenticating...";

  const { ok, data } = await API.post("/auth/login", { email, password });
  btn.disabled = false;
  btn.textContent = "Sign In to Portal";

  if (!ok) {
    alert(data.error || "Authentication failed.");
    return;
  }

  if (data.status === "PIN_REQUIRED") {
    document.getElementById("form-login").classList.add("hidden");
    document.getElementById("auth-tabs").classList.add("hidden");
    document.getElementById("pin-section").classList.remove("hidden");
    localStorage.setItem("pending_director_email", email);
  } else if (data.status === "AUTHENTICATED") {
    localStorage.setItem("tuition_user", JSON.stringify(data));
    redirectUserByRole(data.role);
  }
}

async function handleVerifyPin() {
  const pin = document.getElementById("director-pin").value.trim();
  const email = localStorage.getItem("pending_director_email");
  const btn = document.getElementById("btn-verify-pin");
  btn.disabled = true;
  btn.textContent = "Verifying PIN...";

  const { ok, data } = await API.post("/auth/verify-pin", { email, pin });
  btn.disabled = false;
  btn.textContent = "Verify Master PIN & Access";

  if (ok && data.status === "AUTHENTICATED") {
    localStorage.setItem("tuition_user", JSON.stringify(data));
    window.location.href = "director.html";
  } else {
    alert(data.error || "Invalid Director Security PIN.");
  }
}

function cancelPinCheck() {
  document.getElementById("pin-section").classList.add("hidden");
  document.getElementById("auth-tabs").classList.remove("hidden");
  document.getElementById("form-login").classList.remove("hidden");
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-signup");
  btn.disabled = true;
  btn.textContent = "Registering...";

  const subjects = document.getElementById("reg-subjects").value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const payload = {
    name: document.getElementById("reg-name").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    role: document.getElementById("reg-role").value,
    phone: document.getElementById("reg-phone").value.trim(),
    subjects: subjects,
    password: document.getElementById("reg-password").value
  };

  const { ok, data } = await API.post("/auth/signup", payload);
  btn.disabled = false;
  btn.textContent = "Register Staff Profile";

  if (ok) {
    alert(data.message || "Account registered successfully! Please sign in.");
    e.target.reset();
    switchAuthTab("login");
  } else {
    alert(data.error || "Sign-up failed.");
  }
}

function redirectUserByRole(role) {
  if (role === "director") {
    window.location.href = "director.html";
  } else if (role === "faculty") {
    window.location.href = "faculty.html";
  } else {
    window.location.href = "tutor.html";
  }
}

function openForgotPasswordModal() {
  document.getElementById("modal-forgot-password").classList.remove("hidden");
}

function closeForgotPasswordModal() {
  document.getElementById("modal-forgot-password").classList.add("hidden");
}

async function handleForgotPasswordSubmit() {
  const email = document.getElementById("forgot-email").value.trim();
  if (!email) {
    alert("Please enter your registered email.");
    return;
  }
  const btn = document.getElementById("btn-forgot-submit");
  btn.disabled = true;
  btn.textContent = "Dispatching...";

  const { ok, data } = await API.post("/auth/forgot-password", { email });
  btn.disabled = false;
  btn.textContent = "Dispatch Ticket";

  if (ok) {
    alert(data.message || "Password reset ticket dispatched to Director.");
    closeForgotPasswordModal();
  } else {
    alert(data.error || "Could not dispatch reset ticket.");
  }
}