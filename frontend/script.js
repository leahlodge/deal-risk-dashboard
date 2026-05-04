const API = "http://127.0.0.1:8000";


/* GLOBAL CHART INSTANCES */
let revenueChartInstance = null;
let ebitdaMarginChartInstance = null;
let debtChartInstance = null;


/* GET TOKEN */
function getToken() {
    return localStorage.getItem("token");
}


/* GET USER ROLE */
const role = localStorage.getItem("role");


/* PAGE LOAD */
window.onload = async function () {
    const token = getToken();
    const params = new URLSearchParams(window.location.search);
    const dealId = params.get("id");

    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("username");

    document.getElementById("userRole").textContent =
        savedUser ? `${savedUser} (${savedRole})` : savedRole || "Unknown";

    const savedNotes = localStorage.getItem("deal_notes");
    if (savedNotes) {
        document.getElementById("analyst-notes").value = savedNotes;
    }

    const savedTimestamp = localStorage.getItem("notes_timestamp");
    if (savedTimestamp) {
        const timestamp = document.getElementById("notes-timestamp");
        if (timestamp) {
            timestamp.textContent = `Last updated: ${savedTimestamp}`;
        }
    }

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch(`${API}/deal-analysis`, {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            window.location.href = "login.html";
            return;
        }

        const deals = await res.json();

        if (!deals.length) {
            alert("No deals found");
            return;
        }

        const selectedDeal = deals.find(
            d => String(d.deal_id) === String(dealId)
        );

        renderDashboard(selectedDeal || deals[0]);

    } catch (err) {
        console.error("Error loading deals:", err);
    }
};


/* RENDER DASHBOARD */


