/**
 * PropTrack Main Application Controller (ES Module)
 * Orchestrates data loading, Leaflet GIS map, Outlook Heatmap overlay layer, and controls.
 */

import { fetchCorridors, fetchProjects, fetchProperties, submitScoutAudit } from './data.js';
import { GisMapEngine } from './map.js';
import { OutlookHeatmapEngine, OutlookHeatmapLayer } from './heatmap.js';
import { ControlsManager } from './controls.js';

let gisMap = null;
let heatmapEngine = null;
let heatmapLayer = null;
let controlsManager = null;

async function bootstrap() {
  try {
    // 1. Fetch initial datasets (asynchronous with local fallback)
    const [zones, projects, properties] = await Promise.all([
      fetchCorridors(),
      fetchProjects(),
      fetchProperties()
    ]);

    // 2. Initialize Leaflet GIS Map Engine
    gisMap = new GisMapEngine('lmap');
    const leafletMapInstance = gisMap.init();

    // 3. Render Zone Polygons and Infrastructure Corridors
    gisMap.renderZones(zones);
    gisMap.renderInfrastructureOverlays();
    gisMap.renderProperties(properties);

    // 4. Initialize Outlook Heatmap Engine & Overlay Layer directly on the GIS Map
    heatmapEngine = new OutlookHeatmapEngine(projects);
    heatmapEngine.recompute();

    heatmapLayer = new OutlookHeatmapLayer(leafletMapInstance, heatmapEngine);

    // 5. Initialize Controls Manager
    controlsManager = new ControlsManager({
      properties,
      zones,
      projects,
      onFlyToMap: (id) => {
        gisMap.flyToProperty(id);
        document.getElementById("mapwrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      onFilterChange: (filteredIds) => {
        gisMap.syncFilteredProperties(filteredIds);
      }
    });

    // Attach to window for inline button callbacks
    window.ptControls = controlsManager;

    // Connect Heatmap Cell click to cell inspection card
    heatmapLayer.onSelectCell((cell) => {
      controlsManager.showCellInspection(cell);
      const outCard = document.getElementById("out");
      if (outCard) {
        outCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      controlsManager.toast(`Inspecting (${cell.lat.toFixed(3)}, ${cell.lng.toFixed(3)}) Outlook Score`);
    });

    // 6. Bind Heatmap Controls (Toggle Switch & Opacity Slider)
    setupHeatmapControls();

    // 7. Bind Map Action Controls (Reset, Fit, Fullscreen, Satellite, Overlays)
    setupMapActionControls(zones);

    // 8. Populate Zone Dropdown & Bind Filters
    setupFilterBar(zones);

    // 9. Initial Render of Property Grid & First Zone Drawer
    controlsManager.renderPropertyList();
    if (zones.length) {
      controlsManager.openZoneDrawer(zones[0]);
      gisMap.highlightZone(zones[0].id);
    }

    // Connect Map Zone Selection to Zone Drawer
    gisMap.onSelectZone = (zone) => {
      gisMap.highlightZone(zone.id);
      controlsManager.openZoneDrawer(zone);
    };

    // Connect Property Pin Selection to Detail Modal
    gisMap.onSelectProperty = (prop) => {
      controlsManager.openDetailModal(prop.id);
    };

    // 10. Setup Growth Simulator & Scouts Feed
    setupSimulator();
    setupScoutsFeed(properties);

    // 11. Setup Global Tabs & Keyboard Accessibility
    setupNavigationTabs();
    setupKeyboardShortcuts();
    setupMapFloatingPanelToggle();

    // 12. Setup Auto-Layout Resize Listener for Map
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (gisMap) gisMap.invalidateSize();
      }, 150);
    });

  } catch (err) {
    console.error("PropTrack initialization error:", err);
  }
}

/**
 * Configure Outlook Heatmap Layer Toggle and Opacity Slider
 */
