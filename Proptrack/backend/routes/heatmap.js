const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '..', 'data', 'projects.json');
const weightsPath = path.join(__dirname, '..', 'data', 'weights.json');

// Haversine distance in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute Development Outlook Scores across the Sangli corridor grid
function computeOutlookGrid(projects, config, minCertainty = 0.2, maxYear = 2036) {
  const { types, stages, modelConfig } = config;
  const { baseYear, bounds, grid } = modelConfig;
  const { cols, rows } = grid;

  const latStep = (bounds.maxLat - bounds.minLat) / rows;
  const lngStep = (bounds.maxLng - bounds.minLng) / cols;

  const cells = [];
  const heatPoints = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Cell center latitude and longitude
      // Note: row 0 is top (North), row rows-1 is bottom (South)
      const lat = bounds.maxLat - (j + 0.5) * latStep;
      const lng = bounds.minLng + (i + 0.5) * lngStep;

      // Cell bounding box for polygons
      const cellBounds = [
        [bounds.maxLat - j * latStep, bounds.minLng + i * lngStep],
        [bounds.maxLat - j * latStep, bounds.minLng + (i + 1) * lngStep],
        [bounds.maxLat - (j + 1) * latStep, bounds.minLng + (i + 1) * lngStep],
        [bounds.maxLat - (j + 1) * latStep, bounds.minLng + i * lngStep]
      ];

      const categoryImpacts = {};
      const contributors = [];

      for (const proj of projects) {
        const stageCert = proj.stageCertainty ?? stages[proj.stage] ?? 0.2;
        if (stageCert < minCertainty || proj.expectedYear > maxYear) continue;

        const distKm = haversineKm(lat, lng, proj.coordinates[0], proj.coordinates[1]);
        const typeConfig = types[proj.type] || { w: 0.7, d0: 2.0 };

        // Formula: Impact = W(type) * exp(-d / d0) * C(stage) * T(year)
        // T(year) = exp(-max(0, year - baseYear) / 10)
        const timingFactor = Math.exp(-Math.max(0, proj.expectedYear - baseYear) / 10);
        const distanceDecay = Math.exp(-distKm / typeConfig.d0);
        const impact = typeConfig.w * distanceDecay * stageCert * timingFactor;

        contributors.push({
          id: proj.id,
          name: proj.name,
          type: proj.type,
          distanceKm: distKm,
          impactValue: impact,
          stage: proj.stage,
          expectedYear: proj.expectedYear
        });

        categoryImpacts[proj.type] = (categoryImpacts[proj.type] || 0) + impact;
      }

      // Sum category impacts with capping to prevent single-project dominance
      let rawScore = 0;
      for (const cat in categoryImpacts) {
        const typeW = types[cat]?.w || 0.7;
        const cap = typeW * (modelConfig.categoryCapRatio || 0.6);
        rawScore += Math.min(categoryImpacts[cat], cap);
      }

      cells.push({
        index: j * cols + i,
        row: j,
        col: i,
        center: [lat, lng],
        bounds: cellBounds,
        rawScore,
        contributors
      });
    }
  }

  // Convert raw scores to percentile ranks (0 - 100)
  const sortedRaws = cells.map(c => c.rawScore).sort((a, b) => a - b);
  const total = sortedRaws.length;

  cells.forEach(c => {
    if (c.rawScore <= 0.0001) {
      c.score = 5;
    } else {
      const rank = sortedRaws.filter(v => v < c.rawScore).length;
      c.score = Math.max(5, Math.min(100, Math.round(100 * rank / (total - 1))));
    }

    // Heat point format: [lat, lng, normalizedIntensity]
    heatPoints.push([c.center[0], c.center[1], c.score / 100]);
  });

  return { cells, heatPoints };
}

// GET /api/heatmap - Retrieve calculated heatmap model and projects
router.get('/', (req, res) => {
  try {
    const minCertainty = parseFloat(req.query.minCertainty) || 0.2;
    const maxYear = parseInt(req.query.maxYear, 10) || 2036;

    const projectsRaw = fs.readFileSync(projectsPath, 'utf-8');
    const weightsRaw = fs.readFileSync(weightsPath, 'utf-8');

    const projects = JSON.parse(projectsRaw);
    const weights = JSON.parse(weightsRaw);

    const { cells, heatPoints } = computeOutlookGrid(projects, weights, minCertainty, maxYear);

    res.json({
      success: true,
      parameters: { minCertainty, maxYear },
      modelConfig: weights.modelConfig,
      projects,
      weights: weights.types,
      heatPoints,
      cells
    });
  } catch (err) {
    console.error('Heatmap calculation error:', err);
    res.status(500).json({ success: false, error: 'Failed to compute heatmap' });
  }
});

// GET /api/heatmap/projects - Retrieve tracked infrastructure projects
router.get('/projects', (req, res) => {
  try {
    const projectsRaw = fs.readFileSync(projectsPath, 'utf-8');
    res.json({ success: true, data: JSON.parse(projectsRaw) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve projects' });
  }
});

module.exports = router;
