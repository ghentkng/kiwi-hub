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

// Logout
app.get('/logout', (req, res) => {
req.session.destroy(() => {
    res.redirect('/login');
});
});

//Planning Pages

app.get('/teaching', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/teaching';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'Teaching.html'));
});


app.get('/reference', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/reference';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'Reference.html'));
});


app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});

//Period 1 playlist button
app.get('/playlist-url/:name', async (req, res) => {
  const displayName = req.params.name; // "1st Period"
try {
    const q = `
    SELECT url
    FROM public.playlist_queues
    WHERE display_name = $1
    ORDER BY position ASC
    LIMIT 1;
    `;
    const r = await pool.query(q, [displayName]);
    if (r.rows.length === 0 || !r.rows[0].url) return res.status(404).json({ error: 'Not found' });
    res.json({ url: r.rows[0].url });
} catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
}
});

// POST /playlist/:displayName/consume-next
app.post('/playlist/:displayName/consume-next', async (req, res) => {
    const displayName = decodeURIComponent(req.params.displayName);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = `
        WITH pick AS (
            SELECT id, display_name, position AS old_pos
            FROM playlist_queues
            WHERE display_name = $1
            ORDER BY position
            FOR UPDATE
            LIMIT 1
        ),
        shrink AS (
            UPDATE playlist_queues pq
            SET position = position - 1
            FROM pick p
            WHERE pq.display_name = p.display_name
            AND pq.id <> p.id
            AND pq.position > p.old_pos
            RETURNING 1
        ),
        maxpos AS (
            SELECT COALESCE(MAX(position), 0) AS max_pos
            FROM playlist_queues
            WHERE display_name = $1
        ),
        reposition AS (
            UPDATE playlist_queues pq
            SET position = (SELECT max_pos + 1 FROM maxpos)
            FROM pick p
            WHERE pq.id = p.id
            RETURNING pq.*
        )
        SELECT * FROM reposition;
        `;
        const { rows } = await client.query(sql, [displayName]);
        await client.query('COMMIT');
        if (!rows[0]) return res.status(404).json({ error: 'No items for this display_name.' });
        res.json(rows[0]); // includes the row you just “consumed” (now moved to end)
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});



