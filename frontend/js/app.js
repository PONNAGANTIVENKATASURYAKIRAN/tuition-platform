/* =========================================================================
   1. DATA ENGINE & APPLICATION STATE
   ========================================================================= */
let activeRole = "director";
let activeFloorFilter = "ALL";
let activeStudentId = "STU-001";
let activeDirectorTabId = "approvals";
let activeQueueCategory = "ALL";
let activeAuditedStaffId = "TUT-1";
let activeFacultySubTabType = "Tutor";

let activeDirectorPhone = "8008717360";
let activeDirectorTitle = "Director Sir";

let currentSelectedSubjectIdx = 0;
let currentSelectedChapterIdx = 0;
let temporaryCapturedPhotos = [];
let customConfirmResolver = null;

let faculty = [
  { id: "TUT-1", name: "Srinivas", role: "Tutor", subject: "Class 9 & 10 Supervision", phone: "9848055667", salary: 11000, duty: "Class 10 & 9 Batch", todayAttendance: "PRESENT", absences: [] },
  { id: "TUT-2", name: "Kavitha", role: "Tutor", subject: "Intermediate / Coding", phone: "9848066778", salary: 12500, duty: "Inter & B.Tech Batches", todayAttendance: "ABSENT", absences: [{ date: "2026-09-24", reason: "Practical Exam Supervision", excused: true }] },
  { id: "FAC-1", name: "Mr. K. V. Sharma", role: "Teacher", subject: "Senior Mathematics", phone: "9848011223", salary: 15000, duty: "Class 10 & 9 Advanced Maths", todayAttendance: "PRESENT", absences: [] },
  { id: "FAC-2", name: "Dr. P. Anuradha", role: "Teacher", subject: "Science & Physics", phone: "9848022334", salary: 14500, duty: "Class 8-10 Science Concepts", todayAttendance: "PRESENT", absences: [] },
  { id: "FAC-3", name: "Mrs. S. Madhavi", role: "Teacher", subject: "Social & English", phone: "9848033445", salary: 12000, duty: "Social Studies & Grammar", todayAttendance: "ABSENT", absences: [{ date: "2026-09-08", reason: "Emergency Medical", excused: false }] }
];

let pendingCognitoUsers = [
  { id: "COG-1", name: "R. Naresh", role: "Tutor", email: "naresh.tutor@tuition.internal", requestedDate: "2026-09-30", status: "PENDING_DIRECTOR_APPROVAL" }
];

let tuitionExpenses = [
  { id: "EXP-1", title: "Campus Electricity & Air Cooling", amount: 3500, date: "2026-09-10" },
  { id: "EXP-2", title: "Slip Test Printing & Paper Bundles", amount: 1200, date: "2026-09-15" }
];

