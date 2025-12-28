import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import type { ScenarioSegment } from '@/types/scenario';
import { darkColors, lightColors } from '@/theme/colors';

type Props = {
  segment: ScenarioSegment;
  onChangePace: (pace: number) => void;
  onTogglePause: () => void;
};

export function SegmentListItem({ segment, onChangePace, onTogglePause }: Props) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;

  const nudgePace = (delta: number) => {
    const target = Number(Math.max(3.5, segment.pace + delta).toFixed(1));
    onChangePace(target);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>{segment.label}</Text>
        <Text style={[styles.badge, { backgroundColor: palette.accent, color: '#fff' }]}>
          {segment.points.length} 点
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.meta, { color: palette.mutedText }]}>配速</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => nudgePace(0.5)} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: palette.text }]}>＋</Text>
          </Pressable>
          <Text style={[styles.paceValue, { color: palette.text }]}>
            {segment.pace.toFixed(1)} min/km
          </Text>
          <Pressable onPress={() => nudgePace(-0.5)} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: palette.text }]}>－</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[styles.meta, { color: palette.mutedText }]}>驻留</Text>
        <Pressable
          onPress={onTogglePause}
          style={[
            styles.pauseChip,
            { borderColor: palette.border, backgroundColor: palette.card },
          ]}
        >
          <Text style={{ color: palette.text }}>
            {segment.dwellMs ? `${segment.dwellMs / 1000}s 等待` : '无'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  meta: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 6,
  },
  actionText: {
    fontWeight: '600',
  },
  paceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pauseChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
