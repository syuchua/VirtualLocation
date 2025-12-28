import { NativeModules } from 'react-native';

import type { SimulationOptions } from '@/types/simulation';

const LINKING_ERROR =
  `未找到原生模块 'MockSimulation'。` +
  "请确认已运行 'expo prebuild' 或 'npx pod-install' 并重新构建原生工程。";

type NativeMockModule = {
  startSimulation(payload: {
    timeline: Array<{
      latitude: number;
      longitude: number;
      timestampMs: number;
      speedMps: number;
    }>;
    options: SimulationOptions;
  }): Promise<void>;
  stopSimulation(): Promise<void>;
  getStatus(): Promise<{ state: string }>;
};

const MockModule: NativeMockModule | undefined = NativeModules.MockSimulation;

export function assertMockModule(): NativeMockModule {
  if (!MockModule) {
    throw new Error(LINKING_ERROR);
  }
  return MockModule;
}
