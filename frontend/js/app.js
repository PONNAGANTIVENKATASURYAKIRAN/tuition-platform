/* =========================================================================
   1. DATA ENGINE (MODELS, REAL-TIME STATE & DUAL-DIRECTOR SYSTEM)
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

// Faculty Registry
let faculty = [
  { 
    id: "TUT-1", 
    name: "Srinivas", 
    role: "Tutor", 
    subject: "Class 9 & 10 Supervision", 
    phone: "9848055667", 
    salary: 11000, 
    duty: "Class 10 & 9 Batch",
    todayAttendance: "PRESENT",
    absences: []
  },
  { 
    id: "TUT-2", 
    name: "Kavitha", 
    role: "Tutor", 
    subject: "Intermediate / Coding", 
    phone: "9848066778", 
    salary: 12500, 
    duty: "Inter 1st/2nd Yr & B.Tech Batches",
    todayAttendance: "ABSENT",
    absences: [
      { date: "2026-09-24", reason: "Practical Exam Supervision (Prior Permission)", excused: true }
    ]
  },
  { 
    id: "FAC-1", 
    name: "Mr. K. V. Sharma", 
    role: "Teacher", 
    subject: "Senior Mathematics", 
    phone: "9848011223", 
    salary: 15000, 
    duty: "Class 10 & 9 Advanced Maths",
    todayAttendance: "PRESENT",
    absences: [
      { date: "2026-09-12", reason: "Family Event (Prior Permission)", excused: true }
    ]
  },
  { 
    id: "FAC-2", 
    name: "Dr. P. Anuradha", 
    role: "Teacher", 
    subject: "Science & Physics", 
    phone: "9848022334", 
    salary: 14500, 
    duty: "Class 8-10 Science Concepts",
    todayAttendance: "PRESENT",
    absences: []
  },
  { 
    id: "FAC-3", 
    name: "Mrs. S. Madhavi", 
    role: "Teacher", 
    subject: "Social & English", 
    phone: "9848033445", 
    salary: 12000, 
    duty: "Social Studies & Grammar",
    todayAttendance: "ABSENT",
    absences: [
      { date: "2026-09-08", reason: "Emergency Medical (Morning Call)", excused: false },
      { date: "2026-09-18", reason: "Official Work (Permission)", excused: true }
    ]
  }
];

let pendingCognitoUsers = [
  { id: "COG-1", name: "R. Naresh", role: "Tutor", email: "naresh.tutor@tuition.internal", requestedDate: "2026-09-30", status: "PENDING_DIRECTOR_APPROVAL" }
];

let tuitionExpenses = [
  { id: "EXP-1", title: "Campus Electricity & Air Cooling", amount: 3500, date: "2026-09-10" },
  { id: "EXP-2", title: "Slip Test Printing & Paper Bundles", amount: 1200, date: "2026-09-15" },
  { id: "EXP-3", title: "High-Speed Internet for Coding Sessions", amount: 800, date: "2026-09-02" }
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
    feePaidDate: "2026-09-10",
    attendanceToday: "PRESENT",
    lastUpdatedBy: "Srinivas at 5:02 PM",
    status: "ACTIVE",
    leftDate: null,
    examSchedules: [
      { name: "Mathematics Midterm", date: "2026-10-05", daysLeft: 4, type: "School Exam" },
      { name: "Science Quarterly", date: "2026-10-08", daysLeft: 7, type: "Board Unit" }
    ],
    examResults: [
      { name: "Unit Test 1 (Maths)", subject: "Mathematics", scored: 22, max: 25, percentage: 88, delta: "+8% Improvement" },
      { name: "Unit Test 2 (Maths)", subject: "Mathematics", scored: 24, max: 25, percentage: 96, delta: "+8% Improvement" }
    ],
    syllabus: [
      {
        name: "Mathematics",
        chapters: [
          {
            title: "Quadratic Equations",
            completion: 75,
            topics: [
              { id: "T1", name: "Standard Form & Factorization", confidence: 100, tested: true, score: "9/10" },
              { id: "T2", name: "Completing the Square Method", confidence: 50, tested: false, score: "Practice Needed" },
              { id: "T3", name: "Nature of Roots & Discriminant", confidence: 100, tested: true, score: "10/10" }
            ]
          },
          {
            title: "Trigonometry",
            completion: 50,
            topics: [
              { id: "T4", name: "Trigonometric Ratios & Tables", confidence: 75, tested: true, score: "18/20" },
              { id: "T5", name: "Trigonometric Identities", confidence: 25, tested: false, score: "In Progress" }
            ]
          }
        ]
      },
      {
        name: "Science",
        chapters: [
          {
            title: "Carbon and its Compounds",
            completion: 50,
            topics: [
              { id: "T6", name: "Covalent Bonding in Carbon", confidence: 100, tested: true, score: "5/5" },
              { id: "T7", name: "Versatile Nature & Homologous Series", confidence: 75, tested: false, score: "Review Pending" }
            ]
          }
        ]
      }
    ],
    slipTests: [
      {
        id: "ST-1",
        date: "2026-09-24",
        subject: "Mathematics",
        chapter: "Trigonometry",
        topic: "Trigonometric Ratios & Tables",
        evaluator: "Mr. K. V. Sharma",
        score: "18/20",
        remarks: "Trigonometric ratios solved rapidly. Calculation accuracy is solid.",
        photos: ["https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&auto=format&fit=crop&q=80"]
      }
    ],
    doubtsHistory: [
      { date: "2026-09-25", teacher: "Mr. K. V. Sharma", topic: "Quadratic Formula Discriminant", notes: "Cleared sign errors in negative square roots." }
    ],
    attendanceHistory: {
      "2026-09": {
        totalDays: 30,
        presentDays: 22,
        absentDays: 2,
        holidays: 6,
        records: { "2026-09-02": "A", "2026-09-15": "A" }
      }
    }
  },
  {
    id: "STU-002",
    name: "K. Bhavya",
    schoolName: "Oxford Grammar School",
    area: "Chandramouli Nagar",
    grade: "Class 9",
    curriculum: "CBSE",
    scope: "All Subjects (Regular Program)",
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
    feePaidDate: "-",
    attendanceToday: "ABSENT",
    lastUpdatedBy: "Srinivas at 5:10 PM",
    status: "ACTIVE",
    leftDate: null,
    examSchedules: [{ name: "CBSE Linear Equations Test", date: "2026-10-06", daysLeft: 5, type: "Class Test" }],
    examResults: [],
    syllabus: [
      {
        name: "Mathematics",
        chapters: [{ title: "Linear Equations in Two Variables", completion: 50, topics: [{ id: "TB1", name: "Graphing Solutions", confidence: 75, tested: false, score: "Practice Needed" }] }]
      }
    ],
    slipTests: [],
    doubtsHistory: [],
    attendanceHistory: {
      "2026-09": { totalDays: 30, presentDays: 20, absentDays: 4, holidays: 6, records: { "2026-09-10": "A", "2026-09-16": "A", "2026-09-20": "A", "2026-09-24": "A" } }
    }
  },
  {
    id: "STU-003",
    name: "P. Harshavardhan",
    schoolName: "Sri Chaitanya Junior College",
    area: "Arundelpet",
    grade: "Inter 2nd Year",
    curriculum: "JEE Mains / IPE",
    scope: "Maths & Physics Special",
    admissionDate: "2026-06-01",
    nextDueDate: "2026-10-01",
    fatherName: "P. Venkateswara Rao",
    fatherPhone: "9440123456",
    motherName: "P. Padmavathi",
    motherPhone: "9440654321",
    primaryNumber: "9440123456",
    primaryRole: "Father",
    monthlyFee: 2200,
    feeStatus: "PAID",
    feePaidDate: "2026-09-02",
    attendanceToday: "PRESENT",
    lastUpdatedBy: "Kavitha at 5:04 PM",
    status: "ACTIVE",
    leftDate: null,
    examSchedules: [],
    examResults: [],
    syllabus: [
      {
        name: "Mathematics",
        chapters: [{ title: "Calculus & Integrals", completion: 75, topics: [{ id: "TH1", name: "Definite Integrals by Substitution", confidence: 75, tested: true, score: "18/20" }] }]
      }
    ],
    slipTests: [],
    doubtsHistory: [],
    attendanceHistory: { "2026-09": { totalDays: 30, presentDays: 24, absentDays: 0, holidays: 6, records: {} } }
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
    recipientRole: "Father (K. Prasad)",
    queuedBy: "Srinivas (Class 9 & 10 Batch)",
    time: "5:15 PM",
    message: "*KRISHNA TUITION INSTITUTIONS - ATTENDANCE INTIMATION*\nStudent: K. Bhavya (Class 9)\n\nRespected Parents, warm greetings from Krishna Tuition Institutions.\nWe noticed that your ward has not reached our tuition session today.\nIf they started from home, please contact Director office at 8008717360.\n\nWith warm regards,\nOffice of the Director\nKrishna Tuition Institutions"
  }
];

/* =========================================================================
   2. UI & MODAL HELPERS
   ========================================================================= */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const label = document.getElementById("toast-msg");
  const icon = document.getElementById("toast-icon");
  label.textContent = message;
  icon.className = type === "error" ? "fa-solid fa-circle-exclamation text-rose-400" : (type === "info" ? "fa-solid fa-circle-info text-indigo-400" : "fa-solid fa-circle-check text-emerald-400");
  toast.classList.remove("translate-y-24", "opacity-0");
  setTimeout(() => toast.classList.add("translate-y-24", "opacity-0"), 3000);
}

