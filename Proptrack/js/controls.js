/**
 * PropTrack Controls & UI Interaction Module
 * Handles filter presets, search, property rendering, modals, simulator, and scouts.
 */

export class ControlsManager {
  constructor(options = {}) {
    this.properties = options.properties || [];
    this.zones = options.zones || [];
    this.projects = options.projects || [];
    this.onFlyToMap = options.onFlyToMap || null;
    this.onFilterChange = options.onFilterChange || null;

    this.layoutMode = 'grid'; // 'grid' | 'list'
    this.favorites = new Set();
    this.compared = new Set();
    this.favOnly = false;
    this.verifiedOnly = false;
    this.activeChart = null;

    this._loadFavorites();
  }

  _loadFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("pt_fav_2") || "[]");
      stored.forEach(id => this.favorites.add(id));
    } catch (e) {
      console.warn("Could not read favorites from storage");
    }
  }

  _saveFavorites() {
    try {
      localStorage.setItem("pt_fav_2", JSON.stringify([...this.favorites]));
    } catch (e) {}
  }

  formatPrice(lakhs) {
    return lakhs >= 100 ? `₹${(lakhs / 100).toFixed(2)} Cr` : `₹${lakhs} L`;
  }

  getScoreBadgeClass(score) {
    if (score >= 85) return "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold";
    if (score >= 70) return "bg-blue-50 text-blue-800 border-blue-200 font-bold";
    return "bg-amber-50 text-amber-800 border-amber-200 font-medium";
  }

  getZone(zoneId) {
    return this.zones.find(z => z.id === zoneId) || { name: "Sangli Corridor" };
  }

  toast(msg) {
    const toastEl = document.getElementById("toast");
    const msgEl = document.getElementById("toastMsg");
    if (!toastEl || !msgEl) return;
    msgEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2600);
  }

  toggleFavorite(id) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      this.toast("Removed from watchlist");
    } else {
      this.favorites.add(id);
      this.toast("Saved to watchlist");
    }
    this._saveFavorites();
    this.renderPropertyList();
  }

  toggleCompare(id, checked) {
    if (checked) {
      if (this.compared.size >= 3) {
        this.toast("You can compare up to 3 listings simultaneously.");
        this.renderPropertyList();
        return;
      }
      this.compared.add(id);
    } else {
      this.compared.delete(id);
    }
    this.updateCompareBar();
  }

  updateCompareBar() {
    const bar = document.getElementById("cbar");
    const countEl = document.getElementById("cn");
    if (!bar || !countEl) return;
    bar.classList.toggle("hidden", this.compared.size === 0);
    countEl.textContent = this.compared.size;
  }

  setLayoutMode(mode) {
    this.layoutMode = mode;
    const btnGrid = document.getElementById("btnGrid");
    const btnList = document.getElementById("btnList");
    if (btnGrid && btnList) {
      btnGrid.classList.toggle("bg-white", mode === 'grid');
      btnGrid.classList.toggle("text-slate-950", mode === 'grid');
      btnGrid.classList.toggle("shadow-sm", mode === 'grid');
      btnGrid.classList.toggle("text-slate-500", mode !== 'grid');

      btnList.classList.toggle("bg-white", mode === 'list');
      btnList.classList.toggle("text-slate-950", mode === 'list');
      btnList.classList.toggle("shadow-sm", mode === 'list');
      btnList.classList.toggle("text-slate-500", mode !== 'list');
    }
    this.renderPropertyList();
  }

  setPreset(type) {
    const fz = document.getElementById("fz");
    const ft = document.getElementById("ft");
    const fp = document.getElementById("fp");
    const fs = document.getElementById("fs");

    if (type === 'all') {
      if (fz) fz.value = "";
      if (ft) ft.value = "";
      if (fp) fp.value = "9999";
      if (fs) fs.value = "0";
      this.favOnly = false;
      this.verifiedOnly = false;
    } else if (type === 'verified') {
      this.verifiedOnly = true;
      this.favOnly = false;
    } else if (type === 'highScore') {
      if (fs) fs.value = "75";
    } else if (type === 'budget150') {
      if (fp) fp.value = "150";
    }
    this.renderPropertyList();
  }

  getFilteredProperties() {
    const z = document.getElementById("fz")?.value || "";
    const t = document.getElementById("ft")?.value || "";
    const p = parseFloat(document.getElementById("fp")?.value) || 9999;
    const s = parseFloat(document.getElementById("fs")?.value) || 0;
    const q = document.getElementById("q")?.value.toLowerCase().trim() || "";
    const so = document.getElementById("so")?.value || "s";

    const filtered = this.properties.filter(item => {
      const matchZone = !z || item.zone === z;
      const matchType = !t || item.type === t;
      const matchPrice = item.price <= p;
      const matchScore = item.score >= s;
      const matchQuery = !q || (item.title + " " + this.getZone(item.zone).name + " " + item.type + " " + item.specs).toLowerCase().includes(q);
      const matchFav = !this.favOnly || this.favorites.has(item.id);
      const matchVer = !this.verifiedOnly || item.verified;
      return matchZone && matchType && matchPrice && matchScore && matchQuery && matchFav && matchVer;
    });

    filtered.sort((a, b) => {
      if (so === "pa") return a.price - b.price;
      if (so === "pd") return b.price - a.price;
      return b.score - a.score;
    });

    return filtered;
  }

  renderPropertyList() {
    const container = document.getElementById("grid");
    const cntEl = document.getElementById("cnt");
    const fvBtn = document.getElementById("fv");
    const voBtn = document.getElementById("vo");

    if (!container) return;

    const filtered = this.getFilteredProperties();

    if (this.onFilterChange) {
      this.onFilterChange(filtered.map(x => x.id));
    }

    if (cntEl) {
      cntEl.textContent = `Displaying ${filtered.length} of ${this.properties.length} verified corridor listings`;
    }
    if (fvBtn) {
      fvBtn.textContent = (this.favOnly ? "♥" : "♡") + ` Saved (${this.favorites.size})`;
      fvBtn.classList.toggle("bg-slate-950", this.favOnly);
      fvBtn.classList.toggle("text-white", this.favOnly);
    }
    if (voBtn) {
      voBtn.classList.toggle("bg-slate-950", this.verifiedOnly);
      voBtn.classList.toggle("text-white", this.verifiedOnly);
    }

    this.updateCompareBar();

    if (!filtered.length) {
      container.className = "grid col-span-full";
      container.innerHTML = `
        <div class="glass-card p-12 text-center col-span-full">
          <div class="w-14 h-14 rounded-full bg-slate-100 text-slate-400 grid place-items-center text-2xl mx-auto mb-3">⌕</div>
          <h4 class="text-lg font-bold text-slate-800">No properties match your current filters</h4>
          <p class="text-sm text-slate-500 mt-1">Try loosening your budget limit or resetting zone selections.</p>
          <button id="emptyResetBtn" class="mt-4 px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition">Reset All Filters</button>
        </div>
      `;
      document.getElementById("emptyResetBtn")?.addEventListener("click", () => this.setPreset('all'));
      return;
    }

    if (this.layoutMode === 'list') {
      container.className = "flex flex-col gap-3";
      container.innerHTML = filtered.map(x => {
        const gain5y = Math.round((x.trajectory[2] / x.trajectory[0] - 1) * 100);
        return `
          <div class="glass-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-slate-300">
            <div class="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <img src="${x.image}" alt="${x.title}" loading="lazy" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 class="font-bold text-sm sm:text-base text-slate-900 font-display truncate">${x.title}</h3>
                  <span class="tag-badge ${this.getScoreBadgeClass(x.score)} shrink-0 text-[10px] sm:text-xs">★ ${x.score}</span>
                  <span class="text-[11px] sm:text-xs text-slate-400 font-medium shrink-0">${this.getZone(x.zone).name}</span>
                </div>
                <div class="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>${x.specs}</span>
                  <span class="text-blue-600 font-bold truncate">🚆 ${x.catalysts[0][0]} (${x.catalysts[0][1]} km)</span>
                  <span class="${x.verified ? 'text-emerald-600 font-bold' : 'text-amber-600'}">${x.verified ? '✓ Verified' : '● Scheduled'}</span>
                  <span class="text-slate-400 font-semibold">• ${x.landType || 'NA'}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div class="text-left sm:text-right">
                <div class="text-base sm:text-lg font-black text-slate-950 font-display">${this.formatPrice(x.price)}</div>
                <div class="text-[10px] sm:text-[11px] font-bold text-emerald-600">+${gain5y}% 5Y</div>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="window.ptControls.flyToProperty(${x.id})" class="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition">GIS Pin</button>
                <button onclick="window.ptControls.openDetailModal(${x.id})" class="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm">Inspect</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
      return;
    }

    // Default luxury grid view (auto-layout 1 col on mobile, 2 col on tablet, 3 col on PC)
    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6";
    container.innerHTML = filtered.map(x => {
      const gain5y = Math.round((x.trajectory[2] / x.trajectory[0] - 1) * 100);
      const isFav = this.favorites.has(x.id);
      const isCmp = this.compared.has(x.id);

      return `
        <div class="glass-card overflow-hidden group flex flex-col justify-between">
          <div>
            <div class="h-52 relative overflow-hidden bg-slate-900">
              <img src="${x.image}" alt="${x.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              
              <div class="absolute top-3 left-3 flex items-center gap-1.5">
                <button onclick="window.ptControls.toggleFavorite(${x.id})" class="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-900 grid place-items-center text-sm shadow-md transition active:scale-90" title="Save to Favorites">
                  ${isFav ? '<span class="text-rose-600 font-bold">♥</span>' : '♡'}
                </button>
                <span class="tag-badge bg-white/95 text-slate-800 shadow-sm font-bold backdrop-blur-sm">${x.type}</span>
              </div>

              <div class="absolute top-3 right-3">
                <span class="tag-badge ${this.getScoreBadgeClass(x.score)} shadow-sm font-extrabold backdrop-blur-sm">
                  ★ Growth ${x.score}
                </span>
              </div>

              <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex items-center justify-between text-white text-xs">
                <span class="font-semibold text-slate-200">${x.specs}</span>
                <span class="font-bold text-emerald-400">+${gain5y}% 5Y</span>
              </div>
            </div>

            <div class="p-5">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-bold text-base text-slate-900 group-hover:text-blue-600 transition leading-snug font-display line-clamp-1">${x.title}</h3>
                <span class="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition">↗</span>
              </div>

              <div class="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${this.getZone(x.zone).name}
                <span class="text-slate-300">•</span>
                <span class="text-emerald-600 font-semibold text-[11px]">${x.landType || 'NA Plot'}</span>
              </div>

              <div class="mt-3 py-1.5 px-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <span class="text-[11px] font-semibold text-blue-900 truncate mr-2">🚆 ${x.catalysts[0][0]}</span>
                <b class="text-blue-600 shrink-0 font-bold">${x.catalysts[0][1]} km</b>
              </div>

              <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div>
                  <span class="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Valuation</span>
                  <div class="text-xl font-black text-slate-950 font-display">${this.formatPrice(x.price)}</div>
                </div>

                <div class="text-right">
                  <span class="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Scout Audit</span>
                  <span class="text-xs font-bold ${x.verified ? 'text-emerald-600' : 'text-amber-600'} flex items-center gap-1">
                    ${x.verified ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified' : '● Scheduled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 pt-0">
            <button onclick="window.ptControls.openDetailModal(${x.id})" class="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold tracking-wide transition shadow-sm active:scale-98">
              Inspect Growth Intelligence
            </button>

            <div class="flex items-center justify-between mt-3 text-xs text-slate-500">
              <label class="flex items-center gap-1.5 cursor-pointer font-medium select-none hover:text-slate-900 transition">
                <input type="checkbox" ${isCmp ? "checked" : ""} onchange="window.ptControls.toggleCompare(${x.id}, this.checked)" class="accent-slate-950 rounded">
                Compare
              </label>

              <button onclick="window.ptControls.flyToProperty(${x.id})" class="text-blue-600 hover:text-blue-800 font-bold underline transition">
                GIS Pin
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  flyToProperty(id) {
    if (this.onFlyToMap) this.onFlyToMap(id);
  }

  openDetailModal(id) {
    const item = this.properties.find(p => p.id === id);
    if (!item) return;

    const modal = document.getElementById("modal");
    const mb = document.getElementById("mb");
    if (!modal || !mb) return;

    modal.classList.remove("hidden");

    const gain5y = Math.round((item.trajectory[2] / item.trajectory[0] - 1) * 100);
    const isFav = this.favorites.has(item.id);

    mb.innerHTML = `
      <div class="h-40 sm:h-48 rounded-2xl overflow-hidden relative shadow-inner mb-5">
        <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4 sm:p-5">
          <div>
            <span class="tag-badge bg-white/95 text-slate-900 font-extrabold text-[10px] mb-1">${item.type} • ${this.getZone(item.zone).name}</span>
            <h3 class="text-xl sm:text-2xl font-black text-white font-display line-clamp-1">${item.title}</h3>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 sm:gap-2.5 mb-5">
        <div class="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-100 text-center">
          <span class="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asking Price</span>
          <span class="text-sm sm:text-lg font-black text-slate-950 font-display mt-0.5 block truncate">${this.formatPrice(item.price)}</span>
        </div>
        <div class="bg-emerald-50 p-2.5 sm:p-3 rounded-2xl border border-emerald-100 text-center">
          <span class="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Growth Score</span>
          <span class="text-sm sm:text-lg font-black text-emerald-700 font-display mt-0.5 block">${item.score} <span class="text-[10px] font-normal text-slate-500">/100</span></span>
        </div>
        <div class="bg-emerald-50 p-2.5 sm:p-3 rounded-2xl border border-emerald-100 text-center">
          <span class="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">5Y Gain</span>
          <span class="text-sm sm:text-lg font-black text-emerald-700 font-display mt-0.5 block">+${gain5y}%</span>
        </div>
      </div>

      <!-- Legal Land-Type Compliance Gate (Slide 6 Context) -->
      <div class="mb-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="font-extrabold uppercase tracking-wider text-slate-500 text-[10px]">Land Classification & MTAL Status</span>
          <span class="tag-badge ${item.landType?.includes('Agricultural') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}">
            ${item.landType || 'NA Urban'}
          </span>
        </div>
        <p class="text-xs text-slate-600 font-medium">
          ${item.legalEligibility || 'Verified compliant with Maharashtra Land Revenue & Town Planning clearances.'}
        </p>
      </div>

      <h4 class="text-xs font-extrabold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>🚆</span> Infrastructure Transit Proximity
      </h4>
      <div class="space-y-1.5 mb-5">
        ${item.catalysts.map(a => `
          <div class="flex justify-between items-center text-xs py-1.5 px-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <span class="text-slate-800 font-semibold truncate mr-2">${a[0]}</span>
            <b class="text-blue-600 font-extrabold shrink-0">${a[1]} km</b>
          </div>
        `).join("")}
      </div>

      <div class="flex justify-between items-center mb-2">
        <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Projected Trajectory (₹ Lakhs)</h4>
        <span class="text-[11px] text-emerald-600 font-bold">10-Year Target: ₹${item.trajectory[3]} L</span>
      </div>
      <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-5">
        <canvas id="cv" height="140"></canvas>
      </div>

      <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Ground Scout Inspection Audit</h4>
      <ul class="text-xs space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        ${item.notes.map(a => `
          <li class="flex items-start gap-2 text-slate-700">
            <span class="text-emerald-600 font-bold mt-0.5">✓</span>
            <span>${a}</span>
          </li>
        `).join("")}
      </ul>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mt-5">
        <button id="modalFavBtn" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition text-center">
          ${isFav ? '♥ Saved in Watchlist' : '♡ Add to Watchlist'}
        </button>
        <button id="modalFlyBtn" class="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shadow-md text-center">
          Fly to GIS Pin
        </button>
      </div>
    `;

    document.getElementById("modalFavBtn")?.addEventListener("click", () => {
      this.toggleFavorite(item.id);
      this.openDetailModal(item.id);
    });

    document.getElementById("modalFlyBtn")?.addEventListener("click", () => {
      modal.classList.add("hidden");
      this.flyToProperty(item.id);
    });

    if (this.activeChart) this.activeChart.destroy();
    const canvas = document.getElementById("cv");
    if (canvas && window.Chart) {
      this.activeChart = new Chart(canvas, {
        type: "line",
        data: {
          labels: ["Current", "2 Years", "5 Years", "10 Years"],
          datasets: [{
            label: "Asset Valuation",
            data: item.trajectory,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#059669"
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Estimated: ₹${ctx.parsed.y} Lakhs`
              }
            }
          },
          scales: {
            x: { ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }, grid: { display: false } },
            y: { ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, callback: v => "₹" + v + "L" }, grid: { color: "#e2e8f0" } }
          }
        }
      });
    }
  }

  openCompareModal() {
    const modal = document.getElementById("modal");
    const mb = document.getElementById("mb");
    if (!modal || !mb) return;

    const selected = [...this.compared].map(id => this.properties.find(p => p.id === id)).filter(Boolean);
    if (!selected.length) return;

    modal.classList.remove("hidden");

    const gain = (x, i) => Math.round((x.trajectory[i] / x.trajectory[0] - 1) * 100);

    const rows = [
      ["Asset Class", x => x.type],
      ["Corridor Zone", x => this.getZone(x.zone).name],
      ["Current Asking Price", x => this.formatPrice(x.price)],
      ["Specs & Area", x => x.specs],
      ["Land Status", x => `<span class="tag-badge bg-slate-100 text-slate-800">${x.landType || 'NA'}</span>`],
      ["Growth Index", x => `<span class="tag-badge ${this.getScoreBadgeClass(x.score)}">${x.score} / 100</span>`],
      ["Scout Verification", x => x.verified ? `<span class="text-emerald-600 font-bold">✓ Audit Completed</span>` : `<span class="text-amber-600 font-medium">Pending Audit</span>`],
      ["Projected 5Y Yield", x => `<b class="text-emerald-600 font-extrabold">+${gain(x, 2)}%</b>`],
      ["Projected 10Y Yield", x => `<b class="text-emerald-700 font-extrabold">+${gain(x, 3)}%</b>`],
      ["Primary Infra Catalyst", x => `<span class="text-blue-600 font-bold">${x.catalysts[0][0]} (${x.catalysts[0][1]} km)</span>`]
    ];

    mb.innerHTML = `
      <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900 font-display mb-1">Side-by-Side Asset Comparison</h3>
      <p class="text-xs text-slate-500 mb-4 sm:mb-6">Benchmarking key infrastructural upside vectors across Sangli-Miraj</p>
      <div class="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <table class="w-full text-xs sm:text-sm text-left min-w-[340px]">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="p-3 text-slate-400 font-bold text-xs uppercase">Metric</th>
              ${selected.map(x => `<th class="p-3 font-extrabold text-slate-900">${x.title}</th>`).join("")}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(r => `
              <tr>
                <td class="p-3 text-slate-500 font-semibold text-xs uppercase">${r[0]}</td>
                ${selected.map(x => `<td class="p-3 font-medium text-slate-800">${r[1](x)}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  openZoneDrawer(z) {
    const html = `
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Selected Corridor</span>
          <h3 class="text-xl font-extrabold text-white font-display mt-0.5">${z.name}</h3>
        </div>
        <button id="czBtn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center text-lg leading-none transition" title="Close Drawer">×</button>
      </div>

      <div class="grid grid-cols-2 gap-2.5 my-4">
        <div class="bg-white/10 p-3 rounded-2xl border border-white/10">
          <div class="text-[10px] font-bold text-slate-400 uppercase">Growth Index</div>
          <div class="text-2xl font-black text-emerald-400 font-display mt-0.5">${z.score} <span class="text-xs text-slate-400 font-normal">/100</span></div>
        </div>
        <div class="bg-white/10 p-3 rounded-2xl border border-white/10">
          <div class="text-[10px] font-bold text-slate-400 uppercase">5Y Projected Yield</div>
          <div class="text-2xl font-black text-blue-400 font-display mt-0.5">+${z.apr}%</div>
        </div>
      </div>

      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Upcoming Infrastructure Catalysts</div>
      <ul class="space-y-2 mb-5 text-xs text-slate-300">
        ${z.catalysts.map(x => `<li class="flex items-start gap-2"><span class="text-blue-400 font-bold">●</span><span>${x}</span></li>`).join("")}
      </ul>

      <button id="fbBtn" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs tracking-wide transition border border-slate-700 shadow-md active:scale-98">
        Filter Listings in ${z.name}
      </button>
    `;

    const dDesk = document.getElementById("drawer");
    const dMob = document.getElementById("drawerM");
    if (dDesk) {
      dDesk.innerHTML = html;
      dDesk.classList.remove("hidden");
    }
    if (dMob) {
      dMob.innerHTML = html;
      dMob.classList.remove("hidden");
    }

    const closeHandler = () => {
      dDesk?.classList.add("hidden");
      dMob?.classList.add("hidden");
    };

    document.querySelectorAll("#czBtn").forEach(b => b.addEventListener("click", closeHandler));
    document.querySelectorAll("#fbBtn").forEach(b => b.addEventListener("click", () => {
      const fz = document.getElementById("fz");
      if (fz) fz.value = z.id;
      this.renderPropertyList();
      document.getElementById("lh")?.scrollIntoView({ behavior: "smooth" });
    }));
  }

  showCellInspection(cell) {
    const out = document.getElementById("out");
    if (!out) return;

    const mx = Math.max(...cell.contributors.map(d => d.impact), 0.001);

    out.innerHTML = `
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">GIS Coordinates</span>
          <b class="text-xs text-slate-800">(${cell.lat.toFixed(3)}, ${cell.lng.toFixed(3)})</b>
        </div>
        <span class="tag-badge ${this.getScoreBadgeClass(cell.score)}">Growth Score</span>
      </div>

      <div class="mt-4 flex items-baseline gap-2">
        <span class="big">${cell.score}</span>
        <span class="mut font-bold">/ 100</span>
      </div>
      <div class="mut font-semibold text-emerald-700">Calibrated percentile rank across Sangli-Miraj grid</div>

      <div class="mt-4 pt-3 border-t border-slate-100">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Nearby Infrastructure Catalysts</div>
        ${cell.contributors.length ? cell.contributors.sort((a, b) => b.impact - a.impact).map(d => `
          <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2">
            <div class="flex justify-between items-center text-xs font-bold text-slate-800">
              <span class="text-blue-900">${d.name}</span>
              <span class="text-emerald-700 font-extrabold">+${d.impact.toFixed(2)} pts</span>
            </div>
            <div class="bar my-1.5">
              <i style="width:${Math.max(6, Math.min(100, (d.impact / mx) * 100))}%;"></i>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400">
              <span class="text-blue-600 font-medium">${d.distanceKm.toFixed(1)} km away</span>
              <span class="font-medium text-slate-500">${d.stage} • ${d.year}</span>
            </div>
          </div>
        `).join("") : '<div class="mut py-4 text-center">No projects match current filters for this cell.</div>'}
      </div>
    `;
  }
}
