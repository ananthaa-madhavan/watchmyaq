let currentPM = "pm25";

let mapInstance = null;
let dotLayer = null;
let heatLayer = null;

let mapReady = false;
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

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  noWrap: true
}).addTo(mapInstance);

  dotLayer = L.layerGroup().addTo(mapInstance);

heatLayer = L.heatLayer([], {
  radius: 90,
  blur: 70,
  maxZoom: 14,
  minOpacity: 0.35,
  gradient: {
    0.1: "#00ff00",
    0.3: "#ffff00",
    0.5: "#ffa500",
    0.7: "#ff4500",
    1.0: "#ff0000"
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

    const intensity = Math.min(v / 50, 1);
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

  liveData = liveData.filter(p => {
    return (now - p.timestamp) <= DAY;
  });

  const cleaned = [];

  liveData.forEach(point => {

    const tooClose = cleaned.some(existing => {

      const dist = mapInstance.distance(
        [point.lat, point.lon],
        [existing.lat, existing.lon]
      );

      return dist < THREE_MILES;
    });

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

async function fetchAQI(lat, lon) {
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`
    );
    const data = await res.json();
    return data.current?.us_aqi ?? null;
  } catch (e) {
    console.log("AQI fetch failed", e);
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
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌦️",
    56: "🌧️",
    57: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    66: "🌧️",
    67: "🌧️",
    71: "❄️",
    73: "❄️",
    75: "❄️",
    77: "❄️",
    80: "🌦️",
    81: "🌧️",
    82: "⛈️",
    85: "❄️",
    86: "❄️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️"
  };

  return map[code] || "❓";
}

// ===============================
// WEATHER TILES
// ===============================
async function updateWeatherTiles() {
  const center = mapInstance?.getCenter();
  if (!center) return;

  const [weather, aqi] = await Promise.all([
    fetchWeather(center.lat, center.lng),
    fetchAQI(center.lat, center.lng)
  ]);

  const temp = document.getElementById("tempTile");
  const uv = document.getElementById("uvTile");
  const wx = document.getElementById("weatherTile");
  const aq = document.getElementById("aqTile");

  if (weather) {
    if (temp) temp.innerText = Math.round(weather.temperature_2m) + "°C";
    if (uv) uv.innerText = weather.uv_index;
    if (wx) wx.innerText = weatherCodeToEmoji(weather.weather_code);
  }

  if (aq) aq.innerText = aqi !== null ? aqi : "--";
}

// ===============================
// ANALYTICS PAGE
// ===============================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function initAnalytics() {
  const sensorRef = db.ref("sensorData");

  sensorRef.once("value", (snapshot) => {
    const all = [];

    snapshot.forEach(child => {
      const d = child.val();
      if (d.Latitude && d.Longitude && d.DateTime && typeof d.PM25 === "number") {
        all.push({
          pm25: d.PM25,
          timestamp: new Date(d.DateTime).getTime()
        });
      }
    });

    // Show total readings regardless of whether entries pass validation
    setText("totalReadings", snapshot.numChildren());

    if (all.length === 0) return;

    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const pm25Values = all.map(p => p.pm25);
    const historicalAvg = pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length;
    const historicalBest = Math.min(...pm25Values);
    const historicalWorst = Math.max(...pm25Values);

    const timestamps = all.map(p => p.timestamp);
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    const daysMonitored = Math.max(1, Math.ceil((now - earliest) / DAY));

    const recent = all.filter(p => (now - p.timestamp) <= DAY);
    const recentPM25 = recent.map(p => p.pm25);

    const currentAvg = recentPM25.length
      ? recentPM25.reduce((a, b) => a + b, 0) / recentPM25.length
      : null;
    const currentBest = recentPM25.length ? Math.min(...recentPM25) : null;
    const currentWorst = recentPM25.length ? Math.max(...recentPM25) : null;

    setText("activePoints", recent.length);
    setText("currentAvg", currentAvg !== null ? currentAvg.toFixed(1) : "--");
    setText("currentBest", currentBest !== null ? currentBest.toFixed(1) : "--");
    setText("currentWorst", currentWorst !== null ? currentWorst.toFixed(1) : "--");

    setText("daysMonitored", daysMonitored);
    setText("historicalAvg", historicalAvg.toFixed(1));
    setText("historicalBest", historicalBest.toFixed(1));
    setText("historicalWorst", historicalWorst.toFixed(1));
    setText("latestReading", new Date(latest).toLocaleString());
  });
}

// ===============================
// INIT
// ===============================
window.onload = function () {
  spawnParticles();

  if (document.getElementById("map")) {
    try {
      initMap();
    } catch (e) {
      console.error("Map init failed:", e);
    }

    try {
      getData();
    } catch (e) {
      console.error("Data fetch failed:", e);
    }

    updateWeatherTiles();

    setInterval(() => {
      cleanOldData();
      updatePointCounter();
      renderData(liveData);
    }, 60 * 1000);
  }

  if (document.getElementById("activePoints")) {
    initAnalytics();
  }
};
