import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { Region } from 'react-native-maps';
import type { Position } from 'geojson';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { mapKeys } from '@/config/mapProviders';

type LatLng = { latitude: number; longitude: number };
type FocusPoint = LatLng & { zoom?: number; key: string };

type MapWebViewProps = {
  provider: 'amap' | 'baidu' | 'osm' | 'custom';
  template: string;
  region: Region;
  points: LatLng[];
  onRegionChange: (region: Region) => void;
  onAddPoint?: (point: Position) => void;
  cursorPoint?: LatLng | null;
  userLocation?: LatLng | null;
  targetPoint?: LatLng | null;
  focusPoint?: FocusPoint | null;
  accentColor?: string;
  cursorColor?: string;
  targetColor?: string;
  userLocationColor?: string;
};

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ACCENT = '#ff5252';
const DEFAULT_CURSOR = '#f97316';
const DEFAULT_TARGET = '#3b82f6';
const DEFAULT_USER = '#22c55e';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const latDeltaFromZoom = (zoom: number) => 360 / Math.pow(2, clamp(zoom, 2, 20));

const zoomFromDelta = (delta?: number) => {
  if (!delta) {
    return 13;
  }
  const safeDelta = Math.max(delta, 0.00001);
  const zoom = Math.log2(360 / safeDelta);
  return clamp(Math.round(zoom), 2, 20);
};

export function MapWebView({
  provider,
  template,
  region,
  points,
  onRegionChange,
  onAddPoint,
  cursorPoint,
  userLocation,
  targetPoint,
  focusPoint,
  accentColor = DEFAULT_ACCENT,
  cursorColor = DEFAULT_CURSOR,
  targetColor = DEFAULT_TARGET,
  userLocationColor = DEFAULT_USER,
}: MapWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const initialCenterRef = useRef({ latitude: region.latitude, longitude: region.longitude });
  const initialZoomRef = useRef(zoomFromDelta(region.latitudeDelta));
  const initialPointsRef = useRef(points);
  const lastPolylineRef = useRef(points);
  const lastCursorRef = useRef<LatLng | null>(cursorPoint ?? null);
  const lastUserRef = useRef<LatLng | null>(userLocation ?? null);
  const lastTargetRef = useRef<LatLng | null>(targetPoint ?? null);
  const lastFocusRef = useRef<FocusPoint | null>(focusPoint ?? null);

  useEffect(() => {
    initialCenterRef.current = { latitude: region.latitude, longitude: region.longitude };
    initialZoomRef.current = zoomFromDelta(region.latitudeDelta);
    initialPointsRef.current = points;
    readyRef.current = false;
  }, [provider, template]);

  const html = useMemo(
    () =>
      buildMapHtml({
        provider,
        template,
        center: initialCenterRef.current,
        zoom: initialZoomRef.current,
        path: initialPointsRef.current,
        accentColor,
        cursorColor,
        targetColor,
        userLocationColor,
      }),
    [provider, template, accentColor, cursorColor, targetColor, userLocationColor],
  );

  const handleBridgeMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data ?? '{}');
      if (payload.type === 'longPress' && onAddPoint) {
        onAddPoint([payload.longitude, payload.latitude]);
      }
      if (payload.type === 'region') {
        const zoom = typeof payload.zoom === 'number' ? payload.zoom : initialZoomRef.current;
        const delta = latDeltaFromZoom(zoom);
        onRegionChange({
          latitude: payload.latitude,
          longitude: payload.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        });
      }
    } catch (error) {
      console.warn('[MapWebView] Failed to parse message', error);
    }
  };

  const sendCommand = useCallback((payload: unknown) => {
    if (!readyRef.current || !webViewRef.current) {
      return;
    }
    webViewRef.current.postMessage(JSON.stringify(payload));
  }, []);

  const pushPolyline = useCallback(
    (coords: LatLng[]) => {
      lastPolylineRef.current = coords;
      sendCommand({
        type: 'polyline',
        points: coords,
      });
    },
    [sendCommand],
  );

  const pushCursor = useCallback(
    (point: LatLng | null) => {
      lastCursorRef.current = point;
      sendCommand({ type: 'cursor', point });
    },
    [sendCommand],
  );

  const pushUserLocation = useCallback(
    (point: LatLng | null) => {
      lastUserRef.current = point;
      sendCommand({ type: 'user', point });
    },
    [sendCommand],
  );

  const pushTargetPoint = useCallback(
    (point: LatLng | null) => {
      lastTargetRef.current = point;
      sendCommand({ type: 'target', point });
    },
    [sendCommand],
  );

  const pushFocus = useCallback(
    (target: FocusPoint | null) => {
      lastFocusRef.current = target;
      if (!target) {
        return;
      }
      sendCommand({
        type: 'focus',
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: target.zoom,
      });
    },
    [sendCommand],
  );

  useEffect(() => {
    pushPolyline(points);
  }, [points, pushPolyline]);

  useEffect(() => {
    pushCursor(cursorPoint ?? null);
  }, [cursorPoint, pushCursor]);

  useEffect(() => {
    pushUserLocation(userLocation ?? null);
  }, [userLocation, pushUserLocation]);

  useEffect(() => {
    pushTargetPoint(targetPoint ?? null);
  }, [targetPoint, pushTargetPoint]);

  useEffect(() => {
    if (focusPoint) {
      pushFocus(focusPoint);
    } else {
      lastFocusRef.current = null;
    }
  }, [focusPoint, pushFocus]);

  const handleLoadEnd = useCallback(() => {
    readyRef.current = true;
    pushPolyline(lastPolylineRef.current);
    pushCursor(lastCursorRef.current);
    pushUserLocation(lastUserRef.current);
    pushTargetPoint(lastTargetRef.current);
    if (lastFocusRef.current) {
      pushFocus(lastFocusRef.current);
    }
  }, [pushPolyline, pushCursor, pushUserLocation, pushTargetPoint, pushFocus]);

  const templateHash = getTemplateHash(template);

  return (
    <WebView
      key={`${provider}-${templateHash}`}
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html }}
      allowFileAccess
      allowUniversalAccessFromFileURLs
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      onMessage={handleBridgeMessage}
      onLoadEnd={handleLoadEnd}
      style={styles.webview}
    />
  );
}

