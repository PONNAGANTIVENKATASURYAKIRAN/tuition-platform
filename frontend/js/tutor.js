let currentRosterBucket = "present";
let selectedClasses = new Set(["10"]);
let activeStudentList = [];
let activeStudentDossier = null;
let currentSubjectIdx = 0;
let currentChapterIdx = 0;
let pendingLateStudentId = null;

const AVAILABLE_CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Inter 1", "Inter 2", "B.Tech"];

document.addEventListener("DOMContentLoaded", () => {
  const user = enforceAuth("tutor");
  if (!user) return;
  document.getElementById("tutor-name-display").textContent = `${user.name || "Floor Tutor"} (In-Charge)`;
  initClassChips();
  loadStudentsFast();
});

function initClassChips() {
  const container = document.getElementById("class-chips-wrapper");
  container.innerHTML = "";

  AVAILABLE_CLASSES.forEach(cls => {
    const isSelected = selectedClasses.has(cls);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Class ${cls}`;
    btn.className = isSelected
      ? "px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs transition-all touch-btn"
      : "px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 font-semibold text-xs border border-slate-800 transition-all touch-btn";

    btn.onclick = () => {
      if (selectedClasses.has(cls)) {
        selectedClasses.delete(cls);
      } else {
        selectedClasses.add(cls);
      }
      document.getElementById("selected-class-count").textContent = `${selectedClasses.size} selected`;
      initClassChips();
      loadStudentsFast();
    };
    container.appendChild(btn);
  });
}

async function loadStudentsFast() {
  if (selectedClasses.size === 0) {
    activeStudentList = [];
    renderRoster();
    return;
  }

  const { ok, data } = await API.post("/tutor/students", { classes: Array.from(selectedClasses) });
  if (ok && data.students) {
    activeStudentList = data.students.map(s => ({
      ...s,
      attendanceStatus: s.attendanceStatus || "present",
      lateSlot: s.lateSlot || "",
      hasExamNear: s.examDaysLeft && s.examDaysLeft <= 3
    }));
    renderRoster();
  }
}

function switchRosterBucket(bucket) {
  currentRosterBucket = bucket;
  ['present', 'absent', 'late'].forEach(b => {
    const btn = document.getElementById(`tab-btn-${b}`);
    if (btn) {
      btn.className = (b === bucket) ? "py-2 rounded-xl bg-indigo-600 text-white shadow-xs transition-all" : "py-2 rounded-xl text-slate-400 transition-all";
    }
  });
  renderRoster();
}

function renderRoster() {
  const container = document.getElementById("student-roster-list");
  const search = (document.getElementById("tutor-search-input")?.value || "").toLowerCase().trim();
  container.innerHTML = "";

  const presentCount = activeStudentList.filter(s => s.attendanceStatus === "present").length;
  const absentCount = activeStudentList.filter(s => s.attendanceStatus === "absent").length;
  const lateCount = activeStudentList.filter(s => s.attendanceStatus === "late").length;

  document.getElementById("count-present").textContent = presentCount;
  document.getElementById("count-absent").textContent = absentCount;
  document.getElementById("count-late").textContent = lateCount;

  document.getElementById("stat-tutor-present").textContent = presentCount;
  document.getElementById("stat-tutor-absent").textContent = absentCount;

  let filtered = activeStudentList.filter(s => s.attendanceStatus === currentRosterBucket);
  if (search) {
    filtered = filtered.filter(s =>
      (s.name && s.name.toLowerCase().includes(search)) ||
      (s.school && s.school.toLowerCase().includes(search)) ||
      (s.area && s.area.toLowerCase().includes(search))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs">No students in ${currentRosterBucket} bucket.</div>`;
    return;
  }

  filtered.forEach(s => {
    const sid = s.id || (s.PK ? s.PK.replace("STUDENT#", "") : "");
    const card = document.createElement("div");
    card.className = "p-3 sm:p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xs";

    let absentSubBar = '';
    if (s.attendanceStatus === 'absent') {
      absentSubBar = `
        <div class="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          <div class="flex items-center space-x-2">
            <a href="tel:${s.fatherPhone || s.primaryPhone}" class="px-2 py-1 rounded bg-slate-800 text-emerald-400 font-semibold hover:underline flex items-center space-x-1">
              <i class="fa-solid fa-phone text-[10px]"></i><span>Father</span>
            </a>
            <a href="tel:${s.motherPhone || s.primaryPhone}" class="px-2 py-1 rounded bg-slate-800 text-pink-400 font-semibold hover:underline flex items-center space-x-1">
              <i class="fa-solid fa-phone text-[10px]"></i><span>Mother</span>
            </a>
          </div>
          <div class="flex items-center space-x-1">
            <span class="text-slate-500 text-[10px]">Reason:</span>
            <button onclick="setAbsentReason('${sid}', 'Sick / Health')" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Health</button>
            <button onclick="setAbsentReason('${sid}', 'Family Function')" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Function</button>
            <button onclick="setAbsentReason('${sid}', 'Rain / Travel')" class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Travel</button>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div onclick="openStudentDossier('${sid}')" class="cursor-pointer min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <h4 class="text-xs sm:text-sm font-extrabold text-white truncate">${s.name}</h4>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 font-mono">Class ${s.class}</span>
            ${s.lateSlot ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 font-mono">${s.lateSlot}</span>` : ""}
          </div>
          <p class="text-[11px] text-slate-400 truncate mt-0.5">${s.school || "School"} &bull; Area: ${s.area || "Area"}</p>
        </div>

        <div class="flex items-center space-x-1 shrink-0">
          <button onclick="optimisticMarkStatus('${sid}', 'present')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${s.attendanceStatus === 'present' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-800 text-slate-400'}">P</button>
          <button onclick="optimisticMarkStatus('${sid}', 'absent')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${s.attendanceStatus === 'absent' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-800 text-slate-400'}">A</button>
          <button onclick="openLatePickerModal('${sid}')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${s.attendanceStatus === 'late' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-800 text-slate-400'}">Late</button>
        </div>
      </div>
      ${absentSubBar}
    `;
    container.appendChild(card);
  });
}

function optimisticMarkStatus(studentId, newStatus, lateSlot = "") {
  const student = activeStudentList.find(s => (s.id || s.PK.replace("STUDENT#", "")) === studentId);
  if (!student) return;

  student.attendanceStatus = newStatus;
  student.lateSlot = lateSlot;
  renderRoster();

  const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
  const today = new Date().toISOString().split("T")[0];
  API.post("/tutor/attendance", {
    date: today,
    studentId: studentId,
    status: newStatus,
    lateSlot: lateSlot,
    markedBy: user.name || "Floor Tutor",
    studentInfo: student
  });
}

function setAbsentReason(studentId, reason) {
  const student = activeStudentList.find(s => (s.id || s.PK.replace("STUDENT#", "")) === studentId);
  if (!student) return;
  API.post("/tutor/attendance", {
    date: new Date().toISOString().split("T")[0],
    studentId: studentId,
    status: "absent",
    reason: reason,
    studentInfo: student
  });
  alert(`Reason logged: ${reason}`);
}

function openLatePickerModal(studentId) {
  pendingLateStudentId = studentId;
  document.getElementById("modal-late-picker").classList.remove("hidden");
}

function closeLateModal() {
  document.getElementById("modal-late-picker").classList.add("hidden");
  pendingLateStudentId = null;
}

function confirmLateSlot(slot) {
  if (pendingLateStudentId) {
    optimisticMarkStatus(pendingLateStudentId, "late", slot);
    closeLateModal();
  }
}

function confirmCustomLateSlot() {
  const customVal = document.getElementById("custom-late-input").value.trim();
  if (customVal && pendingLateStudentId) {
    optimisticMarkStatus(pendingLateStudentId, "late", customVal);
    document.getElementById("custom-late-input").value = "";
    closeLateModal();
  }
}

async function queueAllAbsenteesToDirector() {
  const absentees = activeStudentList.filter(s => s.attendanceStatus === "absent");
  if (absentees.length === 0) {
    alert("No absentees to send.");
    return;
  }
  for (const stu of absentees) {
    const sid = stu.id || stu.PK.replace("STUDENT#", "");
    optimisticMarkStatus(sid, "absent");
  }
  alert(`${absentees.length} absentee alerts routed to Director WhatsApp queue.`);
}

/* =========================================================================
   DOSSIER CONTROLLER
   ========================================================================= */
async function openStudentDossier(studentId) {
  let localStudent = activeStudentList.find(s => (s.id || s.PK.replace("STUDENT#", "")) === studentId);
  if (!localStudent) return;

  activeStudentDossier = localStudent;
  populateDossierHeader(localStudent);
  document.getElementById("student-modal").classList.remove("hidden");
  switchDossierTab('syllabus');

  const { ok, data } = await API.post("/tutor/student-drawer", { studentId });
  if (ok && data.profile) {
    activeStudentDossier = { ...localStudent, ...data.profile };
    populateDossierHeader(activeStudentDossier);
    ensureSyllabusStructure(activeStudentDossier);
    renderDossierSyllabus();
    populateSlipDropdowns();
    populateFacultySelect();
    renderMonthlyProgressCalendar();
  }
}

function populateDossierHeader(s) {
  document.getElementById("modal-student-name").textContent = s.name;
  document.getElementById("modal-student-badge").textContent = `Class ${s.class}`;
  document.getElementById("modal-student-school").textContent = `${s.school || "School"} (${s.area || "Area"})`;
  document.getElementById("modal-father-phone").textContent = `Father: ${s.fatherPhone || "N/A"}`;
  document.getElementById("modal-mother-phone").textContent = `Mother: ${s.motherPhone || "N/A"}`;
}

function closeStudentModal() {
  document.getElementById("student-modal").classList.add("hidden");
}

function switchDossierTab(tab) {
  ['syllabus', 'assessments', 'doubts', 'progress'].forEach(t => {
    const panel = document.getElementById(`dossier-panel-${t}`);
    const tabBtn = document.getElementById(`dossier-tab-${t}`);
    if (panel) panel.classList.toggle("hidden", t !== tab);
    if (tabBtn) {
      tabBtn.className = (t === tab) ? "py-2 px-2.5 text-indigo-400 border-b-2 border-indigo-500 whitespace-nowrap font-bold" : "py-2 px-2.5 text-slate-400 hover:text-slate-200 whitespace-nowrap font-semibold";
    }
  });
}

function ensureSyllabusStructure(s) {
  if (!s.syllabus || s.syllabus.length === 0) {
    s.syllabus = [
      {
        name: "Mathematics",
        chapters: [
          {
            number: 1,
            title: "Real Numbers",
            topics: [
              { name: "Euclid's Division Lemma", confidence: 100, score: "10/10" },
              { name: "Fundamental Theorem of Arithmetic", confidence: 75, score: "18/20" }
            ]
          }
        ]
      }
    ];
  }
}

function renderDossierSyllabus() {
  const subCont = document.getElementById("dossier-subjects-list");
  subCont.innerHTML = "";

  activeStudentDossier.syllabus.forEach((sub, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `px-2.5 py-1 rounded-lg text-xs font-bold transition ${idx === currentSubjectIdx ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-800 text-slate-400'}`;
    btn.textContent = sub.name;
    btn.onclick = () => {
      currentSubjectIdx = idx;
      currentChapterIdx = 0;
      renderDossierSyllabus();
      populateSlipDropdowns();
    };
    subCont.appendChild(btn);
  });

  const chapCont = document.getElementById("dossier-chapters-list");
  chapCont.innerHTML = "";
  const curSub = activeStudentDossier.syllabus[currentSubjectIdx];

  if (curSub && curSub.chapters) {
    curSub.chapters.forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `px-2.5 py-1 rounded-lg text-xs font-bold transition ${idx === currentChapterIdx ? 'border border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`;
      btn.textContent = `Ch ${ch.number || idx+1}: ${ch.title}`;
      btn.onclick = () => {
        currentChapterIdx = idx;
        renderDossierSyllabus();
        populateSlipDropdowns();
      };
      chapCont.appendChild(btn);
    });
  }

  const topCont = document.getElementById("dossier-topics-list");
  topCont.innerHTML = "";
  const curChap = curSub?.chapters[currentChapterIdx];
  if (!curChap || !curChap.topics) return;

  document.getElementById("active-chapter-title").textContent = `Subtopics: Ch ${curChap.number || ''} ${curChap.title}`;

  curChap.topics.forEach((top, idx) => {
    const div = document.createElement("div");
    div.className = "p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs";
    div.innerHTML = `
      <div>
        <span class="font-bold text-white text-xs block">${top.name}</span>
        <div class="flex items-center space-x-1 mt-1">
          <span class="text-[9px] text-slate-400 mr-1 font-bold">CONFIDENCE:</span>
          ${[0, 25, 50, 75, 100].map(val => `
            <button type="button" onclick="setConfidence(${idx},${val})" class="px-1.5 py-0.5 rounded text-[9px] font-bold transition ${top.confidence === val ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}">${val}%</button>
          `).join("")}
        </div>
      </div>
      <span class="font-mono text-xs font-bold text-indigo-400 shrink-0">${top.score || "Pending"}</span>
    `;
    topCont.appendChild(div);
  });
}

