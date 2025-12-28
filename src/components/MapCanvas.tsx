import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Dimensions, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { Position } from 'geojson';

import { hasProviderKey } from '@/config/mapProviders';
import { darkColors, lightColors } from '@/theme/colors';
import type { ScenarioSegment } from '@/types/scenario';
import { useMapSettings } from '@/store/useMapSettings';
import { MapWebView } from '@/components/MapWebView';
import { useScenarioStore } from '@/store/useScenarioStore';

const DEFAULT_REGION: Region = {
  latitude: 30.2741,
  longitude: 120.1551,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type Props = {
  segments: ScenarioSegment[];
  onAddPoint?: (point: Position) => void;
  onOpenFullScreen?: () => void;
};

type NonGoogleProvider = 'amap' | 'baidu' | 'osm' | 'custom';

export function MapCanvas({ segments, onAddPoint, onOpenFullScreen }: Props) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const [region, setRegion] = useState(DEFAULT_REGION);
  const providerSetting = useMapSettings((state) => state.provider);
  const customTemplate = useMapSettings((state) => state.customTemplate);
  const simulationTarget = useScenarioStore((state) => state.simulation.targetCoordinate);
  const missingWarning = useRef(false);

  const points = useMemo<Position[]>(() => {
    if (segments.length === 0) {
      return [];
    }
    return segments.flatMap((segment) => segment.points);
  }, [segments]);

  const polylineCoordinates = points.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));

  const handleLongPress = (event: any) => {
    if (!onAddPoint) {
      return;
    }
    const coordinate = event.nativeEvent.coordinate;
    onAddPoint([coordinate.longitude, coordinate.latitude]);
  };

  const providerAvailable = hasProviderKey(providerSetting);
  const effectiveProvider = providerAvailable ? providerSetting : providerSetting === 'custom' ? 'custom' : 'osm';
  // console.log('[MapCanvas] providerSetting:', providerSetting, 'available:', providerAvailable, 'effective:', effectiveProvider);
  const isGoogle = effectiveProvider === 'google';

  const highlightPoint = useMemo(() => {
    if (!simulationTarget) {
      return null;
    }
    return {
      latitude: simulationTarget.latitude,
      longitude: simulationTarget.longitude,
    };
  }, [simulationTarget?.latitude, simulationTarget?.longitude]);

  useEffect(() => {
    if (!highlightPoint) {
      return;
    }
    setRegion((prev) => ({
      ...prev,
      latitude: highlightPoint.latitude,
      longitude: highlightPoint.longitude,
    }));
  }, [highlightPoint?.latitude, highlightPoint?.longitude]);

  if (!providerAvailable && !missingWarning.current) {
    missingWarning.current = true;
    Alert.alert('地图服务', '所选地图服务缺少有效的 API Key，将改用 OSM。');
  }

  return (
    <View style={[styles.container, { borderColor: palette.border }]}>
      {onOpenFullScreen && (
        <Pressable style={[styles.fullscreenButton, { backgroundColor: palette.surface + 'dd' }]} onPress={onOpenFullScreen}>
          <Text style={{ color: palette.text, fontWeight: '600' }}>全屏</Text>
        </Pressable>
      )}
      {isGoogle ? (
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
          region={region}
          onRegionChangeComplete={setRegion}
          onLongPress={handleLongPress}
        >
          {polylineCoordinates.length > 0 && (
            <Polyline coordinates={polylineCoordinates} strokeColor={palette.accent} strokeWidth={4} />
          )}
          {polylineCoordinates.length > 0 && (
            <Marker coordinate={polylineCoordinates[0]}>
              <View style={[styles.marker, { backgroundColor: palette.accent }]} />
            </Marker>
          )}
          {highlightPoint && (
            <Marker coordinate={highlightPoint} pinColor="#3b82f6" />
          )}
        </MapView>
      ) : (
        <MapWebView
          provider={effectiveProvider as NonGoogleProvider}
          template={customTemplate}
          region={region}
          onRegionChange={setRegion}
          points={polylineCoordinates}
          onAddPoint={onAddPoint}
          accentColor={palette.accent}
          cursorPoint={null}
          targetPoint={highlightPoint}
          targetColor="#3b82f6"
        />
      )}

      <View style={[styles.overlay, { backgroundColor: palette.surface + 'dd' }]}>
        <Text style={{ color: palette.text, fontWeight: '600' }}>地图预览 (长按添加)</Text>
        <Text style={{ color: palette.mutedText, fontSize: 12 }}>
          {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.3,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
  },
  fullscreenButton: {
    position: 'absolute',
    zIndex: 10,
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
