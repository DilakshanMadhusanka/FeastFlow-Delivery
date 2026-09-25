export type OSMMarkerType = 'STORE' | 'CUSTOMER' | 'COURIER' | 'PICKUP';

export interface OSMMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: OSMMarkerType;
  badgeText?: string;
  bearing?: number; // 0-360 degrees for heading direction
  speed?: number; // km/h
  price?: string; // e.g. "$8.50"
}

export interface OSMMapOptions {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: OSMMarker[];
  routeCoordinates?: Array<[number, number]>; // [lat, lng] pairs
  interactive?: boolean;
  showControls?: boolean;
  tileLayer?: 'STANDARD' | 'HUMANITARIAN' | 'CARTO_LIGHT';
  fitBounds?: boolean;
  themeColor?: string;
}

/**
 * Calculates straight-line distance in km between two coordinate points using Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates an optimized, self-contained HTML document with Leaflet.js
 * rendering OpenStreetMap tiles and custom FeastFlow vector markers.
 */
export function generateOSMHtml(options: OSMMapOptions): string {
  const {
    center,
    zoom = 14,
    markers = [],
    routeCoordinates = [],
    interactive = true,
    showControls = true,
    tileLayer = 'STANDARD',
    fitBounds = true,
    themeColor = '#FF4B3A',
  } = options;

  let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  let attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  if (tileLayer === 'HUMANITARIAN') {
    tileUrl = 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
  } else if (tileLayer === 'CARTO_LIGHT') {
    tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO';
  }

  // Pre-generate route coordinates if empty but we have multiple markers
  let effectiveRoute = routeCoordinates;
  if (effectiveRoute.length === 0 && markers.length >= 2) {
    effectiveRoute = markers.map((m) => [m.latitude, m.longitude]);
  }

  const markersJson = JSON.stringify(markers);
  const routeJson = JSON.stringify(effectiveRoute);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>FeastFlow OpenStreetMap</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    
    /* Custom Markers */
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .marker-pin {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.28);
      transition: transform 0.2s ease;
    }

    .pin-store {
      width: 38px;
      height: 38px;
      background: #EA580C;
      border: 3px solid #FFFFFF;
      color: #FFFFFF;
    }

    .pin-customer {
      width: 38px;
      height: 38px;
      background: #10B981;
      border: 3px solid #FFFFFF;
      color: #FFFFFF;
    }

    .pin-courier {
      width: 44px;
      height: 44px;
      background: #7C3AED;
      border: 3px solid #FFFFFF;
      color: #FFFFFF;
    }

    .pin-pickup {
      padding: 4px 10px;
      height: 34px;
      border-radius: 17px;
      background: #FF4B3A;
      border: 2px solid #FFFFFF;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 13px;
      white-space: nowrap;
    }

    /* Radar Pulse for Courier */
    .pulse-ring {
      position: absolute;
      top: -8px;
      left: -8px;
      right: -8px;
      bottom: -8px;
      border-radius: 50%;
      border: 2px solid rgba(124, 58, 237, 0.6);
      animation: radar-pulse 2s infinite ease-out;
      pointer-events: none;
    }

    @keyframes radar-pulse {
      0% { transform: scale(0.9); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .marker-label {
      background: rgba(17, 24, 39, 0.9);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 10px;
      margin-top: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }

    /* Modern FeastFlow Popups */
    .leaflet-popup-content-wrapper {
      border-radius: 16px;
      padding: 4px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .leaflet-popup-content {
      margin: 10px 14px;
      line-height: 1.4;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 2px;
    }
    .popup-desc {
      font-size: 12px;
      color: #6B7280;
    }
    .popup-tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: #FF4B3A;
      background: #FFF1F2;
      padding: 2px 6px;
      border-radius: 6px;
      margin-top: 6px;
    }

    /* Floating UI Controls */
    .map-controls {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .control-btn {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow: 0 4px 10px rgba(0,0,0,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 800;
      font-size: 16px;
      color: #374151;
      user-select: none;
      transition: all 0.15s ease;
    }
    .control-btn:active {
      transform: scale(0.92);
      background: #F3F4F6;
    }

    .osm-watermark {
      position: absolute;
      bottom: 6px;
      left: 8px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      color: #4B5563;
      border: 1px solid rgba(0,0,0,0.06);
    }
  </style>
</head>
<body>
  <div id="map"></div>

  ${
    showControls
      ? `<div class="map-controls">
      <div class="control-btn" onclick="zoomIn()" title="Zoom In">+</div>
      <div class="control-btn" onclick="zoomOut()" title="Zoom Out">-</div>
      <div class="control-btn" onclick="recenterMap()" title="Fit Route">🎯</div>
    </div>`
      : ''
  }

  <div class="osm-watermark">
    🗺️ OpenStreetMap
  </div>

  <script>
    var centerLat = ${center.latitude};
    var centerLng = ${center.longitude};
    var defaultZoom = ${zoom};
    var isInteractive = ${interactive};
    var markersData = ${markersJson};
    var routeData = ${routeJson};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: isInteractive,
      touchZoom: isInteractive,
      scrollWheelZoom: isInteractive,
      doubleClickZoom: isInteractive,
      boxZoom: isInteractive
    }).setView([centerLat, centerLng], defaultZoom);

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '${attribution}'
    }).addTo(map);

    var allBounds = [];

    // Helper SVG icons
    var storeSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>';
    var customerSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    var bikeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>';

    // Add Markers
    markersData.forEach(function(m) {
      allBounds.push([m.latitude, m.longitude]);

      var pinHtml = '';
      if (m.type === 'STORE') {
        pinHtml = '<div class="custom-marker"><div class="marker-pin pin-store">' + storeSvg + '</div><div class="marker-label">' + (m.badgeText || 'Store') + '</div></div>';
      } else if (m.type === 'CUSTOMER') {
        pinHtml = '<div class="custom-marker"><div class="marker-pin pin-customer">' + customerSvg + '</div><div class="marker-label">' + (m.badgeText || 'Destination') + '</div></div>';
      } else if (m.type === 'COURIER') {
        var rot = m.bearing ? 'transform: rotate(' + m.bearing + 'deg);' : '';
        pinHtml = '<div class="custom-marker"><div class="marker-pin pin-courier"><div class="pulse-ring"></div><div style="' + rot + '">' + bikeSvg + '</div></div><div class="marker-label">' + (m.speed ? Math.round(m.speed) + ' km/h' : 'Courier') + '</div></div>';
      } else {
        pinHtml = '<div class="custom-marker"><div class="marker-pin pin-pickup">⚡ ' + (m.price || '$8.50') + '</div></div>';
      }

      var icon = L.divIcon({
        html: pinHtml,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);

      var popupHtml = '<div class="popup-title">' + (m.title || 'Location') + '</div>';
      if (m.description) {
        popupHtml += '<div class="popup-desc">' + m.description + '</div>';
      }
      if (m.type === 'COURIER' && m.speed) {
        popupHtml += '<div class="popup-tag">Live Speed: ' + Math.round(m.speed) + ' km/h</div>';
      }
      marker.bindPopup(popupHtml);
    });

    // Add Route Polyline
    if (routeData && routeData.length >= 2) {
      // Glow casing line
      L.polyline(routeData, {
        color: '#FFFFFF',
        weight: 7,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core delivery route line
      L.polyline(routeData, {
        color: '${themeColor}',
        weight: 4,
        opacity: 0.95,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeData.forEach(function(p) { allBounds.push(p); });
    }

    // Auto-fit bounds if we have points
    if (${fitBounds} && allBounds.length >= 2) {
      map.fitBounds(allBounds, { padding: [45, 45], maxZoom: 16 });
    }

    // Controls handlers
    function zoomIn() { map.zoomIn(); }
    function zoomOut() { map.zoomOut(); }
    function recenterMap() {
      if (allBounds.length >= 2) {
        map.fitBounds(allBounds, { padding: [45, 45], maxZoom: 16 });
      } else {
        map.setView([centerLat, centerLng], defaultZoom);
      }
    }
  </script>
</body>
</html>`;
}
