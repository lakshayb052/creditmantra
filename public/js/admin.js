// -------------------------------------------------------------
// SESSION CONTROL & AUTHORIZATION GATE
// -------------------------------------------------------------
let adminPassword = localStorage.getItem('creditmantra_admin_password') || '';
let allLeads = [];
let filteredLeads = [];

const authGate = document.getElementById('auth-gate');
const dashboardWrapper = document.getElementById('admin-dashboard');
const authForm = document.getElementById('auth-form');
const adminPassInput = document.getElementById('admin-pass');
const btnLogout = document.getElementById('btn-logout');

// Initial load check
if (adminPassword) {
  validateSessionAndLoad(adminPassword);
} else {
  showAuthGate();
}

function showAuthGate() {
  authGate.classList.remove('hidden');
  dashboardWrapper.classList.add('hidden');
  adminPassInput.focus();
}

function hideAuthGate() {
  authGate.classList.add('hidden');
  dashboardWrapper.classList.remove('hidden');
}

// Log out action
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('creditmantra_admin_password');
  adminPassword = '';
  allLeads = [];
  filteredLeads = [];
  showAuthGate();
});

// Authenticate submitted password
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = adminPassInput.value.trim();
  if (!password) return;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (data.success) {
      adminPassword = password;
      localStorage.setItem('creditmantra_admin_password', password);
      adminPassInput.value = '';
      hideAuthGate();
      loadDashboardData();
    } else {
      alert(data.message || 'Incorrect password.');
      adminPassInput.focus();
    }
  } catch (err) {
    console.error('Auth request error:', err);
    alert('Communication error with authentication gateway.');
  }
});

// Validate stored password by fetching stats on start
async function validateSessionAndLoad(password) {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-password': password }
    });

    if (res.status === 200) {
      hideAuthGate();
      loadDashboardData();
    } else {
      localStorage.removeItem('creditmantra_admin_password');
      showAuthGate();
    }
  } catch (err) {
    console.error('Session validation error:', err);
    showAuthGate();
  }
}

// -------------------------------------------------------------
// NAVIGATION TABS
// -------------------------------------------------------------
const tabs = document.querySelectorAll('.nav-tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    // Add active to current
    tab.classList.add('active');
    const targetPanel = tab.getAttribute('data-tab');
    document.getElementById(targetPanel).classList.add('active');
  });
});

// -------------------------------------------------------------
// DATA LOADING & STATISTICS RENDERING
// -------------------------------------------------------------
async function loadDashboardData() {
  await Promise.all([
    fetchStats(),
    fetchSettings(),
    fetchLeads()
  ]);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-password': adminPassword }
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('stat-total-leads').innerText = data.stats.totalLeads;
      document.getElementById('stat-today-leads').innerText = data.stats.todayLeads;
      document.getElementById('stat-active-bank').innerText = data.stats.activeBank;

      renderBankBreakdown(data.stats.bankBreakdown, data.stats.totalLeads);
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }
}