let students = [
  {
    id: "STU-001",
    name: "M. Sai Tarun",
    schoolName: "Bhashyam High School",
    area: "Brodipet",
    grade: "Class 10",
    curriculum: "SSC (State)",
    scope: "All Subjects (Regular Program)",
    admissionDate: "2026-06-10",
    nextDueDate: "2026-10-10",
    fatherName: "M. Koteswara Rao",
    fatherPhone: "9391645396",
    motherName: "M. Lakshmi",
    motherPhone: "9848123450",
    primaryNumber: "9391645396",
    primaryRole: "Father",
    monthlyFee: 1500,
    feeStatus: "PAID",
    attendanceToday: "PRESENT",
    lastUpdatedBy: "Srinivas at 5:02 PM",
    status: "ACTIVE",
    examSchedules: [{ name: "Mathematics Midterm", date: "2026-10-05", daysLeft: 4, type: "School Exam" }],
    examResults: [{ name: "Unit Test 1 (Maths)", subject: "Mathematics", scored: 22, max: 25, percentage: 88, delta: "+8% Improvement" }],
    syllabus: [
      {
        name: "Mathematics",
        chapters: [
          {
            title: "Quadratic Equations",
            completion: 75,
            topics: [
              { id: "T1", name: "Standard Form & Factorization", confidence: 100, tested: true, score: "9/10" },
              { id: "T2", name: "Completing the Square Method", confidence: 50, tested: false, score: "Practice Needed" }
            ]
          }
        ]
      }
    ],
    slipTests: [
      { id: "ST-1", date: "2026-09-24", subject: "Mathematics", chapter: "Quadratic Equations", topic: "Standard Form", evaluator: "Mr. K. V. Sharma", score: "18/20", remarks: "Solid step presentation.", photos: [] }
    ],
    attendanceHistory: {
      "2026-09": { totalDays: 30, presentDays: 22, absentDays: 2, holidays: 6, records: { "2026-09-02": "A", "2026-09-15": "A" } }
    }
  },
  {
    id: "STU-002",
    name: "K. Bhavya",
    schoolName: "Oxford Grammar School",
    area: "Chandramouli Nagar",
    grade: "Class 9",
    curriculum: "CBSE",
    scope: "All Subjects",
    admissionDate: "2026-07-05",
    nextDueDate: "2026-10-05",
    fatherName: "K. Prasad",
    fatherPhone: "9848099887",
    motherName: "K. Sunitha",
    motherPhone: "9848088776",
    primaryNumber: "9848099887",
    primaryRole: "Father",
    monthlyFee: 1600,
    feeStatus: "UNPAID",
    attendanceToday: "ABSENT",
    lastUpdatedBy: "Srinivas at 5:10 PM",
    status: "ACTIVE",
    examSchedules: [],
    examResults: [],
    syllabus: [],
    slipTests: [],
    attendanceHistory: {
      "2026-09": { totalDays: 30, presentDays: 20, absentDays: 4, holidays: 6, records: {} }
    }
  }
];

let directorOutboundQueue = [
  {
    id: "Q-1",
    type: "ABSENT",
    studentId: "STU-002",
    studentName: "K. Bhavya",
    grade: "Class 9",
    recipient: "9848099887",
    message: "*KRISHNA TUITION INSTITUTIONS - ATTENDANCE INTIMATION*\nStudent: K. Bhavya (Class 9)\n\nRespected Parents, your ward has not reached our tuition session today. Contact Director: 8008717360."
  }
];

/* =========================================================================
   2. HELPERS & NOTIFICATIONS
   ========================================================================= */
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  t.classList.remove("translate-y-24", "opacity-0");
  setTimeout(() => t.classList.add("translate-y-24", "opacity-0"), 2500);
}

function showCustomConfirm(title, desc) {
  return new Promise((resolve) => {
    document.getElementById("confirm-modal-title").textContent = title;
    document.getElementById("confirm-modal-desc").textContent = desc;
    document.getElementById("custom-confirm-modal").classList.remove("hidden");
    customConfirmResolver = resolve;
  });
}

function resolveCustomConfirm(res) {
  document.getElementById("custom-confirm-modal").classList.add("hidden");
  if (customConfirmResolver) { customConfirmResolver(res); customConfirmResolver = null; }
}

function toggleAwsArchitectureModal() { document.getElementById("aws-architecture-modal").classList.toggle("hidden"); }
function toggleBedrockAiModal() { document.getElementById("bedrock-ai-modal").classList.toggle("hidden"); }
function closePhotoLightbox() { document.getElementById("photo-lightbox-modal").classList.add("hidden"); }

/* =========================================================================
   3. ROLE SWITCHING & DISPATCHER
   ========================================================================= */
function updateActiveDirectorSender() {
  const [phone, title] = document.getElementById("active-director-sender-select").value.split("|");
  activeDirectorPhone = phone;
  activeDirectorTitle = title;
  showToast(`Sender set to ${title}`);
}

