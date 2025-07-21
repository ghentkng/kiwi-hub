console.log("🚀 studentscript.js is loaded");

const form = document.getElementById("submissionForm");
    const fileInput = form.elements["zipFile"];
    const fileStatus = document.getElementById("fileStatus");
    const errorMsg = document.getElementById("errorMsg");

    // Show uploaded file name
    fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        fileStatus.textContent = `File uploaded: ${fileInput.files[0].name}`;
    } else {
        fileStatus.textContent = "";
    }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMsg.textContent = "";

        // Check all fields
        const studentNames = form.elements["studentNames"].value.trim();
        const classPeriod = form.elements["classPeriod"].value;
        const assignmentName = form.elements["assignmentName"].value;
        const code = form.elements["code"].value.trim();
        const file = fileInput.files[0];

        if (!studentNames || !classPeriod || !assignmentName || !code || !file) {
            errorMsg.textContent = "Please complete all fields before submitting.";
            return;
        }

        const formData = new FormData();
        formData.append("studentNames", studentNames);
        formData.append("classPeriod", classPeriod);
        formData.append("assignmentName", assignmentName);
        formData.append("code", code);
        formData.append("zipFile", file);
        formData.append("submittedAt", new Date().toISOString());

        try {
            const res = await fetch("/submit", {
            method: "POST",
            body: formData
            });

            if (res.ok) {
            alert("Submission successful!");
            form.reset();
            fileStatus.textContent = "";
            } else {
            errorMsg.textContent = "Submission failed. Please try again.";
            }
        } catch (err) {
            console.error(err);
            errorMsg.textContent = "Error connecting to the server.";
        }
    });