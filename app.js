const basePosition = { lat: 37.5446, lng: 127.0557 };
const storageKey = "runcircle.mapboxAccessToken";
const runnerPreferenceStorageKey = "runcircle.runnerPreferences";
const defaultMapStyle = "mapbox://styles/mapbox/streets-v12";
const radiusSourceId = "competition-radius";
const radiusFillLayerId = "competition-radius-fill";
const radiusLineLayerId = "competition-radius-line";
const maxVisibleRunners = 7;
const maxWeeklyRivalRequests = 3;

const runners = [
  { id: 1, name: "민서", icon: "M", color: "#286fdd", distance: 0.42, pace: 326, weeklyKm: 28.4, angle: -38 },
  { id: 2, name: "준호", icon: "J", color: "#ff6f61", distance: 0.84, pace: 348, weeklyKm: 21.8, angle: 74 },
  { id: 3, name: "라온", icon: "R", color: "#0f9f9a", distance: 0.93, pace: 371, weeklyKm: 18.2, angle: 154 },
  { id: 4, name: "소윤", icon: "S", color: "#2f8f5b", distance: 1.36, pace: 312, weeklyKm: 35.1, angle: 142 },
  { id: 5, name: "태오", icon: "T", color: "#8b5cf6", distance: 2.1, pace: 402, weeklyKm: 16.2, angle: 210 },
  { id: 6, name: "하린", icon: "H", color: "#f3b83f", distance: 2.76, pace: 371, weeklyKm: 25.7, angle: 306 },
  { id: 7, name: "지우", icon: "Z", color: "#111827", distance: 3.42, pace: 339, weeklyKm: 31.5, angle: 18 },
  { id: 8, name: "유나", icon: "Y", color: "#0f9f9a", distance: 4.18, pace: 421, weeklyKm: 12.8, angle: 255 },
  { id: 9, name: "도현", icon: "D", color: "#e4572e", distance: 4.72, pace: 365, weeklyKm: 18.4, angle: 118 },
  { id: 10, name: "서진", icon: "A", color: "#14b8a6", distance: 1.72, pace: 354, weeklyKm: 24.9, angle: 32 },
  { id: 11, name: "나은", icon: "N", color: "#dc2626", distance: 2.44, pace: 388, weeklyKm: 19.6, angle: 248 },
  { id: 12, name: "현우", icon: "W", color: "#4f46e5", distance: 3.86, pace: 331, weeklyKm: 29.7, angle: 282 },
  { id: 13, name: "채린", icon: "C", color: "#be185d", distance: 4.56, pace: 414, weeklyKm: 14.3, angle: 61 },
  { id: 14, name: "윤재", icon: "V", color: "#7c3aed", distance: 1.18, pace: 362, weeklyKm: 17.9, angle: 188 },
  { id: 15, name: "해원", icon: "O", color: "#0891b2", distance: 2.88, pace: 344, weeklyKm: 22.6, angle: 342 },
  { id: 16, name: "지민", icon: "I", color: "#ea580c", distance: 2.32, pace: 396, weeklyKm: 15.5, angle: 102 },
  { id: 17, name: "다온", icon: "B", color: "#16a34a", distance: 3.18, pace: 352, weeklyKm: 26.8, angle: 226 }
].map((runner) => ({ ...runner, position: offsetPosition(basePosition, runner.distance, runner.angle) }));

const myWeeklyRuns = [
  { day: "월", distance: 3.2, pace: 354, minutes: 19 },
  { day: "화", distance: 0, pace: 0, minutes: 0 },
  { day: "수", distance: 4.8, pace: 342, minutes: 27 },
  { day: "목", distance: 2.7, pace: 371, minutes: 17 },
  { day: "금", distance: 5.4, pace: 336, minutes: 30 },
  { day: "토", distance: 6.1, pace: 348, minutes: 35 },
  { day: "일", distance: 1.9, pace: 388, minutes: 12 }
];