type HtmlPayload = {
  provider: 'amap' | 'baidu' | 'osm' | 'custom';
  template: string;
  center: LatLng;
  zoom: number;
  path: LatLng[];
  accentColor: string;
  cursorColor: string;
  targetColor: string;
  userLocationColor: string;
};

const baseStyle = `
  html, body, #map {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
    overflow: hidden;
    touch-action: none;
  }
`;

const bridgeHelpers = `
  const ReactNativeWebView = window.ReactNativeWebView;
  function sendMessage(type, payload) {
    if (!ReactNativeWebView) {
      return;
    }
    ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
  }
  function attachBridge(handler) {
    function wrapped(event) {
      try {
        const raw = typeof event === 'string' ? event : event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : {};
        handler(data);
      } catch (error) {
        console.warn('map-bridge-error', error);
      }
    }
    document.addEventListener('message', wrapped);
    window.addEventListener('message', wrapped);
  }
`;

const buildMapHtml = ({
  provider,
  template,
  center,
  zoom,
  path,
  accentColor,
  cursorColor,
  targetColor,
  userLocationColor,
}: HtmlPayload) => {
  const initialData = JSON.stringify({
    provider,
    template,
    center,
    zoom,
    path,
    accentColor,
    cursorColor,
    targetColor,
    userLocationColor,
  });

  const providerScripts =
    provider === 'amap'
      ? getAmapScripts()
      : provider === 'baidu'
        ? getBaiduScripts()
        : getLeafletScripts();

  return `
    <!DOCTYPE html>
    <html lang="zh">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>${baseStyle}</style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var __INITIAL_DATA__ = ${initialData};
          ${bridgeHelpers}
        </script>
        ${providerScripts}
      </body>
    </html>
  `;
};

