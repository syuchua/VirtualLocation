import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { darkColors, lightColors } from '@/theme/colors';

type Props = {
  totalDistanceKm: number;
  durationMinutes: number;
  averagePace: number;
};

const formatDuration = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) {
    return `${hrs} 小时 ${mins} 分`;
  }
  return `${mins} 分钟`;
};

const formatPace = (pace: number) => {
  const whole = Math.floor(pace);
  const seconds = Math.round((pace - whole) * 60);
  return `${whole}'${seconds.toString().padStart(2, '0')}"`;
};

export function RouteStatsCard({ totalDistanceKm, durationMinutes, averagePace }: Props) {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.mutedText }]}>路线统计</Text>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>
            {totalDistanceKm.toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, { color: palette.mutedText }]}>公里</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>{formatDuration(durationMinutes)}</Text>
          <Text style={[styles.metricLabel, { color: palette.mutedText }]}>预计用时</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: palette.text }]}>{formatPace(averagePace)}</Text>
          <Text style={[styles.metricLabel, { color: palette.mutedText }]}>平均配速</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    marginBottom: 12,
    letterSpacing: 1,
  },
  metric: {
    flex: 1,
    paddingHorizontal: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
});
