window.currentPillar = 'students';
window.activeBucket = 'ALL';
window.directorStudents = [];
window.directorStaff = [];
window.holidays = [];
window.expenses = [];
window.rawDispatchQueue = [];
window.activeLateStudentId = null;
window.activeAbsentStudentId = null;
window.activeStaffLeaveId = null;
window.activeStaffLeaveStatus = null;

window.initDashboard = function() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("filter-date");
    if(dateInput && !dateInput.value) dateInput.value = today;
    window.loadDashboardData();
};

window.loadDashboardData = async function() {
    const { ok, data } = await API.get("/dashboard/master-data");
    if(ok) {
        window.directorStudents = data.students || [];
        window.directorStaff = data.staff || [];
        window.holidays = data.holidays || [];
        window.expenses = data.expenses || [];
        window.rawDispatchQueue = data.queue || [];
    }
    
    const stuCount = document.getElementById("dash-total-students");
    const tutCount = document.getElementById("dash-total-tutors");
    const facCount = document.getElementById("dash-total-faculty");
    
    if(stuCount) stuCount.textContent = window.directorStudents.filter(s => s.status !== 'LEFT_TUITION').length;
    if(tutCount) tutCount.textContent = window.directorStaff.filter(s => s.role === 'tutor' && s.status === 'ACTIVE').length;
    if(facCount) facCount.textContent = window.directorStaff.filter(s => s.role === 'faculty' && s.status === 'ACTIVE').length;
    
    window.switchPillar(window.currentPillar);
    window.renderStudentsList();
};

window.handleDashboardClassChange = function() {
    const cls = document.getElementById("filter-class").value;
    const boardSel = document.getElementById("filter-board");
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
    window.renderStudentsList();
};

window.switchPillar = function(pillar) {
    window.currentPillar = pillar;
    ['students', 'tutors', 'faculty'].forEach(p => {
        const panel = document.getElementById(`dash-panel-${p}`);
        if(panel) panel.classList.toggle('hidden', p !== pillar);
        const btn = document.getElementById(`dash-tab-${p}`);
        if(btn) {
            btn.className = (p === pillar) 
                ? "py-2.5 rounded-xl bg-indigo-600 text-white shadow-md transition-all" 
                : "py-2.5 rounded-xl text-slate-400 hover:text-white transition-all";
        }
    });
    if(pillar === 'tutors') window.renderStaffCards('tutor', 'list-tutors');
    if(pillar === 'faculty') window.renderStaffCards('faculty', 'list-faculty');
};

window.filterBucket = function(bucket) {
    window.activeBucket = bucket;
    ['ALL', 'PRESENT', 'ABSENT', 'LATE', 'EARLY', 'UNMARKED', 'LEFT'].forEach(b => {
        const el = document.getElementById(`bucket-${b}`);
        if(el) {
            if (b === bucket) {
                el.className = `px-4 py-2 rounded-xl text-white shadow-md transition-colors border ${b === 'UNMARKED' ? 'bg-rose-600 border-rose-500' : 'bg-indigo-600 border-indigo-500'}`;
            } else {
                el.className = `px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 transition-colors ${b === 'LEFT' ? 'text-rose-400 hover:bg-rose-950/30 hover:border-rose-900 ml-auto' : 'text-slate-400 hover:text-white'}`;
            }
        }
    });
    window.renderStudentsList();
};

