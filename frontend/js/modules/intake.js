window.intakeStaffRole = 'tutor';
window.intakeStaffStatus = 'ACTIVE';
window.pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!\%*?&#]{8,}$/;

window.initIntake = function() {
    const today = new Date().toISOString().split("T")[0];
    const admDate = document.getElementById("adm-date");
    const joinDate = document.getElementById("staff-join-date");
    if(admDate && !admDate.value) admDate.value = today;
    if(joinDate && !joinDate.value) joinDate.value = today;

    window.handleIntakeClassChange();
    
    if(window.directorStudents && window.directorStudents.length > 0) {
        window.renderAdmissionsRoster();
        window.renderStaffRoster();
    }
};

window.toggleIntakeMode = function(mode) {
    const isStu = mode === 'student';
    document.getElementById("intake-student-panel").classList.toggle("hidden", !isStu);
    document.getElementById("intake-staff-panel").classList.toggle("hidden", isStu);
    document.getElementById("btn-mode-student").className = isStu ? "px-3 py-1 rounded-md bg-indigo-600 text-white transition-colors" : "px-3 py-1 rounded-md text-slate-400 transition-colors hover:text-white";
    document.getElementById("btn-mode-staff").className = !isStu ? "px-3 py-1 rounded-md bg-indigo-600 text-white transition-colors" : "px-3 py-1 rounded-md text-slate-400 transition-colors hover:text-white";
};

window.handleIntakeClassChange = function() {
    const cls = document.getElementById("adm-class")?.value || "10";
    const boardSel = document.getElementById("adm-board");
    const boardWrap = document.getElementById("adm-board-wrapper");
    if (!boardSel || !boardWrap) return;
    
    boardSel.innerHTML = "";
    if (cls.includes("Inter")) {
        boardWrap.classList.remove("hidden");
        boardSel.innerHTML = `
            <option value="MPC">MPC</option>
            <option value="BiPC">BiPC</option>
            <option value="MEC">MEC</option>
            <option value="CEC">CEC</option>
        `;
        document.getElementById("adm-subjects-multi")?.classList.remove("hidden");
        document.getElementById("btech-subj-input")?.classList.add("hidden");
    } else if (cls === "B.Tech") {
        boardWrap.classList.add("hidden");
        document.getElementById("adm-subjects-multi")?.classList.add("hidden");
        document.getElementById("btech-subj-input")?.classList.remove("hidden");
    } else {
        boardWrap.classList.remove("hidden");
        boardSel.innerHTML = `
            <option value="SSC">SSC (State Board)</option>
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
        `;
        document.getElementById("adm-subjects-multi")?.classList.remove("hidden");
        document.getElementById("btech-subj-input")?.classList.add("hidden");
    }
};

window.handleStudentEnroll = async function(e) {
    e.preventDefault();
    
    let subjects = [];
    const cls = document.getElementById("adm-class").value;
    if (cls === "B.Tech") {
        const custom = document.getElementById("custom-subj-val").value.trim();
        subjects = custom ? custom.split(",").map(s => s.trim()) : [];
    } else {
        const sel = document.getElementById("adm-subjects-multi");
        for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].selected) {
                subjects.push(sel.options[i].value);
            }
        }
    }

    const payload = {
        firstName: document.getElementById("adm-fname").value.trim(),
        lastName: document.getElementById("adm-lname").value.trim(),
        class: cls,
        boardStream: cls === "B.Tech" ? "B.Tech" : document.getElementById("adm-board").value,
        gender: document.getElementById("adm-gender").value,
        expectedTime: document.getElementById("adm-time").value,
        admissionDate: document.getElementById("adm-date").value,
        school: document.getElementById("adm-school").value.trim(),
        area: document.getElementById("adm-area").value.trim(),
        fatherName: document.getElementById("adm-father-name").value.trim(),
        fatherPhone: document.getElementById("adm-father-phone").value.trim(),
        motherName: document.getElementById("adm-mother-name").value.trim(),
        motherPhone: document.getElementById("adm-mother-phone").value.trim(),
        subjects: subjects,
        monthlyFee: document.getElementById("adm-fee").value
    };

    const { ok } = await API.post("/intake/student/admit", payload);
    if(ok) {
        window.showMsg('Success', 'Student successfully enrolled into institution database.');
        e.target.reset();
        window.loadDashboardData();
    }
};

