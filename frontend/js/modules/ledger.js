window.activeLedgerTab = 'students';
window.activeStuLedgerFilter = 'ALL';
window.activeStfLedgerFilter = 'ALL';
window.activePartialPayId = null;
window.activeStaffPayId = null;

window.initLedger = function() {
    if (!window.directorStudents || window.directorStudents.length === 0) {
        if (typeof window.loadDashboardData === 'function') window.loadDashboardData();
    } else {
        window.loadFinancialLedger();
    }
};

window.switchLedgerTab = function(tab) {
    window.activeLedgerTab = tab;
    ['students', 'staff', 'expenses'].forEach(t => {
        const el = document.getElementById(`ledger-${t}`);
        if(el) el.classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`ledg-tab-${t}`);
        if(btn) btn.className = (t === tab) ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm transition-colors" : "py-2 rounded-lg text-slate-400 hover:text-white transition-colors";
    });
};

window.filterStudentLedger = function(fl) {
    window.activeStuLedgerFilter = fl;
    ['ALL', 'PAID', 'UNPAID', 'PARTIAL', 'LEFT_TUITION'].forEach(f => {
        const btn = document.getElementById(`fl-stu-${f}`);
        if(btn) btn.className = (f === fl) ? "px-3 py-1.5 rounded-lg bg-indigo-600 text-white shrink-0 transition-colors" : "px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors";
    });
    window.renderLedgerStudents();
};

window.filterStaffLedger = function(fl) {
    window.activeStfLedgerFilter = fl;
    ['ALL', 'PAID'].forEach(f => {
        const btn = document.getElementById(`fl-stf-${f}`);
        if(btn) btn.className = (f === fl) ? "px-3 py-1.5 rounded-lg bg-indigo-600 text-white transition-colors" : "px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors";
    });
    window.renderLedgerStaff();
};

