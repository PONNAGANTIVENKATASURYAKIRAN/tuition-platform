/* ===================================================
   Krishna Tuition Institutions - Dual-Approval Engine
   =================================================== */

let currentUser = null;
let facultyRoster = [];
let studentDirectory = [];

// Persistence Keys
const STORAGE_FACULTY = "kt_faculty_data";
const STORAGE_STUDENTS = "kt_students_data";
const STORAGE_USER = "kt_session_user";

window.addEventListener("DOMContentLoaded", () => {
  facultyRoster = JSON.parse(localStorage.getItem(STORAGE_FACULTY) || "[]");
  studentDirectory = JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || "[]");

  const savedUser = localStorage.getItem(STORAGE_USER);
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    renderAuthenticatedView();
  }
});

/* ---------------------------------------------------
   Authentication Routing
--------------------------------------------------- */
function toggleAuthView(view) {
  document.getElementById("card-signin").classList.toggle("hidden", view !== "signin");
  document.getElementById("card-signup").classList.toggle("hidden", view !== "signup");
  document.getElementById("card-verify").classList.toggle("hidden", view !== "verify");
  document.getElementById("card-change-password").classList.toggle("hidden", view !== "change-password");
}

// Director Sign-Up
function handleDirectorSignUp(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value;

  sessionStorage.setItem("pending_user", JSON.stringify({ name, email, password, role: "Director" }));
  document.getElementById("verify-email").value = email;

  toggleAuthView("verify");
  showToast("Cognito OTP code sent to your email.", "info");
}

// OTP Verification (Director & Tutors)
function handleVerifyOtp(e) {
  e.preventDefault();
  const email = document.getElementById("verify-email").value.trim().toLowerCase();
  const code = document.getElementById("verify-code").value.trim();

  if (code.length < 4) {
    showToast("Please enter a valid 6-digit code.", "error");
    return;
  }

  // 1. Check if verifying Director signup
  const pending = JSON.parse(sessionStorage.getItem("pending_user") || "{}");
  if (pending.email === email && pending.role === "Director") {
    currentUser = { name: pending.name, email: pending.email, role: "Director" };
    localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser));
    sessionStorage.removeItem("pending_user");
    showToast("Director account confirmed!");
    renderAuthenticatedView();
    return;
  }

  // 2. Check if verifying Approved Faculty member
  const staff = facultyRoster.find(f => f.email === email);
  if (staff) {
    staff.isVerified = true;
    localStorage.setItem(STORAGE_FACULTY, JSON.stringify(facultyRoster));
    showToast("Email verified! You can now sign in.");
    toggleAuthView("signin");
    document.getElementById("signin-email").value = email;
    return;
  }

  showToast("No pending verification matching this email.", "error");
}

// User Sign-In
function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById("signin-email").value.trim().toLowerCase();
  const password = document.getElementById("signin-password").value;

  // 1. Director Match
  const savedUser = JSON.parse(localStorage.getItem(STORAGE_USER) || "{}");
  if (savedUser.email === email && savedUser.role === "Director") {
    currentUser = savedUser;
    renderAuthenticatedView();
    showToast(`Welcome Director`);
    return;
  }

  // 2. Faculty Match
  const staff = facultyRoster.find(f => f.email === email);
  if (!staff) {
    showToast("User not registered. Contact Director.", "error");
    return;
  }

  // Check Director Approval
  if (!staff.isApprovedByDirector) {
    showToast("Access Pending: Director has not approved your account yet.", "error");
    return;
  }

  // Check Email OTP Verification
  if (!staff.isVerified) {
    document.getElementById("verify-email").value = email;
    toggleAuthView("verify");
    showToast("Please enter the verification code sent to your email first.", "info");
    return;
  }

  // Verify Password
  if (staff.password !== password) {
    showToast("Incorrect password.", "error");
    return;
  }

  currentUser = { name: staff.name, email: staff.email, role: staff.role };
  localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser));
  renderAuthenticatedView();
  showToast(`Signed in as ${staff.name} (${staff.role})`);
}

// Tutor/Teacher Updates Their Password
function handleStaffUpdatePassword(e) {
  e.preventDefault();
  const p1 = document.getElementById("staff-new-password").value;
  const p2 = document.getElementById("staff-confirm-password").value;

  if (p1 !== p2) {
    showToast("Passwords do not match.", "error");
    return;
  }

  const staff = facultyRoster.find(f => f.email === currentUser.email);
  if (staff) {
    staff.password = p1; // Real-time sync to Director
    localStorage.setItem(STORAGE_FACULTY, JSON.stringify(facultyRoster));
    showToast("Password updated. Director notified.");
    renderAuthenticatedView();
  }
}

function handleSignOut() {
  currentUser = null;
  localStorage.removeItem(STORAGE_USER);
  document.getElementById("app-header").classList.add("hidden");
  document.getElementById("app-container").classList.add("hidden");
  document.getElementById("auth-container").classList.remove("hidden");
  toggleAuthView("signin");
  showToast("Logged out.");
}

/* ---------------------------------------------------
   Dashboard Rendering
--------------------------------------------------- */
function renderAuthenticatedView() {
  if (!currentUser) return;

  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("app-header").classList.remove("hidden");
  document.getElementById("app-container").classList.remove("hidden");

  document.getElementById("header-user-badge").textContent = currentUser.role;
  document.getElementById("header-user-email").textContent = currentUser.email;

  const isDirector = currentUser.role === "Director";
  document.getElementById("portal-director").classList.toggle("hidden", !isDirector);
  document.getElementById("portal-staff").classList.toggle("hidden", isDirector);

  if (isDirector) {
    renderDirectorPortal();
  } else {
    renderStaffPortal();
  }
}

