const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbPath } = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/data', require('./routes/data'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: dbPath,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Finance Tracker Server Running!`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`💾 Database: ${dbPath}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;