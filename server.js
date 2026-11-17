require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure writable data and uploads directory exist
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = isServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn('DATA_DIR creation notice:', e.message);
}

try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
  console.warn('UPLOADS_DIR creation notice:', e.message);
}

// In-Memory / File Fallback Storage for serverless or older Node runtimes
function createMemoryDbFallback() {
  const jsonPath = path.join(DATA_DIR, 'trace_store.json');
  let store = { settings: {}, transactions: [], bills: [], chat_history: [] };

  try {
    if (fs.existsSync(jsonPath)) {
      store = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch (e) {}

  function persist() {
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(store, null, 2));
    } catch (e) {}
  }

  let txIdCounter = store.transactions.reduce((max, t) => Math.max(max, t.id || 0), 0);
  let billIdCounter = store.bills.reduce((max, b) => Math.max(max, b.id || 0), 0);
  let chatIdCounter = store.chat_history.reduce((max, c) => Math.max(max, c.id || 0), 0);

  return {
    exec(sql) {
      if (sql.includes('DELETE FROM transactions')) { store.transactions = []; persist(); }
      if (sql.includes('DELETE FROM bills')) { store.bills = []; persist(); }
      if (sql.includes('DELETE FROM chat_history')) { store.chat_history = []; persist(); }
      return this;
    },
    prepare(sql) {
      const trimmed = sql.trim();
      return {
        run(...args) {
          if (trimmed.startsWith('INSERT INTO settings')) {
            const [k, v] = args;
            store.settings[k] = v;
            persist();
            return { changes: 1 };
          }
          if (trimmed.startsWith('INSERT INTO transactions')) {
            txIdCounter++;
            const t = {
              id: txIdCounter,
              type: args[0],
              title: args[1],
              amount: Number(args[2]),
              category: args[3],
              date_offset: Number(args[4]),
              saved_buffer: Number(args[5] || 0),
              receipt_image: args[6] || null,
              notes: args[7] || null,
              classification: args[8] || 'need',
              created_at: new Date().toISOString()
            };
            store.transactions.unshift(t);
            persist();
            return { lastInsertRowid: t.id, changes: 1 };
          }
          if (trimmed.startsWith('UPDATE transactions SET classification = ? WHERE id = ?')) {
            const [cls, id] = args;
            const t = store.transactions.find(x => x.id === Number(id));
            if (t) { t.classification = cls; persist(); }
            return { changes: 1 };
          }
          if (trimmed.startsWith('DELETE FROM transactions WHERE id = ?')) {
            const [id] = args;
            store.transactions = store.transactions.filter(x => x.id !== Number(id));
            persist();
            return { changes: 1 };
          }
          if (trimmed.startsWith('INSERT INTO bills')) {
            billIdCounter++;
            const b = {
              id: billIdCounter,
              name: args[0],
              amount: Number(args[1]),
              due_offset: Number(args[2]),
              paid: 0,
              paid_at: null,
              created_at: new Date().toISOString()
            };
            store.bills.push(b);
            persist();
            return { lastInsertRowid: b.id, changes: 1 };
          }
          if (trimmed.startsWith('UPDATE bills SET paid = 1')) {
            const [id] = args;
            const b = store.bills.find(x => x.id === Number(id));
            if (b) { b.paid = 1; b.paid_at = new Date().toISOString(); persist(); }
            return { changes: 1 };
          }
          if (trimmed.startsWith('DELETE FROM bills WHERE id = ?')) {
            const [id] = args;
            store.bills = store.bills.filter(x => x.id !== Number(id));
            persist();
            return { changes: 1 };
          }
          if (trimmed.startsWith('INSERT INTO chat_history')) {
            chatIdCounter++;
            const c = { id: chatIdCounter, role: args[0], content: args[1], created_at: new Date().toISOString() };
            store.chat_history.push(c);
            persist();
            return { lastInsertRowid: c.id, changes: 1 };
          }
          return { changes: 0 };
        },
        get(...args) {
          if (trimmed.startsWith('SELECT value FROM settings WHERE key = ?')) {
            const val = store.settings[args[0]];
            return val !== undefined ? { value: val } : undefined;
          }
          if (trimmed.startsWith('SELECT COUNT(*) as count FROM transactions')) {
            return { count: store.transactions.length };
          }
          if (trimmed.startsWith('SELECT * FROM bills WHERE id = ?')) {
            return store.bills.find(x => x.id === Number(args[0]));
          }
          return undefined;
        },
        all(...args) {
          if (trimmed.includes('FROM transactions')) {
            return [...store.transactions].sort((a, b) => b.date_offset - a.date_offset || b.id - a.id);
          }
          if (trimmed.includes('FROM bills')) {
            return [...store.bills].sort((a, b) => a.due_offset - b.due_offset || a.id - b.id);
          }
          if (trimmed.includes('FROM chat_history')) {
            return [...store.chat_history].slice(-50);
          }
          if (trimmed.includes('FROM settings')) {
            return Object.entries(store.settings).map(([key, value]) => ({ key, value }));
          }
          return [];
        }
      };
    }
  };
}

