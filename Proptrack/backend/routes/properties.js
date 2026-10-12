const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const propertiesPath = path.join(__dirname, '..', 'data', 'properties.json');

// In-memory scout feed logs for live audit stream
const scoutFeed = [
  { id: 1, scout: "Scout #104", note: "Verified Miraj Junction rail terminal foundation piling at 65%", time: "1 hour ago", zone: "Miraj" },
  { id: 2, scout: "Scout #087", note: "Confirmed 24 m asphalt road tarring on Skyline Apex frontage", time: "3 hours ago", zone: "Sangli Core" },
  { id: 3, scout: "Scout #212", note: "Flagged unpaved gravel access road near Kupwad MIDC Plot 14", time: "7 hours ago", zone: "Kupwad" },
  { id: 4, scout: "Scout #033", note: "Municipal legal title clearances certified for Market Yard studio", time: "1 day ago", zone: "Sangli Core" },
  { id: 5, scout: "Scout #156", note: "Logged Bypass Expressway 4-lane resurfacing at 80% completion", time: "2 days ago", zone: "Highway Bypass" }
];

// Helper to read properties safely
function getProperties() {
  const raw = fs.readFileSync(propertiesPath, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/properties - Filterable properties list
router.get('/', (req, res) => {
  try {
    let properties = getProperties();
    const { zone, type, maxPrice, minScore, verified, q } = req.query;

    if (zone) {
      properties = properties.filter(p => p.zone === zone);
    }
    if (type) {
      properties = properties.filter(p => p.type === type);
    }
    if (maxPrice) {
      const priceCap = parseFloat(maxPrice);
      if (!isNaN(priceCap)) properties = properties.filter(p => p.price <= priceCap);
    }
    if (minScore) {
      const scoreMin = parseFloat(minScore);
      if (!isNaN(scoreMin)) properties = properties.filter(p => p.score >= scoreMin);
    }
    if (verified === '1' || verified === 'true') {
      properties = properties.filter(p => p.verified === 1);
    }
    if (q) {
      const query = q.toLowerCase().trim();
      properties = properties.filter(p =>
        (p.title + ' ' + p.zone + ' ' + p.type + ' ' + p.specs).toLowerCase().includes(query)
      );
    }

    res.json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ success: false, error: 'Failed to load properties' });
  }
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  try {
    const properties = getProperties();
    const prop = properties.find(p => p.id === parseInt(req.params.id, 10));
    if (!prop) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: prop });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve property' });
  }
});

// GET /api/properties/scout-feed
router.get('/meta/scout-feed', (req, res) => {
  res.json({ success: true, data: scoutFeed });
});

// POST /api/properties/scout-report - Submit field inspection audit
router.post('/scout-report', (req, res) => {
  try {
    const { propertyId, scoutName, notes } = req.body;
    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, error: 'Audit notes are required' });
    }

    const properties = getProperties();
    const prop = properties.find(p => p.id === parseInt(propertyId, 10));
    const targetTitle = prop ? prop.title : 'Corridor General';
    const zoneName = prop ? prop.zone : 'Sangli Cluster';

    const newEntry = {
      id: Date.now(),
      scout: (scoutName && scoutName.trim()) || `Scout #${Math.floor(100 + Math.random() * 900)}`,
      note: notes.trim(),
      time: 'Just Now',
      zone: zoneName,
      propertyTitle: targetTitle
    };

    scoutFeed.unshift(newEntry);

    res.status(201).json({
      success: true,
      message: 'Field audit logged and verified',
      data: newEntry
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to submit scout audit' });
  }
});

module.exports = router;
