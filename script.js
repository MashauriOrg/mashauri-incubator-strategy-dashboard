(function () {
  "use strict";

  /* ============================================================
     THEME
  ============================================================ */
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  let theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  function applyTheme() {
    root.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " mode");
    themeToggle.innerHTML = theme === "dark"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    // Redraw charts so Chart.js re-reads CSS colors
    if (window.__redrawCharts) window.__redrawCharts();
  }
  applyTheme();
  themeToggle.addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });

  /* ============================================================
     NAV / VIEW SWITCHING
  ============================================================ */
  const titles = {
    overview: ["Overview", "Program health at a glance, computed live from your benchmark and diagnostic inputs."],
    logic: ["Logic Model", "Inputs mapped to short-term outputs and long-term impact."],
    benchmark: ["Benchmark vs 5 Limitations", "Score mission and resource allocation against university-led incubator research."],
    diagnostic: ["Gap Diagnostic", "Prioritize organizational and studentpreneur-support gaps."],
  };
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById("view-" + view).classList.add("active");
      document.getElementById("header-title").textContent = titles[view][0];
      document.getElementById("header-subtitle").textContent = titles[view][1];
      document.querySelector(".main").scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      // Charts built while their tab was hidden (display:none) measure a 0x0
      // canvas — force a resize/redraw now that the tab is visible.
      requestAnimationFrame(() => {
        if (view === "benchmark" && radarChart) radarChart.resize();
        if (view === "diagnostic" && quadrantChart) quadrantChart.resize();
      });
    });
  });

  document.getElementById("print-btn").addEventListener("click", () => window.print());

  /* ============================================================
     LOGIC MODEL — connection highlighting
  ============================================================ */
  const logicItems = document.querySelectorAll("#logic-flow .logic-item");
  let activeLogic = null;
  logicItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (activeLogic === item) {
        activeLogic = null;
        logicItems.forEach((i) => i.classList.remove("dim", "lit"));
        return;
      }
      activeLogic = item;
      const connects = (item.dataset.connects || "").split(",").filter(Boolean);
      logicItems.forEach((i) => {
        i.classList.remove("dim", "lit");
        if (i === item || connects.includes(i.dataset.id)) {
          i.classList.add("lit");
        } else {
          i.classList.add("dim");
        }
      });
    });
  });

  /* ============================================================
     DATA — five persistent limitations
  ============================================================ */
  const limitations = [
    {
      id: "mission", label: "Inconsistent Mission", short: "Mission Clarity",
      finding: "Academic and commercial goals pull incubators in different directions, producing mission drift and inconsistent selection criteria.",
      approach: "Mashauri runs as an external partner with one commercial mission \u2014 build entrepreneurial mindset \u2014 under KPI-based statements of work per university/TTO, avoiding the academic-vs-commercial tension built into in-house units.",
      baseline: 2, default: 4,
    },
    {
      id: "financial", label: "Financial Constraints", short: "Financing",
      finding: "Seed capital is too small relative to venture needs, and dependence on a single university subsidy limits sustainability.",
      approach: "Revenue is diversified across licensing fees, TTO/bootcamp sponsorships and per-seat online-campus income rather than one subsidy \u2014 though contracts are still concentrated among a small number of institutions.",
      baseline: 1.5, default: 3,
    },
    {
      id: "industry", label: "Weak Industry Connections", short: "Industry Links",
      finding: "Universities rarely maintain organized, sustained pathways between incubatees and industry, corporates or investors.",
      approach: "TTO and research-centre partnerships put studentpreneurs directly in front of technology-transfer and industry mentors; strength scales with active mentors engaged per cohort.",
      baseline: 2, default: 3.5,
    },
    {
      id: "attitude", label: "Poor Entrepreneurial Attitudes", short: "Founder Mindset",
      finding: "Curriculum rigidity and academic socio-cultural norms leave many graduates without genuine entrepreneurial commitment.",
      approach: "Experiential bootcamp delivery for scientists and students is built specifically to shift mindset, not transfer knowledge \u2014 the open risk is whether the shift persists after the program ends.",
      baseline: 2, default: 4,
    },
    {
      id: "scalability", label: "Low Scalability", short: "Scalability",
      finding: "Incubated ventures rarely grow beyond early stages; incubators lack tracking, follow-on mentorship or capital to support scale-up.",
      approach: "The Moodle-based online campus scales delivery across many universities at low marginal cost \u2014 but mentor capacity and alumni tracking remain the binding constraint on real scale.",
      baseline: 1.5, default: 3.5,
    },
  ];

  function scoreBadge(score) {
    if (score < 2.5) return { cls: "badge-risk", label: "At risk" };
    if (score < 3.75) return { cls: "badge-watch", label: "Watch" };
    return { cls: "badge-ok", label: "Mitigated" };
  }

  const benchmarkSlidersEl = document.getElementById("benchmark-sliders");
  const limitationCardsEl = document.getElementById("limitation-cards");
  const limitationTableEl = document.getElementById("limitation-table-body");

  function setRangeFill(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty("--fill", pct + "%");
  }

  function renderBenchmark() {
    benchmarkSlidersEl.innerHTML = "";
    limitationCardsEl.innerHTML = "";
    limitationTableEl.innerHTML = "";

    limitations.forEach((lim) => {
      // slider control
      const row = document.createElement("div");
      row.className = "slider-row";
      row.innerHTML = `
        <div class="slider-row-head"><span>${lim.label}</span><span class="slider-value" data-testid="text-score-${lim.id}">${lim.current.toFixed(1)}</span></div>
        <input type="range" min="1" max="5" step="0.5" value="${lim.current}" data-id="${lim.id}" data-testid="slider-${lim.id}" aria-label="${lim.label} score" />
      `;
      benchmarkSlidersEl.appendChild(row);
      const input = row.querySelector("input");
      setRangeFill(input);
      input.addEventListener("input", () => {
        lim.current = parseFloat(input.value);
        row.querySelector(".slider-value").textContent = lim.current.toFixed(1);
        setRangeFill(input);
        updateRadar();
        renderLimitationCardsAndTable();
        updateOverview();
      });

      // card + table built via shared renderer
    });
    renderLimitationCardsAndTable();
  }

  function renderLimitationCardsAndTable() {
    limitationCardsEl.innerHTML = "";
    limitationTableEl.innerHTML = "";
    limitations.forEach((lim) => {
      const badge = scoreBadge(lim.current);
      const card = document.createElement("div");
      card.className = "limitation-card";
      card.innerHTML = `
        <div class="limitation-title-row">
          <h4>${lim.label}</h4>
          <span class="badge ${badge.cls}">${badge.label}</span>
        </div>
        <p class="limitation-finding">${lim.finding}</p>
        <div class="limitation-approach"><strong>Mashauri approach</strong>${lim.approach}</div>
      `;
      limitationCardsEl.appendChild(card);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${lim.label}</strong></td>
        <td>${lim.finding}</td>
        <td>${lim.approach}</td>
        <td data-testid="table-score-${lim.id}"><strong>${lim.current.toFixed(1)}</strong>/5</td>
        <td>${(5 - lim.current).toFixed(1)}</td>
      `;
      limitationTableEl.appendChild(tr);
    });
  }

  limitations.forEach((l) => (l.current = l.default));
  renderBenchmark();

  /* ---- Radar chart ---- */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  let radarChart;
  function buildRadar() {
    const ctx = document.getElementById("radarChart").getContext("2d");
    if (radarChart) radarChart.destroy();
    const textColor = cssVar("--color-text-muted");
    const gridColor = cssVar("--color-divider");
    radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: limitations.map((l) => l.short),
        datasets: [
          {
            label: "Your program",
            data: limitations.map((l) => l.current),
            borderColor: "#0c7d75",
            backgroundColor: "rgba(12,125,117,0.18)",
            pointBackgroundColor: "#0c7d75",
            borderWidth: 2,
          },
          {
            label: "Typical university-led incubator",
            data: limitations.map((l) => l.baseline),
            borderColor: "#b1453a",
            backgroundColor: "rgba(177,69,58,0.12)",
            pointBackgroundColor: "#b1453a",
            borderWidth: 2,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { titleFont: { family: "General Sans" }, bodyFont: { family: "General Sans" } } },
        scales: {
          r: {
            min: 0, max: 5, ticks: { stepSize: 1, backdropColor: "transparent", color: textColor, font: { size: 10 } },
            grid: { color: gridColor }, angleLines: { color: gridColor },
            pointLabels: { color: textColor, font: { size: 11, family: "General Sans", weight: "600" } },
          },
        },
      },
    });
  }
  function updateRadar() {
    if (!radarChart) return buildRadar();
    radarChart.data.datasets[0].data = limitations.map((l) => l.current);
    radarChart.update();
  }
  buildRadar();

  /* ============================================================
     DIAGNOSTIC — gap prioritization
  ============================================================ */
  const diagItems = [
    { id: "org1", cat: "org", label: "Mission & KPI alignment across partner contracts", desc: "Do all university/TTO statements of work share consistent success metrics?", severity: 2, effort: 2 },
    { id: "org2", cat: "org", label: "Diversified funding & cash runway", desc: "Revenue concentration across a small number of institutional clients.", severity: 4, effort: 4 },
    { id: "org3", cat: "org", label: "Mentor network density & quality assurance", desc: "Enough active, vetted mentors per cohort, with consistent quality.", severity: 4, effort: 3 },
    { id: "org4", cat: "org", label: "Cross-program alumni outcome tracking", desc: "Systematic tracking of venture survival, funding and jobs post-program.", severity: 4, effort: 2 },
    { id: "org5", cat: "org", label: "Delivery-team capacity to scale", desc: "Staff/faculty bandwidth to run more cohorts without quality loss.", severity: 3, effort: 4 },
    { id: "org6", cat: "org", label: "Brand reach to new TTOs & universities", desc: "Pipeline of new institutional partners beyond the current portfolio.", severity: 3, effort: 3 },
    { id: "stu1", cat: "student", label: "Pre-program entrepreneurial readiness screening", desc: "Selecting studentpreneurs with genuine founder intent, not just interest.", severity: 2, effort: 2 },
    { id: "stu2", cat: "student", label: "Mentor : studentpreneur ratio during program", desc: "Enough 1:1 time to move ideas from concept to validated MVP.", severity: 3, effort: 3 },
    { id: "stu3", cat: "student", label: "Access to seed funding & prototyping resources", desc: "Small grants, lab time or maker-space access for early prototyping.", severity: 4, effort: 4 },
    { id: "stu4", cat: "student", label: "Post-program alumni support & follow-on funding path", desc: "Structured support after graduation so momentum doesn't stall.", severity: 5, effort: 3 },
    { id: "stu5", cat: "student", label: "Live customer / industry access during program", desc: "Real customer-discovery conversations, not simulated exercises.", severity: 3, effort: 2 },
    { id: "stu6", cat: "student", label: "Peer community & alumni network after graduation", desc: "Ongoing peer support network once the formal program ends.", severity: 3, effort: 2 },
  ];

  function priorityScore(item) { return item.severity * (6 - item.effort); }
  function tierOf(score) {
    if (score >= 16) return { key: "now", cls: "tier-now", label: "Now \u2014 quick win" };
    if (score >= 8) return { key: "next", cls: "tier-next", label: "Next" };
    return { key: "later", cls: "tier-later", label: "Later" };
  }

  const diagListEl = document.getElementById("diag-list");
  const rankedBodyEl = document.getElementById("ranked-table-body");
  const priorityCalloutEl = document.getElementById("priority-callout");
  let diagFilter = "all";

  document.getElementById("diag-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-pill-btn");
    if (!btn) return;
    document.querySelectorAll("#diag-tabs .tab-pill-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    diagFilter = btn.dataset.cat;
    renderDiagList();
  });

  function renderDiagList() {
    diagListEl.innerHTML = "";
    const items = diagItems.filter((d) => diagFilter === "all" || d.cat === diagFilter);
    items.forEach((item) => {
      const score = priorityScore(item);
      const tier = tierOf(score);
      const row = document.createElement("div");
      row.className = "diag-item";
      row.innerHTML = `
        <div>
          <div class="diag-item-label">${item.label}</div>
          <div class="diag-item-desc">${item.desc}</div>
        </div>
        <div class="slider-row">
          <div class="slider-row-head"><span>Severity</span><span class="slider-value">${item.severity}</span></div>
          <input type="range" min="1" max="5" step="1" value="${item.severity}" data-field="severity" data-id="${item.id}" data-testid="slider-severity-${item.id}" aria-label="${item.label} severity" />
        </div>
        <div class="slider-row">
          <div class="slider-row-head"><span>Effort</span><span class="slider-value">${item.effort}</span></div>
          <input type="range" min="1" max="5" step="1" value="${item.effort}" data-field="effort" data-id="${item.id}" data-testid="slider-effort-${item.id}" aria-label="${item.label} effort" />
        </div>
        <div class="diag-score-pill ${tier.cls}" data-testid="pill-priority-${item.id}">${score}</div>
      `;
      diagListEl.appendChild(row);
      row.querySelectorAll('input[type="range"]').forEach((input) => {
        setRangeFill(input);
        input.addEventListener("input", () => {
          const field = input.dataset.field;
          item[field] = parseInt(input.value, 10);
          row.querySelector(`[data-field="${field}"]`).previousElementSibling; // no-op guard
          row.querySelectorAll(".slider-row").forEach((sr) => {
            const f = sr.querySelector("input").dataset.field;
            sr.querySelector(".slider-value").textContent = item[f];
          });
          setRangeFill(input);
          const newScore = priorityScore(item);
          const newTier = tierOf(newScore);
          const pill = row.querySelector(".diag-score-pill");
          pill.textContent = newScore;
          pill.className = "diag-score-pill " + newTier.cls;
          renderRankedTable();
          renderPriorityCallout();
          updateQuadrant();
          updateOverview();
        });
      });
    });
  }

  function renderRankedTable() {
    rankedBodyEl.innerHTML = "";
    const sorted = [...diagItems].sort((a, b) => priorityScore(b) - priorityScore(a));
    sorted.forEach((item) => {
      const score = priorityScore(item);
      const tier = tierOf(score);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.label}</strong></td>
        <td>${item.severity}</td>
        <td>${item.effort}</td>
        <td><strong>${score}</strong></td>
        <td><span class="badge ${tier.cls === "tier-now" ? "badge-risk" : tier.cls === "tier-next" ? "badge-watch" : "badge-ok"}">${tier.label}</span></td>
      `;
      rankedBodyEl.appendChild(tr);
    });
  }

  function renderPriorityCallout() {
    priorityCalloutEl.innerHTML = "";
    const sorted = [...diagItems].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 3);
    sorted.forEach((item, idx) => {
      const score = priorityScore(item);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <span class="rank">#${idx + 1}</span>
        <p class="name" data-testid="text-priority-rank-${idx + 1}">${item.label}</p>
        <p class="meta">Priority ${score} &middot; Severity ${item.severity} / Effort ${item.effort} &middot; ${item.cat === "org" ? "Organizational" : "Studentpreneur support"}</p>
      `;
      priorityCalloutEl.appendChild(card);
    });
  }

  let quadrantChart;
  function quadrantBgPlugin() {
    return {
      id: "quadrantBg",
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const xMid = scales.x.getPixelForValue(3);
        const yMid = scales.y.getPixelForValue(3);
        ctx.save();
        // quick wins: high severity(y top), low effort(x left)
        ctx.fillStyle = "rgba(63,125,76,0.06)";
        ctx.fillRect(chartArea.left, chartArea.top, xMid - chartArea.left, yMid - chartArea.top);
        // major projects: high severity, high effort
        ctx.fillStyle = "rgba(184,132,42,0.06)";
        ctx.fillRect(xMid, chartArea.top, chartArea.right - xMid, yMid - chartArea.top);
        // fill-ins: low severity, low effort
        ctx.fillStyle = "rgba(140,140,140,0.05)";
        ctx.fillRect(chartArea.left, yMid, xMid - chartArea.left, chartArea.bottom - yMid);
        // deprioritize: low severity, high effort
        ctx.fillStyle = "rgba(177,69,58,0.05)";
        ctx.fillRect(xMid, yMid, chartArea.right - xMid, chartArea.bottom - yMid);
        ctx.restore();
      },
    };
  }

  function buildQuadrant() {
    const ctx = document.getElementById("quadrantChart").getContext("2d");
    if (quadrantChart) quadrantChart.destroy();
    const textColor = cssVar("--color-text-muted");
    const gridColor = cssVar("--color-divider");
    quadrantChart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Organizational",
            data: diagItems.filter((d) => d.cat === "org").map((d) => ({ x: d.effort, y: d.severity, label: d.label })),
            backgroundColor: "#0c7d75",
            pointRadius: 7, pointHoverRadius: 9,
          },
          {
            label: "Studentpreneur support",
            data: diagItems.filter((d) => d.cat === "student").map((d) => ({ x: d.effort, y: d.severity, label: d.label })),
            backgroundColor: "#c17a1f",
            pointRadius: 7, pointHoverRadius: 9,
          },
        ],
      },
      plugins: [quadrantBgPlugin()],
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { position: "bottom", labels: { color: textColor, font: { size: 11, family: "General Sans" }, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label(c) { return `${c.raw.label}  \u2014  severity ${c.raw.y}, effort ${c.raw.x}`; },
            },
          },
        },
        scales: {
          x: { min: 0.5, max: 5.5, title: { display: true, text: "Effort to fix \u2192", color: textColor, font: { size: 11 } }, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
          y: { min: 0.5, max: 5.5, title: { display: true, text: "Severity of gap \u2192", color: textColor, font: { size: 11 } }, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
        },
      },
    });
  }
  function updateQuadrant() {
    if (!quadrantChart) return buildQuadrant();
    quadrantChart.data.datasets[0].data = diagItems.filter((d) => d.cat === "org").map((d) => ({ x: d.effort, y: d.severity, label: d.label }));
    quadrantChart.data.datasets[1].data = diagItems.filter((d) => d.cat === "student").map((d) => ({ x: d.effort, y: d.severity, label: d.label }));
    quadrantChart.update();
  }

  renderDiagList();
  renderRankedTable();
  renderPriorityCallout();
  buildQuadrant();

  /* ============================================================
     OVERVIEW — computed KPIs
  ============================================================ */
  function updateOverview() {
    const avgCurrent = limitations.reduce((s, l) => s + l.current, 0) / limitations.length;
    const avgBaseline = limitations.reduce((s, l) => s + l.baseline, 0) / limitations.length;
    document.getElementById("kpi-maturity").textContent = avgCurrent.toFixed(1) + " / 5";
    const deltaEl = document.getElementById("kpi-maturity-delta");
    const delta = avgCurrent - avgBaseline;
    deltaEl.textContent = (delta >= 0 ? "+" : "") + delta.toFixed(1) + " vs. sector baseline";
    deltaEl.className = "kpi-delta " + (delta >= 1 ? "good" : delta >= 0 ? "warn" : "bad");

    const weakest = [...limitations].sort((a, b) => a.current - b.current)[0];
    document.getElementById("kpi-weakest").textContent = weakest.short;
    document.getElementById("kpi-weakest-score").textContent = weakest.current.toFixed(1) + " / 5";

    document.getElementById("kpi-gaps").textContent = diagItems.length;
    const quickWins = diagItems.filter((d) => tierOf(priorityScore(d)).key === "now").length;
    document.getElementById("kpi-gaps-quickwins").textContent = quickWins + " quick win" + (quickWins === 1 ? "" : "s") + " identified";

    const topAction = [...diagItems].sort((a, b) => priorityScore(b) - priorityScore(a))[0];
    document.getElementById("kpi-top-action").textContent = topAction.label;
    document.getElementById("kpi-top-action-score").textContent = "Priority score " + priorityScore(topAction);
  }
  updateOverview();

  /* ============================================================
     RESET ALL
  ============================================================ */
  document.getElementById("reset-all").addEventListener("click", () => {
    limitations.forEach((l) => (l.current = l.default));
    diagItems.forEach((d, idx) => {
      const defaults = [
        [2, 2], [4, 4], [4, 3], [4, 2], [3, 4], [3, 3],
        [2, 2], [3, 3], [4, 4], [5, 3], [3, 2], [3, 2],
      ];
      d.severity = defaults[idx][0];
      d.effort = defaults[idx][1];
    });
    renderBenchmark();
    updateRadar();
    renderDiagList();
    renderRankedTable();
    renderPriorityCallout();
    updateQuadrant();
    updateOverview();
  });

  /* ============================================================
     THEME-AWARE CHART REDRAW
  ============================================================ */
  window.__redrawCharts = function () {
    buildRadar();
    buildQuadrant();
  };
})();
