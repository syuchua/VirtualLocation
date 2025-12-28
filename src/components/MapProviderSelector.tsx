import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { hasProviderKey } from '@/config/mapProviders';
import { useMapSettings } from '@/store/useMapSettings';
import { darkColors, lightColors } from '@/theme/colors';

const OPTIONS = [
  { label: 'Google', value: 'google' as const },
  { label: '高德', value: 'amap' as const },
  { label: '百度', value: 'baidu' as const },
  { label: 'OSM', value: 'osm' as const },
  { label: '自定义', value: 'custom' as const },
];

export function MapProviderSelector() {
  const provider = useMapSettings((state) => state.provider);
  const actions = useMapSettings((state) => state.actions);
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: palette.text }]}>地图服务</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const hasKey = hasProviderKey(option.value);
          const active = provider === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => hasKey && actions.setProvider(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? palette.accent : palette.surface,
                  borderColor: palette.border,
                  opacity: hasKey ? 1 : 0.4,
                },
              ]}
              disabled={!hasKey}
            >
              <Text style={{ color: active ? '#fff' : palette.text }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {provider === 'custom' && (
        <Text style={{ color: palette.mutedText, fontSize: 12 }}>
          请在设置中配置自定义瓦片模版 (例：file:///storage/emulated/0/osm/{z}/{x}/{y}.png)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
