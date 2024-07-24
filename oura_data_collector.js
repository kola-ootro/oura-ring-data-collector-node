require('dotenv').config();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const OURA_API_URL = "https://api.ouraring.com/v2/usercollection/";
const OURA_API_KEY = process.env.OURA_API_KEY;
const DB_NAME = "oura_data.db";

const headers = {
  "Authorization": `Bearer ${OURA_API_KEY}`,
  "Content-Type": "application/json"
};

async function createDatabase() {
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

async function fetchOuraData(endpoint, startDate, endDate) {
  const url = `${OURA_API_URL}${endpoint}`;
  const params = {
    start_date: startDate,
    end_date: endDate
  };

  try {
    const response = await axios.get(url, { headers, params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
}

async function storeData(endpoint, date, data) {
  const db = await open({
    filename: DB_NAME,
    driver: sqlite3.Database
  });

  await db.run(`
    INSERT INTO oura_data (endpoint, date, data)
    VALUES (?, ?, ?)
  `, [endpoint, date, JSON.stringify(data)]);

  await db.close();
}

async function main() {
  await createDatabase();

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const endpoints = ["daily_activity", "daily_readiness", "daily_sleep"];

  for (const endpoint of endpoints) {
    const data = await fetchOuraData(endpoint, startDate, endDate);
    if (data && data.data) {
      for (const item of data.data) {
        if (item.date) {
          await storeData(endpoint, item.date, item);
        }
      }
    }
  }

  console.log("Data collected and stored successfully");
}

main().catch(console.error);