function showCustomConfirm(title, description) {
  return new Promise((resolve) => {
    document.getElementById("confirm-modal-title").textContent = title;
    document.getElementById("confirm-modal-desc").textContent = description;
    document.getElementById("custom-confirm-modal").classList.remove("hidden");
    customConfirmResolver = resolve;
  });
}

function resolveCustomConfirm(result) {
  document.getElementById("custom-confirm-modal").classList.add("hidden");
  if (customConfirmResolver) { customConfirmResolver(result); customConfirmResolver = null; }
}

function toggleAwsArchitectureModal() { document.getElementById("aws-architecture-modal").classList.toggle("hidden"); }
function toggleBedrockAiModal() { document.getElementById("bedrock-ai-modal").classList.toggle("hidden"); }
function openPhotoLightbox(url, title) {
  document.getElementById("lightbox-img").src = url;
  document.getElementById("lightbox-title").textContent = title;
  document.getElementById("photo-lightbox-modal").classList.remove("hidden");
}
function closePhotoLightbox() { document.getElementById("photo-lightbox-modal").classList.add("hidden"); }

/* =========================================================================
   3. ROLE SWITCHING & DISPATCHER
   ========================================================================= */
function updateActiveDirectorSender() {
  const val = document.getElementById("active-director-sender-select").value;
  const [phone, title] = val.split("|");
  activeDirectorPhone = phone;
  activeDirectorTitle = title;
  showToast(`Active sender set to ${title} (${phone})`);
  renderDirectorQueue();
}