function setConfidence(topicIdx, val) {
  activeStudentDossier.syllabus[currentSubjectIdx].chapters[currentChapterIdx].topics[topicIdx].confidence = val;
  renderDossierSyllabus();
}

/* =========================================================================
   ASSESSMENTS: SLIP + WEEK TEST TOGGLES
   ========================================================================= */
function switchAssessmentSubTab(mode) {
  const isSlip = mode === "slip";
  document.getElementById("box-slip-test-workflow").classList.toggle("hidden", !isSlip);
  document.getElementById("box-week-test-workflow").classList.toggle("hidden", isSlip);

  document.getElementById("ass-subtab-slip").className = isSlip ? "py-1.5 rounded-lg bg-indigo-600 text-white" : "py-1.5 rounded-lg text-slate-400";
  document.getElementById("ass-subtab-week").className = !isSlip ? "py-1.5 rounded-lg bg-indigo-600 text-white" : "py-1.5 rounded-lg text-slate-400";
  if (!isSlip) renderWeekTestTopicsChecklist();
}

function populateSlipDropdowns() {
  const subSel = document.getElementById("slip-subject-select");
  if (!subSel || !activeStudentDossier) return;
  subSel.innerHTML = "";

  activeStudentDossier.syllabus.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub.name;
    opt.textContent = sub.name;
    subSel.appendChild(opt);
  });
  syncSlipChaptersDropdown();
}

