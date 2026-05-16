
let currentPM = "pm25";

// ===============================
// GLOBAL LAYERS
// ===============================
let dotLayer = null;
let heatLayer = null;

// ===============================
// PARTICLES
// ===============================

function spawnParticles() {
  // ❌ don't spawn particles on map page (prevents visual overlap issues)
  if (document.getElementById("map")) return;

  const colors = ["green", "yellow", "orange", "red"];

  for (let i = 0; i < 60; i++) {
    const dot = document.createElement("div");

    const color = colors[Math.floor(Math.random() * colors.length)];
    dot.className = "particle " + color;

    const size = 4 + Math.random() * 6;

    dot.style.width = size + "px";
    dot.style.height = size + "px";

    dot.style.left = Math.random() * window.innerWidth + "px";
    dot.style.top = Math.random() * window.innerHeight + "px";

    document.body.appendChild(dot);
  }
}

// ===============================
// VALUE SELECTOR
// ===============================
function getValue(p) {
  return currentPM === "pm1" ? p.pm1 :
         currentPM === "pm10" ? p.pm10 :
         p.pm25;
}

// ===============================
// HEAT LAYER
// ===============================
function addHeat(p, value) {
  const colorClass =
    value < 20 ? "heat-green" :
    value < 50 ? "heat-yellow" :
    value < 80 ? "heat-orange" :
    "heat-red";

  const heatIcon = L.divIcon({
    className: "",
    html: `<div class="heat-dot ${colorClass}"></div>`,
    iconSize: [40, 40]
  });

  if (heatLayer) {
    L.marker([p.lat, p.lon], { icon: heatIcon }).addTo(heatLayer);
  }
}

// ===============================
// RENDER DATA
// ===============================
function renderData() {
  if (!dotLayer || !heatLayer) return;

  const data = [
    { lat: 38.65, lon: -90.55, pm1: 10, pm25: 30, pm10: 60 },
    { lat: 38.63, lon: -90.52, pm1: 15, pm25: 55, pm10: 90 },
    { lat: 38.60, lon: -90.50, pm1: 25, pm25: 80, pm10: 120 }
  ];

  data.forEach(p => {
    const value = getValue(p);

    // DOTS
    L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: "black",
      weight: 1,
      fillColor:
        value < 20 ? "#2ecc71" :
        value < 50 ? "#f1c40f" :
        "#e74c3c",
      fillOpacity: 0.9
    }).addTo(dotLayer);

    // HEAT
    addHeat(p, value);
  });
}

// ===============================
// MAP INIT
// ===============================
function initMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  window.mapInstance = L.map("map").setView([38.6631, -90.5771], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(window.mapInstance);

  dotLayer = L.layerGroup().addTo(window.mapInstance);
  heatLayer = L.layerGroup().addTo(window.mapInstance);

  window.mapInstance.setMaxBounds([
    [38.45, -90.85],
    [38.85, -90.25]
  ]);
}

// ===============================
// PM TOGGLE (FIXED + STABLE)
// ===============================
function setPM(type) {
  currentPM = type;

  document.querySelectorAll(".pm-toggle button").forEach(btn => {
    btn.classList.remove("active");

    if (
      (type === "pm25" && btn.textContent.includes("PM2.5")) ||
      (type === "pm1" && btn.textContent.includes("PM1")) ||
      (type === "pm10" && btn.textContent.includes("PM10"))
    ) {
      btn.classList.add("active");
    }
  });

  if (dotLayer) dotLayer.clearLayers();

  if (heatLayer) {
    heatLayer.clearLayers();
    heatLayer = L.layerGroup().addTo(window.mapInstance);
  }

  renderData();
}

// ===============================
// INIT
// ===============================
window.onload = function () {
  spawnParticles();

  if (document.getElementById("map")) {
    initMap();
    renderData();
  }
};
