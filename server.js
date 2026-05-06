require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes — load Vercel-style handlers
const summarizeHandler = require('./api/summarize');
const chatHandler = require('./api/chat');

app.all('/api/summarize', (req, res) => summarizeHandler(req, res));
app.all('/api/chat', (req, res) => chatHandler(req, res));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🧠 DocuMind AI Server running at http://localhost:${PORT}\n`);
});
