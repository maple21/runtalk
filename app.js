const basePosition = { lat: 37.5446, lng: 127.0557 };
const storageKey = "runcircle.googleMapsApiKey";

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
let map;
let infoWindow;
let radiusCircle;
let meMarker;
let AdvancedMarkerElement;
let googleReady = false;
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

function getVisibleRunners() {
  const visible = runners.filter((runner) => runner.distance <= selectedRadius);
  return [...visible].sort((a, b) => {
    if (sortMode === "weekly") {
      return b.weeklyKm - a.weeklyKm;
    }
    return a.distance - b.distance;
  });
}

function createMarkerContent(runner, selected = false) {
  const marker = document.createElement("div");
  marker.className = `map-runner-pin${selected ? " is-selected" : ""}`;
  marker.style.background = runner.color;
  marker.textContent = runner.icon;
  return marker;
}

function createMeMarkerContent() {
  const marker = document.createElement("div");
  marker.className = "map-me-pin";
  marker.innerHTML = "<span></span>";
  return marker;
}

async function initGoogleMap() {
  const { Map } = await google.maps.importLibrary("maps");
  const markerLibrary = await google.maps.importLibrary("marker");
  AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;

  map = new Map(mapCanvas, {
    center: currentPosition,
    zoom: 14,
    mapId: "DEMO_MAP_ID",
    clickableIcons: false,
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControl: false
  });

  infoWindow = new google.maps.InfoWindow();
  radiusCircle = new google.maps.Circle({
    map,
    center: currentPosition,
    radius: selectedRadius * 1000,
    strokeColor: "#2f8f5b",
    strokeOpacity: 0.65,
    strokeWeight: 2,
    fillColor: "#2f8f5b",
    fillOpacity: 0.1
  });

  meMarker = new AdvancedMarkerElement({
    map,
    position: currentPosition,
    title: "내 위치",
    content: createMeMarkerContent(),
    zIndex: 100
  });

  googleReady = true;
  mapFallback.classList.add("is-hidden");
  render();
  fitToRadius();
}

function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    mapFallback.classList.remove("is-hidden");
    return;
  }

  if (window.google?.maps) {
    initGoogleMap().catch(showMapError);
    return;
  }

  window.initRunCircleMap = () => initGoogleMap().catch(showMapError);
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=initRunCircleMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => showMapError();
  document.head.appendChild(script);
}

function showMapError() {
  mapLoadError = true;
  googleReady = false;
  mapFallback.classList.remove("is-hidden");
  mapFallback.querySelector("h2").textContent = "지도를 불러오지 못했습니다";
  mapFallback.querySelector("p:not(.eyebrow)").textContent = "API 키, 결제 설정, 도메인 제한 또는 네트워크 상태를 확인해 주세요.";
}

function updateMap(visible) {
  if (!googleReady || !map) {
    return;
  }

  radiusCircle.setCenter(currentPosition);
  radiusCircle.setRadius(selectedRadius * 1000);
  meMarker.position = currentPosition;

  runnerMarkers.forEach((marker, id) => {
    if (!visible.some((runner) => runner.id === id)) {
      marker.map = null;
      runnerMarkers.delete(id);
    }
  });

  visible.forEach((runner) => {
    const content = createMarkerContent(runner, runner.id === selectedRunnerId);
    const existing = runnerMarkers.get(runner.id);
    if (existing) {
      existing.content = content;
      existing.map = map;
      existing.position = runner.position;
      return;
    }

    const marker = new AdvancedMarkerElement({
      map,
      position: runner.position,
      title: `${runner.name} 러너`,
      content
    });
    marker.addListener("click", () => selectRunner(runner.id, true));
    runnerMarkers.set(runner.id, marker);
  });
}

function openRunnerInfo(runner) {
  if (!googleReady || !infoWindow || !map) {
    return;
  }

  infoWindow.setContent(`
    <div class="info-window">
      <strong>${runner.name}</strong>
      <span>${runner.distance.toFixed(2)} km 근처</span>
      <span>${formatPace(runner.pace)}/km · 주간 ${runner.weeklyKm.toFixed(1)} km</span>
    </div>
  `);
  infoWindow.open({
    anchor: runnerMarkers.get(runner.id),
    map
  });
  map.panTo(runner.position);
}

function fitToRadius() {
  if (!googleReady || !map) {
    return;
  }

  const radiusInDegrees = selectedRadius / 111.32;
  const lngDelta = radiusInDegrees / Math.cos(currentPosition.lat * Math.PI / 180);
  const bounds = new google.maps.LatLngBounds(
    { lat: currentPosition.lat - radiusInDegrees, lng: currentPosition.lng - lngDelta },
    { lat: currentPosition.lat + radiusInDegrees, lng: currentPosition.lng + lngDelta }
  );
  map.fitBounds(bounds, 64);
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
    if (googleReady && map) {
      map.setMapTypeId(button.dataset.mapType);
    }
  });
});

sortButton.addEventListener("click", () => {
  sortMode = sortMode === "distance" ? "weekly" : "distance";
  sortButton.textContent = sortMode === "distance" ? "거리순" : "주간순";
  render();
});

zoomInButton.addEventListener("click", () => {
  if (googleReady && map) {
    map.setZoom(map.getZoom() + 1);
  }
});

zoomOutButton.addEventListener("click", () => {
  if (googleReady && map) {
    map.setZoom(map.getZoom() - 1);
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
      if (googleReady && map) {
        map.panTo(currentPosition);
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
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    return;
  }
  localStorage.setItem(storageKey, apiKey);
  if (mapLoadError) {
    window.location.reload();
    return;
  }
  loadGoogleMaps(apiKey);
});

render();
loadGoogleMaps(localStorage.getItem(storageKey));