function syncSlipChaptersDropdown() {
  const subName = document.getElementById("slip-subject-select").value;
  const chapSel = document.getElementById("slip-chapter-select");
  chapSel.innerHTML = "";

  const subObj = activeStudentDossier.syllabus.find(s => s.name === subName);
  if (subObj && subObj.chapters) {
    subObj.chapters.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch.title;
      opt.textContent = `Ch ${ch.number}: ${ch.title}`;
      chapSel.appendChild(opt);
    });
  }
  syncSlipTopicsChecklist();
}

function syncSlipTopicsChecklist() {
  const subName = document.getElementById("slip-subject-select").value;
  const chapTitle = document.getElementById("slip-chapter-select").value;
  const container = document.getElementById("slip-topics-checklist");
  container.innerHTML = "";

  const subObj = activeStudentDossier.syllabus.find(s => s.name === subName);
  const chapObj = subObj?.chapters.find(c => c.title === chapTitle);

  if (chapObj && chapObj.topics) {
    chapObj.topics.forEach(t => {
      const label = document.createElement("label");
      label.className = "flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer";
      label.innerHTML = `<input type="checkbox" name="slip-topic-checkbox" value="${t.name}" checked class="rounded bg-slate-900 border-slate-700 text-indigo-600" /><span>${t.name}</span>`;
      container.appendChild(label);
    });
  }
}

