let currentPM = "pm25";

let mapInstance = null;
let dotLayer = null;

// ===============================
// PARTICLES
// ===============================
function spawnParticles() {
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
  return currentPM === "pm1"
    ? p.pm1
    : currentPM === "pm10"
    ? p.pm10
    : p.pm25;
}

// ===============================
// MAP INIT (SAFE)
// ===============================
function initMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  mapInstance = L.map("map", {
    center: [38.6631, -90.5771],
    zoom: 12,
    worldCopyJump: false,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    noWrap: true
  }).addTo(mapInstance);

  dotLayer = L.layerGroup().addTo(mapInstance);

  const bounds = L.latLngBounds(
    [38.45, -90.85],
    [38.85, -90.25]
  );

  mapInstance.setMaxBounds(bounds);

  mapInstance.on("drag", () => {
    mapInstance.panInsideBounds(bounds, { animate: false });
  });

  mapInstance.on("moveend", updateWeatherTiles);
}

// ===============================
// RENDER DATA (SAFE)
// ===============================
function renderData() {
  if (!mapInstance || !dotLayer) return;

  const data = [
    { lat: 38.65, lon: -90.55, pm1: 10, pm25: 30, pm10: 60 },
    { lat: 38.63, lon: -90.52, pm1: 15, pm25: 55, pm10: 90 },
    { lat: 38.60, lon: -90.50, pm1: 25, pm25: 80, pm10: 120 }
  ];

  dotLayer.clearLayers();

  data.forEach(p => {
    const v = getValue(p);

    L.circleMarker([p.lat, p.lon], {
      radius: 6,
      color: "black",
      weight: 1,
      fillColor:
        v < 20 ? "#2ecc71" :
        v < 50 ? "#f1c40f" :
        "#e74c3c",
      fillOpacity: 0.9
    }).addTo(dotLayer);
  });
}

// ===============================
// PM TOGGLE (SAFE)
// ===============================
function setPM(type) {
  currentPM = type;

  document.querySelectorAll(".pm-toggle button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pm === type);
  });

  renderData();
}

// ===============================
// WEATHER (SAFE)
// ===============================
async function fetchWeather(lat, lon) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,uv_index,weather_code&timezone=auto`
    );

    const data = await res.json();
    return data.current;
  } catch (e) {
    console.log("Weather fetch failed", e);
    return null;
  }
}

function weatherCodeToText(code) {
  const map = {
    0: "Clear",
    1: "Mostly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    51: "Drizzle",
    61: "Rain",
    71: "Snow",
    80: "Showers",
    95: "Storm"
  };

  return map[code] || "Unknown";
}

// ===============================
// TILE UPDATE (SAFE)
// ===============================
async function updateWeatherTiles() {
  const center = mapInstance?.getCenter();
  if (!center) return;

  const weather = await fetchWeather(center.lat, center.lng);
  if (!weather) return;

  const temp = document.getElementById("tempTile");
  const uv = document.getElementById("uvTile");
  const wx = document.getElementById("weatherTile");

  if (temp) temp.innerText = Math.round(weather.temperature_2m) + "°C";
  if (uv) uv.innerText = weather.uv_index;
  if (wx) wx.innerText = weatherCodeToText(weather.weather_code);
}

// ===============================
// INIT
// ===============================
window.onload = function () {
  spawnParticles();

  if (document.getElementById("map")) {
    initMap();
    renderData();
    updateWeatherTiles();
  }
};
