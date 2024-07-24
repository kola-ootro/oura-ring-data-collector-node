require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const port = process.env.PORT || 3000;
const DB_NAME = "oura_data.db";

app.use(express.json());

// API route to get Oura Ring data
app.get('/api/oura-data', async (req, res) => {
  const { startDate, endDate, endpoint } = req.query;

  if (!startDate || !endDate || !endpoint) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const db = await open({
      filename: DB_NAME,
      driver: sqlite3.Database
    });

    const data = await db.all(`
      SELECT * FROM oura_data
      WHERE endpoint = ? AND date BETWEEN ? AND ?
      ORDER BY date
    `, [endpoint, startDate, endDate]);

    await db.close();

    res.json(data);
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