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

app.get('/planning-notes/:page', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { page } = req.params;

    try {
        const { rows } = await pool.query(
            'SELECT date_key, content, complete FROM planning_notes WHERE page_name = $1',
            [page]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).send('Error fetching notes');
    }
});


app.post('/planning-notes', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { page_name, date_key, content, complete } = req.body;

    try {
        await pool.query(
            `INSERT INTO planning_notes (page_name, date_key, content, complete)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (page_name, date_key)
            DO UPDATE SET 
                content = EXCLUDED.content,
                complete = EXCLUDED.complete,
                updated_at = CURRENT_TIMESTAMP`,
            [page_name, date_key, content, complete]
        );
        res.send('Note saved');
    } catch (err) {
        console.error('Error saving note:', err);
        res.status(500).send('Error saving note');
    }
});

app.get('/playlists/:page', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { page } = req.params;

    try {
        const { rows } = await pool.query(
            `SELECT button_name, display_name, id, name, url, position
            FROM playlist_queues
            WHERE page_name = $1
            ORDER BY button_name, position ASC`,
            [page]
        );

        res.json(rows);
    } catch (err) {
        console.error('Error fetching playlists:', err);
        res.status(500).send('Error fetching playlists');
    }
});

app.post('/playlists/:page/play', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { page } = req.params;
    const { button_name } = req.body;

    try {
        // Get playlists for button ordered by position
        const { rows } = await pool.query(
            `SELECT id, url FROM playlist_queues
            WHERE page_name = $1 AND button_name = $2
            ORDER BY position ASC`,
            [page, button_name]
        );

        if (rows.length === 0) return res.status(404).send('No playlists found');

        const firstPlaylist = rows[0];

        // Rotate: move first to last
        await pool.query(
            `UPDATE playlist_queues
            SET position = position - 1
            WHERE page_name = $1 AND button_name = $2`,
            [page, button_name]
        );

        await pool.query(
            `UPDATE playlist_queues
            SET position = (SELECT MAX(position)+1 FROM playlist_queues WHERE page_name=$1 AND button_name=$2)
            WHERE id = $3`,
            [page, button_name, firstPlaylist.id]
        );

        res.json({ url: firstPlaylist.url });
    } catch (err) {
        console.error('Error rotating playlists:', err);
        res.status(500).send('Error playing playlist');
    }
});

app.post('/playlists/:page/manage', async (req, res) => {
    if (!req.session.loggedIn) return res.status(403).send('Forbidden');
    const { page } = req.params;
    const { action, button_name, display_name, playlist } = req.body;

    try {
        if (action === 'setDisplayName') {
            // Update display name for all rows with this button (or set if new)
            await pool.query(
                `UPDATE playlist_queues
                SET display_name = $1
                WHERE page_name = $2 AND button_name = $3`,
                [display_name, page, button_name]
            );
            return res.send('Display name updated');
        }

        if (action === 'add') {
            // Add new playlist entry
            const { name, url } = playlist;
            const { rows } = await pool.query(
                `SELECT COALESCE(MAX(position),0)+1 AS next_pos
                FROM playlist_queues
                WHERE page_name = $1 AND button_name = $2`,
                [page, button_name]
            );
            const nextPos = rows[0].next_pos;

            await pool.query(
                `INSERT INTO playlist_queues (page_name, button_name, display_name, position, name, url)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [page, button_name, display_name, nextPos, name, url]
            );
            return res.send('Playlist added');
        }

        if (action === 'delete') {
            // Delete playlist entry
            await pool.query(
                `DELETE FROM playlist_queues WHERE id = $1`,
                [playlist.id]
            );
            return res.send('Playlist deleted');
        }

        if (action === 'update') {
            // Update playlist entry (name or url)
            const { id, name, url } = playlist;
            await pool.query(
                `UPDATE playlist_queues
                SET name = $1, url = $2
                WHERE id = $3`,
                [name, url, id]
            );
            return res.send('Playlist updated');
        }

        res.status(400).send('Invalid action');
    } catch (err) {
        console.error('Error managing playlists:', err);
        res.status(500).send('Error managing playlists');
    }
});

app.get('/manage-playlists', (req, res) => {
    if (!req.session.loggedIn) {
        req.session.redirectAfterLogin = '/manage-playlists';
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'ManagePlaylists.html'));
});

app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});

