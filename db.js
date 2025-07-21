// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // Render requires SSL for PostgreSQL
    }
});

module.exports = pool;
