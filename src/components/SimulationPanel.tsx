import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import type { SimulationOptions } from '@/types/simulation';
import { darkColors, lightColors } from '@/theme/colors';

type Props = {
  simulation: SimulationOptions;
  onCoordinateChange: (coordinate: SimulationOptions['targetCoordinate']) => void;
  onToggleWifi: (enabled: boolean) => void;
  onToggleCell: (enabled: boolean) => void;
  onJumpToCoordinate?: (coordinate: SimulationOptions['targetCoordinate']) => Promise<void> | void;
  onStopSimulation?: () => Promise<void> | void;
};

const clampCoord = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseCoordinate = (text: string) => {
  if (!text.trim()) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

export function SimulationPanel({
  simulation,
  onCoordinateChange,
  onToggleWifi,
  onToggleCell,
  onJumpToCoordinate,
  onStopSimulation,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const [latDraft, setLatDraft] = useState(
    simulation.targetCoordinate?.latitude?.toString() ?? '',
  );
  const [lonDraft, setLonDraft] = useState(
    simulation.targetCoordinate?.longitude?.toString() ?? '',
  );

  useEffect(() => {
    if (!simulation.targetCoordinate) {
      setLatDraft('');
      setLonDraft('');
      return;
    }
    setLatDraft(simulation.targetCoordinate.latitude.toString());
    setLonDraft(simulation.targetCoordinate.longitude.toString());
  }, [simulation.targetCoordinate?.latitude, simulation.targetCoordinate?.longitude]);

  const summary = useMemo(() => {
    if (!simulation.targetCoordinate) {
      return '未设置跳转坐标';
    }
    const { latitude, longitude } = simulation.targetCoordinate;
    return `跳转到 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }, [simulation.targetCoordinate]);

  const handleApply = () => {
    const lat = parseCoordinate(latDraft);
    const lon = parseCoordinate(lonDraft);
    if (lat == null || lon == null) {
      Alert.alert('坐标无效', '请输入合法的经纬度，例如 30.2741 / 120.1551');
      return;
    }
    const next = {
      latitude: clampCoord(lat, -90, 90),
      longitude: clampCoord(lon, -180, 180),
    };
    onCoordinateChange(next);
    setLatDraft(next.latitude.toString());
    setLonDraft(next.longitude.toString());
  };

  const handleReset = () => {
    onCoordinateChange(null);
    setLatDraft('');
    setLonDraft('');
  };

  const handleJumpToCoordinate = async () => {
    if (!simulation.targetCoordinate) {
      Alert.alert('未设置坐标', '请先输入或拾取跳转坐标。');
      return;
    }
    try {
      await onJumpToCoordinate?.(simulation.targetCoordinate);
      Alert.alert(
        '已发送跳转',
        `${simulation.targetCoordinate.latitude.toFixed(5)}, ${simulation.targetCoordinate.longitude.toFixed(5)}`,
      );
    } catch (error) {
      Alert.alert('发送失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleStopSimulation = async () => {
    try {
      await onStopSimulation?.();
      Alert.alert('已停止模拟', 'Mock 服务将停止继续推送定位。');
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Text style={[styles.cardTitle, { color: palette.text }]}>模拟控制</Text>
      <Text style={[styles.cardSubtitle, { color: palette.mutedText }]}>{summary}</Text>
      <Text style={[styles.cardSubtitle, { color: palette.mutedText }]}>
        Wi‑Fi/基站增强当前为占位提示，需系统/Root 权限才可真正伪造扫描结果。
      </Text>

      <View style={styles.row}>
        <TextInput
          value={latDraft}
          onChangeText={setLatDraft}
          keyboardType="decimal-pad"
          placeholder="纬度 (Lat)"
          placeholderTextColor={palette.mutedText}
          style={[
            styles.input,
            {
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
        />
        <TextInput
          value={lonDraft}
          onChangeText={setLonDraft}
          keyboardType="decimal-pad"
          placeholder="经度 (Lon)"
          placeholderTextColor={palette.mutedText}
          style={[
            styles.input,
            {
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
        />
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleApply}
          style={[styles.actionButton, { backgroundColor: palette.accent }]}
        >
          <Text style={styles.actionButtonText}>应用坐标</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          style={[styles.actionButton, { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border }]}
        >
          <Text style={[styles.actionButtonText, { color: palette.text }]}>清除</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={handleJumpToCoordinate}
        disabled={!simulation.targetCoordinate}
        style={[
          styles.jumpButton,
          { backgroundColor: simulation.targetCoordinate ? palette.accent : palette.border },
        ]}
      >
        <Text style={styles.jumpButtonText}>立即跳转</Text>
      </Pressable>
      <Pressable onPress={handleStopSimulation} style={[styles.stopButton, { backgroundColor: '#ef4444' }]}>
        <Text style={styles.jumpButtonText}>停止模拟</Text>
      </Pressable>

      <View style={styles.toggleRow}>
        <View>
          <Text style={[styles.toggleTitle, { color: palette.text }]}>Wi-Fi 模拟增强</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12 }}>
            合成热点列表，覆盖仅依赖 Wi-Fi 的定位逻辑
          </Text>
        </View>
        <Switch
          value={simulation.wifiEnhancement}
          onValueChange={onToggleWifi}
          thumbColor={simulation.wifiEnhancement ? palette.accent : palette.border}
        />
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={[styles.toggleTitle, { color: palette.text }]}>基站模拟</Text>
          <Text style={{ color: palette.mutedText, fontSize: 12 }}>
            推送自定义 CellInfo 提升室内/弱 GPS 场景
          </Text>
        </View>
        <Switch
          value={simulation.cellEnhancement}
          onValueChange={onToggleCell}
          thumbColor={simulation.cellEnhancement ? palette.accent : palette.border}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  jumpButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  stopButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  jumpButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
});