function switchSystemRole(role) {
  activeRole = role;
  document.getElementById("workspace-tutor").classList.toggle("hidden", role !== "tutor");
  document.getElementById("workspace-teacher").classList.toggle("hidden", role !== "teacher");
  document.getElementById("workspace-director").classList.toggle("hidden", role !== "director");

  ['director', 'tutor', 'teacher'].forEach(r => {
    const b = document.getElementById(`role-btn-${r}`);
    b.className = (r === role) ? "px-2.5 sm:px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-xs transition flex items-center space-x-1" : "px-2.5 sm:px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center space-x-1";
  });

  if (role === "tutor") renderTutorCards();
  else if (role === "teacher") renderTeacherConsole();
  else renderDirectorWorkspace();
}

function directorStepInAsFloorTutor() {
  switchSystemRole('tutor');
  document.getElementById("active-floor-tutor-select").value = "DIR-1|Director Sir|Director Floor Override";
  renderTutorCards();
  showToast("Director Floor Step-In mode activated.", "info");
}

function switchDirectorTab(tab) {
  activeDirectorTabId = tab;
  ['approvals', 'students', 'faculty-management', 'fees', 'finances'].forEach(t => {
    const p = document.getElementById(`dpanel-${t}`);
    const b = document.getElementById(`dtab-${t}`);
    if (p) p.classList.toggle("hidden", t !== tab);
    if (b) b.className = (t === tab) ? "px-3 py-2 rounded-t-lg bg-white border-t-2 border-indigo-600 text-indigo-700 font-bold whitespace-nowrap flex items-center space-x-1.5" : "px-3 py-2 text-slate-500 hover:text-slate-800 whitespace-nowrap flex items-center space-x-1.5";
  });

  if (tab === "approvals") renderDirectorQueue();
  if (tab === "students") renderDirectorStudentsTable();
  if (tab === "faculty-management") renderFacultyDailyList();
  if (tab === "fees") renderDirectorFeesTable();
  if (tab === "finances") renderFinancesAndPayroll();
}

/* =========================================================================
   4. AWS BEDROCK RAG ENGINE (DYNAMIC LOCAL GROUNDING)
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

  if (qLower.includes("fee") || qLower.includes("balance") || qLower.includes("due")) {
    const unpaids = students.filter(s => s.feeStatus !== "PAID");
    result = `[Bedrock RAG Grounded Answer]: Found ${unpaids.length} student(s) with pending fees: ` +
      unpaids.map(u => `${u.name} (${u.grade}) - ₹${u.monthlyFee} Due`).join("; ");
  } else if (qLower.includes("absent") || qLower.includes("attendance")) {
    const abs = students.filter(s => s.attendanceToday === "ABSENT");
    result = `[Bedrock RAG Grounded Answer]: Today's Attendance Check: ${students.length - abs.length} Present, ${abs.length} Absent. Absent student(s): ` +
      (abs.length > 0 ? abs.map(a => `${a.name} (${a.grade})`).join(", ") : "None. All students present.");
  } else if (qLower.includes("math") || qLower.includes("quadratic")) {
    result = `[Bedrock RAG Grounded Answer]: Syllabus inspect for STU-001 (M. Sai Tarun): Quadratic Equations is at 75% completion. Topic 'Completing Square' has 50% confidence. Slip test score: 9/10 on Standard Form.`;
  } else {
    result = `[Bedrock RAG Grounded Answer]: Found ${students.length} enrolled students across SSC, CBSE, and JEE streams. Active faculty: ${faculty.length} tutors/teachers. Total fee revenue collected: ₹${students.filter(s => s.feeStatus === 'PAID').reduce((acc, c) => acc + c.monthlyFee, 0)}.`;
  }

  setTimeout(() => {
    chat.innerHTML += `<div class="text-emerald-400 mt-1">${result}</div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 400);
}

/* =========================================================================
   5. COGNITO AUTHORIZATION MODAL LOGIC
   ========================================================================= */
