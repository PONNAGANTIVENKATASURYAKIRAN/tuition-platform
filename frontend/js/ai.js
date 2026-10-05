function initAIDesk() {
  if (document.getElementById("bedrock-ai-drawer")) return;
  const drawer = document.createElement("div");
  drawer.id = "bedrock-ai-drawer";
  drawer.className = "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden flex justify-end";
  drawer.innerHTML = `
    <div class="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col p-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex items-center space-x-2">
          <div class="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <i class="fa-solid fa-brain text-xs"></i>
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-white">EduDesk AI Assistant</h3>
            <p class="text-[10px] text-indigo-400">Database Grounded · Claude 3 Haiku</p>
          </div>
        </div>
        <button onclick="toggleAIDrawer()" class="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div id="ai-chat-history" class="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
        <div class="p-3 bg-slate-800/80 rounded-2xl text-slate-300 border border-slate-700/50">
          Ask questions about student attendance or slip test performance across classes.<br><br>
          <em>Example: "Which 10th class students scored below 60%?"</em>
        </div>
      </div>
      <form onsubmit="handleAISubmit(event)" class="pt-2 border-t border-slate-800 flex items-center space-x-2">
        <input type="text" id="ai-query-input" required placeholder="Ask about students, scores..." class="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" />
        <button type="submit" id="ai-submit-btn" class="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(drawer);
}

function toggleAIDrawer() {
  initAIDesk();
  document.getElementById("bedrock-ai-drawer").classList.toggle("hidden");
}

async function handleAISubmit(e) {
  e.preventDefault();
  const input = document.getElementById("ai-query-input");
  const query = input.value.trim();
  if (!query) return;

  const history = document.getElementById("ai-chat-history");
  const btn = document.getElementById("ai-submit-btn");

  const userMsg = document.createElement("div");
  userMsg.className = "p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl text-white ml-6 text-xs";
  userMsg.textContent = query;
  history.appendChild(userMsg);
  input.value = "";
  history.scrollTop = history.scrollHeight;

  btn.disabled = true;
  const botMsg = document.createElement("div");
  botMsg.className = "p-3 bg-slate-800 rounded-2xl text-slate-300 border border-slate-700 mr-6 text-xs flex items-center space-x-2";
  botMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-indigo-400"></i><span>Querying DynamoDB & Bedrock...</span>';
  history.appendChild(botMsg);
  history.scrollTop = history.scrollHeight;

  const user = JSON.parse(localStorage.getItem("tuition_user") || "{}");
  const { ok, data } = await API.post("/ai/query", { query: query, role: user.role || "tutor" });
  btn.disabled = false;

  if (ok) {
    botMsg.innerHTML = `<div>${data.answer.replace(/\n/g, "<br>")}</div><div class="text-[9px] text-slate-500 mt-2 font-mono">Tokens: ${data.metrics?.tokens || 0} | Est. Cost: $${data.metrics?.costUSD || 0}</div>`;
  } else {
    botMsg.innerHTML = `<span class="text-rose-400">${data.error || "Failed to process AI query."}</span>`;
  }
  history.scrollTop = history.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  initAIDesk();
});