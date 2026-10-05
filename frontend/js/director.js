let currentDirectorView = "attendance-floor";
let directorStudents = [];
let directorStaff = [];
let activeQueueFilter = "ALL";
let rawDispatchQueue = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = enforceAuth("director");
  if (!user) return;
  loadDirectorFloorData();
  loadDispatchQueue();
  loadStaffRoster();
  loadFinancialLedger();
});

function openDirectorView(viewId) {
  currentDirectorView = viewId;
  document.getElementById("master-nav-container").classList.add("hidden");

  ['attendance-floor', 'dispatches', 'intake', 'fees-salaries', 'cloud-usage', 'security-portal'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle("hidden", v !== viewId);
  });

  if (viewId === 'attendance-floor') loadDirectorFloorData();
  if (viewId === 'dispatches') loadDispatchQueue();
  if (viewId === 'fees-salaries') loadFinancialLedger();
  if (viewId === 'intake') loadStaffRoster();
}

function returnToMasterList() {
  ['attendance-floor', 'dispatches', 'intake', 'fees-salaries', 'cloud-usage', 'security-portal'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add("hidden");
  });
  document.getElementById("master-nav-container").classList.remove("hidden");
}

/* =========================================================================
   1. FLOOR STUDENT ATTENDANCE & ACTIVITY
   ========================================================================= */
async function loadDirectorFloorData() {
  const container = document.getElementById("director-floor-cards-container");
  container.innerHTML = '<div class="text-slate-500 text-xs py-3 text-center">Loading floor student roster...</div>';

  const { ok, data } = await API.get("/director/students");
  if (ok && data.students) {
    directorStudents = data.students;
    renderDirectorFloorCards();
  }
}