function openStaffAuthorizationModal() {
  const sel = document.getElementById("cognito-target-staff-select");
  sel.innerHTML = "";
  faculty.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = `${f.name} (${f.role} - ${f.subject})`;
    sel.appendChild(opt);
  });

  const list = document.getElementById("cognito-pending-users-list");
  list.innerHTML = "";
  if (pendingCognitoUsers.length === 0) {
    list.innerHTML = `<span class="text-[11px] text-slate-400 italic">No pending signups.</span>`;
  } else {
    pendingCognitoUsers.forEach((u, i) => {
      list.innerHTML += `
        <div class="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
          <div><span class="font-bold text-slate-900">${u.name}</span> <span class="text-slate-500">(${u.email})</span></div>
          <button onclick="approveCognitoUser(${i})" class="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold">Approve</button>
        </div>`;
    });
  }
  document.getElementById("cognito-auth-modal").classList.remove("hidden");
}

function closeStaffAuthorizationModal() {
  document.getElementById("cognito-auth-modal").classList.add("hidden");
}

function approveCognitoUser(idx) {
  const u = pendingCognitoUsers[idx];
  faculty.push({
    id: `TUT-${Date.now()}`,
    name: u.name,
    role: u.role,
    subject: "Tuition Supervision",
    phone: "9848099999",
    salary: 11000,
    duty: "Floor Batches",
    todayAttendance: "PRESENT",
    absences: []
  });
  pendingCognitoUsers.splice(idx, 1);
  openStaffAuthorizationModal();
  renderFacultyDailyList();
  showToast(`Authorized ${u.name} into AWS Cognito active group.`);
}

function handleDirectorIssueCredentials(e) {
  e.preventDefault();
  const staffId = document.getElementById("cognito-target-staff-select").value;
  const f = faculty.find(fac => fac.id === staffId);
  showToast(`Cognito credentials updated for ${f.name}. Director informed.`);
  closeStaffAuthorizationModal();
}

