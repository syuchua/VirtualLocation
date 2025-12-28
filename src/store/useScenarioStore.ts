import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Position } from 'geojson';

import type { Scenario, ScenarioSegment } from '@/types/scenario';
import type { SimulationOptions } from '@/types/simulation';

type ScenarioStore = {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  simulation: SimulationOptions;
  actions: {
    setActiveScenario: (id: string) => void;
    appendSegment: (payload?: Partial<ScenarioSegment>) => void;
    updateSegment: (segmentId: string, updates: Partial<ScenarioSegment>) => void;
    addScenario: (scenario: Scenario) => void;
    renameScenario: (id: string, name: string) => void;
    setSimulationCoordinate: (coordinate: SimulationOptions['targetCoordinate']) => void;
    toggleWifiEnhancement: (enabled: boolean) => void;
    toggleCellEnhancement: (enabled: boolean) => void;
  };
};

const now = Date.now();

const seedScenario: Scenario = {
  id: 'westlake-loop',
  name: '西湖晨跑线路',
  description: '围绕断桥-苏堤的 5km 配速跑',
  createdAt: now,
  updatedAt: now,
  segments: [
    {
      id: 'seg-whitecauseway',
      label: '断桥 → 白堤',
      points: [
        [120.158062, 30.26021],
        [120.159812, 30.261655],
        [120.161702, 30.26282],
        [120.164181, 30.263863],
      ],
      pace: 6,
      dwellMs: 0,
      easing: 'easeInOut',
    },
    {
      id: 'seg-sudi',
      label: '白堤 → 苏堤',
      points: [
        [120.164181, 30.263863],
        [120.161345, 30.258998],
        [120.158423, 30.254901],
        [120.155352, 30.251244],
      ],
      pace: 5.5,
      dwellMs: 15000,
      easing: 'easeOut',
    },
  ],
};

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const fallbackPoint: Position = [120.154248, 30.240933];

const createStubPolyline = (anchor?: Position): Position[] => {
  const origin = anchor ?? fallbackPoint;
  const delta = 0.001 + Math.random() * 0.0015;
  const [lon, lat] = origin;
  return [
    origin,
    [lon + delta, lat + delta * 0.3],
    [lon + delta * 1.8, lat + delta * 0.1],
  ];
};

const findActiveScenario = (state: ScenarioStore) =>
  state.scenarios.find((scenario) => scenario.id === state.activeScenarioId) ?? null;

export const selectActiveScenario = (state: ScenarioStore) =>
  state.scenarios.find((scenario) => scenario.id === state.activeScenarioId) ?? null;

export const selectSimulationOptions = (state: ScenarioStore) => state.simulation;

export const useScenarioStore = create<ScenarioStore>()(
  immer((set, get) => ({
    scenarios: [seedScenario],
    activeScenarioId: seedScenario.id,
    simulation: {
      targetCoordinate: null,
      wifiEnhancement: false,
      cellEnhancement: false,
    },
    actions: {
      setActiveScenario: (id: string) => {
        set((state) => {
          if (state.scenarios.some((scenario) => scenario.id === id)) {
            state.activeScenarioId = id;
          }
        });
      },
      appendSegment: (payload) => {
        set((state) => {
          const scenario = findActiveScenario(state);
          if (!scenario) {
            return;
          }
          const lastPoint =
            scenario.segments[scenario.segments.length - 1]?.points.slice(-1)[0];
          const segment: ScenarioSegment = {
            id: generateId('seg'),
            label: payload?.label ?? `片段 ${scenario.segments.length + 1}`,
            points: payload?.points ?? createStubPolyline(lastPoint),
            pace: payload?.pace ?? 6,
            dwellMs: payload?.dwellMs ?? 0,
            easing: payload?.easing ?? 'linear',
          };
          scenario.segments.push(segment);
          scenario.updatedAt = Date.now();
        });
      },
      updateSegment: (segmentId, updates) => {
        set((state) => {
          const scenario = findActiveScenario(state);
          if (!scenario) {
            return;
          }
          const target = scenario.segments.find((segment) => segment.id === segmentId);
          if (target) {
            Object.assign(target, updates);
            scenario.updatedAt = Date.now();
          }
        });
      },
      addScenario: (scenario) => {
        set((state) => {
          state.scenarios.push(scenario);
          state.activeScenarioId = scenario.id;
        });
      },
      renameScenario: (id, name) => {
        set((state) => {
          const scenario = state.scenarios.find((item) => item.id === id);
          if (scenario) {
            scenario.name = name;
            scenario.updatedAt = Date.now();
          }
        });
      },
      setSimulationCoordinate: (coordinate) => {
        set((state) => {
          state.simulation.targetCoordinate = coordinate;
        });
      },
      toggleWifiEnhancement: (enabled) => {
        set((state) => {
          state.simulation.wifiEnhancement = enabled;
        });
      },
      toggleCellEnhancement: (enabled) => {
        set((state) => {
          state.simulation.cellEnhancement = enabled;
        });
      },
    },
  })),
);
