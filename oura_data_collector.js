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

async function fetchOuraData(endpoint) {
  const url = `${OURA_API_URL}${endpoint}`;
  let allData = [];
  let nextToken = null;

  do {
    try {
      const params = nextToken ? { next_token: nextToken } : {};
      const response = await axios.get(url, { headers, params });
      allData = allData.concat(response.data.data);
      nextToken = response.data.next_token;
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}: ${error.message}`);
      break;
    }
  } while (nextToken);

  return allData;
}

async function storeData(endpoint, data) {
  const db = await open({
    filename: DB_NAME,
    driver: sqlite3.Database
  });

  const stmt = await db.prepare(`
    INSERT OR REPLACE INTO oura_data (endpoint, date, data)
    VALUES (?, ?, ?)
  `);

  for (const item of data) {
    await stmt.run(endpoint, item.date, JSON.stringify(item));
  }

  await stmt.finalize();
  await db.close();
}

async function main() {
  await createDatabase();

  const endpoints = ["daily_activity", "daily_readiness", "daily_sleep", "sleep", "workout", "tag"];

  for (const endpoint of endpoints) {
    const data = await fetchOuraData(endpoint);
    if (data && data.length > 0) {
      await storeData(endpoint, data);
    }
  }

  console.log("Data collected and stored successfully");
}

main().catch(console.error);