function renderDashboard(deal) {

    /* EXECUTIVE SUMMARY */

    document.getElementById("top-company-name").textContent =
        deal.company_name || "Unknown Company";

    document.getElementById("deal-name").textContent =
        `Deal #${deal.deal_id}`;

    document.getElementById("sector").textContent =
        deal.company_sector || "Unknown Sector";

    document.getElementById("region").textContent =
        deal.company_region || "Unknown Region";

    document.getElementById("revenue-range").textContent =
        deal.revenue ? `£${deal.revenue}M Revenue` : "—";

    document.getElementById("deal-size-header").textContent =
        deal.deal_size ? `£${deal.deal_size}M Deal Size` : "—";

    document.getElementById("instrument-header").textContent =
        deal.instrument || "Senior Secured Loan";

    document.getElementById("status-header").textContent =
        deal.status || "Under Review";

    /* KPI CARDS */

    document.getElementById("revenue").textContent =
        deal.revenue ? `£${deal.revenue}M` : "—";

    document.getElementById("ebitda").textContent =
        deal.ebitda ? `£${deal.ebitda}M` : "—";

    document.getElementById("debt-ebitda").textContent =
        deal.leverage_ratio ? `${deal.leverage_ratio}x` : "—";

    document.getElementById("interest-coverage-kpi").textContent =
        deal.coverage_ratio ? `${deal.coverage_ratio}x` : "—";

    /* DEAL STRUCTURE */

    document.getElementById("instrument").textContent =
        deal.instrument || "—";

    document.getElementById("deal-size").textContent =
        deal.deal_size ? `£${deal.deal_size}M` : "—";

    document.getElementById("interest-rate").textContent =
        deal.interest_rate ? `${deal.interest_rate}%` : "—";

    document.getElementById("maturity").textContent =
        deal.maturity || "—";

    document.getElementById("status").textContent =
        deal.status || "—";

    /* RISK INDICATORS */

    document.getElementById("leverage-ratio").textContent =
        deal.leverage_ratio ? `${deal.leverage_ratio}x` : "—";

    document.getElementById("leverage-label").textContent =
        deal.leverage_label || "—";

    document.getElementById("coverage-ratio").textContent =
        deal.coverage_ratio ? `${deal.coverage_ratio}x` : "—";

    document.getElementById("coverage-label").textContent =
        deal.coverage_label || "—";

    document.getElementById("liquidity-ratio").textContent =
        deal.liquidity_ratio ? `${deal.liquidity_ratio}x` : "—";

    document.getElementById("liquidity-label").textContent =
        deal.liquidity_label || "—";

    document.getElementById("profitability-ratio").textContent =
        deal.profitability_ratio ? `${deal.profitability_ratio}%` : "—";

    document.getElementById("profitability-label").textContent =
        deal.profitability_label || "—";

    /* OVERALL RISK */

    const riskMap = {
        green: "LOW RISK",
        yellow: "MODERATE RISK",
        red: "HIGH RISK"
    };

    const recommendationMap = {
        green: "Proceed with Confidence",
        yellow: "Proceed with Caution",
        red: "Additional Diligence Required"
    };

    const overallRisk = deal.overall_risk || "yellow";
    const riskScore = deal.risk_score || 0;
    setRiskRing(riskScore);
    document.getElementById("risk-band-score").textContent =
    `Score ${riskScore} / 100`;
    const riskLight = document.getElementById("overall-risk-light");
    const riskBadge = document.getElementById("risk-score-badge");
   const band = document.getElementById("risk-band");

band.classList.remove(
    "band-yellow",
    "band-green",
    "band-red"
);

band.classList.add(`band-${overallRisk}`);

    if (riskLight) {
        riskLight.textContent = riskMap[overallRisk] || "—";
        riskLight.className = `traffic-light-large ${overallRisk}`;
    }

    if (riskBadge) {
        riskBadge.textContent = `Risk Score: ${riskScore} / 100`;
        riskBadge.className = `risk-score-badge ${overallRisk}`;
    }

    document.getElementById("overall-risk-label").textContent =
        recommendationMap[overallRisk] || "—";

    if (overallRisk === "green") {
        document.getElementById("risk-summary-text").innerHTML =
            "Strong revenue profile, healthy leverage levels and solid liquidity position support a favourable credit recommendation for investment committee approval.<br><br><strong>Review leverage ratio, liquidity strength and EBITDA margin trends for further confirmation.</strong>";
    }

    else if (overallRisk === "yellow") {
        document.getElementById("risk-summary-text").innerHTML =
            "Stable EBITDA generation and acceptable liquidity profile; however, leverage remains elevated and covenant headroom should be monitored closely.<br><br><strong>Review debt / EBITDA, interest coverage and covenant flexibility before final approval.</strong>";
    }

    else {
        document.getElementById("risk-summary-text").innerHTML =
            "High leverage levels and weaker interest coverage increase refinancing risk. Additional diligence and tighter covenant protections are recommended before approval.<br><br><strong>Review refinancing exposure, liquidity pressure and downside EBITDA sensitivity in detail.</strong>";
    }

    /* COVENANT MONITORING */

    const covenantLeverage = document.getElementById("covenant-leverage");
    const covenantCoverage = document.getElementById("covenant-coverage");

    if (covenantLeverage) {
        covenantLeverage.textContent =
            deal.leverage_ratio ? `${deal.leverage_ratio}x` : "—";
    }

    if (covenantCoverage) {
        covenantCoverage.textContent =
            deal.coverage_ratio ? `${deal.coverage_ratio}x` : "—";
    }

    /* RISK FLAGS */

    const flagsList = document.getElementById("risk-flags-list");
    flagsList.innerHTML = "";

    if (deal.flags && deal.flags.length > 0) {

    setFlagCount(deal.flags.length);

    deal.flags.forEach(flag => {
        flagsList.innerHTML += `
            <li class="flag-item">
                <span class="flag-icon">!!!</span>
                ${flag}
            </li>
        `;
    });

} else {

    setFlagCount(0);

    flagsList.innerHTML = `
        <li class="flag-item">
            <strong><span class="flag-icon">!!!</span></strong>
            No major risk flags
        </li>
    `;
}

    /* KPI SUBTEXT */

    if (overallRisk === "green") {
        document.getElementById("revenue-subtext").textContent =
            "Strong Revenue Growth";
        document.getElementById("ebitda-subtext").textContent =
            "Healthy Margin";
        document.getElementById("debt-subtext").textContent =
            "Conservative Leverage";
        document.getElementById("coverage-subtext").textContent =
            "Strong Coverage";
    }

    else if (overallRisk === "yellow") {
        document.getElementById("revenue-subtext").textContent =
            "Stable Revenue Base";
        document.getElementById("ebitda-subtext").textContent =
            "Moderate Margin";
        document.getElementById("debt-subtext").textContent =
            "Elevated Leverage";
        document.getElementById("coverage-subtext").textContent =
            "Covenant Watch";
    }

    else {
        document.getElementById("revenue-subtext").textContent =
            "Revenue Pressure";
        document.getElementById("ebitda-subtext").textContent =
            "Margin Compression";
        document.getElementById("debt-subtext").textContent =
            "High Leverage Risk";
        document.getElementById("coverage-subtext").textContent =
            "Weak Coverage";
    }

    renderCharts(deal);
}

