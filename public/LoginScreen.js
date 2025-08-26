//THIS PAGE IS FINE! DON'T MESS WITH IT

const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
secret: process.env.SESSION_SECRET || 'defaultsecret',
resave: false,
saveUninitialized: false
}));
app.use(express.static('public')); // where your CSS, JS, and public HTML live

// Dummy credentials (use env in real version)
const ADMIN_USER = process.env.ADMIN_USER || 'teacher';
const ADMIN_PASS = process.env.ADMIN_PASS || 'secure123';

// Routes

// Login page
app.get('/login', (req, res) => {
res.sendFile(path.join(__dirname, 'login.html'));
});

// Login handler
app.post('/login', (req, res) => {
const { username, password } = req.body;
if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
} else {
    res.send('Login failed. <a href="/login">Try again</a>');
}
});

// Dashboard (protected)
app.get('/dashboard', (req, res) => {
if (!req.session.loggedIn) {
    return res.redirect('/login');
}
res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Logout
app.get('/logout', (req, res) => {
req.session.destroy(() => {
    res.redirect('/login');
});
});

app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});
