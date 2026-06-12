const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL;
let usePostgres = false;
let pool = null;

// File paths for JSON fallback
const dbFilePath = path.join(__dirname, 'local_database.json');

// Memory cache for JSON fallback
let jsonDb = {
  leads: [],
  settings: {
    active_bank: 'HDFC',
    bank_hdfc_url: 'https://applyonline.hdfcbank.com/loan-against-assets/insta-jumbo-loan/insta-jumbo-form.html?XSELLINSHI=Y&XSELLINSLP=Y&Channel=DSA&DSACode=XRKD&LGCode=XRKD&LC1={urm}&LC2=XYZ001&SMCode=A28596&utm_source=DSA&utm_medium=XRKD#nbb',
    bank_icici_url: 'https://www.icicibank.com/personal-banking/cards/credit-card?urm={urm}&name={name}&email={email}&phone={phone}',
    bank_sbi_url: 'https://www.sbicard.com/en/personal/credit-cards.page?urm={urm}&name={name}&email={email}&phone={phone}',
    admin_password: 'admin123'
  }
};

// Load JSON db from file if exists
function loadJsonDb() {
  if (fs.existsSync(dbFilePath)) {
    try {
      jsonDb = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    } catch (e) {
      console.error('Error reading local JSON database, resetting. Error:', e.message);
    }
  } else {
    saveJsonDb();
  }
}

function saveJsonDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(jsonDb, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local JSON database:', e.message);
  }
}

// Unified query router
const query = async (text, params = []) => {
  if (usePostgres) {
    return pool.query(text, params);
  }

  // Local JSON SQL Simulator
  const cleanedText = text.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // SELECT value FROM settings WHERE key = $1 or WHERE key = '...'
  const selectValueMatch = cleanedText.match(/select value from settings where key\s*=\s*(\$1|'([^']+)')/);
  if (selectValueMatch) {
    const key = selectValueMatch[2] || params[0];
    const value = jsonDb.settings[key];
    return {
      rows: value !== undefined ? [{ value }] : [],
      rowCount: value !== undefined ? 1 : 0
    };
  }

  // SELECT 1 FROM settings WHERE key = $1 or WHERE key = '...'
  const select1Match = cleanedText.match(/select 1 from settings where key\s*=\s*(\$1|'([^']+)')/);
  if (select1Match) {
    const key = select1Match[2] || params[0];
    const exists = jsonDb.settings[key] !== undefined;
    return {
      rows: exists ? [{ 1: 1 }] : [],
      rowCount: exists ? 1 : 0
    };
  }

  // SELECT key, value FROM settings
  if (cleanedText === 'select key, value from settings') {
    const rows = Object.entries(jsonDb.settings).map(([key, value]) => ({ key, value }));
    return { rows, rowCount: rows.length };
  }

  // INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  if (cleanedText.startsWith('insert into settings')) {
    const key = params[0];
    const value = params[1];
    jsonDb.settings[key] = value;
    saveJsonDb();
    return { rows: [], rowCount: 1 };
  }

  // INSERT INTO leads (lead_id, name, phone, email, bank_name, utm_source, utm_info) VALUES ($1, $2, $3, $4, $5, $6, $7)
  if (cleanedText.startsWith('insert into leads')) {
    const [lead_id, name, phone, email, bank_name, utm_source, utm_info] = params;
    const newLead = {
      id: jsonDb.leads.length + 1,
      lead_id,
      name,
      phone,
      email,
      bank_name,
      utm_source: utm_source || '',
      utm_info: utm_info || '',
      created_at: new Date().toISOString()
    };
    jsonDb.leads.push(newLead);
    saveJsonDb();
    return { rows: [newLead], rowCount: 1 };
  }

  // SELECT * FROM leads ORDER BY created_at DESC
  if (cleanedText.startsWith('select * from leads')) {
    const rows = [...jsonDb.leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows, rowCount: rows.length };
  }

  // SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE
  if (cleanedText.includes('where created_at >= current_date')) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const count = jsonDb.leads.filter(lead => lead.created_at.startsWith(todayStr)).length;
    return { rows: [{ count }], rowCount: 1 };
  }

  // SELECT COUNT(*) FROM leads
  if (cleanedText === 'select count(*) from leads') {
    return { rows: [{ count: jsonDb.leads.length }], rowCount: 1 };
  }

  // SELECT bank_name, COUNT(*) as count FROM leads GROUP BY bank_name
  if (cleanedText.startsWith('select bank_name, count(*)')) {
    const counts = {};
    jsonDb.leads.forEach(lead => {
      counts[lead.bank_name] = (counts[lead.bank_name] || 0) + 1;
    });
    const rows = Object.entries(counts).map(([bank_name, count]) => ({ bank_name, count }));
    return { rows, rowCount: rows.length };
  }

  // DELETE FROM leads WHERE lead_id = ANY($1)
  if (cleanedText.startsWith('delete from leads')) {
    const ids = params[0];
    if (Array.isArray(ids)) {
      const initialLength = jsonDb.leads.length;
      jsonDb.leads = jsonDb.leads.filter(lead => !ids.includes(lead.lead_id));
      saveJsonDb();
      return { rows: [], rowCount: initialLength - jsonDb.leads.length };
    }
    return { rows: [], rowCount: 0 };
  }

  // BEGIN / COMMIT / ROLLBACK
  if (['begin', 'commit', 'rollback'].includes(cleanedText)) {
    return { rows: [], rowCount: 0 };
  }

  throw new Error(`Unsupported fallback SQL query: ${text}`);
};

