function initHolidays() {
    const today = new Date().toISOString().split("T")[0];
    if(document.getElementById("hol-date")) document.getElementById("hol-date").value = today;
    
    if (!window.holidays || window.holidays.length === 0) {
        if(typeof loadDashboardData === 'function') loadDashboardData();
    } else {
        renderHolidays();
    }
}

async function handlePublishHoliday(e) {
    e.preventDefault();
    const hd = document.getElementById("hol-date").value;
    const occ = document.getElementById("hol-occ").value;
    const exmStr = document.getElementById("hol-exempt").value;
    const exm = exmStr ? exmStr.split(",").map(s=>s.trim()).filter(Boolean) : [];
    
    const { ok } = await API.post("/holidays/publish", { date: hd, occasion: occ, exemptClasses: exm });
    if(ok) {
        e.target.reset();
        if(typeof showMsg === 'function') showMsg("Holiday Published", "Holiday successfully synced to all staff and student calendars.");
        if(typeof loadDashboardData === 'function') loadDashboardData();
    }
}

function renderHolidays() {
    const list = document.getElementById("holidays-list");
    if(!list) return;
    
    if(!window.holidays || window.holidays.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-500 italic p-3 text-center border border-slate-800 rounded-xl shadow-xs">No active holidays declared.</p>`;
        return;
    }
    
    list.innerHTML = window.holidays.map(h => `
        <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs shadow-xs transition-colors hover:border-pink-500/50">
            <div>
                <span class="font-bold text-white block">${h.occasion}</span>
                <span class="text-[9px] text-pink-400 font-mono">${h.date} | Exempt: ${h.exemptClasses && h.exemptClasses.length > 0 ? h.exemptClasses.join(", ") : 'None'}</span>
            </div>
            <button onclick="deleteGenericRecord('${h.PK}', '${h.SK}', 'Holiday')" class="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 rounded transition-colors shadow-xs touch-btn"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join("");
}