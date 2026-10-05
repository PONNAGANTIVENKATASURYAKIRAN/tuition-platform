let facultyStudents = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = enforceAuth("faculty");
  if (!user) return;
  document.getElementById("faculty-name-display").textContent = `${user.name} (Faculty)`;
  loadFacultyStudents();
  loadDoubts();
});

async function loadFacultyStudents() {
  const container = document.getElementById("faculty-students-list");
  container.innerHTML = '<div class="text-slate-500 text-xs py-2 text-center">Loading enrolled cohort...</div>';
  
  const { ok, data } = await API.get("/faculty/students");
  if (ok && data.students) {
    facultyStudents = data.students;
    renderFacultyCohort();
    populateStudentDropdown();
  }
}

function renderFacultyCohort() {
  const container = document.getElementById("faculty-students-list");
  if (facultyStudents.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs">No active students enrolled.</div>';
    return;
  }

  container.innerHTML = facultyStudents.map(s => `
    <div class="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-2">
      <div class="min-w-0">
        <h4 class="font-bold text-white text-xs truncate">${s.name}</h4>
        <p class="text-[11px] text-slate-400 truncate">Class ${s.class} &bull; ${s.school || "School"}</p>
        <div class="flex flex-wrap gap-1 mt-1">
          ${(s.subjects || []).map(sub => `<span class="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] rounded font-mono">${sub}</span>`).join("")}
        </div>
      </div>
      <button onclick="selectStudentForDoubt('${s.id || s.PK.replace('STUDENT#', '')}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 touch-btn">
        Clear Doubt
      </button>
    </div>
  `).join("");
}

function populateStudentDropdown() {
  const select = document.getElementById("doubt-student-select");
  if (!select) return;
  select.innerHTML = facultyStudents.map(s => `
    <option value="${s.id || s.PK.replace('STUDENT#', '')}">${s.name} (Class ${s.class})</option>
  `).join("");
}

function selectStudentForDoubt(studentId) {
  const select = document.getElementById("doubt-student-select");
  if (select) {
    select.value = studentId;
    select.scrollIntoView({ behavior: 'smooth' });
  }
}

async function handleClearDoubt(e) {
  e.preventDefault();
  const select = document.getElementById("doubt-student-select");
  const studentId = select.value;
  const student = facultyStudents.find(s => (s.id || s.PK.replace("STUDENT#", "")) === studentId);
  const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");

  const payload = {
    studentId: studentId,
    studentName: student ? student.name : "Student",
    subject: document.getElementById("doubt-subject").value.trim(),
    topic: document.getElementById("doubt-topic").value.trim(),
    remarks: document.getElementById("doubt-remarks").value.trim(),
    teacherName: user.name || "Faculty"
  };

  const { ok, data } = await API.post("/faculty/resolve-doubt", payload);
  if (ok) {
    alert(data.message || "Doubt clearance session recorded.");
    e.target.reset();
    loadDoubts();
  } else {
    alert("Failed to record doubt.");
  }
}

async function loadDoubts() {
  const container = document.getElementById("doubts-container");
  container.innerHTML = '<div class="text-slate-500 text-xs py-2 text-center">Loading solved doubts...</div>';
  
  const { ok, data } = await API.post("/faculty/doubts", {});
  if (ok && data.doubts) {
    if (data.doubts.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs bg-slate-800/40 rounded-2xl border border-slate-800">No doubts recorded yet.</div>';
      return;
    }
    container.innerHTML = data.doubts.map(d => `
      <div class="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-white">${d.studentName} &bull; ${d.subject}</span>
          <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[9px]">SOLVED</span>
        </div>
        <p class="text-xs text-indigo-300 font-semibold">${d.topic}</p>
        <p class="text-xs text-slate-300">"${d.remarks}"</p>
        <p class="text-[10px] text-slate-500 font-mono">Cleared by: ${d.teacher} on ${d.date || 'Today'}</p>
      </div>
    `).join("");
  }
}