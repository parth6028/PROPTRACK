# PropTrack — Development-Linked Property Outlook & GIS Platform

> **Walchand College of Engineering, Sangli** | Department of Computer Science & Engineering  
> Mini Project (2026–27) | Team: Parth Nerkar, Navjot Singh, Rakshit Gawde  
> Guides: Dr. A. R. Surve (HOD), Mrs. A. M. Chimanna (Lab Coordinator)  
> Aligned with **UN SDG 9** (Industry, Innovation & Infrastructure) & **SDG 11** (Sustainable Cities & Communities)

---

## 📌 Project Overview

Property decisions are traditionally driven by current market prices and locality reputation, while the future impact of planned infrastructure remains difficult to quantify. **PropTrack** bridges this gap by introducing an objective, explainable, rule-based **Development Outlook Score (0–100)** piloted on the **Sangli-Miraj-Kupwad** urban agglomeration.

### Proposed Mathematical Methodology
$$\text{Impact} = W(\text{type}) \times e^{-d / d_0} \times C(\text{stage}) \times T(\text{year})$$

- **$W(\text{type})$ (Type Weight):** Calibrated via Analytic Hierarchy Process (AHP) with urban planning benchmarks (e.g., Highway $0.9$, Rail $0.8$, Industrial $0.8$, IT Park $0.7$, Ring Road $0.7$, Bridge $0.6$).
- **$e^{-d / d_0}$ (Distance Decay):** Haversine distance $d$ (in km) calculated between coordinate points and verified infrastructure vector nodes, decaying with type-specific reach $d_0$.
- **$C(\text{stage})$ (Status Certainty):** Discount factor reflecting project delivery risk (Proposed $0.2$, Approved $0.4$, Funded $0.7$, Under Construction $0.9$, Commissioned $1.0$).
- **$T(\text{year})$ (Timing Factor):** Temporal discounting giving higher weight to near-term execution: $e^{-\max(0, \text{year} - 2026)/10}$.
- **Category Capping & Percentile Rank:** Category sum is capped ($\min(\text{sum}, W \times 0.6)$) to prevent single-project dominance, and normalized to a city-wide percentile rank ($0–100$).
- **Land-Type Awareness:** In compliance with the Maharashtra Tenancy and Agricultural Lands Act (MTAL Act s.63), agricultural vs. non-agricultural (NA) legal eligibility flags are presented alongside the outlook score.

---

## 🗺️ Key Features & GIS Heatmap Architecture

1. **Unified Real GIS Heatmap Layer:**
   - The Development Outlook Heatmap Model renders directly on top of the real Leaflet GIS map.
   - Built on a dedicated custom Leaflet pane (`heatmapPane`, `z-index: 350`) utilizing soft blending (`mix-blend-mode: multiply`) so roads, streets, and terrain remain readable beneath the heat layer.
   - City and road labels are rendered on an elevated pane (`labelsPane`, `z-index: 450`) ensuring labels float cleanly above the heatmap.
   - Heat radius and blur dynamically scale with zoom level.

2. **Live Layer & Opacity Controls:**
   - **Outlook Heatmap On/Off Switch:** Instantly toggles the heatmap layer on and off with zero page reloads and no map re-centering.
   - **Opacity Slider (0–100%, default 70%):** Dynamically adjusts the layer opacity in real-time, accompanied by a live percentage badge.
   - **Model Calibration:** Stage certainty threshold and horizon year sliders trigger live recalculations across the spatial grid.
   - **Interactive Cell Inspection:** Click or hover anywhere on the GIS map to view the exact Development Outlook score and a breakdown of nearby contributing projects.

3. **Curated Corridor Listings:**
   - Physical scout-verified properties in Sangli City Core, Kupwad Industrial Corridor, Miraj Transit Junction, and Madhavnagar.
   - Side-by-side asset comparison modal benchmarking up to 3 properties.
   - 10-year valuation trajectory forecasts rendered with Chart.js.

4. **Scenario Simulator & Ground Scouts Feed:**
   - Interactive infrastructure tender simulator computing 5-year capital alpha.
   - Live field audit dispatch stream and audit verification form.

---

## 📂 Project Directory Structure

```text
Proptrack/
├── index.html                  # Clean, semantic HTML5 markup (no inline styles or scripts)
├── package.json               # Node.js project manifest & scripts
├── .env.example               # Template for environment configuration
├── README.md                  # Complete project documentation and guide
│
├── css/                       # Modular CSS stylesheets
│   ├── base.css               # Design tokens, variables (--growth, --infra), fonts, reset
│   ├── layout.css             # Navigation, containers, modal backdrops, drawers
│   ├── components.css         # Buttons, badges, form inputs, sliders, skeleton states
│   └── corridor-map.css       # Leaflet custom panes, heatmap blending, floating panels, legend
│
├── js/                        # ES Modules
│   ├── data.js                # Data loader with API fetch & local offline fallback
│   ├── heatmap.js             # Mathematical scoring engine & Leaflet canvas overlay layer
│   ├── map.js                 # Leaflet GIS engine, tile providers, custom panes, markers
│   ├── controls.js            # Filters, presets, property cards, modals, compare drawer
│   └── main.js                # ES module application entry point
│
├── assets/                    # Vector graphics and branding
│   ├── favicon.svg            # Site favicon
│   └── logo.svg               # Vector brand logo
│
└── backend/                   # Lightweight Node.js + Express backend
    ├── server.js              # Express app serving static files and REST API
    ├── routes/                # Express API route handlers
    │   ├── corridor.js        # /api/corridor (corridor zones and boundaries)
    │   ├── heatmap.js         # /api/heatmap (scoring computation & projects)
    │   └── properties.js      # /api/properties (listings & scout audit feed)
    └── data/                  # Canonical JSON datasets
        ├── corridors.json     # Sangli corridor zones
        ├── projects.json      # Official infrastructure registry
        ├── properties.json    # Curated real estate listings
        └── weights.json       # AHP weights and spatial model parameters
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (bundled with Node.js)

### 1. Installation
Clone or navigate into the project directory and install backend dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Default parameters in `.env`:
```env
PORT=3000
CARTO_API_KEY=cb1_4dtc_1_c5bf7f80978daa13032863b0
```

### 3. Launching the Application
Start the unified Express server:
```bash
npm start
```
Or for local development:
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

> **Note on Static Hosting:** The frontend is also completely standalone. If opened via static web servers (such as `python3 -m http.server 8000` or GitHub Pages), `js/data.js` gracefully falls back to built-in datasets without requiring the Node.js server.

---

## 📡 REST API Documentation

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/corridor` | Returns all corridor zones, centroids, and bounding polygons | None |
| `GET` | `/api/corridor/:id` | Returns specific corridor zone details | None |
| `GET` | `/api/heatmap` | Computes & returns spatial score cells and heat points | `minCertainty` (float), `maxYear` (int) |
| `GET` | `/api/heatmap/projects` | Returns verified infrastructure project registry | None |
| `GET` | `/api/properties` | Returns property listings matching criteria | `zone`, `type`, `maxPrice`, `minScore`, `verified`, `q` |
| `GET` | `/api/properties/:id` | Returns single property detail and valuation trajectory | None |
| `POST` | `/api/properties/scout-report`| Submits physical field audit observation from scouts | JSON Body: `{ propertyId, scoutName, notes }` |
| `GET` | `/api/health` | Health check endpoint returning system status | None |

---

## ⚖️ License & Credits
Developed as part of the Final Year / Mini Project at **Walchand College of Engineering, Sangli**, Department of Computer Science & Engineering. All rights reserved.