const getAmapScripts = () => {
  const key = mapKeys.amap;
  const scriptTag = key
    ? `<script src="https://webapi.amap.com/maps?v=2.0&key=${key}"></script>`
    : '';

  return `
    ${scriptTag}
    <script>
      (function() {
        if (typeof AMap === 'undefined') {
          document.getElementById('map').innerHTML = '无法加载高德地图，请检查网络或密钥配置';
          return;
        }
        let map;
        let polyline;
        let startMarker;
        let cursorMarker;
        let userMarker;
        let targetMarker;
        function init() {
          map = new AMap.Map('map', {
            viewMode: '2D',
            zoom: __INITIAL_DATA__.zoom || 12,
            center: [__INITIAL_DATA__.center.longitude, __INITIAL_DATA__.center.latitude],
            animateEnable: true,
          });
          map.on('click', function(event) {
            sendMessage('longPress', { latitude: event.lnglat.getLat(), longitude: event.lnglat.getLng() });
          });
          map.on('moveend', function() {
            const c = map.getCenter();
            sendMessage('region', { latitude: c.lat, longitude: c.lng, zoom: map.getZoom() });
          });
          updatePath(__INITIAL_DATA__.path || []);
        }
        function updatePath(points) {
          if (!map) return;
          if (polyline) {
            map.remove(polyline);
            polyline = null;
          }
          if (startMarker) {
            map.remove(startMarker);
            startMarker = null;
          }
          if (!points || !points.length) {
            return;
          }
          polyline = new AMap.Polyline({
            path: points.map(function(p) { return [p.longitude, p.latitude]; }),
            strokeColor: __INITIAL_DATA__.accentColor,
            strokeWeight: 4,
            showDir: true,
          });
          map.add(polyline);
          startMarker = new AMap.CircleMarker({
            center: [points[0].longitude, points[0].latitude],
            radius: 6,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            fillColor: __INITIAL_DATA__.accentColor
          });
          map.add(startMarker);
        }
        function updateCursor(point) {
          if (!map) return;
          if (cursorMarker) {
            map.remove(cursorMarker);
            cursorMarker = null;
          }
          if (!point) return;
          cursorMarker = new AMap.CircleMarker({
            center: [point.longitude, point.latitude],
            radius: 7,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            fillColor: __INITIAL_DATA__.cursorColor
          });
          map.add(cursorMarker);
        }
        function updateUser(point) {
          if (!map) return;
          if (userMarker) {
            map.remove(userMarker);
            userMarker = null;
          }
          if (!point) return;
          userMarker = new AMap.CircleMarker({
            center: [point.longitude, point.latitude],
            radius: 7,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            fillColor: __INITIAL_DATA__.userLocationColor
          });
          map.add(userMarker);
        }
        function updateTarget(point) {
          if (!map) return;
          if (targetMarker) {
            map.remove(targetMarker);
            targetMarker = null;
          }
          if (!point) return;
          targetMarker = new AMap.CircleMarker({
            center: [point.longitude, point.latitude],
            radius: 7,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            fillColor: __INITIAL_DATA__.targetColor
          });
          map.add(targetMarker);
        }
        function focusMap(target) {
          if (!map || !target) return;
          const zoom = target.zoom || map.getZoom();
          map.setZoomAndCenter(zoom, [target.longitude, target.latitude]);
        }
        attachBridge(function(payload) {
          if (!payload || !payload.type) return;
          if (payload.type === 'polyline') {
            updatePath(payload.points || []);
          } else if (payload.type === 'cursor') {
            updateCursor(payload.point || null);
          } else if (payload.type === 'user') {
            updateUser(payload.point || null);
          } else if (payload.type === 'target') {
            updateTarget(payload.point || null);
          } else if (payload.type === 'focus') {
            focusMap(payload);
          }
        });
        if (document.readyState === 'complete') {
          init();
        } else {
          window.addEventListener('load', init);
        }
      })();
    </script>
  `;
};

