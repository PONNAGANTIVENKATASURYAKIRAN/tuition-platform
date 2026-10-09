window.activeStudentDossier = null;
window.currentSubjectIdx = 0;
window.currentChapterIdx = 0;
window.activeFacultyList = [];

window.openStudentDossier = async function(studentId) {
    let s = null;
    if (window.directorStudents && window.directorStudents.length > 0) {
        s = window.directorStudents.find(stu => String(stu.id || stu.PK?.replace("STUDENT#", "")) === String(studentId));
    } else if (window.activeStudentList && window.activeStudentList.length > 0) {
        s = window.activeStudentList.find(stu => String(stu.id || stu.PK?.replace("STUDENT#", "")) === String(studentId));
    }
    
    if (!s) return;
    
    window.activeStudentDossier = s;
    document.getElementById("modal-student-name").textContent = s.name;
    document.getElementById("modal-student-badge").textContent = `Class ${s.class}`;
    
    const boardEl = document.getElementById("modal-student-board");
    if(boardEl) {
        boardEl.textContent = s.boardStream || "SSC";
        boardEl.classList.remove("hidden");
        if(s.class === "B.Tech") boardEl.classList.add("hidden");
    }
    
    if(document.getElementById("modal-student-school")) {
        document.getElementById("modal-student-school").textContent = s.school || "School";
    }
    
    if(document.getElementById("modal-call-father")) {
        const fLink = document.getElementById("modal-call-father");
        fLink.href = s.fatherPhone ? `tel:${s.fatherPhone}` : "#";
        fLink.innerHTML = `<i class="fa-solid fa-phone text-[10px] mr-1"></i> Father: ${s.fatherPhone || 'N/A'}`;
    }
    if(document.getElementById("modal-call-mother")) {
        const mLink = document.getElementById("modal-call-mother");
        mLink.href = s.motherPhone ? `tel:${s.motherPhone}` : "#";
        mLink.innerHTML = `<i class="fa-solid fa-phone text-[10px] mr-1"></i> Mother: ${s.motherPhone || 'N/A'}`;
    }
    
    const delBtn = document.getElementById("btn-delete-student");
    const recBtn = document.getElementById("btn-recall-student");
    const isDirectorSession = window.location.pathname.includes("director.html");
    
    if(delBtn && recBtn) {
        if (!isDirectorSession) {
            delBtn.classList.add("hidden");
            recBtn.classList.add("hidden");
        } else {
            if (s.status === 'LEFT_TUITION') {
                delBtn.classList.add("hidden");
                recBtn.classList.remove("hidden");
            } else {
                delBtn.classList.remove("hidden");
                recBtn.classList.add("hidden");
            }
        }
    }

    const dPicker = document.getElementById("dossier-month-picker");
    if(dPicker && !dPicker.value) {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        dPicker.value = `${today.getFullYear()}-${mm}`;
    }
    
    document.getElementById("student-modal").classList.remove("hidden");
    window.switchDossierTab('attendance');
    
    const { ok, data } = await API.post("/dossier/fetch", { studentId });
    if (ok && data.profile) {
        window.activeStudentDossier = { ...s, ...data.profile };
    }
    
    if(!window.activeStudentDossier.slipTests) window.activeStudentDossier.slipTests = [];
    if(!window.activeStudentDossier.exams) window.activeStudentDossier.exams = [];
    if(!window.activeStudentDossier.dailySubjectLog) window.activeStudentDossier.dailySubjectLog = {};
    
    window.renderDailyMultiSubjectCalendar();
    window.renderComparativeDelta();
    window.renderDossierSyllabus();
    window.populateVaultDropdown();
};

window.closeStudentModal = function() {
    document.getElementById("student-modal").classList.add("hidden");
};

