/**
 * PropTrack Outlook Heatmap Model
 * Geographically aligned spatial scoring engine & Leaflet overlay layer.
 */

import { FALLBACK_WEIGHTS } from './data.js';

// Haversine distance formula (km)
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Spatial Scoring Engine for Sangli-Miraj-Kupwad
 */
export class OutlookHeatmapEngine {
  constructor(projects, weights = FALLBACK_WEIGHTS) {
    this.projects = projects;
    this.weights = weights;
    this.cells = [];
    this.heatPoints = [];
    this.minCertainty = 0.2;
    this.maxYear = 2036;
  }

  setCalibration(minCertainty, maxYear) {
    this.minCertainty = minCertainty;
    this.maxYear = maxYear;
    this.recompute();
  }

  recompute() {
    const { types, stages, modelConfig } = this.weights;
    const { baseYear, bounds, grid, categoryCapRatio } = modelConfig;
    const { cols, rows } = grid;

    const latStep = (bounds.maxLat - bounds.minLat) / rows;
    const lngStep = (bounds.maxLng - bounds.minLng) / cols;

    this.cells = [];
    this.heatPoints = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const lat = bounds.maxLat - (j + 0.5) * latStep;
        const lng = bounds.minLng + (i + 0.5) * lngStep;

        const cellBounds = [
          [bounds.maxLat - j * latStep, bounds.minLng + i * lngStep],
          [bounds.maxLat - j * latStep, bounds.minLng + (i + 1) * lngStep],
          [bounds.maxLat - (j + 1) * latStep, bounds.minLng + (i + 1) * lngStep],
          [bounds.maxLat - (j + 1) * latStep, bounds.minLng + i * lngStep]
        ];

        const catTotals = {};
        const contributors = [];

        for (const proj of this.projects) {
          const cert = proj.stageCertainty ?? stages[proj.stage] ?? 0.2;
          if (cert < this.minCertainty || proj.expectedYear > this.maxYear) continue;

          const dist = haversineKm(lat, lng, proj.coordinates[0], proj.coordinates[1]);
          const ty = types[proj.type] || { w: 0.7, d0: 2.0 };

          // AHP Rule-based Model: Impact = W(type) * exp(-d / d0) * C(stage) * T(year)
          const timing = Math.exp(-Math.max(0, proj.expectedYear - baseYear) / 10);
          const decay = Math.exp(-dist / ty.d0);
          const impact = ty.w * decay * cert * timing;

          contributors.push({
            name: proj.name,
            type: proj.type,
            stage: proj.stage,
            year: proj.expectedYear,
            distanceKm: dist,
            impact: impact
          });

          catTotals[proj.type] = (catTotals[proj.type] || 0) + impact;
        }

        let raw = 0;
        for (const k in catTotals) {
          const cap = (types[k]?.w || 0.7) * (categoryCapRatio || 0.6);
          raw += Math.min(catTotals[k], cap);
        }

        this.cells.push({
          idx: j * cols + i,
          row: j,
          col: i,
          lat,
          lng,
          bounds: cellBounds,
          raw,
          contributors
        });
      }
    }

    // Percentile rank calculation
    const sorted = this.cells.map(c => c.raw).sort((a, b) => a - b);
    const count = sorted.length;

    this.cells.forEach(c => {
      if (c.raw <= 0.0001) {
        c.score = 5;
      } else {
        const rank = sorted.filter(v => v < c.raw).length;
        c.score = Math.max(5, Math.min(100, Math.round(100 * rank / (count - 1))));
      }
      this.heatPoints.push([c.lat, c.lng, c.score / 100]);
    });

    return { cells: this.cells, heatPoints: this.heatPoints };
  }
}

/**
 * Leaflet Outlook Heatmap Visual Layer Controller
 */
export class OutlookHeatmapLayer {
  constructor(map, engine) {
    this.map = map;
    this.engine = engine;
    this.visible = true;
    this.opacity = 0.70;
    this.canvasLayer = null;
    this.gridInteractionGroup = L.layerGroup();
    this.selectedCellCallback = null;

    this.palette = [
      { t: 0.0, r: 14, g: 165, b: 233 },  // #0ea5e9 Sky Blue
      { t: 0.35, r: 16, g: 185, b: 129 }, // #10b981 Growth Emerald
      { t: 0.70, r: 234, g: 179, b: 8 },  // #eab308 Amber Yellow
      { t: 1.0, r: 239, g: 68, b: 68 }    // #ef4444 Crimson Red
    ];

    this._ensurePanes();
    this._initCanvas();
    this._buildInteractiveGrid();
    this._bindEvents();
  }

  _ensurePanes() {
    if (!this.map.getPane('heatmapPane')) {
      const pane = this.map.createPane('heatmapPane');
      pane.style.zIndex = '350';
      pane.style.mixBlendMode = 'multiply';
      pane.style.pointerEvents = 'none';
      pane.style.opacity = this.opacity;
    }
    if (!this.map.getPane('labelsPane')) {
      const pane = this.map.createPane('labelsPane');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }
  }