let selectedRadius = 1;
let selectedRunnerId = 1;
let sortMode = "distance";
let runnerPage = 0;
let selectedRankingRadius = 1;
let openMenuRunnerId = null;
let currentPosition = basePosition;
let activeMapStyle = defaultMapStyle;
let map;
let meMarker;
let mapboxReady = false;
let mapLoadError = false;
const runnerMarkers = new Map();
const runnerPreferences = loadRunnerPreferences();

const mapCanvas = document.querySelector("#mapCanvas");
const mapFallback = document.querySelector("#mapFallback");
const apiKeyForm = document.querySelector("#apiKeyForm");
const apiKeyInput = document.querySelector("#apiKeyInput");
const settingsTokenForm = document.querySelector("#settingsTokenForm");
const settingsTokenInput = document.querySelector("#settingsTokenInput");
const runnerList = document.querySelector("#runnerList");
const rankingList = document.querySelector("#rankingList");
const rankingTitle = document.querySelector("#rankingTitle");
const rankingCount = document.querySelector("#rankingCount");
const radiusLabel = document.querySelector("#radiusLabel");
const visibleCount = document.querySelector("#visibleCount");
const statRunners = document.querySelector("#statRunners");
const statPace = document.querySelector("#statPace");
const statDistance = document.querySelector("#statDistance");
const locationText = document.querySelector("#locationText");
const locateButton = document.querySelector("#locateButton");
const sortButton = document.querySelector("#sortButton");
const refreshRunnersButton = document.querySelector("#refreshRunnersButton");
const zoomInButton = document.querySelector("#zoomInButton");
const zoomOutButton = document.querySelector("#zoomOutButton");
const fitButton = document.querySelector("#fitButton");
const defaultRadiusText = document.querySelector("#defaultRadiusText");
const rivalQuotaText = document.querySelector("#rivalQuotaText");
const myDistanceValue = document.querySelector("#myDistanceValue");
const myRunDaysValue = document.querySelector("#myRunDaysValue");
const myPaceValue = document.querySelector("#myPaceValue");
const myTimeValue = document.querySelector("#myTimeValue");
const weeklyDistanceChart = document.querySelector("#weeklyDistanceChart");
const paceTrendChart = document.querySelector("#paceTrendChart");
const timeTrendChart = document.querySelector("#timeTrendChart");

function formatPace(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}'${rest}"`;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = String(minutes % 60).padStart(2, "0");
  return hours ? `${hours}h ${rest}m` : `${minutes}m`;
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

function getSortedCandidates() {
  const visible = runners.filter((runner) => {
    return runner.distance <= selectedRadius && !runnerPreferences.hidden.has(runner.id);
  });
  return [...visible].sort((a, b) => {
    if (sortMode === "weekly") {
      return b.weeklyKm - a.weeklyKm;
    }
    return a.distance - b.distance;
  });
}

function getRankingRunners(radius) {
  return runners
    .filter((runner) => runner.distance <= radius && !runnerPreferences.hidden.has(runner.id))
    .sort((a, b) => b.weeklyKm - a.weeklyKm);
}

function getVisibleRunners() {
  const candidates = getSortedCandidates();
  const rivals = candidates.filter((runner) => runnerPreferences.rivals.has(runner.id));
  const pinned = candidates.filter((runner) => {
    return runnerPreferences.pinned.has(runner.id) && !runnerPreferences.rivals.has(runner.id);
  });
  const unpinned = candidates.filter((runner) => {
    return !runnerPreferences.pinned.has(runner.id) && !runnerPreferences.rivals.has(runner.id);
  });
  const fixed = [...rivals, ...pinned].slice(0, maxVisibleRunners);
  const slots = maxVisibleRunners - fixed.length;

  if (slots <= 0) {
    return fixed;
  }

  if (unpinned.length <= slots) {
    return [...fixed, ...unpinned];
  }

  const weighted = getWeightedRunnerPool(unpinned);
  const fill = [];
  let cursor = (runnerPage * 3) % weighted.length;

  while (fill.length < slots && cursor < weighted.length * 3) {
    const runner = weighted[cursor % weighted.length];
    if (!fill.some((item) => item.id === runner.id)) {
      fill.push(runner);
    }
    cursor += 1;
  }

  return [...fixed, ...fill];
}