function switchSystemRole(role) {
  activeRole = role;
  document.getElementById("workspace-tutor").classList.toggle("hidden", role !== "tutor");
  document.getElementById("workspace-teacher").classList.toggle("hidden", role !== "teacher");
  document.getElementById("workspace-director").classList.toggle("hidden", role !== "director");

  ['director', 'tutor', 'teacher'].forEach(r => {
    const b = document.getElementById(`role-btn-${r}`);
    b.className = (r === role)
      ? "px-2.5 sm:px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-xs transition flex items-center space-x-1"
      : "px-2.5 sm:px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1";
  });

  if (role === "tutor") renderTutorCards();
  else if (role === "teacher") renderTeacherConsole();
  else renderDirectorWorkspace();
}

function directorStepInAsFloorTutor() {
  switchSystemRole('tutor');
  document.getElementById("active-floor-tutor-select").value = "DIR-1|Director Sir|Director Floor Override";
  renderTutorCards();
  showToast("Director Floor Step-In mode active.", "info");
}

function switchDirectorTab(tab) {
  activeDirectorTabId = tab;
  ['approvals', 'students', 'faculty-management', 'fees', 'finances'].forEach(t => {
    const p = document.getElementById(`dpanel-${t}`);
    const b = document.getElementById(`dtab-${t}`);
    if (p) p.classList.toggle("hidden", t !== tab);
    if (b) b.className = (t === tab)
      ? "px-3 py-2 rounded-t-lg bg-white border-t-2 border-indigo-600 text-indigo-700 font-bold whitespace-nowrap flex items-center space-x-1.5"
      : "px-3 py-2 text-slate-500 hover:text-slate-800 whitespace-nowrap flex items-center space-x-1.5";
  });

  if (tab === "approvals") renderDirectorQueue();
  if (tab === "students") renderDirectorStudentsTable();
  if (tab === "faculty-management") renderFacultyDailyList();
  if (tab === "fees") renderDirectorFeesTable();
  if (tab === "finances") renderFinancesAndPayroll();
}

/* =========================================================================
   4. AWS BEDROCK AI RAG ASSISTANT
   ========================================================================= */
function setBedrockPrompt(txt) {
  document.getElementById("bedrock-user-query").value = txt;
}

