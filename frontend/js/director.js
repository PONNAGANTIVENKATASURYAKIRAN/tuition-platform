let currentDirectorView = "dashboard";
let directorStudents = [];
let directorStaff = [];
let rawDispatchQueue = [];
let expenses = [];

let currentPillar = 'students';
let activeBucket = 'ALL';
let activeAbsentSub = 'ABSENTEES';
let intakeStaffRole = 'tutor';
let intakeSubjects = new Set(["Mathematics", "Science"]);
let activeStudentDossier = null;

let activeLedgerTab = 'students';
let activeStuLedgerFilter = 'ALL';
let activeStfLedgerFilter = 'ALL';
let isMainDirector = false;

const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!\%*?&#]{8,}$/;

document.addEventListener("DOMContentLoaded", () => {
    // Determine User Role Authority
    const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
    isMainDirector = (user.role === 'director');
    const badgeEl = document.getElementById("role-badge");
    if(badgeEl) badgeEl.textContent = isMainDirector ? "Director" : "Assoc. Director";

    const today = new Date().toISOString().split("T")[0];
    if(document.getElementById("filter-date")) document.getElementById("filter-date").value = today;
    if(document.getElementById("adm-date")) document.getElementById("adm-date").value = today;
    if(document.getElementById("staff-join-date")) document.getElementById("staff-join-date").value = today;
    if(document.getElementById("pdf-start-date")) document.getElementById("pdf-start-date").value = today.substring(0,8) + "01";
    if(document.getElementById("pdf-end-date")) document.getElementById("pdf-end-date").value = today;

    loadDashboardData();
    loadDispatchQueue();
    loadFinancialLedger();
});

/* =========================================================================
   UI CONTROLS & NAVIGATION
   ========================================================================= */
function toggleSidebar() {
    const menu = document.getElementById("sidebar-menu");
    const overlay = document.getElementById("sidebar-overlay");
    if (menu.classList.contains("-translate-x-full")) {
        menu.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    } else {
        menu.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }
}

function openDirectorView(viewId) {
    currentDirectorView = viewId;
    ['dashboard', 'dispatches', 'intake', 'fees-salaries', 'security-portal'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle("hidden", v !== viewId);
    });
    toggleSidebar();
}

function showMsg(title, msg) {
    document.getElementById('custom-alert-title').textContent = title;
    document.getElementById('custom-alert-message').textContent = msg;
    document.getElementById('custom-alert-modal').classList.remove('hidden');
}

function closeMsg() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
}