// Initialize SQLite Database with safe fallback
let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(DATA_DIR, 'trace.db');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (err) {
  console.warn('Native node:sqlite unavailable or restricted. Using resilient store fallback:', err.message);
  db = createMemoryDbFallback();
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('inc', 'exp')),
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date_offset INTEGER NOT NULL,
    saved_buffer REAL DEFAULT 0,
    receipt_image TEXT,
    notes TEXT,
    classification TEXT DEFAULT 'need' CHECK(classification IN ('need', 'want')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    due_offset INTEGER NOT NULL,
    paid INTEGER DEFAULT 0,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Safe migration for classification column on existing databases
try {
  db.exec("ALTER TABLE transactions ADD COLUMN classification TEXT DEFAULT 'need';");
} catch (e) {
  // column already exists
}

// Date reference: days since epoch in local date
function getDayNumber() {
  const n0 = new Date();
  return Math.floor((n0.getTime() - n0.getTimezoneOffset() * 60000) / 86400000);
}

// Helper to get or set setting
function getSetting(key, fallback = null) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key);
  return row ? JSON.parse(row.value) : fallback;
}

function setSetting(key, value) {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  stmt.run(key, JSON.stringify(value));
}

// AI API Key resolution: checks SQLite settings first, then .env / process.env
function getActiveApiKey() {
  const dbKey = getSetting('ai_api_key', null);
  const dbProvider = getSetting('ai_provider', 'gemini');

  if (dbKey && typeof dbKey === 'string' && dbKey.trim()) {
    return { key: dbKey.trim(), provider: dbProvider };
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return { key: process.env.GEMINI_API_KEY.trim(), provider: 'gemini' };
  }

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return { key: process.env.OPENAI_API_KEY.trim(), provider: 'openai' };
  }

  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) {
    return { key: process.env.ANTHROPIC_API_KEY.trim(), provider: 'anthropic' };
  }

  return { key: null, provider: 'local' };
}

// Helper to call Google Gemini API with fallback models
async function callGemini(apiKey, prompt, systemInstruction = '') {
  const models = ['models/gemini-3.5-flash-lite', 'models/gemini-3.5-flash', 'models/gemini-3.8-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message || `${model} call failed`);
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} attempt failed:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Helper to call Google Gemini Vision for receipt extraction
async function callGeminiVision(apiKey, imageBuffer, mimeType) {
  const models = ['models/gemini-3.5-flash-lite', 'models/gemini-3.5-flash'];
  const base64Data = imageBuffer.toString('base64');
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'Read this receipt photo or bill. Output ONLY valid JSON: {"readable": boolean, "merchant": string, "amount": number, "category": string, "isWant": boolean}. Amount is the final total paid in Indian Rupees as a plain number. Category must be one of: Food, Transport, Bills, Study, Shopping, Fun, Other.'
              },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message || `${model} vision failed`);
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text);
    } catch (err) {
      lastError = err;
      console.warn(`Vision on ${model} attempt failed:`, err.message);
    }
  }

  throw lastError || new Error('Gemini Vision failed');
}

// Initialize default settings and greeting without auto-populating transactions
function initializeDefaultSettings() {
  if (getSetting('pct') === null) setSetting('pct', 20);
  if (getSetting('goal') === null) setSetting('goal', 3000);
  if (getSetting('currency') === null) setSetting('currency', '₹');

  try {
    const chatCount = db.prepare('SELECT COUNT(*) as count FROM chat_history').get().count;
    if (chatCount === 0) {
      db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)').run(
        'assistant',
        'Hey there! I am TRACE, your financial companion for irregular months. Ask me anything about your budget, affordability, or how to stretch your cash.'
      );
    }
  } catch (e) {}
}

initializeDefaultSettings();