/* =========================================================================
   6. DIRECTOR DESK RENDERING (STUDENTS, FACULTY, FEES, FINANCES)
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
  const count = directorOutboundQueue.length;
  document.getElementById("director-pending-badge").textContent = count;
  document.getElementById("dtab-approvals-count").textContent = count;
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
    cont.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">No pending messages in queue.</div>`;
    return;
  }

  list.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs";
    card.innerHTML = `
      <div class="space-y-1 flex-1">
        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">${item.type}</span>
          <span class="font-bold text-slate-900">${item.studentName} (${item.grade})</span>
          <span class="text-slate-400 font-mono text-[11px]">${item.time}</span>
        </div>
        <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] whitespace-pre-wrap">${item.message}</div>
      </div>
      <div class="flex items-center space-x-2 shrink-0">
        <button onclick="approveAndDispatchWhatsApp(${idx})" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-1">
          <i class="fa-brands fa-whatsapp text-sm"></i><span>Send (${activeDirectorTitle})</span>
        </button>
        <button onclick="dismissQueueItem(${idx})" class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs">Dismiss</button>
      </div>`;
    cont.appendChild(card);
  });
}

function approveAndDispatchWhatsApp(idx) {
  const item = directorOutboundQueue[idx];
  if (!item) return;
  window.open(`https://wa.me/91${item.recipient}?text=${encodeURIComponent(item.message)}`, '_blank');
  directorOutboundQueue.splice(idx, 1);
  updateDirectorBadge();
  renderDirectorQueue();
  showToast(`WhatsApp intimation dispatched.`);
}

function dismissQueueItem(idx) {
  directorOutboundQueue.splice(idx, 1);
  updateDirectorBadge();
  renderDirectorQueue();
}

function dispatchAllFilteredAlerts() {
  if (directorOutboundQueue.length > 0) approveAndDispatchWhatsApp(0);
}

function switchFacultySubTab(type) {
  activeFacultySubTabType = type;
  document.getElementById("fsubtab-tutors").className = type === "Tutor" ? "px-3 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold" : "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900";
  document.getElementById("fsubtab-teachers").className = type === "Teacher" ? "px-3 py-1 rounded-md bg-white text-indigo-700 shadow-2xs font-bold" : "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900";
  renderFacultyDailyList();
}

function renderFacultyDailyList() {
  const container = document.getElementById("director-faculty-cards-list");
  container.innerHTML = "";
  document.getElementById("count-faculty-tutors").textContent = faculty.filter(f => f.role === "Tutor").length;
  document.getElementById("count-faculty-teachers").textContent = faculty.filter(f => f.role === "Teacher").length;

  faculty.filter(f => f.role === activeFacultySubTabType).forEach(staff => {
    const isPresent = staff.todayAttendance === "PRESENT";
    const card = document.createElement("div");
    card.className = "p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs";
    card.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-900 text-sm">${staff.name}</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${staff.role === 'Teacher' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">${staff.role}</span>
        </div>
        <p class="text-[11px] text-slate-600 mt-0.5">Duty: <strong class="text-indigo-900">${staff.duty}</strong></p>
      </div>
      <div class="flex items-center space-x-2">
        <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
          <button onclick="setStaffAttendanceToday('${staff.id}', 'PRESENT')" class="px-2.5 py-1 rounded text-xs font-semibold ${isPresent ? 'bg-emerald-600 text-white' : 'text-slate-600'}">P</button>
          <button onclick="setStaffAttendanceToday('${staff.id}', 'ABSENT')" class="px-2.5 py-1 rounded text-xs font-semibold ${!isPresent ? 'bg-rose-600 text-white' : 'text-slate-600'}">A</button>
        </div>
        <button onclick="openFacultyCalendarAudit('${staff.id}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs">Audit</button>
      </div>`;
    container.appendChild(card);
  });
}

function setStaffAttendanceToday(id, val) {
  const f = faculty.find(fac => fac.id === id);
  if (f) {
    f.todayAttendance = val;
    renderFacultyDailyList();
    renderFinancesAndPayroll();
    showToast(`${f.name} marked ${val}.`);
  }
}

function openFacultyCalendarAudit(id) {
  activeAuditedStaffId = id;
  const f = faculty.find(fac => fac.id === id);
  document.getElementById("audit-staff-name-heading").textContent = `${f.name} - Duty: ${f.duty}`;
  document.getElementById("faculty-calendar-audit-drawer").classList.remove("hidden");
  renderAuditedDateActivities();
}
function closeFacultyCalendarAudit() { document.getElementById("faculty-calendar-audit-drawer").classList.add("hidden"); }

function renderAuditedDateActivities() {
  const cont = document.getElementById("audit-activities-container");
  cont.innerHTML = `<div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">Verified timestamped activity logs synced with DynamoDB Single-Table schema.</div>`;
}

function renderDirectorStudentsTable() {
  const tbody = document.getElementById("director-students-table-body");
  tbody.innerHTML = "";
  const grade = document.getElementById("director-student-class-filter")?.value || "ALL";
  const search = (document.getElementById("director-stu-search")?.value || "").toLowerCase();

  let list = students;
  if (grade !== "ALL") list = list.filter(s => s.grade === grade);
  if (search) list = list.filter(s => s.name.toLowerCase().includes(search));

  document.getElementById("dtab-total-enrolled").textContent = students.filter(s => s.status === "ACTIVE").length;

  list.forEach(s => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-900 cursor-pointer hover:text-indigo-600" onclick="openStudentModal('${s.id}')">${s.name}</td>
      <td class="p-3">${s.grade} (${s.curriculum})</td>
      <td class="p-3 font-mono text-[11px]"><a href="tel:${s.primaryNumber}" class="text-indigo-600 font-semibold">${s.primaryNumber}</a></td>
      <td class="p-3 font-mono text-[11px]">${s.admissionDate}</td>
      <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.attendanceToday === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.attendanceToday}</span></td>
      <td class="p-3 text-center"><button onclick="openDateRangePdfModal('${s.id}')" class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-semibold text-xs">PDF</button></td>
      <td class="p-3 text-right"><button onclick="showToast('Student staged')" class="px-2 py-1 bg-slate-100 rounded text-slate-700 text-xs">Action</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderDirectorFeesTable() {
  const tbody = document.getElementById("director-fees-table-body");
  tbody.innerHTML = "";
  const filter = document.getElementById("fees-class-filter")?.value || "ALL";
  let list = filter === "ALL" ? students : students.filter(s => s.grade === filter);

  list.forEach(s => {
    const isPaid = s.feeStatus === "PAID";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-3 font-bold">${s.name} <span class="text-slate-400 font-normal">(${s.grade})</span></td>
      <td class="p-3 font-mono">${s.primaryNumber}</td>
      <td class="p-3 text-right font-mono font-bold">₹${s.monthlyFee}</td>
      <td class="p-3 font-mono text-[11px]">${s.nextDueDate}</td>
      <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${s.feeStatus}</span></td>
      <td class="p-3 text-center"><button onclick="toggleFeeStatus('${s.id}')" class="px-2 py-1 border rounded text-xs">${isPaid ? 'Mark Due' : 'Mark Paid'}</button></td>
      <td class="p-3 text-right">${!isPaid ? `<button onclick="queueFeeReminder('${s.id}')" class="px-2 py-1 bg-rose-600 text-white rounded text-xs">Queue WhatsApp</button>` : '<span class="text-slate-400 text-xs">Cleared</span>'}</td>`;
    tbody.appendChild(tr);
  });
}

function toggleFeeStatus(id) {
  const s = students.find(st => st.id === id);
  if (s) {
    s.feeStatus = s.feeStatus === "PAID" ? "UNPAID" : "PAID";
    renderDirectorFeesTable();
    renderFinancesAndPayroll();
  }
}

function queueFeeReminder(id) {
  const s = students.find(st => st.id === id);
  directorOutboundQueue.unshift({
    id: `Q-FEE-${Date.now()}`,
    type: "FEE_REMINDER",
    studentId: s.id,
    studentName: s.name,
    grade: s.grade,
    recipient: s.primaryNumber,
    message: `*KRISHNA TUITION INSTITUTIONS - TUITION FEE INTIMATION*\nStudent: ${s.name} (${s.grade})\nTuition Fee: ₹${s.monthlyFee} (Status: Due)\nBilling Due Anchor: ${s.nextDueDate}\n\nKindly clear at the desk.`
  });
  updateDirectorBadge();
  showToast(`Fee reminder queued for ${s.name}.`);
}

function queueFeeRemindersForFilteredClass() {
  const filter = document.getElementById("fees-class-filter").value;
  const target = filter === "ALL" ? students : students.filter(s => s.grade === filter);
  target.filter(s => s.feeStatus !== "PAID").forEach(s => queueFeeReminder(s.id));
}

function renderFinancesAndPayroll() {
  let collected = 0;
  students.filter(s => s.feeStatus === "PAID").forEach(s => collected += s.monthlyFee);
  let payroll = 0;
  faculty.forEach(f => payroll += f.salary);
  let expenses = 0;
  tuitionExpenses.forEach(e => expenses += e.amount);

  document.getElementById("fin-total-collected").textContent = `₹${collected.toLocaleString('en-IN')}`;
  document.getElementById("fin-faculty-payroll").textContent = `₹${payroll.toLocaleString('en-IN')}`;
  document.getElementById("fin-monthly-expenses").textContent = `₹${expenses.toLocaleString('en-IN')}`;
  document.getElementById("fin-net-profit").textContent = `₹${(collected - (payroll + expenses)).toLocaleString('en-IN')}`;

  const tbody = document.getElementById("director-payroll-table-body");
  tbody.innerHTML = "";
  faculty.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-3 font-bold">${f.name} <span class="text-slate-400 font-normal">(${f.role})</span></td>
      <td class="p-3 font-mono">₹${f.salary}</td>
      <td class="p-3">${f.absences.length} Days</td>
      <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Approved</span></td>
      <td class="p-3 text-right font-mono font-bold">₹${f.salary}</td>
      <td class="p-3 text-right"><button onclick="showToast('Adjust payroll')" class="text-indigo-600 text-xs">Edit</button></td>`;
    tbody.appendChild(tr);
  });
}

function promptRecordFacultyExpense() {
  const title = prompt("Expense Title:", "Printing Paper");
  const amt = parseInt(prompt("Amount (₹):", "1000")) || 0;
  if (title && amt > 0) {
    tuitionExpenses.push({ id: `EXP-${Date.now()}`, title, amount: amt, date: new Date().toISOString().split("T")[0] });
    renderFinancesAndPayroll();
  }
}

/* =========================================================================
   7. TUTOR DESK LOGIC
   ========================================================================= */