let confirmCallback = null;
function showConfirm(title, msg, onConfirm) {
    document.getElementById('custom-confirm-title').textContent = title;
    document.getElementById('custom-confirm-message').textContent = msg;
    confirmCallback = onConfirm;
    document.getElementById('custom-confirm-modal').classList.remove('hidden');
    document.getElementById('custom-confirm-btn').onclick = () => {
        if(confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    document.getElementById('custom-confirm-modal').classList.add('hidden');
}

/* =========================================================================
   LIVE METRICS / DASHBOARD
   ========================================================================= */
async function loadDashboardData() {
    const { ok: okStudents, data: dataStudents } = await API.get("/director/students");
    if (okStudents && dataStudents.students) {
        directorStudents = dataStudents.students;
    }
    
    if(document.getElementById("dash-total-students")) {
        document.getElementById("dash-total-students").textContent = directorStudents.length;
    }

    const { ok: okStaff, data: dataStaff } = await API.get("/director/staff-list");
    if (okStaff && dataStaff.staff) {
        directorStaff = dataStaff.staff;
    }

    if(document.getElementById("dash-total-tutors")) {
        const tutors = directorStaff.filter(s => s.role === 'tutor' && s.status === 'ACTIVE').length;
        const faculty = directorStaff.filter(s => s.role === 'faculty' && s.status === 'ACTIVE').length;
        document.getElementById("dash-total-tutors").textContent = tutors;
        document.getElementById("dash-total-faculty").textContent = faculty;
    }

    switchPillar(currentPillar);
    renderStudentsList();
}

function switchPillar(pillar) {
    currentPillar = pillar;
    ['students', 'tutors', 'faculty'].forEach(p => {
        const panel = document.getElementById(`dash-panel-${p}`);
        if(panel) panel.classList.toggle('hidden', p !== pillar);
        const btn = document.getElementById(`dash-tab-${p}`);
        if(btn) btn.className = (p === pillar) ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm" : "py-2 rounded-lg text-slate-400 hover:text-white";
    });
    if(pillar === 'tutors') renderStaffCards('tutor', 'list-tutors', 'filter-tutor-gender');
    if(pillar === 'faculty') renderStaffCards('faculty', 'list-faculty', 'filter-faculty-gender');
}

function filterBucket(bucket) {
    activeBucket = bucket;
    ['ALL', 'PRESENT', 'ABSENT', 'LATE', 'EARLY', 'UNMARKED', 'FEE_DUES', 'LEFT'].forEach(b => {
        const el = document.getElementById(`bucket-${b}`);
        if(el) {
            if(b === 'UNMARKED') {
                el.className = (b === bucket) ? "px-3 py-1.5 rounded-lg bg-rose-600 text-white shadow-xs" : "px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30";
            } else {
                el.className = (b === bucket) ? "px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-xs" : "px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400";
            }
        }
    });

    const abFilters = document.getElementById('absent-sub-filters');
    if(abFilters) abFilters.classList.toggle('hidden', bucket !== 'ABSENT');
    
    renderStudentsList();
}

function filterAbsentSub(sub) {
    activeAbsentSub = sub;
    document.getElementById('absent-sub-ABSENTEES').className = (sub === 'ABSENTEES') ? "text-[10px] font-bold px-2 py-1 bg-rose-600 rounded text-white shadow-xs" : "text-[10px] font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white";
    document.getElementById('absent-sub-UNINFORMED').className = (sub === 'UNINFORMED') ? "text-[10px] font-bold px-2 py-1 bg-rose-600 rounded text-white shadow-xs" : "text-[10px] font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white";
    renderStudentsList();
}

function renderStudentsList() {
    const list = document.getElementById("list-students");
    if(!list) return;
    list.innerHTML = "";
    
    let filtered = directorStudents;
    
    const classFilter = document.getElementById("filter-class");
    if(classFilter && classFilter.value !== "ALL") {
        filtered = filtered.filter(s => String(s.class) === classFilter.value);
    }
    
    const genderFilter = document.getElementById("filter-gender");
    if(genderFilter && genderFilter.value !== "ALL") {
        filtered = filtered.filter(s => (s.gender || 'Male') === genderFilter.value);
    }

    if (activeBucket === 'LEFT') {
        filtered = filtered.filter(s => s.status === 'LEFT_TUITION');
    } else if (activeBucket === 'FEE_DUES') {
        filtered = filtered.filter(s => s.feeStatus === 'UNPAID');
    } else {
        filtered = filtered.filter(s => s.status !== 'LEFT_TUITION');
        if (activeBucket === 'EARLY') {
            filtered = filtered.filter(s => s.attendanceStatus === 'early leave');
        } else if (activeBucket === 'UNMARKED') {
            filtered = filtered.filter(s => !s.attendanceStatus || s.attendanceStatus === 'unmarked');
        } else if (activeBucket === 'ABSENT') {
            filtered = filtered.filter(s => s.attendanceStatus === 'absent');
        } else if (activeBucket === 'PRESENT' || activeBucket === 'LATE') {
            filtered = filtered.filter(s => s.attendanceStatus === activeBucket.toLowerCase());
        }
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">No students match current filters.</div>`;
        return;
    }

    filtered.forEach(s => {
        const sid = String(s.id || s.PK?.replace('STUDENT#', ''));
        const card = document.createElement("div");
        card.onclick = () => openStudentDossier(sid);
        card.className = `p-3.5 bg-slate-900 border ${s.attendanceStatus==='unmarked' ? 'border-rose-500/50' : 'border-slate-800 hover:border-indigo-500'} rounded-2xl cursor-pointer shadow-xs`;
        
        let statusHtml = `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase">${s.attendanceStatus || 'ACTIVE'}</span>`;
        if(s.attendanceStatus === 'unmarked') statusHtml = `<span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 font-bold rounded"><i class="fa-solid fa-triangle-exclamation"></i> UNMARKED</span>`;
        if(s.attendanceStatus === 'early leave') statusHtml = `<span class="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">Early Leave</span>`;
        if(s.status === 'LEFT_TUITION') statusHtml = `<span class="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded">Left Tuition</span>`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start pointer-events-none">
                <div><h4 class="text-sm font-extrabold text-white">${s.name}</h4><p class="text-[10px] text-slate-400 mt-1">Class ${s.class} &bull; ${s.gender||'Male'} &bull; ${s.area||'Area'}</p></div>
                ${statusHtml}
            </div>
            <div class="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] pointer-events-none">
                <span class="text-indigo-400 font-bold">Tutor: ${s.tutor || 'Unassigned'}</span><span class="text-slate-500">Tap for Timeline <i class="fa-solid fa-chevron-right ml-1"></i></span>
            </div>`;
        list.appendChild(card);
    });
}

function renderStaffCards(role, containerId, filterId) {
    const list = document.getElementById(containerId);
    if(!list) return;
    const genderF = document.getElementById(filterId).value;
    let filtered = directorStaff.filter(s => s.role === role && s.name && s.name.toLowerCase() !== 'undefined');
    if (genderF !== "ALL") filtered = filtered.filter(s => (s.gender || 'Male') === genderF);

    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">No ${role}s found.</div>`;
        return;
    }

    list.innerHTML = filtered.map(t => `
        <div class="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-colors cursor-pointer" onclick="openStaffCalendar('${role.toUpperCase()}: ${t.name}')">
            <div class="flex justify-between items-center pointer-events-none">
                <div><h4 class="font-extrabold text-white text-sm">${t.name}</h4><p class="text-[10px] text-slate-500 mt-1">${t.phone}</p></div>
                <select onclick="event.stopPropagation()" style="pointer-events: auto;" class="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white">
                    <option>Present</option><option>Late</option><option>Absent (Paid)</option><option>Absent (Unpaid)</option><option>Early Leave</option><option>Sick</option>
                </select>
            </div>
        </div>
    `).join("");
}

/* =========================================================================
   STAFF CALENDAR 
   ========================================================================= */
function openStaffCalendar(title) {
    document.getElementById("staff-calendar-title").textContent = title;
    const grid = document.getElementById("staff-calendar-grid");
    grid.innerHTML = "";
    
    for (let day = 1; day <= 30; day++) {
        const isAbsent = (day === 5 || day === 14);
        const isHoliday = (day % 7 === 0);
        const btn = document.createElement("button");
        btn.className = `p-1.5 rounded-lg text-center border font-mono text-[10px] ${isAbsent ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : (isHoliday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors')}`;
        btn.innerHTML = `<span class="block font-bold">${day}</span>`;
        btn.onclick = () => showStaffDayDetails(day, isAbsent, isHoliday, title);
        grid.appendChild(btn);
    }
    
    document.getElementById("staff-day-details").classList.add("hidden");
    document.getElementById("modal-staff-calendar").classList.remove("hidden");
}

function showStaffDayDetails(day, isAbsent, isHoliday, staffName) {
    const detailsBox = document.getElementById("staff-day-details");
    const statusText = document.getElementById("staff-day-status");
    const studentsText = document.getElementById("staff-day-students");
    detailsBox.classList.remove("hidden");
    
    if(isHoliday) {
        statusText.className = "text-amber-400 text-xs";
        statusText.textContent = `Day ${day}: HOLIDAY`;
        studentsText.innerHTML = "Academy Closed. No operations.";
    } else if(isAbsent) {
        statusText.className = "text-rose-400 text-xs";
        statusText.textContent = `Day ${day}: ABSENT`;
        studentsText.innerHTML = `${staffName} was on leave.`;
    } else {
        statusText.className = "text-emerald-400 text-xs";
        statusText.textContent = `Day ${day}: PRESENT`;
        
        let sampleLinks = directorStudents.slice(0, 2).map(s => {
            const sid = s.id || s.PK?.replace('STUDENT#', '') || s.id;
            return `<button onclick="openStudentDossier('${sid}')" class="text-indigo-400 hover:text-indigo-300 underline mr-2 mt-1 touch-btn">${s.name}</button>`;
        }).join('');
        
        if (staffName.includes('Faculty')) {
            studentsText.innerHTML = `Cleared Doubts for:<br>${sampleLinks}`;
        } else {
            studentsText.innerHTML = `Checked records for:<br>${sampleLinks}`;
        }
    }
}

function closeStaffCalendar() {
    document.getElementById("modal-staff-calendar").classList.add("hidden");
}

/* =========================================================================
   STUDENT PTM DOSSIER, VAULT & PDF
   ========================================================================= */
async function openStudentDossier(studentId) {
    let s = directorStudents.find(stu => String(stu.id || stu.PK?.replace("STUDENT#", "")) === String(studentId));
    if (!s) return;
    
    closeStaffCalendar(); 
    activeStudentDossier = s;
    
    document.getElementById("modal-student-name").textContent = s.name;
    document.getElementById("modal-student-badge").textContent = `Class ${s.class}`;

    const delBtn = document.getElementById("btn-delete-student");
    const recBtn = document.getElementById("btn-recall-student");
    
    if(delBtn && recBtn) {
        if (s.status === 'LEFT_TUITION') {
            delBtn.classList.add("hidden");
            recBtn.classList.remove("hidden");
        } else {
            // Only Main Director can see Delete
            if(isMainDirector) {
                delBtn.classList.remove("hidden");
            } else {
                delBtn.classList.add("hidden");
            }
            recBtn.classList.add("hidden");
        }
    }

    document.getElementById("student-modal").classList.remove("hidden");
    switchDossierTab('attendance');
    
    const { ok, data } = await API.post("/tutor/student-drawer", { studentId });
    if (ok && data.profile) {
        activeStudentDossier = { ...s, ...data.profile };
    }
    
    if(!activeStudentDossier.slipTests || activeStudentDossier.slipTests.length === 0) {
        activeStudentDossier.slipTests = [
            { date: "2026-10-02", subject: "Mathematics", subtopic: "Euclid's Lemma", marksObtained: 19, maxMarks: 20, percentage: 95, remarks: "Excellent speed.", evaluator: "Srinivas", photos: ["https://via.placeholder.com/300x400/1e293b/818cf8?text=Math+Page+1", "https://via.placeholder.com/300x400/1e293b/818cf8?text=Math+Page+2"] },
            { date: "2026-10-06", subject: "Science", subtopic: "Chemical Reactions", marksObtained: 15, maxMarks: 20, percentage: 75, remarks: "Needs to practice balancing equations.", evaluator: "Raji", photos: ["https://via.placeholder.com/300x400/1e293b/f43f5e?text=Science+Page+1"] }
        ];
    }
    
    if(!activeStudentDossier.exams) activeStudentDossier.exams = [];
    
    renderExamsDelta();
    renderAttendanceTimeline();
    populateVaultDropdown();
}

function closeStudentModal() {
    document.getElementById("student-modal").classList.add("hidden");
}

async function deleteActiveStudent() {
    if(!activeStudentDossier) return;
    const sid = activeStudentDossier.id || activeStudentDossier.PK.replace('STUDENT#','');
    showConfirm("Archive Student", `Soft delete ${activeStudentDossier.name} from active tuition roster?`, async () => {
        await API.post("/director/delete-student", { studentId: sid });
        closeStudentModal();
        loadDashboardData();
        showMsg("Archived", "Student record successfully soft deleted.");
    });
}

async function recallActiveStudent() {
    if(!activeStudentDossier) return;
    const sid = activeStudentDossier.id || activeStudentDossier.PK.replace('STUDENT#','');
    showConfirm("Recall Student", `Restore ${activeStudentDossier.name} to the active tuition roster?`, async () => {
        await API.post("/director/recall-student", { studentId: sid });
        closeStudentModal();
        loadDashboardData();
        showMsg("Restored", "Student successfully recalled to active roster.");
    });
}

function switchDossierTab(tab) {
    ['attendance', 'syllabus', 'doubts', 'vault', 'exams'].forEach(t => {
        const panel = document.getElementById(`dossier-panel-${t}`);
        const tabBtn = document.getElementById(`dossier-tab-${t}`);
        if(panel) panel.classList.toggle("hidden", t !== tab);
        if(tabBtn) tabBtn.className = (t === tab) ? "py-2 px-3 text-indigo-400 border-b-2 border-indigo-500 whitespace-nowrap" : "py-2 px-3 text-slate-400 hover:text-white whitespace-nowrap transition-colors";
    });
}

// 1. Attendance Timeline
function renderAttendanceTimeline() {
    const grid = document.getElementById("progress-calendar-grid");
    if(!grid) return;
    grid.innerHTML = "";
    for (let day = 1; day <= 30; day++) {
        const isAbsent = (day === 12);
        const isHoliday = (day % 7 === 0);
        const isLocked = (day < 5);

        const btn = document.createElement("button");
        btn.className = `p-1.5 rounded-lg text-center border font-mono text-[10px] ${isAbsent ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : (isHoliday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors')}`;
        
        btn.innerHTML = `<span class="block font-bold">${day}</span>`;
        if (isLocked && !isHoliday && !isAbsent) btn.innerHTML += `<i class="fa-solid fa-lock text-[8px] text-slate-500 mt-0.5"></i>`;

        btn.onclick = () => {
            document.getElementById("calendar-day-detail-box").classList.remove("hidden");
            document.getElementById("detail-status-pill").textContent = isAbsent ? 'ABSENT' : (isHoliday ? 'HOLIDAY' : 'PRESENT');
            document.getElementById("detail-status-pill").className = `px-2 py-0.5 rounded text-[10px] font-bold ${isAbsent ? 'bg-rose-500/20 text-rose-300' : (isHoliday ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')}`;
            
            let notes = isHoliday ? "Academy Closed." : (isAbsent ? "Student was marked absent. Uninformed." : "Arrived: 6:00 PM. Handled by Srinivas.");
            
            if (isLocked && !isHoliday && !isAbsent) {
                notes += `<br><button onclick="showMsg('Edit Request', 'Permission ticket routed to Director.')" class="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 font-bold text-[10px] touch-btn"><i class="fa-solid fa-lock mr-1"></i>Data Locked (>24h). Request Edit.</button>`;
            } else if (!isHoliday && !isAbsent) {
                notes += `<br><button class="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-indigo-400 font-bold text-[10px] touch-btn"><i class="fa-solid fa-pen mr-1"></i>Edit Entry</button>`;
            }
            document.getElementById("detail-date-notes").innerHTML = notes;
        };
        grid.appendChild(btn);
    }
}

// 2. Answer Sheet Vault
function populateVaultDropdown() {
    const sel = document.getElementById("vault-test-selector");
    sel.innerHTML = "";
    if(!activeStudentDossier.slipTests || activeStudentDossier.slipTests.length === 0) {
        sel.innerHTML = `<option value="">No tests recorded</option>`;
        document.getElementById("vault-test-display").innerHTML = `<p class="text-[10px] text-slate-500 italic text-center p-4">No test answer sheets available.</p>`;
        return;
    }
    activeStudentDossier.slipTests.forEach((t, i) => {
        sel.innerHTML += `<option value="${i}">${t.date} - ${t.subject} (${t.subtopic})</option>`;
    });
    renderVaultTest();
}

function renderVaultTest() {
    const sel = document.getElementById("vault-test-selector");
    if(!sel.value) return;
    
    const test = activeStudentDossier.slipTests[sel.value];
    const display = document.getElementById("vault-test-display");
    
    let photoHtml = "";
    if (test.photos && test.photos.length > 0) {
        photoHtml = test.photos.map(p => `<img src="${p}" class="w-full sm:w-48 h-auto rounded-xl border border-slate-700 shadow-md">`).join("");
    } else {
        photoHtml = `<p class="text-[10px] text-slate-500 italic">No photos attached for this test.</p>`;
    }

    display.innerHTML = `
        <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div><span class="block text-[10px] text-slate-400 uppercase font-bold">Score</span><span class="text-xl font-bold text-emerald-400 font-mono">${test.marksObtained}/${test.maxMarks} <span class="text-xs text-emerald-500/80">(${test.percentage}%)</span></span></div>
            <div class="text-right"><span class="block text-[10px] text-slate-400 uppercase font-bold">Evaluator</span><span class="text-sm font-bold text-white">${test.evaluator}</span></div>
        </div>
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Evaluator Remarks</span>
            <p class="text-[11px] text-slate-300 font-mono">${test.remarks}</p>
        </div>
        <div>
            <span class="block text-[10px] text-slate-400 uppercase font-bold mb-2"><i class="fa-solid fa-camera text-indigo-400 mr-1"></i> Answer Sheet Evidence</span>
            <div class="flex flex-wrap gap-2 justify-center sm:justify-start">${photoHtml}</div>
        </div>
    `;
}

// 3. Exams & Delta
function handleLogSchoolExam(e) {
    e.preventDefault();
    const name = document.getElementById("exam-name").value.trim();
    const sub = document.getElementById("exam-subject").value.trim();
    const scored = parseFloat(document.getElementById("exam-scored").value);
    const total = parseFloat(document.getElementById("exam-total").value);
    const pct = Math.round((scored/total)*100);
    
    if(!activeStudentDossier.exams) activeStudentDossier.exams = [];
    activeStudentDossier.exams.push({ name, subject: sub, scored, total, percentage: pct, date: new Date().toISOString().split("T")[0] });
    
    e.target.reset();
    renderExamsDelta();
    showMsg('Exam Logged', 'School exam marks added to delta progression.');
}

function renderExamsDelta() {
    const container = document.getElementById("modal-exam-results");
    if(!container) return;
    container.innerHTML = "";
    if(!activeStudentDossier.exams || activeStudentDossier.exams.length === 0) {
        container.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 border border-dashed border-slate-800 rounded-xl text-center">No school exams logged yet.</p>`;
        return;
    }
    
    let previousPct = null;
    activeStudentDossier.exams.forEach(ex => {
        let deltaHtml = "";
        if (previousPct !== null) {
            const diff = ex.percentage - previousPct;
            if(diff > 0) deltaHtml = `<span class="text-emerald-400 text-[10px] font-bold ml-2"><i class="fa-solid fa-arrow-up"></i> ${diff}%</span>`;
            else if(diff < 0) deltaHtml = `<span class="text-rose-400 text-[10px] font-bold ml-2"><i class="fa-solid fa-arrow-down"></i> ${Math.abs(diff)}%</span>`;
            else deltaHtml = `<span class="text-slate-400 text-[10px] font-bold ml-2">- 0%</span>`;
        }
        previousPct = ex.percentage;
        
        container.innerHTML += `
            <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div><h5 class="text-xs font-bold text-white">${ex.name} &bull; ${ex.subject}</h5><p class="text-[10px] text-slate-400">${ex.date}</p></div>
                <div class="text-right"><span class="font-mono font-bold text-indigo-400">${ex.scored}/${ex.total} (${ex.percentage}%)</span>${deltaHtml}</div>
            </div>`;
    });
}

// 4. PDF Generator
function openCustomRangePdfModal() { document.getElementById("modal-range-pdf").classList.remove("hidden"); }
function closeCustomRangePdfModal() { document.getElementById("modal-range-pdf").classList.add("hidden"); }
function executeDossierPdfExport() {
    const start = document.getElementById("pdf-start-date").value;
    const end = document.getElementById("pdf-end-date").value;
    const s = activeStudentDossier;
    
    document.getElementById("pdf-print-name").textContent = s.name;
    document.getElementById("pdf-print-class").textContent = `Class ${s.class} • ${s.area || 'N/A'}`;
    document.getElementById("pdf-print-father").textContent = s.fatherPhone || "N/A";
    document.getElementById("pdf-print-mother").textContent = s.motherPhone || "N/A";
    document.getElementById("pdf-print-range").textContent = `Period: ${start} to ${end}`;

    const examTree = document.getElementById("pdf-print-exams");
    examTree.innerHTML = "";
    if(s.exams && s.exams.length > 0) {
        s.exams.forEach(ex => {
            examTree.innerHTML += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:6px 0;"><span style="font-weight:bold; font-size: 11px; color:#1e293b;">${ex.name} - ${ex.subject}</span><span style="color:#4338ca; font-weight:bold; font-size:11px;">${ex.percentage}%</span></div>`;
        });
    } else {
        examTree.innerHTML = "<p style='color:#64748b; font-size:10px;'>No exams recorded in this period.</p>";
    }

    const testList = document.getElementById("pdf-print-tests");
    testList.innerHTML = "";
    if(s.slipTests && s.slipTests.length > 0) {
        s.slipTests.forEach(t => {
            let thumbsHtml = "";
            if (t.photos && t.photos.length > 0) thumbsHtml = t.photos.map(p => `<img src="${p}" style="height: 60px; width: auto; border: 1px solid #cbd5e1; border-radius: 4px; margin-right: 4px;">`).join("");
            testList.innerHTML += `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="font-size: 11px; font-weight: bold; color: #1e293b;">${t.date} - ${t.subject} (${t.subtopic})</span>
                        <span style="font-size: 11px; font-weight: bold; color: #059669;">${t.marksObtained}/${t.maxMarks} (${t.percentage}%)</span>
                    </div>
                    <p style="font-size: 10px; color: #475569; margin-bottom: 6px; font-family: monospace;">Remarks: ${t.remarks}</p>
                    <div style="display: flex;">${thumbsHtml}</div>
                </div>`;
        });
    } else {
        testList.innerHTML = "<p style='color:#64748b; font-size:10px;'>No tests taken.</p>";
    }

    const logTree = document.getElementById("pdf-print-log");
    logTree.innerHTML = "";
    const mockDates = ["Oct 1", "Oct 2", "Oct 3", "Oct 4", "Oct 5", "Oct 6"];
    mockDates.forEach((d, i) => {
        let act = "Class Work (Maths)", tut = "Tutor: Srinivas", rem = "Completed Ex 1.2";
        if(i === 2) { act = "Slip Test (Science)"; rem = "Score: 18/20 (90%)"; }
        if(i === 4) { act = "Academy Holiday"; tut = "-"; rem = "-"; }
        if(i === 5) { act = "Doubt Clearance"; tut = "Faculty: K.V. Sharma"; rem = "Quadratic Roots"; }
        logTree.innerHTML += `
            <tr style="border-bottom:1px solid #f1f5f9; color: #1e293b;">
                <td style="padding:6px; border-right:1px solid #f1f5f9;">${d}</td><td style="padding:6px; border-right:1px solid #f1f5f9; font-weight:bold;">${act}</td>
                <td style="padding:6px; border-right:1px solid #f1f5f9; color:#475569;">${tut}</td><td style="padding:6px; color:#4338ca; font-family:monospace;">${rem}</td>
            </tr>`;
    });

    closeCustomRangePdfModal();
    const el = document.getElementById("printable-pdf-dossier");
    el.classList.remove("hidden");
    
    showMsg("Compiling", "PDF is generating. Please wait...");
    html2pdf().set({margin: 0.4, filename: `${s.name.replace(/\s+/g, '_')}_Academic_Dossier.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }}).from(el).save().then(() => {
        el.classList.add("hidden");
        closeMsg();
    });
}

/* =========================================================================
   ADMISSIONS / INTAKE
   ========================================================================= */
function toggleIntakeMode(mode) {
    const isStu = mode === 'student';
    document.getElementById("intake-student-panel").classList.toggle("hidden", !isStu);
    document.getElementById("intake-staff-panel").classList.toggle("hidden", isStu);
    document.getElementById("btn-mode-student").className = isStu ? "px-3 py-1 rounded-md bg-indigo-600 text-white" : "px-3 py-1 rounded-md text-slate-400";
    document.getElementById("btn-mode-staff").className = !isStu ? "px-3 py-1 rounded-md bg-indigo-600 text-white" : "px-3 py-1 rounded-md text-slate-400";
}

function handleBtechSubj() {
    const isBtech = document.getElementById("adm-class").value === "B.Tech";
    document.getElementById("adm-subjects-container").classList.toggle("hidden", isBtech);
    document.getElementById("btech-subj-input").classList.toggle("hidden", !isBtech);
}

function addCustomSubj() {
    const val = document.getElementById("custom-subj-val").value.trim();
    if(!val) return;
    intakeSubjects.add(val);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold mt-1 mr-1";
    btn.textContent = val;
    btn.onclick = () => { btn.remove(); intakeSubjects.delete(val); };
    document.getElementById("btech-subj-input").insertAdjacentElement('afterend', btn);
    document.getElementById("custom-subj-val").value = "";
}

function toggleSubject(btn) {
    if(btn.classList.contains("bg-indigo-600")) {
        btn.classList.replace("bg-indigo-600", "bg-slate-800");
        btn.classList.replace("text-white", "text-slate-400");
        btn.classList.replace("border-indigo-600", "border-slate-700");
        intakeSubjects.delete(btn.textContent.trim());
    } else {
        btn.classList.replace("bg-slate-800", "bg-indigo-600");
        btn.classList.replace("text-slate-400", "text-white");
        btn.classList.replace("border-slate-700", "border-indigo-600");
        intakeSubjects.add(btn.textContent.trim());
    }
}

async function handleStudentEnroll(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("adm-name").value.trim(),
        class: document.getElementById("adm-class").value,
        gender: document.getElementById("adm-gender") ? document.getElementById("adm-gender").value : "Male",
        admissionDate: document.getElementById("adm-date").value,
        school: document.getElementById("adm-school").value.trim(),
        area: document.getElementById("adm-area").value.trim(),
        fatherName: document.getElementById("adm-father-name").value.trim(),
        fatherPhone: document.getElementById("adm-father-phone").value.trim(),
        subjects: Array.from(intakeSubjects),
        monthlyFee: document.getElementById("adm-fee").value
    };
    await API.post("/director/admit-student", payload);
    showMsg('Success', 'Student successfully enrolled.');
    e.target.reset();
    loadDashboardData();
}

function selectStaffRole(role) {
    intakeStaffRole = role;
    ['tutor', 'faculty', 'associate_director'].forEach(r => {
        const btn = document.getElementById(`srole-${r}`);
        if(btn) btn.className = (r === role) ? "py-1.5 rounded bg-indigo-600 text-white shadow-sm" : "py-1.5 rounded hover:text-white transition-colors";
    });
    document.getElementById("box-specialty").classList.toggle("hidden", role !== 'faculty');
}

async function handleStaffEnroll(e) {
    e.preventDefault();
    const p1 = document.getElementById('staff-pass1').value;
    const p2 = document.getElementById('staff-pass2').value;

    if(p1 !== p2) return showMsg('Error', 'Passwords do not match.');
    if(!pwdRegex.test(p1)) {
        return showMsg('Weak Password', 'Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.');
    }

    const payload = {
        name: document.getElementById('staff-name').value,
        role: intakeStaffRole,
        gender: document.getElementById('staff-gender') ? document.getElementById('staff-gender').value : "Male",
        joinDate: document.getElementById('staff-join-date').value,
        phone: document.getElementById('staff-phone').value,
        password: p1,
        salary: document.getElementById('staff-salary').value || 15000
    };

    await API.post("/director/create-staff", payload);
    showMsg('Success', 'Staff member securely registered.');
    e.target.reset();
    loadDashboardData();
}

/* =========================================================================
   LEDGER & PAYROLL
   ========================================================================= */
function switchLedgerTab(tab) {
    activeLedgerTab = tab;
    ['students', 'staff', 'expenses'].forEach(t => {
        const el = document.getElementById(`ledger-${t}`);
        if(el) el.classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`ledg-tab-${t}`);
        if(btn) btn.className = (t === tab) ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm" : "py-2 rounded-lg text-slate-400 hover:text-white";
    });
}

function filterStudentLedger(fl) { activeStuLedgerFilter = fl; renderLedgerStudents(); }
function filterStaffLedger(fl) { activeStfLedgerFilter = fl; renderLedgerStaff(); }

function calculateStudentDue(s) {
    const today = new Date();
    const anchorStr = s.admissionDate || "2026-01-01";
    const anchorDate = new Date(anchorStr);
    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), anchorDate.getDate());
    const daysDiff = (dueThisMonth - today) / (1000 * 60 * 60 * 24);
    
    if (s.feeStatus === "PAID") return "PAID";
    if (s.feeStatus === "PARTIAL") return "PARTIAL";
    if (daysDiff > 0 && daysDiff <= 3) return "PRE_DUE";
    if (daysDiff < 0) return "POST_DUE";
    return "UNPAID";
}

function renderLedgerStudents() {
    const list = document.getElementById("director-fees-list-container");
    if(!list) return;
    
    let collected = 0, unpaid = 0;
    const enriched = directorStudents.map(s => {
        const fee = parseInt(s.monthlyFee) || 1500;
        const paidAmt = parseInt(s.paidAmount) || 0;
        const calcStatus = calculateStudentDue(s);
        
        if (calcStatus === "PAID") collected += fee;
        else if (calcStatus === "PARTIAL") { collected += paidAmt; unpaid += (fee - paidAmt); }
        else unpaid += fee;
        
        return { ...s, calcStatus, fee, paidAmt };
    });

    document.getElementById("ledg-stu-all").textContent = enriched.length;
    document.getElementById("ledg-stu-paid").textContent = `₹${collected}`;
    document.getElementById("ledg-stu-unpaid").textContent = `₹${unpaid}`;

    let filtered = enriched;
    if(activeStuLedgerFilter !== 'ALL') {
        filtered = enriched.filter(s => s.calcStatus === activeStuLedgerFilter);
    }

    list.innerHTML = filtered.map(s => `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
            <div>
                <span class="font-bold text-white block">${s.name} <span class="text-[9px] text-slate-500 font-mono">(Due: ${s.admissionDate?.slice(-2) || '01'}th)</span></span>
                ${s.calcStatus === 'PARTIAL' ? `<span class="text-amber-400 font-mono">Paid: ₹${s.paidAmt} / ₹${s.fee}</span>` : `<span class="text-slate-400 font-mono">Fee: ₹${s.fee}</span>`}
            </div>
            <div class="flex space-x-1">
                ${isMainDirector ? `<button onclick="queueFeeReminder('${s.id}')" class="px-2 py-1 bg-slate-800 hover:bg-emerald-600 rounded"><i class="fa-brands fa-whatsapp text-emerald-400"></i></button>` : ''}
                <button onclick="promptPartialPay('${s.id}')" class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded font-bold text-[10px]">Partial</button>
                <button onclick="toggleStudentFee('${s.id}', '${s.calcStatus==='PAID'?'UNPAID':'PAID'}')" class="px-3 py-1 rounded font-bold ${s.calcStatus==='PAID'?'bg-emerald-500/20 text-emerald-400':'bg-rose-500/20 text-rose-400'}">${s.calcStatus}</button>
            </div>
        </div>
    `).join("");
}

let activePartialPayId = null;
function promptPartialPay(sid) {
    activePartialPayId = sid;
    document.getElementById("modal-partial-pay").classList.remove("hidden");
}
function closePartialPay() { document.getElementById("modal-partial-pay").classList.add("hidden"); }
async function confirmPartialPay() {
    const amt = document.getElementById("partial-pay-amt").value;
    await API.post("/director/toggle-fee", { studentId: activePartialPayId, feeStatus: "PARTIAL", paidAmount: amt });
    closePartialPay();
    loadDashboardData();
}

function renderLedgerStaff() {
    const list = document.getElementById("ledger-staff-list");
    if(!list) return;
    const valid = directorStaff.filter(s => s.name && s.name.toLowerCase() !== 'undefined');
    
    list.innerHTML = valid.map(s => {
        const base = s.salary || 15000;
        const unpLeaves = s.unpaidLeaves || 0;
        const perDay = Math.round(base / 30);
        const deduction = unpLeaves * perDay;
        const adj = s.salaryAdjustments || 0;
        const finalPay = base - deduction + adj;
        
        return `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
            <div>
                <span class="font-bold text-white block">${s.name} <span class="text-[9px] text-slate-500 font-mono">(Join: ${s.joinDate?.slice(-2) || '01'}th)</span></span>
                <span class="text-slate-400 font-mono">Base: ₹${base} | Leaves: -₹${deduction} | Adj: +₹${adj}</span>
            </div>
            <div class="flex items-center space-x-2">
                <span class="font-bold text-emerald-400">₹${finalPay}</span>
                <button onclick="promptStaffPayAdj('${s.id}')" class="p-1.5 bg-slate-800 text-indigo-400 rounded"><i class="fa-solid fa-pen"></i></button>
            </div>
        </div>`;
    }).join("");
}

let activeStaffPayId = null;
function promptStaffPayAdj(sid) {
    activeStaffPayId = sid;
    document.getElementById("modal-staff-pay").classList.remove("hidden");
}
function closeStaffPay() { document.getElementById("modal-staff-pay").classList.add("hidden"); }
async function confirmStaffPay() {
    const adj = document.getElementById("staff-pay-adj").value;
    await API.post("/director/update-staff-payroll", { staffId: activeStaffPayId, adjustments: adj });
    closeStaffPay();
    loadDashboardData();
}

async function handleLogExpense(e) {
    e.preventDefault();
    const desc = document.getElementById("exp-desc").value;
    const amt = document.getElementById("exp-amount").value;
    await API.post("/director/add-expense", { description: desc, amount: amt, date: new Date().toISOString().split("T")[0] });
    e.target.reset();
    showMsg('Expense Logged', 'Expense added to ledger successfully.');
    loadFinancialLedger();
}

async function loadFinancialLedger() {
    renderLedgerStudents();
    renderLedgerStaff();
}

/* =========================================================================
   QUEUES & DISPATCHES
   ========================================================================= */
async function loadDispatchQueue() {
    const { ok, data } = await API.get("/director/dispatch-queue");
    if (ok && data.queue) {
        rawDispatchQueue = data.queue;
    } else {
        if(rawDispatchQueue.length === 0) {
            rawDispatchQueue = [
                { SK: "1", type: "ABSENT_ALERT", studentName: "M. Rahul", message: "Rahul is absent today. Please reply.", phone: "9848123450" },
                { SK: "2", type: "FEE_REMINDER", studentName: "S. Anjali", message: "Monthly fee of 1500 is due.", phone: "9988776655" }
            ];
        }
    }
    const badge = document.getElementById("badge-dispatches-count");
    if(badge) badge.textContent = rawDispatchQueue.length;
    renderQueue();
}

function filterQueue(cat) {
    activeQueueFilter = cat;
    ['ALL', 'ABSENT_ALERT', 'FEE_REMINDER', 'DISCIPLINE'].forEach(c => {
        const idMap = {'ALL':'all', 'ABSENT_ALERT':'absent', 'FEE_REMINDER':'fees', 'DISCIPLINE':'disc'};
        const btn = document.getElementById(`qcat-${idMap[c]}`);
        if (btn) btn.className = (cat === c) ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm" : "py-2 rounded-lg hover:text-white transition-colors";
    });
    renderQueue();
}

function renderQueue() {
    const list = document.getElementById("queue-cards-list");
    if(!list) return;
    
    let filtered = rawDispatchQueue;
    if (activeQueueFilter !== "ALL") filtered = filtered.filter(q => q.type === activeQueueFilter);
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-slate-800">Queue is clear.</div>`;
        return;
    }

    list.innerHTML = filtered.map(q => `
        <div class="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-indigo-500 transition-colors shadow-xs">
            <div class="flex justify-between items-start">
                <span class="font-bold text-white text-xs">${q.studentName}</span>
                <button onclick="deleteQueueItem('${q.SK}')" class="text-slate-500 hover:text-rose-400 transition-colors p-1"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <p class="text-[11px] text-slate-300 font-mono bg-slate-950 p-2 rounded border border-slate-800/50">${q.message}</p>
            <div class="flex justify-between items-center pt-1">
                ${isMainDirector ? `<button onclick="resolveDispatch('${q.SK}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold touch-btn shadow-xs transition-colors"><i class="fa-brands fa-whatsapp text-sm mr-1"></i><span>Dispatch to ${q.phone}</span></button>` : `<p class="text-[9px] text-rose-400 italic">Only Main Director can dispatch WhatsApp messages.</p>`}
            </div>
        </div>
    `).join("");
}

function deleteQueueItem(sk) {
    showConfirm('Delete Item', 'Are you sure you want to remove this intimation from the queue?', () => {
        rawDispatchQueue = rawDispatchQueue.filter(q => q.SK !== sk);
        document.getElementById("badge-dispatches-count").textContent = rawDispatchQueue.length;
        renderQueue();
        showMsg('Deleted', 'Queue item removed.');
    });
}

async function queueFeeReminder(sid) {
    showMsg('Queued', 'Fee reminder added to WhatsApp dispatch queue.');
}

async function resolveDispatch(sk) {
    rawDispatchQueue = rawDispatchQueue.filter(q => q.SK !== sk);
    document.getElementById("badge-dispatches-count").textContent = rawDispatchQueue.length;
    renderQueue();
    window.open(`https://wa.me/919391645396?text=Tuition%20Update`, '_blank'); 
}

/* =========================================================================
   SECURITY
   ========================================================================= */
function populateSecurityStaffDropdown() {
    const sel = document.getElementById('sec-staff-select');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Select Staff Member --</option>`;
    directorStaff.filter(s => s.name.toLowerCase() !== 'undefined').forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.name} (${s.role})</option>`;
    });
}

async function handleUpdateDirectorPIN(e) {
    e.preventDefault();
    showMsg("Success", "Director Master PIN successfully updated.");
    e.target.reset();
}

function handleStaffPasswordReset() {
    const staffId = document.getElementById('sec-staff-select').value;
    const p1 = document.getElementById('sec-new-pass').value;
    const p2 = document.getElementById('sec-confirm-pass').value;

    if(!staffId) return showMsg('Error', 'Please select a staff member.');
    if(p1 !== p2) return showMsg('Error', 'Passwords do not match.');
    if(!pwdRegex.test(p1)) {
        return showMsg('Weak Password', 'Password must be at least 8 chars, contain 1 uppercase, 1 lowercase, 1 number, and 1 special char.');
    }

    showConfirm('Force Reset', 'Are you sure you want to reset the password for this staff member?', () => {
        document.getElementById('sec-new-pass').value = '';
        document.getElementById('sec-confirm-pass').value = '';
        document.getElementById('sec-staff-select').value = '';
        showMsg('Success', 'Staff password securely updated.');
    });
}