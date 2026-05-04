const BASE_URL = "http://127.0.0.1:8000";

/* ============================= */
/* SHOW FILE NAME */
/* ============================= */

document.getElementById("fileInput").addEventListener("change", function () {
    const name = this.files[0]
        ? this.files[0].name
        : "No file chosen";

    document.getElementById("fileName").textContent = name;
});

/* ============================= */
/* SUBMIT DEAL */
/* ============================= */

window.submitDeal = async function () {
    console.log("BUTTON CLICK WORKING");

    const fileInput = document.getElementById("fileInput");
    const selectedFile = fileInput.files[0];

    const company = document.getElementById("company").value.trim();
    const sector = document.getElementById("sector").value;
    const revenue = parseFloat(document.getElementById("revenue").value);
    const ebitda = parseFloat(document.getElementById("ebitda").value);
    const debt = parseFloat(document.getElementById("debt").value);
    const interest = parseFloat(document.getElementById("interest").value);

    const token = localStorage.getItem("token");

    if (!token) {
        showStatus("Please login first.", "red");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

        return;
    }

    try {
        /* ============================= */
        /* OPTION 1 — FILE UPLOAD */
        /* ============================= */

        if (selectedFile) {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const res = await fetch(`${BASE_URL}/upload-file`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                showStatus("Spreadsheet uploaded successfully!", "green");

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            } else {
                showStatus(
                    data.detail || "Spreadsheet upload failed.",
                    "red"
                );
            }

            return;
        }

        /* ============================= */
        /* OPTION 2 — MANUAL FORM */
        /* ============================= */

        if (
            !company ||
            !sector ||
            isNaN(revenue) ||
            isNaN(ebitda) ||
            isNaN(debt) ||
            isNaN(interest)
        ) {
            showStatus(
                "Please upload a file or complete all fields.",
                "red"
            );
            return;
        }

        const dealData = {
            company: company,
            sector: sector,
            revenue: revenue,
            ebitda: ebitda,
            debt: debt,
            interest: interest
        };

        const res = await fetch(`${BASE_URL}/add-deal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(dealData)
        });

        const data = await res.json();

        if (res.ok) {
            showStatus("Deal uploaded successfully!", "green");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        } else {
            showStatus(
                data.detail || "Manual upload failed.",
                "red"
            );
        }

    } catch (err) {
        console.error(err);

        showStatus(
            "Cannot connect to API. Is backend running?",
            "red"
        );
    }
};

/* ============================= */
/* STATUS HELPER */
/* ============================= */

function showStatus(message, color) {
    const el = document.getElementById("status-message");

    el.textContent = message;

    el.style.color =
        color === "green"
            ? "#16a34a"
            : "#dc2626";
}