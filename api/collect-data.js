import { fetchOuraData } from '../oura_data_collector';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_NAME = "oura_data.db";

export default async function handler(req, res) {
  console.log('Starting data collection process');
  try {
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

    await db.exec(`
      CREATE TABLE IF NOT EXISTS oura_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT,
        date DATE,
        data JSON
      )
    `);

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
}