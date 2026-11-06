/* Plan B desk UI */
(function () {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const parts = Object.fromEntries(
    hash.split("&").filter(Boolean).map(p => {
      const i = p.indexOf("=");
      return i >= 0 ? [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))] : [p, ""];
    })
  );
  let DATA_PATH = parts.d || localStorage.getItem("DATA_PATH") || "";
  let APP_TOKEN = parts.t || localStorage.getItem("APP_TOKEN") || "";
  if (parts.d) localStorage.setItem("DATA_PATH", parts.d);
  if (parts.t) localStorage.setItem("APP_TOKEN", parts.t);

  function base() {
    if (!DATA_PATH) return null;
    const root = location.pathname.replace(/\/[^/]*$/, "/");
    return root + "d/" + DATA_PATH;
  }

  async function getJSON(name) {
    const b = base();
    if (!b) throw new Error("missing DATA_PATH — open with #d=...");
    const url = b + "/" + name + "?_=" + Date.now();
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(name + " " + r.status);
    return r.json();
  }

  const $ = (id) => document.getElementById(id);

  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("on"));
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("on"));
      btn.classList.add("on");
      $("tab-" + btn.dataset.tab).classList.add("on");
    });
  });

  let selectedMint = null;

  function cardText(state, key, fallback) {
    if (state.cards && state.cards[key]) return state.cards[key];
    return fallback;
  }

  async function refresh() {
    if (!DATA_PATH) {
      $("settingsPre").textContent = "Add #d=YOUR_DATA_PATH to the URL (Plan B).";
      $("stackLbl").textContent = "no #d=";
      return;
    }
    try {
      const state = await getJSON("state.json");
      $("modePill").textContent = state.mode || "PAPER";
      const stack = state.stack != null ? state.stack : state.balance;
      $("stackLbl").textContent = stack != null ? ("$" + Number(stack).toFixed(0)) : "—";
      const waiting = (state.waiting == null ? 0 : state.waiting);
      $("c-scanner").textContent = cardText(state, "scanner", waiting + " pools");
      $("c-auditor").textContent = cardText(state, "auditor", "—");
      $("c-executor").textContent = cardText(state, "executor", "—");
      $("c-risk").textContent = cardText(state, "risk", "—");
      const s = state.settings || {};
      $("stopPill").textContent = "stop -" + (s["risk.stop_pct"] != null ? s["risk.stop_pct"] : "?") + "%";
      $("trailPill").textContent = "trail " + (s["risk.trail_pct"] != null ? s["risk.trail_pct"] : "?") + "%";
      $("settingsPre").textContent = JSON.stringify(s, null, 2);

      const act = await getJSON("activity.json");
      const ul = $("activityList");
      ul.innerHTML = "";
      const items = act.items || act.rows || [];
      items.forEach(row => {
        const li = document.createElement("li");
        if ((row.detail || "").includes("kill") || row.kind === "reject") li.classList.add("kill");
        li.innerHTML = '<span class="t">' + (row.title || "") + '</span><span class="d">' + (row.detail || "") + " · " + (row.ts || "") + "</span>";
        if (row.mint) {
          li.style.cursor = "pointer";
          li.onclick = () => { selectedMint = row.mint; loadCoin(row.mint); document.querySelector("[data-tab=coin]").click(); };
        }
        ul.appendChild(li);
      });

      const chart = await getJSON("chart.json");
      DeskChart.draw($("miniChart"), chart.candles || chart.points || []);
      if (selectedMint) await loadCoin(selectedMint);
    } catch (e) {
      console.warn(e);
      $("settingsPre").textContent = String(e.message || e) + "\nOpen URL with #d=DATA_PATH";
      $("stackLbl").textContent = "err";
    }
  }

  async function loadCoin(mint) {
    try {
      const data = await getJSON("coin/" + mint + ".json");
      const c = data.coin || {};
      $("coinMeta").textContent = (c.name || "") + " (" + (c.symbol || "") + ") · " + mint;
      DeskChart.draw($("coinChart"), (data.chart && data.chart.candles) || [], {
        exitLine: data.position && data.position.trail_active
          ? Number(data.position.peak_price) * (1 - Number((data.position.trail_pct || 12) / 100))
          : null
      });
      const box = $("layers");
      box.innerHTML = "";
      let layers = [];
      if (data.audit && data.audit.layers_json) {
        try { layers = JSON.parse(data.audit.layers_json); } catch (_) {}
      }
      for (let i = 1; i <= 8; i++) {
        const L = layers.find(x => x.n === i) || { n: i, name: "Layer " + i, pass: null, value: "not checked" };
        const div = document.createElement("div");
        div.className = "layer " + (L.pass === true ? "ok" : L.pass === false ? "bad" : "grey");
        div.innerHTML = "<strong>" + L.n + ". " + L.name + "</strong><div>" + (L.value || "") + "</div>";
        box.appendChild(div);
      }
      const score = data.analysis && data.analysis.score;
      const ring = $("scoreRing");
      if (score != null) {
        ring.textContent = score;
        ring.classList.toggle("ok", Number(score) >= 70);
      }
    } catch (e) {
      $("coinMeta").textContent = String(e.message || e);
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  }
  refresh();
  setInterval(refresh, 15000);
})();
