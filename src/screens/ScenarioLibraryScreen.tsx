import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { useScenarioStore } from '@/store/useScenarioStore';
import { darkColors, lightColors } from '@/theme/colors';
import { useScenarioEngine } from '@/hooks/useScenarioEngine';

export function ScenarioLibraryScreen() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const scenarios = useScenarioStore((state) => state.scenarios);
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId);
  const { summary } = useScenarioEngine();
  const actions = useScenarioStore((state) => state.actions);
  const [draftName, setDraftName] = useState('');

  const handleRename = (scenarioId: string) => {
    if (!draftName.trim()) {
      return;
    }
    actions.renameScenario(scenarioId, draftName.trim());
    setDraftName('');
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: palette.text }]}>场景管理</Text>
        <Text style={[styles.heroSubtitle, { color: palette.mutedText }]}>
          当前路线 {summary.totalDistanceKm.toFixed(2)} km · 平均配速{' '}
          {summary.averagePace.toFixed(2)} min/km
        </Text>
      </View>
      <FlatList
        data={scenarios}
        keyExtractor={(scenario) => scenario.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeScenarioId;
          return (
            <Pressable
              onPress={() => actions.setActiveScenario(item.id)}
              style={[
                styles.card,
                {
                  borderColor: isActive ? palette.accent : palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{item.name}</Text>
                {isActive && (
                  <Text style={[styles.activeBadge, { backgroundColor: palette.accent }]}>
                    使用中
                  </Text>
                )}
              </View>
              <Text style={{ color: palette.mutedText, marginBottom: 12 }}>
                片段 {item.segments.length} · 最近更新{' '}
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
              <View style={styles.renameRow}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="重命名该场景"
                  placeholderTextColor={palette.mutedText}
                  style={[
                    styles.input,
                    {
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />
                <Pressable
                  style={[
                    styles.renameButton,
                    { backgroundColor: palette.accent, opacity: draftName ? 1 : 0.4 },
                  ]}
                  disabled={!draftName}
                  onPress={() => handleRename(item.id)}
                >
                  <Text style={styles.renameButtonText}>保存</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 6,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeBadge: {
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  renameButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  renameButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
