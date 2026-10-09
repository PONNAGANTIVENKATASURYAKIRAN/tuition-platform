window.currentRosterBucket = 'ALL';
window.activeStudentList = [];
window.activeHolidays = [];

window.initTutorFloor = function() {
    window.loadStudentsFast();
};

window.calculateAverageScore = function(student) {
    const exams = student.exams || [];
    const slipTests = student.slipTests || [];
    let allPcts = [];
    
    exams.forEach(ex => {
        const max = parseFloat(ex.total || 0);
        const sc = parseFloat(ex.scored || 0);
        if (max > 0) allPcts.push((sc / max) * 100);
    });
    
    slipTests.forEach(st => {
        const max = parseFloat(st.maxMarks || 0);
        const sc = parseFloat(st.marksObtained || 0);
        if (max > 0) allPcts.push((sc / max) * 100);
    });
    
    if (allPcts.length === 0) return { avg: 0, tier: "NEEDS_HELP", label: "No Tests Logged", colorClass: "text-slate-400 bg-slate-800 border-slate-700" };
    
    const sum = allPcts.reduce((acc, val) => acc + val, 0);
    const avg = Math.round(sum / allPcts.length);
    let tier = "NEEDS_HELP";
    let label = `Needs Help (< 50%)`;
    let colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30";
    
    if (avg >= 90) {
        tier = "PERFECT";
        label = `Perfect (${avg}%)`;
        colorClass = "text-cyan-300 bg-cyan-500/20 border-cyan-500/40 shadow-sm shadow-cyan-500/20";
    } else if (avg >= 75) {
        tier = "EXCELLENT";
        label = `Excellent (${avg}%)`;
        colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    } else if (avg >= 50) {
        tier = "AVERAGE";
        label = `Average (${avg}%)`;
        colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    } else {
        label = `Needs Help (${avg}%)`;
    }
    return { avg, tier, label, colorClass };
};

window.calculateLatenessDelta = function(expectedTimeStr, actualTimeStr) {
    if (!expectedTimeStr || !actualTimeStr) return null;
    const [expH, expM] = expectedTimeStr.split(":").map(Number);
    const [actH, actM] = actualTimeStr.split(":").map(Number);
    const diff = (actH * 60 + actM) - (expH * 60 + expM);
    return diff > 0 ? diff : 0;
};

window.handleTutorClassChange = function() {
    const cls = document.getElementById("filter-tutor-class").value;
    const boardSel = document.getElementById("filter-tutor-board");
    if (!boardSel) return;
    
    boardSel.innerHTML = "";
    if (cls === "ALL") {
        boardSel.innerHTML = `
            <option value="ALL">All Boards / Streams</option>
            <option value="SSC">SSC (State Board)</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="MPC">MPC</option>
            <option value="BiPC">BiPC</option>
            <option value="MEC">MEC</option>
            <option value="CEC">CEC</option>
        `;
        boardSel.disabled = false;
        boardSel.classList.remove("opacity-50");
    } else if (cls.includes("Inter")) {
        boardSel.innerHTML = `
            <option value="ALL">All Streams</option>
            <option value="MPC">MPC</option>
            <option value="BiPC">BiPC</option>
            <option value="MEC">MEC</option>
            <option value="CEC">CEC</option>
        `;
        boardSel.disabled = false;
        boardSel.classList.remove("opacity-50");
    } else if (cls === "B.Tech") {
        boardSel.innerHTML = `<option value="ALL">Not Applicable for B.Tech</option>`;
        boardSel.disabled = true;
        boardSel.classList.add("opacity-50");
    } else {
        boardSel.innerHTML = `
            <option value="ALL">All Boards</option>
            <option value="SSC">SSC (State Board)</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
        `;
        boardSel.disabled = false;
        boardSel.classList.remove("opacity-50");
    }
    window.renderRoster();
};

window.loadStudentsFast = async function() {
    const { ok, data } = await API.get("/dashboard/master-data");
    if (ok && data.students) {
        window.activeStudentList = data.students.map(s => ({
            ...s,
            attendanceStatus: s.attendanceStatus || "unmarked",
            lateSlot: s.lateSlot || "",
            remarks: s.remarks || "",
            scoreMetrics: window.computeScoreMetrics(s)
        }));
        window.activeHolidays = data.holidays || [];
    }
    window.renderRoster();
};

