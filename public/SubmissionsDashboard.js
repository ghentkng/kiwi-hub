// dashboard.js
let currentDownloadId = null;
let expectedCode = null;

function showCodeModal(id, studentName, code) {
    currentDownloadId = id;
    expectedCode = code;
    document.getElementById('modal-student-name').textContent =
        `Student: ${studentName}`;
    document.getElementById('entered-code').value = '';
    document.getElementById('codeModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('codeModal').style.display = 'none';
    currentDownloadId = null;
    expectedCode = null;
}

document.getElementById('confirm-download').addEventListener('click', () => {
    const entered = document.getElementById('entered-code').value.trim();
    if (entered === expectedCode) {
        fetch(`/download/${currentDownloadId}`, { method: 'POST' })
        .then(res => res.text())
        .then(msg => alert(msg))
        .catch(err => alert('Error: ' + err));
        closeModal();
    } else {
        alert('Code does not match.');
    }
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
        if (filters.class && item.classPeriod !== filters.class) return false;
        if (filters.assignment && item.assignmentName !== filters.assignment) return false;
        if (filters.student && !item.studentNames.toLowerCase().includes(filters.student)) return false;
        if (filters.archive === "new" && item.archived) return false;
        if (filters.archive === "archived" && !item.archived) return false;
        return true;
        })
        .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    for (const sub of filtered) {
        const row = document.createElement("tr");

        row.innerHTML = `
        <td>${sub.assignmentName}</td>
        <td>${sub.studentNames}</td>
        <td>${sub.classPeriod}</td>
        <td>
            <button onclick="downloadZip('${sub.zipFile}')">Download</button>
            <button onclick="archiveSubmission('${sub.id}')">Archive</button>
        </td>
        `;

        tableBody.appendChild(row);
    }
    }

    window.archiveSubmission = function(id) {
    const item = data.find(d => d.id === id);
    if (item) {
        item.archived = true;
        renderTable();
    }
    }

    window.downloadZip = function(fileName) {
    alert(`Pretend download and unzip: ${fileName}`);
    // In real server, use a link to trigger download, or backend endpoint
    // Example: window.open(`/download/${fileName}`);
    }

    renderTable();
});

// Dummy data for testing
const dummyData = [
    {
    id: "1",
    assignmentName: "Test Assignment",
    studentNames: "TestStudent1",
    classPeriod: "1st Period",
    zipFile: "loops_rachel.zip",
    submittedAt: "2025-07-10T10:00:00Z",
    archived: false
    },
    {
    id: "2",
    assignmentName: "Test Assignment",
    studentNames: "TestStudent2",
    classPeriod: "2nd Period",
    zipFile: "loops_john.zip",
    submittedAt: "2025-07-11T12:30:00Z",
    archived: false
    },
    {
    id: "3",
    assignmentName: "Test Assignment 2",
    studentNames: "TestStudent3",
    classPeriod: "3rd Period",
    zipFile: "final_sarah.zip",
    submittedAt: "2025-07-12T08:45:00Z",
    archived: true
    }
];
