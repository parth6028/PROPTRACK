/**
 * PropTrack Data Module
 * Provides asynchronous API fetching with seamless static fallbacks.
 */

export const FALLBACK_CORRIDORS = [
  {
    id: "core",
    name: "Sangli City Core",
    score: 88,
    apr: 34.2,
    center: [16.855, 74.580],
    bounds: [
      [16.872, 74.5558],
      [16.8737, 74.602],
      [16.838, 74.6031],
      [16.83715, 74.558]
    ],
    catalysts: [
      "Central Rail Terminal Modernisation – 65% complete",
      "Krishna Riverfront Promenade Widening – Expected Q3 2027",
      "Smart Underground Grid Phase II – 30%"
    ]
  },
  {
    id: "kupwad",
    name: "Kupwad Industrial Corridor",
    score: 71,
    apr: 24.5,
    center: [16.885, 74.625],
    bounds: [
      [16.900, 74.603],
      [16.9015, 74.645],
      [16.870, 74.646],
      [16.86925, 74.605]
    ],
    catalysts: [
      "MIDC Heavy Commercial Arterial Upgrade – 50% complete",
      "Outer Ring Road Express Link – Expected 2028"
    ]
  },
  {
    id: "miraj",
    name: "Miraj Transit Junction",
    score: 79,
    apr: 29.8,
    center: [16.825, 74.645],
    bounds: [
      [16.842, 74.623],
      [16.8437, 74.665],
      [16.808, 74.666],
      [16.80715, 74.625]
    ],
    catalysts: [
      "Multi-Modal Rail Hub Expansion – 80% complete",
      "Bypass Expressway Spur Connection – Expected Q1 2028"
    ]
  },
  {
    id: "madhav",
    name: "Madhavnagar Freight Zone",
    score: 54,
    apr: 15.1,
    center: [16.795, 74.560],
    bounds: [
      [16.810, 74.538],
      [16.8115, 74.580],
      [16.780, 74.581],
      [16.77925, 74.540]
    ],
    catalysts: [
      "Dedicated Freight Corridor Siding – 40% complete",
      "State Logistics & Cold Storage Hub – Planning stage"
    ]
  }
];

export const FALLBACK_PROJECTS = [
  {
    id: "proj-rail-miraj",
    name: "Pune-Miraj-Londa Rail Doubling (Miraj Junction Upgrade)",
    type: "rail",
    coordinates: [16.828, 74.642],
    gridX: 10.5,
    gridY: 7.0,
    stage: "completed",
    stageCertainty: 1.0,
    expectedYear: 2024,
    cost: "Central Railway commissioned",
    source: "Central Railway, Feb 2024",
    impactDescription: "Multi-modal passenger & freight throughput elevation"
  },
  {
    id: "proj-hwy-borgaon",
    name: "NH-166 Sangli-Borgaon 4-Laning (Bypass Expressway)",
    type: "highway",
    coordinates: [16.812, 74.562],
    gridX: 4.0,
    gridY: 8.5,
    stage: "construction",
    stageCertainty: 0.9,
    expectedYear: 2027,
    cost: "₹1,102 Cr",
    source: "NHAI / Dilip Buildcon notices",
    impactDescription: "41.4 km high-speed arterial corridor connecting to national freight network"
  },
  {
    id: "proj-hwy-kolhapur",
    name: "NH-166 Kolhapur-Sangli 4-Laning (Ankali End)",
    type: "highway",
    coordinates: [16.832, 74.545],
    gridX: 4.5,
    gridY: 6.8,
    stage: "approved",
    stageCertainty: 0.4,
    expectedYear: 2029,
    cost: "₹759 Cr",
    source: "NHAI tender 2026_NHAI_267662_1",
    impactDescription: "33.6 km economic link connecting Sangli to Western Maharashtra manufacturing hub"
  },
  {
    id: "proj-midc-kupwad",
    name: "Sangli-Miraj Kupwad MIDC Phase II Expansion",
    type: "industrial",
    coordinates: [16.885, 74.628],
    gridX: 9.5,
    gridY: 2.0,
    stage: "approved",
    stageCertainty: 0.4,
    expectedYear: 2028,
    cost: "166 ha industrial anchor",
    source: "SMMMA / MIDC notices",
    impactDescription: "Expanded engineering, casting, and cold storage logistics warehousing"
  },
  {
    id: "proj-bridge-krishna",
    name: "New Krishna River Arterial Bridge & Promenade",
    type: "bridge",
    coordinates: [16.835, 74.586],
    gridX: 6.5,
    gridY: 6.5,
    stage: "funded",
    stageCertainty: 0.7,
    expectedYear: 2028,
    cost: "₹185 Cr",
    source: "Maharashtra PWD Gazette",
    impactDescription: "Decongests Old Sangli-Haripur bottleneck with multi-lane vehicular deck"
  },
  {
    id: "proj-ring-outer",
    name: "Sangli-Miraj-Kupwad Outer Ring Road Link",
    type: "ring",
    coordinates: [16.855, 74.665],
    gridX: 13.0,
    gridY: 5.0,
    stage: "proposed",
    stageCertainty: 0.2,
    expectedYear: 2032,
    cost: "₹420 Cr (est.)",
    source: "MSRDC Comprehensive Mobility Plan",
    impactDescription: "Peripheral ring distributing heavy multi-axle freight away from city core"
  },
  {
    id: "proj-it-park",
    name: "Sangli Infotech & Innovation IT Park",
    type: "it",
    coordinates: [16.874, 74.605],
    gridX: 7.5,
    gridY: 3.0,
    stage: "proposed",
    stageCertainty: 0.2,
    expectedYear: 2031,
    cost: "₹310 Cr",
    source: "MIDC Tech Hub Proposal",
    impactDescription: "Plug-and-play Grade-A commercial office space for engineering & IT services"
  },
  {
    id: "proj-exp-shaktipeeth",
    name: "Shaktipeeth Expressway Interchange (Khanapur / Sangli Spur)",
    type: "highway",
    coordinates: [16.810, 74.690],
    gridX: 15.5,
    gridY: 9.0,
    stage: "funded",
    stageCertainty: 0.7,
    expectedYear: 2030,
    cost: "MSRDC Greenfield Expressway",
    source: "101Reporters / MSRDC alignment notices",
    impactDescription: "High-speed access to Goa-Nagpur Shaktipeeth economic growth corridor"
  }
];

