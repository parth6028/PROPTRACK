const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const corridorsPath = path.join(__dirname, '..', 'data', 'corridors.json');

// GET /api/corridor - Retrieve all corridor zones
router.get('/', (req, res) => {
  try {
    const raw = fs.readFileSync(corridorsPath, 'utf-8');
    const corridors = JSON.parse(raw);
    res.json({
      success: true,
      count: corridors.length,
      data: corridors
    });
  } catch (err) {
    console.error('Error reading corridors data:', err);
    res.status(500).json({ success: false, error: 'Failed to load corridor data' });
  }
});

// GET /api/corridor/:id - Retrieve specific corridor zone
router.get('/:id', (req, res) => {
  try {
    const raw = fs.readFileSync(corridorsPath, 'utf-8');
    const corridors = JSON.parse(raw);
    const corridor = corridors.find(c => c.id === req.params.id);
    if (!corridor) {
      return res.status(404).json({ success: false, error: 'Corridor not found' });
    }
    res.json({ success: true, data: corridor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve corridor' });
  }
});

module.exports = router;