function setupHeatmapControls() {
  const toggleInput = document.getElementById("heatmapToggle");
  const opacityInput = document.getElementById("heatmapOpacity");
  const opacityValBadge = document.getElementById("opacityValBadge");
  const opacityGroup = document.getElementById("opacityControlGroup");

  // On/Off Switch
  if (toggleInput) {
    toggleInput.checked = true; // Default ON
    toggleInput.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      heatmapLayer.toggle(isChecked);
      if (opacityGroup) {
        opacityGroup.classList.toggle("disabled", !isChecked);
      }
      if (opacityInput) {
        opacityInput.disabled = !isChecked;
      }
      controlsManager.toast(isChecked ? "Outlook Heatmap overlay enabled" : "Outlook Heatmap overlay hidden");
    });
  }

  // Opacity Slider (0 - 100%, default 70%)
  if (opacityInput) {
    opacityInput.value = "70";
    if (opacityValBadge) opacityValBadge.textContent = "70%";

    opacityInput.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      const ratio = val / 100;
      heatmapLayer.setOpacity(ratio);
      if (opacityValBadge) opacityValBadge.textContent = `${val}%`;
    });
  }

  // Model Calibration Thresholds (Stage Certainty & Horizon Year)
  const stageSelect = document.getElementById("st");
  const yearSlider = document.getElementById("yr");
  const yearValBadge = document.getElementById("yv");

  function handleCalibrationChange() {
    const minC = parseFloat(stageSelect?.value || 0.2);
    const maxY = parseInt(yearSlider?.value || 2036, 10);
    if (yearValBadge) yearValBadge.textContent = maxY;

    heatmapEngine.setCalibration(minC, maxY);
    heatmapLayer.refresh();
  }

  stageSelect?.addEventListener("change", handleCalibrationChange);
  yearSlider?.addEventListener("input", handleCalibrationChange);
}

/**
 * Configure Map Toolbar & Utility Controls
 */
function setupMapActionControls(zones) {
  // Reset Center
  document.getElementById("btnResetCenter")?.addEventListener("click", () => {
    gisMap.resetView();
    controlsManager.toast("Map centered on Sangli-Miraj cluster");
  });

  // Fit Corridor Bounds
  document.getElementById("btnFitCorridor")?.addEventListener("click", () => {
    gisMap.fitCorridorBounds();
    controlsManager.toast("Fit viewport to Sangli corridor boundary");
  });

  // Fullscreen Toggle
  const fsBtn = document.getElementById("btnFullscreen");
  const mapContainer = document.getElementById("gisMapContainer");
  if (fsBtn && mapContainer) {
    fsBtn.addEventListener("click", () => {
      const isFs = mapContainer.classList.toggle("map-fullscreen");
      fsBtn.innerHTML = isFs ? "<span>✕</span> Exit Fullscreen" : "<span>⛶</span> Fullscreen";
      setTimeout(() => gisMap.invalidateSize(), 150);
    });
  }

  // Satellite Toggle
  const satBtn = document.getElementById("vs");
  if (satBtn) {
    satBtn.addEventListener("click", () => {
      const isSat = gisMap.toggleSatellite();
      satBtn.innerHTML = isSat ? `<span>🗺</span> Street View` : `<span>🛰</span> Satellite View`;
      controlsManager.toast(isSat ? "Switched to High-Res Satellite Imagery" : "Switched to Minimal CARTO Street Basemap");
    });
  }

  // Infrastructure Overlay Buttons
  document.querySelectorAll(".lg").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.o;
      const isVisible = gisMap.toggleOverlay(type);
      btn.style.opacity = isVisible ? "1" : "0.5";
    });
  });
}

/**
 * Configure Filter Bar & Search Inputs
 */
function setupFilterBar(zones) {
  const fz = document.getElementById("fz");
  if (fz) {
    fz.innerHTML = '<option value="">All Corridors & Zones</option>' + zones.map(z => `<option value="${z.id}">${z.name}</option>`).join("");
  }

  ["fz", "ft", "fp", "fs", "so"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => controlsManager.renderPropertyList());
  });

  document.getElementById("q")?.addEventListener("input", () => controlsManager.renderPropertyList());

  document.getElementById("go")?.addEventListener("click", () => {
    controlsManager.renderPropertyList();
    document.getElementById("lh")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("fv")?.addEventListener("click", () => {
    controlsManager.favOnly = !controlsManager.favOnly;
    controlsManager.renderPropertyList();
  });

  document.getElementById("vo")?.addEventListener("click", () => {
    controlsManager.verifiedOnly = !controlsManager.verifiedOnly;
    controlsManager.renderPropertyList();
  });

  document.getElementById("cl")?.addEventListener("click", () => {
    controlsManager.setPreset('all');
    const q = document.getElementById("q");
    if (q) q.value = "";
    const so = document.getElementById("so");
    if (so) so.value = "s";
  });

  document.getElementById("btnGrid")?.addEventListener("click", () => controlsManager.setLayoutMode('grid'));
  document.getElementById("btnList")?.addEventListener("click", () => controlsManager.setLayoutMode('list'));

  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => controlsManager.setPreset(btn.dataset.preset));
  });

  // Compare Drawer Action
  document.getElementById("openCompareBtn")?.addEventListener("click", () => controlsManager.openCompareModal());
  document.getElementById("clearCompareBtn")?.addEventListener("click", () => {
    controlsManager.compared.clear();
    controlsManager.updateCompareBar();
    controlsManager.renderPropertyList();
  });
}

