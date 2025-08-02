// server.js

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const multer = require('multer');

const storage = multer.memoryStorage();

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

// Serve homepage
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'StudentSubmit.html'));
});


app.post('/submit', upload.single('zipFile'), async (req, res) => {
    try {
        console.log('File received:', req.file ? 'yes' : 'no');
        console.log('Buffer size at upload:', req.file ? req.file.buffer.length : 'no buffer');

        await pool.query(
            `INSERT INTO submissions 
            (student_names, class_period, assignment_name, code, file_data, archived)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                req.body.studentNames,
                req.body.classPeriod,
                req.body.assignmentName,
                req.body.code,
                req.file.buffer, // direct from memory
                false
            ]
        );

        res.status(200).send('Thank you for your submission!');
    } catch (err) {
        console.error('DB insert error:', err);
        res.status(500).send('Error saving submission.');
    }
});




// Login routes
app.get('/login', (req, res) => {
if (req.session.loggedIn) {
    return res.redirect('/grading');  // Optional; can remove to prevent loop
}
res.sendFile(path.join(__dirname, 'public', 'LoginScreen.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.loggedIn = true;
        const redirectTo = req.session.redirectAfterLogin || '/grading';
        delete req.session.redirectAfterLogin;
        res.redirect(redirectTo);
    } else {
        res.send('Login failed. <a href="/login">Try again</a>');
    }
});

// Protected dashboard
app.get('/grading', (req, res) => {
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

app.get('/download/:id', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');

    const { id } = req.params;
    const { code } = req.query;

    try {
        const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
        const submission = rows[0];

        if (!submission) return res.status(404).send('Submission not found');
        if (submission.code !== code) return res.status(403).send('Invalid code');

        // Send the zip file from file_data in DB
        res.setHeader('Content-Disposition', `attachment; filename=submission-${id}.zip`);
        res.setHeader('Content-Type', 'application/zip');
        console.log('Buffer size at download:', submission.file_data ? submission.file_data.length : 'no buffer');

        res.end(Buffer.from(submission.file_data), 'binary');
    } catch (err) {
        console.error(err);
        res.status(500).send('Database query failed');
    }
});

app.post('/archive/:id', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE submissions SET archived = TRUE WHERE id = $1',
            [id]
        );
        res.send('Submission archived');
    } catch (err) {
        console.error('Archive error:', err);
        res.status(500).send('Failed to archive submission');
    }
});



app.get('/submissions-data', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');

    try {
        const result = await pool.query('SELECT id, student_names, class_period, assignment_name, code, archived, timestamp FROM submissions'
);
res.json(result.rows);

    } catch (err) {
        console.error('DB read error:', err);
        res.status(500).send('Failed to load submissions');
    }
});

app.get('/grading', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/grading';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'SubmissionsDashboard.html'));
});

app.get('/cs1planning', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/cs1planning';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'CS1Planning.html'));
});

app.get('/cs2planning', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/cs2planning';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'CS2Planning.html'));
});


app.get('/cs3planning', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/cs3planning';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'CS3Planning.html'));
});

app.get('/apaplanning', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/apaplanning';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'APAPlanning.html'));
});

app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});