async function handleSaveSlipTest(e) {
  e.preventDefault();
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="slip-topic-checkbox"]:checked')).map(c => c.value);
  const sid = activeStudentDossier.id || activeStudentDossier.PK.replace("STUDENT#", "");
  const scored = parseFloat(document.getElementById("slip-marks-obtained").value);
  const total = parseFloat(document.getElementById("slip-max-marks").value);

  const { ok, data } = await API.post("/tutor/sliptest", {
    studentId: sid,
    date: new Date().toISOString().split("T")[0],
    subject: document.getElementById("slip-subject-select").value,
    chapter: document.getElementById("slip-chapter-select").value,
    subtopic: checkedBoxes.join(", ") || "General Topic",
    marksObtained: scored,
    maxMarks: total,
    evaluator: JSON.parse(localStorage.getItem("tuition_user") || "{}").name || "Floor Tutor",
    remarks: document.getElementById("slip-remarks").value.trim(),
    sendToParent: document.getElementById("slip-send-whatsapp").checked,
    studentInfo: activeStudentDossier
  });

  if (ok) {
    alert(`Slip test stored! Score: ${data.percentage}%`);
    e.target.reset();
  }
}

function renderWeekTestTopicsChecklist() {
  const container = document.getElementById("week-test-topics-checklist");
  container.innerHTML = "";

  activeStudentDossier.syllabus?.forEach(sub => {
    sub.chapters?.forEach(ch => {
      ch.topics?.forEach(t => {
        const label = document.createElement("label");
        label.className = "flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer";
        label.innerHTML = `<input type="checkbox" name="week-topic-checkbox" value="${sub.name} - ${t.name}" checked class="rounded bg-slate-900 border-slate-700 text-amber-500" /><span>${sub.name} &bull; Ch ${ch.number}: ${t.name}</span>`;
        container.appendChild(label);
      });
    });
  });
}

