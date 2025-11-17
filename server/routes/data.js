const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get all months data
router.get('/months', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM monthly_data ORDER BY month_key DESC').all();
    
    const allMonthsData = {};
    rows.forEach(row => {
      allMonthsData[row.month_key] = JSON.parse(row.data);
    });

    res.json(allMonthsData);
  } catch (error) {
    console.error('Error fetching months:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get specific month data
router.get('/months/:monthKey', (req, res) => {
  try {
    const { monthKey } = req.params;
    const row = db.prepare('SELECT data FROM monthly_data WHERE month_key = ?').get(monthKey);
    
    if (row) {
      res.json(JSON.parse(row.data));
    } else {
      res.status(404).json({ error: 'Month not found' });
    }
  } catch (error) {
    console.error('Error fetching month:', error);
    res.status(500).json({ error: 'Failed to fetch month data' });
  }
});

// Save/Update month data
router.post('/months/:monthKey', (req, res) => {
  try {
    const { monthKey } = req.params;
    const monthData = req.body;

    const stmt = db.prepare(`
      INSERT INTO monthly_data (month_key, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(month_key) 
      DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP
    `);

    const dataString = JSON.stringify(monthData);
    stmt.run(monthKey, dataString, dataString);

    res.json({ success: true, monthKey });
  } catch (error) {
    console.error('Error saving month:', error);
    res.status(500).json({ error: 'Failed to save month data' });
  }
});

// Save all months data (bulk update)
router.post('/months', (req, res) => {
  try {
    const allMonthsData = req.body;

    const stmt = db.prepare(`
      INSERT INTO monthly_data (month_key, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(month_key) 
      DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = db.transaction((monthsData) => {
      for (const [monthKey, data] of Object.entries(monthsData)) {
        const dataString = JSON.stringify(data);
        stmt.run(monthKey, dataString, dataString);
      }
    });

    transaction(allMonthsData);

    res.json({ success: true, count: Object.keys(allMonthsData).length });
  } catch (error) {
    console.error('Error saving all months:', error);
    res.status(500).json({ error: 'Failed to save all months data' });
  }
});

// Delete month data
router.delete('/months/:monthKey', (req, res) => {
  try {
    const { monthKey } = req.params;
    db.prepare('DELETE FROM monthly_data WHERE month_key = ?').run(monthKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting month:', error);
    res.status(500).json({ error: 'Failed to delete month' });
  }
});

module.exports = router;