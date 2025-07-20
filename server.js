// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.post('/submit', (req, res) => {
const submission = {
    studentNames: req.body.studentNames,
    classPeriod: req.body.classPeriod,
    assignmentName: req.body.assignmentName,
    code: req.body.code,
    timestamp: new Date().toISOString(),
    archived: false,
    id: Date.now().toString()
};

let submissions = [];
if (fs.existsSync(submissionsPath)) {
    submissions = JSON.parse(fs.readFileSync(submissionsPath));
}
submissions.push(submission);
fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));

res.send('Thank you for your submission!');
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

app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});