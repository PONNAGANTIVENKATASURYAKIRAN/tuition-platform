/* Data Models & Core State */
let currentRole = "director";
let activeDirectorTab = "alerts";
let activeDossierTab = "syllabus";
let activeStudentId = "STU-001";
let activeStaffTab = "tutor";
let tutorFilter = "ALL";
let currentSubjectIdx = 0;
let currentChapterIdx = 0;

let faculty = [
  { id: "FAC-1", name: "Mr. K. V. Sharma", role: "teacher", basePay: 15000, today: "PRESENT" },
  { id: "FAC-2", name: "Dr. P. Anuradha", role: "teacher", basePay: 14500, today: "PRESENT" },
  { id: "TUT-1", name: "Srinivas", role: "tutor", basePay: 11000, today: "PRESENT" },
  { id: "TUT-2", name: "Kavitha", role: "tutor", basePay: 12500, today: "PRESENT" }
];

let students = [
  {
    id: "STU-001",
    name: "M. Sai Tarun",
    school: "Bhashyam High School",
    area: "Brodipet",
    grade: "Class 10",
    stream: "SSC (State)",
    phone: "9391645396",
    attendance: "PRESENT",
    fee: 1500,
    feeStatus: "PAID",
    syllabus: [
      {
        subject: "Mathematics",
        chapters: [
          {
            title: "Quadratic Equations",
            topics: [
              { name: "Standard Form & Factorization", confidence: 100 },
              { name: "Completing the Square", confidence: 50 }
            ]
          }
        ]
      }
    ],
    slipTests: [{ topic: "Quadratic Roots", score: 18, max: 20, remarks: "Accurate formulas" }],
    exams: [{ name: "Maths Midterm", daysLeft: 4 }],
    examResults: [{ name: "Unit Test 1", percentage: 88, delta: "+8% vs Previous" }]
  },
  {
    id: "STU-002",
    name: "K. Bhavya",
    school: "Oxford Grammar School",
    area: "Chandramouli Nagar",
    grade: "Class 9",
    stream: "CBSE",
    phone: "9848099887",
    attendance: "ABSENT",
    fee: 1600,
    feeStatus: "UNPAID",
    syllabus: [],
    slipTests: [],
    exams: [],
    examResults: []
  }
];

let alerts = [
  {
    id: "ALT-1",
    studentName: "K. Bhavya",
    grade: "Class 9",
    phone: "9848099887",
    text: "Dear Parents, Warm greetings from Krishna Tuition Institutions. We noticed your ward K. Bhavya (Class 9) is absent for today's session. Please coordinate with us safely."
  }
];

/* Initialization */
window.onload = function() {
  if (window.APP_CONFIG) {
    document.getElementById("login-brand-title").textContent = window.APP_CONFIG.institutionName;
    document.getElementById("app-brand-title").textContent = window.APP_CONFIG.institutionName;
    const senderSelect = document.getElementById("director-active-sender");
    senderSelect.innerHTML = "";
    window.APP_CONFIG.directors.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.phone;
      opt.textContent = d.label;
      senderSelect.appendChild(opt);
    });
  }
  renderAll();
};

function selectLoginRole(role) {
  ['director', 'tutor', 'teacher'].forEach(r => {
    document.getElementById(`role-pill-${r}`).className = r === role ? "py-2 rounded-lg bg-white text-indigo-700 shadow-sm transition" : "py-2 rounded-lg text-slate-600 hover:text-slate-900 transition";
  });
  currentRole = role;
}

function handleStaffLogin(e) {
  e.preventDefault();
  closeModal('login-modal');
  switchRole(currentRole);
  showToast(`Logged in as ${currentRole.toUpperCase()}`);
}

function logoutStaff() {
  document.getElementById("login-modal").classList.remove("hidden");
}

function switchRole(role) {
  currentRole = role;
  document.getElementById("view-director").classList.toggle("hidden", role !== "director");
  document.getElementById("view-tutor").classList.toggle("hidden", role !== "tutor");
  document.getElementById("view-teacher").classList.toggle("hidden", role !== "teacher");

  ['director', 'tutor', 'teacher'].forEach(r => {
    const btn = document.getElementById(`nav-btn-${r}`);
    btn.className = r === role ? "px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-sm" : "px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900";
  });

  renderAll();
}

