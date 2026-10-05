const API = {
  async post(path, body) {
    try {
      const endpoint = window.APP_CONFIG?.apiEndpoint || "";
      const res = await fetch(`${endpoint}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error(`API POST ${path} failed:`, err);
      return { ok: false, status: 500, data: { error: "Network error. Could not connect to API Gateway." } };
    }
  },

  async get(path) {
    try {
      const endpoint = window.APP_CONFIG?.apiEndpoint || "";
      const res = await fetch(`${endpoint}${path}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.error(`API GET ${path} failed:`, err);
      return { ok: false, status: 500, data: { error: "Network error. Could not fetch data." } };
    }
  },
};