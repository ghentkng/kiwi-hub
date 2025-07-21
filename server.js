// server.js
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const id = Date.now().toString();
        req.body.submissionId = id;
        cb(null, `${id}.zip`);
    }
});

const upload = multer({ storage: storage });


const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const unzipper = require('unzipper');
const { exec } = require('child_process');

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
secret: process.env.SESSION_SECRET || 'defaultsecret',
resave: false,
saveUninitialized: false,
cookie: {
    secure: true,       // Only send cookie over HTTPS
    sameSite: 'lax'     // Prevents infinite redirects in most setups
}
}));

const ADMIN_USER = process.env.ADMIN_USER || 'teacher';
const ADMIN_PASS = process.env.ADMIN_PASS || 'mypassword';
const submissionsPath = path.join(__dirname, 'submissions.json');

// Serve homepage
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'StudentSubmit.html'));
});

// Handle student submission
app.post('/submit', upload.single('zipFile'), (req, res) => {
    const submission = {
        studentNames: req.body.studentNames,
        classPeriod: req.body.classPeriod,
        assignmentName: req.body.assignmentName,
        code: req.body.code,
        timestamp: new Date().toISOString(),
        archived: false,
        id: Date.now().toString()
    };

    // Save uploaded file details
    submission.file = req.file ? req.file.filename : null;

    console.log("✅ SUBMIT ROUTE HIT");
    console.log("Submission object:", submission);

    // Save submission to JSON file
    let submissions = [];
    if (fs.existsSync(submissionsPath)) {
        console.log("📄 submissions.json found.");
        submissions = JSON.parse(fs.readFileSync(submissionsPath));
    }
    else {
        console.log("⚠️ submissions.json NOT found, creating new.");
    }

    submissions.push(submission);
    try {
        fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
        console.log("✅ Submission saved to submissions.json");
        res.status(200).send('Thank you for your submission!');
    } catch (err) {
        console.error("❌ Error writing to submissions.json:", err);
        res.status(500).send('Failed to save submission.');
    }
});


// Login routes
app.get('/login', (req, res) => {
if (req.session.loggedIn) {
    return res.redirect('/dashboard');  // Optional; can remove to prevent loop
}
res.sendFile(path.join(__dirname, 'public', 'LoginScreen.html'));
});

app.post('/login', (req, res) => {
const { username, password } = req.body;
if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
} else {
    res.send('Login failed. <a href="/login">Try again</a>');
}
});

// Protected dashboard
app.get('/dashboard', (req, res) => {
if (!req.session.loggedIn) {
    return res.redirect('/login');
}
res.sendFile(path.join(__dirname, 'public', 'SubmissionsDashboard.html'));
});

// Logout
app.get('/logout', (req, res) => {
req.session.destroy(() => {
    res.redirect('/login');
});
});

app.post('/download/:id', (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');

    const { id } = req.params;
    const submissions = JSON.parse(fs.readFileSync(submissionsPath));
    const submission = submissions.find(s => s.id === id);

    if (!submission) return res.status(404).send('Submission not found');

    const zipPath = path.join(__dirname, 'uploads', `${id}.zip`);
    const extractPath = path.join(__dirname, 'unzipped', id);

    if (!fs.existsSync(zipPath)) return res.status(404).send('Zip file not found');

    fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .on('close', () => {
        // open in VS Code
        exec(`code "${extractPath}"`, (err) => {
            if (err) return res.status(500).send('Unzipped, but VS Code failed to open');
            return res.send('Downloaded, unzipped, and opened in VS Code');
        });
        })
        .on('error', err => {
        return res.status(500).send('Failed to unzip');
        });
});

app.post('/archive/:id', (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');

    const { id } = req.params;
    let submissions = JSON.parse(fs.readFileSync(submissionsPath));
    const index = submissions.findIndex(s => s.id === id);

    if (index === -1) return res.status(404).send('Not found');
    submissions[index].archived = true;

    fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
    res.send('Archived');
});


// Serve submissions as JSON (optional: for dashboard.js to fetch live data)
app.get('/submissions-data', (req, res) => {
if (!req.session.loggedIn) {
    return res.status(403).send('Forbidden');
}
if (fs.existsSync(submissionsPath)) {
    const submissions = JSON.parse(fs.readFileSync(submissionsPath));
    res.json(submissions);
} else {
    res.json([]);
}
});

app.get('/debug-submissions', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'submissions.json');

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('submissions.json not found');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.type('json').send(content);
});


app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});