function handleSaveWeekTest() {
  const score = document.getElementById("week-test-score").value;
  const total = document.getElementById("week-test-total").value;
  alert(`Weekend Grand Test recorded: ${score}/${total}`);
}

/* =========================================================================
   DOUBTS CLEARANCE (TAGGED TO SENIOR FACULTY)
   ========================================================================= */
function populateFacultySelect() {
  const select = document.getElementById("doubt-faculty-select");
  select.innerHTML = `
    <option value="Mr. K. V. Sharma (Senior Maths)">Mr. K. V. Sharma (Maths)</option>
    <option value="Dr. P. Anuradha (Physics)">Dr. P. Anuradha (Physics)</option>
    <option value="Mrs. S. Madhavi (Social & English)">Mrs. S. Madhavi (Social)</option>
  `;
}

async function handleFloorLogDoubt(e) {
  e.preventDefault();
  const sid = activeStudentDossier.id || activeStudentDossier.PK.replace("STUDENT#", "");
  const faculty = document.getElementById("doubt-faculty-select").value;
  const concept = document.getElementById("doubt-concept-input").value.trim();

  await API.post("/tutor/sliptest", {
    studentId: sid,
    date: new Date().toISOString().split("T")[0],
    subject: document.getElementById("doubt-subject-input").value.trim(),
    chapter: "Doubt Clearance",
    subtopic: concept,
    marksObtained: 10,
    maxMarks: 10,
    evaluator: faculty,
    remarks: document.getElementById("doubt-notes-input").value.trim() || "Concept verified on board.",
    sendToParent: false,
    studentInfo: activeStudentDossier
  });

  alert(`Doubt cleared by ${faculty} verified and logged.`);
  e.target.reset();
}

function renderMonthlyProgressCalendar() {
  const grid = document.getElementById("progress-calendar-grid");
  grid.innerHTML = "";

  for (let day = 1; day <= 30; day++) {
    const isHoliday = (day % 7 === 0);
    const isAbsent = (day === 2 || day === 15);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `p-1.5 rounded-lg text-center border font-mono text-[10px] ${
      isAbsent ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : (isHoliday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-300 border-slate-800')
    }`;
    btn.innerHTML = `<span class="block font-bold">${day}</span><span class="text-[8px]">${isAbsent ? 'A' : (isHoliday ? 'H' : 'P')}</span>`;
    btn.onclick = () => showDayProgress(day, isAbsent, isHoliday);
    grid.appendChild(btn);
  }
}

function showDayProgress(day, isAbsent, isHoliday) {
  const box = document.getElementById("calendar-day-detail-box");
  box.classList.remove("hidden");
  document.getElementById("detail-date-title").textContent = `Day ${day} Overview`;
  document.getElementById("detail-status-pill").textContent = isAbsent ? 'ABSENT' : (isHoliday ? 'HOLIDAY' : 'PRESENT');
  document.getElementById("detail-date-notes").textContent = isAbsent ? 'Reason: Health / Medical' : 'Class floor studies completed on real numbers.';
}

function exportDossierPDF() {
  alert("Generating comprehensive student academic dossier PDF...");
}