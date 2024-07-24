require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const port = process.env.PORT || 3000;
const DB_NAME = "oura_data.db";

app.use(express.json());

// API route to get all Oura Ring data in tabular format
app.get('/api/oura-data-table', async (req, res) => {
  try {
    const db = await open({
      filename: DB_NAME,
      driver: sqlite3.Database
    });

    const data = await db.all(`
      SELECT endpoint, date, json_extract(data, '$.id') as id, data
      FROM oura_data
      ORDER BY date DESC, endpoint
    `);

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

    res.json(tableData);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files (for future use with generative graphics)
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});