const API = "http://127.0.0.1:8000";

function getToken() {
    return localStorage.getItem("token");
}

let allDeals = [];
let filteredDeals = [];
let currentStatus = "all";
let searchTimeout = null;


/* PAGE LOAD */ 
window.onload = async function () {
    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    /* Logged in as */
    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("username");

    const userRoleEl = document.getElementById("userRole");

    if (userRoleEl) {
        userRoleEl.textContent =
            savedUser
                ? `${savedUser} (${savedRole})`
                : savedRole || "Unknown";
    }

    try {
        const res = await fetch(`${API}/deals`, {
            headers: {
                Authorization: "Bearer " + token
            }
        });

        if (res.status === 401) {
            alert("Session expired. Please login again.");
            window.location.href = "login.html";
            return;
        }

        allDeals = await res.json();

        /* DATA CLEANUP */
        allDeals = allDeals.map(d => ({
            ...d,
            company: d.company || "Unknown Company",
            sector: d.sector || "Unknown Sector",
            region: d.region || "Unknown Region",
            revenue: d.revenue || d.deal_size || 0,
            debt_ebitda: d.debt_ebitda ?? null,
            risk_score: Number(d.risk_score || 50),
            risk_level: d.risk_level || null,
            status: d.status || "new"
        }));

        filteredDeals = [...allDeals];

        populateFilters();
        filterStatus("all"); 

    } catch (err) {
        console.error("Failed loading deals:", err);
    }

    /* SEARCH EVENT */
    const searchInput = document.getElementById("searchTop");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
};


/* RISK COLOUR LOGIC */
function getRiskColor(score) {
    score = Number(score);

    if (score >= 70) return "red";       // High Risk
    if (score >= 35) return "yellow";    // Moderate Risk
    return "green";                      // Low Risk
}