window.deleteActiveStudent = function() {
    if(!window.activeStudentDossier) return;
    const sid = window.activeStudentDossier.id || window.activeStudentDossier.PK.replace('STUDENT#','');
    window.showConfirm("Mark Student as Left Firm", `Are you sure you want to permanently move ${window.activeStudentDossier.name} to the inactive archive?`, async () => {
        await API.post("/intake/student/delete", { studentId: sid });
        window.closeStudentModal();
        window.loadDashboardData();
        window.showMsg("Archived", "Student status updated to Left Firm.");
    });
};

window.recallActiveStudent = function() {
    if(!window.activeStudentDossier) return;
    const sid = window.activeStudentDossier.id || window.activeStudentDossier.PK.replace('STUDENT#','');
    window.showConfirm("Recall Student", `Restore ${window.activeStudentDossier.name} back to active enrollment?`, async () => {
        await API.post("/intake/student/recall", { studentId: sid });
        window.closeStudentModal();
        window.loadDashboardData();
        window.showMsg("Restored", "Student restored to active operations.");
    });
};

window.switchDossierTab = function(tab) {
    ['attendance', 'comparative', 'syllabus', 'assessments', 'doubts', 'vault'].forEach(t => {
        const panel = document.getElementById(`dossier-panel-${t}`);
        const tabBtn = document.getElementById(`dossier-tab-${t}`);
        if(panel) panel.classList.toggle("hidden", t !== tab);
        if(tabBtn) {
            tabBtn.className = (t === tab) 
                ? "py-2 px-3 text-indigo-400 border-b-2 border-indigo-500 whitespace-nowrap font-bold" 
                : "py-2 px-3 text-slate-400 hover:text-white whitespace-nowrap transition-colors";
        }
    });
};

window.renderDailyMultiSubjectCalendar = function() {
    const grid = document.getElementById("progress-calendar-grid");
    const picker = document.getElementById("dossier-month-picker");
    if(!grid || !picker) return;
    
    grid.innerHTML = "";
    const s = window.activeStudentDossier;
    const dateLog = s.dailySubjectLog || {};
    
    const [yearStr, monthStr] = picker.value.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
        
        let status = "UNMARKED";
        let isHoliday = false;
        
        if (window.activeHolidays && window.activeHolidays.some(h => h.date === dateKey)) {
            isHoliday = true;
            status = "HOLIDAY";
        }
        
        const hasSubjects = dateLog[dateKey] && dateLog[dateKey].length > 0;
        if (hasSubjects && !isHoliday) {
            if (dateLog[dateKey][0].subject === "ABSENT") status = "ABSENT";
            else if (dateLog[dateKey][0].subject === "LATE") status = "LATE";
            else status = "PRESENT";
        }

        let colorClasses = "bg-slate-900 border-slate-800 text-slate-500";
        let indicatorHtml = "";

        if (status === "HOLIDAY") {
            colorClasses = "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-sm shadow-orange-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-orange-400 mt-1">H</span>`;
        } else if (status === "ABSENT") {
            colorClasses = "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-rose-500 mt-1">A</span>`;
        } else if (status === "LATE") {
            colorClasses = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-amber-400 mt-1">L</span>`;
        } else if (status === "PRESENT") {
            colorClasses = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-sm shadow-emerald-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-emerald-400 mt-1">P</span>`;
        }

        const btn = document.createElement("button");
        btn.className = `p-2 rounded-xl text-center border font-mono text-[11px] transition-all hover:border-indigo-400 ${colorClasses}`;
        btn.innerHTML = `<span class="block">${day}</span>${indicatorHtml}`;
        
        btn.onclick = () => {
            const detailBox = document.getElementById("calendar-day-detail-box");
            detailBox.classList.remove("hidden");
            document.getElementById("detail-date-title").textContent = `Inspection Date: ${dateKey}`;
            
            const pill = document.getElementById("detail-status-pill");
            pill.textContent = status;
            if (status === "HOLIDAY") pill.className = "px-3 py-1 rounded-lg text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30";
            else if (status === "ABSENT") pill.className = "px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30";
            else if (status === "LATE") pill.className = "px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";
            else if (status === "PRESENT") pill.className = "px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
            else pill.className = "px-3 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700";
            
            const subContainer = document.getElementById("detail-date-subjects-list");
            subContainer.innerHTML = "";
            
            const subList = dateLog[dateKey] || [];
            if (subList.length === 0 || status === "ABSENT" || status === "HOLIDAY") {
                subContainer.innerHTML = `<p class="text-slate-500 italic text-[11px] p-3 bg-slate-950 rounded-xl border border-dashed border-slate-800">No multi-subject academic records active on this specific date.</p>`;
            } else {
                subList.forEach(item => {
                    subContainer.innerHTML += `
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] flex justify-between items-center shadow-sm">
                            <div><strong class="text-indigo-400 text-xs">${item.subject}</strong> &bull; <span class="text-slate-300 font-bold">${item.chapter}</span></div>
                            <span class="text-slate-400 font-mono text-[10px] bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">${item.topics}</span>
                        </div>
                    `;
                });
            }
            
            let note = "";
            if (status === "ABSENT") note = "Absence Confirmed. Student was completely absent from the academy.";
            else if (status === "HOLIDAY") note = "Official Academy Scheduled Holiday. No tracking logged.";
            else if (status === "LATE") note = "Student reported to academy late. Log penalty verified.";
            document.getElementById("detail-date-notes").textContent = note;
        };
        grid.appendChild(btn);
    }
};