const getBaiduScripts = () => {
  const key = mapKeys.baidu;
  const scriptTag = key
    ? `<script src="https://api.map.baidu.com/api?v=3.0&type=webgl&ak=${key}"></script>`
    : '';

  return `
    ${scriptTag}
    <script>
      (function() {
        if (typeof BMapGL === 'undefined') {
          document.getElementById('map').innerHTML = '无法加载百度地图，请检查网络或密钥配置';
          return;
        }
        let map;
        let polyline;
        let startMarker;
        let cursorMarker;
        let userMarker;
        let targetMarker;
        function init() {
          map = new BMapGL.Map('map');
          const center = new BMapGL.Point(__INITIAL_DATA__.center.longitude, __INITIAL_DATA__.center.latitude);
          map.centerAndZoom(center, __INITIAL_DATA__.zoom || 12);
          map.enableScrollWheelZoom(true);
          map.addEventListener('click', function(event) {
            sendMessage('longPress', { latitude: event.latlng.lat, longitude: event.latlng.lng });
          });
          map.addEventListener('moveend', function() {
            const c = map.getCenter();
            sendMessage('region', { latitude: c.lat, longitude: c.lng, zoom: map.getZoom() });
          });
          updatePath(__INITIAL_DATA__.path || []);
        }
        function updatePath(points) {
          if (!map) return;
          if (polyline) {
            map.removeOverlay(polyline);
            polyline = null;
          }
          if (startMarker) {
            map.removeOverlay(startMarker);
            startMarker = null;
          }
          if (!points || !points.length) {
            return;
          }
          polyline = new BMapGL.Polyline(
            points.map(function(p) { return new BMapGL.Point(p.longitude, p.latitude); }),
            { strokeColor: __INITIAL_DATA__.accentColor, strokeWeight: 4 }
          );
          map.addOverlay(polyline);
          startMarker = new BMapGL.Marker(
            new BMapGL.Point(points[0].longitude, points[0].latitude)
          );
          map.addOverlay(startMarker);
        }
        function updateCircle(point, existing, color) {
          if (existing) {
            map.removeOverlay(existing);
          }
          if (!point) {
            return null;
          }
          const overlay = new BMapGL.Circle(
            new BMapGL.Point(point.longitude, point.latitude),
            15,
            {
              strokeColor: '#ffffff',
              strokeWeight: 2,
              fillColor: color,
              fillOpacity: 0.9,
            },
          );
          map.addOverlay(overlay);
          return overlay;
        }
        function focusMap(target) {
          if (!map || !target) return;
          const location = new BMapGL.Point(target.longitude, target.latitude);
          map.centerAndZoom(location, target.zoom || map.getZoom());
        }
        attachBridge(function(payload) {
          if (!payload || !payload.type) return;
          if (payload.type === 'polyline') {
            updatePath(payload.points || []);
          } else if (payload.type === 'cursor') {
            cursorMarker = updateCircle(payload.point || null, cursorMarker, __INITIAL_DATA__.cursorColor);
          } else if (payload.type === 'user') {
            userMarker = updateCircle(payload.point || null, userMarker, __INITIAL_DATA__.userLocationColor);
          } else if (payload.type === 'target') {
            targetMarker = updateCircle(payload.point || null, targetMarker, __INITIAL_DATA__.targetColor);
          } else if (payload.type === 'focus') {
            focusMap(payload);
          }
        });
        if (document.readyState === 'complete') {
          init();
        } else {
          window.addEventListener('load', init);
        }
      })();
    </script>
  `;
};