function setFloorViewMode(mode) {
  activeFloorFilter = mode;
  renderTutorCards();
}

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
    card.className = "p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-2.5";
    card.innerHTML = `
      <div class="flex items-center space-x-3 cursor-pointer min-w-0" onclick="openStudentModal('${s.id}')">
        <div class="w-9 h-9 rounded-xl ${isP ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} flex items-center justify-center font-bold text-sm shrink-0">
          ${s.name.charAt(0)}
        </div>
        <div class="truncate">
          <div class="flex items-center space-x-1.5"><span class="font-bold text-slate-900 text-sm truncate">${s.name}</span><span class="px-1.5 py-0.2 rounded text-[10px] bg-slate-100">${s.grade}</span></div>
          <span class="text-slate-400 text-[11px]">${s.schoolName}</span>
        </div>
      </div>
      <div class="flex items-center space-x-1.5 shrink-0">
        <button onclick="toggleStudentAttendance('${s.id}', 'PRESENT')" class="px-2.5 py-1 rounded text-xs font-semibold ${isP ? 'bg-emerald-600 text-white' : 'text-slate-600'}">P</button>
        <button onclick="toggleStudentAttendance('${s.id}', 'ABSENT')" class="px-2.5 py-1 rounded text-xs font-semibold ${!isP ? 'bg-rose-600 text-white' : 'text-slate-600'}">A</button>
        <button onclick="openStudentModal('${s.id}')" class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs">Dossier</button>
      </div>`;
    cont.appendChild(card);
  });
}