// Initialize database tables
const initDb = async () => {
  if (connectionString) {
    console.log('Testing PostgreSQL connection...');
    pool = new Pool({
      connectionString: connectionString,
      ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1') && !connectionString.includes('dpg-d8m1if6gvqtc73ci6gt0-a') ? {
        rejectUnauthorized: false
      } : false,
      connectionTimeoutMillis: 4000 // 4 seconds timeout limit
    });

    try {
      await pool.query('SELECT 1');
      usePostgres = true;
      console.log('Successfully connected to PostgreSQL database.');
      
      // Initialize Tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          lead_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100) NOT NULL,
          bank_name VARCHAR(50) DEFAULT 'HDFC',
          utm_source VARCHAR(100),
          utm_info VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Ensure UTM columns exist if the table was created in an older version of the app
      await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100)');
      await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_info VARCHAR(100)');

      // Seed settings
      const seedDefaultSetting = async (key, val) => {
        const res = await pool.query('SELECT 1 FROM settings WHERE key = $1', [key]);
        if (res.rowCount === 0) {
          await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, val]);
        }
      };

      await seedDefaultSetting('active_bank', 'HDFC');
      await seedDefaultSetting('bank_hdfc_url', 'https://applyonline.hdfcbank.com/loan-against-assets/insta-jumbo-loan/insta-jumbo-form.html?XSELLINSHI=Y&XSELLINSLP=Y&Channel=DSA&DSACode=XRKD&LGCode=XRKD&LC1={urm}&LC2=XYZ001&SMCode=A28596&utm_source=DSA&utm_medium=XRKD#nbb');
      await seedDefaultSetting('bank_icici_url', 'https://www.icicibank.com/personal-banking/cards/credit-card?urm={urm}&name={name}&email={email}&phone={phone}');
      await seedDefaultSetting('bank_sbi_url', 'https://www.sbicard.com/en/personal/credit-cards.page?urm={urm}&name={name}&email={email}&phone={phone}');
      await seedDefaultSetting('admin_password', 'admin123');

      console.log('PostgreSQL database tables verified/created successfully.');
      return;
    } catch (err) {
      console.warn('PostgreSQL connection test failed:', err.message);
      console.warn('NOTE: Host "dpg-d8m1if6gvqtc73ci6gt0-a" is internal to Render and cannot be reached from your local machine.');
      console.warn('Using local JSON database (local_database.json) for development.');
    }
  } else {
    console.warn('DATABASE_URL is not set. Using local JSON database (local_database.json).');
  }

  // Fallback Mode
  usePostgres = false;
  loadJsonDb();
  console.log('Local JSON database initialized successfully.');
};

module.exports = {
  pool,
  query,
  initDb
};