/* TABLE RENDER */
function renderDeals(deals) {
    const table = document.getElementById("dealTable");
    table.innerHTML = "";

    if (!deals.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">No deals found</td>
            </tr>
        `;
        return;
    }

    deals.forEach(d => {
        const riskColor =
            d.risk_level ||
            getRiskColor(d.risk_score);

        const row = `
            <tr onclick="goToDeal(${d.deal_id || d.id})">
                <td>${d.company}</td>
                <td>${d.sector}</td>
                <td>£${d.revenue}M</td>
                <td>${d.debt_ebitda ?? "N/A"}x</td>
                <td>${d.risk_score}</td>

                <td>
                    <span class="risk-dot ${riskColor}"></span>
                </td>

                <td>${formatStatus(d.status)}</td>
            </tr>
        `;

        table.innerHTML += row;
    });
}


/* DASHBOARD SUMMARY */
function updateDashboardSummary(deals) {
    const totalDeals = deals.length;

    const approvedDeals = deals.filter(
        d => (d.status || "").toLowerCase() === "approved"
    ).length;

    const highRiskDeals = deals.filter(
        d => getRiskColor(d.risk_score) === "red"
    ).length;

    const avgRiskScore = totalDeals
        ? Math.round(
            deals.reduce(
                (sum, d) => sum + Number(d.risk_score || 0),
                0
            ) / totalDeals
        )
        : 0;

    document.getElementById("totalDeals").textContent = totalDeals;
    document.getElementById("approvedDeals").textContent = approvedDeals;
    document.getElementById("highRiskDeals").textContent = highRiskDeals;
    document.getElementById("avgRiskScore").textContent = avgRiskScore;

    /* Sector Distribution */
    const sectorCount = {};

    deals.forEach(d => {
        const sector = d.sector || "Unknown";
        sectorCount[sector] = (sectorCount[sector] || 0) + 1;
    });

    document.getElementById("sectorSummary").innerHTML =
        Object.entries(sectorCount)
            .map(([sector, count]) => `<p>${sector}: ${count}</p>`)
            .join("");

    /* Region Breakdown */
    const regionCount = {};

    deals.forEach(d => {
        const region = d.region || "Unknown";
        regionCount[region] = (regionCount[region] || 0) + 1;
    });

    document.getElementById("regionSummary").innerHTML =
        Object.entries(regionCount)
            .map(([region, count]) => `<p>${region}: ${count}</p>`)
            .join("");

    /* Approval Conversion */
    const approvalRate = totalDeals
        ? Math.round((approvedDeals / totalDeals) * 100)
        : 0;

    document.getElementById("approvalRate").textContent =
        `${approvalRate}%`;
}


/* STATUS  */
function formatStatus(status) {
    if (!status) return "New";

    const map = {
        new: "New",
        review: "Under Review",
        under_review: "Under Review",
        approved: "Approved"
    };

    return map[status.toLowerCase()] || status;
}


/* CLICK DEAL */
function goToDeal(id) {
    window.location.href = `index.html?id=${id}`;
}


/* FILTERS */
function populateFilters() {
    populateDropdown(
        "sectorFilter",
        [...new Set(allDeals.map(d => d.sector).filter(Boolean))]
    );

    populateDropdown(
        "regionFilter",
        [
            "Europe",
            "North America",
            "Asia",
            "Middle East"
        ]
    );

    populateRevenueRanges();
}

function populateDropdown(id, values) {
    const select = document.getElementById(id);

    if (!select) return;

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function populateRevenueRanges() {
    const select = document.getElementById("revenueFilter");

    if (!select) return;

    const ranges = [
        "0-50",
        "51-100",
        "101-150",
        "150+"
    ];

    ranges.forEach(range => {
        const option = document.createElement("option");
        option.value = range;
        option.textContent = range + "M";
        select.appendChild(option);
    });
}


/* APPLY FILTERS */
function applyFilters() {
    const searchValue =
        document.getElementById("searchTop")?.value
            .toLowerCase()
            .trim() || "";

    const selectedSector =
        document.getElementById("sectorFilter")?.value || "";

    const selectedRegion =
        document.getElementById("regionFilter")?.value || "";

    const selectedRevenue =
        document.getElementById("revenueFilter")?.value || "";

    const selectedRisk =
        document.getElementById("riskFilter")?.value || "";

    let filtered = allDeals.filter(d => {
        /* SEARCH */
        const matchesSearch =
            !searchValue ||
            (d.company || "").toLowerCase().includes(searchValue) ||
            (d.sector || "").toLowerCase().includes(searchValue) ||
            String(d.deal_id || d.id).includes(searchValue);

        /* SECTOR */
        const matchesSector =
            !selectedSector ||
            d.sector === selectedSector;

        /* REGION */
        const matchesRegion =
            !selectedRegion ||
            d.region === selectedRegion;

        /* REVENUE */
        let matchesRevenue = true;
        const revenue = Number(d.revenue || 0);

        if (selectedRevenue === "0-50") {
            matchesRevenue = revenue <= 50;
        } else if (selectedRevenue === "51-100") {
            matchesRevenue = revenue >= 51 && revenue <= 100;
        } else if (selectedRevenue === "101-150") {
            matchesRevenue = revenue >= 101 && revenue <= 150;
        } else if (selectedRevenue === "150+") {
            matchesRevenue = revenue > 150;
        }

        /* RISK */
        const riskColor = getRiskColor(d.risk_score);

        const matchesRisk =
            !selectedRisk ||
            riskColor === selectedRisk;

        /* STATUS */
        const matchesStatus =
            currentStatus === "all" ||
            (d.status || "")
                .toLowerCase()
                .includes(currentStatus);

        return (
            matchesSearch &&
            matchesSector &&
            matchesRegion &&
            matchesRevenue &&
            matchesRisk &&
            matchesStatus
        );
    });

    filteredDeals = filtered;

    renderDeals(filteredDeals);
    updateDashboardSummary(filteredDeals);
}


/* STATUS TABS */
function filterStatus(status) {
    currentStatus = status;

    document.querySelectorAll(".status-filters span")
        .forEach(span => {
            span.classList.remove("active-status");
        });

    const clicked = [...document.querySelectorAll(".status-filters span")]
        .find(span => {
            const text = span.textContent.toLowerCase();

            if (status === "all") return text === "all";
            if (status === "new") return text === "new";
            if (status === "approved") return text === "approved";
            if (status === "review") return text.includes("review");

            return false;
        });

    if (clicked) {
        clicked.classList.add("active-status");
    }

    applyFilters();
}


/* RISK LABEL */
function formatRiskLabel(level) {
    const map = {
        green: "Low Risk",
        yellow: "Moderate Risk",
        red: "High Risk"
    };

    return map[level] || "Unknown";
}


/* DROPDOWN EVENTS */
document.getElementById("sectorFilter")
    ?.addEventListener("change", applyFilters);

document.getElementById("regionFilter")
    ?.addEventListener("change", applyFilters);

document.getElementById("revenueFilter")
    ?.addEventListener("change", applyFilters);

document.getElementById("riskFilter")
    ?.addEventListener("change", applyFilters);


/* RESET FILTERS */
function resetFilters() {
    document.getElementById("searchTop").value = "";
    document.getElementById("sectorFilter").value = "";
    document.getElementById("regionFilter").value = "";
    document.getElementById("revenueFilter").value = "";
    document.getElementById("riskFilter").value = "";

    filterStatus("all");
}


/* LOGOUT */
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");

    window.location.href = "login.html";
}
function exportCSV() {
    if (!allDeals || allDeals.length === 0) {
        alert("No deals available to export.");
        return;
    }

    const headers = [
        "Deal ID",
        "Company Name",
        "Sector",
        "Region",
        "Revenue",
        "Debt / EBITDA",
        "Risk Score",
        "Risk Rating",
        "Status"
    ];

    const csvRows = [];

    /* Header row */
    csvRows.push(headers.join(","));

    
    allDeals.forEach(deal => {
        const row = [
            deal.deal_id || deal.id || "",
            `"${deal.company || ""}"`,
            `"${deal.sector || ""}"`,
            `"${deal.region || ""}"`,
            deal.revenue || "",
            deal.debt_ebitda ?? "",
            deal.risk_score || "",
            `"${formatRiskLabel(
                deal.risk_level || getRiskColor(deal.risk_score)
            )}"`,
            `"${formatStatus(deal.status)}"`
        ];

        csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");

    const blob = new Blob([csvString], {
        type: "text/csv"
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "deal_screener_export.csv";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
}