export const FALLBACK_WEIGHTS = {
  types: {
    highway: { w: 0.9, d0: 2.5, label: "Highway / Expressway" },
    rail: { w: 0.8, d0: 2.0, label: "Rail Transit / Doubling" },
    industrial: { w: 0.8, d0: 2.5, label: "Industrial Zone / MIDC" },
    it: { w: 0.7, d0: 2.0, label: "IT Park / Commercial SEZ" },
    ring: { w: 0.7, d0: 2.5, label: "Ring Road Arterial" },
    bridge: { w: 0.6, d0: 1.5, label: "River Bridge / Confluence Deck" }
  },
  stages: {
    proposed: 0.2,
    approved: 0.4,
    funded: 0.7,
    construction: 0.9,
    completed: 1.0
  },
  modelConfig: {
    baseYear: 2026,
    decayFactor: 10,
    categoryCapRatio: 0.6,
    bounds: {
      minLat: 16.780,
      maxLat: 16.915,
      minLng: 74.520,
      maxLng: 74.695
    },
    grid: {
      cols: 24,
      rows: 16,
      cellKm: 0.7
    }
  }
};

export const FALLBACK_PROPERTIES = [
  {
    id: 1,
    title: "Skyline Apex Residences (3 BHK)",
    zone: "core",
    type: "Apartment",
    price: 320,
    score: 91,
    verified: 1,
    coordinates: [16.858, 74.585],
    gridX: 6.2,
    gridY: 5.1,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    specs: "3 BHK • 1,840 sq.ft • ₹17,390/sq.ft",
    landType: "Non-Agricultural (NA Urban)",
    legalEligibility: "Open to all purchasers (Title Deed Clear)",
    catalysts: [
      ["Central Railway Station", 0.8],
      ["Bypass Expressway", 2.1],
      ["Krishna Riverfront", 1.2]
    ],
    trajectory: [320, 410, 520, 740],
    notes: [
      "Road width: 24 m asphalt, newly resurfaced",
      "Water: 24x7 municipal pressure certified",
      "Noise: moderate (soundproof double-glazing installed)",
      "Site inspection: Tower B concrete superstructure at 70%"
    ]
  },
  {
    id: 2,
    title: "Market Yard Studio Offices",
    zone: "core",
    type: "Commercial",
    price: 540,
    score: 86,
    verified: 1,
    coordinates: [16.848, 74.595],
    gridX: 6.8,
    gridY: 5.3,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    specs: "Commercial • 3,200 sq.ft • Grade-A Office",
    landType: "Non-Agricultural (NA Commercial)",
    legalEligibility: "Open to all commercial entities (RERA Approved)",
    catalysts: [
      ["Central Railway Station", 0.5],
      ["Main Market Commercial Ring", 0.3]
    ],
    trajectory: [540, 690, 880, 1250],
    notes: [
      "Road width: 30 m four-lane boulevard",
      "Power: Dual-grid 33kV substation feeder",
      "Noise: high daytime commercial footfall",
      "Legal: 100% municipal title deeds verified"
    ]
  },
  {
    id: 3,
    title: "Greenfield Palms Villa (4 BHK)",
    zone: "kupwad",
    type: "Villa",
    price: 410,
    score: 72,
    verified: 1,
    coordinates: [16.888, 74.615],
    gridX: 9.3,
    gridY: 3.2,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    specs: "4 BHK Villa • 3,100 sq.ft • Private Garden",
    landType: "Non-Agricultural (NA Residential)",
    legalEligibility: "Open to all buyers (Collector Sanctioned NA)",
    catalysts: [
      ["Outer Ring Road Express Link", 1.6],
      ["MIDC Arterial Connector", 3.4]
    ],
    trajectory: [410, 480, 580, 780],
    notes: [
      "Road width: 12 m internal paved road",
      "Water: dual borewell + municipal connection verified",
      "Noise: quiet residential green belt",
      "Perimeter: gated compound wall complete"
    ]
  },
  {
    id: 4,
    title: "Transit Junction Suites",
    zone: "miraj",
    type: "Apartment",
    price: 280,
    score: 80,
    verified: 1,
    coordinates: [16.822, 74.652],
    gridX: 10.4,
    gridY: 7.1,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    specs: "2.5 BHK • 1,420 sq.ft • Transit Oriented",
    landType: "Non-Agricultural (NA Urban)",
    legalEligibility: "Open to all purchasers (Miraj Municipal Town Planning)",
    catalysts: [
      ["Miraj Multi-Modal Junction", 1.1],
      ["Bypass Link Connector", 0.7]
    ],
    trajectory: [280, 350, 440, 610],
    notes: [
      "Road width: 18 m arterial road access",
      "Water: underground reservoir complete",
      "Noise: low acoustic dampening",
      "Structure: ground + 12 floors sanctioned"
    ]
  },
  {
    id: 5,
    title: "Kupwad Residential Development Plot",
    zone: "kupwad",
    type: "Plot",
    price: 95,
    score: 63,
    verified: 0,
    coordinates: [16.878, 74.635],
    gridX: 9.5,
    gridY: 2.1,
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
    specs: "Residential Plot • 2,400 sq.ft • NA Sanctioned",
    landType: "NA Sanctioned Plot (Ex-Agricultural)",
    legalEligibility: "Section 63 MTAL Clearance Complete; Ready for Construction",
    catalysts: [
      ["Outer Ring Road Express Link", 2.4]
    ],
    trajectory: [95, 110, 135, 190],
    notes: [
      "Status: Physical scout inspection pending",
      "Access road partially unpaved (gravel layer)",
      "Boundary demarcation stones logged by survey"
    ]
  },
  {
    id: 6,
    title: "Madhavnagar Freight Logistics Yard",
    zone: "madhav",
    type: "Commercial",
    price: 180,
    score: 52,
    verified: 0,
    coordinates: [16.797, 74.553],
    gridX: 4.2,
    gridY: 8.2,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    specs: "Industrial / Commercial • 12,000 sq.ft Plot",
    landType: "Agricultural (Industrial Conversion Eligible)",
    legalEligibility: "Subject to MTAL Act s.63 Agricultural Purchaser Rules / Industrial Conversion Gate",
    catalysts: [
      ["Dedicated Freight Corridor", 3.8],
      ["State Logistics Hub", 4.5]
    ],
    trajectory: [180, 195, 220, 275],
    notes: [
      "Status: Awaiting second round scout verification",
      "Heavy axle truck transit on main road",
      "Zoning certificate under municipal review"
    ]
  }
];

