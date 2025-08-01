// dashboard.js
let currentDownloadId = null;
let expectedCode = null;

function showCodeModal(id, studentName, code) {
    currentDownloadId = id;
    expectedCode = code;
    document.getElementById('modal-student-name').textContent =
        `Student: ${studentName}`;
    document.getElementById('modal-code').textContent =
        `One-Time Code: ${code}`;
    document.getElementById('codeModal').style.display = 'block';
}


function closeModal() {
    document.getElementById('codeModal').style.display = 'none';
    currentDownloadId = null;
    expectedCode = null;
}

document.getElementById('confirm-download').addEventListener('click', () => {
    if (confirm('Proceed with download?')) {
    window.location.href = `/download/${currentDownloadId}?code=${expectedCode}`;
    }
    closeModal();

});


document.getElementById('archive-instead').addEventListener('click', () => {
    fetch(`/archive/${currentDownloadId}`, { method: 'POST' })
        .then(res => res.text())
        .then(msg => alert(msg));
    closeModal();
});

document.addEventListener("DOMContentLoaded", () => {
    const filters = {
    class: "",
    assignment: "",
    student: "",
    archive: "new"
    };

    let data = [];

    fetch('/submissions-data')
    .then(res => res.json())
    .then(json => {
        data = json;
        renderTable();
    })
    .catch(err => {
        console.error('Failed to load submissions:', err);
        document.getElementById("submission-table-body").innerHTML = "<tr><td colspan='4'>Error loading submissions.</td></tr>";
    });


    const tableBody = document.getElementById("submission-table-body");
    const classFilter = document.getElementById("filter-class");
    const assignmentFilter = document.getElementById("filter-assignment");
    const studentFilter = document.getElementById("filter-student");
    const archiveFilter = document.getElementById("filter-archive");

    classFilter.addEventListener("change", e => {
    filters.class = e.target.value;
    renderTable();
    });

    assignmentFilter.addEventListener("change", e => {
    filters.assignment = e.target.value;
    renderTable();
    });

    studentFilter.addEventListener("input", e => {
    filters.student = e.target.value.toLowerCase();
    renderTable();
    });

    archiveFilter.addEventListener("change", e => {
    filters.archive = e.target.value;
    renderTable();
    });

function renderTable() {
    tableBody.innerHTML = "";

    const filtered = data
        .filter(item => {
        if (filters.class && item.class_period !== filters.class) return false;
        if (filters.assignment && item.assignment_name !== filters.assignment) return false;
        if (filters.student && !item.student_names.toLowerCase().includes(filters.student)) return false;
        if (filters.archive === "new" && item.archived) return false;
        if (filters.archive === "archived" && !item.archived) return false;
        return true;
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (const sub of filtered) {
        const row = document.createElement("tr");

        row.innerHTML = `
        <td>${sub.assignment_name}</td>
        <td>${sub.student_names}</td>
        <td>${sub.class_period}</td>
        <td>
            <button onclick="downloadZip('${sub.id}')">Download</button>
            <button onclick="archiveSubmission('${sub.id}')">Archive</button>
        </td>
        `;

        tableBody.appendChild(row);
    }
    }

window.archiveSubmission = function(id) {
    fetch(`/archive/${id}`, { method: 'POST' })
        .then(res => res.text())
        .then(msg => {
            const item = data.find(d => d.id === id);
            if (item) item.archived = true;
            renderTable();
        })
        .catch(err => alert('Error archiving submission: ' + err));
};


window.downloadZip = function(id) {
    const submission = data.find(d => d.id === id);
    if (submission) {
        showCodeModal(submission.id, submission.student_names, submission.code);
    } else {
        alert("Submission not found.");
    }
}

    renderTable();
});