function handleExecuteBedrockQuery() {
  const query = document.getElementById("bedrock-user-query").value.trim();
  if (!query) return;

  const chat = document.getElementById("bedrock-chat-container");
  chat.innerHTML += `<div class="text-indigo-300 font-semibold mt-2">> Query: ${query}</div>`;
  document.getElementById("bedrock-user-query").value = "";

  let result = "";
  const qLower = query.toLowerCase();

  if (qLower.includes("fee") || qLower.includes("due")) {
    const unpaids = students.filter(s => s.feeStatus !== "PAID");
    result = `[Bedrock RAG]: Found ${unpaids.length} student(s) with pending dues: ` +
      unpaids.map(u => `${u.name} (${u.grade}) - ₹${u.monthlyFee}`).join("; ");
  } else if (qLower.includes("absent")) {
    const abs = students.filter(s => s.attendanceToday === "ABSENT");
    result = `[Bedrock RAG]: ${abs.length} student(s) absent today: ` +
      (abs.length > 0 ? abs.map(a => `${a.name} (${a.grade})`).join(", ") : "All students present.");
  } else {
    result = `[Bedrock RAG]: Total active students: ${students.length}. Total staff: ${faculty.length}. All records synchronized with DynamoDB table.`;
  }

  setTimeout(() => {
    chat.innerHTML += `<div class="text-emerald-400 mt-1">${result}</div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 300);
}

/* =========================================================================
   5. DIRECTOR DESK
   ========================================================================= */
function renderDirectorWorkspace() {
  updateDirectorBadge();
  renderDirectorQueue();
  renderDirectorStudentsTable();
  renderFacultyDailyList();
  renderDirectorFeesTable();
  renderFinancesAndPayroll();
}

function updateDirectorBadge() {
  const c = directorOutboundQueue.length;
  document.getElementById("director-pending-badge").textContent = c;
  document.getElementById("dtab-approvals-count").textContent = c;
}

function setQueueFilter(cat) {
  activeQueueCategory = cat;
  renderDirectorQueue();
}

function renderDirectorQueue() {
  const cont = document.getElementById("director-queue-cards");
  cont.innerHTML = "";
  let list = activeQueueCategory === "ALL" ? directorOutboundQueue : directorOutboundQueue.filter(item => item.type === activeQueueCategory);

  if (list.length === 0) {
    cont.innerHTML = `<div class="p-6 text-center bg-white rounded-xl border border-slate-200 text-slate-400">No alerts in this queue.</div>`;
    return;
  }

  list.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs";
    div.innerHTML = `
      <div class="space-y-1 flex-1">
        <span class="font-bold text-slate-900">${item.studentName} (${item.grade})</span>
        <p class="text-slate-600 bg-slate-50 p-2 rounded">${item.message}</p>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="dispatchAlert(${idx})" class="px-3 py-1.5 bg-emerald-600 text-white rounded font-semibold">Send WhatsApp</button>
        <button onclick="dismissAlert(${idx})" class="px-2 py-1 text-slate-500">Dismiss</button>
      </div>`;
    cont.appendChild(div);
  });
}

function dispatchAlert(idx) {
  const item = directorOutboundQueue[idx];
  window.open(`https://wa.me/91${item.recipient}?text=${encodeURIComponent(item.message)}`, '_blank');
  directorOutboundQueue.splice(idx, 1);
  updateDirectorBadge();
  renderDirectorQueue();
}

function dismissAlert(idx) {
  directorOutboundQueue.splice(idx, 1);
  updateDirectorBadge();
  renderDirectorQueue();
}

function dispatchAllFilteredAlerts() {
  if (directorOutboundQueue.length > 0) dispatchAlert(0);
}

function switchFacultySubTab(type) {
  activeFacultySubTabType = type;
  document.getElementById("fsubtab-tutors").className = type === "Tutor" ? "px-3 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold" : "px-3 py-1 rounded-md text-slate-600";
  document.getElementById("fsubtab-teachers").className = type === "Teacher" ? "px-3 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold" : "px-3 py-1 rounded-md text-slate-600";
  renderFacultyDailyList();
}

function renderFacultyDailyList() {
  const cont = document.getElementById("director-faculty-cards-list");
  cont.innerHTML = "";
  document.getElementById("count-faculty-tutors").textContent = faculty.filter(f => f.role === "Tutor").length;
  document.getElementById("count-faculty-teachers").textContent = faculty.filter(f => f.role === "Teacher").length;

  faculty.filter(f => f.role === activeFacultySubTabType).forEach(staff => {
    const isP = staff.todayAttendance === "PRESENT";
    const div = document.createElement("div");
    div.className = "p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs";
    div.innerHTML = `
      <div><span class="font-bold text-slate-900">${staff.name}</span><p class="text-slate-500 text-[11px]">${staff.duty}</p></div>
      <div class="inline-flex rounded-lg border p-0.5 bg-white">
        <button onclick="setStaffStatus('${staff.id}', 'PRESENT')" class="px-2.5 py-1 rounded ${isP ? 'bg-emerald-600 text-white' : 'text-slate-600'}">P</button>
        <button onclick="setStaffStatus('${staff.id}', 'ABSENT')" class="px-2.5 py-1 rounded ${!isP ? 'bg-rose-600 text-white' : 'text-slate-600'}">A</button>
      </div>`;
    cont.appendChild(div);
  });
}

function setStaffStatus(id, val) {
  const f = faculty.find(fac => fac.id === id);
  if (f) { f.todayAttendance = val; renderFacultyDailyList(); renderFinancesAndPayroll(); }
}

function openFacultyCalendarAudit() {}
function closeFacultyCalendarAudit() {}

function renderDirectorStudentsTable() {
  const tbody = document.getElementById("director-students-table-body");
  tbody.innerHTML = "";
  document.getElementById("dtab-total-enrolled").textContent = students.length;

  students.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-3 font-bold text-indigo-700 cursor-pointer" onclick="openStudentModal('${s.id}')">${s.name}</td>
      <td class="p-3">${s.grade}</td>
      <td class="p-3 font-mono"><a href="tel:${s.primaryNumber}">${s.primaryNumber}</a></td>
      <td class="p-3 font-mono text-[11px]">${s.admissionDate}</td>
      <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.attendanceToday === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.attendanceToday}</span></td>
      <td class="p-3 text-center"><button onclick="openDateRangePdfModal('${s.id}')" class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">PDF</button></td>
      <td class="p-3 text-right"><button onclick="openStudentModal('${s.id}')" class="px-2 py-1 bg-slate-100 rounded text-xs">Inspect</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderDirectorFeesTable() {
  const tbody = document.getElementById("director-fees-table-body");
  tbody.innerHTML = "";
  students.forEach(s => {
    const isPaid = s.feeStatus === "PAID";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-3 font-bold">${s.name}</td>
      <td class="p-3 font-mono">${s.primaryNumber}</td>
      <td class="p-3 font-mono font-bold">₹${s.monthlyFee}</td>
      <td class="p-3 font-mono text-[11px]">${s.nextDueDate}</td>
      <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.feeStatus}</span></td>
      <td class="p-3 text-center"><button onclick="toggleFee('${s.id}')" class="px-2 py-1 border rounded text-xs">${isPaid ? 'Mark Due' : 'Mark Paid'}</button></td>
      <td class="p-3 text-right">${!isPaid ? `<button onclick="queueFeeReminder('${s.id}')" class="px-2 py-1 bg-rose-600 text-white rounded text-xs">Queue WhatsApp</button>` : '<span class="text-slate-400 text-xs">Cleared</span>'}</td>`;
    tbody.appendChild(tr);
  });
}

function toggleFee(id) {
  const s = students.find(st => st.id === id);
  if (s) { s.feeStatus = s.feeStatus === "PAID" ? "UNPAID" : "PAID"; renderDirectorFeesTable(); renderFinancesAndPayroll(); }
}

function queueFeeReminder(id) {
  const s = students.find(st => st.id === id);
  directorOutboundQueue.unshift({ id: `Q-${Date.now()}`, type: "FEE_REMINDER", studentId: s.id, studentName: s.name, grade: s.grade, recipient: s.primaryNumber, message: `Fee due reminder for ${s.name}: ₹${s.monthlyFee}` });
  updateDirectorBadge();
  showToast(`Reminder queued for ${s.name}`);
}

function queueFeeRemindersForFilteredClass() {
  students.filter(s => s.feeStatus !== "PAID").forEach(s => queueFeeReminder(s.id));
}

function renderFinancesAndPayroll() {
  let col = 0, pay = 0, exp = 0;
  students.filter(s => s.feeStatus === "PAID").forEach(s => col += s.monthlyFee);
  faculty.forEach(f => pay += f.salary);
  tuitionExpenses.forEach(e => exp += e.amount);

  document.getElementById("fin-total-collected").textContent = `₹${col.toLocaleString('en-IN')}`;
  document.getElementById("fin-faculty-payroll").textContent = `₹${pay.toLocaleString('en-IN')}`;
  document.getElementById("fin-monthly-expenses").textContent = `₹${exp.toLocaleString('en-IN')}`;
  document.getElementById("fin-net-profit").textContent = `₹${(col - (pay + exp)).toLocaleString('en-IN')}`;

  const tbody = document.getElementById("director-payroll-table-body");
  tbody.innerHTML = "";
  faculty.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="p-3 font-bold">${f.name}</td><td class="p-3 font-mono">₹${f.salary}</td><td class="p-3">${f.absences.length} Days</td><td class="p-3 text-center">Approved</td><td class="p-3 font-mono font-bold">₹${f.salary}</td><td class="p-3 text-right"><button class="text-indigo-600 text-xs">Edit</button></td>`;
    tbody.appendChild(tr);
  });
}

function promptRecordFacultyExpense() {
  const t = prompt("Expense Title:");
  const a = parseInt(prompt("Amount (₹):", "1000")) || 0;
  if (t && a > 0) { tuitionExpenses.push({ id: `EXP-${Date.now()}`, title: t, amount: a, date: "2026-10-01" }); renderFinancesAndPayroll(); }
}

/* =========================================================================
   6. TUTOR & TEACHER DESKS
   ========================================================================= */
function setFloorViewMode(m) { activeFloorFilter = m; renderTutorCards(); }

function renderTutorCards() {
  const cont = document.getElementById("tutor-students-cards-container");
  cont.innerHTML = "";
  let list = students.filter(s => s.status === "ACTIVE");
  if (activeFloorFilter === "PRESENT") list = list.filter(s => s.attendanceToday === "PRESENT");
  if (activeFloorFilter === "ABSENT") list = list.filter(s => s.attendanceToday === "ABSENT");

  document.getElementById("stat-tutor-present").textContent = students.filter(s => s.attendanceToday === "PRESENT").length;
  document.getElementById("stat-tutor-absent").textContent = students.filter(s => s.attendanceToday === "ABSENT").length;
  document.getElementById("count-present-badge").textContent = document.getElementById("stat-tutor-present").textContent;
  document.getElementById("count-absent-badge").textContent = document.getElementById("stat-tutor-absent").textContent;

  list.forEach(s => {
    const isP = s.attendanceToday === "PRESENT";
    const card = document.createElement("div");
    card.className = "p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs";
    card.innerHTML = `
      <div><span class="font-bold text-slate-900 cursor-pointer" onclick="openStudentModal('${s.id}')">${s.name} (${s.grade})</span><p class="text-slate-400 text-[11px]">${s.schoolName}</p></div>
      <div class="flex items-center space-x-1.5">
        <button onclick="toggleAttendance('${s.id}', 'PRESENT')" class="px-2.5 py-1 rounded font-bold ${isP ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}">P</button>
        <button onclick="toggleAttendance('${s.id}', 'ABSENT')" class="px-2.5 py-1 rounded font-bold ${!isP ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}">A</button>
        <button onclick="openStudentModal('${s.id}')" class="px-2.5 py-1 border rounded">Dossier</button>
      </div>`;
    cont.appendChild(card);
  });
}

function toggleAttendance(id, val) {
  const s = students.find(st => st.id === id);
  if (s) { s.attendanceToday = val; renderTutorCards(); showToast(`${s.name} marked ${val}`); }
}

function queueAllAbsenteesToDirector() {
  students.filter(s => s.attendanceToday === "ABSENT").forEach(s => {
    directorOutboundQueue.unshift({ id: `Q-${Date.now()}-${s.id}`, type: "ABSENT", studentId: s.id, studentName: s.name, grade: s.grade, recipient: s.primaryNumber, message: `Absence notice for ${s.name}` });
  });
  updateDirectorBadge();
  showToast("Absentees queued to Director Alerts");
}

function renderTeacherConsole() {
  const sel = document.getElementById("teacher-doubt-student-select");
  sel.innerHTML = "";
  students.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
  document.getElementById("teacher-students-list").innerHTML = students.map(s => `<div class="p-3 flex justify-between"><span>${s.name} (${s.grade})</span><button onclick="openStudentModal('${s.id}')" class="px-2 py-1 border rounded text-xs">Inspect</button></div>`).join("");
}

function updateTeacherDoubtChapters() {}
function updateTeacherDoubtTopics() {}
function handleTeacherLogDoubt() { showToast("Doubt verified."); }

/* =========================================================================
   7. STUDENT DOSSIER MODAL
   ========================================================================= */
function openStudentModal(id) {
  activeStudentId = id;
  const s = students.find(st => st.id === id);
  document.getElementById("modal-student-name").textContent = s.name;
  document.getElementById("modal-student-badge").textContent = `${s.grade} (${s.curriculum})`;
  document.getElementById("modal-student-school").textContent = `${s.schoolName} (${s.area})`;
  document.getElementById("modal-primary-phone").textContent = s.primaryNumber;
  document.getElementById("modal-primary-phone").href = `tel:${s.primaryNumber}`;
  
  renderModalSubjectButtons(s);
  renderModalSlipTests();
  renderStudentAttendanceCalendar();
  switchStudentDossierTab('syllabus');
  document.getElementById("student-modal").classList.remove("hidden");
}

function closeStudentModal() { document.getElementById("student-modal").classList.add("hidden"); }

function switchStudentDossierTab(tab) {
  ['syllabus', 'slip-test', 'exams', 'sunday-test', 'attendance', 'discipline'].forEach(t => {
    const p = document.getElementById(`mdpanel-${t}`);
    const b = document.getElementById(`mdtab-${t}`);
    if (p) p.classList.toggle("hidden", t !== tab);
    if (b) b.className = (t === tab)
      ? "py-2 px-3 text-indigo-700 border-b-2 border-indigo-700 whitespace-nowrap font-bold"
      : "py-2 px-3 text-slate-500 hover:text-slate-800 whitespace-nowrap";
  });
}

function renderModalSubjectButtons(s) {
  const cont = document.getElementById("modal-subject-buttons");
  cont.innerHTML = "";
  s.syllabus.forEach((sub, i) => {
    cont.innerHTML += `<button onclick="currentSelectedSubjectIdx=${i}; renderModalChapterButtons(students.find(st=>st.id===activeStudentId))" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${i===currentSelectedSubjectIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}">${sub.name}</button>`;
  });
  renderModalChapterButtons(s);
}

function renderModalChapterButtons(s) {
  const cont = document.getElementById("modal-chapter-buttons");
  cont.innerHTML = "";
  const sub = s.syllabus[currentSelectedSubjectIdx];
  if (sub && sub.chapters) {
    sub.chapters.forEach((ch, i) => {
      cont.innerHTML += `<button onclick="currentSelectedChapterIdx=${i}; renderModalTopics(students.find(st=>st.id===activeStudentId))" class="px-3 py-1 rounded text-xs border ${i===currentSelectedChapterIdx ? 'border-indigo-600 bg-indigo-50 font-bold' : 'bg-white'}">${ch.title}</button>`;
    });
  }
  renderModalTopics(s);
}

function renderModalTopics(s) {
  const cont = document.getElementById("modal-topics-list");
  cont.innerHTML = "";
  const ch = s.syllabus[currentSelectedSubjectIdx]?.chapters[currentSelectedChapterIdx];
  if (ch && ch.topics) {
    ch.topics.forEach((t, i) => {
      cont.innerHTML += `<div class="p-2.5 bg-slate-50 border rounded-lg flex justify-between"><span>${t.name}</span><span class="font-bold font-mono text-indigo-700">${t.confidence}%</span></div>`;
    });
  }
}

function promptAddNewSubject() { const n = prompt("Subject:"); if (n) { students.find(st => st.id === activeStudentId).syllabus.push({ name: n, chapters: [] }); renderModalSubjectButtons(students.find(st => st.id === activeStudentId)); } }
function promptAddNewChapter() { const n = prompt("Chapter:"); if (n) { students.find(st => st.id === activeStudentId).syllabus[currentSelectedSubjectIdx].chapters.push({ title: n, completion: 0, topics: [] }); renderModalChapterButtons(students.find(st => st.id === activeStudentId)); } }
function promptAddNewTopic() { const n = prompt("Topic:"); if (n) { students.find(st => st.id === activeStudentId).syllabus[currentSelectedSubjectIdx].chapters[currentSelectedChapterIdx].topics.push({ id: `T-${Date.now()}`, name: n, confidence: 50 }); renderModalTopics(students.find(st => st.id === activeStudentId)); } }

function renderModalSlipTests() {
  const s = students.find(st => st.id === activeStudentId);
  document.getElementById("modal-slip-history-list").innerHTML = s.slipTests.map(t => `<div class="p-2.5 bg-slate-50 border rounded-lg flex justify-between"><span>${t.subject} - ${t.topic}</span><span class="font-bold font-mono text-indigo-700">${t.score}</span></div>`).join("");
}

function updateSlipChapterDropdown() {}
function updateSlipTopicDropdown() {}
function handleSlipPhotosSelected() {}

function handleSaveSlipTest(e) {
  e.preventDefault();
  const s = students.find(st => st.id === activeStudentId);
  const sc = document.getElementById("slip-score-scored").value;
  const tot = document.getElementById("slip-score-total").value;
  const rem = document.getElementById("slip-remarks").value;
  s.slipTests.unshift({ id: `ST-${Date.now()}`, date: "2026-10-01", subject: "Maths", chapter: "Unit 1", topic: "Basics", evaluator: "Tutor", score: `${sc}/${tot}`, remarks: rem, photos: [] });
  renderModalSlipTests();
  showToast("Test logged");
  e.target.reset();
}

function queueSlipTestToDirector() { showToast("Slip test queued to Alerts"); }
function promptScheduleNewExam() {}
function promptLogExamResult() {}
function renderSundayGrandTestView() {}
function promptLogGrandSundayScore() {}

function renderStudentAttendanceCalendar() {
  const grid = document.getElementById("calendar-days-grid");
  grid.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const isSun = (i % 7 === 0);
    grid.innerHTML += `<div class="p-1 rounded text-center border font-mono text-[10px] ${isSun ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}"><span>${i}</span><span class="block text-[8px]">${isSun ? 'HOL' : 'P'}</span></div>`;
  }
}

