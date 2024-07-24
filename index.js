require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { fetchOuraData } = require('./oura_data_collector');

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
      return res.json({ 
        message: 'No data available in the database',
        debug: {
          tableExists: true,
          rowCount: 0
        }
      });
    }

    const data = await db.all(`
      SELECT endpoint, date, json_extract(data, '$.id') as id, data
      FROM oura_data
      ORDER BY date DESC, endpoint
      LIMIT 10 -- Limit to 10 rows for debugging
    `);

    console.log('Raw data from database:', data);

    await db.close();

    // Transform data into a more tabular format
    const tableData = data.map(row => {
      const parsedData = JSON.parse(row.data);
      return {
        id: parsedData.id,
        endpoint: row.endpoint,
        date: row.date,
        ...parsedData
      };
    });

    console.log('Transformed table data:', tableData);

    res.json({ debug: { tableExists: true, rowCount: count.count }, data: tableData });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Route to trigger data collection
app.get('/api/collect-data', async (req, res) => {
  try {
    console.log('Starting data collection process');
    const endpoints = ["daily_activity", "daily_readiness", "daily_sleep", "sleep", "workout", "tag"];
    let allData = {};

    for (const endpoint of endpoints) {
      console.log(`Fetching data for ${endpoint}`);
      const data = await fetchOuraData(endpoint);
      allData[endpoint] = data;
    }

    console.log('Data fetched successfully, attempting to store in database');

    const db = await open({
      filename: DB_NAME,
      driver: sqlite3.Database
    });

    for (const [endpoint, data] of Object.entries(allData)) {
      for (const item of data) {
        await db.run(`
          INSERT OR REPLACE INTO oura_data (endpoint, date, data)
          VALUES (?, ?, ?)
        `, [endpoint, item.date, JSON.stringify(item)]);
      }
    }

    await db.close();

    console.log('Data stored successfully');

    res.status(200).json({ 
      message: 'Data collection and storage completed successfully', 
      debug: { 
        dataCollected: Object.keys(allData).reduce((acc, key) => {
          acc[key] = allData[key].length;
          return acc;
        }, {})
      } 
    });
  } catch (error) {
    console.error('Error collecting or storing data:', error);
    res.status(500).json({ error: 'Failed to collect or store data', details: error.message });
  }
});

// Serve static files (for future use with generative graphics)
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});