function getWeightedRunnerPool(candidates) {
  const weighted = [];
  candidates.forEach((runner) => {
    weighted.push(runner);
    if (runnerPreferences.interested.has(runner.id)) {
      weighted.push(runner, runner);
    }
  });

  return weighted
    .map((runner, index) => ({ runner, score: getRunnerShuffleScore(runner.id + index * 17, runnerPage) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.runner);
}

function getRunnerShuffleScore(id, seed) {
  const value = Math.sin(id * 9301 + seed * 49297) * 10000;
  return value - Math.floor(value);
}

function loadRunnerPreferences() {
  const fallback = createEmptyRunnerPreferences();
  try {
    const saved = JSON.parse(localStorage.getItem(runnerPreferenceStorageKey));
    return {
      pinned: new Set(saved?.pinned ?? []),
      interested: new Set(saved?.interested ?? []),
      hidden: new Set(saved?.hidden ?? []),
      rivals: new Set(saved?.rivals ?? []),
      rivalPending: new Set(saved?.rivalPending ?? []),
      rivalRejected: new Set(saved?.rivalRejected ?? []),
      rivalRequestWeek: saved?.rivalRequestWeek ?? getCurrentWeekKey(),
      rivalRequestCount: Number(saved?.rivalRequestCount ?? 0)
    };
  } catch {
    return fallback;
  }
}

function createEmptyRunnerPreferences() {
  return {
    pinned: new Set(),
    interested: new Set(),
    hidden: new Set(),
    rivals: new Set(),
    rivalPending: new Set(),
    rivalRejected: new Set(),
    rivalRequestWeek: getCurrentWeekKey(),
    rivalRequestCount: 0
  };
}

function saveRunnerPreferences() {
  localStorage.setItem(runnerPreferenceStorageKey, JSON.stringify({
    pinned: [...runnerPreferences.pinned],
    interested: [...runnerPreferences.interested],
    hidden: [...runnerPreferences.hidden],
    rivals: [...runnerPreferences.rivals],
    rivalPending: [...runnerPreferences.rivalPending],
    rivalRejected: [...runnerPreferences.rivalRejected],
    rivalRequestWeek: runnerPreferences.rivalRequestWeek,
    rivalRequestCount: runnerPreferences.rivalRequestCount
  }));
}

function setRunnerPreference(id, preference) {
  runnerPreferences.pinned.delete(id);
  runnerPreferences.interested.delete(id);
  runnerPreferences.hidden.delete(id);

  if (preference === "pin") {
    runnerPreferences.pinned.add(id);
  }
  if (preference === "interest") {
    runnerPreferences.interested.add(id);
  }
  if (preference === "hide") {
    runnerPreferences.hidden.add(id);
    runnerPreferences.pinned.delete(id);
    runnerPreferences.interested.delete(id);
    runnerPreferences.rivals.delete(id);
    runnerPreferences.rivalPending.delete(id);
  }

  if (preference === "hide" && selectedRunnerId === id) {
    selectedRunnerId = null;
  }

  openMenuRunnerId = null;
  saveRunnerPreferences();
  render();
}

function getCurrentWeekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date - start) / 86400000);
  const week = Math.ceil((day + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function refreshRivalWeek() {
  const currentWeek = getCurrentWeekKey();
  if (runnerPreferences.rivalRequestWeek !== currentWeek) {
    runnerPreferences.rivalRequestWeek = currentWeek;
    runnerPreferences.rivalRequestCount = 0;
    saveRunnerPreferences();
  }
}

function getRemainingRivalRequests() {
  refreshRivalWeek();
  return Math.max(0, maxWeeklyRivalRequests - runnerPreferences.rivalRequestCount);
}

function requestRival(id) {
  refreshRivalWeek();
  if (runnerPreferences.rivalRejected.has(id) || runnerPreferences.rivals.has(id) || runnerPreferences.rivalPending.has(id)) {
    return;
  }
  if (getRemainingRivalRequests() <= 0) {
    window.alert("이번 주 라이벌 신청 기회를 모두 사용했습니다.");
    return;
  }

  runnerPreferences.rivalRequestCount += 1;
  runnerPreferences.rivalPending.add(id);
  runnerPreferences.pinned.delete(id);
  runnerPreferences.interested.delete(id);
  openMenuRunnerId = null;
  saveRunnerPreferences();
  window.alert("라이벌 신청 알림을 보냈습니다. 상대가 수락하면 대결이 성사됩니다.");
  render();
}

function resolveRivalRequest(id, accepted) {
  runnerPreferences.rivalPending.delete(id);
  if (accepted) {
    runnerPreferences.rivals.add(id);
    runnerPreferences.rivalRejected.delete(id);
  } else {
    runnerPreferences.rivals.delete(id);
    runnerPreferences.rivalRejected.add(id);
  }
  openMenuRunnerId = null;
  saveRunnerPreferences();
  render();
}

function clearRival(id) {
  runnerPreferences.rivals.delete(id);
  openMenuRunnerId = null;
  saveRunnerPreferences();
  render();
}

function getRunnerPreferenceLabel(id) {
  if (runnerPreferences.rivals.has(id)) {
    return "라이벌";
  }
  if (runnerPreferences.rivalPending.has(id)) {
    return "대기";
  }
  if (runnerPreferences.rivalRejected.has(id)) {
    return "거절됨";
  }
  if (runnerPreferences.pinned.has(id)) {
    return "핀";
  }
  if (runnerPreferences.interested.has(id)) {
    return "흥미";
  }
  return "";
}

function getVisibleCandidateCount() {
  return runners.filter((runner) => {
    return runner.distance <= selectedRadius && !runnerPreferences.hidden.has(runner.id);
  }).length;
}

function canRefreshRunners() {
  const candidates = getSortedCandidates();
  const fixedCount = candidates.filter((runner) => {
    return runnerPreferences.rivals.has(runner.id) || runnerPreferences.pinned.has(runner.id);
  }).length;
  return candidates.length > maxVisibleRunners || candidates.length > Math.max(1, fixedCount);
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
    const preferenceLabel = getRunnerPreferenceLabel(runner.id);
    const rivalBlocked = runnerPreferences.rivalRejected.has(runner.id);
    const rivalPending = runnerPreferences.rivalPending.has(runner.id);
    const isRival = runnerPreferences.rivals.has(runner.id);
    const rivalRequestsLeft = getRemainingRivalRequests();
    const rivalActionLabel = rivalBlocked
      ? "거절됨"
      : rivalPending
        ? "응답 대기"
        : isRival
          ? "라이벌 해제"
          : `라이벌 신청 ${rivalRequestsLeft}/3`;
    const card = document.createElement("article");
    card.className = `runner-card${runner.id === selectedRunnerId ? " is-selected" : ""}`;
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="avatar" style="background:${runner.color}">${runner.icon}</div>
      <div>
        <h3>${runner.name}${preferenceLabel ? `<span>${preferenceLabel}</span>` : ""}</h3>
        <p>${runner.distance.toFixed(2)} km 근처 · ${formatPace(runner.pace)}/km · 주간 ${runner.weeklyKm.toFixed(1)} km</p>
      </div>
      <span class="runner-rank">#${index + 1}</span>
      <button class="runner-menu-button" type="button" aria-label="${runner.name} 메뉴" data-menu-runner="${runner.id}">...</button>
      <div class="runner-menu${openMenuRunnerId === runner.id ? " is-open" : ""}">
        <button type="button" data-runner-action="rival" data-runner-id="${runner.id}" ${rivalBlocked || rivalPending || (!isRival && rivalRequestsLeft <= 0) ? "disabled" : ""}>${rivalActionLabel}</button>
        ${rivalPending ? `<button type="button" data-runner-action="rival-accept" data-runner-id="${runner.id}">상대 수락</button>` : ""}
        ${rivalPending ? `<button type="button" data-runner-action="rival-reject" data-runner-id="${runner.id}">상대 거절</button>` : ""}
        <button type="button" data-runner-action="pin" data-runner-id="${runner.id}">${runnerPreferences.pinned.has(runner.id) ? "핀 해제" : "핀"}</button>
        <button type="button" data-runner-action="interest" data-runner-id="${runner.id}">${runnerPreferences.interested.has(runner.id) ? "흥미 해제" : "흥미"}</button>
        <button type="button" data-runner-action="hide" data-runner-id="${runner.id}">무관심</button>
      </div>
    `;
    card.addEventListener("click", (event) => {
      if (event.target.closest(".runner-menu, .runner-menu-button")) {
        return;
      }
      selectRunner(runner.id, true);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRunner(runner.id, true);
      }
    });
    runnerList.appendChild(card);
  });

  runnerList.querySelectorAll(".runner-menu-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(button.dataset.menuRunner);
      openMenuRunnerId = openMenuRunnerId === id ? null : id;
      renderList(getVisibleRunners());
    });
  });

  runnerList.querySelectorAll("[data-runner-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(button.dataset.runnerId);
      const action = button.dataset.runnerAction;
      if (action === "pin" && runnerPreferences.pinned.has(id)) {
        setRunnerPreference(id, null);
        return;
      }
      if (action === "interest" && runnerPreferences.interested.has(id)) {
        setRunnerPreference(id, null);
        return;
      }
      if (action === "rival") {
        if (runnerPreferences.rivals.has(id)) {
          clearRival(id);
          return;
        }
        requestRival(id);
        return;
      }
      if (action === "rival-accept") {
        resolveRivalRequest(id, true);
        return;
      }
      if (action === "rival-reject") {
        resolveRivalRequest(id, false);
        return;
      }
      setRunnerPreference(id, action);
    });
  });
}

function renderStats(visible) {
  const candidates = getSortedCandidates();
  const totalDistance = candidates.reduce((sum, runner) => sum + runner.weeklyKm, 0);
  const averagePace = candidates.length
    ? Math.round(candidates.reduce((sum, runner) => sum + runner.pace, 0) / candidates.length)
    : 0;

  radiusLabel.textContent = `${selectedRadius} km`;
  visibleCount.textContent = `${visible.length}/${getVisibleCandidateCount()}명`;
  statRunners.textContent = String(candidates.length);
  statPace.textContent = candidates.length ? formatPace(averagePace) : "0'00\"";
  statDistance.textContent = `${totalDistance.toFixed(1)} km`;
  refreshRunnersButton.disabled = !canRefreshRunners();
  defaultRadiusText.textContent = `${selectedRadius} km`;
  rivalQuotaText.textContent = `${getRemainingRivalRequests()}/${maxWeeklyRivalRequests}`;
}

function renderMyStats() {
  const activeRuns = myWeeklyRuns.filter((run) => run.distance > 0);
  const totalDistance = myWeeklyRuns.reduce((sum, run) => sum + run.distance, 0);
  const totalMinutes = myWeeklyRuns.reduce((sum, run) => sum + run.minutes, 0);
  const averagePace = activeRuns.length
    ? Math.round(activeRuns.reduce((sum, run) => sum + run.pace, 0) / activeRuns.length)
    : 0;

  myDistanceValue.textContent = `${totalDistance.toFixed(1)} km`;
  myRunDaysValue.textContent = `${activeRuns.length}일`;
  myPaceValue.textContent = formatPace(averagePace);
  myTimeValue.textContent = formatDuration(totalMinutes);
  renderDistanceBars();
  renderMetricTrend(paceTrendChart, myWeeklyRuns.map((run) => run.pace ? Math.round(1000 / run.pace * 60) : 0), "km/h");
  renderMetricTrend(timeTrendChart, myWeeklyRuns.map((run) => run.minutes), "분");
}

function renderDistanceBars() {
  const maxDistance = Math.max(...myWeeklyRuns.map((run) => run.distance), 1);
  weeklyDistanceChart.innerHTML = "";
  myWeeklyRuns.forEach((run) => {
    const item = document.createElement("div");
    item.className = "day-bar-item";
    item.innerHTML = `
      <div class="day-bar-track">
        <span style="height:${Math.max(8, run.distance / maxDistance * 100)}%"></span>
      </div>
      <strong>${run.distance ? run.distance.toFixed(1) : "-"}</strong>
      <span>${run.day}</span>
    `;
    weeklyDistanceChart.appendChild(item);
  });
}

function renderMetricTrend(target, values, unit) {
  const maxValue = Math.max(...values, 1);
  target.innerHTML = "";
  values.forEach((value, index) => {
    const point = document.createElement("div");
    point.className = "trend-point";
    point.style.height = `${Math.max(6, value / maxValue * 100)}%`;
    point.innerHTML = `<span>${value || "-"}</span><small>${myWeeklyRuns[index].day}</small>`;
    point.title = `${value || 0}${unit}`;
    target.appendChild(point);
  });
}

function renderRanking() {
  const ranked = getRankingRunners(selectedRankingRadius);
  rankingTitle.textContent = `${selectedRankingRadius} km 랭킹`;
  rankingCount.textContent = `${ranked.length}명`;
  rankingList.innerHTML = "";

  ranked.forEach((runner, index) => {
    const item = document.createElement("article");
    item.className = "ranking-item";
    item.innerHTML = `
      <span class="ranking-place">${index + 1}</span>
      <div class="avatar" style="background:${runner.color}">${runner.icon}</div>
      <div>
        <h3>${runner.name}</h3>
        <p>${runner.distance.toFixed(2)} km · ${formatPace(runner.pace)}/km</p>
      </div>
      <strong>${runner.weeklyKm.toFixed(1)} km</strong>
    `;
    rankingList.appendChild(item);
  });
}

function render() {
  const visible = getVisibleRunners();
  if (!visible.some((runner) => runner.id === selectedRunnerId)) {
    selectedRunnerId = visible[0]?.id ?? null;
  }
  renderList(visible);
  renderStats(visible);
  renderRanking();
  renderMyStats();
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
    runnerPage = 0;
    document.querySelectorAll(".radius-option").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    render();
    fitToRadius();
  });
});

document.querySelectorAll(".ranking-tab").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRankingRadius = Number(button.dataset.rankingRadius);
    document.querySelectorAll(".ranking-tab").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
    renderRanking();
  });
});

document.querySelectorAll(".bottom-nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".bottom-nav-item").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    document.querySelectorAll(".app-view").forEach((view) => {
      view.classList.toggle("is-active", view.id === button.dataset.view);
    });
    if (button.dataset.view === "discoverView" && mapboxReady && map) {
      setTimeout(() => {
        map.resize();
        fitToRadius();
      }, 60);
    }
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
  runnerPage = 0;
  sortButton.textContent = sortMode === "distance" ? "거리순" : "주간순";
  render();
});

refreshRunnersButton.addEventListener("click", () => {
  openMenuRunnerId = null;
  runnerPage += 1;
  render();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".runner-menu, .runner-menu-button")) {
    openMenuRunnerId = null;
    renderList(getVisibleRunners());
  }
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

settingsTokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const accessToken = settingsTokenInput.value.trim();
  if (!accessToken) {
    return;
  }
  localStorage.setItem(storageKey, accessToken);
  apiKeyInput.value = accessToken;
  if (mapLoadError || mapboxReady) {
    window.location.reload();
    return;
  }
  loadMapbox(accessToken);
});

render();
const storedAccessToken = localStorage.getItem(storageKey);
if (storedAccessToken) {
  apiKeyInput.value = storedAccessToken;
  settingsTokenInput.value = storedAccessToken;
}
loadMapbox(storedAccessToken);