/**
 * Setup Simulator Logic
 */
function setupSimulator() {
  const catalysts = [
    ["Miraj Junction Rail Modernisation", 25],
    ["Sangli Highway Bypass Expansion", 18],
    ["Kupwad MIDC Industrial Corridor", 20],
    ["Krishna River Bridge Widening", 15],
    ["Outer Ring Road Expressway", 10]
  ];

  const checksContainer = document.getElementById("checks");
  if (checksContainer) {
    checksContainer.innerHTML = catalysts.map((a, i) => `
      <label class="flex items-center gap-3.5 bg-slate-50 hover:bg-slate-100 p-3.5 rounded-2xl border border-slate-100 cursor-pointer select-none transition">
        <input type="checkbox" data-i="${i}" class="w-4 h-4 accent-slate-950 cursor-pointer">
        <span class="flex-1 font-semibold text-slate-800 text-xs">${a[0]}</span>
        <b class="text-emerald-600 font-extrabold text-xs">+${a[1]} pts</b>
      </label>
    `).join("");
  }

  function runSim() {
    let score = 12;
    document.querySelectorAll("#checks input:checked").forEach(cb => {
      score += catalysts[parseInt(cb.dataset.i, 10)][1];
    });
    score = Math.min(100, score);

    const ss = document.getElementById("ss");
    const sb = document.getElementById("sb");
    const sbo = document.getElementById("sbo");
    const amv = document.getElementById("amv");
    const netGain = document.getElementById("netGain");
    const tierBadge = document.getElementById("scoreTier");

    if (ss) ss.textContent = score;
    if (sb) {
      sb.style.width = score + "%";
      sb.style.background = score >= 85 ? "#10b981" : score >= 65 ? "#3b82f6" : "#d97706";
    }

    if (tierBadge) {
      if (score >= 85) {
        tierBadge.textContent = "High Alpha Grade";
        tierBadge.className = "tag-badge bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold";
      } else if (score >= 65) {
        tierBadge.textContent = "Moderate Catalyst";
        tierBadge.className = "tag-badge bg-blue-50 text-blue-800 border border-blue-200 font-bold";
      } else {
        tierBadge.textContent = "Early Speculation";
        tierBadge.className = "tag-badge bg-amber-50 text-amber-800 border border-amber-200 font-medium";
      }
    }

    const boost = (score * 0.42).toFixed(1);
    if (sbo) sbo.textContent = "+" + boost + "%";

    const amtInput = document.getElementById("amt");
    const amtVal = parseFloat(amtInput?.value) || 0;
    const futureVal = amtVal * (1 + score * 0.0042);
    if (amv) amv.textContent = controlsManager.formatPrice(Math.round(futureVal * 10) / 10);
    const profit = Math.round((futureVal - amtVal) * 10) / 10;
    if (netGain) netGain.textContent = "+" + controlsManager.formatPrice(profit);
  }

  document.querySelectorAll("#checks input").forEach(c => c.addEventListener("change", runSim));
  document.getElementById("amt")?.addEventListener("input", runSim);
  runSim();
}

/**
 * Setup Ground Scouts Reliability Gauges & Form
 */