function renderBankBreakdown(breakdown, total) {
  const listContainer = document.getElementById('bank-breakdown-list');
  listContainer.innerHTML = '';

  if (!breakdown || breakdown.length === 0 || total === 0) {
    listContainer.innerHTML = '<div class="no-data-msg">No distribution data available yet.</div>';
    return;
  }

  breakdown.forEach(item => {
    const percentage = Math.round((item.count / total) * 100);
    const bankClass = item.bank.toLowerCase();
    
    // Choose dynamic class for styling
    let barClass = 'default';
    if (bankClass === 'hdfc') barClass = 'hdfc';
    if (bankClass === 'icici') barClass = 'icici';
    if (bankClass === 'sbi') barClass = 'sbi';

    const itemHtml = `
      <div class="ratio-item">
        <div class="ratio-header">
          <span>${item.bank} Bank</span>
          <span>${item.count} Leads (${percentage}%)</span>
        </div>
        <div class="ratio-track">
          <div class="ratio-bar ${barClass}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
    listContainer.insertAdjacentHTML('beforeend', itemHtml);
  });
}

// -------------------------------------------------------------
// LEADS TABLE DISPLAY, FILTERING & EXPORT
// -------------------------------------------------------------
async function fetchLeads() {
  try {
    const res = await fetch('/api/leads', {
      headers: { 'x-admin-password': adminPassword }
    });
    const data = await res.json();

    if (data.success) {
      allLeads = data.leads;
      applyFilters();
    }
  } catch (err) {
    console.error('Error fetching leads:', err);
    document.getElementById('leads-table-body').innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;color:#ef4444;padding:30px;">
          Failed to load leads from database.
        </td>
      </tr>
    `;
  }
}

const searchQuery = document.getElementById('search-query');
const filterBank = document.getElementById('filter-bank');
const leadsTableBody = document.getElementById('leads-table-body');
const selectAllLeads = document.getElementById('select-all-leads');
const btnDeleteSelected = document.getElementById('btn-delete-selected');
const deleteCount = document.getElementById('delete-count');

searchQuery.addEventListener('input', applyFilters);
filterBank.addEventListener('change', applyFilters);

// Select/deselect all leads
if (selectAllLeads) {
  selectAllLeads.addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('.select-lead');
    checkboxes.forEach(cb => cb.checked = selectAllLeads.checked);
    updateDeleteButtonState();
  });
}

// Event delegation for individual checkbox clicks
if (leadsTableBody) {
  leadsTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('select-lead')) {
      updateDeleteButtonState();
    }
  });
}

function updateDeleteButtonState() {
  if (!btnDeleteSelected || !deleteCount || !selectAllLeads) return;
  const checkedBoxes = document.querySelectorAll('.select-lead:checked');
  const count = checkedBoxes.length;
  
  if (count > 0) {
    btnDeleteSelected.style.display = 'flex';
    deleteCount.innerText = count;
  } else {
    btnDeleteSelected.style.display = 'none';
  }
  
  const allBoxes = document.querySelectorAll('.select-lead');
  if (allBoxes.length > 0 && count === allBoxes.length) {
    selectAllLeads.checked = true;
  } else {
    selectAllLeads.checked = false;
  }
}