window.computeScoreMetrics = function(student) {
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

window.renderStudentsList = function() {
    const list = document.getElementById("list-students");
    if(!list) return;
    list.innerHTML = "";
    
    let filtered = window.directorStudents || [];
    
    if (window.activeBucket === 'LEFT') {
        filtered = filtered.filter(s => s.status === 'LEFT_TUITION');
    } else {
        filtered = filtered.filter(s => s.status !== 'LEFT_TUITION');
    }
    
    const classF = document.getElementById("filter-class")?.value;
    if(classF && classF !== "ALL") filtered = filtered.filter(s => String(s.class) === classF);
    
    const boardF = document.getElementById("filter-board")?.value;
    if(boardF && boardF !== "ALL") filtered = filtered.filter(s => String(s.boardStream || '').toUpperCase() === boardF.toUpperCase());
    
    const genderF = document.getElementById("filter-gender")?.value;
    if(genderF && genderF !== "ALL") filtered = filtered.filter(s => String(s.gender || 'Male').toLowerCase() === genderF.toLowerCase());
    
    const pctTierF = document.getElementById("filter-percentage")?.value;
    if (pctTierF && pctTierF !== "ALL") {
        filtered = filtered.filter(s => {
            const scoreData = window.computeScoreMetrics(s);
            return scoreData.tier === pctTierF;
        });
    }

    if (window.activeBucket === 'EARLY') filtered = filtered.filter(s => s.attendanceStatus === 'early leave');
    else if (window.activeBucket === 'UNMARKED') filtered = filtered.filter(s => !s.attendanceStatus || s.attendanceStatus === 'unmarked');
    else if (window.activeBucket === 'ABSENT') filtered = filtered.filter(s => s.attendanceStatus === 'absent');
    else if (window.activeBucket === 'LATE') filtered = filtered.filter(s => s.attendanceStatus === 'late');
    else if (window.activeBucket === 'PRESENT') filtered = filtered.filter(s => s.attendanceStatus === 'present');
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-10 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-dashed border-slate-700">No students found matching the current global filters.</div>`;
        return;
    }
    
    filtered.forEach(s => {
        const sid = String(s.id || s.PK?.replace('STUDENT#', ''));
        const scoreMetrics = window.computeScoreMetrics(s);
        const card = document.createElement("div");
        card.className = `p-4 bg-slate-900 border ${s.attendanceStatus === 'unmarked' || !s.attendanceStatus ? 'border-rose-500/40 shadow-sm shadow-rose-900/10' : 'border-slate-800'} rounded-2xl transition-all hover:border-indigo-500`;
        
        let statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">PRESENT</span>`;
        if (s.attendanceStatus === 'unmarked' || !s.attendanceStatus) {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">UNMARKED</span>`;
        } else if (s.attendanceStatus === 'absent') {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">ABSENT</span>`;
        } else if (s.attendanceStatus === 'late') {
            const delayMins = window.calculateLatenessDelta(s.expectedTime || "18:00", s.actualArrivalTime);
            const delayText = delayMins ? ` (+${delayMins}m)` : '';
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">LATE${delayText}</span>`;
        } else if (s.attendanceStatus === 'early leave') {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">EARLY LEAVE</span>`;
        }
        
        if (s.status === 'LEFT_TUITION') {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-rose-400 border border-slate-700">LEFT FIRM ARCHIVE</span>`;
        }
        
        let lateDetailsHtml = '';
        if (s.attendanceStatus === 'late') {
            lateDetailsHtml = `
                <div class="mt-3 p-2.5 bg-slate-950 rounded-xl border border-amber-500/20 text-[11px] flex items-center justify-between">
                    <div>
                        <span class="text-slate-400">Scheduled: <strong class="text-white">${s.expectedTime || '18:00'}</strong> | Arrived: <strong class="text-white">${s.actualArrivalTime || 'Not Logged'}</strong></span>
                        <p class="text-slate-400 mt-1">Reason: <span class="text-amber-300 font-medium">${s.lateReason || 'Not specified'}</span></p>
                    </div>
                </div>
            `;
        }

        let absentDetailsHtml = '';
        if (s.attendanceStatus === 'absent') {
            absentDetailsHtml = `
                <div class="mt-3 p-2.5 bg-slate-950 rounded-xl border border-rose-500/20 text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-slate-400">Parent Contact History: </span>
                        ${s.absentReasonLogged 
                            ? `<span class="text-emerald-400 font-bold"><i class="fa-solid fa-check mr-1"></i>${s.absentReason}</span>` 
                            : `<span class="text-rose-400 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Unverified Call / Pending Director Action</span>`
                        }
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="${s.fatherPhone ? `tel:${s.fatherPhone}` : '#'}" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors font-bold"><i class="fa-solid fa-phone text-[9px] mr-1"></i> Father</a>
                        <a href="${s.motherPhone ? `tel:${s.motherPhone}` : '#'}" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-pink-400 rounded-lg transition-colors font-bold"><i class="fa-solid fa-phone text-[9px] mr-1"></i> Mother</a>
                        <button onclick="window.openAbsentCallModal('${sid}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors">Log Reason</button>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div onclick="window.openStudentDossier('${sid}')" class="cursor-pointer flex-1 min-w-0">
                    <div class="flex items-center space-x-2 flex-wrap mb-1">
                        <h4 class="font-extrabold text-white text-base hover:text-indigo-400 transition-colors">${s.name}</h4>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Class ${s.class}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">${s.boardStream || 'SSC'}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${scoreMetrics.colorClass}">${scoreMetrics.label}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 truncate"><i class="fa-solid fa-venus-mars text-[9px] mr-1"></i>${s.gender || 'Male'} &bull; <i class="fa-solid fa-building-columns text-[9px] mx-1"></i>${s.school || 'Unspecified School'} &bull; <i class="fa-solid fa-location-dot text-[9px] mx-1"></i>${s.area || 'Locality'}</p>
                </div>
                
                <div class="flex flex-col items-end space-y-2 shrink-0">
                    ${statusBadge}
                    ${s.status !== 'LEFT_TUITION' ? `<button onclick="window.markStudentLeftFirm('${sid}')" class="px-2.5 py-1 rounded-lg bg-slate-950 border border-rose-500/30 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors text-[10px] font-bold shadow-sm">Mark Left Firm</button>` : ''}
                </div>
            </div>
            ${lateDetailsHtml}
            ${absentDetailsHtml}
        `;
        list.appendChild(card);
    });
};

window.markStudentLeftFirm = function(sid) {
    const student = (window.directorStudents || []).find(s => String(s.id || s.PK?.replace('STUDENT#', '')) === String(sid));
    if(!student) return;
    
    window.showConfirm("Mark Student as Left Firm", `Are you absolutely sure you want to permanently move ${student.name} to the inactive archive? This will halt fee tracking and remove them from active rosters.`, async () => {
        await API.post("/intake/student/delete", { studentId: sid });
        window.loadDashboardData();
        window.showMsg("Archived", "Student successfully moved to Left Firm status.");
    });
};

window.calculateStaffPayroll = function(staff) {
    const base = parseFloat(staff.salary) || 0;
    if (!staff.joinDate) return { base, deduction: 0, finalPay: base + (parseFloat(staff.salaryAdjustments) || 0), cycleDays: 30 };
    
    const joinDate = new Date(staff.joinDate);
    const now = new Date();
    
    let cycleStart = new Date(now.getFullYear(), now.getMonth(), joinDate.getDate());
    if (now < cycleStart) {
        cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, joinDate.getDate());
    }
    const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, joinDate.getDate());
    const cycleDays = Math.round((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)) || 30;
    
    const perDay = base / cycleDays;
    const unpaidLeaves = parseInt(staff.unpaidLeaves) || 0;
    const deduction = Math.round(unpaidLeaves * perDay);
    const adjustments = parseFloat(staff.salaryAdjustments) || 0;
    
    const finalPay = base - deduction + adjustments;
    return { base, deduction, adjustments, finalPay, cycleDays, unpaidLeaves, paidLeaves: parseInt(staff.paidLeaves) || 0 };
};

window.renderStaffCards = function(role, containerId) {
    const list = document.getElementById(containerId);
    if(!list) return;
    
    const filterId = role === 'tutor' ? 'filter-tutor-gender' : 'filter-faculty-gender';
    const genderF = document.getElementById(filterId)?.value || "ALL";
    
    let filtered = (window.directorStaff || []).filter(s => s.role === role && s.status === 'ACTIVE');
    if (genderF !== "ALL") filtered = filtered.filter(s => String(s.gender || 'Male').toLowerCase() === genderF.toLowerCase());
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs bg-slate-900 rounded-2xl border border-dashed border-slate-800">No active staff records found.</div>`;
        return;
    }
    
    list.innerHTML = filtered.map(t => {
        const pay = window.calculateStaffPayroll(t);
        return `
        <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-colors shadow-sm">
            <div class="flex justify-between items-start">
                <div class="cursor-pointer flex-1 min-w-0" onclick="window.openStaffCalendar('${t.name}', '${t.id}')">
                    <h4 class="font-extrabold text-white text-base hover:text-indigo-400 transition-colors">${t.name}</h4>
                    <p class="text-[11px] text-slate-400 mt-1"><i class="fa-solid fa-phone text-[9px] mr-1"></i>${t.phone} &bull; <i class="fa-solid fa-venus-mars text-[9px] mx-1"></i>${t.gender || 'Male'}</p>
                    <p class="text-[10px] text-slate-500 mt-1 font-mono">Current Cycle: ${pay.cycleDays} Days | Base: ₹${pay.base}</p>
                </div>
                <div class="flex flex-col items-end space-y-2 shrink-0">
                    <select onchange="window.handleStaffAttendanceChange('${t.id}', this.value)" class="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">Mark Attendance...</option>
                        <option value="PRESENT">Present</option>
                        <option value="UNPAID_LEAVE">Absent (Unpaid Leave)</option>
                        <option value="PAID_LEAVE">Absent (Paid Leave)</option>
                    </select>
                    <button onclick="window.markStaffLeftFirm('${t.id}')" class="px-2.5 py-1 rounded-lg bg-slate-950 border border-rose-500/30 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors text-[10px] font-bold shadow-sm">Revoke & Mark Left Firm</button>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span class="text-amber-400">Unpaid Leaves: ${pay.unpaidLeaves} (-₹${pay.deduction})</span>
                <span class="text-emerald-400">Paid Leaves: ${pay.paidLeaves} (No Deduction)</span>
            </div>
        </div>`;
    }).join("");
};

window.markStaffLeftFirm = function(sid) {
    const staff = (window.directorStaff || []).find(s => s.id === sid);
    if(!staff) return;
    window.showConfirm("Revoke Access", `Are you sure you want to revoke system access for ${staff.name} and mark them as Inactive?`, async () => {
        await API.post("/intake/staff/delete", { id: sid });
        window.loadDashboardData();
        window.showMsg("Revoked", "Staff member access revoked and moved to inactive list.");
    });
};

window.handleStaffAttendanceChange = async function(staffId, status) {
    if (!status) return;
    if (status === "UNPAID_LEAVE" || status === "PAID_LEAVE") {
        window.activeStaffLeaveId = staffId;
        window.activeStaffLeaveStatus = status;
        document.getElementById("staff-leave-type-display").textContent = status === "UNPAID_LEAVE" ? "UNPAID LEAVE (Salary Deduction Applies)" : "PAID LEAVE (No Salary Deduction)";
        document.getElementById("staff-leave-type-display").className = `font-mono text-sm font-bold ${status === "UNPAID_LEAVE" ? 'text-rose-400' : 'text-emerald-400'}`;
        document.getElementById("modal-staff-leave-reason").classList.remove("hidden");
    } else {
        await API.post("/intake/staff/attendance", { staffId, status, date: document.getElementById("filter-date")?.value || new Date().toISOString().split("T")[0] });
        window.showMsg("Logged", "Staff attendance logged successfully.");
        window.loadDashboardData();
    }
};

window.closeStaffLeaveModal = function() {
    window.activeStaffLeaveId = null;
    document.getElementById("modal-staff-leave-reason").classList.add("hidden");
};

window.confirmStaffLeave = async function() {
    const reason = document.getElementById("staff-leave-reason-input").value.trim();
    if (!reason) {
        window.showMsg("Required", "Please provide a valid reason for the leave.");
        return;
    }
    await API.post("/intake/staff/attendance", { 
        staffId: window.activeStaffLeaveId, 
        status: window.activeStaffLeaveStatus, 
        reason: reason,
        date: document.getElementById("filter-date")?.value || new Date().toISOString().split("T")[0]
    });
    document.getElementById("staff-leave-reason-input").value = "";
    window.closeStaffLeaveModal();
    window.showMsg("Logged", "Staff leave logged and payroll updated dynamically.");
    window.loadDashboardData();
};