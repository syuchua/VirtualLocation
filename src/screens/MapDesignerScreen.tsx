import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RouteStatsCard } from '@/components/RouteStatsCard';
import { SegmentList } from '@/components/SegmentList';
import { SimulationPanel } from '@/components/SimulationPanel';
import { MapCanvas } from '@/components/MapCanvas';
import { MapProviderSelector } from '@/components/MapProviderSelector';
import {
  useScenarioStore,
  selectActiveScenario,
  selectSimulationOptions,
} from '@/store/useScenarioStore';
import { useScenarioEngine } from '@/hooks/useScenarioEngine';
import { darkColors, lightColors } from '@/theme/colors';
import { runMockSimulation, jumpToCoordinate, stopMockSimulation } from '@/services/mockController';
import { RootStackParamList } from '@/navigation/types';

export function MapDesignerScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scenario = useScenarioStore(selectActiveScenario);
  const actions = useScenarioStore((state) => state.actions);
  const { summary, points: timeline } = useScenarioEngine();
  const simulation = useScenarioStore(selectSimulationOptions);

  const handleAddSegment = () => {
    actions.appendSegment({
      label: `手绘片段 ${scenario ? scenario.segments.length + 1 : 1}`,
    });
  };

  const handleUpdateSegment = (segmentId: string, pace: number) => {
    actions.updateSegment(segmentId, { pace });
  };

  const handleToggleDwell = (segmentId: string) => {
    const segment = scenario?.segments.find((item) => item.id === segmentId);
    if (!segment) {
      return;
    }
    actions.updateSegment(segmentId, {
      dwellMs: segment.dwellMs ? 0 : 10000,
    });
  };

  const handleStartSimulation = async () => {
    if (!scenario) {
      Alert.alert('尚无路线', '请先绘制路线或从场景库选择一条。');
      return;
    }
    try {
      await runMockSimulation({ scenario, summary, timeline, options: simulation });
      Alert.alert('已发送模拟', '后台服务将依据配置推送轨迹。');
    } catch (error) {
      Alert.alert('发送失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleJumpToCoordinate = async (coordinate: { latitude: number; longitude: number }) => {
    try {
      await jumpToCoordinate({
        targetCoordinate: coordinate,
        wifiEnhancement: simulation.wifiEnhancement,
        cellEnhancement: simulation.cellEnhancement,
      });
      Alert.alert('已发送跳转', `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    } catch (error) {
      Alert.alert('发送失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: palette.text }]}>
        {scenario?.name ?? '未命名路线'}
      </Text>
      <Text style={[styles.subtitle, { color: palette.mutedText }]}>
        在地图上绘制折线，按片段设置配速，点击下方按钮即可推送到原生 mock service。
      </Text>

      <MapCanvas
        segments={scenario?.segments ?? []}
        onAddPoint={(point) =>
          actions.appendSegment({
            label: `地图点 ${scenario ? scenario.segments.length + 1 : 1}`,
            points: [point],
            pace: 6,
          })
        }
        onOpenFullScreen={() => navigation.navigate('MapFullScreen')}
      />
      <MapProviderSelector />

      <RouteStatsCard
        totalDistanceKm={summary.totalDistanceKm}
        durationMinutes={summary.estimatedDurationMinutes}
        averagePace={summary.averagePace}
      />

      <SimulationPanel
        simulation={simulation}
        onCoordinateChange={(coordinate) => actions.setSimulationCoordinate(coordinate)}
        onToggleWifi={(value) => actions.toggleWifiEnhancement(value)}
        onToggleCell={(value) => actions.toggleCellEnhancement(value)}
        onJumpToCoordinate={(coordinate) => {
          if (!coordinate) {
            Alert.alert('未设置坐标', '请先输入或拾取跳转坐标。');
            return;
          }
          return handleJumpToCoordinate(coordinate);
        }}
        onStopSimulation={() => stopMockSimulation()}
      />

      <SegmentList
        segments={scenario?.segments ?? []}
        onUpdateSegment={handleUpdateSegment}
        onToggleDwell={handleToggleDwell}
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: palette.accent }]}
        onPress={handleStartSimulation}
      >
        <Text style={styles.primaryButtonText}>开始模拟路线</Text>
        <Text style={styles.primaryButtonCaption}>
          依据配速推送 {summary.totalDistanceKm.toFixed(2)} km /{' '}
          {summary.estimatedDurationMinutes.toFixed(1)} min
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButtonCaption: {
    color: '#f9fafb',
    marginTop: 6,
  },
});