// Seed sample student data (only invoked explicitly via Load Sample button)
function seedDatabase(force = false) {
  if (!force) return;

  const T = getDayNumber();

  db.exec('DELETE FROM transactions;');
  db.exec('DELETE FROM bills;');
  db.exec('DELETE FROM chat_history;');

  setSetting('pct', 20);
  setSetting('goal', 3000);
  setSetting('nextDay', T + 10);
  setSetting('currency', '₹');

  // Insert seed incomes
  const insertTx = db.prepare(`
    INSERT INTO transactions (type, title, amount, category, date_offset, saved_buffer, classification)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run('inc', 'Pocket money', 5000, 'Pocket money', T - 12, 1000, 'need');
  insertTx.run('inc', 'Freelance project', 1800, 'Freelance', T - 5, 360, 'need');

  // Insert seed expenses with realistic Student Need vs Want classifications
  const seedExpenses = [
    [0, 'Chai & Snacks', 30, 'Food', 'want'],
    [0, 'Auto to college campus', 90, 'Transport', 'need'],
    [1, 'Canteen lunch & juice', 140, 'Food', 'need'],
    [2, 'Lab manual printouts', 45, 'Study', 'need'],
    [3, 'Movie night with friends', 320, 'Fun', 'want'],
    [4, 'Dinner at dhaba', 450, 'Food', 'want'],
    [5, 'Metro smart card recharge', 300, 'Transport', 'need'],
    [6, 'Semester notebook & pens', 95, 'Study', 'need'],
    [7, 'Boat earphones', 699, 'Shopping', 'want'],
    [8, 'Hostel pizza treat', 260, 'Food', 'want'],
    [10, 'Evening tea & biscuits', 120, 'Food', 'want'],
    [11, 'Auto shared ride', 110, 'Transport', 'need']
  ];

  for (const [offset, title, amount, cat, intent] of seedExpenses) {
    insertTx.run('exp', title, amount, cat, T - offset, 0, intent || 'need');
  }

  // Insert seed bills
  const insertBill = db.prepare(`
    INSERT INTO bills (name, amount, due_offset, paid)
    VALUES (?, ?, ?, 0)
  `);

  insertBill.run('Mobile recharge (5G pack)', 299, T + 4);
  insertBill.run('Hostel mess fees balance', 2000, T + 9);

  // Insert welcome chat message
  const insertChat = db.prepare(`
    INSERT INTO chat_history (role, content)
    VALUES (?, ?)
  `);
  insertChat.run('assistant', 'Sample student data loaded! You now have typical college income, expenses, and pending bills. Ask me anything to test the analysis.');
}

// Calculation engine
function calculateState() {
  const T = getDayNumber();

  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date_offset DESC, id DESC').all();
  const bills = db.prepare('SELECT * FROM bills ORDER BY due_offset ASC, id ASC').all();

  const nextDay = getSetting('nextDay', null);
  const pct = getSetting('pct', 20);
  const goal = getSetting('goal', 3000);

  const incList = transactions.filter(t => t.type === 'inc');
  const expList = transactions.filter(t => t.type === 'exp');

  const totalIncome = incList.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expList.reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Buffer accumulated from saved portions
  const buffer = incList.reduce((sum, t) => sum + Number(t.saved_buffer || 0), 0);

  // Horizon: days until next money arrives, or default 30
  const horizon = nextDay ? Math.max(1, nextDay - T) : 30;

  // Unpaid bills due within horizon
  const unpaidBills = bills.filter(b => !b.paid && b.due_offset <= T + horizon);
  const billsDue = unpaidBills.reduce((sum, b) => sum + Number(b.amount), 0);

  // Usable cash remaining after reserving safety buffer and upcoming bills
  const usable = balance - buffer - billsDue;
  const safeToSpend = usable / horizon;

  // 14-day spending average
  const recentExp = expList.filter(t => t.date_offset > T - 14);
  const recentExpTotal = recentExp.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgDailySpend = recentExpTotal / 14;

  // Runway in days at recent average pace
  const runway = avgDailySpend > 0 ? Math.floor(Math.max(0, usable) / avgDailySpend) : null;

  // Status message and badge category
  let statusBadge = 'ok';
  let statusMessage = 'Comfortable at your current pace';
  if (totalIncome === 0 && totalExpense === 0) {
    statusBadge = 'ok';
    statusMessage = 'No transactions recorded yet. Tap + Add Entry to begin.';
  } else if (usable < 0) {
    statusBadge = 'bad';
    statusMessage = `Over by ₹${Math.round(Math.abs(usable)).toLocaleString('en-IN')} before next money`;
  } else if (safeToSpend < avgDailySpend) {
    statusBadge = 'warn';
    statusMessage = `Tight: you spend ~₹${Math.round(avgDailySpend).toLocaleString('en-IN')} / day`;
  }

  // 7-day spending chart data
  const last7Days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let maxDaySpend = 1;

  for (let i = 6; i >= 0; i--) {
    const targetOffset = T - i;
    const dayExp = expList.filter(t => t.date_offset === targetOffset);
    const dayTotal = dayExp.reduce((sum, t) => sum + Number(t.amount), 0);
    const dateObj = new Date(targetOffset * 86400000);
    const dayLabel = dayNames[dateObj.getUTCDay()];
    if (dayTotal > maxDaySpend) maxDaySpend = dayTotal;
    last7Days.push({
      offset: targetOffset,
      daysAgo: i,
      dayLabel,
      amount: dayTotal,
      isToday: i === 0,
      formattedDate: dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    });
  }

  // Category breakdowns
  const categories = ['Food', 'Transport', 'Bills', 'Study', 'Shopping', 'Fun', 'Other'];
  const categoryColors = {
    Food: '#1f7a4d',
    Transport: '#a6ee74',
    Bills: '#e0b84a',
    Study: '#5aa9c9',
    Shopping: '#c98bd1',
    Fun: '#e5806b',
    Other: '#9aa6a0'
  };

  const categoryBreakdown = categories.map(cat => {
    const catExpenses = expList.filter(t => t.category === cat);
    const total = catExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const percentage = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
    return {
      category: cat,
      amount: total,
      percentage,
      color: categoryColors[cat] || '#888'
    };
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  // Income arrival patterns
  const sortedIncomes = [...incList].sort((a, b) => a.date_offset - b.date_offset);
  let incomePatternText = 'Add income entries to see your arrival pattern.';
  let avgInterval = null;
  if (sortedIncomes.length >= 2) {
    const span = sortedIncomes[sortedIncomes.length - 1].date_offset - sortedIncomes[0].date_offset;
    avgInterval = Math.round(span / (sortedIncomes.length - 1));
    incomePatternText = `Money arrived ${sortedIncomes.length} times, averaging ₹${Math.round(totalIncome / sortedIncomes.length).toLocaleString('en-IN')} every ~${avgInterval} days.`;
  } else if (sortedIncomes.length === 1) {
    incomePatternText = `1 income recorded so far: ₹${Math.round(sortedIncomes[0].amount).toLocaleString('en-IN')}.`;
  }

  // You Want vs You Need Classification Analysis
  const needsList = expList.filter(t => t.classification !== 'want');
  const wantsList = expList.filter(t => t.classification === 'want');
  const totalNeeds = needsList.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalWants = wantsList.reduce((sum, t) => sum + Number(t.amount), 0);
  const needsPct = totalExpense > 0 ? Math.round((totalNeeds / totalExpense) * 100) : 0;
  const wantsPct = totalExpense > 0 ? 100 - needsPct : 0;
  const potentialSavings = Math.round(totalWants * 0.3); // saving 30% of discretionary wants

  let comparisonAdvice = 'Balanced: Your essentials and discretionary spending are proportional.';
  let comparisonStatus = 'good';
  if (totalExpense === 0) {
    comparisonAdvice = 'No expenses recorded yet. Tag transactions as "You Need" or "You Want" to see your balance.';
    comparisonStatus = 'good';
  } else if (wantsPct > 50) {
    comparisonAdvice = `⚠️ Alert: Wants (${wantsPct}%) are higher than Needs (${needsPct}%). In uneven months, curbing treats keeps cash safe!`;
    comparisonStatus = 'danger';
  } else if (wantsPct > 35) {
    comparisonAdvice = `Moderate: Wants take ${wantsPct}% of cash. Trimming 25% of wants frees up ₹${Math.round(totalWants * 0.25).toLocaleString('en-IN')} for your buffer.`;
    comparisonStatus = 'warning';
  } else {
    comparisonAdvice = `✨ Great discipline! ${needsPct}% of spending went toward essential needs, protecting your runway.`;
    comparisonStatus = 'great';
  }

  const needsVsWants = {
    totalNeeds,
    totalWants,
    needsPct,
    wantsPct,
    needsCount: needsList.length,
    wantsCount: wantsList.length,
    potentialSavings,
    comparisonAdvice,
    comparisonStatus
  };

  return {
    todayOffset: T,
    todayFormatted: new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    financials: {
      balance,
      buffer,
      bufferGoal: goal,
      bufferPercent: pct,
      bufferProgress: Math.min(100, Math.round((buffer / Math.max(1, goal)) * 100)),
      billsDue,
      usable,
      safeToSpend: Math.max(0, safeToSpend),
      horizon,
      nextDay,
      daysToNext: nextDay ? nextDay - T : null,
      avgDailySpend,
      runway,
      totalIncome,
      totalExpense,
      statusBadge,
      statusMessage
    },
    analytics: {
      last7Days,
      maxDaySpend,
      categoryBreakdown,
      incomePatternText,
      avgInterval,
      needsVsWants
    },
    transactions,
    bills
  };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for bill scanning image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `bill_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// REST API Routes

// 1. Get complete dashboard state
app.get('/api/state', (req, res) => {
  try {
    const state = calculateState();
    res.json({ success: true, data: state });
  } catch (err) {
    console.error('Error fetching state:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Add transaction (expense or income)
app.post('/api/transactions', (req, res) => {
  try {
    const { type, title, amount, category, dateOffset, notes, receiptImage, classification } = req.body;
    const numAmount = parseFloat(amount);

    if (!type || !['inc', 'exp'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid transaction type' });
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }

    const T = getDayNumber();
    const finalOffset = dateOffset !== undefined ? parseInt(dateOffset, 10) : T;
    const cleanTitle = (title || (type === 'exp' ? category || 'Expense' : 'Income')).trim();
    const cleanCategory = category || (type === 'exp' ? 'Other' : 'Pocket money');
    const finalClassification = (type === 'exp' && classification === 'want') ? 'want' : 'need';

    let savedBuffer = 0;
    if (type === 'inc') {
      const pct = getSetting('pct', 20);
      savedBuffer = Math.round((numAmount * pct) / 100);
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (type, title, amount, category, date_offset, saved_buffer, receipt_image, notes, classification)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(type, cleanTitle, numAmount, cleanCategory, finalOffset, savedBuffer, receiptImage || null, notes || null, finalClassification);

    const updatedState = calculateState();
    res.json({
      success: true,
      data: {
        id: Number(info.lastInsertRowid),
        state: updatedState
      }
    });
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update transaction classification ('need' vs 'want')
app.patch('/api/transactions/:id/classification', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { classification } = req.body;
    if (!['need', 'want'].includes(classification)) {
      return res.status(400).json({ success: false, error: 'Classification must be "need" or "want"' });
    }

    db.prepare('UPDATE transactions SET classification = ? WHERE id = ?').run(classification, id);
    const updatedState = calculateState();
    res.json({ success: true, data: updatedState });
  } catch (err) {
    console.error('Error updating classification:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Delete transaction
app.delete('/api/transactions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    const updatedState = calculateState();
    res.json({ success: true, data: updatedState });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Add bill
app.post('/api/bills', (req, res) => {
  try {
    const { name, amount, dueInDays } = req.body;
    const numAmount = parseFloat(amount);
    const days = parseInt(dueInDays, 10);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Bill name is required' });
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ success: false, error: 'Days until due must be 0 or more' });
    }

    const T = getDayNumber();
    const dueOffset = T + days;

    const stmt = db.prepare('INSERT INTO bills (name, amount, due_offset, paid) VALUES (?, ?, ?, 0)');
    const info = stmt.run(name.trim(), numAmount, dueOffset);

    const updatedState = calculateState();
    res.json({
      success: true,
      data: {
        id: Number(info.lastInsertRowid),
        state: updatedState
      }
    });
  } catch (err) {
    console.error('Error adding bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Mark bill as paid (auto-logs expense)
app.patch('/api/bills/:id/pay', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    if (bill.paid) {
      return res.status(400).json({ success: false, error: 'Bill is already paid' });
    }

    const T = getDayNumber();

    // Mark paid
    db.prepare("UPDATE bills SET paid = 1, paid_at = datetime('now') WHERE id = ?").run(id);

    // Automatically record as an expense
    db.prepare(`
      INSERT INTO transactions (type, title, amount, category, date_offset, saved_buffer, notes)
      VALUES ('exp', ?, ?, 'Bills', ?, 0, 'Auto-logged from paid bill')
    `).run(bill.name, bill.amount, T);

    const updatedState = calculateState();
    res.json({ success: true, data: updatedState });
  } catch (err) {
    console.error('Error paying bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete bill
app.delete('/api/bills/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM bills WHERE id = ?').run(id);
    const updatedState = calculateState();
    res.json({ success: true, data: updatedState });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Update plan settings
app.put('/api/plan', (req, res) => {
  try {
    const { nextDays, pct, goal, clearNextDay } = req.body;
    const T = getDayNumber();

    if (clearNextDay) {
      setSetting('nextDay', null);
    } else if (nextDays !== undefined && nextDays !== null) {
      const days = parseInt(nextDays, 10);
      if (isNaN(days) || days < 0 || days > 365) {
        return res.status(400).json({ success: false, error: 'Days must be between 0 and 365' });
      }
      setSetting('nextDay', T + days);
    }

    if (pct !== undefined) {
      const numPct = parseInt(pct, 10);
      if (!isNaN(numPct) && numPct >= 0 && numPct <= 100) {
        setSetting('pct', numPct);
      }
    }

    if (goal !== undefined) {
      const numGoal = parseFloat(goal);
      if (!isNaN(numGoal) && numGoal > 0) {
        setSetting('goal', numGoal);
      }
    }

    const updatedState = calculateState();
    res.json({ success: true, data: updatedState });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Bill scan with Gemini Vision & OCR fallback
app.post('/api/scan-bill', upload.single('billImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const filePath = req.file.path;
    const { key, provider } = getActiveApiKey();

    // Strategy 1: Try Gemini Vision if API key is configured
    if (key && provider === 'gemini') {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const visionResult = await callGeminiVision(key, fileBuffer, req.file.mimetype);
        if (visionResult && (visionResult.readable || Number(visionResult.amount) > 0)) {
          return res.json({
            success: true,
            data: {
              readable: Boolean(visionResult.readable),
              merchant: visionResult.merchant || 'Scanned Receipt',
              amount: Number(visionResult.amount) || '',
              category: visionResult.category || 'Food',
              isWant: Boolean(visionResult.isWant),
              detectedText: 'Extracted with Gemini Vision AI',
              imageUrl: `/uploads/${path.basename(filePath)}`,
              poweredBy: 'gemini'
            }
          });
        }
      } catch (geminiVisionErr) {
        console.warn('Gemini Vision fallback triggered:', geminiVisionErr.message);
      }
    }

    // Strategy 2: Tesseract OCR + Smart Heuristic Parsing fallback
    let extractedText = '';
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(filePath);
      extractedText = ret.data.text || '';
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('Tesseract OCR fallback triggered:', ocrErr.message);
    }

    const parsed = parseReceiptText(extractedText, req.file.originalname);

    res.json({
      success: true,
      data: {
        readable: parsed.readable,
        merchant: parsed.merchant,
        amount: parsed.amount,
        category: parsed.category,
        detectedText: extractedText.slice(0, 300),
        imageUrl: `/uploads/${path.basename(filePath)}`,
        poweredBy: 'local-ocr'
      }
    });
  } catch (err) {
    console.error('Error scanning bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper for parsing receipt / bill OCR text
function parseReceiptText(text, fallbackFilename = '') {
  const categories = ['Food', 'Transport', 'Bills', 'Study', 'Shopping', 'Fun', 'Other'];
  const lower = (text || '').toLowerCase();

  // Keyword mappings
  const kw = {
    Food: ['chai', 'tea', 'cafe', 'coffee', 'canteen', 'dhaba', 'restaurant', 'food', 'mess', 'swiggy', 'zomato', 'pizza', 'burger', 'mcdonald', 'domino', 'biryani', 'bakery', 'meal', 'lunch', 'dinner'],
    Transport: ['uber', 'ola', 'rapido', 'metro', 'bus', 'auto', 'railway', 'irctc', 'petrol', 'fuel', 'toll', 'fare', 'cab'],
    Bills: ['electricity', 'airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'recharge', 'wifi', 'broadband', 'water', 'gas', 'bill', 'rent'],
    Study: ['stationery', 'xerox', 'printout', 'book', 'notebook', 'pen', 'college', 'exam', 'tuition', 'library', 'course', 'udemy', 'coursera'],
    Shopping: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'mart', 'store', 'retail', 'clothes', 'shoes', 'electronics'],
    Fun: ['movie', 'pvr', 'inox', 'cinepolis', 'netflix', 'spotify', 'prime', 'game', 'gaming', 'concert', 'party', 'club']
  };

  // Guess category
  let detectedCategory = 'Other';
  for (const [cat, words] of Object.entries(kw)) {
    if (words.some(w => lower.includes(w))) {
      detectedCategory = cat;
      break;
    }
  }

  // Look for amounts
  // Patterns like: Total: 350.00, Rs. 499, INR 250, ₹150, Grand Total: 1,250
  const amountRegexes = [
    /(?:total|grand total|net amount|amount paid|paid|amount|balance due)[:\s]*[₹rsinr.]*\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /[₹]\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    /\b([0-9]{2,6}(?:\.[0-9]{2})?)\b/g
  ];

  let detectedAmount = 0;
  for (const regex of amountRegexes) {
    const match = regex.exec(text);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
        detectedAmount = cleanNum;
        break;
      }
    }
  }

  // Guess merchant name from top lines
  let merchant = '';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  if (lines.length > 0) {
    // Top non-numeric line usually contains store/merchant name
    const topCandidates = lines.slice(0, 4).filter(l => !/^\d+$/.test(l) && !/invoice|receipt|tax|bill|date/i.test(l));
    if (topCandidates.length > 0) {
      merchant = topCandidates[0].slice(0, 50);
    }
  }

  if (!merchant) {
    if (detectedCategory !== 'Other') merchant = `${detectedCategory} Bill`;
    else merchant = fallbackFilename ? fallbackFilename.replace(/\.[^/.]+$/, '').slice(0, 30) : 'Scanned Bill';
  }

  const isReadable = detectedAmount > 0 || (text.trim().length > 15);

  return {
    readable: isReadable,
    merchant,
    amount: detectedAmount > 0 ? detectedAmount : '',
    category: detectedCategory
  };
}

// 9. Intelligent AI Financial Assistant (Gemini live AI + Contextual Engine Fallback)
app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const state = calculateState();
    let answer = '';
    const { key, provider } = getActiveApiKey();

    if (key && provider === 'gemini') {
      try {
        const sysPrompt = `You are TRACE, a calm, supportive, highly pragmatic personal finance advisor inside an app for college students and people whose money arrives unevenly.
Answer in concise, plain words under 120 words with Indian rupee amounts (₹).
Never scold or judge. Emphasize their daily safe-to-spend limit, buffer safety, upcoming bills, and Needs vs Wants balance.
Give no formal investment, credit, or loan advice. Base answers on their real numbers below:

STUDENT'S LIVE FINANCIAL DATA:
• Total Balance: ₹${state.financials.balance.toLocaleString('en-IN')}
• Safety Buffer: ₹${state.financials.buffer.toLocaleString('en-IN')} (Goal: ₹${state.financials.bufferGoal.toLocaleString('en-IN')})
• Upcoming Bills Due: ₹${state.financials.billsDue.toLocaleString('en-IN')}
• Usable Free Cash: ₹${state.financials.usable.toLocaleString('en-IN')}
• Safe to Spend Today: ₹${Math.round(state.financials.safeToSpend).toLocaleString('en-IN')}/day over ${state.financials.horizon} days
• 14-day Daily Average Burn: ₹${Math.round(state.financials.avgDailySpend).toLocaleString('en-IN')}/day
• Cash Runway: ${state.financials.runway} days
• Needs vs Wants Split: Needs ₹${state.analytics.needsVsWants.totalNeeds.toLocaleString('en-IN')} (${state.analytics.needsVsWants.needsPct}%) vs Wants ₹${state.analytics.needsVsWants.totalWants.toLocaleString('en-IN')} (${state.analytics.needsVsWants.wantsPct}%)
• Top Spending Categories: ${state.analytics.categoryBreakdown.map(c => `${c.category} ₹${c.amount}`).join(', ')}`;

        answer = await callGemini(key, question.trim(), sysPrompt);
      } catch (geminiErr) {
        console.warn('Gemini AI fallback triggered:', geminiErr.message);
        answer = generateFinancialAdvice(question.trim(), state);
      }
    } else {
      answer = generateFinancialAdvice(question.trim(), state);
    }

    // Save to chat history
    db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)').run('user', question.trim());
    db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)').run('assistant', answer);

    res.json({
      success: true,
      data: {
        role: 'assistant',
        content: answer,
        poweredBy: key ? provider : 'local'
      }
    });
  } catch (err) {
    console.error('Error answering question:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Configuration: Get current status
app.get('/api/ai-config', (req, res) => {
  try {
    const { key, provider } = getActiveApiKey();
    const isConfigured = Boolean(key && key.length > 5);
    let preview = '';
    if (isConfigured) {
      preview = key.slice(0, 4) + '...' + key.slice(-4);
    }
    res.json({
      success: true,
      data: {
        provider,
        configured: isConfigured,
        preview
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Configuration: Set API Key via UI
app.post('/api/ai-config', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    const cleanKey = (apiKey || '').trim();
    const cleanProvider = (provider || 'gemini').toLowerCase();

    if (!cleanKey) {
      setSetting('ai_api_key', null);
      setSetting('ai_provider', 'gemini');
      return res.json({ success: true, message: 'AI key cleared. Switched to offline local engine.' });
    }

    // Verify key if Gemini
    if (cleanProvider === 'gemini') {
      try {
        await callGemini(cleanKey, 'Say "OK".', 'Verification test');
      } catch (testErr) {
        return res.status(400).json({ success: false, error: `Invalid Gemini API Key: ${testErr.message}` });
      }
    }

    setSetting('ai_api_key', cleanKey);
    setSetting('ai_provider', cleanProvider);

    res.json({
      success: true,
      message: `Connected successfully to ${cleanProvider.toUpperCase()}!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Chat history endpoint
app.get('/api/chat', (req, res) => {
  try {
    const messages = db.prepare('SELECT id, role, content, created_at FROM chat_history ORDER BY id ASC LIMIT 50').all();
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear chat history
app.delete('/api/chat', (req, res) => {
  try {
    db.exec('DELETE FROM chat_history;');
    db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)').run('assistant', 'Chat history cleared. How can I assist you with your money today?');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rule-based and contextual AI financial engine
function generateFinancialAdvice(q, state) {
  const { balance, buffer, usable, safeToSpend, horizon, nextDay, avgDailySpend, runway, billsDue } = state.financials;
  const categories = state.analytics.categoryBreakdown;
  const qLower = q.toLowerCase();

  const fmt = (num) => `₹${Math.round(Math.abs(num)).toLocaleString('en-IN')}`;

  // Check for affordability queries: "can i afford 500", "can i buy headphones for 1500"
  const affordMatch = qLower.match(/(?:afford|buy|spend|get)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
  if (affordMatch || qLower.includes('afford')) {
    let checkAmount = affordMatch ? parseFloat(affordMatch[1].replace(/,/g, '')) : null;
    if (!checkAmount && qLower.includes('500')) checkAmount = 500;
    if (!checkAmount && qLower.includes('1000')) checkAmount = 1000;

    if (checkAmount) {
      if (usable <= 0) {
        return `Right now, your usable cash is already ${fmt(usable)} (tight or negative after buffer and upcoming bills). Spending ${fmt(checkAmount)} would dig deeper into your cushion. I'd recommend holding off until your next money arrives in ${horizon} days.`;
      }

      if (checkAmount <= safeToSpend) {
        return `Yes, absolutely! You have ${fmt(safeToSpend)} safe to spend today. An expense of ${fmt(checkAmount)} fits comfortably within your daily safety limit without hurting your buffer or bills due.`;
      } else if (checkAmount <= safeToSpend * 3) {
        const remainingDaily = Math.max(0, (usable - checkAmount) / Math.max(1, horizon - 1));
        return `You can afford it, but it will dip into your daily room. Spending ${fmt(checkAmount)} now reduces your daily safe-to-spend from ${fmt(safeToSpend)} down to ~${fmt(remainingDaily)}/day for the remaining ${horizon} days. If it's a priority, go for it!`;
      } else if (checkAmount <= usable) {
        return `You technically have the cash in hand (${fmt(balance)}), but spending ${fmt(checkAmount)} takes a heavy chunk of your total usable ${fmt(usable)}, leaving very little cushion for daily meals and travel over the next ${horizon} days. Consider waiting or splitting the cost.`;
      } else {
        return `Not comfortably right now. That expense of ${fmt(checkAmount)} exceeds your total usable money (${fmt(usable)}) after reserving your safety buffer (${fmt(buffer)}) and upcoming bills (${fmt(billsDue)}). Wait for your next income round!`;
      }
    }
  }

  // Where can I cut back / saving tips
  if (qLower.includes('cut back') || qLower.includes('save money') || qLower.includes('reduce') || qLower.includes('overspending')) {
    if (categories.length === 0) {
      return `You haven't logged enough expenses yet. Log your daily snacks, rides, and canteen bills for a few days, and I'll identify your biggest leaks!`;
    }
    const topCat = categories[0];
    const secondCat = categories[1] || null;

    let tip = `Your biggest spending bucket is **${topCat.category}** at ${fmt(topCat.amount)} (${topCat.percentage}% of your total spending).`;
    if (topCat.category === 'Food') {
      tip += ` For college students, small daily canteen bites, chai runs, and late-night food deliveries add up fastest. Cutting one delivery or eating mess meals 2 more times this week could free up ₹300-₹600 easily!`;
    } else if (topCat.category === 'Transport') {
      tip += ` Shared autos, metro cards, or campus shuttle cycles can trim 30-40% off single-rider cabs and auto fares.`;
    } else if (topCat.category === 'Fun' || topCat.category === 'Shopping') {
      tip += ` Delay non-essential treats by a 48-hour 'cooling off' rule before checking out.`;
    }
    if (secondCat) {
      tip += ` Your second highest is **${secondCat.category}** at ${fmt(secondCat.amount)}.`;
    }
    return tip;
  }

  // Lean month advice / irregular income strategies
  if (qLower.includes('lean') || qLower.includes('survive') || qLower.includes('uneven') || qLower.includes('irregular') || qLower.includes('pocket money')) {
    return `To glide through uneven months:\n1. **Lock the buffer**: Your current buffer is ${fmt(buffer)}. Keep it untouched for true emergencies.\n2. **Cap daily burn**: Stick to your safe-to-spend limit of ${fmt(safeToSpend)}/day over the next ${horizon} days.\n3. **Clear fixed bills first**: You have ${fmt(billsDue)} in bills due soon. Keeping that aside guarantees peace of mind.\n4. **Log every single ₹20-50**: It's the micro-leaks (chai, printouts, auto surge) that sneak up during lean weeks.`;
  }

  // Runway queries
  if (qLower.includes('runway') || qLower.includes('how long') || qLower.includes('last')) {
    if (runway === null) {
      return `Based on your recent transactions, you don't have enough spending history yet to compute your runway. Keep logging for a few days!`;
    }
    return `At your recent average pace of ${fmt(avgDailySpend)} per day, your current usable money will last **${runway} days**. ${nextDay ? (runway >= (nextDay - state.todayOffset) ? 'That covers you nicely until your next money date!' : `Warning: you might run short by about ${Math.max(0, (nextDay - state.todayOffset) - runway)} days before money arrives.`) : 'Consider setting your expected next money arrival in the Plan tab to stay on track.'}`;
  }

  // Next money or balance summary
  if (qLower.includes('next money') || qLower.includes('summary') || qLower.includes('status') || qLower.includes('balance')) {
    return `Here is your quick financial pulse:\n• Available Balance: ${fmt(balance)}\n• Safety Buffer: ${fmt(buffer)} (Goal: ${fmt(state.financials.bufferGoal)})\n• Upcoming Bills: ${fmt(billsDue)}\n• Safe to Spend: ${fmt(safeToSpend)}/day for ${horizon} days\n• Health Status: ${state.financials.statusMessage}`;
  }

  // You Want vs You Need comparison queries
  if (qLower.includes('want') || qLower.includes('need') || qLower.includes('compare') || qLower.includes('classification') || qLower.includes('essential')) {
    const nw = state.analytics.needsVsWants;
    if (nw) {
      return `Here is your Needs vs Wants comparison breakdown:\n• 🛡️ You Need (Essential): ${fmt(nw.totalNeeds)} (${nw.needsPct}% of spending across ${nw.needsCount} entries)\n• ✨ You Want (Discretionary): ${fmt(nw.totalWants)} (${nw.wantsPct}% of spending across ${nw.wantsCount} entries)\n\n${nw.comparisonAdvice}\n💡 Potential Action: Trimming 30% of your wants would save ~${fmt(nw.potentialSavings)}, adding +${fmt(Math.round(nw.potentialSavings / Math.max(1, state.financials.horizon)))}/day to your daily safe-to-spend!`;
    }
  }

  // Default calm response
  return `You currently have ${fmt(balance)} in total balance, with ${fmt(buffer)} safely tucked in your buffer and ${fmt(billsDue)} reserved for upcoming bills. That leaves you with ${fmt(usable)} usable cash, or **${fmt(safeToSpend)} safe to spend per day** for the next ${horizon} days. How else can I help you plan?`;
}

// 10. Sample data reset & clear all
app.post('/api/reset-sample', (req, res) => {
  try {
    seedDatabase(true);
    const state = calculateState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clear-all', (req, res) => {
  try {
    db.exec('DELETE FROM transactions;');
    db.exec('DELETE FROM bills;');
    db.exec('DELETE FROM chat_history;');
    setSetting('nextDay', null);
    const state = calculateState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Export & Import data backup
app.get('/api/export', (req, res) => {
  try {
    const transactions = db.prepare('SELECT * FROM transactions').all();
    const bills = db.prepare('SELECT * FROM bills').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    res.setHeader('Content-Disposition', 'attachment; filename=trace-backup.json');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      transactions,
      bills
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const { settings, transactions, bills } = req.body;
    if (!Array.isArray(transactions) || !Array.isArray(bills)) {
      return res.status(400).json({ success: false, error: 'Invalid backup file format' });
    }

    db.exec('DELETE FROM transactions;');
    db.exec('DELETE FROM bills;');

    if (Array.isArray(settings)) {
      const setStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      for (const s of settings) setStmt.run(s.key, s.value);
    }

    const insTx = db.prepare(`
      INSERT INTO transactions (id, type, title, amount, category, date_offset, saved_buffer, receipt_image, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of transactions) {
      insTx.run(t.id, t.type, t.title, t.amount, t.category, t.date_offset, t.saved_buffer || 0, t.receipt_image || null, t.notes || null, t.created_at || new Date().toISOString());
    }

    const insBill = db.prepare(`
      INSERT INTO bills (id, name, amount, due_offset, paid, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const b of bills) {
      insBill.run(b.id, b.name, b.amount, b.due_offset, b.paid ? 1 : 0, b.paid_at || null, b.created_at || new Date().toISOString());
    }

    const state = calculateState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Page Application route fallback for any unhandled GET route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening when not in a serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`TRACE Money Manager backend is running at http://localhost:${PORT}`);
  });
}

// Export for serverless environments (Vercel, AWS Lambda)
module.exports = app;
