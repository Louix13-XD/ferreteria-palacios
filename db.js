const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('PostgreSQL Connected!');
});

pool.on('error', (err) => {
  console.error('PostgreSQL Connection Error:', err);
});

module.exports = pool;
