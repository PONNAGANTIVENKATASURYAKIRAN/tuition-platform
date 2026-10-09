window.currentDirectorView = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("director.html")) {
        window.loadDirectorView("dashboard");
    } else if (window.location.pathname.includes("tutor.html")) {
        window.loadTutorView("floor");
    }
});

window.toggleSidebar = function() {
    const menu = document.getElementById("sidebar-menu");
    const overlay = document.getElementById("sidebar-overlay");
    if(menu && overlay) {
        menu.classList.toggle("-translate-x-full");
        overlay.classList.toggle("hidden");
    }
};

window.loadDirectorView = async function(viewId) {
    window.currentDirectorView = viewId;
    const root = document.getElementById("app-root");
    if (!root) return;

    root.innerHTML = `<div class="flex justify-center items-center py-20"><i class="fa-solid fa-spinner fa-spin text-indigo-500 text-3xl"></i></div>`;

    try {
        const res = await fetch(`views/director/${viewId}.html`);
        if (!res.ok) throw new Error("View not found");
        root.innerHTML = await res.text();

        // Fire specific initialization logic globally
        if (viewId === 'dashboard' && typeof window.initDashboard === 'function') window.initDashboard();
        if (viewId === 'dispatches' && typeof window.initQueues === 'function') window.initQueues();
        if (viewId === 'intake' && typeof window.initIntake === 'function') window.initIntake();
        if (viewId === 'ledger' && typeof window.initLedger === 'function') window.initLedger();
        if (viewId === 'holidays' && typeof window.initHolidays === 'function') window.initHolidays();
        if (viewId === 'security' && typeof window.initSecurity === 'function') window.initSecurity();

        const menu = document.getElementById("sidebar-menu");
        if (menu && !menu.classList.contains("-translate-x-full")) {
            menu.classList.add("-translate-x-full");
            document.getElementById("sidebar-overlay").classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
        root.innerHTML = `<div class="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-rose-400">Failed to load module: ${viewId}</div>`;
    }
};

window.loadTutorView = async function(viewId) {
    const root = document.getElementById("app-root");
    if (!root) return;
    
    root.innerHTML = `<div class="flex justify-center items-center py-20"><i class="fa-solid fa-spinner fa-spin text-indigo-500 text-3xl"></i></div>`;

    try {
        const res = await fetch(`views/tutor/${viewId}.html`);
        if (!res.ok) throw new Error("View not found");
        root.innerHTML = await res.text();

        if (typeof window.initTutorFloor === 'function') window.initTutorFloor();
    } catch (err) {
        console.error(err);
        root.innerHTML = `<div class="p-6 text-center text-rose-400">Failed to load floor interface.</div>`;
    }
};