function selectIncidentTag(r) { document.getElementById("incident-category-input").value = r; }
function handleLogMisbehavior(e) { e.preventDefault(); showToast("Incident escalated to Director queue"); closeStudentModal(); }

/* =========================================================================
   8. ENROLLMENT & PDF EXPORT
   ========================================================================= */
function openEnrollStudentModal() { document.getElementById("enroll-modal").classList.remove("hidden"); }
function closeEnrollModal() { document.getElementById("enroll-modal").classList.add("hidden"); }
function adaptCurriculumOptions() {
  document.getElementById("enroll-curriculum").innerHTML = "<option>SSC (State Board)</option><option>CBSE</option><option>JEE Mains / IPE</option>";
}

function handleEnrollStudent(e) {
  e.preventDefault();
  const name = document.getElementById("enroll-name").value;
  const grade = document.getElementById("enroll-class").value;
  const phone = document.getElementById("enroll-father-phone").value;
  students.unshift({
    id: `STU-00${students.length + 1}`,
    name, grade, curriculum: "SSC", schoolName: "Local School", area: "City",
    primaryNumber: phone, primaryRole: "Father", monthlyFee: 1500, feeStatus: "UNPAID",
    admissionDate: "2026-10-01", nextDueDate: "2026-11-01", attendanceToday: "PRESENT",
    status: "ACTIVE", syllabus: [], slipTests: [], examSchedules: [], examResults: []
  });
  renderDirectorStudentsTable();
  renderTutorCards();
  closeEnrollModal();
  showToast(`Enrolled ${name}`);
  e.target.reset();
}

function openDateRangePdfModal(id) { activeStudentId = id; document.getElementById("date-range-pdf-modal").classList.remove("hidden"); }
function closeDateRangePdfModal() { document.getElementById("date-range-pdf-modal").classList.add("hidden"); }

function executeDateRangePdfExport() {
  closeDateRangePdfModal();
  const el = document.getElementById("printable-dossier");
  el.classList.remove("hidden");
  showToast("Compiling PDF...");
  html2pdf().from(el).save().then(() => {
    el.classList.add("hidden");
    showToast("PDF downloaded");
  });
}

function openStaffAuthorizationModal() { document.getElementById("cognito-auth-modal").classList.remove("hidden"); }
function closeStaffAuthorizationModal() { document.getElementById("cognito-auth-modal").classList.add("hidden"); }
function handleDirectorIssueCredentials(e) { e.preventDefault(); showToast("Credentials issued"); closeStaffAuthorizationModal(); }

/* =========================================================================
   9. INITIALIZATION
   ========================================================================= */
window.onload = function() {
  switchSystemRole('director');
  updateDirectorBadge();
  renderFacultyDailyList();
};