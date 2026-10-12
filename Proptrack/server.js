// PropTrack Server Entry Point
const app = require('./backend/server.js');
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PropTrack server running on port ${PORT}`);
    console.log(`- Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`- GIS Corridor API:  http://localhost:${PORT}/api/corridor`);
    console.log(`- Spatial Heatmap:   http://localhost:${PORT}/api/heatmap`);
    console.log(`- Property Assets:   http://localhost:${PORT}/api/properties`);
  });
}

module.exports = app;