const getLeafletScripts = () => `
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-sA+z0ymb0qQJfo4DoijZ0PFl1kD1Lv0v8ZZ3A1OfV5w="
    crossorigin=""
  />
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-o9N1j7kGStpQlZ8WcJ6xNTa0Eme5m1cGzp1f0z8b+7E="
    crossorigin=""
  ></script>
  <script>
    (function() {
      let map;
      let tileLayer;
      let polyline;
      let startMarker;
      let cursorMarker;
      let userMarker;
      let targetMarker;
      function resolveTemplate() {
        if (__INITIAL_DATA__.provider === 'custom' && __INITIAL_DATA__.template) {
          return __INITIAL_DATA__.template;
        }
        if (__INITIAL_DATA__.provider === 'osm') {
          return '${OSM_TILE}';
        }
        return '${OSM_TILE}';
      }
      function init() {
        map = L.map('map').setView(
          [__INITIAL_DATA__.center.latitude, __INITIAL_DATA__.center.longitude],
          __INITIAL_DATA__.zoom || 12
        );
        tileLayer = L.tileLayer(resolveTemplate(), {
          maxZoom: 20,
          tileSize: 256,
          crossOrigin: true
        }).addTo(map);
        map.on('click', function(event) {
          sendMessage('longPress', { latitude: event.latlng.lat, longitude: event.latlng.lng });
        });
        map.on('moveend', function() {
          const c = map.getCenter();
          sendMessage('region', { latitude: c.lat, longitude: c.lng, zoom: map.getZoom() });
        });
        updatePath(__INITIAL_DATA__.path || []);
      }
      function updatePath(points) {
        if (!map) {
          return;
        }
        if (polyline) {
          map.removeLayer(polyline);
          polyline = null;
        }
        if (startMarker) {
          map.removeLayer(startMarker);
          startMarker = null;
        }
        if (!points || !points.length) {
          return;
        }
        polyline = L.polyline(points.map(function(p) { return [p.latitude, p.longitude]; }), {
          color: __INITIAL_DATA__.accentColor,
          weight: 4
        }).addTo(map);
        startMarker = L.circleMarker(
          [points[0].latitude, points[0].longitude],
          { radius: 6, color: '#fff', fillColor: __INITIAL_DATA__.accentColor, weight: 2, fillOpacity: 1 }
        ).addTo(map);
      }
      function updateMarker(point, existing, color) {
        if (existing) {
          map.removeLayer(existing);
        }
        if (!point) {
          return null;
        }
        const marker = L.circleMarker(
          [point.latitude, point.longitude],
          { radius: 7, color: '#fff', fillColor: color, weight: 2, fillOpacity: 1 }
        ).addTo(map);
        return marker;
      }
      function focusMap(target) {
        if (!target) {
          return;
        }
        map.setView([target.latitude, target.longitude], target.zoom || map.getZoom());
      }
      attachBridge(function(payload) {
        if (!payload || !payload.type) return;
        if (payload.type === 'polyline') {
          updatePath(payload.points || []);
        } else if (payload.type === 'cursor') {
          cursorMarker = updateMarker(payload.point || null, cursorMarker, __INITIAL_DATA__.cursorColor);
        } else if (payload.type === 'user') {
          userMarker = updateMarker(payload.point || null, userMarker, __INITIAL_DATA__.userLocationColor);
        } else if (payload.type === 'target') {
          targetMarker = updateMarker(payload.point || null, targetMarker, __INITIAL_DATA__.targetColor);
        } else if (payload.type === 'focus') {
          focusMap(payload);
        }
      });
      if (document.readyState === 'complete') {
        init();
      } else {
        window.addEventListener('load', init);
      }
    })();
  </script>
`;

const getTemplateHash = (value: string) => {
  if (!value) {
    return 'default';
  }
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `${hash}`;
};

const styles = StyleSheet.create({
  webview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
