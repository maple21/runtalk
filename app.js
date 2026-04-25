const basePosition = { lat: 37.5446, lng: 127.0557 };
const storageKey = "runcircle.mapboxAccessToken";
const defaultMapStyle = "mapbox://styles/mapbox/streets-v12";
const radiusSourceId = "competition-radius";
const radiusFillLayerId = "competition-radius-fill";
const radiusLineLayerId = "competition-radius-line";

const runners = [
  { id: 1, name: "민서", icon: "M", color: "#286fdd", distance: 0.42, pace: 326, weeklyKm: 28.4, angle: -38 },
  { id: 2, name: "준호", icon: "J", color: "#ff6f61", distance: 0.84, pace: 348, weeklyKm: 21.8, angle: 74 },
  { id: 3, name: "소윤", icon: "S", color: "#2f8f5b", distance: 1.36, pace: 312, weeklyKm: 35.1, angle: 142 },
  { id: 4, name: "태오", icon: "T", color: "#8b5cf6", distance: 2.1, pace: 402, weeklyKm: 16.2, angle: 210 },
  { id: 5, name: "하린", icon: "H", color: "#f3b83f", distance: 2.76, pace: 371, weeklyKm: 25.7, angle: 306 },
  { id: 6, name: "지우", icon: "Z", color: "#111827", distance: 3.42, pace: 339, weeklyKm: 31.5, angle: 18 },
  { id: 7, name: "유나", icon: "Y", color: "#0f9f9a", distance: 4.18, pace: 421, weeklyKm: 12.8, angle: 255 },
  { id: 8, name: "도현", icon: "D", color: "#e4572e", distance: 4.72, pace: 365, weeklyKm: 18.4, angle: 118 }
].map((runner) => ({ ...runner, position: offsetPosition(basePosition, runner.distance, runner.angle) }));

let selectedRadius = 1;
let selectedRunnerId = 1;
let sortMode = "distance";
let currentPosition = basePosition;
let activeMapStyle = defaultMapStyle;
let map;
let meMarker;
let mapboxReady = false;
let mapLoadError = false;
const runnerMarkers = new Map();

const mapCanvas = document.querySelector("#mapCanvas");
const mapFallback = document.querySelector("#mapFallback");
const apiKeyForm = document.querySelector("#apiKeyForm");
const apiKeyInput = document.querySelector("#apiKeyInput");
const runnerList = document.querySelector("#runnerList");
const radiusLabel = document.querySelector("#radiusLabel");
const visibleCount = document.querySelector("#visibleCount");
const statRunners = document.querySelector("#statRunners");
const statPace = document.querySelector("#statPace");
const statDistance = document.querySelector("#statDistance");
const locationText = document.querySelector("#locationText");
const locateButton = document.querySelector("#locateButton");
const sortButton = document.querySelector("#sortButton");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const fitButton = document.querySelector("#fitButton");

function formatPace(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}'${rest}"`;
}

function offsetPosition(origin, distanceKm, angleDegree) {
  const radian = angleDegree * Math.PI / 180;
  const latOffset = Math.sin(radian) * distanceKm / 111.32;
  const lngOffset = Math.cos(radian) * distanceKm / (111.32 * Math.cos(origin.lat * Math.PI / 180));
  return {
    lat: origin.lat + latOffset,
    lng: origin.lng + lngOffset
  };
}

function toLngLat(position) {
  return [position.lng, position.lat];
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

function createCircleGeoJson(center, radiusKm, points = 96) {
  const coordinates = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 360;
    const point = offsetPosition(center, radiusKm, angle);
    coordinates.push(toLngLat(point));
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates]
        },
        properties: {}
      }
    ]
  };
}

function createMarkerContent(runner, selected = false) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = `map-runner-pin${selected ? " is-selected" : ""}`;
  marker.style.background = runner.color;
  marker.textContent = runner.icon;
  marker.setAttribute("aria-label", `${runner.name} 러너`);
  marker.addEventListener("click", () => selectRunner(runner.id, true));
  return marker;
}

function createMeMarkerContent() {
  const marker = document.createElement("div");
  marker.className = "map-me-pin";
  marker.innerHTML = "<span></span>";
  return marker;
}

function loadMapboxAssets() {
  if (window.mapboxgl) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css";
    document.head.appendChild(stylesheet);

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mapbox GL JS failed to load"));
    document.head.appendChild(script);
  });
}

async function loadMapbox(accessToken) {
  if (!accessToken) {
    mapFallback.classList.remove("is-hidden");
    return;
  }

  try {
    await loadMapboxAssets();
    initMapbox(accessToken);
  } catch {
    showMapError();
  }
}

function initMapbox(accessToken) {
  mapboxgl.accessToken = accessToken;
  map = new mapboxgl.Map({
    container: mapCanvas,
    style: activeMapStyle,
    center: toLngLat(currentPosition),
    zoom: 14,
    pitch: 20,
    attributionControl: true
  });

  map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

  map.on("load", () => {
    mapboxReady = true;
    mapFallback.classList.add("is-hidden");
    meMarker = new mapboxgl.Marker({ element: createMeMarkerContent(), anchor: "center" })
      .setLngLat(toLngLat(currentPosition))
      .addTo(map);
    render();
    fitToRadius();
  });

  map.on("style.load", () => {
    if (mapboxReady) {
      drawRadiusLayer();
    }
  });

  map.on("error", () => {
    if (!mapboxReady) {
      showMapError();
    }
  });
}