window.switchRosterBucket = function(bucket) {
    window.currentRosterBucket = bucket;
    ['ALL', 'present', 'absent', 'late', 'early leave', 'unmarked'].forEach(b => {
        const idFriendly = b.replace(' ', '');
        const btn = document.getElementById(`tab-btn-${idFriendly}`);
        if (btn) {
            btn.className = (b === bucket) ? `px-4 py-2 rounded-xl ${b === 'unmarked' ? 'bg-rose-600 border-rose-500' : 'bg-indigo-600 border-indigo-500'} text-white shadow-md transition-colors border` : "px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:text-white transition-colors text-slate-400";
        }
    });
    window.renderRoster();
};

window.renderRoster = function() {
    const container = document.getElementById("student-roster-list");
    if(!container) return;
    
    const search = (document.getElementById("tutor-search-input")?.value || "").toLowerCase().trim();
    const classF = document.getElementById("filter-tutor-class")?.value || "ALL";
    const boardF = document.getElementById("filter-tutor-board")?.value || "ALL";
    const genderF = document.getElementById("filter-tutor-gender")?.value || "ALL";
    const pctF = document.getElementById("filter-tutor-percentage")?.value || "ALL";
    
    container.innerHTML = "";
    
    let validStudents = window.activeStudentList.filter(s => s.status !== 'LEFT_TUITION');
    
    if(document.getElementById("stat-tutor-present")) document.getElementById("stat-tutor-present").textContent = validStudents.filter(s => s.attendanceStatus === "present").length;
    if(document.getElementById("stat-tutor-absent")) document.getElementById("stat-tutor-absent").textContent = validStudents.filter(s => s.attendanceStatus === "absent").length;

    let filtered = validStudents;
    if(window.currentRosterBucket !== 'ALL') {
        filtered = filtered.filter(s => s.attendanceStatus === window.currentRosterBucket);
    }

    if (search) filtered = filtered.filter(s => s.name && s.name.toLowerCase().includes(search));
    if (classF !== "ALL") filtered = filtered.filter(s => String(s.class) === classF);
    if (boardF !== "ALL") filtered = filtered.filter(s => String(s.boardStream || '').toUpperCase() === boardF.toUpperCase());
    if (genderF !== "ALL") filtered = filtered.filter(s => String(s.gender || 'Male').toLowerCase() === genderF.toLowerCase());
    
    if (pctF !== "ALL") {
        filtered = filtered.filter(s => {
            return s.scoreMetrics.tier === pctF;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-dashed border-slate-700">No students match current floor filters.</div>`;
        return;
    }

    filtered.forEach(s => {
        const sid = String(s.id || s.PK?.replace("STUDENT#", ""));
        const card = document.createElement("div");
        card.className = `p-4 sm:p-5 bg-slate-900 border ${s.attendanceStatus === 'unmarked' || !s.attendanceStatus ? 'border-rose-500/40 shadow-sm shadow-rose-900/10' : 'border-slate-800'} rounded-2xl transition-all hover:border-indigo-500`;
        
        let statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">PRESENT</span>`;
        if (s.attendanceStatus === 'unmarked' || !s.attendanceStatus) statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">UNMARKED</span>`;
        else if (s.attendanceStatus === 'absent') statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">ABSENT</span>`;
        else if (s.attendanceStatus === 'late') {
            const delayMins = window.calculateLatenessDelta(s.expectedTime || "18:00", s.actualArrivalTime);
            const delayText = delayMins ? ` (+${delayMins}m)` : '';
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">LATE${delayText}</span>`;
        } else if (s.attendanceStatus === 'early leave') {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">EARLY LEAVE</span>`;
        }
        
        let lateDetailsHtml = '';
        if (s.attendanceStatus === 'late') {
            lateDetailsHtml = `
                <div class="mt-3 p-3 bg-slate-950 rounded-xl border border-amber-500/20 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                        <span class="text-slate-400 block mb-1 uppercase tracking-wider text-[9px] font-bold">Arrival Discrepancy Log:</span>
                        <span class="text-slate-300">Scheduled: <strong class="text-white">${s.expectedTime || '18:00'}</strong> | Arrived: <strong class="text-white">${s.actualArrivalTime || 'Not Logged'}</strong></span>
                        <p class="text-slate-400 mt-1">Reason: <span class="text-amber-300 font-medium">${s.lateReason || 'Not specified'}</span></p>
                    </div>
                    <button onclick="window.openLateReasonModal('${sid}')" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg transition-colors border border-slate-700">Edit Log</button>
                </div>`;
        }
        
        let absentDetailsHtml = '';
        if (s.attendanceStatus === 'absent') {
            absentDetailsHtml = `
                <div class="mt-3 p-3 bg-slate-950 rounded-xl border border-rose-500/20 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                        <span class="text-slate-400 block mb-1 uppercase tracking-wider text-[9px] font-bold">Reason & Contact Log: </span>
                        ${s.absentReasonLogged ? `<span class="text-emerald-400 font-bold"><i class="fa-solid fa-check mr-1"></i>${s.absentReason}</span>` : `<span class="text-rose-400 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Unverified Call (Needs Attention)</span>`}
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="${s.fatherPhone ? `tel:${s.fatherPhone}` : '#'}" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors font-bold flex items-center border border-slate-700"><i class="fa-solid fa-phone text-[9px] mr-1.5"></i> Father</a>
                        <a href="${s.motherPhone ? `tel:${s.motherPhone}` : '#'}" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-pink-400 rounded-lg transition-colors font-bold flex items-center border border-slate-700"><i class="fa-solid fa-phone text-[9px] mr-1.5"></i> Mother</a>
                        <button onclick="window.openAbsentCallModal('${sid}')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors shadow-sm">Log Verify</button>
                    </div>
                </div>`;
        }

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div onclick="window.openStudentDossier('${sid}')" class="cursor-pointer flex-1 min-w-0">
                    <div class="flex items-center space-x-2 flex-wrap mb-1.5">
                        <h4 class="font-extrabold text-white text-base hover:text-indigo-400 transition-colors">${s.name}</h4>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Class ${s.class}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">${s.boardStream || 'SSC'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${s.scoreMetrics.colorClass}">${s.scoreMetrics.label}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-1 truncate"><i class="fa-solid fa-venus-mars text-[9px] mr-1"></i>${s.gender || 'Male'} &bull; <i class="fa-solid fa-building-columns text-[9px] mx-1"></i>${s.school || 'Unspecified School'}</p>
                </div>
                <div class="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 shrink-0">
                    ${statusBadge}
                    <div class="flex items-center space-x-1.5 ml-2" style="pointer-events: auto;">
                        <button onclick="window.optimisticMarkStatus('${sid}', 'present')" title="Mark Present" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-emerald-900/40 text-emerald-400 transition-colors shadow-sm border border-slate-700 hover:border-emerald-500/30"><i class="fa-solid fa-check"></i></button>
                        <button onclick="window.openAbsentCallModal('${sid}')" title="Mark Absent" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-rose-400 transition-colors shadow-sm border border-slate-700 hover:border-rose-500/30"><i class="fa-solid fa-xmark"></i></button>
                        <button onclick="window.openLateReasonModal('${sid}')" title="Mark Late" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-amber-900/40 text-amber-400 transition-colors shadow-sm border border-slate-700 hover:border-amber-500/30"><i class="fa-solid fa-clock"></i></button>
                    </div>
                </div>
            </div>
            ${lateDetailsHtml}
            ${absentDetailsHtml}
        `;
        container.appendChild(card);
    });
};

window.optimisticMarkStatus = async function(studentId, newStatus) {
    const student = window.activeStudentList.find(s => String(s.id || s.PK?.replace("STUDENT#", "")) === String(studentId));
    if (!student) return;
    
    student.attendanceStatus = newStatus;
    window.renderRoster();
    
    const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
    await API.post("/floor/attendance/mark", {
        date: new Date().toISOString().split("T")[0],
        studentId: studentId,
        status: newStatus,
        markedBy: user.name || "Floor Tutor",
        studentInfo: student
    });
};

window.openLateReasonModal = function(sid) {
    window.pendingLateStudentId = sid;
    const student = window.activeStudentList.find(s => String(s.id || s.PK?.replace('STUDENT#', '')) === String(sid));
    if (student) {
        document.getElementById("late-arrival-actual-time").value = student.actualArrivalTime || "18:25";
    }
    document.getElementById("modal-late-reason").classList.remove("hidden");
};

window.closeLateReasonModal = function() {
    window.pendingLateStudentId = null;
    document.getElementById("modal-late-reason").classList.add("hidden");
};

window.handleLatePresetChange = function() {
    const preset = document.getElementById("late-preset-select").value;
    const customWrap = document.getElementById("late-custom-remark-wrapper");
    if (customWrap) {
        customWrap.classList.toggle("hidden", preset !== "Other");
    }
};

window.submitLateArrival = async function() {
    if (!window.pendingLateStudentId) return;
    const student = window.activeStudentList.find(s => String(s.id || s.PK?.replace('STUDENT#', '')) === String(window.pendingLateStudentId));
    if (!student) return;
    
    const actualTime = document.getElementById("late-arrival-actual-time").value || "18:25";
    const preset = document.getElementById("late-preset-select").value;
    const custom = document.getElementById("late-custom-remark").value.trim();
    const finalReason = preset === "Other" ? (custom || "Unspecified delay") : preset;
    
    student.attendanceStatus = "late";
    student.actualArrivalTime = actualTime;
    student.lateReason = finalReason;
    
    window.closeLateReasonModal();
    window.renderRoster();
    
    const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
    await API.post("/floor/attendance/mark", {
        studentId: window.pendingLateStudentId,
        status: "late",
        lateSlot: actualTime,
        remarks: finalReason,
        markedBy: user.name || "Floor Tutor",
        date: new Date().toISOString().split("T")[0],
        studentInfo: student
    });
};

window.openAbsentCallModal = function(sid) {
    window.pendingAbsentStudentId = sid;
    const student = window.activeStudentList.find(s => String(s.id || s.PK?.replace('STUDENT#', '')) === String(sid));
    if (!student) return;
    
    document.getElementById("absent-call-student-info").textContent = `${student.name} (Class ${student.class})`;
    
    const dialF = document.getElementById("absent-dial-father");
    const dialM = document.getElementById("absent-dial-mother");
    
    if (dialF) {
        dialF.href = student.fatherPhone ? `tel:${student.fatherPhone}` : "#";
        dialF.innerHTML = `<i class="fa-solid fa-phone mr-1"></i> Father: ${student.fatherPhone || 'N/A'}`;
    }
    if (dialM) {
        dialM.href = student.motherPhone ? `tel:${student.motherPhone}` : "#";
        dialM.innerHTML = `<i class="fa-solid fa-phone mr-1"></i> Mother: ${student.motherPhone || 'N/A'}`;
    }
    
    document.getElementById("modal-absent-call").classList.remove("hidden");
};

window.closeAbsentCallModal = function() {
    window.pendingAbsentStudentId = null;
    document.getElementById("modal-absent-call").classList.add("hidden");
};

window.handleAbsentPresetChange = function() {
    const preset = document.getElementById("absent-preset-reason").value;
    const customInp = document.getElementById("absent-custom-input");
    if (customInp) customInp.classList.toggle("hidden", preset !== "Other");
};

window.submitAbsentReason = async function() {
    if (!window.pendingAbsentStudentId) return;
    const student = window.activeStudentList.find(s => String(s.id || s.PK?.replace('STUDENT#', '')) === String(window.pendingAbsentStudentId));
    if (!student) return;
    
    const preset = document.getElementById("absent-preset-reason").value;
    const custom = document.getElementById("absent-custom-input").value.trim();
    const finalReason = preset === "Other" ? (custom || "Called Parent") : preset;
    
    student.attendanceStatus = "absent";
    student.absentReasonLogged = true;
    student.absentReason = finalReason;
    
    window.closeAbsentCallModal();
    window.renderRoster();
    
    const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
    await API.post("/floor/attendance/mark", {
        studentId: window.pendingAbsentStudentId,
        status: "absent",
        remarks: finalReason,
        markedBy: user.name || "Floor Tutor",
        date: new Date().toISOString().split("T")[0],
        studentInfo: student
    });
};