/* RENDER CHARTS */

function renderCharts(deal) {

   

    if (revenueChartInstance) revenueChartInstance.destroy();
    if (ebitdaMarginChartInstance) ebitdaMarginChartInstance.destroy();
    if (debtChartInstance) debtChartInstance.destroy();

    /* YEARS */

    const years = ["2021", "2022", "2023", "2024", "2025"];

    /* CURRENT VALUES */

    const currentRevenue = Number(deal.revenue || 0);
    const currentEBITDA = Number(deal.ebitda || 0);
    const currentDebt = Number(deal.debt || 0);
    const currentCash = Number(deal.cash || (currentRevenue * 0.08));

    /* Prevent divide-by-zero */

    const safeRevenue = currentRevenue || 1;

    /* ASSUMPTIONS */

    const revenueHistory = [
        +(currentRevenue * 0.68).toFixed(1),
        +(currentRevenue * 0.78).toFixed(1),
        +(currentRevenue * 0.86).toFixed(1),
        +(currentRevenue * 0.93).toFixed(1),
        currentRevenue
    ];

    const ebitdaMarginHistory = [
        +((currentEBITDA / safeRevenue) * 100 - 4).toFixed(1),
        +((currentEBITDA / safeRevenue) * 100 - 2.5).toFixed(1),
        +((currentEBITDA / safeRevenue) * 100 - 1.5).toFixed(1),
        +((currentEBITDA / safeRevenue) * 100 - 0.5).toFixed(1),
        +((currentEBITDA / safeRevenue) * 100).toFixed(1)
    ];


    /* CHART 1 — REVENUE TREND */


    revenueChartInstance = new Chart(
        document.getElementById("revenueChart"),
        {
            type: "line",
            data: {
                labels: years,
                datasets: [{
                    label: "Revenue (£M)",
                    data: revenueHistory,
                    tension: 0.35,
                    borderWidth: 3
                }]
            },
            options: {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
        title: {
           display: true,
            text: "Revenue Growth Trend (£M)",
            font: {
                size: 16,
                weight: "700"
                  },
            color: "#0f172a",
            padding: {
                bottom: 18
            }
        },

        legend: {
            display: true,
            position: "top",
            labels: {
                padding: 18,
                font: {
                    size: 13,
                    weight: "600"
                }
            }
        }
    },

    scales: {
        y: {
            ticks: {
                font: {
                    size: 12
                }
            }
        },

        x: {
            ticks: {
                font: {
                    size: 12
                }
            }
        }
    }
}
        }
    );


    /* CHART 2 — EBITDA MARGIN */


    ebitdaMarginChartInstance = new Chart(
        document.getElementById("ebitdaMarginChart"),
        {
            type: "line",
            data: {
                labels: years,
                datasets: [{
                    label: "EBITDA Margin (%)",
                    data: ebitdaMarginHistory,
                    tension: 0.35,
                    borderWidth: 3
                }]
            },
            options: {
    responsive: true,
    maintainAspectRatio: false,

        plugins: {
        title: {
            display: true,
           text: "EBITDA Margin Trend (%)" ,
            font: {
                size: 16,
                weight: "700"
            },
            color: "#0f172a",
            padding: {
                bottom: 18
            }
        },

        legend: {
            display: true,
            position: "top",
            labels: {
                padding: 18,
                font: {
                    size: 13,
                    weight: "600"
                }
            }
        }
    },

    scales: {
        y: {
            ticks: {
                font: {
                    size: 12
                }
            }
        },

        x: {
            ticks: {
                font: {
                    size: 12
                }
            }
        }
    }
}
        }
    );


    /* CHART 3 — CAPITAL STRUCTURE */
   
    debtChartInstance = new Chart(
        document.getElementById("debtChart"),
        {
            type: "bar",
            data: {
                labels: [
                    "Total Debt",
                    "EBITDA",
                    "Cash"
                ],
                datasets: [{
                    label: "£M",
                    data: [
                        currentDebt,
                        currentEBITDA,
                        currentCash
                    ]
                }]
            },
            options: {
    responsive: true,
    maintainAspectRatio: false,

      plugins: {
        title: {
            display: true,
            text: "Capital Structure Overview (£M)", 
            font: {
                size: 16,
                weight: "700"
            },
            color: "#0f172a",
            padding: {
                bottom: 18
            }
        },

        legend: {
            display: true,
            position: "top",
            labels: {
                padding: 18,
                font: {
                    size: 13,
                    weight: "600"
                }
            }
        }
    },

    scales: {
        y: {
            ticks: {
                font: {
                    size: 12
                }
            }
        },

        x: {
            ticks: {
                font: {
                    size: 12
                }
            }
        }
    }
}
        }
    );
}