function showMapError() {
  mapLoadError = true;
  mapboxReady = false;
  mapFallback.classList.remove("is-hidden");
  mapFallback.querySelector("h2").textContent = "지도를 불러오지 못했습니다";
  mapFallback.querySelector("p:not(.eyebrow)").textContent = "Access Token, URL 제한 또는 네트워크 상태를 확인해 주세요.";
}

function drawRadiusLayer() {
  if (!mapboxReady || !map || !map.isStyleLoaded()) {
    return;
  }

  const radiusData = createCircleGeoJson(currentPosition, selectedRadius);
  if (map.getSource(radiusSourceId)) {
    map.getSource(radiusSourceId).setData(radiusData);
    return;
  }

  map.addSource(radiusSourceId, {
    type: "geojson",
    data: radiusData
  });

  map.addLayer({
    id: radiusFillLayerId,
    type: "fill",
    source: radiusSourceId,
    paint: {
      "fill-color": "#2f8f5b",
      "fill-opacity": 0.12
    }
  });

  map.addLayer({
    id: radiusLineLayerId,
    type: "line",
    source: radiusSourceId,
    paint: {
      "line-color": "#2f8f5b",
      "line-width": 2,
      "line-opacity": 0.75
    }
  });
}

function updateMap(visible) {
  if (!mapboxReady || !map) {
    return;
  }

  drawRadiusLayer();
  if (meMarker) {
    meMarker.setLngLat(toLngLat(currentPosition));
  }

  runnerMarkers.forEach((marker, id) => {
    if (!visible.some((runner) => runner.id === id)) {
      marker.remove();
      runnerMarkers.delete(id);
    }
  });

  visible.forEach((runner) => {
    const markerElement = createMarkerContent(runner, runner.id === selectedRunnerId);
    const existing = runnerMarkers.get(runner.id);
    if (existing) {
      existing.remove();
      runnerMarkers.set(runner.id, new mapboxgl.Marker({ element: markerElement, anchor: "center" })
        .setLngLat(toLngLat(runner.position))
        .setPopup(createRunnerPopup(runner))
        .addTo(map));
      return;
    }

    const marker = new mapboxgl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat(toLngLat(runner.position))
      .setPopup(createRunnerPopup(runner))
      .addTo(map);
    runnerMarkers.set(runner.id, marker);
  });
}

function createRunnerPopup(runner) {
  return new mapboxgl.Popup({ offset: 24, closeButton: false })
    .setHTML(`
      <div class="info-window">
        <strong>${runner.name}</strong>
        <span>${runner.distance.toFixed(2)} km 근처</span>
        <span>${formatPace(runner.pace)}/km · 주간 ${runner.weeklyKm.toFixed(1)} km</span>
      </div>
    `);
}

function openRunnerInfo(runner) {
  if (!mapboxReady || !map) {
    return;
  }

  const marker = runnerMarkers.get(runner.id);
  if (marker) {
    marker.togglePopup();
  }
  map.flyTo({
    center: toLngLat(runner.position),
    zoom: Math.max(map.getZoom(), 14.5),
    essential: true
  });
}

function fitToRadius() {
  if (!mapboxReady || !map) {
    return;
  }

  const north = offsetPosition(currentPosition, selectedRadius, 0);
  const east = offsetPosition(currentPosition, selectedRadius, 90);
  const south = offsetPosition(currentPosition, selectedRadius, 180);
  const west = offsetPosition(currentPosition, selectedRadius, 270);
  const bounds = new mapboxgl.LngLatBounds([west.lng, south.lat], [east.lng, north.lat]);
  map.fitBounds(bounds, { padding: 72, duration: 650, maxZoom: 15 });
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
    card.addEventListener("click", () => selectRunner(runner.id, true));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRunner(runner.id, true);
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
  renderList(visible);
  renderStats(visible);
  updateMap(visible);
}

function selectRunner(id, focusMap = false) {
  selectedRunnerId = id;
  render();
  const runner = runners.find((item) => item.id === id);
  if (focusMap && runner) {
    openRunnerInfo(runner);
  }
}

document.querySelectorAll(".radius-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRadius = Number(button.dataset.radius);
    document.querySelectorAll(".radius-option").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    render();
    fitToRadius();
  });
});

document.querySelectorAll(".map-type-option").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".map-type-option").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    activeMapStyle = button.dataset.mapStyle;
    if (mapboxReady && map) {
      map.setStyle(activeMapStyle);
    }
  });
});

sortButton.addEventListener("click", () => {
  sortMode = sortMode === "distance" ? "weekly" : "distance";
  sortButton.textContent = sortMode === "distance" ? "거리순" : "주간순";
  render();
});

zoomInButton.addEventListener("click", () => {
  if (mapboxReady && map) {
    map.zoomIn({ duration: 250 });
  }
});

zoomOutButton.addEventListener("click", () => {
  if (mapboxReady && map) {
    map.zoomOut({ duration: 250 });
  }
});

fitButton.addEventListener("click", fitToRadius);

locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationText.textContent = "이 브라우저는 위치 확인을 지원하지 않음";
    return;
  }

  locationText.textContent = "현재 위치 확인 중";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      currentPosition = { lat: latitude, lng: longitude };
      locationText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      if (mapboxReady && map) {
        map.flyTo({ center: toLngLat(currentPosition), zoom: 14, essential: true });
        render();
        fitToRadius();
      }
    },
    () => {
      locationText.textContent = "위치 권한이 꺼져 있어 샘플 위치 사용";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

apiKeyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const accessToken = apiKeyInput.value.trim();
  if (!accessToken) {
    return;
  }
  localStorage.setItem(storageKey, accessToken);
  if (mapLoadError) {
    window.location.reload();
    return;
  }
  loadMapbox(accessToken);
});

render();
loadMapbox(localStorage.getItem(storageKey));
