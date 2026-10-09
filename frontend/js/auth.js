let activeRole = "director";

function getAuthUser() {
    return JSON.parse(localStorage.getItem("tuition_user") || "{}");
}

function enforceAuth(requiredRole = null) {
    const user = getAuthUser();
    if (!user.id && !user.role) {
        window.location.href = "index.html";
        return null;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== "director" && user.role !== "associate_director") {
        alert("Unauthorized access level.");
        window.location.href = "index.html";
        return null;
    }
    return user;
}

function logout() {
    localStorage.removeItem("tuition_user");
    localStorage.removeItem("pending_director_role");
    window.location.href = "index.html";
}

function selectRole(role) {
    activeRole = role;
    document.getElementById("pin-section").classList.add("hidden");
    document.getElementById("login-form").classList.remove("hidden");

    const bDir = document.getElementById("cap-director");
    const bTut = document.getElementById("cap-tutor");
    
    if (role === "director") {
        bDir.className = "py-2.5 rounded-xl bg-indigo-600 text-white shadow-md transition-all";
        bTut.className = "py-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all";
        document.getElementById("label-name").textContent = "Director Name / ID";
        document.getElementById("login-name").value = "Director Sir";
    } else {
        bTut.className = "py-2.5 rounded-xl bg-indigo-600 text-white shadow-md transition-all";
        bDir.className = "py-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all";
        document.getElementById("label-name").textContent = "Floor Tutor Name / Phone";
        document.getElementById("login-name").value = "";
        document.getElementById("login-name").placeholder = "e.g. Srinivas or 9848011223";
    }
}

async function handleCapsuleLogin(e) {
    e.preventDefault();
    const name = document.getElementById("login-name").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const btn = document.getElementById("btn-login");

    btn.disabled = true;
    btn.textContent = "Authenticating...";

    const { ok, data } = await API.post("/auth/login", { role: activeRole, name, password });
    btn.disabled = false;
    btn.textContent = "Access Portal";

    if (!ok) {
        alert(data.error || "Authentication failed. Check credentials.");
        return;
    }

    if (data.status === "PIN_REQUIRED") {
        document.getElementById("login-form").classList.add("hidden");
        document.getElementById("pin-section").classList.remove("hidden");
        document.getElementById("director-pin").focus();
        localStorage.setItem("pending_director_role", data.role);
    } else if (data.status === "AUTHENTICATED") {
        localStorage.setItem("tuition_user", JSON.stringify(data));
        window.location.href = "tutor.html";
    }
}

async function verifyDirectorPIN() {
    const pin = document.getElementById("director-pin").value.trim();
    const pendingRole = localStorage.getItem("pending_director_role");
    const btn = document.getElementById("btn-verify-pin");
    btn.disabled = true;
    btn.textContent = "Verifying PIN...";

    const { ok, data } = await API.post("/auth/verify-pin", { role: pendingRole, pin });
    btn.disabled = false;
    btn.textContent = "Verify Security PIN";

    if (ok && data.status === "AUTHENTICATED") {
        localStorage.setItem("tuition_user", JSON.stringify(data));
        window.location.href = "director.html";
    } else {
        alert(data.error || "Invalid Security PIN.");
    }
}

function cancelPINChallenge() {
    document.getElementById("pin-section").classList.add("hidden");
    document.getElementById("login-form").classList.remove("hidden");
}