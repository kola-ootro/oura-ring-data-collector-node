require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const DB_NAME = "oura_data.db";

app.use(express.json());

async function initializeDatabase() {
  const db = await open({
    filename: DB_NAME,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS oura_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT,
      date DATE,
      data JSON
    )
  `);

  await db.close();
}

// Initialize the database when the server starts
initializeDatabase().catch(console.error);

// Serve the HTML file at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route to get all Oura Ring data in tabular format
app.get('/api/oura-data-table', async (req, res) => {
  console.log('Received request for /api/oura-data-table');
  try {
    const db = await open({
      filename: DB_NAME,
      driver: sqlite3.Database
    });

    // Check if the table exists
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='oura_data'");
    if (!tableCheck) {
      console.log('oura_data table does not exist');
      return res.json({ error: 'Database table not found' });
    }

    // Count the rows in the table
    const count = await db.get('SELECT COUNT(*) as count FROM oura_data');
    console.log('Number of rows in oura_data:', count.count);

    if (count.count === 0) {
      return res.json({ message: 'No data available in the database' });
    }

    const data = await db.all(`
      SELECT endpoint, date, json_extract(data, '$.id') as id, data
      FROM oura_data
      ORDER BY date DESC, endpoint
      LIMIT 10  // Limit to 10