window.renderComparativeDelta = function() {
    const s = window.activeStudentDossier;
    const tuiContainer = document.getElementById("comp-tuition-table");
    const schContainer = document.getElementById("comp-school-table");
    if (!tuiContainer || !schContainer) return;
    
    tuiContainer.innerHTML = "";
    schContainer.innerHTML = "";
    
    const slipTests = s.slipTests || [];
    let tuiSum = 0;
    if (slipTests.length === 0) {
        tuiContainer.innerHTML = `<p class="text-slate-500 italic text-[11px] p-3 border border-dashed border-slate-800 rounded-xl text-center">No Tuition Slip Tests recorded yet.</p>`;
    } else {
        slipTests.forEach(st => {
            const pct = Math.round((parseFloat(st.marksObtained) / parseFloat(st.maxMarks)) * 100);
            tuiSum += pct;
            tuiContainer.innerHTML += `
                <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center shadow-sm">
                    <div><span class="font-bold text-white">${st.subject}</span><p class="text-[10px] text-slate-500 font-mono mt-0.5">${st.date}</p></div>
                    <span class="font-mono font-bold text-emerald-400 text-sm">${st.marksObtained}/${st.maxMarks} (${pct}%)</span>
                </div>
            `;
        });
    }
    const tuiAvg = slipTests.length > 0 ? Math.round(tuiSum / slipTests.length) : 0;
    document.getElementById("comp-tuition-avg").textContent = `${tuiAvg}%`;

    const schoolExams = s.exams || [];
    let schSum = 0;
    if (schoolExams.length === 0) {
        schContainer.innerHTML = `<p class="text-slate-500 italic text-[11px] p-3 border border-dashed border-slate-800 rounded-xl text-center">No School Terminal Exams recorded yet.</p>`;
    } else {
        schoolExams.forEach(ex => {
            const pct = Math.round((parseFloat(ex.scored) / parseFloat(ex.total)) * 100);
            schSum += pct;
            schContainer.innerHTML += `
                <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center shadow-sm">
                    <div><span class="font-bold text-white">${ex.name}</span><p class="text-[10px] text-slate-500 mt-0.5">${ex.subject}</p></div>
                    <span class="font-mono font-bold text-indigo-400 text-sm">${ex.scored}/${ex.total} (${pct}%)</span>
                </div>
            `;
        });
    }
    const schAvg = schoolExams.length > 0 ? Math.round(schSum / schoolExams.length) : 0;
    document.getElementById("comp-school-avg").textContent = `${schAvg}%`;

    const summaryBox = document.getElementById("comp-insight-summary");
    if (summaryBox) {
        const diff = tuiAvg - schAvg;
        if (diff > 10) {
            summaryBox.innerHTML = `<strong>Performance Diagnosis:</strong> Ward is scoring ${diff}% higher in daily tuition assessments compared to their standardized school exams. Consistent alignment recommended to translate tuition knowledge into school grades.`;
        } else if (diff < -5) {
            summaryBox.innerHTML = `<strong>Performance Diagnosis:</strong> Ward exhibits high school marks but lower tuition scores (${Math.abs(diff)}% deficit). Daily slip test rigor at the academy is testing more intricate concepts. Needs deeper conceptual focus.`;
        } else if (tuiAvg === 0 && schAvg === 0) {
            summaryBox.innerHTML = `<strong>Status:</strong> Awaiting assessment data to generate comparative analytics.`;
        } else {
            summaryBox.innerHTML = `<strong>Performance Diagnosis:</strong> Ward demonstrates consistent correlation between tuition preparation and school examination deliverables. Optimal academic alignment verified.`;
        }
    }
};

