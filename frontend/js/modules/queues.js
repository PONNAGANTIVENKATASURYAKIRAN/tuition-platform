let activeQueueFilter = 'ALL';

function initQueues() {
    loadDispatchQueue();
}

async function loadDispatchQueue() {
    const { ok, data } = await API.get("/director/master-data");
    if (ok && data.queue) {
        window.rawDispatchQueue = data.queue;
    }
    renderQueue();
}

function filterQueue(cat) {
    activeQueueFilter = cat;
    ['ALL', 'ABSENT_ALERT', 'FEE_REMINDER', 'DISCIPLINE'].forEach(c => {
        const idMap = {'ALL':'all', 'ABSENT_ALERT':'absent', 'FEE_REMINDER':'fees', 'DISCIPLINE':'disc'};
        const btn = document.getElementById(`qcat-${idMap[c]}`);
        if (btn) btn.className = (cat === c) ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm transition-colors" : "py-2 rounded-lg hover:text-white transition-colors text-slate-400";
    });
    renderQueue();
}

function renderQueue() {
    const list = document.getElementById("queue-cards-list");
    if(!list) return;
    
    let filtered = window.rawDispatchQueue || [];
    if (activeQueueFilter !== "ALL") filtered = filtered.filter(q => q.type === activeQueueFilter);
    
    const qClass = document.getElementById("queue-filter-class")?.value;
    if(qClass && qClass !== "ALL") filtered = filtered.filter(q => String(q.class) === qClass);
    
    const qGender = document.getElementById("queue-filter-gender")?.value;
    if(qGender && qGender !== "ALL") filtered = filtered.filter(q => String(q.gender) === qGender);

    if (filtered.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl shadow-xs">Queue is clear. Excellent work.</div>`;
        return;
    }

    list.innerHTML = filtered.map(q => `
        <div class="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 hover:border-indigo-500 transition-colors shadow-xs">
            <div class="flex justify-between items-start">
                <span class="font-bold text-white text-xs">${q.studentName} <span class="text-[9px] text-slate-500">(Class ${q.class})</span></span>
                <button onclick="deleteGenericRecord('${q.PK}', '${q.SK}', 'Queue Item')" class="text-slate-500 hover:text-rose-400 transition-colors p-1 touch-btn"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <p class="text-[11px] text-slate-300 font-mono bg-slate-950 p-2 rounded border border-slate-800/50">${q.message}</p>
            <div class="flex justify-between items-center pt-1">
                ${window.isMainDirector ? `<button onclick="resolveDispatch('${q.SK}', '${q.phone}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold touch-btn shadow-xs transition-colors"><i class="fa-brands fa-whatsapp text-sm mr-1"></i><span>Dispatch</span></button>` : `<p class="text-[9px] text-rose-400 italic">Main Director dispatch only.</p>`}
            </div>
        </div>
    `).join("");
}

async function resolveDispatch(sk, phone) {
    const { ok } = await API.post("/queues/resolve", { SK: sk, reply: "Dispatched" });
    if(ok) {
        if(typeof showMsg === 'function') showMsg("Dispatched", "Message sent via WhatsApp and safely cleared from queue.");
        loadDispatchQueue();
        window.open(`https://wa.me/91${phone}?text=Tuition%20Update`, '_blank'); 
    }
}