/* SAVE NOTES */


function saveNotes() {
    const notes = document.getElementById("analyst-notes").value;
    localStorage.setItem("deal_notes", notes);

    const now = new Date();
    const formatted = now.toLocaleString();

    localStorage.setItem("notes_timestamp", formatted);

    const timestamp = document.getElementById("notes-timestamp");
    if (timestamp) {
        timestamp.textContent = `Last updated: ${formatted}`;
    }

    alert("Notes saved successfully");
}


/* LOGOUT */


function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    window.location.href = "login.html";
}


/* Character Counter */

function updateCharCount(textarea) {
    const count = textarea.value.length;
    const el = document.getElementById("notes-char-count");

    if (el) {
        el.textContent =
            count.toLocaleString() +
            " character" +
            (count === 1 ? "" : "s");
    }
}


/* RISK RING */
function setRiskRing(score) {
    const arc = document.getElementById("risk-ring-arc");
    const scoreText = document.getElementById("risk-ring-score");

    if (!arc || !scoreText) return;

    const circumference = 201.06; // 2 * π * 32
    const offset =
        circumference - (score / 100) * circumference;

    arc.style.strokeDashoffset = offset;

    /* Dynamic colour by score */

    if (score <= 35) {
        arc.setAttribute("stroke", "#16a34a"); // green
    }
    else if (score <= 65) {
        arc.setAttribute("stroke", "#d97706"); // amber
    }
    else {
        arc.setAttribute("stroke", "#dc2626"); // red
    }

    scoreText.textContent = score;
}

/* COVENANT BARS */
function setCovenantBars(
    leverageCurrent,
    leverageMax,
    coverageCurrent,
    coverageMin
) {
    /* Leverage  */

    const leveragePct = Math.min(
        (leverageCurrent / leverageMax) * 100,
        100
    );

    const leverageBar = document.getElementById(
        "covenant-leverage-bar"
    );

    const leverageBarLabel = document.getElementById(
        "covenant-leverage-bar-label"
    );

    if (leverageBar) {
        leverageBar.style.width =
            leveragePct.toFixed(1) + "%";

        leverageBar.className =
            "covenant-progress-fill " +
            (
                leveragePct < 60
                    ? "safe"
                    : leveragePct < 85
                    ? "warning"
                    : "danger"
            );
    }

    if (leverageBarLabel) {
        leverageBarLabel.textContent =
            leverageCurrent +
            "x / " +
            leverageMax +
            "x max";
    }

    /* Coverage */

    const coveragePct = Math.min(
        (coverageCurrent / coverageMin) * 100,
        100
    );

    const coverageBar = document.getElementById(
        "covenant-coverage-bar"
    );

    const coverageBarLabel = document.getElementById(
        "covenant-coverage-bar-label"
    );

    if (coverageBar) {
        coverageBar.style.width =
            coveragePct.toFixed(1) + "%";

        coverageBar.className =
            "covenant-progress-fill " +
            (
                coveragePct >= 100
                    ? "safe"
                    : coveragePct >= 80
                    ? "warning"
                    : "danger"
            );
    }

    if (coverageBarLabel) {
        coverageBarLabel.textContent =
            coverageCurrent +
            "x / " +
            coverageMin +
            "x min";
    }
}


/* FLAG COUNT BADGE */
function setFlagCount(count) {
    const badge = document.getElementById(
        "flag-count-badge"
    );

    if (!badge) return;

    badge.textContent =
        count +
        " flag" +
        (count === 1 ? "" : "s");
}


/* KPI STATUS COLORS */
function setKpiStatus(cardId, status) {
    const card = document.getElementById(cardId);

    if (!card) return;

    card.classList.remove(
        "status-green",
        "status-amber",
        "status-red"
    );

    card.classList.add(
        "status-" + status
    );
}