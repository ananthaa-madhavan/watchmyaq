let currentPM = "pm25";

let mapInstance = null;
let dotLayer = null;
let heatLayer = null;

let mapReady = false; // ✅ FIX ADDED
console.log("SCRIPT LOADED");
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
// MAP INIT
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

  heatLayer = L.heatLayer([], {
    radius: 45,
    blur: 35,
    minOpacity: 0.45,
    gradient: {
      0.2: "#2ecc71",
      0.5: "#f1c40f",
      0.75: "#e67e22",
      1.0: "#e74c3c"
    }
  }).addTo(mapInstance);

  const bounds = L.latLngBounds([38.45, -90.85], [38.85, -90.25]);
  mapInstance.setMaxBounds(bounds);

  mapInstance.on("drag", () => {
    mapInstance.panInsideBounds(bounds, { animate: false });
  });

  mapInstance.on("moveend", updateWeatherTiles);

  mapReady = true;
}
// ===============================
// FIREBASE
// ===============================
const db = firebase.database();

let liveData = [];
let firebaseListening = false;

function getData() {

  if (firebaseListening) return;
  firebaseListening = true;

  const sensorRef = db.ref("sensorData");

  sensorRef.on("child_added", (snapshot) => {

    const d = snapshot.val();
const point = {
  lat: d.Latitude,
  lon: d.Longitude,
  pm1: d.PM10,
  pm25: d.PM25,
  pm10: d.PM100,
  timestamp: new Date(d.DateTime).getTime()
};

const DAY = 24 * 60 * 60 * 1000;
const THREE_MILES = 4828;

// Ignore old points immediately
if ((Date.now() - point.timestamp) > DAY) {
  return;
}

liveData = liveData.filter(existing => {

  const dist = mapInstance.distance(
    [point.lat, point.lon],
    [existing.lat, existing.lon]
  );

  if (dist < THREE_MILES) {
    return existing.timestamp > point.timestamp;
  }

  return true;
});

liveData.push(point);

updatePointCounter();

if (mapReady) {
  renderData(liveData);
}
  });
}

// ===============================
// RENDER DATA
// ===============================
function renderData(data) {

  if (!mapInstance || !dotLayer || !heatLayer) return;
  if (!data || data.length === 0) return;

  dotLayer.clearLayers();

  const heatPoints = [];

  data.forEach((p) => {

    const v = getValue(p);

    let color =
      v < 20 ? "#2ecc71" :
      v < 50 ? "#f1c40f" :
      v < 80 ? "#e67e22" :
               "#e74c3c";

    // Normalize PM value to a 0–1 intensity for the heat gradient
    const intensity = Math.min(v / 100, 1);
    heatPoints.push([p.lat, p.lon, intensity]);

    const time = new Date(p.timestamp).toLocaleString();

    L.circleMarker([p.lat, p.lon], {
      radius: 7,
      color: "black",
      weight: 1,
      fillColor: color,
      fillOpacity: 1
    })
    .addTo(dotLayer)
    .bindPopup(`
      <b>Air Quality Point</b><br>
      PM1: ${p.pm1}<br>
      PM2.5: ${p.pm25}<br>
      PM10: ${p.pm10}<br>
      Time: ${time}
    `);
  });

  heatLayer.setLatLngs(heatPoints);
}

// ===============================
// CLEAN OLD DATA (24 HOURS)
// ===============================
function cleanOldData() {

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const THREE_MILES = 4828;

  // ===============================
  // REMOVE OLD POINTS
  // ===============================
  liveData = liveData.filter(p => {
    return (now - p.timestamp) <= DAY;
  });

  // ===============================
  // REMOVE NEARBY DUPLICATES
  // ===============================
  const cleaned = [];

  liveData.forEach(point => {

    const tooClose = cleaned.some(existing => {

      const dist = mapInstance.distance(
        [point.lat, point.lon],
        [existing.lat, existing.lon]
      );

      return dist < THREE_MILES;
    });

    // keep only non-nearby points
    if (!tooClose) {
      cleaned.push(point);
    }

  });

  liveData = cleaned;
}

function updatePointCounter() {
  const counter = document.getElementById("pointCounter");

  if (!counter) return;

  counter.innerText = `Points: ${liveData.length}`;
}
// ===============================
// PM TOGGLE
// ===============================
function setPM(type) {
  currentPM = type;

  document.querySelectorAll(".pm-toggle button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pm === type);
  });

  renderData(liveData);
}

// ===============================
// WEATHER
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

function weatherCodeToEmoji(code) {
  const map = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    51: "🌦️",
    61: "🌧️",
    71: "❄️",
    80: "🌧️",
    95: "⛈️"
  };

  return map[code] || "❓";
}

// ===============================
// WEATHER TILES
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
  if (wx) wx.innerText = weatherCodeToEmoji(weather.weather_code);
}

// ===============================
// INIT
// ===============================
window.onload = function () {
  spawnParticles();

  if (document.getElementById("map")) {
    initMap();
    getData();
    updateWeatherTiles();
    
   setInterval(() => {

  cleanOldData();

  updatePointCounter();

  renderData(liveData);

}, 60 * 1000);
  }
};
