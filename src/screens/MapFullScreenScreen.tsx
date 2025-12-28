import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { Position } from 'geojson';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import { MapWebView } from '@/components/MapWebView';
import { useScenarioStore, selectActiveScenario } from '@/store/useScenarioStore';
import { useScenarioEngine } from '@/hooks/useScenarioEngine';
import { useMapSettings } from '@/store/useMapSettings';
import { darkColors, lightColors } from '@/theme/colors';
import { hasProviderKey } from '@/config/mapProviders';
import { RootStackParamList } from '@/navigation/types';

type LatLng = { latitude: number; longitude: number };
type NonGoogleProvider = 'amap' | 'baidu' | 'osm' | 'custom';

const DEFAULT_REGION: Region = {
  latitude: 30.2741,
  longitude: 120.1551,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const clampZoom = (zoom: number) => Math.max(2, Math.min(zoom, 20));
const zoomToDelta = (zoom: number) => 360 / Math.pow(2, clampZoom(zoom));

export function MapFullScreenScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const scenario = useScenarioStore(selectActiveScenario);
  const segments = scenario?.segments ?? [];
  const actions = useScenarioStore((state) => state.actions);
  const { summary, points: timeline } = useScenarioEngine();

  const providerSetting = useMapSettings((state) => state.provider);
  const customTemplate = useMapSettings((state) => state.customTemplate);
  const providerAvailable = hasProviderKey(providerSetting);
  const effectiveProvider = providerAvailable ? providerSetting : providerSetting === 'custom' ? 'custom' : 'osm';
  const isGoogle = effectiveProvider === 'google';
  const simulationTarget = useScenarioStore((state) => state.simulation.targetCoordinate);

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [cursorPoint, setCursorPoint] = useState<LatLng | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ latitude: number; longitude: number; zoom: number; key: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectTargetMode, setSelectTargetMode] = useState(false);
  const targetPoint = useMemo(() => {
    if (!simulationTarget) {
      return null;
    }
    return {
      latitude: simulationTarget.latitude,
      longitude: simulationTarget.longitude,
    };
  }, [simulationTarget?.latitude, simulationTarget?.longitude]);

  const polylineCoordinates = useMemo(
    () =>
      segments.flatMap((segment) =>
        segment.points.map(([longitude, latitude]) => ({
          latitude,
          longitude,
        })),
      ),
    [segments],
  );

  useEffect(() => {
    if (polylineCoordinates.length > 0) {
      const first = polylineCoordinates[0];
      setRegion((prev) => ({
        ...prev,
        latitude: first.latitude,
        longitude: first.longitude,
      }));
    }
  }, [polylineCoordinates.length]);

  const focusOnPoint = useCallback(
    (target: LatLng, zoom = 14) => {
      if (isGoogle) {
        const delta = zoomToDelta(zoom);
        setRegion((prev) => ({
          ...prev,
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }));
      } else {
        setFocusRequest({
          latitude: target.latitude,
          longitude: target.longitude,
          zoom,
          key: `${target.latitude}-${target.longitude}-${Date.now()}`,
        });
      }
    },
    [isGoogle],
  );

  useEffect(() => {
    if (isGoogle) {
      setFocusRequest(null);
    }
  }, [isGoogle]);

  useEffect(() => {
    if (targetPoint) {
      focusOnPoint(targetPoint, 15);
    }
  }, [targetPoint, focusOnPoint]);

  const requestLocation = useCallback(
    async (shouldFocus = false) => {
      try {
        setLocating(true);
        setLocationError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('未获得定位权限');
          return;
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coordinate = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setUserLocation(coordinate);
        if (shouldFocus) {
          focusOnPoint(coordinate, 15);
        }
      } catch (error) {
        setLocationError('无法获取当前位置');
      } finally {
        setLocating(false);
      }
    },
    [focusOnPoint],
  );

  useEffect(() => {
    requestLocation(true).catch(() => {});
  }, [requestLocation]);

  const handleFocusRouteStart = () => {
    if (!polylineCoordinates.length) {
      Alert.alert('暂无路线', '请先在路线设计器里绘制折线。');
      return;
    }
    focusOnPoint(polylineCoordinates[0], 14);
  };

  const handleFocusUserLocation = () => {
    if (userLocation) {
      focusOnPoint(userLocation, 15);
      return;
    }
    requestLocation(true).catch(() => {});
  };

  useEffect(() => {
    if (!timeline.length) {
      setCursorPoint(null);
      setPlaybackIndex(0);
      setPlaying(false);
      return;
    }
    const safeIndex = Math.min(playbackIndex, timeline.length - 1);
    const sample = timeline[safeIndex];
    setCursorPoint({
      latitude: sample.coordinate.latitude,
      longitude: sample.coordinate.longitude,
    });
  }, [timeline, playbackIndex]);

  useEffect(() => {
    if (!playing || !timeline.length) {
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setPlaybackIndex((current) => {
        const next = current + 1;
        if (next >= timeline.length) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setPlaying(false);
          return current;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, timeline.length]);

  const handleTogglePlayback = () => {
    if (!timeline.length) {
      Alert.alert('缺少路线', '请先设计路线后再预览模拟。');
      return;
    }
    if (playing) {
      setPlaying(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setPlaybackIndex(0);
    setPlaying(true);
    const first = timeline[0];
    if (first) {
      focusOnPoint(
        {
          latitude: first.coordinate.latitude,
          longitude: first.coordinate.longitude,
        },
        15,
      );
    }
  };

  const handleAssignTarget = (coordinate: LatLng) => {
    actions.setSimulationCoordinate(coordinate);
    Alert.alert('已设置跳转坐标', `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    setSelectTargetMode(false);
  };

  const handleAddPoint = (point: Position) => {
    if (selectTargetMode) {
      handleAssignTarget({ latitude: point[1], longitude: point[0] });
      return;
    }
    const nextCount = scenario?.segments.length ?? 0;
    actions.appendSegment({
      label: `地图点 ${nextCount + 1}`,
      points: [point],
      pace: 6,
    });
  };

  const handleGoogleLongPress = (event: any) => {
    const coordinate = event?.nativeEvent?.coordinate;
    if (!coordinate) {
      return;
    }
    if (selectTargetMode) {
      handleAssignTarget(coordinate);
      return;
    }
    handleAddPoint([coordinate.longitude, coordinate.latitude]);
  };

  const timelineLabel = timeline.length ? `${playbackIndex + 1}/${timeline.length}` : '无';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.mapWrapper}>
        {isGoogle ? (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
          mapType="standard"
          region={region}
          onRegionChangeComplete={setRegion}
          onLongPress={handleGoogleLongPress}
          >
            {polylineCoordinates.length > 0 && (
              <Polyline coordinates={polylineCoordinates} strokeColor={palette.accent} strokeWidth={4} />
            )}
            {polylineCoordinates.length > 0 && (
              <Marker coordinate={polylineCoordinates[0]}>
                <View style={[styles.marker, { backgroundColor: palette.accent }]} />
              </Marker>
            )}
            {cursorPoint && (
              <Marker coordinate={cursorPoint} pinColor="#f97316" />
            )}
            {targetPoint && (
              <Marker coordinate={targetPoint} pinColor="#3b82f6" />
            )}
            {userLocation && (
              <Marker coordinate={userLocation} pinColor="#22c55e" />
            )}
          </MapView>
        ) : (
          <MapWebView
            provider={effectiveProvider as NonGoogleProvider}
            template={customTemplate}
            region={region}
            onRegionChange={setRegion}
            points={polylineCoordinates}
            onAddPoint={handleAddPoint}
            cursorPoint={cursorPoint}
            userLocation={userLocation}
            targetPoint={targetPoint}
            targetColor="#3b82f6"
            focusPoint={focusRequest}
            accentColor={palette.accent}
            cursorColor="#fb7185"
            userLocationColor="#10b981"
          />
        )}

        <Pressable
          style={[styles.backButton, { backgroundColor: palette.surface + 'dd' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: palette.text }}>返回</Text>
        </Pressable>

        <View style={[styles.toolbox, { backgroundColor: palette.surface + 'bb' }]}>
          <ToolButton
            label={locating ? '定位中' : '定位'}
            onPress={handleFocusUserLocation}
            disabled={locating}
          />
          <ToolButton label="起点" onPress={handleFocusRouteStart} disabled={!polylineCoordinates.length} />
          <ToolButton
            label={playing ? '暂停' : '模拟'}
            onPress={handleTogglePlayback}
            disabled={!timeline.length}
            active={playing}
          />
          <ToolButton
            label={selectTargetMode ? '拾取中' : '拾取'}
            onPress={() => setSelectTargetMode((prev) => !prev)}
            active={selectTargetMode}
          />
        </View>

        <View style={[styles.bottomPanel, { backgroundColor: palette.surface + 'f2', borderColor: palette.border }]}>
          <Text style={[styles.bottomTitle, { color: palette.text }]}>{scenario?.name ?? '未命名路线'}</Text>
          <Text style={{ color: palette.mutedText, marginTop: 6 }}>
            {summary.totalDistanceKm.toFixed(2)} km · {summary.estimatedDurationMinutes.toFixed(1)} min · 平均配速 {summary.averagePace.toFixed(2)}
          </Text>
          <Text style={{ color: palette.mutedText, marginTop: 4 }}>模拟标记：{timelineLabel}</Text>
          {locationError && (
            <Text style={[styles.warningText, { color: palette.accent }]}>{locationError}</Text>
          )}
          <View style={styles.bottomActions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: palette.accent }]}
              onPress={handleTogglePlayback}
              disabled={!timeline.length}
            >
              <Text style={styles.primaryButtonLabel}>{playing ? '暂停模拟' : '预览路线'}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { borderColor: palette.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={{ color: palette.text }}>完成</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

type ToolButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
};

function ToolButton({ label, onPress, disabled, active }: ToolButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toolButton,
        active ? styles.toolButtonActive : null,
        disabled ? styles.toolButtonDisabled : null,
      ]}
    >
      <Text style={styles.toolButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  toolbox: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    zIndex: 20,
  },
  toolButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toolButtonLabel: {
    color: '#111',
    fontWeight: '600',
  },
  toolButtonActive: {
    backgroundColor: '#fed7aa',
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  bottomPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  warningText: {
    marginTop: 6,
    fontSize: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