window.renderAdmissionsRoster = function() {
    const list = document.getElementById("admissions-roster-list");
    if(!list) return;
    const filter = document.getElementById("adm-roster-class")?.value || "ALL";
    
    let filtered = (window.directorStudents || []).filter(s => s.status !== 'LEFT_TUITION');
    if(filter !== 'ALL') filtered = filtered.filter(s => String(s.class) === filter);
    
    filtered.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    list.innerHTML = filtered.slice(0, 10).map(s => `
        <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between transition-colors hover:border-indigo-500 shadow-xs">
            <div>
                <span class="text-xs font-bold text-white block">${s.name}</span>
                <span class="text-[9px] text-slate-400">Class ${s.class} (${s.boardStream || 'SSC'}) &bull; Arr: ${s.expectedTime || '18:00'}</span>
            </div>
            <button onclick="window.openStudentDossier('${s.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold rounded-lg text-[10px] transition-colors shadow-xs touch-btn">Open Dossier</button>
        </div>
    `).join("");
};

window.selectStaffRole = function(role) {
    window.intakeStaffRole = role;
    ['tutor', 'faculty', 'associate_director'].forEach(r => {
        const btn = document.getElementById(`srole-${r}`);
        if(btn) btn.className = (r === role) ? "py-1.5 rounded bg-indigo-600 text-white shadow-sm transition-colors" : "py-1.5 rounded hover:text-white transition-colors text-slate-400";
    });
    const specBox = document.getElementById("box-specialty");
    if(specBox) specBox.classList.toggle("hidden", role !== 'faculty');
    window.renderStaffRoster();
};

window.switchStaffRoster = function(status) {
    window.intakeStaffStatus = status;
    document.getElementById("sroster-active").className = (status === 'ACTIVE') ? "py-1 bg-indigo-600 text-white rounded transition-colors shadow-sm" : "py-1 transition-colors hover:text-white text-slate-400";
    document.getElementById("sroster-inactive").className = (status === 'INACTIVE') ? "py-1 bg-indigo-600 text-white rounded transition-colors shadow-sm" : "py-1 transition-colors hover:text-white text-slate-400";
    window.renderStaffRoster();
};

window.renderStaffRoster = function() {
    const list = document.getElementById("staff-list-container");
    if(!list) return;
    let filtered = (window.directorStaff || []).filter(s => s.role === window.intakeStaffRole && s.status === window.intakeStaffStatus);
    
    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 border border-dashed border-slate-800 rounded-xl text-center">No staff found matching current criteria.</p>`;
        return;
    }

    list.innerHTML = filtered.map(s => `
        <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between transition-colors hover:border-indigo-500">
            <div><span class="font-bold text-white text-xs block">${s.name}</span><span class="text-[9px] text-slate-500 font-mono">${s.phone}</span></div>
            <button onclick="window.toggleStaffStatus('${s.id}')" class="px-2 py-1 rounded text-[10px] font-bold transition-colors shadow-xs touch-btn ${s.status === 'ACTIVE' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'}">
                ${s.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
            </button>
        </div>
    `).join("");
};

window.toggleStaffStatus = function(id) {
    const staff = (window.directorStaff || []).find(s => s.id === id);
    if(!staff) return;
    const isAct = staff.status === 'ACTIVE';
    const endpoint = isAct ? "/intake/staff/delete" : "/intake/staff/recall";
    const msg = isAct ? "Revoke portal authorization for this staff member?" : "Reactivate staff authorization? (Resets joining date)";
    
    window.showConfirm('Modify Access', msg, async () => {
        await API.post(endpoint, { id, joinDate: new Date().toISOString().split("T")[0] });
        window.showMsg("Updated", "Staff status modified.");
        window.loadDashboardData();
    });
};

window.handleStaffEnroll = async function(e) {
    e.preventDefault();
    const p1 = document.getElementById('staff-pass1').value;
    if(!window.pwdRegex.test(p1)) {
        window.showMsg('Weak Password', 'Requires 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special symbol.');
        return;
    }

    const payload = {
        name: document.getElementById('staff-name').value,
        role: window.intakeStaffRole,
        gender: document.getElementById('staff-gender').value,
        joinDate: document.getElementById('staff-join-date').value,
        phone: document.getElementById('staff-phone').value,
        password: p1,
        salary: document.getElementById('staff-salary').value || 15000
    };

    const { ok } = await API.post("/intake/staff/create", payload);
    if(ok) {
        window.showMsg('Success', 'Staff member enrolled.');
        e.target.reset();
        window.loadDashboardData();
    }
};