/**
 * Fetch Corridors data with fallback
 */
export async function fetchCorridors() {
  try {
    const res = await fetch('/api/corridor');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.info('Using local corridors dataset');
    return FALLBACK_CORRIDORS;
  }
}

/**
 * Fetch Properties data with fallback
 */
export async function fetchProperties(filters = {}) {
  try {
    const params = new URLSearchParams(filters);
    const res = await fetch(`/api/properties?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.info('Using local properties dataset');
    return FALLBACK_PROPERTIES;
  }
}

/**
 * Fetch Projects data with fallback
 */
export async function fetchProjects() {
  try {
    const res = await fetch('/api/heatmap/projects');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.info('Using local projects dataset');
    return FALLBACK_PROJECTS;
  }
}

/**
 * Fetch Heatmap Grid and points
 */
export async function fetchHeatmapData(minCertainty = 0.2, maxYear = 2036) {
  try {
    const res = await fetch(`/api/heatmap?minCertainty=${minCertainty}&maxYear=${maxYear}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.info('Computing heatmap model locally');
    return null; // Will trigger client-side computation in heatmap.js
  }
}

/**
 * Submit field scout audit
 */
export async function submitScoutAudit(data) {
  try {
    const res = await fetch('/api/properties/scout-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Return mock success for local offline experience
    return {
      success: true,
      data: {
        id: Date.now(),
        scout: data.scoutName || 'Field Scout',
        note: data.notes,
        time: 'Just Now',
        zone: 'Sangli Cluster'
      }
    };
  }
}
