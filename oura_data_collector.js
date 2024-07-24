require('dotenv').config();
const axios = require('axios');

const OURA_API_URL = "https://api.ouraring.com/v2/usercollection/";
const OURA_API_KEY = process.env.OURA_API_KEY;

const headers = {
  "Authorization": `Bearer ${OURA_API_KEY}`,
  "Content-Type": "application/json"
};

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

module.exports = { fetchOuraData };