function switchDirectorTab(tab) {
  activeDirectorTab = tab;
  ['alerts', 'students', 'staff', 'fees'].forEach(t => {
    document.getElementById(`dpanel-${t}`).classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`dtab-${t}`);
    btn.className = t === tab ? "px-3 py-2 text-indigo-700 border-b-2 border-indigo-700 whitespace-nowrap" : "px-3 py-2 text-slate-500 hover:text-slate-800 whitespace-nowrap";
  });
}

function renderAll() {
  renderAlerts();
  renderDirectorStudents();
  renderStaff();
  renderFees();
  renderTutorCards();
  renderTeacherQueue();
}

function renderAlerts() {
  const cont = document.getElementById("director-alerts-list");
  cont.innerHTML = "";
  document.getElementById("d-badge-alerts").textContent = alerts.length;
  if (alerts.length === 0) {
    cont.innerHTML = `<div class="p-4 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">No pending alerts.</div>`;
    return;
  }
  alerts.forEach(a => {
    const d = document.createElement("div");
    d.className = "p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2";
    d.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-900">${a.studentName} (${a.grade})</span>
        <span class="font-mono text-slate-400">${a.phone}</span>
      </div>
      <p class="p-2.5 bg-slate-50 rounded-xl text-slate-600 text-xs">${a.text}</p>
      <div class="flex justify-end space-x-2">
        <button onclick="dismissAlert('${a.id}')" class="px-2 py-1 text-slate-500 hover:text-slate-700">Dismiss</button>
        <button onclick="sendAlertWhatsApp('${a.id}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1">
          <i class="fa-brands fa-whatsapp text-sm"></i><span>Send WhatsApp</span>
        </button>
      </div>
    `;
    cont.appendChild(d);
  });
}

function sendAlertWhatsApp(id) {
  const a = alerts.find(x => x.id === id);
  if (!a) return;
  window.open(`https://wa.me/91${a.phone}?text=${encodeURIComponent(a.text)}`, '_blank');
  dismissAlert(id);
}

function dismissAlert(id) {
  alerts = alerts.filter(x => x.id !== id);
  renderAlerts();
}

function renderDirectorStudents() {
  const tbody = document.getElementById("director-students-tbody");
  tbody.innerHTML = "";
  const filter = document.getElementById("d-student-grade-filter").value;
  const search = document.getElementById("d-student-search").value.toLowerCase();

  let list = students;
  if (filter !== "ALL") list = list.filter(s => s.grade === filter);
  if (search) list = list.filter(s => s.name.toLowerCase().includes(search));

  document.getElementById("d-badge-students").textContent = students.length;

  list.forEach(s => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-900 cursor-pointer hover:text-indigo-600" onclick="openStudentModal('${s.id}')">${s.name}</td>
      <td class="p-3">${s.grade} (${s.stream})</td>
      <td class="p-3 font-mono"><a href="tel:${s.phone}" class="text-indigo-600 font-bold hover:underline">${s.phone}</a></td>
      <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.attendance === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.attendance}</span></td>
      <td class="p-3 text-right">
        <button onclick="openStudentModal('${s.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">Inspect</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function switchStaffSubTab(tab) {
  activeStaffTab = tab;
  document.getElementById("stab-tutor").className = tab === 'tutor' ? "px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs" : "px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs";
  document.getElementById("stab-teacher").className = tab === 'teacher' ? "px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs" : "px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs";
  renderStaff();
}

function renderStaff() {
  const tbody = document.getElementById("director-staff-tbody");
  tbody.innerHTML = "";
  faculty.filter(f => f.role === activeStaffTab).forEach(st => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-900">${st.name}</td>
      <td class="p-3 font-mono">₹${st.basePay.toLocaleString('en-IN')}</td>
      <td class="p-3">
        <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button onclick="markStaff('${st.id}', 'PRESENT')" class="px-2 py-0.5 rounded text-xs font-bold ${st.today === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-slate-600'}">P</button>
          <button onclick="markStaff('${st.id}', 'ABSENT')" class="px-2 py-0.5 rounded text-xs font-bold ${st.today === 'ABSENT' ? 'bg-rose-600 text-white' : 'text-slate-600'}">A</button>
        </div>
      </td>
      <td class="p-3 text-right">
        <button onclick="showToast('Viewing verified work log for ${st.name}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">Activity</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function markStaff(id, status) {
  const f = faculty.find(x => x.id === id);
  if (f) {
    f.today = status;
    renderStaff();
    showToast(`${f.name} marked ${status}`);
  }
}

function renderFees() {
  let exp = 0, col = 0, pen = 0;
  const list = document.getElementById("fees-student-list");
  list.innerHTML = "";
  students.forEach(s => {
    exp += s.fee;
    if (s.feeStatus === "PAID") col += s.fee; else pen += s.fee;

    const d = document.createElement("div");
    d.className = "p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between";
    d.innerHTML = `
      <div><span class="font-bold text-slate-900 block">${s.name} (${s.grade})</span><span class="font-mono text-slate-400">₹${s.fee}</span></div>
      <button onclick="toggleFee('${s.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold ${s.feeStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.feeStatus}</button>
    `;
    list.appendChild(d);
  });
  document.getElementById("fee-stat-expected").textContent = `₹${exp}`;
  document.getElementById("fee-stat-collected").textContent = `₹${col}`;
  document.getElementById("fee-stat-pending").textContent = `₹${pen}`;
}

function toggleFee(id) {
  const s = students.find(x => x.id === id);
  if (s) {
    s.feeStatus = s.feeStatus === "PAID" ? "UNPAID" : "PAID";
    renderFees();
    showToast(`Fee status updated for ${s.name}`);
  }
}

function setTutorFilter(f) {
  tutorFilter = f;
  document.getElementById("tbtn-all").className = f === 'ALL' ? "px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold" : "px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-semibold";
  document.getElementById("tbtn-present").className = f === 'PRESENT' ? "px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold" : "px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-semibold";
  renderTutorCards();
}

function renderTutorCards() {
  const cont = document.getElementById("tutor-cards-container");
  cont.innerHTML = "";
  const grade = document.getElementById("tutor-grade-filter").value;
  let list = students;
  if (tutorFilter === "PRESENT") list = list.filter(s => s.attendance === "PRESENT");
  if (grade !== "ALL") list = list.filter(s => s.grade === grade);

  list.forEach(s => {
    const d = document.createElement("div");
    d.className = "p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between";
    d.innerHTML = `
      <div>
        <span class="font-bold text-slate-900 cursor-pointer hover:text-indigo-600 block" onclick="openStudentModal('${s.id}')">${s.name} (${s.grade})</span>
        <span class="text-slate-400 text-[11px]">${s.school}</span>
      </div>
      <div class="flex items-center space-x-2">
        <a href="tel:${s.phone}" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><i class="fa-solid fa-phone text-xs"></i></a>
        <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button onclick="toggleStudentAtt('${s.id}', 'PRESENT')" class="px-2 py-0.5 rounded text-xs font-bold ${s.attendance === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-slate-600'}">P</button>
          <button onclick="toggleStudentAtt('${s.id}', 'ABSENT')" class="px-2 py-0.5 rounded text-xs font-bold ${s.attendance === 'ABSENT' ? 'bg-rose-600 text-white' : 'text-slate-600'}">A</button>
        </div>
        <button onclick="openStudentModal('${s.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">Dossier</button>
      </div>
    `;
    cont.appendChild(d);
  });
}

function toggleStudentAtt(id, val) {
  const s = students.find(x => x.id === id);
  if (s) {
    s.attendance = val;
    renderTutorCards();
    showToast(`${s.name} marked ${val}`);
  }
}

function pushFloorAbsentees() {
  const abs = students.filter(s => s.attendance === "ABSENT");
  if (abs.length === 0) return showToast("No absentees to push");
  abs.forEach(s => {
    if (!alerts.some(a => a.studentName === s.name)) {
      alerts.push({
        id: `ALT-${Date.now()}`,
        studentName: s.name,
        grade: s.grade,
        phone: s.phone,
        text: `Dear Parents, Warm greetings from ${window.APP_CONFIG.institutionName}. We noticed that ${s.name} is absent for today's session. Please coordinate with us.`
      });
    }
  });
  renderAlerts();
  showToast(`Pushed ${abs.length} absentees to Director Alerts`);
}

function renderTeacherQueue() {
  const cont = document.getElementById("teacher-cards-container");
  cont.innerHTML = "";
  students.forEach(s => {
    const d = document.createElement("div");
    d.className = "p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between";
    d.innerHTML = `
      <div><span class="font-bold text-slate-900 block">${s.name} (${s.grade})</span><span class="text-slate-400 text-[11px]">${s.school}</span></div>
      <button onclick="promptDoubt('${s.id}')" class="px-3 py-1 bg-indigo-600 text-white rounded-xl font-bold">Log Doubt Cleared</button>
    `;
    cont.appendChild(d);
  });
}

function promptDoubt(id) {
  const s = students.find(x => x.id === id);
  const topic = prompt(`Topic where ${s.name} cleared doubts:`, "Trigonometry");
  if (topic) showToast(`Doubt cleared for ${s.name} in ${topic}`);
}

/* Dossier Modal Handlers */
function openStudentModal(id) {
  activeStudentId = id;
  const s = students.find(x => x.id === id);
  if (!s) return;
  document.getElementById("dossier-name").textContent = s.name;
  document.getElementById("dossier-grade-badge").textContent = s.grade;
  document.getElementById("dossier-phone-primary").textContent = s.phone;
  document.getElementById("dossier-phone-primary").href = `tel:${s.phone}`;
  document.getElementById("dossier-school").textContent = s.school;

  renderSyllabusUI(s);
  renderSlipTestsUI(s);
  renderExamsUI(s);
  document.getElementById("student-modal").classList.remove("hidden");
}

function switchDossierTab(tab) {
  activeDossierTab = tab;
  ['syllabus', 'slip-tests', 'weekly-test', 'exams'].forEach(t => {
    document.getElementById(`mpanel-${t}`).classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`mtab-${t}`);
    btn.className = t === tab ? "py-2 px-3 text-indigo-700 border-b-2 border-indigo-700" : "py-2 px-3 text-slate-500 hover:text-slate-800";
  });
}

function renderSyllabusUI(s) {
  const subCont = document.getElementById("dossier-subjects-list");
  subCont.innerHTML = "";
  if (s.syllabus.length === 0) {
    subCont.innerHTML = `<span class="text-slate-400 italic">No syllabus added.</span>`;
    return;
  }
  s.syllabus.forEach((sub, idx) => {
    const btn = document.createElement("button");
    btn.className = `px-3 py-1 rounded-xl font-bold ${idx === currentSubjectIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`;
    btn.textContent = sub.subject;
    btn.onclick = () => { currentSubjectIdx = idx; renderSyllabusUI(s); };
    subCont.appendChild(btn);
  });

  const chapCont = document.getElementById("dossier-chapters-list");
  chapCont.innerHTML = "";
  const curSub = s.syllabus[currentSubjectIdx];
  if (curSub && curSub.chapters.length > 0) {
    curSub.chapters.forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.className = `px-2.5 py-1 rounded-lg border font-semibold ${idx === currentChapterIdx ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-600'}`;
      btn.textContent = ch.title;
      btn.onclick = () => { currentChapterIdx = idx; renderSyllabusUI(s); };
      chapCont.appendChild(btn);
    });

    const topCont = document.getElementById("dossier-subtopics-list");
    topCont.innerHTML = "";
    const curChap = curSub.chapters[currentChapterIdx];
    if (curChap && curChap.topics.length > 0) {
      curChap.topics.forEach((t, idx) => {
        const div = document.createElement("div");
        div.className = "p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between";
        div.innerHTML = `
          <span class="font-bold text-slate-800">${t.name}</span>
          <div class="flex items-center space-x-1">
            ${[0, 25, 50, 75, 100].map(v => `
              <button onclick="setConfidence(${idx},${v})" class="px-1.5 py-0.5 rounded text-[10px] font-bold ${t.confidence === v ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}">${v}%</button>
            `).join('')}
          </div>
        `;
        topCont.appendChild(div);
      });
    }
  }
}

function setConfidence(idx, val) {
  const s = students.find(x => x.id === activeStudentId);
  s.syllabus[currentSubjectIdx].chapters[currentChapterIdx].topics[idx].confidence = val;
  renderSyllabusUI(s);
  showToast(`Confidence: ${val}%`);
}

function renderSlipTestsUI(s) {
  const cont = document.getElementById("dossier-tests-history");
  cont.innerHTML = "";
  s.slipTests.forEach(t => {
    const d = document.createElement("div");
    d.className = "p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between";
    d.innerHTML = `
      <div><span class="font-bold text-slate-900 block">${t.topic}</span><span class="text-slate-400 italic">${t.remarks}</span></div>
      <span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">${t.score}/${t.max}</span>
    `;
    cont.appendChild(d);
  });
}

function handleSaveSlipTest(e) {
  e.preventDefault();
  const s = students.find(x => x.id === activeStudentId);
  const topic = document.getElementById("st-topic").value;
  const score = document.getElementById("st-score").value;
  const max = document.getElementById("st-max").value;
  const remarks = document.getElementById("st-remarks").value;

  s.slipTests.unshift({ topic, score, max, remarks });
  renderSlipTestsUI(s);
  showToast("Slip test saved");
  e.target.reset();
}

function renderExamsUI(s) {
  const cList = document.getElementById("dossier-exam-countdowns");
  cList.innerHTML = "";
  s.exams.forEach(ex => {
    const d = document.createElement("div");
    d.className = "p-2 bg-rose-50 border border-rose-200 rounded-xl flex justify-between";
    d.innerHTML = `<span class="font-bold text-slate-800">${ex.name}</span><span class="font-mono font-bold text-rose-700">${ex.daysLeft} Days Left</span>`;
    cList.appendChild(d);
  });

  const rList = document.getElementById("dossier-exam-deltas");
  rList.innerHTML = "";
  s.examResults.forEach(r => {
    const d = document.createElement("div");
    d.className = "p-2 bg-slate-50 border border-slate-200 rounded-xl flex justify-between";
    d.innerHTML = `<span class="font-bold text-slate-800">${r.name}</span><span class="font-mono font-bold text-emerald-700">${r.percentage}% (${r.delta})</span>`;
    rList.appendChild(d);
  });
}

function promptAddExam() {
  const name = prompt("Exam Name (e.g. Maths Quarterly):");
  const days = prompt("Days Remaining:", "5");
  if (name && days) {
    const s = students.find(x => x.id === activeStudentId);
    s.exams.push({ name, daysLeft: parseInt(days) });
    renderExamsUI(s);
  }
}

function openEnrollModal() { document.getElementById("enroll-modal").classList.remove("hidden"); }

function handleEnrollStudent(e) {
  e.preventDefault();
  const name = document.getElementById("en-name").value;
  const school = document.getElementById("en-school").value;
  const area = document.getElementById("en-area").value;
  const grade = document.getElementById("en-grade").value;
  const stream = document.getElementById("en-stream").value;
  const phone = document.getElementById("en-phone").value;
  const fee = parseInt(document.getElementById("en-fee").value) || 1500;

  students.unshift({
    id: `STU-00${students.length + 1}`,
    name, school, area, grade, stream, phone,
    attendance: "PRESENT",
    fee, feeStatus: "UNPAID",
    syllabus: [{ subject: "Mathematics", chapters: [] }],
    slipTests: [], exams: [], examResults: []
  });

  renderAll();
  closeModal('enroll-modal');
  showToast(`Enrolled ${name} successfully`);
  e.target.reset();
}

/* Modal Helpers matching your screenshot lines 345-355 */
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  const icon = document.getElementById("toast-icon");
  msgEl.textContent = message;
  icon.className = type === "error" ? "fa-solid fa-circle-exclamation text-rose-400" : (type === "info" ? "fa-solid fa-circle-info text-sky-400" : "fa-solid fa-circle-check text-emerald-400");
  toast.classList.remove("translate-y-24", "opacity-0");
  setTimeout(() => toast.classList.add("translate-y-24", "opacity-0"), 2800);
}