function renderDirectorFloorCards() {
  const container = document.getElementById("director-floor-cards-container");
  const classFilter = document.getElementById("floor-class-filter").value;
  container.innerHTML = "";

  let filtered = directorStudents;
  if (classFilter !== "ALL") {
    filtered = filtered.filter(s => String(s.class) === classFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">No students found matching this grade.</div>';
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement("div");
    card.className = "p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 shadow-xs";
    card.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-1.5 flex-wrap">
          <h4 class="text-xs sm:text-sm font-extrabold text-white truncate">${s.name}</h4>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 font-mono">Class ${s.class}</span>
        </div>
        <p class="text-[11px] text-slate-400 truncate mt-0.5">${s.school || "School"} &bull; Area: ${s.area || "Area"}</p>
        <p class="text-[10px] text-slate-500 font-mono">Primary: ${s.primaryPhone || s.fatherPhone} (${s.primaryContact || "Father"})</p>
      </div>

      <div class="flex items-center space-x-1.5 shrink-0">
        <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${s.feeStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
          ${s.feeStatus || 'UNPAID'}
        </span>
      </div>
    `;
    container.appendChild(card);
  });
}

/* =========================================================================
   2. OUTBOUND WHATSAPP DISPATCH QUEUES
   ========================================================================= */
async function loadDispatchQueue() {
  const container = document.getElementById("director-queue-cards-list");
  if (!container) return;
  container.innerHTML = '<div class="text-slate-500 text-xs py-3 text-center">Checking dispatch queue...</div>';

  const { ok, data } = await API.get("/director/dispatch-queue");
  if (ok && data.queue) {
    rawDispatchQueue = data.queue;
    document.getElementById("badge-dispatches-count").textContent = rawDispatchQueue.length;
    renderFilteredQueue();
  }
}

function filterQueue(cat) {
  activeQueueFilter = cat;
  ['all', 'absent', 'fees', 'disc'].forEach(c => {
    const btn = document.getElementById(`qcat-${c}`);
    if (btn) {
      const isMatch = (cat === 'ALL' && c === 'all') ||
                      (cat === 'ABSENT_ALERT' && c === 'absent') ||
                      (cat === 'FEE_REMINDER' && c === 'fees') ||
                      (cat === 'DISCIPLINE' && c === 'disc');
      btn.className = isMatch ? "py-2 rounded-xl bg-indigo-600 text-white font-bold" : "py-2 rounded-xl text-slate-400";
    }
  });
  renderFilteredQueue();
}

function renderFilteredQueue() {
  const container = document.getElementById("director-queue-cards-list");
  container.innerHTML = "";

  let list = rawDispatchQueue;
  if (activeQueueFilter !== "ALL") {
    list = list.filter(q => q.type === activeQueueFilter);
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">No pending dispatches in this category.</div>';
    return;
  }

  list.forEach(q => {
    const card = document.createElement("div");
    card.className = "p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2";
    card.innerHTML = `
      <div class="flex items-center justify-between text-[11px]">
        <span class="font-bold text-white">${q.studentName} (${q.class})</span>
        <span class="px-2 py-0.5 rounded font-mono text-[9px] ${q.type === 'DISCIPLINE' ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'}">${q.type}</span>
      </div>
      <p class="text-xs text-slate-300 font-mono bg-slate-950 p-2 rounded-xl">${q.message}</p>
      <div class="flex items-center justify-between pt-1">
        <a href="https://wa.me/91${q.phone}?text=${encodeURIComponent(q.message)}" target="_blank" onclick="resolveDispatch('${q.SK}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 touch-btn">
          <i class="fa-brands fa-whatsapp text-sm"></i><span>Send via WhatsApp</span>
        </a>
        <button onclick="resolveDispatch('${q.SK}')" class="text-xs text-slate-400 hover:text-white">Dismiss</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function resolveDispatch(sk) {
  await API.post("/director/dispatch-resolve", { SK: sk });
  loadDispatchQueue();
}

/* =========================================================================
   3. INTAKE MODES & ADMISSION ACTIONS
   ========================================================================= */
let intakeSubjects = new Set(["Mathematics", "Science"]);
let activeStaffRoleType = "tutor";

function toggleIntakeMode(mode) {
  const isStu = mode === "student";
  document.getElementById("intake-student-panel").classList.toggle("hidden", !isStu);
  document.getElementById("intake-staff-panel").classList.toggle("hidden", isStu);

  document.getElementById("btn-intake-mode-student").className = isStu ? "px-3 py-1 rounded-lg bg-indigo-600 text-white" : "px-3 py-1 rounded-lg text-slate-400";
  document.getElementById("btn-intake-mode-staff").className = !isStu ? "px-3 py-1 rounded-lg bg-indigo-600 text-white" : "px-3 py-1 rounded-lg text-slate-400";
}

function toggleAdmissionDateMode(isLegacy) {
  const dateInput = document.getElementById("adm-date");
  if (isLegacy) {
    dateInput.value = "2026-01-10";
  } else {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
}

function toggleIntakeSubject(btn, subj) {
  if (intakeSubjects.has(subj)) {
    intakeSubjects.delete(subj);
    btn.className = "px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-bold";
  } else {
    intakeSubjects.add(subj);
    btn.className = "px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold";
  }
}

async function handleUnifiedStudentEnroll(e) {
  e.preventDefault();
  const fatherPhone = document.getElementById("adm-father-phone").value.trim();
  const motherPhone = document.getElementById("adm-mother-phone").value.trim();
  const targetChoice = document.querySelector('input[name="adm-primary-target"]:checked').value;
  const targetPhone = targetChoice === "father" ? fatherPhone : motherPhone;

  const payload = {
    name: document.getElementById("adm-name").value.trim(),
    class: document.getElementById("adm-class").value,
    admissionDate: document.getElementById("adm-date").value,
    school: document.getElementById("adm-school").value.trim(),
    area: document.getElementById("adm-area").value.trim(),
    fatherName: document.getElementById("adm-father-name").value.trim(),
    fatherPhone: fatherPhone,
    motherName: document.getElementById("adm-mother-name").value.trim(),
    motherPhone: motherPhone,
    primaryContact: targetChoice,
    primaryPhone: targetPhone,
    subjects: Array.from(intakeSubjects),
    monthlyFee: document.getElementById("adm-fee").value
  };

  const { ok, data } = await API.post("/director/admit-student", payload);
  if (ok) {
    alert(`Student successfully admitted! ID: ${data.studentId}`);
    e.target.reset();
    loadDirectorFloorData();
  } else {
    alert("Admission failed.");
  }
}

function selectStaffRoleType(role) {
  activeStaffRoleType = role;
  ['tutor', 'faculty', 'director'].forEach(r => {
    const btn = document.getElementById(`srole-${r}`);
    if (btn) btn.className = (r === role) ? "py-1.5 rounded-lg bg-indigo-600 text-white" : "py-1.5 rounded-lg text-slate-400";
  });

  document.getElementById("box-faculty-subjects").classList.toggle("hidden", role !== "faculty");
  document.getElementById("box-staff-passwords").classList.toggle("hidden", role === "faculty");
}

async function handleStaffEnroll(e) {
  e.preventDefault();
  const name = document.getElementById("staff-reg-name").value.trim();
  const phone = document.getElementById("staff-reg-phone").value.trim();
  const pass1 = document.getElementById("staff-reg-pass1").value;
  const pass2 = document.getElementById("staff-reg-pass2").value;

  if (activeStaffRoleType !== "faculty" && pass1 !== pass2) {
    alert("Passwords do not match.");
    return;
  }

  const payload = {
    name,
    role: activeStaffRoleType,
    phone,
    specialty: document.getElementById("staff-reg-specialty")?.value || "",
    password: pass1 || "Tuition@Faculty123",
    confirmPassword: pass2 || "Tuition@Faculty123",
    salary: activeStaffRoleType === "faculty" ? 15000 : 12000
  };

  const { ok, data } = await API.post("/director/create-staff", payload);
  if (ok) {
    alert(data.message || "Staff member registered.");
    e.target.reset();
    loadStaffRoster();
  } else {
    alert(data.error || "Staff registration failed.");
  }
}

async function loadStaffRoster() {
  const container = document.getElementById("director-staff-list-container");
  if (!container) return;
  const { ok, data } = await API.get("/director/staff-list");
  if (ok && data.staff) {
    directorStaff = data.staff;
    container.innerHTML = directorStaff.map(s => `
      <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
        <div>
          <span class="font-bold text-white">${s.name}</span>
          <span class="text-[10px] text-indigo-400 uppercase font-mono ml-1">(${s.role})</span>
          <p class="text-[10px] text-slate-500 font-mono">${s.phone} &bull; Status: ${s.status}</p>
        </div>
        <div>
          ${s.status === 'ACTIVE' ? `
            <button onclick="deactivateStaff('${s.id}')" class="px-2.5 py-1 bg-rose-900/40 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">Relieve</button>
          ` : `
            <span class="text-rose-500 text-[10px] font-bold">Relieved</span>
          `}
        </div>
      </div>
    `).join("");
  }
}

async function deactivateStaff(staffId) {
  if (!confirm("Revoke login credentials for this staff member?")) return;
  await API.post("/director/manage-staff", { action: "DEACTIVATE", staffId });
  loadStaffRoster();
}

/* =========================================================================
   4. FEES & FINANCIAL LEDGER
   ========================================================================= */
async function loadFinancialLedger() {
  let collected = 0;
  let pending = 0;

  const container = document.getElementById("director-fees-list-container");
  container.innerHTML = "";

  directorStudents.forEach(s => {
    const fee = parseInt(s.monthlyFee) || 1500;
    const isPaid = s.feeStatus === "PAID";
    if (isPaid) collected += fee; else pending += fee;

    const row = document.createElement("div");
    row.className = "p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs";
    row.innerHTML = `
      <div>
        <span class="font-bold text-white">${s.name} (Class ${s.class})</span>
        <span class="text-slate-400 block text-[10px]">Anchor Due: ${s.admissionDate || 'N/A'}</span>
      </div>
      <button onclick="toggleStudentFee('${s.id || s.PK.replace('STUDENT#', '')}', '${isPaid ? 'UNPAID' : 'PAID'}')" class="px-3 py-1.5 rounded-xl font-bold font-mono ${isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
        ₹${fee} ${s.feeStatus || 'UNPAID'}
      </button>
    `;
    container.appendChild(row);
  });

  const payroll = 24000;
  document.getElementById("fin-collected").textContent = `₹${collected.toLocaleString('en-IN')}`;
  document.getElementById("fin-pending").textContent = `₹${pending.toLocaleString('en-IN')}`;
  document.getElementById("fin-payroll").textContent = `₹${payroll.toLocaleString('en-IN')}`;
  document.getElementById("fin-net").textContent = `₹${Math.max(0, collected - payroll).toLocaleString('en-IN')}`;
}

async function toggleStudentFee(studentId, newStatus) {
  await API.post("/director/toggle-fee", { studentId, feeStatus: newStatus });
  loadDirectorFloorData();
  loadFinancialLedger();
}

/* =========================================================================
   5. SECURITY PIN UPDATES
   ========================================================================= */
async function handleUpdateDirectorPIN(e) {
  e.preventDefault();
  const currentPin = document.getElementById("sec-current-pin").value.trim();
  const newPin = document.getElementById("sec-new-pin").value.trim();

  const { ok, data } = await API.post("/auth/change-pin", { currentPin, newPin });
  if (ok) {
    alert("Director Security PIN updated successfully.");
    e.target.reset();
  } else {
    alert(data.error || "Failed to update Security PIN.");
  }
}