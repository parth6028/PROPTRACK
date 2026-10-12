require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const corridorRouter = require('./routes/corridor');
const heatmapRouter = require('./routes/heatmap');
const propertiesRouter = require('./routes/properties');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/corridor', corridorRouter);
app.use('/api/heatmap', heatmapRouter);
app.use('/api/properties', propertiesRouter);

// API Status / Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'PropTrack',
    version: '1.0.0',
    region: 'Sangli-Miraj-Kupwad',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static assets from project root
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA fallback to index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(rootDir, 'index.html'));
  }
  next();
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PropTrack server running on http://localhost:${PORT}`);
    console.log(`- GIS Corridor API:  http://localhost:${PORT}/api/corridor`);
    console.log(`- Spatial Heatmap:   http://localhost:${PORT}/api/heatmap`);
    console.log(`- Property Assets:   http://localhost:${PORT}/api/properties`);
  });
}

module.exports = app;
