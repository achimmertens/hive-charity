import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// __dirname shim for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SQL password from environment (.env). First try standard .env next to this script,
// if not found, try a public/.env fallback. The variable expected is SQL_DB_PASSWORD.
dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.SQL_DB_PASSWORD) {
  dotenv.config({ path: path.resolve(__dirname, 'public/.env') });
}

const password1 = process.env.SQL_DB_PASSWORD || '';

const config = {
  user: 'Hive-achimmertens',
  password: password1,
  server: 'vip.hivesql.io',
  port: 1433,
  database: 'DBHive',
  options: {
    trustServerCertificate: true
  }
};

// Function to extract account name from URL
function extractAccountFromUrl(url) {
  const match = url.match(/@([^/]+)/);
  return match ? match[1] : null;
}

// Function to modify URL for web viewing
function modifyUrl(url) {
  const regex = /\/hive-.*?\/(@.*?)\//;
  const match = url.match(regex);
  if (match) {
    return `https://peakd.com${url.split('#')[0]}`;
  }
  return null;
}

// Function to execute SQL query
async function executeQuery() {
  try {
    await sql.connect(config);
    const query = fs.readFileSync('HiveSQLQuery.sql', 'utf8');
    const result = await sql.query(query);
    await sql.close();
    return result.recordset;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
}

// Function to filter records by date
function filterByDate(records, days) {
  const currentDate = new Date();
  const cutoffDate = new Date(currentDate.setDate(currentDate.getDate() - days));
  
  return records.filter(record => new Date(record.last_update) >= cutoffDate);
}

// Function to transform record data
function transformRecord(record) {
  return {
    date: new Date(record.last_update).toISOString(),
    author: record.author,
    commenter: extractAccountFromUrl(record.url),
    title: record.root_title,
    url: modifyUrl(record.url),
    originalUrl: record.url,
    votes: record.total_vote_weight
  };
}

// Function to manage JSON file operations
async function manageJsonFile(records) {
  const scanDate = new Date().toISOString().split('T')[0];
  const fileName = `chary_scan_${scanDate}.json`;
  const filePath = path.join('scans', fileName);
  
  let existingRecords = [];
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    existingRecords = JSON.parse(fileContent);
  }

  // Combine existing and new records, removing duplicates based on URL
  const allRecords = [...existingRecords];
  for (const newRecord of records) {
    if (!allRecords.some(record => record.originalUrl === newRecord.originalUrl)) {
      allRecords.push(newRecord);
    }
  }

  // Sort by date descending
  allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(allRecords, null, 2));
  console.log(`Saved ${allRecords.length} records to ${fileName}`);
  return filePath;
}

// Main function
async function main() {
  try {
    // Create scans directory if it doesn't exist
    if (!fs.existsSync('scans')) {
      fs.mkdirSync('scans');
    }

    // Get and process records
    const rawRecords = await executeQuery();
    const filteredRecords = filterByDate(rawRecords, 10);
    const transformedRecords = filteredRecords.map(transformRecord);
    
    // Save to JSON file
    const savedFile = await manageJsonFile(transformedRecords);
    console.log(`Process completed successfully. Check ${savedFile} for results.`);
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the script
main();