window.renderDossierSyllabus = function() {
    const s = window.activeStudentDossier;
    const subCont = document.getElementById("dossier-subjects-list");
    if (!subCont) return;
    subCont.innerHTML = "";
    
    const syllabus = s.syllabus || [];
    if(syllabus.length === 0) {
        subCont.innerHTML = `<p class="text-slate-500 italic text-[10px]">No syllabus mapped.</p>`;
        return;
    }
    
    syllabus.forEach((sub, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-btn shadow-sm ${idx === window.currentSubjectIdx ? 'bg-indigo-600 text-white border border-indigo-500' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`;
        btn.textContent = sub.name;
        btn.onclick = () => { window.currentSubjectIdx = idx; window.renderDossierSyllabus(); };
        subCont.appendChild(btn);
    });
};

window.populateVaultDropdown = function() {
    const sel = document.getElementById("vault-test-selector");
    if (!sel) return;
    sel.innerHTML = "";
    
    const tests = window.activeStudentDossier?.slipTests || [];
    if (tests.length === 0) {
        sel.innerHTML = `<option value="">No tests in vault</option>`;
        document.getElementById("vault-test-display").innerHTML = `<p class="text-slate-500 italic p-6 border border-dashed border-slate-800 rounded-xl text-center">No assessments locked in secure vault.</p>`;
        return;
    }
    
    tests.forEach((t, i) => {
        sel.innerHTML += `<option value="${i}">${t.date} &bull; ${t.subject}</option>`;
    });
    window.renderVaultTest();
};

window.renderVaultTest = function() {
    const sel = document.getElementById("vault-test-selector");
    if (!sel || !sel.value) return;
    const test = window.activeStudentDossier.slipTests[sel.value];
    const display = document.getElementById("vault-test-display");
    if (!test || !display) return;
    
    display.innerHTML = `
        <div class="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-sm">
            <div><span class="text-slate-500 uppercase font-bold text-[10px] tracking-wider block mb-1">Verified Score</span><span class="text-2xl font-mono font-bold text-emerald-400">${test.marksObtained}/${test.maxMarks}</span></div>
            <span class="text-slate-400 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">${test.date}</span>
        </div>
        <p class="text-slate-300 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed shadow-sm"><span class="text-slate-500 font-bold block mb-1 uppercase tracking-wider text-[10px]">Evaluator Remarks</span>${test.remarks || 'No remarks added.'}</p>
    `;
};

window.openCustomRangePdfModal = function() { document.getElementById("modal-range-pdf").classList.remove("hidden"); };
window.closeCustomRangePdfModal = function() { document.getElementById("modal-range-pdf").classList.add("hidden"); };

window.executeDossierPdfExport = function() {
    const start = document.getElementById("pdf-start-date").value || "2026-10-01";
    const end = document.getElementById("pdf-end-date").value || "2026-10-31";
    const s = window.activeStudentDossier;
    
    document.getElementById("pdf-print-name").textContent = s.name;
    document.getElementById("pdf-print-class").textContent = `Class ${s.class} (${s.boardStream || 'SSC'}) | ${s.school || 'Academy'}`;
    document.getElementById("pdf-print-father").textContent = s.fatherPhone || "N/A";
    document.getElementById("pdf-print-mother").textContent = s.motherPhone || "N/A";
    document.getElementById("pdf-print-range").textContent = `Reporting Window: ${start} to ${end}`;
    
    const tBody = document.getElementById("pdf-print-attendance-body");
    tBody.innerHTML = "";
    
    const log = s.dailySubjectLog || {};
    Object.keys(log).sort().forEach(dt => {
        const items = log[dt];
        const itemsText = items.map(it => `<strong>${it.subject}:</strong> ${it.chapter} (${it.topics})`).join("<br>");
        let statusRender = `<span class="text-emerald-700 font-bold">PRESENT (P)</span>`;
        if(items[0].subject === "ABSENT") statusRender = `<span class="text-rose-700 font-bold">ABSENT (A)</span>`;
        else if(items[0].subject === "HOLIDAY") statusRender = `<span class="text-orange-600 font-bold">HOLIDAY (H)</span>`;
        else if(items[0].subject === "LATE") statusRender = `<span class="text-amber-600 font-bold">LATE (L)</span>`;
        
        tBody.innerHTML += `
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2.5 border border-slate-200 font-mono font-bold text-slate-800">${dt}</td>
                <td class="p-2.5 border border-slate-200">${statusRender}</td>
                <td class="p-2.5 border border-slate-200 leading-tight text-slate-700">${itemsText}</td>
            </tr>
        `;
    });
    
    const diff = (document.getElementById("comp-tuition-avg")?.textContent || "0%") + " vs " + (document.getElementById("comp-school-avg")?.textContent || "0%");
    document.getElementById("pdf-print-comparison-summary").innerHTML = `
        <strong>Executive Analytical Assessment:</strong><br>
        Overall Tuition Daily Benchmark: <strong>${document.getElementById("comp-tuition-avg")?.textContent || "0%"}</strong> | School Examination Benchmark: <strong>${document.getElementById("comp-school-avg")?.textContent || "0%"}</strong>.<br>
        Comparative Delta Profile: <strong>${diff}</strong>. Matrix strictly verifies structural academic progression across standardized and institution-level criteria.
    `;
    
    const printTests = document.getElementById("pdf-print-tests");
    printTests.innerHTML = "";
    (s.slipTests || []).forEach(st => {
        printTests.innerHTML += `
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] flex justify-between shadow-sm">
                <span class="text-slate-800"><strong>${st.subject}</strong>: ${st.chapter || ''} (${st.subtopic || 'Test'})</span>
                <span class="font-mono font-bold text-emerald-700">${st.marksObtained}/${st.maxMarks}</span>
            </div>
        `;
    });
    
    const printExams = document.getElementById("pdf-print-exams");
    printExams.innerHTML = "";
    (s.exams || []).forEach(ex => {
        printExams.innerHTML += `
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] flex justify-between shadow-sm">
                <span class="text-slate-800"><strong>${ex.name}</strong> (${ex.subject})</span>
                <span class="font-mono font-bold text-indigo-700">${ex.scored}/${ex.total}</span>
            </div>
        `;
    });

    window.closeCustomRangePdfModal();
    const pdfEl = document.getElementById("printable-pdf-dossier");
    pdfEl.classList.remove("hidden");
    
    window.showMsg("Generating Report", "Building official PTM Matrix PDF. Please wait...");
    
    html2pdf().set({
        margin: 0.4,
        filename: `${s.name.replace(/\s+/g, '_')}_Academic_PTM_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(pdfEl).save().then(() => {
        pdfEl.classList.add("hidden");
        window.closeMsg();
    });
};

window.openStaffCalendar = function(name, id) {
    document.getElementById("staff-calendar-title").textContent = `Attendance Matrix: ${name}`;
    const grid = document.getElementById("staff-calendar-grid");
    grid.innerHTML = "";
    
    const staff = (window.directorStaff || []).find(s => s.id === id);
    const logs = staff?.attendanceLogs || {};
    
    const picker = document.getElementById("staff-month-picker");
    if(picker && !picker.value) {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        picker.value = `${today.getFullYear()}-${mm}`;
    }
    
    let yearStr = "2026", monthStr = "10";
    if (picker) {
        [yearStr, monthStr] = picker.value.split("-");
    }
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
        
        let status = "UNMARKED";
        let isHoliday = false;
        
        if (window.holidays && window.holidays.some(h => h.date === dateKey)) {
            isHoliday = true;
            status = "HOLIDAY";
        } else if (logs[dateKey]) {
            status = logs[dateKey].status; 
        }
        
        let colorClasses = "bg-slate-900 border-slate-800 text-slate-500";
        let indicatorHtml = "";
        
        if (status === "HOLIDAY") {
            colorClasses = "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-sm shadow-orange-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-orange-400 mt-1">H</span>`;
        } else if (status === "UNPAID_LEAVE" || status === "PAID_LEAVE") {
            colorClasses = "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-rose-500 mt-1">A</span>`;
        } else if (status === "PRESENT") {
            colorClasses = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-sm shadow-emerald-900/20";
            indicatorHtml = `<span class="block text-[14px] font-black text-emerald-400 mt-1">P</span>`;
        }

        const btn = document.createElement("button");
        btn.className = `p-2 rounded-xl text-center border font-mono text-[11px] transition-all hover:border-indigo-400 ${colorClasses}`;
        btn.innerHTML = `<span class="block">${day}</span>${indicatorHtml}`;
        
        btn.onclick = () => {
            document.getElementById("staff-day-details").classList.remove("hidden");
            const statBox = document.getElementById("staff-day-status");
            const stuBox = document.getElementById("staff-day-students");
            
            if (status === "HOLIDAY") {
                statBox.textContent = "HOLIDAY DECLARED";
                statBox.className = "font-bold text-orange-400";
                stuBox.innerHTML = `<p class="text-slate-500 italic mt-2 border border-dashed border-slate-800 p-3 rounded-lg text-center">Academy closed. No roster generated.</p>`;
            } else if (status === "UNPAID_LEAVE" || status === "PAID_LEAVE") {
                statBox.textContent = status === "UNPAID_LEAVE" ? "ABSENT (UNPAID)" : "ABSENT (PAID LEAVE)";
                statBox.className = "font-bold text-rose-400";
                stuBox.innerHTML = `<p class="text-slate-500 italic mt-2 border border-dashed border-slate-800 p-3 rounded-lg text-center">Reason: ${logs[dateKey]?.reason || 'Not specified'}</p>`;
            } else if (status === "PRESENT") {
                statBox.textContent = "PRESENT";
                statBox.className = "font-bold text-emerald-400";
                const markedStudents = (window.directorStudents || []).filter(s => s.attendanceStatus === 'present'); 
                let stuHtml = `<p class="text-slate-400 mb-2 mt-1">Verified Roster (${markedStudents.length} Students):</p><div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">`;
                markedStudents.forEach(stu => {
                    stuHtml += `<div class="p-2 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center"><span class="text-indigo-300 font-bold cursor-pointer hover:underline" onclick="window.openStudentDossier('${stu.id}')">${stu.name}</span><span class="text-[10px] text-slate-500">Class ${stu.class}</span></div>`;
                });
                stuHtml += `</div>`;
                stuBox.innerHTML = stuHtml;
            } else {
                statBox.textContent = "UNMARKED";
                statBox.className = "font-bold text-slate-500";
                stuBox.innerHTML = `<p class="text-slate-500 italic mt-2 border border-dashed border-slate-800 p-3 rounded-lg text-center">No logs generated for this date.</p>`;
            }
        };
        grid.appendChild(btn);
    }
    
    document.getElementById("modal-staff-calendar").classList.remove("hidden");
};