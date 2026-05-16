
// ===============================
// BreathSafeSTL GLOBAL SCRIPT
// ===============================

// ---------- PARTICLES ----------
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

// ---------- MAP ----------
function initMap() {
  const mapDiv = document.getElementById("map");

  // IMPORTANT: only run if map exists
  if (!mapDiv) {
    console.log("No map on this page — skipping Leaflet init");
    return;
  }

  const map = L.map("map").setView([38.6631, -90.5771], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // fake sensor data (replace with Firebase later)
  const data = [
    { lat: 38.65, lon: -90.55, pm25: 30 },
    { lat: 38.63, lon: -90.52, pm25: 55 },
    { lat: 38.60, lon: -90.50, pm25: 80 }
  ];

  function getColor(val) {
    return val < 20 ? "#2ecc71"
         : val < 50 ? "#f1c40f"
         : "#e74c3c";
  }

  data.forEach(p => {
    L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: "black",
      weight: 1,
      fillColor: getColor(p.pm25),
      fillOpacity: 0.9
    })
    .addTo(map)
    .bindPopup(`PM2.5: ${p.pm25}`);
  });
  map.setMaxBounds([
  [38.45, -90.85],
  [38.85, -90.25]
]);
}

// ---------- INIT SAFE WRAPPER ----------
window.onload = function () {
  console.log("BreathSafeSTL script loaded");

  // only spawn particles if body exists (always true, but safe)
  spawnParticles();

  // only init map if present
  initMap();
};
