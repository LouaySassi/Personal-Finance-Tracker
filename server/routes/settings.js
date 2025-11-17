const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    
    if (settings) {
      res.json({
        defaultSalary: settings.default_salary
      });
    } else {
      res.json({ defaultSalary: 1300 });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.post('/', (req, res) => {
  try {
    const { defaultSalary } = req.body;

    db.prepare(`
      INSERT INTO settings (id, default_salary, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) 
      DO UPDATE SET default_salary = ?, updated_at = CURRENT_TIMESTAMP
    `).run(defaultSalary, defaultSalary);

    res.json({ success: true, defaultSalary });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;