// Bulk delete action handler
if (btnDeleteSelected) {
  btnDeleteSelected.addEventListener('click', async () => {
    const checkedBoxes = document.querySelectorAll('.select-lead:checked');
    const leadIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
    if (leadIds.length === 0) return;

    const confirmed = confirm(`Are you sure you want to permanently delete the ${leadIds.length} selected lead(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ leadIds })
      });

      const data = await res.json();
      if (data.success) {
        // Clear checkbox states
        if (selectAllLeads) selectAllLeads.checked = false;
        btnDeleteSelected.style.display = 'none';
        // Reload dashboard data
        loadDashboardData();
      } else {
        alert('Error deleting leads: ' + data.message);
      }
    } catch (err) {
      console.error('Delete request error:', err);
      alert('Communication error with deletion API.');
    }
  });
}

function applyFilters() {
  const query = searchQuery.value.trim().toLowerCase();
  const bankFilter = filterBank.value;

  filteredLeads = allLeads.filter(lead => {
    // Search filter (matches name, email, phone, URM ID, or UTM campaign details)
    const matchesSearch = 
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.includes(query) ||
      lead.lead_id.toLowerCase().includes(query) ||
      (lead.utm_source || '').toLowerCase().includes(query) ||
      (lead.utm_info || '').toLowerCase().includes(query);

    // Bank filter
    const matchesBank = bankFilter === '' || lead.bank_name === bankFilter;

    return matchesSearch && matchesBank;
  });

  renderLeadsTable();
}

function renderLeadsTable() {
  leadsTableBody.innerHTML = '';
  
  // Reset select-all checkbox and delete button state when rendering table
  if (selectAllLeads) selectAllLeads.checked = false;
  if (btnDeleteSelected) btnDeleteSelected.style.display = 'none';

  if (filteredLeads.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);">
          No matching client leads found.
        </td>
      </tr>
    `;
    return;
  }

  filteredLeads.forEach(lead => {
    const date = new Date(lead.created_at).toLocaleString();
    const utmSourceBadge = lead.utm_source ? `<span class="badge blue">${lead.utm_source}</span>` : '<span style="color:var(--text-muted);font-style:italic;">Direct</span>';
    const utmInfoBadge = lead.utm_info ? `<span class="badge secondary">${lead.utm_info}</span>` : '-';
    
    const rowHtml = `
      <tr>
        <td style="text-align: center;"><input type="checkbox" class="select-lead" data-id="${lead.lead_id}"></td>
        <td class="lead-id-cell">${lead.lead_id}</td>
        <td class="name-cell">${lead.name}</td>
        <td>${lead.phone}</td>
        <td>${lead.email}</td>
        <td><span class="badge success">${lead.bank_name}</span></td>
        <td>${utmSourceBadge}</td>
        <td>${utmInfoBadge}</td>
        <td class="date-cell">${date}</td>
      </tr>
    `;
    leadsTableBody.insertAdjacentHTML('beforeend', rowHtml);
  });
}

// Export filtered leads to CSV format
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if (filteredLeads.length === 0) {
    alert('No lead records available to export.');
    return;
  }

  const csvRows = [];
  // CSV Headers
  csvRows.push(['URM_LeadID', 'ClientName', 'ContactPhone', 'EmailAddress', 'BankPartner', 'UTM_Source', 'UTM_Info', 'CreatedTimestamp'].join(','));

  // CSV content
  filteredLeads.forEach(lead => {
    const date = new Date(lead.created_at).toISOString();
    const row = [
      `"${lead.lead_id}"`,
      `"${lead.name.replace(/"/g, '""')}"`,
      `"${lead.phone}"`,
      `"${lead.email.replace(/"/g, '""')}"`,
      `"${lead.bank_name}"`,
      `"${(lead.utm_source || '').replace(/"/g, '""')}"`,
      `"${(lead.utm_info || '').replace(/"/g, '""')}"`,
      `"${date}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `creditmantra_leads_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// -------------------------------------------------------------
// SETTINGS FORMS SUBMISSIONS
// -------------------------------------------------------------
const activeBankForm = document.getElementById('active-bank-form');
const urlTemplatesForm = document.getElementById('url-templates-form');
const selectActiveBank = document.getElementById('select-active-bank');

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings', {
      headers: { 'x-admin-password': adminPassword }
    });
    const data = await res.json();

    if (data.success) {
      const settings = data.settings;
      
      // Populate active bank
      if (settings.active_bank) {
        selectActiveBank.value = settings.active_bank;
      }

      // Populate templates
      document.getElementById('url-hdfc').value = settings.bank_hdfc_url || '';
      document.getElementById('url-icici').value = settings.bank_icici_url || '';
      document.getElementById('url-sbi').value = settings.bank_sbi_url || '';
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
}

// Save active routing bank
activeBankForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const active_bank = selectActiveBank.value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({
        settings: { active_bank }
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('Dynamic traffic routing updated successfully.');
      document.getElementById('stat-active-bank').innerText = active_bank;
    } else {
      alert('Error updating routing: ' + data.message);
    }
  } catch (err) {
    console.error('Error updating active bank settings:', err);
    alert('Communication failure with settings API.');
  }
});

// Save integration templates
urlTemplatesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const bank_hdfc_url = document.getElementById('url-hdfc').value.trim();
  const bank_icici_url = document.getElementById('url-icici').value.trim();
  const bank_sbi_url = document.getElementById('url-sbi').value.trim();

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify({
        settings: {
          bank_hdfc_url,
          bank_icici_url,
          bank_sbi_url
        }
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('Bank API Redirection templates updated successfully.');
    } else {
      alert('Error updating templates: ' + data.message);
    }
  } catch (err) {
    console.error('Error updating URL template settings:', err);
    alert('Communication failure with templates API.');
  }
});
