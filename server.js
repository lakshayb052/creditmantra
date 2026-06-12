const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect direct admin.html requests to clean /admin URL
app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

// Serve clean /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Admin Authorization Middleware
const adminAuth = async (req, res, next) => {
  const reqPassword = req.headers['x-admin-password'] || req.query.auth;
  const envPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!reqPassword) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Auth password required.' });
  }

  // Double check in database settings just in case
  let dbPassword = envPassword;
  try {
    const dbPassRes = await db.query("SELECT value FROM settings WHERE key = 'admin_password'");
    if (dbPassRes.rows.length > 0) {
      dbPassword = dbPassRes.rows[0].value;
    }
  } catch (err) {
    console.error('Error fetching admin password from DB:', err.message);
  }

  if (reqPassword === dbPassword || reqPassword === envPassword) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Forbidden. Incorrect password.' });
  }
};

// -------------------------------------------------------------
// PUBLIC ENDPOINTS
// -------------------------------------------------------------

// Capture a new lead
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, utm_source, utm_info } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ success: false, message: 'Name, phone and email are required.' });
  }

  try {
    // 1. Get active bank
    const bankRes = await db.query("SELECT value FROM settings WHERE key = 'active_bank'");
    const activeBank = bankRes.rows.length > 0 ? bankRes.rows[0].value : 'HDFC';

    // 2. Count leads created today to generate sequential index
    const countRes = await db.query("SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE");
    const countToday = parseInt(countRes.rows[0]?.count || 0);
    const nextSeq = String(countToday + 1).padStart(3, '0');

    // 3. Generate sequential LeadID (URM No)
    // Format: CM{YYYYMMDD}{XXX}
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const leadId = `CM${dateStr}${nextSeq}`;

    // 4. Save to database
    await db.query(
      'INSERT INTO leads (lead_id, name, phone, email, bank_name, utm_source, utm_info) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [leadId, name, phone, email, activeBank, utm_source || '', utm_info || '']
    );

    // 5. Retrieve bank redirect URL template
    const templateKey = `bank_${activeBank.toLowerCase()}_url`;
    const urlRes = await db.query('SELECT value FROM settings WHERE key = $1', [templateKey]);
    let redirectTemplate = urlRes.rows.length > 0 
      ? urlRes.rows[0].value 
      : `https://applyonline.hdfcbank.com/loan-against-assets/insta-jumbo-loan/insta-jumbo-form.html?XSELLINSHI=Y&XSELLINSLP=Y&Channel=DSA&DSACode=XRKD&LGCode=XRKD&LC1={urm}&LC2=XYZ001&SMCode=A28596&utm_source=DSA&utm_medium=XRKD#nbb`;

    // 6. Replace placeholders
    const redirectUrl = redirectTemplate
      .replace(/{urm}/g, encodeURIComponent(leadId))
      .replace(/{name}/g, encodeURIComponent(name))
      .replace(/{email}/g, encodeURIComponent(email))
      .replace(/{phone}/g, encodeURIComponent(phone));

    return res.status(201).json({
      success: true,
      lead_id: leadId,
      bank: activeBank,
      redirect_url: redirectUrl
    });
  } catch (err) {
    console.error('Error creating lead:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Failed to save lead.' });
  }
});

// -------------------------------------------------------------
// SECURED ADMIN ENDPOINTS
// -------------------------------------------------------------

// Admin login validation
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  const envPassword = process.env.ADMIN_PASSWORD || 'admin123';
  let dbPassword = envPassword;

  try {
    const dbPassRes = await db.query("SELECT value FROM settings WHERE key = 'admin_password'");
    if (dbPassRes.rows.length > 0) {
      dbPassword = dbPassRes.rows[0].value;
    }
  } catch (err) {
    console.error('Error fetching admin password from DB during login:', err.message);
  }

  if (password === dbPassword || password === envPassword) {
    return res.json({ success: true, message: 'Authentication successful.' });
  } else {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
});

// Retrieve all leads (for dashboard table)
app.get('/api/leads', adminAuth, async (req, res) => {
  try {
    const leadsRes = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    return res.json({ success: true, leads: leadsRes.rows });
  } catch (err) {
    console.error('Error fetching leads:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Failed to retrieve leads.' });
  }
});

// Retrieve dashboard statistics
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const totalRes = await db.query('SELECT COUNT(*) FROM leads');
    const todayRes = await db.query("SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE");
    const activeBankRes = await db.query("SELECT value FROM settings WHERE key = 'active_bank'");
    
    // Group by bank stats
    const bankBreakdownRes = await db.query('SELECT bank_name, COUNT(*) as count FROM leads GROUP BY bank_name');
    
    return res.json({
      success: true,
      stats: {
        totalLeads: parseInt(totalRes.rows[0].count),
        todayLeads: parseInt(todayRes.rows[0].count),
        activeBank: activeBankRes.rows[0]?.value || 'HDFC',
        bankBreakdown: bankBreakdownRes.rows.map(r => ({ bank: r.bank_name, count: parseInt(r.count) }))
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Failed to retrieve statistics.' });
  }
});

// Get current system settings
app.get('/api/settings', adminAuth, async (req, res) => {
  try {
    const settingsRes = await db.query('SELECT key, value FROM settings');
    const settingsMap = {};
    settingsRes.rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });
    return res.json({ success: true, settings: settingsMap });
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Failed to retrieve settings.' });
  }
});

// Update settings
app.post('/api/settings', adminAuth, async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid settings format.' });
  }

  try {
    // Perform updates inside a transaction to ensure safety
    await db.query('BEGIN');
    
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      );
    }
    
    await db.query('COMMIT');
    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error saving settings:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Failed to save settings.' });
  }
});

// Handle wildcard route: serve landing page index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`CreditMantra Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database tables on startup. Express server not started.', err);
});
