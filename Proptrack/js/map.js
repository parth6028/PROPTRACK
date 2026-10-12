/**
 * PropTrack Leaflet GIS Map Engine
 * Manages tiles, custom panes, zone polygons, infrastructure lines, and property pins.
 */

const CARTO_API_KEY = "cb1_4dtc_1_c5bf7f80978daa13032863b0";

export class GisMapEngine {
  constructor(containerId = "lmap") {
    this.containerId = containerId;
    this.map = null;
    this.tiles = {};
    this.zonePolygons = {};
    this.propertyMarkers = new Map();
    this.overlayGroups = {};
    this.isSatellite = false;
    this.activeZone = null;
    this.onSelectProperty = null;
    this.onSelectZone = null;
  }

  init() {
    this.map = L.map(this.containerId, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false
    }).setView([16.845, 74.600], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>').addTo(this.map);

    this.map.on("focus", () => this.map.scrollWheelZoom.enable());
    this.map.on("blur", () => this.map.scrollWheelZoom.disable());

    // 1. Clean Muted Base Tile Layer (No labels, in standard tilePane z-index 200)
    this.tiles.streetBase = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
      {
        maxZoom: 19,
        subdomains: 'abcd'
      }
    ).addTo(this.map);

    // 2. Labels Tile Layer (Attached to labelsPane z-index 450 to float ABOVE the heatmap)
    if (!this.map.getPane('labelsPane')) {
      const pane = this.map.createPane('labelsPane');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    this.tiles.labels = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
      {
        maxZoom: 19,
        subdomains: 'abcd',
        pane: 'labelsPane'
      }
    ).addTo(this.map);

