console.log("particles loading");

const colors = ["green", "yellow", "orange", "red"];

for (let i = 0; i < 60; i++) {
  const el = document.createElement("div");
  el.className = "particle " + colors[Math.floor(Math.random() * colors.length)];

  const size = 5 + Math.random() * 10;

  el.style.width = size + "px";
  el.style.height = size + "px";

  el.style.left = Math.random() * window.innerWidth + "px";
  el.style.top = Math.random() * window.innerHeight + "px";

  el.style.position = "fixed";
  el.style.borderRadius = "50%";
  el.style.opacity = "0.5";
  el.style.zIndex = "-1";

  document.body.appendChild(el);
}
