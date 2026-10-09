let securityRole = 'dir';

function initSecurity() {
    switchSecurityTab('dir');
}

function switchSecurityTab(role) {
    securityRole = role;
    document.getElementById("sec-tab-dir").className = (role === 'dir') ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm transition-colors" : "py-2 rounded-lg hover:text-white transition-colors text-slate-400";
    document.getElementById("sec-tab-assoc").className = (role === 'assoc') ? "py-2 rounded-lg bg-indigo-600 text-white shadow-sm transition-colors" : "py-2 rounded-lg hover:text-white transition-colors text-slate-400";
}

async function handleUpdateDirectorSecurity(e) {
    e.preventDefault();
    const newPass = document.getElementById("sec-new-pass").value;
    const newPin = document.getElementById("sec-new-pin").value;
    
    // Security validation
    if (newPin.length !== 6 || isNaN(newPin)) {
        if(typeof showMsg === 'function') showMsg('Error', 'PIN must be exactly 6 numeric digits.');
        return;
    }
    
    const apiRole = securityRole === 'dir' ? 'director' : 'associate_director';
    const { ok } = await API.post("/auth/update-security", { role: apiRole, newPassword: newPass, newPin: newPin });
    
    if(ok) {
        if(typeof showMsg === 'function') showMsg("Success", "Security credentials successfully updated.");
        e.target.reset();
    }
}