document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("submissionForm");
    const fileInput = form.elements["zipFile"];
    const fileStatus = document.getElementById("fileStatus");
    const errorMsg = document.getElementById("errorMsg");

    // Show selected file name
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            fileStatus.textContent = `File selected: ${fileInput.files[0].name}`;
        } else {
            fileStatus.textContent = "";
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMsg.textContent = "";

        const studentNames = form.elements["studentNames"].value.trim();
        const classPeriod = form.elements["classPeriod"].value;
        const assignmentName = form.elements["assignmentName"].value;
        const code = form.elements["code"].value.trim();
        const file = fileInput.files[0];

        if (!studentNames || !classPeriod || !assignmentName || !code || !file) {
            errorMsg.textContent = "Please complete all fields before submitting.";
            return;
        }

        try {
            // Step 1: Initialize the submission and get a B2 upload URL
            const initRes = await fetch("/submit/init", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    studentNames,
                    classPeriod,
                    assignmentName,
                    code
                })
            });

            if (!initRes.ok) {
                throw new Error("Could not initialize submission.");
            }

            const { submissionId, uploadUrl } = await initRes.json();

            // Step 2: Upload the ZIP directly from the browser to B2
            fileStatus.textContent = "Uploading file...";

            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/zip"
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error("File upload failed.");
            }

            // Step 3: Tell the server the B2 upload is complete
            fileStatus.textContent = "Saving submission...";

            const completeRes = await fetch("/submit/complete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    submissionId
                })
            });

            if (!completeRes.ok) {
                throw new Error("Could not save submission.");
            }

            // Only report success after PostgreSQL has the file
            alert("Submission successful!");
            form.reset();
            fileStatus.textContent = "";

        } catch (err) {
            console.error(err);
            errorMsg.textContent =
                "Submission failed. Please try again.";
        }
    });
});