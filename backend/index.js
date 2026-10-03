const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 1. IMPORT GEMINI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Expose the uploads folder so React can view the receipt images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up the PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// Test the Database Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL successfully!');
    release();
  }
});

// Configure Cloudinary storage for receipt images
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'magkano_receipts', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
  },
});
const upload = multer({ storage: storage });

// ==========================================
// AI CHATBOT ROUTE
// ==========================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Fetch live financial context from your database to make the AI smart!
    const settingsRes = await pool.query('SELECT base_balance FROM settings LIMIT 1');
    const baseBalance = settingsRes.rows.length > 0 ? settingsRes.rows[0].base_balance : 0;

    // Give the AI its personality and context
    const systemPrompt = `You are an expert, concise financial assistant embedded in a wealth tracking dashboard. 
    The user's current raw base liquidity is PHP ${baseBalance}. 
    Keep your answers short, professional, and friendly. Do not use markdown headers, just plain text or simple bullet points.`;

    const prompt = `${systemPrompt}\n\nUser Message: ${message}`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    res.json({ reply: aiResponse });

  } catch (err) {
    console.error("AI Generation Error:", err);
    res.status(500).json({ error: "Failed to process AI request. Check terminal logs." });
  }
});


// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // TODO: generate OTP, send via email/SMS, store it, etc.
    const otp = Math.floor(100000 + Math.random() * 900000); // simple 6-digit code

    // placeholder response - replace with your actual sending logic
    console.log(`Generated OTP for ${email}: ${otp}`);
    res.json({ message: 'OTP sent', otp });   // remove OTP from response in prod
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});


// ==========================================
// API ROUTES (Transactions)
// ==========================================

// 1. UPDATE ENDPOINT: Save Transaction WITH Receipt
app.post('/expenses', upload.single('receipt'), async (req, res) => {
  try {
    const { description, amount, category, date, isRecurring, notes, paymentMethod } = req.body;
    const receipt_url = req.file ? req.file.path : null; // Cloudinary returns the full URL in req.file.path
    const newExpense = await pool.query(
      "INSERT INTO transactions (description, amount, category, date, isRecurring, notes, receipt_url, paymentMethod) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [description, amount, category, date, isRecurring === 'true', notes, receipt_url, paymentMethod]
    );
    res.json(newExpense.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 2. GET ALL EXPENSES (GET)
app.get('/expenses', async (req, res) => {
  try {
    const allExpenses = await pool.query("SELECT * FROM transactions ORDER BY date DESC");
    res.json(allExpenses.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 3. UPDATE EXPENSE (PUT) - Patched to include isPaused
app.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category, date, isRecurring, notes, paymentMethod, isPaused } = req.body;

    // COALESCE ensures we only update the provided fields without breaking existing data
    const updateQuery = await pool.query(
      `UPDATE transactions 
       SET description = COALESCE($1, description), 
           amount = COALESCE($2, amount), 
           category = COALESCE($3, category), 
           date = COALESCE($4, date), 
           isRecurring = COALESCE($5, isRecurring), 
           notes = COALESCE($6, notes), 
           paymentMethod = COALESCE($7, paymentMethod),
           isPaused = COALESCE($8, isPaused)
       WHERE id = $9 RETURNING *`,
      [description, amount, category, date, isRecurring, notes, paymentMethod, isPaused, id]
    );

    if (updateQuery.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(updateQuery.rows[0]);
  } catch (err) {
    console.error("Error updating transaction:", err.message);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// SETTINGS ROUTES (For Base Balance)
// ==========================================

// 4. GET CURRENT SETTINGS (GET)
app.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Settings not found" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// 5. UPDATE SETTINGS (PUT) - Overwrite Base Balance
app.put('/settings', async (req, res) => {
  try {
    const { base_balance } = req.body;

    const result = await pool.query(
      'UPDATE settings SET base_balance = $1 WHERE id = 1 RETURNING *',
      [base_balance]
    );

    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO settings (id, base_balance) VALUES (1, $1) RETURNING *',
        [base_balance]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in /settings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// 6. ADD FUNDS TO SETTINGS (PUT) - Add to Base Balance
app.put('/settings/add', async (req, res) => {
  try {
    const { add_amount } = req.body;

    const result = await pool.query(
      'UPDATE settings SET base_balance = base_balance + $1 WHERE id = 1 RETURNING *',
      [add_amount]
    );

    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO settings (id, base_balance) VALUES (1, $1) RETURNING *',
        [add_amount]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in /settings/add:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================================
// GOALS ROUTES
// ==========================================

// GET: Fetch all goals
app.get('/goals', async (req, res) => {
  try {
    const allGoals = await pool.query("SELECT * FROM goals ORDER BY target_date ASC");
    res.json(allGoals.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST: Create a new goal
app.post('/goals', async (req, res) => {
  try {
    const { title, target_amount, target_date } = req.body;
    const newGoal = await pool.query(
      "INSERT INTO goals (title, target_amount, target_date) VALUES ($1, $2, $3) RETURNING *",
      [title, target_amount, target_date]
    );
    res.json(newGoal.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// PUT (Full Update): Required for "Adjust Timeline" and overriding saved amounts
app.put('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, target_amount, target_date, saved_amount } = req.body;

    const updatedGoal = await pool.query(
      "UPDATE goals SET title = $1, target_amount = $2, target_date = $3, saved_amount = $4 WHERE id = $5 RETURNING *",
      [title, target_amount, target_date, saved_amount, id]
    );

    if (updatedGoal.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(updatedGoal.rows[0]);
  } catch (err) {
    console.error("Error updating goal fully:", err.message);
    res.status(500).send("Server Error");
  }
});

// PUT (Incremental): Add money to an existing goal
app.put('/goals/:id/add', async (req, res) => {
  try {
    const { id } = req.params;

    // Flexible extraction handles both "amount" and "add_amount"
    const amountToAdd = req.body.amount || req.body.add_amount;

    if (!amountToAdd || isNaN(amountToAdd)) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const updatedGoal = await pool.query(
      "UPDATE goals SET saved_amount = saved_amount + $1 WHERE id = $2 RETURNING *",
      [amountToAdd, id]
    );

    if (updatedGoal.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(updatedGoal.rows[0]);
  } catch (err) {
    console.error("Error adding to goal:", err.message);
    res.status(500).send("Server Error");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server has started on http://localhost:${PORT}`);
});