    // 3. Satellite Tile Layer (Esri World Imagery)
    this.tiles.sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19
      }
    );

    return this.map;
  }

  renderZones(zones) {
    zones.forEach(z => {
      const polygon = L.polygon(z.bounds, {
        color: "#059669",
        weight: 2.5,
        dashArray: "4 6",
        fillColor: "#10b981",
        fillOpacity: 0.08
      }).addTo(this.map);

      polygon.bindTooltip(
        `<b>${z.name}</b><br><span style="color:#059669; font-weight:700">Growth Score: ${z.score}</span>`,
        { sticky: true }
      );

      polygon.on("click", () => {
        if (this.onSelectZone) this.onSelectZone(z);
      });

      this.zonePolygons[z.id] = polygon;

      // Zone Centroid Label
      L.marker(z.center, {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: `
            <div style="transform:translate(-50%, -50%); background:rgba(255,255,255,0.95); backdrop-filter:blur(6px); border:1px solid #e2e8f0; border-radius:14px; padding:4px 10px; font-family:'Plus Jakarta Sans',sans-serif; text-align:center; box-shadow:0 4px 14px rgba(15,23,42,0.1);">
              <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.04em">${z.name}</div>
              <div style="font-size:14px; font-weight:900; color:#059669">${z.score} <span style="font-size:9px; color:#64748b">SCORE</span></div>
            </div>
          `,
          iconSize: [0, 0]
        })
      }).addTo(this.map);
    });
  }

  renderInfrastructureOverlays() {
    this.overlayGroups = {
      metro: L.polyline([[16.853, 74.575], [16.840, 74.610], [16.826, 74.640]], {
        color: "#2563eb",
        weight: 5,
        dashArray: "10 8"
      }).addTo(this.map),

      hwy: L.polyline([[16.900, 74.550], [16.860, 74.600], [16.830, 74.665]], {
        color: "#d97706",
        weight: 5
      }).addTo(this.map),

      it: L.layerGroup([
        L.circle([16.883, 74.628], { radius: 600, color: "#059669", fillColor: "#10b981", fillOpacity: 0.35, weight: 2 }),
        L.circle([16.800, 74.560], { radius: 500, color: "#059669", fillColor: "#10b981", fillOpacity: 0.35, weight: 2 })
      ]).addTo(this.map)
    };
  }

  toggleOverlay(type) {
    const group = this.overlayGroups[type];
    if (!group || !this.map) return false;
    const has = this.map.hasLayer(group);
    has ? this.map.removeLayer(group) : group.addTo(this.map);
    return !has;
  }

  renderProperties(properties) {
    this.propertyMarkers.forEach(m => this.map.removeLayer(m));
    this.propertyMarkers.clear();

    properties.forEach(item => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div class="relative group cursor-pointer ${item.verified ? 'pulse-ring' : ''}" style="width:44px; height:44px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 8px 22px rgba(15,23,42,0.25); overflow:hidden; background:#0f172a">
            <img src="${item.image}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; bottom:0; inset-inline:0; background:rgba(15,23,42,0.85); text-align:center; font-size:9px; font-weight:800; color:#34d399; padding:1px 0;">${item.score}</div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24]
      });

      const fmtPrice = item.price >= 100 ? `₹${(item.price / 100).toFixed(2)} Cr` : `₹${item.price} L`;

      const popupHtml = `
        <div style="width:230px; font-family:'Plus Jakarta Sans',sans-serif;">
          <div style="height:110px; position:relative; overflow:hidden;">
            <img src="${item.image}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;">
            <span style="position:absolute; top:8px; right:8px; background:rgba(15,23,42,0.8); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px;">${item.type}</span>
          </div>
          <div style="padding:12px;">
            <div style="font-weight:800; font-size:13px; color:#0f172a; line-height:1.2">${item.title}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px">${item.specs}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <span style="font-weight:900; font-size:14px; color:#0f172a">${fmtPrice}</span>
              <span style="font-size:11px; font-weight:800; color:#059669; background:#d1fae5; padding:2px 6px; border-radius:6px">★ ${item.score}</span>
            </div>
            <button id="btn-inspect-${item.id}" style="width:100%; margin-top:10px; background:#0f172a; color:#fff; border:none; padding:8px 0; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
              Inspect Intelligence ↗
            </button>
          </div>
        </div>
      `;

      const marker = L.marker(item.coordinates, { icon }).bindPopup(popupHtml).addTo(this.map);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${item.id}`);
        if (btn && this.onSelectProperty) {
          btn.onclick = () => this.onSelectProperty(item);
        }
      });

      this.propertyMarkers.set(item.id, marker);
    });
  }

  syncFilteredProperties(filteredIds) {
    const idSet = new Set(filteredIds);
    this.propertyMarkers.forEach((marker, id) => {
      if (idSet.has(id)) {
        if (!this.map.hasLayer(marker)) marker.addTo(this.map);
      } else {
        if (this.map.hasLayer(marker)) this.map.removeLayer(marker);
      }
    });
  }

  highlightZone(zoneId) {
    for (const id in this.zonePolygons) {
      const isSelected = id === zoneId;
      this.zonePolygons[id].setStyle({
        color: "#059669",
        weight: isSelected ? 3.5 : 2.5,
        dashArray: isSelected ? null : "4 6",
        fillOpacity: isSelected ? 0.22 : 0.08
      });
    }
  }

  flyToProperty(propertyId) {
    const marker = this.propertyMarkers.get(propertyId);
    if (marker) {
      const latlng = marker.getLatLng();
      this.map.flyTo(latlng, 14, { duration: 1.2 });
      setTimeout(() => marker.openPopup(), 1200);
    }
  }

  resetView() {
    this.map.setView([16.845, 74.600], 12, { animate: true });
  }

  fitCorridorBounds(bounds) {
    if (bounds) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      this.map.fitBounds([
        [16.780, 74.520],
        [16.915, 74.695]
      ], { padding: [20, 20] });
    }
  }

  toggleSatellite() {
    this.isSatellite = !this.isSatellite;
    if (this.isSatellite) {
      this.map.removeLayer(this.tiles.streetBase);
      this.tiles.sat.addTo(this.map);
    } else {
      this.map.removeLayer(this.tiles.sat);
      this.tiles.streetBase.addTo(this.map);
    }
    return this.isSatellite;
  }

  invalidateSize() {
    if (this.map) this.map.invalidateSize();
  }
}