  _initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'leaflet-heatmap-layer';
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    const pane = this.map.getPane('heatmapPane');
    pane.appendChild(this.canvas);
    this._updateCanvasSize();
    this.draw();
  }

  _updateCanvasSize() {
    const size = this.map.getSize();
    this.canvas.width = size.x;
    this.canvas.height = size.y;
    const topLeft = this.map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
  }

  _interpolateColor(t) {
    t = Math.max(0, Math.min(1, t));
    let c1 = this.palette[0], c2 = this.palette[this.palette.length - 1];
    for (let i = 0; i < this.palette.length - 1; i++) {
      if (t >= this.palette[i].t && t <= this.palette[i + 1].t) {
        c1 = this.palette[i];
        c2 = this.palette[i + 1];
        break;
      }
    }
    const range = c2.t - c1.t || 1;
    const ratio = (t - c1.t) / range;
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }

  draw() {
    if (!this.visible || !this.ctx) {
      if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const size = this.map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);

    const zoom = this.map.getZoom();
    // Sensible radius scaling with zoom level
    const baseRadius = 26;
    const radius = Math.max(14, Math.round(baseRadius * Math.pow(1.35, zoom - 12)));
    const blur = Math.max(10, Math.round(radius * 0.8));

    // Off-screen canvas for smooth gradient particle compositing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size.x;
    tempCanvas.height = size.y;
    const tempCtx = tempCanvas.getContext('2d');

    const points = this.engine.heatPoints;
    for (const [lat, lng, val] of points) {
      const pt = this.map.latLngToContainerPoint([lat, lng]);
      if (pt.x < -radius || pt.x > size.x + radius || pt.y < -radius || pt.y > size.y + radius) {
        continue;
      }

      const grad = tempCtx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius + blur);
      const color = this._interpolateColor(val);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color.replace('0.85', '0.45'));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      tempCtx.fillStyle = grad;
      tempCtx.beginPath();
      tempCtx.arc(pt.x, pt.y, radius + blur, 0, Math.PI * 2);
      tempCtx.fill();
    }

    this.ctx.drawImage(tempCanvas, 0, 0);
  }

  _buildInteractiveGrid() {
    this.gridInteractionGroup.clearLayers();
    if (!this.visible) return;

    this.engine.cells.forEach(cell => {
      const polygon = L.polygon(cell.bounds, {
        stroke: false,
        fillColor: 'transparent',
        fillOpacity: 0.01,
        className: 'heatmap-grid-cell'
      });

      const topContributor = cell.contributors.length ? cell.contributors[0] : null;
      const tooltipContent = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:140px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Outlook Score</span>
            <span style="font-size:12px; font-weight:900; color:#10b981;">★ ${cell.score}/100</span>
          </div>
          <div style="font-size:10px; color:#cbd5e1; margin-top:2px;">
            (${cell.lat.toFixed(3)}, ${cell.lng.toFixed(3)})
          </div>
          ${topContributor ? `
            <div style="font-size:10px; color:#60a5fa; margin-top:4px; font-weight:600; border-top:1px solid rgba(255,255,255,0.1); pt-1;">
              Catalyst: ${topContributor.name} (${topContributor.distanceKm.toFixed(1)} km)
            </div>
          ` : ''}
        </div>
      `;

      polygon.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'heatmap-inspect-tooltip',
        opacity: 0.95
      });

      polygon.on('click', () => {
        if (this.selectedCellCallback) {
          this.selectedCellCallback(cell);
        }
      });

      polygon.addTo(this.gridInteractionGroup);
    });

    if (this.visible && !this.map.hasLayer(this.gridInteractionGroup)) {
      this.gridInteractionGroup.addTo(this.map);
    }
  }

  _bindEvents() {
    this.map.on('moveend zoomend', () => {
      this._updateCanvasSize();
      this.draw();
    });
    this.map.on('resize', () => {
      this._updateCanvasSize();
      this.draw();
    });
  }

  toggle(on) {
    this.visible = on !== undefined ? on : !this.visible;
    const pane = this.map.getPane('heatmapPane');
    if (pane) {
      pane.style.display = this.visible ? 'block' : 'none';
    }
    if (this.visible) {
      if (!this.map.hasLayer(this.gridInteractionGroup)) {
        this.gridInteractionGroup.addTo(this.map);
      }
      this.draw();
    } else {
      if (this.map.hasLayer(this.gridInteractionGroup)) {
        this.map.removeLayer(this.gridInteractionGroup);
      }
    }
  }

  setOpacity(val) {
    this.opacity = Math.max(0, Math.min(1, val));
    const pane = this.map.getPane('heatmapPane');
    if (pane) {
      pane.style.opacity = this.opacity;
    }
  }

  refresh() {
    this._updateCanvasSize();
    this.draw();
    this._buildInteractiveGrid();
  }

  onSelectCell(cb) {
    this.selectedCellCallback = cb;
  }
}
