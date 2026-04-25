const runners = [
  { id: 1, name: "민서", icon: "M", color: "#286fdd", distance: 0.42, pace: 326, weeklyKm: 28.4, angle: -38 },
  { id: 2, name: "준호", icon: "J", color: "#ff6f61", distance: 0.84, pace: 348, weeklyKm: 21.8, angle: 74 },
  { id: 3, name: "소윤", icon: "S", color: "#2f8f5b", distance: 1.36, pace: 312, weeklyKm: 35.1, angle: 142 },
  { id: 4, name: "태오", icon: "T", color: "#8b5cf6", distance: 2.1, pace: 402, weeklyKm: 16.2, angle: 210 },
  { id: 5, name: "하린", icon: "H", color: "#f3b83f", distance: 2.76, pace: 371, weeklyKm: 25.7, angle: 306 },
  { id: 6, name: "지우", icon: "Z", color: "#111827", distance: 3.42, pace: 339, weeklyKm: 31.5, angle: 18 },
  { id: 7, name: "유나", icon: "Y", color: "#0f9f9a", distance: 4.18, pace: 421, weeklyKm: 12.8, angle: 255 },
  { id: 8, name: "도현", icon: "D", color: "#e4572e", distance: 4.72, pace: 365, weeklyKm: 18.4, angle: 118 }
];

let selectedRadius = 1;
let selectedRunnerId = 1;
let sortMode = "distance";

const markerLayer = document.querySelector("#runnerMarkers");
const runnerList = document.querySelector("#runnerList");
const radiusLabel = document.querySelector("#radiusLabel");
const visibleCount = document.querySelector("#visibleCount");
const statRunners = document.querySelector("#statRunners");
const statPace = document.querySelector("#statPace");
const statDistance = document.querySelector("#statDistance");
const locationText = document.querySelector("#locationText");
const locateButton = document.querySelector("#locateButton");
const sortButton = document.querySelector("#sortButton");

function formatPace(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}'${rest}"`;
}

function getVisibleRunners() {
  const visible = runners.filter((runner) => runner.distance <= selectedRadius);
  return [...visible].sort((a, b) => {
    if (sortMode === "weekly") {
      return b.weeklyKm - a.weeklyKm;
    }
    return a.distance - b.distance;
  });
}

function runnerPosition(runner) {
  const maxOffset = 44;
  const ratio = runner.distance / 5;
  const radian = runner.angle * Math.PI / 180;
  return {
    left: 50 + Math.cos(radian) * ratio * maxOffset,
    top: 50 + Math.sin(radian) * ratio * maxOffset
  };
}

function renderMarkers(visible) {
  markerLayer.innerHTML = "";
  visible.forEach((runner) => {
    const point = runnerPosition(runner);
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `runner-marker${runner.id === selectedRunnerId ? " is-selected" : ""}`;
    marker.style.left = `${point.left}%`;
    marker.style.top = `${point.top}%`;
    marker.style.background = runner.color;
    marker.textContent = runner.icon;
    marker.setAttribute("aria-label", `${runner.name} 러너`);
    marker.addEventListener("click", () => selectRunner(runner.id));
    markerLayer.appendChild(marker);
  });
}

function renderList(visible) {
  runnerList.innerHTML = "";
  visible.forEach((runner, index) => {
    const card = document.createElement("article");
    card.className = `runner-card${runner.id === selectedRunnerId ? " is-selected" : ""}`;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="avatar" style="background:${runner.color}">${runner.icon}</div>
      <div>
        <h3>${runner.name}</h3>
        <p>${runner.distance.toFixed(2)} km 근처 · ${formatPace(runner.pace)}/km · 주간 ${runner.weeklyKm.toFixed(1)} km</p>
      </div>
      <span class="runner-rank">#${index + 1}</span>
    `;
    card.addEventListener("click", () => selectRunner(runner.id));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRunner(runner.id);
      }
    });
    runnerList.appendChild(card);
  });
}

function renderStats(visible) {
  const totalDistance = visible.reduce((sum, runner) => sum + runner.weeklyKm, 0);
  const averagePace = visible.length
    ? Math.round(visible.reduce((sum, runner) => sum + runner.pace, 0) / visible.length)
    : 0;

  radiusLabel.textContent = `${selectedRadius} km`;
  visibleCount.textContent = `${visible.length}명`;
  statRunners.textContent = String(visible.length);
  statPace.textContent = visible.length ? formatPace(averagePace) : "0'00\"";
  statDistance.textContent = `${totalDistance.toFixed(1)} km`;
}

function render() {
  const visible = getVisibleRunners();
  if (!visible.some((runner) => runner.id === selectedRunnerId)) {
    selectedRunnerId = visible[0]?.id ?? null;
  }
  renderMarkers(visible);
  renderList(visible);
  renderStats(visible);
}

function selectRunner(id) {
  selectedRunnerId = id;
  render();
}

document.querySelectorAll(".radius-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRadius = Number(button.dataset.radius);
    document.querySelectorAll(".radius-option").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    render();
  });
});

sortButton.addEventListener("click", () => {
  sortMode = sortMode === "distance" ? "weekly" : "distance";
  sortButton.textContent = sortMode === "distance" ? "거리순" : "주간순";
  render();
});

locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationText.textContent = "이 브라우저는 위치 확인을 지원하지 않음";
    return;
  }

  locationText.textContent = "현재 위치 확인 중";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      locationText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    },
    () => {
      locationText.textContent = "위치 권한이 꺼져 있어 샘플 위치 사용";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

render();