window.calculateStudentDue = function(s) {
    if(s.status === 'LEFT_TUITION') return "LEFT_TUITION";
    if (s.feeStatus === "PAID") return "PAID";
    if (s.feeStatus === "PARTIAL") return "PARTIAL";
    return "UNPAID";
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

window.renderLedgerStudents = function() {
    const list = document.getElementById("director-fees-list-container");
    if(!list) return;
    
    let collected = 0, unpaid = 0, expensesTotal = 0, payrollTotal = 0;
    
    (window.expenses || []).forEach(ex => expensesTotal += parseFloat(ex.amount));
    
    const validStaff = (window.directorStaff || []).filter(s => s.status === 'ACTIVE');
    validStaff.forEach(s => {
        const payData = window.calculateStaffPayroll(s);
        payrollTotal += payData.finalPay;
    });
    
    const enriched = (window.directorStudents || []).map(s => {
        const fee = parseFloat(s.monthlyFee) || 1500;
        const paidAmt = parseFloat(s.paidAmount) || 0;
        const calcStatus = window.calculateStudentDue(s);
        
        if(s.status !== 'LEFT_TUITION') {
            if (calcStatus === "PAID") collected += fee;
            else if (calcStatus === "PARTIAL") { collected += paidAmt; unpaid += (fee - paidAmt); }
            else unpaid += fee;
        }
        return { ...s, calcStatus, fee, paidAmt };
    });
    
    if(document.getElementById("pl-fees")) document.getElementById("pl-fees").textContent = `₹${collected}`;
    if(document.getElementById("pl-staff")) document.getElementById("pl-staff").textContent = `₹${payrollTotal}`;
    if(document.getElementById("pl-exp")) document.getElementById("pl-exp").textContent = `₹${expensesTotal}`;
    
    if(document.getElementById("pl-net")) {
        const net = collected - payrollTotal - expensesTotal;
        const netEl = document.getElementById("pl-net");
        netEl.textContent = `₹${net}`;
        netEl.className = net < 0 ? "text-sm font-mono font-bold text-rose-400" : "text-sm font-mono font-bold text-emerald-400";
    }
    
    let filtered = enriched;
    if(window.activeStuLedgerFilter !== 'ALL') {
        filtered = enriched.filter(s => s.calcStatus === window.activeStuLedgerFilter);
    } else {
        filtered = enriched.filter(s => s.calcStatus !== 'LEFT_TUITION');
    }
    
    if(filtered.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 text-center border border-slate-800 rounded-xl">No student fee records found in this view.</p>`;
        return;
    }
    
    list.innerHTML = filtered.map(s => `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs transition-colors hover:border-indigo-500">
            <div>
                <span class="font-bold text-white block cursor-pointer hover:text-indigo-400 transition-colors" onclick="window.openStudentDossier('${s.id}')">${s.name}</span>
                <span class="text-[10px] text-slate-500">Fee: ₹${s.fee} | Status: <strong class="${s.calcStatus === 'PAID' ? 'text-emerald-400' : s.calcStatus === 'PARTIAL' ? 'text-amber-400' : 'text-rose-400'}">${s.calcStatus}</strong></span><br>
                ${s.calcStatus === 'PARTIAL' ? `<span class="text-amber-400 font-mono font-bold">Paid: ₹${s.paidAmt} \vert{} Due: ₹${s.fee - s.paidAmt}</span>` : ''}
            </div>
            <div class="flex space-x-1 shrink-0">
                ${window.isMainDirector && s.calcStatus !== 'LEFT_TUITION' ? `<button onclick="window.queueFeeReminder('${s.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold rounded-lg transition-colors"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
                ${s.calcStatus !== 'LEFT_TUITION' ? `<button onclick="window.promptPartialPay('${s.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg transition-colors">Partial</button>` : ''}
                <button onclick="window.toggleStudentFee('${s.id}', '${s.calcStatus === 'PAID' ? 'UNPAID' : 'PAID'}')" class="px-2 py-1 ${s.calcStatus === 'PAID' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'} font-bold rounded-lg transition-colors">${s.calcStatus === 'PAID' ? 'Mark Unpaid' : 'Mark Paid'}</button>
            </div>
        </div>
    `).join("");
};

window.renderLedgerStaff = function() {
    const list = document.getElementById("ledger-staff-list");
    if(!list) return;
    
    const valid = (window.directorStaff || []).filter(s => s.status === 'ACTIVE');
    if(valid.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 text-center border border-slate-800 rounded-xl">No active staff records found.</p>`;
        return;
    }
    
    list.innerHTML = valid.map(s => {
        const payData = window.calculateStaffPayroll(s);
        return `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs transition-colors hover:border-indigo-500">
            <div>
                <span class="font-bold text-white block">${s.name}</span>
                <span class="text-slate-400 font-mono text-[10px]">Base: ₹${payData.base} | Cycle: ${payData.cycleDays} days</span><br>
                <span class="text-slate-400 font-mono text-[10px]">Unpaid Leaves: ${payData.unpaidLeaves} (-₹${payData.deduction}) | Paid Leaves: ${payData.paidLeaves} | Adj: +₹${payData.adjustments}</span>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
                <span class="font-bold text-emerald-400 font-mono text-sm">₹${payData.finalPay}</span>
                <button onclick="window.promptStaffPayAdj('${s.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold rounded-lg transition-colors"><i class="fa-solid fa-pen"></i></button>
            </div>
        </div>`;
    }).join("");
};

window.promptPartialPay = function(sid) {
    window.activePartialPayId = sid;
    document.getElementById("modal-partial-pay").classList.remove("hidden");
};
window.closePartialPay = function() { document.getElementById("modal-partial-pay").classList.add("hidden"); };

window.confirmPartialPay = async function() {
    const amt = document.getElementById("partial-pay-amt").value;
    const { ok } = await API.post("/director/toggle-fee", { studentId: window.activePartialPayId, feeStatus: "PARTIAL", paidAmount: parseFloat(amt) });
    if(ok) {
        window.closePartialPay();
        if(typeof window.showMsg === 'function') window.showMsg("Updated", "Partial payment successfully recorded.");
        window.loadDashboardData();
    }
};

window.toggleStudentFee = async function(sid, status) {
    await API.post("/director/toggle-fee", { studentId: sid, feeStatus: status, paidAmount: 0 });
    window.loadDashboardData();
};

window.promptStaffPayAdj = function(sid) {
    window.activeStaffPayId = sid;
    document.getElementById("modal-staff-pay").classList.remove("hidden");
};
window.closeStaffPay = function() { document.getElementById("modal-staff-pay").classList.add("hidden"); };

window.confirmStaffPay = async function() {
    const adj = document.getElementById("staff-pay-adj").value;
    const { ok } = await API.post("/director/update-staff-payroll", { staffId: window.activeStaffPayId, adjustments: parseFloat(adj) });
    if(ok) {
        window.closeStaffPay();
        if(typeof window.showMsg === 'function') window.showMsg("Updated", "Staff payroll adjustment applied.");
        window.loadDashboardData();
    }
};

window.handleLogExpense = async function(e) {
    e.preventDefault();
    const desc = document.getElementById("exp-desc").value;
    const amt = document.getElementById("exp-amount").value;
    const { ok } = await API.post("/director/add-expense", { description: desc, amount: parseFloat(amt), date: new Date().toISOString() });
    if(ok) {
        e.target.reset();
        window.loadDashboardData();
    }
};

window.renderExpenses = function() {
    const list = document.getElementById("ledger-expense-list");
    if(!list) return;
    if(!window.expenses || window.expenses.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 text-center border border-slate-800 rounded-xl">No expenses recorded.</p>`;
        return;
    }
    list.innerHTML = window.expenses.map(ex => `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs shadow-sm">
            <div><span class="font-bold text-white block">${ex.description}</span></div>
            <div class="flex items-center space-x-2">
                <span class="font-mono text-rose-400 font-bold">-₹${ex.amount}</span>
                <button onclick="window.deleteGenericRecord('${ex.PK}', '${ex.SK}', 'Expense')" class="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded transition-colors"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join("");
};

window.loadFinancialLedger = function() {
    window.renderLedgerStudents();
    window.renderLedgerStaff();
    window.renderExpenses();
};

window.queueFeeReminder = async function(sid) {
    if(typeof window.showMsg === 'function') window.showMsg('Queued', 'Fee reminder manually added to WhatsApp queue.');
};