// Director Desk
function handleDirectorCreateFaculty(e) {
  e.preventDefault();
  const name = document.getElementById("faculty-name").value.trim();
  const email = document.getElementById("faculty-email").value.trim().toLowerCase();
  const role = document.getElementById("faculty-role").value;
  const password = document.getElementById("faculty-password").value;

  if (facultyRoster.some(f => f.email === email)) {
    showToast("Email already exists in faculty registry.", "error");
    return;
  }

  facultyRoster.push({
    id: "FAC-" + Date.now(),
    name,
    email,
    role,
    password, // Director sees initial password
    isApprovedByDirector: false, // Must be approved
    isVerified: false
  });

  localStorage.setItem(STORAGE_FACULTY, JSON.stringify(facultyRoster));
  closeModal("modal-add-staff");
  e.target.reset();
  renderDirectorPortal();
  showToast(`Registered ${name}. Click Approve to enable OTP.`);
}

function approveAndDispatchStaffOtp(email) {
  const staff = facultyRoster.find(f => f.email === email);
  if (staff) {
    staff.isApprovedByDirector = true;
    localStorage.setItem(STORAGE_FACULTY, JSON.stringify(facultyRoster));
    renderDirectorPortal();
    showToast(`Approved ${staff.name}. Cognito verification code sent to ${staff.email}.`);
  }
}

function renderDirectorPortal() {
  const staffContainer = document.getElementById("director-staff-list");
  staffContainer.innerHTML = "";
  document.getElementById("director-staff-count").textContent = `${facultyRoster.length} Staff`;

  if (facultyRoster.length === 0) {
    staffContainer.innerHTML = `<div class="p-4 text-center text-slate-400">No staff registered. Click "Register Faculty" to create an account.</div>`;
  } else {
    facultyRoster.forEach(f => {
      staffContainer.innerHTML += `
        <div class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-slate-900">${f.name}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${f.role === 'Tutor' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}">${f.role}</span>
              ${!f.isApprovedByDirector 
                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Pending Director Approval</span>'
                : (f.isVerified ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">OTP Verified</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Waiting for Tutor OTP</span>')
              }
            </div>
            <p class="text-[11px] text-slate-500 font-mono mt-0.5">${f.email}</p>
          </div>

          <div class="flex items-center space-x-3">
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block uppercase">Active Password</span>
              <strong class="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">${f.password}</strong>
            </div>

            ${!f.isApprovedByDirector ? `
              <button onclick="approveAndDispatchStaffOtp('${f.email}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs">
                Approve & Send OTP
              </button>
            ` : ''}
          </div>
        </div>`;
    });
  }

  // Student Directory Table
  const tableBody = document.getElementById("director-students-table");
  tableBody.innerHTML = "";
  document.getElementById("director-student-count").textContent = `${studentDirectory.length} Students`;

  if (studentDirectory.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No students enrolled. Tap "Enroll Student" above.</td></tr>`;
  } else {
    studentDirectory.forEach(s => {
      tableBody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="p-3 font-semibold text-slate-900">${s.name}</td>
          <td class="p-3 text-slate-600">${s.grade}</td>
          <td class="p-3 font-mono text-slate-600">${s.phone}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.todayAttendance === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${s.todayAttendance}</span>
          </td>
        </tr>`;
    });
  }
}

// Staff Desk
function renderStaffPortal() {
  document.getElementById("staff-welcome-title").textContent = `${currentUser.name}'s Desk`;
  const container = document.getElementById("staff-students-container");
  container.innerHTML = "";

  const presentCount = studentDirectory.filter(s => s.todayAttendance === "PRESENT").length;
  const absentCount = studentDirectory.filter(s => s.todayAttendance === "ABSENT").length;
  document.getElementById("staff-present-count").textContent = presentCount;
  document.getElementById("staff-absent-count").textContent = absentCount;

  if (studentDirectory.length === 0) {
    container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">No students registered yet.</div>`;
    return;
  }

  studentDirectory.forEach(s => {
    const isPresent = s.todayAttendance === "PRESENT";
    container.innerHTML += `
      <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
        <div>
          <h4 class="font-bold text-slate-900 text-xs sm:text-sm">${s.name}</h4>
          <span class="text-[11px] text-slate-500">${s.grade}</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="toggleAttendance('${s.id}', 'PRESENT')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}">P</button>
          <button onclick="toggleAttendance('${s.id}', 'ABSENT')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${!isPresent ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}">A</button>
        </div>
      </div>`;
  });
}

function handleEnrollStudent(e) {
  e.preventDefault();
  const name = document.getElementById("student-name").value.trim();
  const grade = document.getElementById("student-grade").value;
  const phone = document.getElementById("student-phone").value.trim();

  studentDirectory.push({ id: "STU-" + Date.now(), name, grade, phone, todayAttendance: "PRESENT" });
  localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(studentDirectory));
  closeModal("modal-enroll-student");
  e.target.reset();
  renderDirectorPortal();
  showToast(`Enrolled ${name}`);
}

function toggleAttendance(studentId, status) {
  const student = studentDirectory.find(s => s.id === studentId);
  if (student) {
    student.todayAttendance = status;
    localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(studentDirectory));
    renderStaffPortal();
    showToast(`${student.name} marked ${status}`);
  }
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  const icon = document.getElementById("toast-icon");
  msgEl.textContent = message;
  icon.className = type === "error" ? "fa-solid fa-circle-exclamation text-rose-400" : (type === "info" ? "fa-solid fa-circle-info text-indigo-400" : "fa-solid fa-circle-check text-emerald-400");
  toast.classList.remove("translate-y-24", "opacity-0");
  setTimeout(() => toast.classList.add("translate-y-24", "opacity-0"), 2800);
}