function setupScoutsFeed(properties) {
  const met = document.getElementById("met");
  if (met) {
    met.innerHTML = [
      ["Boundary & Land Demarcation Authenticity", 94],
      ["Structural Construction Milestone Progress", 81],
      ["Actual Access Road Paved Width", 76],
      ["Title Deeds & Municipal DP Clearances", 88]
    ].map(a => `
      <div>
        <div class="flex justify-between mb-1.5 text-xs">
          <span class="font-semibold text-slate-700">${a[0]}</span>
          <b class="text-slate-900 font-extrabold">${a[1]}%</b>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width:${a[1]}%"></div>
        </div>
      </div>
    `).join("");
  }

  const sp = document.getElementById("sp");
  if (sp) {
    sp.innerHTML = properties.map(x => `<option value="${x.id}">${x.title}</option>`).join("");
  }

  const subBtn = document.getElementById("sub");
  subBtn?.addEventListener("click", async () => {
    const sn = document.getElementById("sn");
    const sname = document.getElementById("sname");
    const notes = sn?.value.trim();

    if (!notes) {
      controlsManager.toast("Please enter field audit observations");
      return;
    }

    const propId = sp ? sp.value : properties[0]?.id;
    const scoutName = sname?.value.trim();

    const result = await submitScoutAudit({
      propertyId: propId,
      scoutName,
      notes
    });

    const feed = document.getElementById("feed");
    if (feed && result.data) {
      const entry = result.data;
      feed.insertAdjacentHTML("afterbegin", `
        <div class="flex gap-3.5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 fade-in">
          <span class="w-9 h-9 shrink-0 rounded-xl bg-slate-950 text-emerald-400 grid place-items-center text-sm font-bold shadow-sm">✓</span>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <b class="text-slate-900 font-extrabold text-xs">${entry.scout}</b>
              <span class="text-[11px] text-emerald-600 font-bold">Just Now</span>
            </div>
            <div class="text-xs font-semibold text-slate-700 mt-0.5">${entry.propertyTitle || 'Corridor Asset'}</div>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">${entry.note}</p>
          </div>
        </div>
      `);
    }

    if (sn) sn.value = "";
    controlsManager.toast("Field audit logged and verified");
  });

  const feed = document.getElementById("feed");
  if (feed) {
    feed.innerHTML = [
      ["Scout #104", "Verified Miraj Junction rail terminal foundation piling at 65%", "1 hour ago", "Miraj"],
      ["Scout #087", "Confirmed 24 m asphalt road tarring on Skyline Apex frontage", "3 hours ago", "Sangli Core"],
      ["Scout #212", "Flagged unpaved gravel access road near Kupwad MIDC Plot 14", "7 hours ago", "Kupwad"],
      ["Scout #033", "Municipal legal title clearances certified for Market Yard studio", "1 day ago", "Sangli Core"],
      ["Scout #156", "Logged Bypass Expressway 4-lane resurfacing at 80% completion", "2 days ago", "Highway Bypass"]
    ].map(a => `
      <div class="flex gap-3.5 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <span class="w-9 h-9 shrink-0 rounded-xl bg-slate-950 text-emerald-400 grid place-items-center text-sm font-bold shadow-sm">✓</span>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <b class="text-slate-900 font-extrabold text-xs">${a[0]}</b>
            <span class="text-[11px] text-slate-400 font-medium">${a[2]}</span>
          </div>
          <div class="text-xs font-semibold text-slate-700 mt-0.5">${a[3]}</div>
          <p class="text-xs text-slate-600 mt-1 leading-relaxed">${a[1]}</p>
        </div>
      </div>
    `).join("");
  }
}

/**
 * Configure Tab Navigation (Synchronized across Desktop and Mobile Bottom Bar)
 */
function setupNavigationTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.t;
      tabs.forEach(t => {
        const isAct = t.dataset.t === target;
        t.classList.toggle("act", isAct);
        t.setAttribute("aria-selected", isAct ? "true" : "false");
      });

      ["explore", "sim", "scouts"].forEach(id => {
        const panel = document.getElementById(id);
        if (panel) {
          panel.classList.toggle("hidden", id !== (target === "map" ? "explore" : target));
        }
      });

      if (target === "map") {
        document.getElementById("mapwrap")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => gisMap?.invalidateSize(), 150);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (target === "explore") {
          setTimeout(() => gisMap?.invalidateSize(), 150);
        }
      }
    });
  });
}

/**
 * Configure Floating Map Controls Collapse / Expand Toggle
 */
function setupMapFloatingPanelToggle() {
  const panel = document.getElementById("mapFloatingPanel");
  const toggleBtn = document.getElementById("btnPanelToggle");
  const titleToggle = document.getElementById("panelTitleToggle");
  const icon = document.getElementById("panelToggleIcon");

  const toggle = () => {
    if (!panel) return;
    const isCollapsed = panel.classList.toggle("collapsed");
    if (icon) icon.textContent = isCollapsed ? "▸" : "▾";
  };

  toggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  titleToggle?.addEventListener("click", () => {
    toggle();
  });

  // Default to collapsed on mobile screens under 640px to keep map canvas clear
  if (window.innerWidth < 640 && panel) {
    panel.classList.add("collapsed");
    if (icon) icon.textContent = "▸";
  }
}

/**
 * Setup Global Keyboard Accessibility
 */
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("modal")?.classList.add("hidden");
      const drawer = document.getElementById("drawer");
      const drawerM = document.getElementById("drawerM");
      drawer?.classList.add("hidden");
      drawerM?.classList.add("hidden");
    }
  });

  const modal = document.getElementById("modal");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  document.getElementById("mx")?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
}

// Start application upon DOM readiness
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
