import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import type { ScenarioSegment } from '@/types/scenario';
import { SegmentListItem } from './SegmentListItem';
import { darkColors, lightColors } from '@/theme/colors';

type Props = {
  title?: string;
  segments: ScenarioSegment[];
  onUpdateSegment: (segmentId: string, pace: number) => void;
  onToggleDwell: (segmentId: string) => void;
};

export function SegmentList({
  title = '配速片段',
  segments,
  onUpdateSegment,
  onToggleDwell,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: palette.mutedText }]}>
        每个片段可单独调整配速及驻留
      </Text>
      <View style={styles.list}>
        {segments.map((segment) => (
          <SegmentListItem
            key={segment.id}
            segment={segment}
            onChangePace={(pace) => onUpdateSegment(segment.id, pace)}
            onTogglePause={() => onToggleDwell(segment.id)}
          />
        ))}
        {segments.length === 0 && (
          <Text style={{ color: palette.mutedText }}>暂无片段，先在地图上绘制一条线吧。</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
  },
  list: {
    marginTop: 12,
  },
});