function toggleStudentAttendance(id, val) {
  const s = students.find(st => st.id === id);
  if (s) {
    s.attendanceToday = val;
    renderTutorCards();
    showToast(`${s.name} marked ${val}.`);
  }
}

function queueAllAbsenteesToDirector() {
  const abs = students.filter(s => s.attendanceToday === "ABSENT");
  abs.forEach(s => {
    directorOutboundQueue.unshift({
      id: `Q-ABS-${Date.now()}-${s.id}`,
      type: "ABSENT",
      studentId: s.id,
      studentName: s.name,
      grade: s.grade,
      recipient: s.primaryNumber,
      message: `*KRISHNA TUITION INSTITUTIONS - ATTENDANCE INTIMATION*\nStudent: ${s.name} (${s.grade}) absent today.`
    });
  });
  updateDirectorBadge();
  showToast(`Pushed ${abs.length} absentees to Director Alerts queue.`);
}

/* =========================================================================
   8. TEACHER DESK LOGIC
   ========================================================================= */
function renderTeacherConsole() {
  const sel = document.getElementById("teacher-doubt-student-select");
  sel.innerHTML = "";
  students.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name} (${s.grade})</option>`);
  updateTeacherDoubtChapters();

  const list = document.getElementById("teacher-students-list");
  list.innerHTML = "";
  students.forEach(s => {
    list.innerHTML += `
      <div class="p-3 flex items-center justify-between hover:bg-slate-50">
        <div><span class="font-bold text-slate-900">${s.name}</span> <span class="text-slate-500">(${s.grade})</span></div>
        <button onclick="openStudentModal('${s.id}')" class="px-2.5 py-1 border rounded text-xs">Inspect</button>
      </div>`;
  });
}

function updateTeacherDoubtChapters() {
  const sid = document.getElementById("teacher-doubt-student-select").value;
  const s = students.find(st => st.id === sid);
  const chapSel = document.getElementById("teacher-doubt-chapter-select");
  chapSel.innerHTML = "";
  if (s && s.syllabus) {
    s.syllabus.forEach(sub => sub.chapters.forEach(ch => chapSel.innerHTML += `<option value="${ch.title}">${sub.name} - ${ch.title}</option>`));
  }
  updateTeacherDoubtTopics();
}

function updateTeacherDoubtTopics() {
  const topSel = document.getElementById("teacher-doubt-topic-select");
  topSel.innerHTML = "<option>Standard Form & Factorization</option><option>Discriminant & Nature of Roots</option>";
}

function handleTeacherLogDoubt() {
  const sid = document.getElementById("teacher-doubt-student-select").value;
  const s = students.find(st => st.id === sid);
  showToast(`Doubt clearance logged for ${s.name}.`);
}

/* =========================================================================
   9. STUDENT DOSSIER MODAL LOGIC
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
    if (b) b.className = (t === tab) ? "py-2 px-3 text-indigo-700 border-b-2 border-indigo-700 whitespace-nowrap font-bold flex items-center space-x-1" : "py-2 px-3 text-slate-500 hover:text-slate-800 whitespace-nowrap flex items-center space-x-1";
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
      cont.innerHTML += `<button onclick="currentSelectedChapterIdx=${i}; renderModalTopics(students.find(st=>st.id===activeStudentId))" class="px-3 py-1 rounded-lg text-xs border ${i===currentSelectedChapterIdx ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'bg-white border-slate-200'}">${ch.title} (${ch.completion}%)</button>`;
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
      cont.innerHTML += `
        <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <span class="font-bold text-slate-800 text-xs">${t.name}</span>
          <div class="flex items-center space-x-1">
            ${[0, 25, 50, 75, 100].map(v => `<button onclick="setTopicConfidence(${i},${v})" class="px-2 py-0.5 rounded text-[10px] font-bold ${t.confidence === v ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}">${v}%</button>`).join("")}
          </div>
        </div>`;
    });
  }
}

function setTopicConfidence(idx, val) {
  const s = students.find(st => st.id === activeStudentId);
  s.syllabus[currentSelectedSubjectIdx].chapters[currentSelectedChapterIdx].topics[idx].confidence = val;
  renderModalTopics(s);
}

function promptAddNewSubject() {
  const n = prompt("Subject Name:");
  if (n) { students.find(st => st.id === activeStudentId).syllabus.push({ name: n, chapters: [] }); renderModalSubjectButtons(students.find(st => st.id === activeStudentId)); }
}
function promptAddNewChapter() {
  const n = prompt("Chapter Title:");
  if (n) { students.find(st => st.id === activeStudentId).syllabus[currentSelectedSubjectIdx].chapters.push({ title: n, completion: 0, topics: [] }); renderModalChapterButtons(students.find(st => st.id === activeStudentId)); }
}
function promptAddNewTopic() {
  const n = prompt("Topic Name:");
  if (n) { students.find(st => st.id === activeStudentId).syllabus[currentSelectedSubjectIdx].chapters[currentSelectedChapterIdx].topics.push({ id: `T-${Date.now()}`, name: n, confidence: 50 }); renderModalTopics(students.find(st => st.id === activeStudentId)); }
}

function renderModalSlipTests() {
  const cont = document.getElementById("modal-slip-history-list");
  cont.innerHTML = "";
  const s = students.find(st => st.id === activeStudentId);
  s.slipTests.forEach(t => {
    cont.innerHTML += `
      <div class="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
        <div><span class="font-bold text-slate-900">${t.subject} - ${t.topic}</span><p class="text-slate-500 italic">"${t.remarks}"</p></div>
        <span class="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded border">${t.score}</span>
      </div>`;
  });
}

function updateSlipChapterDropdown() {}
function updateSlipTopicDropdown() {}
function handleSlipPhotosSelected(e) {}

function handleSaveSlipTest(e) {
  e.preventDefault();
  const s = students.find(st => st.id === activeStudentId);
  const topic = document.getElementById("slip-topic-select").value || "Trigonometry";
  const scored = document.getElementById("slip-score-scored").value;
  const total = document.getElementById("slip-score-total").value;
  const remarks = document.getElementById("slip-remarks").value;

  s.slipTests.unshift({ id: `ST-${Date.now()}`, date: "2026-10-01", subject: "Mathematics", topic, score: `${scored}/${total}`, remarks, photos: [] });
  renderModalSlipTests();
  showToast("Slip test logged.");
  e.target.reset();
}

function queueSlipTestToDirector() {
  showToast("Slip test queued to WhatsApp alerts.");
}

function promptScheduleNewExam() {
  const n = prompt("Exam Name:");
  if (n) { students.find(st => st.id === activeStudentId).examSchedules.push({ name: n, daysLeft: 5, date: "2026-10-10" }); showToast("Exam added."); }
}
function promptLogExamResult() { showToast("Exam result logged."); }
function renderSundayGrandTestView() {}
function promptLogGrandSundayScore() { showToast("Grand test score logged."); }

function renderStudentAttendanceCalendar() {
  const grid = document.getElementById("calendar-days-grid");
  grid.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const isSun = (i % 7 === 0);
    grid.innerHTML += `<div class="p-1 rounded text-center border font-mono text-[10px] ${isSun ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'}"><span>${i}</span><span class="block text-[8px]">${isSun ? 'HOL' : 'P'}</span></div>`;
  }
}

function selectIncidentTag(txt) { document.getElementById("incident-category-input").value = txt; }
function handleLogMisbehavior(e) {
  e.preventDefault();
  showToast("Incident escalated to Director queue.");
  closeStudentModal();
}

/* =========================================================================
   10. ENROLLMENT & PDF EXPORT
   ========================================================================= */
function openEnrollStudentModal() {
  adaptCurriculumOptions();
  document.getElementById("enroll-modal").classList.remove("hidden");
}
function closeEnrollModal() { document.getElementById("enroll-modal").classList.add("hidden"); }

function adaptCurriculumOptions() {
  const cur = document.getElementById("enroll-curriculum");
  cur.innerHTML = "<option>SSC (State Board)</option><option>CBSE</option><option>ICSE</option><option>JEE Mains / IPE</option>";
}

function handleEnrollStudent(e) {
  e.preventDefault();
  const name = document.getElementById("enroll-name").value;
  const grade = document.getElementById("enroll-class").value;
  const phone = document.getElementById("enroll-father-phone").value;
  students.unshift({
    id: `STU-00${students.length + 1}`,
    name, grade, curriculum: "SSC", schoolName: "High School", area: "Local",
    primaryNumber: phone, primaryRole: "Father", monthlyFee: 1500, feeStatus: "UNPAID",
    admissionDate: "2026-10-01", nextDueDate: "2026-11-01", attendanceToday: "PRESENT",
    status: "ACTIVE", syllabus: [], slipTests: [], examSchedules: [], examResults: []
  });
  renderDirectorStudentsTable();
  renderTutorCards();
  closeEnrollModal();
  showToast(`Enrolled ${name} successfully.`);
  e.target.reset();
}

function openDateRangePdfModal(id) {
  activeStudentId = id;
  document.getElementById("date-range-pdf-modal").classList.remove("hidden");
}
function closeDateRangePdfModal() { document.getElementById("date-range-pdf-modal").classList.add("hidden"); }

function executeDateRangePdfExport() {
  closeDateRangePdfModal();
  const el = document.getElementById("printable-dossier");
  el.classList.remove("hidden");
  showToast("Generating PDF Dossier...");
  html2pdf().from(el).save().then(() => {
    el.classList.add("hidden");
    showToast("PDF downloaded.");
  });
}

/* =========================================================================
   11. INITIALIZATION
   ========================================================================= */
window.onload = function() {
  switchSystemRole('director');
  updateDirectorBadge();
  renderFacultyDailyList();
};